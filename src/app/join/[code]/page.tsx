"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import { registerAppUser, DEPARTMENTS, ROLES } from "@/lib/firebase/auth";
import { joinCompanyWithInvite } from "@/lib/firebase/company";
import { useAuth } from "@/contexts/AuthContext";

export default function JoinWithCodePage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const inviteCode = params.code as string;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    employeeId: "",
    role: "" as "" | "admin" | "manager" | "leader" | "worker",
    department: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 招待コードの形式チェック
  useEffect(() => {
    if (!inviteCode || inviteCode.length !== 8) {
      setError("無効な招待コードです");
    }
  }, [inviteCode]);

  // 既にログイン済みの場合はリダイレクト
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // エラーをクリア
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.name ||
        !formData.employeeId || !formData.role || !formData.department) {
      setError("すべての項目を入力してください");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません");
      return false;
    }

    if (formData.password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. アカウント作成
      const result = await registerAppUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        department: formData.department,
        employeeId: formData.employeeId,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.user) {
        setError("アカウント作成に失敗しました");
        return;
      }

      // 2. 企業に参加
      const joinResult = await joinCompanyWithInvite(
        inviteCode.toUpperCase(),
        result.user.uid,
        { name: formData.name, email: formData.email }
      );

      if (!joinResult.success) {
        setError(joinResult.error || "企業への参加に失敗しました");
        return;
      }

      setSuccess("アカウントが作成され、企業に参加しました！ログインページにリダイレクトします...");

      // 2秒後にログインページへリダイレクト
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err: any) {
      console.error("Registration error:", err);
      setError(`エラー: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 認証状態をチェック中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Unica</h2>
          <p className="mt-2 text-sm text-gray-600">
            製造業務管理システム
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              企業に参加
            </CardTitle>
            <CardDescription>
              招待コード: <code className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{inviteCode}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="例: 田中太郎"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">社員番号</Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  placeholder="例: EMP001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="例: tanaka@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">部署</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => handleSelectChange("department", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="部署を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">役職</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleSelectChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="役職を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="6文字以上で入力"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="パスワードを再入力"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !!error}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    参加中...
                  </>
                ) : (
                  "企業に参加"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                className="text-sm"
                onClick={() => router.push("/login")}
              >
                既にアカウントをお持ちの方はこちら
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>© 2024 Unica製造業務管理システム</p>
        </div>
      </div>
    </div>
  );
}