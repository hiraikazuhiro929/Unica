"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  User, 
  Lock, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Save,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  updateAppUser, 
  updateUserPassword, 
  deleteUserAccount,
  DEPARTMENTS, 
  ROLES,
  getRoleDisplayName 
} from "@/lib/firebase/auth";

export default function ProfilePage() {
  console.log('🏠 ProfilePage: Component rendering...');
  
  const { user, refreshUser, logout } = useAuth();
  console.log('👤 ProfilePage: User state:', user);
  
  // プロフィール編集用のstate
  const [profileData, setProfileData] = useState({
    name: "",
    employeeId: "",
    role: "" as "" | "admin" | "manager" | "leader" | "worker",
    department: "",
  });
  
  // パスワード変更用のstate
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // UI状態
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // ユーザーデータをフォームに設定
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        employeeId: user.employeeId || "",
        role: user.role || "",
        department: user.department || "",
      });
    }
  }, [user]);

  // メッセージ自動削除
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (message) setMessage(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (message) setMessage(null);
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (message) setMessage(null);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const result = await updateAppUser(user.uid, {
        name: profileData.name,
        employeeId: profileData.employeeId,
        role: profileData.role,
        department: profileData.department,
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      await refreshUser();
      setMessage({ type: 'success', text: 'プロフィールを更新しました' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `更新エラー: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'パスワードが一致しません' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'パスワードは6文字以上で入力してください' });
      return;
    }

    setPasswordLoading(true);
    setMessage(null);

    try {
      const result = await updateUserPassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage({ type: 'success', text: 'パスワードを変更しました' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `パスワード変更エラー: ${err.message}` });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    if (!window.confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setDeleteLoading(true);
    setMessage(null);

    try {
      const result = await deleteUserAccount();

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // アカウント削除成功時はログアウト
      await logout();
    } catch (err: any) {
      setMessage({ type: 'error', text: `削除エラー: ${err.message}` });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen bg-white flex items-center justify-center ml-0 md:ml-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">ユーザー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 ml-0 md:ml-16 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">プロフィール設定</h1>
          <p className="text-gray-600 mt-2">アカウント情報を管理します</p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">基本情報</TabsTrigger>
            <TabsTrigger value="password">パスワード変更</TabsTrigger>
            <TabsTrigger value="danger">アカウント管理</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  基本情報
                </CardTitle>
                <CardDescription>
                  プロフィール情報を編集できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">氏名</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileInputChange}
                        placeholder="例: 田中太郎"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeId">社員番号</Label>
                      <Input
                        id="employeeId"
                        name="employeeId"
                        value={profileData.employeeId}
                        onChange={handleProfileInputChange}
                        placeholder="例: EMP001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">部署</Label>
                      <Select
                        value={profileData.department}
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
                        value={profileData.role}
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
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          更新中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          変更を保存
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  パスワード変更
                </CardTitle>
                <CardDescription>
                  セキュリティのため、現在のパスワードが必要です
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">現在のパスワード</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="現在のパスワードを入力"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新しいパスワード</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="6文字以上で入力"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="新しいパスワードを再入力"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full md:w-auto"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          変更中...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          パスワードを変更
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="danger">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <Trash2 className="w-5 h-5 mr-2" />
                  危険な操作
                </CardTitle>
                <CardDescription>
                  これらの操作は取り消すことができません
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">アカウント削除</h3>
                  <p className="text-sm text-red-700 mb-4">
                    アカウントを完全に削除します。この操作は取り消せません。
                    すべてのデータが失われます。
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleAccountDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        削除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        アカウントを削除
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}