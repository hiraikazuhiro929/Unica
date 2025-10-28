"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { 
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  AppUser,
  updateAppUser,
  DEPARTMENTS,
  ROLES,
  getRoleDisplayName
} from '@/lib/firebase/auth';
import {
  createInvite,
  getCompanyInvites,
  deactivateInvite,
  cleanupExpiredInvites,
  deactivateDangerousFixedInviteCodes,
  CompanyInvite
} from '@/lib/firebase/company';
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
  ChevronDown,
  AlertTriangle,
  Mail,
  Copy,
  UserCheck,
  History,
  Upload,
  Info,
  Lock,
  Unlock
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// 製造業向け役職設定（拡張版）
const ROLE_STYLES: { [key: string]: { label: string; bg: string; text: string; icon: any; permissions: string[]; level: number } } = {
  admin: { 
    label: '管理者',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    icon: Crown,
    permissions: ['全機能へのアクセス', 'メンバー管理', 'システム設定', 'データ削除', '監査ログ閲覧'],
    level: 4
  },
  manager: { 
    label: '部長',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: Shield,
    permissions: ['部署管理', 'レポート閲覧', 'メンバー監督', 'タスク承認', '予算管理'],
    level: 3
  },
  leader: { 
    label: '班長',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    icon: Briefcase,
    permissions: ['班員管理', '作業指示', 'タスク管理', '日報承認'],
    level: 2
  },
  worker: { 
    label: '作業員',
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-700',
    icon: User,
    permissions: ['基本機能', '日報入力', 'タスク確認'],
    level: 1
  }
};

// グループ設定
const GROUPS = [
  { id: 'production', label: '製造部', color: 'blue' },
  { id: 'quality', label: '品質管理', color: 'green' },
  { id: 'maintenance', label: '保守', color: 'orange' },
  { id: 'logistics', label: '物流', color: 'purple' },
];

export default function CompanyMembersPage() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [editingMember, setEditingMember] = useState<AppUser | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    member: AppUser,
    newRole: string,
    reason?: string
  } | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('worker');
  const [inviteMessage, setInviteMessage] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showDetailModal, setShowDetailModal] = useState<AppUser | null>(null);
  // 固定招待コード機能は削除されました（セキュリティリスク）
  // 固定招待コード読み込み状態は不要（削除済み）
  const [sendingInvite, setSendingInvite] = useState(false);

  // 招待管理関連の状態
  const [companyInvites, setCompanyInvites] = useState<CompanyInvite[]>([]);
  const [showInviteManager, setShowInviteManager] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const canManage = useMemo(() => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager';
  }, [user]);

  // Load members and invites
  useEffect(() => {
    loadMembers();
    if (canManage) {
      loadCompanyInvites();
    }
  }, [user, currentCompany, canManage]);

  // loadInviteCode関数は削除されました（固定招待コード廃止のため）

  const loadMembers = async () => {
    console.log('🔍 loadMembers called, user:', user);
    console.log('🔍 currentCompany:', currentCompany);
    console.log('🔍 user.companyId:', user?.companyId);
    console.log('🔍 currentCompany.id:', currentCompany?.id);
    
    if (!user || !currentCompany?.id) {
      console.log('❌ No user or currentCompany found');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔍 Querying appUsers collection for companyId:', currentCompany.id);
      
      // まず全ユーザーを確認
      const allUsersSnapshot = await getDocs(collection(db, 'appUsers'));
      console.log('📊 All appUsers in collection:', allUsersSnapshot.docs.length);
      
      // 現在のユーザーのcompanyIdが設定されていない場合は更新
      const currentUserDoc = allUsersSnapshot.docs.find(doc => doc.id === user.uid);
      if (currentUserDoc && !currentUserDoc.data().companyId) {
        console.log('🔧 Updating user companyId...');
        await updateDoc(doc(db, 'appUsers', user.uid), {
          companyId: currentCompany.id
        });
        console.log('✅ User companyId updated');
      }
      
      // 企業IDでフィルター（まずは全ユーザーから手動でフィルター）
      const memberData = allUsersSnapshot.docs
        .map(doc => ({
          ...doc.data(),
          uid: doc.id
        } as AppUser))
        .filter(member => 
          member.uid === user.uid || // 現在のユーザーは必ず含める
          member.companyId === currentCompany.id // または同じ企業ID
        );
      
      console.log('🔍 Filtered member data:', memberData);
      setMembers(memberData);
    } catch (error) {
      console.error('❌ Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    let filtered = members;
    
    if (searchQuery) {
      filtered = filtered.filter(member => 
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(member => member.role === filterRole);
    }
    
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(member => member.department === filterDepartment);
    }
    
    return filtered;
  }, [members, searchQuery, filterRole, filterDepartment]);

  // Update member role with confirmation
  const handleUpdateRole = async (member: AppUser, newRole: 'admin' | 'manager' | 'leader' | 'worker') => {
    console.log('🔧 handleUpdateRole called:', member.name, 'to', newRole);
    if (!canManage) return;
    
    // 重要な権限変更は確認ダイアログを表示
    const currentLevel = ROLE_STYLES[member.role].level;
    const newLevel = ROLE_STYLES[newRole].level;
    
    if (Math.abs(currentLevel - newLevel) > 1 || newRole === 'admin' || member.role === 'admin') {
      console.log('🚨 Showing confirmation dialog');
      setRoleChangeConfirm({ member, newRole });
      return;
    }
    
    try {
      await updateAppUser(member.uid, { role: newRole });
      
      // 操作ログを記録
      await addDoc(collection(db, 'activityLogs'), {
        type: 'role_change',
        targetUserId: member.uid,
        targetUserName: member.name,
        oldRole: member.role,
        newRole: newRole,
        performedBy: user?.uid,
        performedByName: user?.name,
        timestamp: serverTimestamp(),
        companyId: currentCompany?.id
      });
      
      await loadMembers();
      alert(`${member.name}の役職を${ROLE_STYLES[newRole].label}に変更しました`);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('役職の変更に失敗しました');
    }
  };

  // Confirm role change
  const confirmRoleChange = async () => {
    console.log('✅ confirmRoleChange called');
    if (!roleChangeConfirm) return;

    // 最後の管理者を削除しようとしていないかチェック
    const currentAdminCount = members.filter(m => m.role === 'admin').length;
    const isRemovingLastAdmin = roleChangeConfirm.member.role === 'admin' &&
                                roleChangeConfirm.newRole !== 'admin' &&
                                currentAdminCount === 1;

    if (isRemovingLastAdmin) {
      alert('⚠️ エラー: 最後の管理者の権限を削除することはできません。\n\n他のメンバーを管理者に昇格させてから実行してください。');
      return;
    }

    try {
      await updateAppUser(roleChangeConfirm.member.uid, { role: roleChangeConfirm.newRole as 'admin' | 'manager' | 'leader' | 'worker' });

      // 操作ログを記録（理由付き）
      await addDoc(collection(db, 'activityLogs'), {
        type: 'role_change',
        targetUserId: roleChangeConfirm.member.uid,
        targetUserName: roleChangeConfirm.member.name,
        oldRole: roleChangeConfirm.member.role,
        newRole: roleChangeConfirm.newRole,
        reason: roleChangeConfirm.reason || '理由未記入',
        performedBy: user?.uid,
        performedByName: user?.name,
        timestamp: serverTimestamp(),
        companyId: currentCompany?.id
      });

      await loadMembers();
      alert(`${roleChangeConfirm.member.name}の役職を${ROLE_STYLES[roleChangeConfirm.newRole].label}に変更しました`);
      console.log('✅ Role change completed, closing dialog');
      setRoleChangeConfirm(null);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('役職の変更に失敗しました');
    }
  };

  // Toggle member active status
  const handleToggleActiveStatus = async (member: AppUser) => {
    if (!canManage) return;
    
    try {
      await updateAppUser(member.uid, { isActive: !member.isActive });
      
      // 操作ログを記録
      await addDoc(collection(db, 'activityLogs'), {
        type: member.isActive ? 'deactivate' : 'activate',
        targetUserId: member.uid,
        targetUserName: member.name,
        performedBy: user?.uid,
        performedByName: user?.name,
        timestamp: serverTimestamp(),
        companyId: currentCompany?.id
      });
      
      await loadMembers();
      alert(`${member.name}を${!member.isActive ? '有効化' : '無効化'}しました`);
    } catch (error) {
      console.error('Error updating member status:', error);
      alert('ステータスの変更に失敗しました');
    }
  };

  // Handle batch operations
  const handleBatchOperation = async (operation: 'activate' | 'deactivate' | 'changeRole') => {
    if (!canManage || selectedMembers.size === 0) return;
    
    switch (operation) {
      case 'activate':
      case 'deactivate':
        try {
          const promises = Array.from(selectedMembers).map(uid => 
            updateAppUser(uid, { isActive: operation === 'activate' })
          );
          await Promise.all(promises);
          
          // 操作ログを記録
          await addDoc(collection(db, 'activityLogs'), {
            type: `batch_${operation}`,
            targetUserIds: Array.from(selectedMembers),
            count: selectedMembers.size,
            performedBy: user?.uid,
            performedByName: user?.name,
            timestamp: serverTimestamp(),
            companyId: currentCompany?.id
          });
          
          await loadMembers();
          alert(`${selectedMembers.size}名のメンバーを${operation === 'activate' ? '有効化' : '無効化'}しました`);
          setSelectedMembers(new Set());
        } catch (error) {
          console.error('Error in batch operation:', error);
          alert('一括操作に失敗しました');
        }
        break;
        
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (uid: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(uid)) {
      newSelection.delete(uid);
    } else {
      newSelection.add(uid);
    }
    setSelectedMembers(newSelection);
  };

  // Select all visible members
  const selectAllMembers = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.uid)));
    }
  };

  // 固定招待コード関連のコピー機能は削除されました

  // 企業の招待一覧を読み込み
  const loadCompanyInvites = async () => {
    if (!user || !currentCompany?.id || !canManage) return;

    setLoadingInvites(true);
    try {
      // セキュリティ清掃: 危険な固定招待コードを無効化
      const deactivatedCount = await deactivateDangerousFixedInviteCodes(currentCompany.id);
      if (deactivatedCount > 0) {
        console.log(`🛡️ セキュリティ改善: ${deactivatedCount}個の危険な固定招待コードを無効化しました`);
      }

      const invites = await getCompanyInvites(currentCompany.id);
      setCompanyInvites(invites);

      // 期限切れの招待を自動クリーンアップ
      await cleanupExpiredInvites(currentCompany.id);
    } catch (error) {
      console.error('招待一覧取得エラー:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  // 招待を無効化
  const handleDeactivateInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      await deactivateInvite(inviteId, user.uid);
      await loadCompanyInvites(); // 招待一覧を更新
      alert('招待を無効化しました');
    } catch (error) {
      console.error('招待無効化エラー:', error);
      alert('招待の無効化に失敗しました');
    }
  };

  const handleSendInvite = async () => {
    if (!user || !currentCompany?.id || !inviteEmail) return;

    setSendingInvite(true);
    try {
      // 1. 個別招待データを作成（安全なトークンのみ使用）
      const invite = await createInvite(currentCompany.id, user.uid, {
        email: inviteEmail,
        role: inviteRole as any,
        expiresInDays: 7, // 7日間の有効期限
      });

      // 2. 招待リンクを生成
      const inviteLink = `${window.location.origin}/join/${invite.code}`;

      // 3. メール送信
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          inviteLink,
          companyName: currentCompany.name,
          inviterName: user.name,
          role: ROLES.find(r => r.value === inviteRole)?.label || inviteRole,
          message: inviteMessage,
          expiresAt: invite.expiresAt, // 有効期限を追加
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'メール送信に失敗しました');
      }

      alert(`${inviteEmail}に招待メールを送信しました！`);
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('worker');
      setInviteMessage('');

      // 招待一覧を更新
      await loadCompanyInvites();
    } catch (error) {
      console.error('招待送信エラー:', error);
      alert(`招待の送信に失敗しました: ${error.message}`);
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">メンバー管理</h1>
                  <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-4">
                    <span>総メンバー数: {members.length}名</span>
                    <span>アクティブ: {members.filter(m => m.isActive).length}名</span>
                    <span>部署数: {[...new Set(members.map(m => m.department))].length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 固定招待コード表示は削除されました（セキュリティリスク） */}

            {canManage && selectedMembers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-300 px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full">
                  {selectedMembers.size}名選択中
                </span>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      一括操作
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuLabel>一括操作</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBatchOperation('activate')}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      有効化
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchOperation('deactivate')}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      無効化
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder="名前、メール、社員番号で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
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
                    <div className="flex items-center gap-2">
                      {React.createElement(ROLE_STYLES[role.value].icon, { className: "w-4 h-4" })}
                      {role.label}
                    </div>
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

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border rounded-lg px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700",
                    viewMode === 'list' && "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                  )}
                >
                  リスト
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700",
                    viewMode === 'grid' && "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                  )}
                >
                  グリッド
                </Button>
              </div>
              
              {canManage && (
                <>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      招待
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInviteManager(true)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      招待管理
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
          {viewMode === 'list' ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                <tr>
                  {canManage && (
                    <th className="w-12 p-4">
                      <Checkbox
                        checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                        onCheckedChange={selectAllMembers}
                      />
                    </th>
                  )}
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">メンバー</th>
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">社員番号</th>
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">部署</th>
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">役職</th>
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">権限</th>
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">状態</th>
                  {canManage && <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">操作</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const roleStyle = ROLE_STYLES[member.role];
                  const RoleIcon = roleStyle.icon;
                  
                  return (
                    <tr key={member.uid} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      {canManage && (
                        <td className="w-12 p-4">
                          <Checkbox
                            checked={selectedMembers.has(member.uid)}
                            onCheckedChange={() => toggleMemberSelection(member.uid)}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <button
                          onClick={() => setShowDetailModal(member)}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {member.name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">{member.email}</div>
                          </div>
                        </button>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1 rounded">
                          {member.employeeId}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-700 dark:text-slate-300">{member.department}</span>
                      </td>
                      <td className="p-4">
                        {canManage ? (
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Badge className={`${roleStyle.bg} ${roleStyle.text} border cursor-pointer hover:opacity-80 inline-flex items-center gap-1`}>
                                <RoleIcon className="w-3 h-3" />
                                {roleStyle.label}
                                <ChevronDown className="w-3 h-3" />
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                              <DropdownMenuLabel>役職を変更</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ROLES.map(role => {
                                const newRoleStyle = ROLE_STYLES[role.value];
                                const NewRoleIcon = newRoleStyle.icon;
                                const isCurrentRole = member.role === role.value;
                                
                                return (
                                  <DropdownMenuItem 
                                    key={role.value}
                                    onClick={() => {
                                      if (!isCurrentRole) {
                                        handleUpdateRole(member, role.value);
                                      }
                                    }}
                                    disabled={isCurrentRole}
                                    className="flex items-center gap-2"
                                  >
                                    <NewRoleIcon className="w-4 h-4" />
                                    {role.label}
                                    {isCurrentRole && (
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
                        <div className="text-xs text-gray-600 dark:text-slate-400 max-w-[200px]">
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
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                              <DropdownMenuItem onClick={() => setShowDetailModal(member)}>
                                <Info className="mr-2 h-4 w-4" />
                                詳細表示
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingMember(member)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleActiveStatus(member)}>
                                {member.isActive ? (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    無効化
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" />
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
          ) : (
            // Grid View
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50 dark:bg-slate-900">
              {filteredMembers.map((member) => {
                const roleStyle = ROLE_STYLES[member.role];
                const RoleIcon = roleStyle.icon;
                
                return (
                  <div
                    key={member.uid}
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setShowDetailModal(member)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {canManage && (
                        <Checkbox
                          checked={selectedMembers.has(member.uid)}
                          onCheckedChange={() => toggleMemberSelection(member.uid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">{member.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${roleStyle.bg} ${roleStyle.text} border`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleStyle.label}
                        </Badge>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? 'アクティブ' : '無効'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {member.department} • {member.employeeId}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
              <p>検索条件に合うメンバーが見つかりません</p>
            </div>
          )}
        </div>
      </div>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog 
        open={!!roleChangeConfirm} 
        onOpenChange={(open) => {
          console.log('🔄 AlertDialog onOpenChange:', open);
          if (!open) setRoleChangeConfirm(null);
        }}
      >
        <AlertDialogContent className="max-w-lg bg-white dark:bg-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              権限変更の確認
            </AlertDialogTitle>
            <div className="text-sm text-muted-foreground">
              {roleChangeConfirm && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage src={roleChangeConfirm.member.avatar} />
                        <AvatarFallback>
                          {roleChangeConfirm.member.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{roleChangeConfirm.member.name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">{roleChangeConfirm.member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Badge className={`${ROLE_STYLES[roleChangeConfirm.member.role].bg} ${ROLE_STYLES[roleChangeConfirm.member.role].text} border`}>
                        {ROLE_STYLES[roleChangeConfirm.member.role].label}
                      </Badge>
                      <span>→</span>
                      <Badge className={`${ROLE_STYLES[roleChangeConfirm.newRole].bg} ${ROLE_STYLES[roleChangeConfirm.newRole].text} border`}>
                        {ROLE_STYLES[roleChangeConfirm.newRole].label}
                      </Badge>
                    </div>
                  </div>
                  
                  {roleChangeConfirm.newRole === 'admin' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800 font-medium mb-2">
                        ⚠️ 管理者権限の付与
                      </p>
                      <ul className="text-sm text-amber-700 ml-4 list-disc space-y-1">
                        <li>全メンバーの権限変更が可能になります</li>
                        <li>システム設定の変更が可能になります</li>
                        <li>全データの削除・エクスポートが可能になります</li>
                        <li>監査ログの閲覧が可能になります</li>
                      </ul>
                    </div>
                  )}
                  
                  {roleChangeConfirm.member.role === 'admin' && roleChangeConfirm.newRole !== 'admin' && (
                    <div className={`${
                      members.filter(m => m.role === 'admin').length === 1
                        ? 'bg-red-100 border-red-300'
                        : 'bg-red-50 border-red-200'
                    } border rounded-lg p-3`}>
                      <p className="text-sm text-red-800 font-medium mb-2">
                        {members.filter(m => m.role === 'admin').length === 1 ? '🚫 実行不可' : '⚠️ 管理者権限の削除'}
                      </p>
                      <p className="text-sm text-red-700">
                        {members.filter(m => m.role === 'admin').length === 1 ? (
                          <>
                            <strong>この操作は実行できません。</strong><br />
                            最後の管理者の権限を削除することはできません。<br />
                            先に他のメンバーを管理者に昇格させてください。
                          </>
                        ) : (
                          <>
                            このユーザーはシステム管理機能にアクセスできなくなります。
                            現在管理者が{members.filter(m => m.role === 'admin').length}名います。
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      変更理由（任意）
                    </label>
                    <Textarea
                      placeholder="例：部署異動のため、プロジェクト責任者就任のため"
                      value={roleChangeConfirm.reason || ''}
                      onChange={(e) => setRoleChangeConfirm({
                        ...roleChangeConfirm,
                        reason: e.target.value
                      })}
                      className="w-full bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                      rows={2}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    この操作は取り消すことができますが、操作履歴に記録されます。
                  </p>
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              console.log('❌ Role change cancelled');
              setRoleChangeConfirm(null);
            }}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={
                roleChangeConfirm?.member.role === 'admin' &&
                roleChangeConfirm?.newRole !== 'admin' &&
                members.filter(m => m.role === 'admin').length === 1
              }
              className={`${
                roleChangeConfirm?.member.role === 'admin' &&
                roleChangeConfirm?.newRole !== 'admin' &&
                members.filter(m => m.role === 'admin').length === 1
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {roleChangeConfirm?.member.role === 'admin' &&
               roleChangeConfirm?.newRole !== 'admin' &&
               members.filter(m => m.role === 'admin').length === 1
                ? '実行不可'
                : '変更を実行'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800" aria-describedby="invite-dialog-description">
          <DialogHeader>
            <DialogTitle>メンバー招待</DialogTitle>
            <DialogDescription id="invite-dialog-description">
              メールアドレスまたは招待リンクを使用してメンバーを招待できます
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="email" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-700">
              <TabsTrigger value="email" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">メール招待</TabsTrigger>
              <TabsTrigger value="link" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white text-red-400" disabled>リンク生成（廃止）</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  招待メールアドレス
                </label>
                <Input
                  type="email"
                  placeholder="example@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  初期役職
                </label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  メッセージ（任意）
                </label>
                <Textarea
                  placeholder="招待メッセージを入力..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  招待メールが送信されます。リンクの有効期限は7日間です。
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail || sendingInvite}
                >
                  {sendingInvite ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      招待を送信
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="link" className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="text-red-800 font-medium">機能廃止のお知らせ</h4>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  セキュリティ強化により、固定招待リンクは廃止されました。
                </p>
                <ul className="text-xs text-red-600 space-y-1 ml-4">
                  <li>• セキュアな個別招待のみサポート</li>
                  <li>• メールアドレス指定必須</li>
                  <li>• 32文字暗号化トークンによる保護</li>
                  <li>• 短期間有効期限（7日間）</li>
                </ul>
                <p className="text-sm text-red-700 mt-3">
                  「メール招待」タブをご利用ください。
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Member Detail Modal */}
      {showDetailModal && (
        <Dialog open={!!showDetailModal} onOpenChange={() => setShowDetailModal(null)}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-800" aria-describedby="member-detail-description">
            <DialogHeader>
              <DialogTitle>メンバー詳細情報</DialogTitle>
              <DialogDescription id="member-detail-description">
                メンバーの詳細情報と権限を表示しています
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={showDetailModal.avatar} />
                  <AvatarFallback className="text-2xl">
                    {showDetailModal.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{showDetailModal.name}</h3>
                  <p className="text-gray-500 dark:text-slate-400">{showDetailModal.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${ROLE_STYLES[showDetailModal.role].bg} ${ROLE_STYLES[showDetailModal.role].text} border`}>
                      {ROLE_STYLES[showDetailModal.role].label}
                    </Badge>
                    <Badge variant={showDetailModal.isActive ? "default" : "secondary"}>
                      {showDetailModal.isActive ? 'アクティブ' : '無効'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">社員番号</label>
                  <p className="text-gray-900 dark:text-white">{showDetailModal.employeeId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">部署</label>
                  <p className="text-gray-900 dark:text-white">{showDetailModal.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">登録日</label>
                  <p className="text-gray-900 dark:text-white">
                    {showDetailModal.createdAt ? new Date(showDetailModal.createdAt).toLocaleDateString('ja-JP') : '不明'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">最終ログイン</label>
                  <p className="text-gray-900 dark:text-white">
                    {showDetailModal.lastLogin ? new Date(showDetailModal.lastLogin).toLocaleString('ja-JP') : '未ログイン'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-slate-400">権限</label>
                <div className="mt-2 space-y-2">
                  {ROLE_STYLES[showDetailModal.role].permissions.map((permission, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {canManage && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMember(showDetailModal);
                      setShowDetailModal(null);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleToggleActiveStatus(showDetailModal);
                      setShowDetailModal(null);
                    }}
                  >
                    {showDetailModal.isActive ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        無効化
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        有効化
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Manager Dialog */}
      <Dialog open={showInviteManager} onOpenChange={setShowInviteManager}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-800" aria-describedby="invite-manager-description">
          <DialogHeader>
            <DialogTitle>招待管理</DialogTitle>
            <DialogDescription id="invite-manager-description">
              送信済み招待の確認と管理
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-slate-400">
                アクティブな招待: {companyInvites.length}件
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={loadCompanyInvites}
                disabled={loadingInvites}
              >
                {loadingInvites ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <History className="w-4 h-4 mr-2" />
                )}
                更新
              </Button>
            </div>

            {loadingInvites ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-slate-400">招待一覧を読み込み中...</p>
              </div>
            ) : companyInvites.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                <p>送信済みの招待はありません</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companyInvites.map((invite) => {
                  const isExpired = new Date(invite.expiresAt) < new Date();
                  const isUsed = invite.useCount >= invite.maxUses;
                  const isIndividual = !!invite.email;

                  return (
                    <div key={invite.id} className="border rounded-lg p-3 dark:border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={isIndividual ? "default" : "secondary"}>
                              {isIndividual ? '個別招待' : '一般招待'}
                            </Badge>
                            <Badge className={`${ROLE_STYLES[invite.role].bg} ${ROLE_STYLES[invite.role].text} border`}>
                              {ROLE_STYLES[invite.role].label}
                            </Badge>
                            {isExpired && (
                              <Badge variant="destructive">期限切れ</Badge>
                            )}
                            {isUsed && (
                              <Badge variant="outline">使用済み</Badge>
                            )}
                          </div>

                          <div className="text-sm">
                            {invite.email ? (
                              <span className="font-medium">{invite.email}</span>
                            ) : (
                              <span className="text-gray-500">一般招待コード</span>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            作成: {new Date(invite.createdAt).toLocaleDateString('ja-JP')} •
                            期限: {new Date(invite.expiresAt).toLocaleDateString('ja-JP')} •
                            使用: {invite.useCount}/{invite.maxUses}回
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isExpired && !isUsed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const inviteLink = `${window.location.origin}/join/${invite.code}`;
                                navigator.clipboard.writeText(inviteLink);
                                alert('招待リンクをコピーしました');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('この招待を無効化しますか？')) {
                                handleDeactivateInvite(invite.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowInviteManager(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="bg-white dark:bg-slate-800" aria-describedby="edit-member-description">
          <DialogHeader>
            <DialogTitle>メンバー情報編集</DialogTitle>
            <DialogDescription id="edit-member-description">
              メンバーの基本情報を編集できます
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  名前
                </label>
                <Input
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({
                    ...editingMember,
                    name: e.target.value
                  })}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  社員番号
                </label>
                <Input
                  value={editingMember.employeeId}
                  onChange={(e) => setEditingMember({
                    ...editingMember,
                    employeeId: e.target.value
                  })}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* 権限設定 */}
              <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  権限設定
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canConfirmReports"
                      checked={editingMember.permissions?.canConfirmReports || false}
                      onCheckedChange={(checked) => 
                        setEditingMember({
                          ...editingMember,
                          permissions: {
                            ...editingMember.permissions,
                            canConfirmReports: !!checked
                          }
                        })
                      }
                    />
                    <label htmlFor="canConfirmReports" className="text-sm text-gray-700 dark:text-slate-300">
                      日報確認権限
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canReplyToReports"
                      checked={editingMember.permissions?.canReplyToReports || false}
                      onCheckedChange={(checked) => 
                        setEditingMember({
                          ...editingMember,
                          permissions: {
                            ...editingMember.permissions,
                            canReplyToReports: !!checked
                          }
                        })
                      }
                    />
                    <label htmlFor="canReplyToReports" className="text-sm text-gray-700 dark:text-slate-300">
                      日報返信権限
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canViewAllReports"
                      checked={editingMember.permissions?.canViewAllReports || false}
                      onCheckedChange={(checked) => 
                        setEditingMember({
                          ...editingMember,
                          permissions: {
                            ...editingMember.permissions,
                            canViewAllReports: !!checked
                          }
                        })
                      }
                    />
                    <label htmlFor="canViewAllReports" className="text-sm text-gray-700 dark:text-slate-300">
                      全日報閲覧権限
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canManageUsers"
                      checked={editingMember.permissions?.canManageUsers || false}
                      onCheckedChange={(checked) => 
                        setEditingMember({
                          ...editingMember,
                          permissions: {
                            ...editingMember.permissions,
                            canManageUsers: !!checked
                          }
                        })
                      }
                    />
                    <label htmlFor="canManageUsers" className="text-sm text-gray-700 dark:text-slate-300">
                      ユーザー管理権限
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  キャンセル
                </Button>
                <Button onClick={async () => {
                  try {
                    await updateAppUser(editingMember.uid, {
                      name: editingMember.name,
                      department: editingMember.department,
                      employeeId: editingMember.employeeId,
                      permissions: editingMember.permissions
                    });
                    await loadMembers();
                    alert('メンバー情報を更新しました');
                    setEditingMember(null);
                  } catch (error) {
                    console.error('Error updating member:', error);
                    alert('メンバー情報の更新に失敗しました');
                  }
                }}>
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