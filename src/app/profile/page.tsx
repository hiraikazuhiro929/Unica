"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  
  // UI状態
  const [activeSection, setActiveSection] = useState('profile');
  
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
    <div className="h-screen bg-gray-50 ml-0 md:ml-16 flex">
      {/* 左サイドバー */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">プロフィール設定</h1>
          <p className="text-sm text-gray-600 mt-1">アカウント情報を管理</p>
        </div>
        
        <nav className="space-y-2">
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'profile'
                ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <User className="w-4 h-4 mr-3" />
              基本情報
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('password')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'password'
                ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-3" />
              パスワード変更
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('danger')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'danger'
                ? 'bg-red-50 text-red-700 border-l-2 border-red-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <Trash2 className="w-4 h-4 mr-3" />
              危険な操作
            </div>
          </button>
        </nav>
      </div>

      {/* 右メインコンテンツ */}
      <div className="flex-1 p-6 overflow-auto">
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

        {/* 基本情報セクション */}
        {activeSection === 'profile' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">基本情報</h2>
              <p className="text-gray-600">プロフィール情報を編集できます</p>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">氏名</Label>
                <Input
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileInputChange}
                  placeholder="例: 田中太郎"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-sm font-medium text-gray-700">社員番号</Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  value={profileData.employeeId}
                  onChange={handleProfileInputChange}
                  placeholder="例: EMP001"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">部署</Label>
                <Select
                  value={profileData.department}
                  onValueChange={(value) => handleSelectChange("department", value)}
                >
                  <SelectTrigger className="w-full">
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
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">役職</Label>
                <Select
                  value={profileData.role}
                  onValueChange={(value) => handleSelectChange("role", value)}
                >
                  <SelectTrigger className="w-full">
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

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
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
          </div>
        )}

        {/* パスワード変更セクション */}
        {activeSection === 'password' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">パスワード変更</h2>
              <p className="text-gray-600">セキュリティのため、現在のパスワードが必要です</p>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">現在のパスワード</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="現在のパスワードを入力"
                    className="w-full"
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
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">新しいパスワード</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="6文字以上で入力"
                    className="w-full"
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
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">パスワード（確認）</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="新しいパスワードを再入力"
                    className="w-full"
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
                  className="bg-blue-600 hover:bg-blue-700"
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
          </div>
        )}

        {/* 危険な操作セクション */}
        {activeSection === 'danger' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-red-600 mb-2">危険な操作</h2>
              <p className="text-gray-600">これらの操作は取り消すことができません</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">アカウント削除</h3>
                <p className="text-gray-600 mb-4">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}