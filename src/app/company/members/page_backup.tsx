"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  AppUser,
  updateAppUser,
  DEPARTMENTS,
  ROLES,
  getRoleDisplayName
} from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Search,
  Shield,
  Building2,
  Settings,
  Edit2,
  Trash2,
  MoreHorizontal,
  Filter,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  User,
  Crown,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 製造業向け役職設定
const ROLE_STYLES = {
  admin: { 
    label: '管理者',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    icon: Crown,
    permissions: ['全機能へのアクセス', 'メンバー管理', 'システム設定']
  },
  manager: { 
    label: '部長',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: Shield,
    permissions: ['部署管理', 'レポート閲覧', 'メンバー監督']
  },
  leader: { 
    label: '班長',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    icon: Briefcase,
    permissions: ['班員管理', '作業指示', 'タスク管理']
  },
  worker: { 
    label: '作業員',
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-700',
    icon: User,
    permissions: ['基本機能', '日報入力', 'タスク確認']
  }
};

export default function CompanyMembersPage() {
  const { user } = useAuth();
  
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<AppUser | null>(null);
  const [editingMember, setEditingMember] = useState<AppUser | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    employeeId: '',
    role: 'worker' as AppUser['role'],
    department: DEPARTMENTS[0]
  });

  // Load members
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'appUsers'));
      const querySnapshot = await getDocs(q);
      
      const membersList: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        membersList.push({
          uid: doc.id,
          email: data.email,
          name: data.name,
          role: data.role,
          department: data.department,
          employeeId: data.employeeId,
          isActive: data.isActive,
          avatar: data.avatar,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      
      setMembers(membersList);
    } catch (err) {
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (searchQuery) {
      result = result.filter(member => 
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterRole !== 'all') {
      result = result.filter(member => member.role === filterRole);
    }

    if (filterDepartment !== 'all') {
      result = result.filter(member => member.department === filterDepartment);
    }

    return result;
  }, [members, searchQuery, filterRole, filterDepartment]);

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Update member role
  const handleUpdateRole = async (member: AppUser, newRole: AppUser['role']) => {
    if (!canManage) return;
    
    try {
      await updateAppUser(member.uid, { role: newRole });
      await loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('役職の変更に失敗しました');
    }
  };

  // Update member from edit dialog
  const handleUpdateMember = async (memberData: Partial<AppUser>) => {
    if (!editingMember) return;
    
    try {
      await updateAppUser(editingMember.uid, memberData);
      await loadMembers();
      setEditingMember(null);
    } catch (error) {
      console.error('Error updating member:', error);
      alert('メンバー情報の更新に失敗しました');
    }
  };

  // Toggle member active status
  const handleToggleActiveStatus = async (member: AppUser) => {
    if (!canManage) return;
    
    try {
      await updateAppUser(member.uid, { isActive: !member.isActive });
      await loadMembers();
    } catch (error) {
      console.error('Error updating member status:', error);
      alert('ステータスの変更に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">メンバー管理</h1>
                  <div className="text-sm text-gray-500 flex items-center gap-4">
                    <span>総メンバー数: {members.length}名</span>
                    <span>アクティブ: {members.filter(m => m.isActive).length}名</span>
                    <span>部署数: {[...new Set(members.map(m => m.department))].length}</span>
                  </div>
                </div>
              </div>
            </div>

            {canManage && (
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-6 shadow-lg hover:shadow-xl transition-all"
                onClick={() => setShowAddMember(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                新規メンバー追加
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="名前、メール、社員番号で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="役職で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての役職</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="部署で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての部署</SelectItem>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Members Table */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">メンバー</th>
                <th className="text-left p-4 font-semibold text-gray-900">社員番号</th>
                <th className="text-left p-4 font-semibold text-gray-900">部署</th>
                <th className="text-left p-4 font-semibold text-gray-900">役職</th>
                <th className="text-left p-4 font-semibold text-gray-900">権限</th>
                <th className="text-left p-4 font-semibold text-gray-900">状態</th>
                {canManage && <th className="text-left p-4 font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const roleStyle = ROLE_STYLES[member.role];
                const RoleIcon = roleStyle.icon;
                
                return (
                  <tr key={member.uid} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {member.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {member.employeeId}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-700">{member.department}</span>
                    </td>
                    <td className="p-4">
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge className={`${roleStyle.bg} ${roleStyle.text} border cursor-pointer hover:opacity-80 inline-flex items-center gap-1`}>
                              <RoleIcon className="w-3 h-3" />
                              {roleStyle.label}
                              <ChevronDown className="w-3 h-3" />
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {ROLES.map(role => {
                              const newRoleStyle = ROLE_STYLES[role.value];
                              const NewRoleIcon = newRoleStyle.icon;
                              return (
                                <DropdownMenuItem 
                                  key={role.value}
                                  onClick={() => handleUpdateRole(member, role.value)}
                                  disabled={member.role === role.value}
                                  className="flex items-center gap-2"
                                >
                                  <NewRoleIcon className="w-4 h-4" />
                                  {role.label}
                                  {member.role === role.value && (
                                    <CheckCircle className="w-3 h-3 ml-auto text-green-600" />
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge className={`${roleStyle.bg} ${roleStyle.text} border`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleStyle.label}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-gray-600 max-w-[150px]">
                        {roleStyle.permissions.slice(0, 2).join(', ')}
                        {roleStyle.permissions.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            アクティブ
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            無効
                          </>
                        )}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMember(member)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              編集
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActiveStatus(member)}>
                              {member.isActive ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  無効化
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  有効化
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>検索条件に合うメンバーが見つかりません</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバー情報編集</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前
                </label>
                <Input
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({
                    ...editingMember,
                    name: e.target.value
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  部署
                </label>
                <Select
                  value={editingMember.department}
                  onValueChange={(value) => setEditingMember({
                    ...editingMember,
                    department: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役職
                </label>
                <Select
                  value={editingMember.role}
                  onValueChange={(value: AppUser['role']) => setEditingMember({
                    ...editingMember,
                    role: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  キャンセル
                </Button>
                <Button onClick={() => handleUpdateMember({
                  name: editingMember.name,
                  department: editingMember.department,
                  role: editingMember.role
                })}>
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}