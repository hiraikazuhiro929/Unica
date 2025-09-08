"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, AlertCircle } from "lucide-react";
import { signInWithEmail } from "@/lib/firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { validateEmail, logSecurityEvent, startSession } from "@/lib/utils/securityUtils";
import { showError, showSuccess } from "@/lib/utils/errorHandling";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // ログイン画面では強制的にライトモードを適用
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    
    return () => {
      // コンポーネントがアンマウントされる時にダークモード設定を復元
      const savedDarkMode = localStorage.getItem('unica-dark-mode');
      if (savedDarkMode && JSON.parse(savedDarkMode)) {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ブロック状態チェック
    if (isBlocked) {
      setError("セキュリティのため一時的にログインがブロックされています");
      return;
    }
    
    // 基本バリデーション
    if (!formData.email || !formData.password) {
      setError("メールアドレスとパスワードを入力してください");
      logSecurityEvent('login_validation_failed', { email: formData.email, reason: 'missing_fields' });
      return;
    }

    // メールアドレス形式チェック
    if (!validateEmail(formData.email)) {
      setError("有効なメールアドレス形式で入力してください");
      logSecurityEvent('login_validation_failed', { email: formData.email, reason: 'invalid_email_format' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logSecurityEvent('login_attempt', { email: formData.email });
      
      const result = await signInWithEmail(formData.email, formData.password);
      
      if (result.error) {
        setError(result.error);
        setLoginAttempts(prev => prev + 1);
        
        logSecurityEvent('login_failed', { 
          email: formData.email, 
          attempts: loginAttempts + 1,
          error: result.error 
        });
        
        // 5回失敗でブロック
        if (loginAttempts >= 4) {
          setIsBlocked(true);
          logSecurityEvent('login_blocked', { email: formData.email, attempts: loginAttempts + 1 });
          setTimeout(() => {
            setIsBlocked(false);
            setLoginAttempts(0);
          }, 15 * 60 * 1000); // 15分でブロック解除
        }
        return;
      }

      // 成功時
      logSecurityEvent('login_success', { email: formData.email });
      startSession();
      showSuccess("ログインしました");
      setLoginAttempts(0); // リセット
      
    } catch (err: any) {
      console.error("Login error:", err);
      showError(err, "ログインに失敗しました");
      logSecurityEvent('login_error', { email: formData.email, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setFormData({
      email,
      password: "demo123",
    });
    
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithEmail(email, "demo123");
      
      if (result.error) {
        setError(result.error);
        return;
      }

      console.log("✅ Demo login successful");
      
    } catch (err: any) {
      console.error("Demo login error:", err);
      setError("デモログインに失敗しました");
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
            <CardTitle>ログイン</CardTitle>
            <CardDescription>
              アカウントにログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="パスワードを入力"
                />
              </div>

              {isBlocked && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    セキュリティのため一時的にログインがブロックされています（15分後に解除）
                  </AlertDescription>
                </Alert>
              )}

              {loginAttempts > 0 && !isBlocked && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ログイン失敗: {loginAttempts}/5回 ({5 - loginAttempts}回失敗で一時ブロック)
                  </AlertDescription>
                </Alert>
              )}

              {error && !isBlocked && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || isBlocked}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">デモアカウント</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => handleDemoLogin("tanaka@company.com")}
                  disabled={loading}
                >
                  田中作業員でログイン
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => handleDemoLogin("sato@company.com")}
                  disabled={loading}
                >
                  佐藤班長でログイン
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => handleDemoLogin("watanabe@company.com")}
                  disabled={loading}
                >
                  渡辺部長でログイン
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                className="text-sm"
                onClick={() => router.push("/register")}
              >
                新規アカウント作成
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