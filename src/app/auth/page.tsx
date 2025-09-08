"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  User,
  UserCheck,
  UserX,
  Key,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'leader' | 'worker';
  department: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  createdAt: Date;
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'admin' | 'system';
}

const DEPARTMENTS = [
  '製造部',
  '品質管理部', 
  '技術部',
  '営業部',
  '総務部',
  '人事部'
];

const ROLES = [
  { value: 'worker', label: '作業員', permissions: ['read_own', 'write_own'] },
  { value: 'leader', label: 'リーダー', permissions: ['read_own', 'write_own', 'read_team'] },
  { value: 'manager', label: 'マネージャー', permissions: ['read_all', 'write_all', 'manage_team'] },
  { value: 'admin', label: '管理者', permissions: ['read_all', 'write_all', 'manage_users', 'system_config'] },
];

const PERMISSIONS: Permission[] = [
  { id: 'read_own', name: '自分のデータ閲覧', description: '自分が作成したデータの閲覧', category: 'read' },
  { id: 'write_own', name: '自分のデータ編集', description: '自分が作成したデータの編集', category: 'write' },
  { id: 'read_team', name: 'チームデータ閲覧', description: '同じ部門のデータの閲覧', category: 'read' },
  { id: 'read_all', name: '全データ閲覧', description: 'すべてのデータの閲覧', category: 'read' },
  { id: 'write_all', name: '全データ編集', description: 'すべてのデータの編集', category: 'write' },
  { id: 'manage_team', name: 'チーム管理', description: '同じ部門のメンバー管理', category: 'admin' },
  { id: 'manage_users', name: 'ユーザー管理', description: 'ユーザーアカウントの管理', category: 'admin' },
  { id: 'system_config', name: 'システム設定', description: 'システム全体の設定管理', category: 'system' },
];

export default function AuthPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'sessions'>('users');
  
  // モーダル状態
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "worker" as UserAccount['role'],
    department: "",
    status: "active" as UserAccount['status'],
    password: "",
  });

  // 初期データ（実際の実装ではFirebaseから読み込み）
  useEffect(() => {
    if (!user?.uid) return;
    
    const mockUsers: UserAccount[] = [
      {
        id: user.uid,
        name: user.displayName || user.name || 'ユーザー',
        email: user.email || '',
        role: 'admin',
        department: '技術部',
        status: 'active',
        lastLogin: new Date(),
        createdAt: new Date('2024-01-01'),
        permissions: ROLES.find(r => r.value === 'admin')?.permissions || [],
      },
      {
        id: '2',
        name: '田中太郎',
        email: 'tanaka@company.com',
        role: 'manager',
        department: '製造部',
        status: 'active',
        lastLogin: new Date(Date.now() - 1000 * 60 * 30), // 30分前
        createdAt: new Date('2024-01-15'),
        permissions: ROLES.find(r => r.value === 'manager')?.permissions || [],
      },
      {
        id: '3',
        name: '佐藤花子',
        email: 'sato@company.com',
        role: 'leader',
        department: '品質管理部',
        status: 'active',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
        createdAt: new Date('2024-02-01'),
        permissions: ROLES.find(r => r.value === 'leader')?.permissions || [],
      },
      {
        id: '4',
        name: '山田次郎',
        email: 'yamada@company.com',
        role: 'worker',
        department: '製造部',
        status: 'inactive',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3日前
        createdAt: new Date('2024-02-15'),
        permissions: ROLES.find(r => r.value === 'worker')?.permissions || [],
      },
    ];
    
    setUsers(mockUsers);
  }, [user?.uid]);

  // フィルタリングされたユーザー
  const filteredUsers = users.filter((userAccount) => {
    const matchesSearch = searchQuery === "" || 
      userAccount.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userAccount.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || userAccount.department === selectedDepartment;
    const matchesRole = selectedRole === "all" || userAccount.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || userAccount.status === selectedStatus;
    
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  // ロール情報取得
  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0];
  };

  // ステータス色取得
  const getStatusColor = (status: UserAccount['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
    }
  };

  // ステータス日本語化
  const getStatusLabel = (status: UserAccount['status']) => {
    switch (status) {
      case 'active': return '有効';
      case 'inactive': return '無効';
      case 'suspended': return '停止中';
    }
  };

  // 相対時間表示
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "worker",
      department: "",
      status: "active",
      password: "",
    });
    setEditingUser(null);
  };

  // ユーザー編集開始
  const startEditUser = (userAccount: UserAccount) => {
    setEditingUser(userAccount);
    setFormData({
      name: userAccount.name,
      email: userAccount.email,
      role: userAccount.role,
      department: userAccount.department,
      status: userAccount.status,
      password: "",
    });
  };

  // ステータス切り替え
  const toggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(userAccount => 
      userAccount.id === userId 
        ? { 
            ...userAccount, 
            status: userAccount.status === 'active' ? 'inactive' : 'active' 
          } 
        : userAccount
    ));
  };

  if (!user?.uid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-300">ログインが必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">認証・権限管理</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-slate-300">
                  <span>総ユーザー数: <span className="font-bold text-indigo-600">{users.length}</span></span>
                  <span>有効: <span className="font-bold text-green-600">{users.filter(u => u.status === 'active').length}</span></span>
                  <span>無効: <span className="font-bold text-gray-600">{users.filter(u => u.status === 'inactive').length}</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ユーザーを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              <Button
                onClick={() => {
                  resetForm();
                  setShowUserModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規ユーザー
              </Button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex overflow-hidden">
          {/* サイドバー */}
          <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4">
            <div className="space-y-6">
              {/* 部署フィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">部署</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedDepartment("all")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedDepartment === "all" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    すべて ({users.length})
                  </button>
                  
                  {DEPARTMENTS.map((dept) => {
                    const count = users.filter(u => u.department === dept).length;
                    return (
                      <button
                        key={dept}
                        onClick={() => setSelectedDepartment(dept)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedDepartment === dept ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span>{dept}</span>
                        <span className="text-xs bg-gray-100 dark:bg-slate-600 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 役職フィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">役職</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedRole("all")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedRole === "all" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    すべて
                  </button>
                  
                  {ROLES.map((role) => {
                    const count = users.filter(u => u.role === role.value).length;
                    return (
                      <button
                        key={role.value}
                        onClick={() => setSelectedRole(role.value)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedRole === role.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span>{role.label}</span>
                        <span className="text-xs bg-gray-100 dark:bg-slate-600 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ユーザーリスト */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="mb-6">
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    ユーザー管理
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    権限管理
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    セッション管理
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                      <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl text-gray-500 mb-2">該当するユーザーが見つかりません</p>
                      <p className="text-gray-400">検索条件を変更してみてください</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredUsers.map((userAccount) => (
                        <Card key={userAccount.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  userAccount.status === 'active' ? 'bg-green-100' : 
                                  userAccount.status === 'suspended' ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                  <User className={`w-6 h-6 ${
                                    userAccount.status === 'active' ? 'text-green-600' :
                                    userAccount.status === 'suspended' ? 'text-red-600' : 'text-gray-600'
                                  }`} />
                                </div>
                                
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                      {userAccount.name}
                                    </h3>
                                    <Badge className={getStatusColor(userAccount.status)}>
                                      {getStatusLabel(userAccount.status)}
                                    </Badge>
                                    <Badge variant="outline">
                                      {getRoleInfo(userAccount.role).label}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-slate-300">
                                    <span>{userAccount.email}</span>
                                    <span>•</span>
                                    <span>{userAccount.department}</span>
                                    {userAccount.lastLogin && (
                                      <>
                                        <span>•</span>
                                        <span>最終ログイン: {getRelativeTime(userAccount.lastLogin)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditUser(userAccount)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleUserStatus(userAccount.id)}
                                  className={userAccount.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                                >
                                  {userAccount.status === 'active' ? (
                                    <UserX className="w-4 h-4" />
                                  ) : (
                                    <UserCheck className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="permissions" className="space-y-6">
                  <div className="grid gap-6">
                    {Object.entries(
                      PERMISSIONS.reduce((acc, perm) => {
                        if (!acc[perm.category]) acc[perm.category] = [];
                        acc[perm.category].push(perm);
                        return acc;
                      }, {} as Record<string, Permission[]>)
                    ).map(([category, perms]) => (
                      <Card key={category}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {category === 'read' && <Eye className="w-5 h-5 text-blue-600" />}
                            {category === 'write' && <Edit3 className="w-5 h-5 text-green-600" />}
                            {category === 'admin' && <Shield className="w-5 h-5 text-orange-600" />}
                            {category === 'system' && <Settings className="w-5 h-5 text-red-600" />}
                            {category === 'read' ? '閲覧権限' :
                             category === 'write' ? '編集権限' :
                             category === 'admin' ? '管理権限' : 'システム権限'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3">
                            {perms.map((perm) => (
                              <div key={perm.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">{perm.name}</h4>
                                  <p className="text-sm text-gray-600 dark:text-slate-300">{perm.description}</p>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {ROLES.filter(role => role.permissions.includes(perm.id)).map(role => role.label).join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="sessions">
                  <Card>
                    <CardHeader>
                      <CardTitle>アクティブセッション</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredUsers
                          .filter(u => u.status === 'active' && u.lastLogin)
                          .sort((a, b) => (b.lastLogin?.getTime() || 0) - (a.lastLogin?.getTime() || 0))
                          .map((userAccount) => (
                            <div key={userAccount.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <div>
                                  <div className="font-medium">{userAccount.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {userAccount.department} • {getRoleInfo(userAccount.role).label}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {userAccount.lastLogin && getRelativeTime(userAccount.lastLogin)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* ユーザー作成・編集モーダル */}
        <Dialog open={showUserModal || !!editingUser} onOpenChange={(open) => {
          if (!open) {
            setShowUserModal(false);
            setEditingUser(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'ユーザー編集' : '新規ユーザー作成'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例: 田中太郎"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="例: tanaka@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">部署</label>
                  <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="部署を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">役職</label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="役職を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                    初期パスワード <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="6文字以上で入力"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  disabled={!formData.name.trim() || !formData.email.trim() || (!editingUser && !formData.password.trim())}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingUser ? '更新' : '作成'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}