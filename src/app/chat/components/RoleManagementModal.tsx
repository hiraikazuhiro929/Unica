"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Crown,
  Star,
  UserCheck,
  MessageSquare,
  Upload,
  Pin,
  Settings,
  Ban,
  Volume2,
  Mic,
  Video,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ChatUser, ServerInfo } from "@/lib/firebase/chat";

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: {
    // General permissions
    viewChannels: boolean;
    sendMessages: boolean;
    embedLinks: boolean;
    attachFiles: boolean;
    addReactions: boolean;
    useExternalEmojis: boolean;
    
    // Text channel permissions
    createInvite: boolean;
    manageChannels: boolean;
    manageRoles: boolean;
    manageWebhooks: boolean;
    readMessageHistory: boolean;
    mentionEveryone: boolean;
    useSlashCommands: boolean;
    
    // Voice channel permissions
    connect: boolean;
    speak: boolean;
    mute: boolean;
    deafen: boolean;
    moveMembers: boolean;
    
    // Moderation permissions
    kickMembers: boolean;
    banMembers: boolean;
    manageMessages: boolean;
    manageNicknames: boolean;
    viewAuditLog: boolean;
    
    // Administrator permissions
    administrator: boolean;
  };
  position: number;
  memberCount: number;
}

interface RoleManagementModalProps {
  server: ServerInfo | null;
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
  currentUserId: string;
}

const DEFAULT_ROLES: Role[] = [
  {
    id: 'owner',
    name: 'オーナー',
    color: '#f59e0b',
    permissions: {
      viewChannels: true, sendMessages: true, embedLinks: true, attachFiles: true,
      addReactions: true, useExternalEmojis: true, createInvite: true,
      manageChannels: true, manageRoles: true, manageWebhooks: true,
      readMessageHistory: true, mentionEveryone: true, useSlashCommands: true,
      connect: true, speak: true, mute: true, deafen: true, moveMembers: true,
      kickMembers: true, banMembers: true, manageMessages: true,
      manageNicknames: true, viewAuditLog: true, administrator: true
    },
    position: 100,
    memberCount: 1,
  },
  {
    id: 'admin',
    name: '管理者',
    color: '#dc2626',
    permissions: {
      viewChannels: true, sendMessages: true, embedLinks: true, attachFiles: true,
      addReactions: true, useExternalEmojis: true, createInvite: true,
      manageChannels: true, manageRoles: false, manageWebhooks: true,
      readMessageHistory: true, mentionEveryone: true, useSlashCommands: true,
      connect: true, speak: true, mute: true, deafen: true, moveMembers: true,
      kickMembers: true, banMembers: true, manageMessages: true,
      manageNicknames: true, viewAuditLog: true, administrator: false
    },
    position: 90,
    memberCount: 2,
  },
  {
    id: 'moderator',
    name: 'モデレーター',
    color: '#059669',
    permissions: {
      viewChannels: true, sendMessages: true, embedLinks: true, attachFiles: true,
      addReactions: true, useExternalEmojis: true, createInvite: true,
      manageChannels: false, manageRoles: false, manageWebhooks: false,
      readMessageHistory: true, mentionEveryone: true, useSlashCommands: true,
      connect: true, speak: true, mute: true, deafen: false, moveMembers: false,
      kickMembers: true, banMembers: false, manageMessages: true,
      manageNicknames: true, viewAuditLog: false, administrator: false
    },
    position: 80,
    memberCount: 3,
  },
  {
    id: 'member',
    name: 'メンバー',
    color: '#6b7280',
    permissions: {
      viewChannels: true, sendMessages: true, embedLinks: true, attachFiles: true,
      addReactions: true, useExternalEmojis: false, createInvite: false,
      manageChannels: false, manageRoles: false, manageWebhooks: false,
      readMessageHistory: true, mentionEveryone: false, useSlashCommands: true,
      connect: true, speak: true, mute: false, deafen: false, moveMembers: false,
      kickMembers: false, banMembers: false, manageMessages: false,
      manageNicknames: false, viewAuditLog: false, administrator: false
    },
    position: 10,
    memberCount: 15,
  }
];

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  server,
  isOpen,
  onClose,
  users,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState("roles");
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#6b7280");

  const handleCreateRole = () => {
    if (!newRoleName) return;
    
    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: newRoleName,
      color: newRoleColor,
      permissions: {
        viewChannels: true, sendMessages: true, embedLinks: false, attachFiles: false,
        addReactions: true, useExternalEmojis: false, createInvite: false,
        manageChannels: false, manageRoles: false, manageWebhooks: false,
        readMessageHistory: true, mentionEveryone: false, useSlashCommands: true,
        connect: true, speak: true, mute: false, deafen: false, moveMembers: false,
        kickMembers: false, banMembers: false, manageMessages: false,
        manageNicknames: false, viewAuditLog: false, administrator: false
      },
      position: 50,
      memberCount: 0,
    };
    
    setRoles([...roles, newRole]);
    setNewRoleName("");
    setNewRoleColor("#6b7280");
    setIsCreatingRole(false);
  };

  const handleUpdateRole = (roleId: string, updates: Partial<Role>) => {
    setRoles(roles.map(role => 
      role.id === roleId ? { ...role, ...updates } : role
    ));
    if (selectedRole?.id === roleId) {
      setSelectedRole({ ...selectedRole, ...updates });
    }
  };

  const handleDeleteRole = (roleId: string) => {
    setRoles(roles.filter(role => role.id !== roleId));
    if (selectedRole?.id === roleId) {
      setSelectedRole(null);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'administrator': return <Crown className="w-4 h-4" />;
      case 'manageRoles': return <Shield className="w-4 h-4" />;
      case 'manageChannels': return <Settings className="w-4 h-4" />;
      case 'kickMembers': case 'banMembers': return <Ban className="w-4 h-4" />;
      case 'sendMessages': return <MessageSquare className="w-4 h-4" />;
      case 'attachFiles': return <Upload className="w-4 h-4" />;
      case 'connect': return <Volume2 className="w-4 h-4" />;
      case 'speak': return <Mic className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      // General permissions
      viewChannels: 'チャンネルを表示',
      sendMessages: 'メッセージを送信',
      embedLinks: 'リンクを埋め込み',
      attachFiles: 'ファイルを添付',
      addReactions: 'リアクションを追加',
      useExternalEmojis: '外部絵文字を使用',
      
      // Text channel permissions
      createInvite: '招待を作成',
      manageChannels: 'チャンネルを管理',
      manageRoles: 'ロールを管理',
      manageWebhooks: 'Webhookを管理',
      readMessageHistory: 'メッセージ履歴を読む',
      mentionEveryone: '@everyoneをメンション',
      useSlashCommands: 'スラッシュコマンドを使用',
      
      // Voice channel permissions
      connect: 'ボイスチャンネルに接続',
      speak: '発言',
      mute: '他のメンバーをミュート',
      deafen: '他のメンバーをスピーカーミュート',
      moveMembers: 'メンバーを移動',
      
      // Moderation permissions
      kickMembers: 'メンバーをキック',
      banMembers: 'メンバーをBAN',
      manageMessages: 'メッセージを管理',
      manageNicknames: 'ニックネームを管理',
      viewAuditLog: '監査ログを表示',
      
      // Administrator permissions
      administrator: '管理者',
    };
    return labels[permission] || permission;
  };

  if (!server) return null;

  const isOwner = server.ownerId === currentUserId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto dark:bg-slate-800">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 -m-6 mb-6 p-6 rounded-t-lg">
          <DialogTitle className="flex items-center space-x-2 dark:text-white">
            <Shield className="w-5 h-5" />
            <span>ロール管理 - {server.name}</span>
          </DialogTitle>
          <DialogDescription>
            サーバーのロールと権限を管理します。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles">
              <Shield className="w-4 h-4 mr-2" />
              ロール一覧
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Settings className="w-4 h-4 mr-2" />
              権限設定
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              メンバー割り当て
            </TabsTrigger>
          </TabsList>

          {/* ロール一覧 */}
          <TabsContent value="roles" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">ロール一覧 ({roles.length}個)</h3>
              {isOwner && (
                <Button
                  onClick={() => setIsCreatingRole(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新しいロール
                </Button>
              )}
            </div>

            {isCreatingRole && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-3">新しいロールを作成</h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">ロール名</Label>
                    <Input
                      id="role-name"
                      placeholder="ロール名を入力"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-color">カラー</Label>
                    <Input
                      id="role-color"
                      type="color"
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button onClick={handleCreateRole} size="sm">
                      作成
                    </Button>
                    <Button 
                      onClick={() => setIsCreatingRole(false)}
                      variant="outline"
                      size="sm"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {roles.sort((a, b) => b.position - a.position).map((role) => (
                <div
                  key={role.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole?.id === role.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium" style={{ color: role.color }}>
                            {role.name}
                          </span>
                          {role.id === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                          {role.permissions.administrator && role.id !== 'owner' && (
                            <Star className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {role.memberCount}人のメンバー
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        位置: {role.position}
                      </Badge>
                      {isOwner && role.id !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 権限設定 */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
            {selectedRole ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 pb-4 border-b">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: selectedRole.color }}
                  />
                  <div>
                    <h3 className="font-semibold" style={{ color: selectedRole.color }}>
                      {selectedRole.name}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedRole.memberCount}人のメンバー</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* General Permissions */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">一般的な権限</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['viewChannels', 'sendMessages', 'embedLinks', 'attachFiles', 'addReactions', 'useExternalEmojis'].map((permission) => (
                        <div key={permission} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getPermissionIcon(permission)}
                            <Label className="text-sm">{getPermissionLabel(permission)}</Label>
                          </div>
                          <Switch
                            checked={selectedRole.permissions[permission as keyof Role['permissions']]}
                            onCheckedChange={(checked) =>
                              handleUpdateRole(selectedRole.id, {
                                permissions: { ...selectedRole.permissions, [permission]: checked }
                              })
                            }
                            disabled={!isOwner || selectedRole.id === 'owner'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Text Channel Permissions */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">テキストチャンネル権限</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['createInvite', 'manageChannels', 'manageRoles', 'readMessageHistory', 'mentionEveryone', 'useSlashCommands'].map((permission) => (
                        <div key={permission} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getPermissionIcon(permission)}
                            <Label className="text-sm">{getPermissionLabel(permission)}</Label>
                          </div>
                          <Switch
                            checked={selectedRole.permissions[permission as keyof Role['permissions']]}
                            onCheckedChange={(checked) =>
                              handleUpdateRole(selectedRole.id, {
                                permissions: { ...selectedRole.permissions, [permission]: checked }
                              })
                            }
                            disabled={!isOwner || selectedRole.id === 'owner'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Moderation Permissions */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">モデレーション権限</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['kickMembers', 'banMembers', 'manageMessages', 'manageNicknames', 'viewAuditLog'].map((permission) => (
                        <div key={permission} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getPermissionIcon(permission)}
                            <Label className="text-sm">{getPermissionLabel(permission)}</Label>
                          </div>
                          <Switch
                            checked={selectedRole.permissions[permission as keyof Role['permissions']]}
                            onCheckedChange={(checked) =>
                              handleUpdateRole(selectedRole.id, {
                                permissions: { ...selectedRole.permissions, [permission]: checked }
                              })
                            }
                            disabled={!isOwner || selectedRole.id === 'owner'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Administrator */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-red-600" />
                        <div>
                          <Label className="text-sm font-medium text-red-700">管理者</Label>
                          <p className="text-xs text-red-600">すべての権限を付与します</p>
                        </div>
                      </div>
                      <Switch
                        checked={selectedRole.permissions.administrator}
                        onCheckedChange={(checked) =>
                          handleUpdateRole(selectedRole.id, {
                            permissions: { ...selectedRole.permissions, administrator: checked }
                          })
                        }
                        disabled={!isOwner || selectedRole.id === 'owner'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">左側のロール一覧からロールを選択してください</p>
              </div>
            )}
          </TabsContent>

          {/* メンバー割り当て */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">メンバーへのロール割り当て機能は近日実装予定です</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};