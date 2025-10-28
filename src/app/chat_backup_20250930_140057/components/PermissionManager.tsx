"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  User, 
  Settings, 
  Lock, 
  Unlock,
  Crown,
  Users,
  Eye,
  Edit,
  MessageSquare,
  UserPlus,
  UserMinus
} from "lucide-react";
import type { ChatChannel, ChatUser, ChannelMember } from "@/lib/firebase/chat";

interface PermissionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChatChannel | null;
  members: ChannelMember[];
  allUsers: ChatUser[];
  currentUser: ChatUser;
  onUpdatePermissions: (channelId: string, permissions: any) => Promise<void>;
  onAddMember: (channelId: string, userId: string, role?: 'admin' | 'member') => Promise<void>;
  onRemoveMember: (channelId: string, userId: string) => Promise<void>;
  onUpdateMemberRole: (channelId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({
  isOpen,
  onClose,
  channel,
  members,
  allUsers,
  currentUser,
  onUpdatePermissions,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
}) => {
  const [permissions, setPermissions] = useState({
    canRead: channel?.permissions?.canRead ?? true,
    canWrite: channel?.permissions?.canWrite ?? true,
    canManage: channel?.permissions?.canManage ?? false,
    allowedRoles: channel?.permissions?.allowedRoles ?? [],
    blockedUsers: channel?.permissions?.blockedUsers ?? [],
  });

  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');

  if (!channel) return null;

  const canManageChannel = 
    currentUser.role === 'admin' || 
    currentUser.role === 'manager' ||
    members.find(m => m.userId === currentUser.id && m.role === 'admin');

  const handleSavePermissions = async () => {
    if (!canManageChannel) return;
    
    await onUpdatePermissions(channel.id, permissions);
    onClose();
  };

  const handleAddMember = async () => {
    if (!selectedUser || !canManageChannel) return;
    
    await onAddMember(channel.id, selectedUser, selectedRole);
    setSelectedUser('');
    setShowAddMember(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!canManageChannel) return;
    
    await onRemoveMember(channel.id, userId);
  };

  const handleUpdateMemberRole = async (userId: string, role: 'admin' | 'member') => {
    if (!canManageChannel) return;
    
    await onUpdateMemberRole(channel.id, userId, role);
  };

  const availableUsers = allUsers.filter(user => 
    !members.some(member => member.userId === user.id)
  );

  const roleLabels = {
    'admin': 'チャンネル管理者',
    'member': 'メンバー',
    'manager': '部門管理者',
    'worker': '作業者',
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'manager':
        return Crown;
      default:
        return User;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>チャンネル権限管理</span>
          </DialogTitle>
          <DialogDescription>
            #{channel.name} の権限設定とメンバー管理
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本権限設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>基本権限</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium">閲覧権限</div>
                    <div className="text-sm text-gray-500">
                      メンバーがメッセージを読むことができます
                    </div>
                  </div>
                </div>
                <Switch
                  checked={permissions.canRead}
                  onCheckedChange={(checked) => 
                    setPermissions(prev => ({ ...prev, canRead: checked }))
                  }
                  disabled={!canManageChannel}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Edit className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="font-medium">書き込み権限</div>
                    <div className="text-sm text-gray-500">
                      メンバーがメッセージを送信できます
                    </div>
                  </div>
                </div>
                <Switch
                  checked={permissions.canWrite}
                  onCheckedChange={(checked) => 
                    setPermissions(prev => ({ ...prev, canWrite: checked }))
                  }
                  disabled={!canManageChannel}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="font-medium">管理権限</div>
                    <div className="text-sm text-gray-500">
                      チャンネル設定を変更できます
                    </div>
                  </div>
                </div>
                <Switch
                  checked={permissions.canManage}
                  onCheckedChange={(checked) => 
                    setPermissions(prev => ({ ...prev, canManage: checked }))
                  }
                  disabled={!canManageChannel}
                />
              </div>
            </div>
          </div>

          {/* メンバー管理 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>メンバー管理 ({members.length}人)</span>
              </h3>
              
              {canManageChannel && (
                <Button
                  size="sm"
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="flex items-center space-x-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>メンバー追加</span>
                </Button>
              )}
            </div>

            {/* メンバー追加フォーム */}
            {showAddMember && canManageChannel && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center space-x-2">
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="ユーザーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3" />
                            <span>{user.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {user.department}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedRole} onValueChange={(value: 'admin' | 'member') => setSelectedRole(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">メンバー</SelectItem>
                      <SelectItem value="admin">管理者</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handleAddMember}
                    disabled={!selectedUser}
                  >
                    追加
                  </Button>
                </div>
              </div>
            )}

            {/* メンバーリスト */}
            <div className="space-y-2">
              {members.map((member) => {
                const user = allUsers.find(u => u.id === member.userId);
                if (!user) return null;

                const RoleIcon = getRoleIcon(user.role);
                
                return (
                  <div key={member.userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.name?.charAt(0) || "?"}
                        </div>
                        {user.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{user.name}</span>
                          <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleLabels[user.role as keyof typeof roleLabels]}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">{user.department}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Select
                        value={member.role}
                        onValueChange={(value: 'admin' | 'member') => 
                          handleUpdateMemberRole(member.userId, value)
                        }
                        disabled={!canManageChannel || member.userId === currentUser.id}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>メンバー</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center space-x-1">
                              <Crown className="w-3 h-3" />
                              <span>管理者</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {canManageChannel && member.userId !== currentUser.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          {canManageChannel && (
            <Button onClick={handleSavePermissions}>
              変更を保存
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionManager;