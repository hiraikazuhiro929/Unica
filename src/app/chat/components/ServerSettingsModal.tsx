"use client";
import React, { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  Server,
  Settings,
  Users,
  Shield,
  Upload,
  UserPlus,
  Link,
  Trash2,
  Crown,
  Eye,
  EyeOff,
  Globe,
  Lock,
  FileText,
  Hash,
  ChevronUp,
  ChevronDown,
  Folder,
  List,
} from "lucide-react";
import type { ChatUser, ServerInfo, ChatChannel, ChannelCategory } from "@/lib/firebase/chat";
import { updateCategoriesOrder, updateChannelsOrder } from "@/lib/firebase/chat";

interface ServerSettingsModalProps {
  server: ServerInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (serverId: string, updates: Partial<ServerInfo>) => Promise<void>;
  onDelete: (serverId: string) => Promise<void>;
  users: ChatUser[];
  currentUserId: string;
  channels?: ChatChannel[];
  categories?: ChannelCategory[];
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  server,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  users,
  currentUserId,
  channels = [],
  categories = [],
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [serverName, setServerName] = useState(server?.name || "");
  const [serverDescription, setServerDescription] = useState(server?.description || "");
  const [isPrivate, setIsPrivate] = useState(server?.isPrivate || false);
  const [allowInvites, setAllowInvites] = useState<boolean>(server?.settings.allowInvites ?? true);
  const [requireApproval, setRequireApproval] = useState<boolean>(server?.settings.requireApproval ?? false);
  const [defaultRole, setDefaultRole] = useState(server?.settings.defaultRole || "member");
  const [explicitContentFilter, setExplicitContentFilter] = useState(server?.settings.explicitContentFilter || "disabled");
  const [verificationLevel, setVerificationLevel] = useState(server?.settings.verificationLevel || "none");
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode] = useState("unica-" + Math.random().toString(36).substring(2, 8));
  
  // チャンネル並び替え用
  const [localCategories, setLocalCategories] = useState<ChannelCategory[]>([]);
  const [localChannels, setLocalChannels] = useState<ChatChannel[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (server) {
      setServerName(server.name);
      setServerDescription(server.description);
      setIsPrivate(server.isPrivate);
      setAllowInvites(server.settings.allowInvites);
      setRequireApproval(server.settings.requireApproval);
      setDefaultRole(server.settings.defaultRole);
      setExplicitContentFilter(server.settings.explicitContentFilter);
      setVerificationLevel(server.settings.verificationLevel);
    }
    // カテゴリーとチャンネルの初期化
    setLocalCategories([...categories].sort((a, b) => a.order - b.order));
    setLocalChannels([...channels].sort((a, b) => a.order - b.order));
  }, [server, categories, channels]);

  const handleUpdateGeneral = async () => {
    if (!server) return;
    setIsUpdating(true);
    try {
      await onUpdate(server.id, {
        name: serverName,
        description: serverDescription,
        isPrivate,
        settings: {
          ...server.settings,
          allowInvites,
          requireApproval,
          defaultRole,
          explicitContentFilter,
          verificationLevel,
        },
      });
      onClose();
    } catch (error) {
      console.error("サーバー更新エラー:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!server) return;
    if (!confirm(`本当に「${server.name}」サーバーを削除しますか？この操作は取り消せません。すべてのチャンネルとメッセージが失われます。`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(server.id);
      onClose();
    } catch (error) {
      console.error("サーバー削除エラー:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleIconUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ここでファイルアップロード処理を実装
    console.log("アイコンアップロード:", file);
    // 実装: Firebase Storageへのアップロード
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    // ここでトースト通知を表示
    console.log("招待コードをコピーしました");
  };

  // チャンネル並び替え関数
  const moveCategoryUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...localCategories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    setLocalCategories(newCategories);
  };

  const moveCategoryDown = (index: number) => {
    if (index === localCategories.length - 1) return;
    const newCategories = [...localCategories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    setLocalCategories(newCategories);
  };

  const moveChannelUp = (categoryId: string | undefined, channelIndex: number) => {
    const categoryChannels = localChannels.filter(ch => 
      categoryId ? ch.categoryId === categoryId : !ch.categoryId
    );
    if (channelIndex === 0) return;
    
    const channel = categoryChannels[channelIndex];
    const prevChannel = categoryChannels[channelIndex - 1];
    
    const newChannels = localChannels.map(ch => {
      if (ch.id === channel.id) return { ...ch, order: prevChannel.order };
      if (ch.id === prevChannel.id) return { ...ch, order: channel.order };
      return ch;
    });
    
    setLocalChannels(newChannels.sort((a, b) => a.order - b.order));
  };

  const moveChannelDown = (categoryId: string | undefined, channelIndex: number) => {
    const categoryChannels = localChannels.filter(ch => 
      categoryId ? ch.categoryId === categoryId : !ch.categoryId
    );
    if (channelIndex === categoryChannels.length - 1) return;
    
    const channel = categoryChannels[channelIndex];
    const nextChannel = categoryChannels[channelIndex + 1];
    
    const newChannels = localChannels.map(ch => {
      if (ch.id === channel.id) return { ...ch, order: nextChannel.order };
      if (ch.id === nextChannel.id) return { ...ch, order: channel.order };
      return ch;
    });
    
    setLocalChannels(newChannels.sort((a, b) => a.order - b.order));
  };

  const saveChannelOrder = async () => {
    setIsSavingOrder(true);
    try {
      // カテゴリーの順序を保存
      const categoryUpdates = localCategories.map((cat, index) => ({
        id: cat.id,
        position: index
      }));
      await updateCategoriesOrder(categoryUpdates);

      // チャンネルの順序を保存
      const channelUpdates = localChannels.map((ch, index) => ({
        id: ch.id,
        position: index
      }));
      await updateChannelsOrder(channelUpdates);

      alert('チャンネルの順序を更新しました');
    } catch (error) {
      console.error('順序更新エラー:', error);
      alert('順序の更新に失敗しました');
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (!server) return null;

  const isOwner = server.ownerId === currentUserId;
  const serverMembers = users; // All users are considered server members for now

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5" />
            <span>{server.name} の設定</span>
          </DialogTitle>
          <DialogDescription>
            サーバーの設定を管理します。変更は即座に全メンバーに適用されます。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              一般
            </TabsTrigger>
            <TabsTrigger value="channels">
              <List className="w-4 h-4 mr-2" />
              チャンネル
            </TabsTrigger>
            <TabsTrigger value="moderation">
              <Shield className="w-4 h-4 mr-2" />
              安全性
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              メンバー
            </TabsTrigger>
            <TabsTrigger value="invites">
              <UserPlus className="w-4 h-4 mr-2" />
              招待
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="w-4 h-4 mr-2" />
              ログ
            </TabsTrigger>
          </TabsList>

          {/* 一般設定 */}
          <TabsContent value="general" className="space-y-6 mt-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl cursor-pointer" onClick={handleIconUpload}>
                {server.iconUrl ? (
                  <img src={server.iconUrl} alt="Server Icon" className="w-full h-full rounded-full object-cover" />
                ) : (
                  server.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">サーバーアイコン</Label>
                <p className="text-sm text-gray-500">クリックして変更（推奨: 512x512px）</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <Button variant="outline" onClick={handleIconUpload}>
                <Upload className="w-4 h-4 mr-2" />
                変更
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-name">サーバー名</Label>
                <Input
                  id="server-name"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="サーバー名を入力"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="server-description">サーバーの説明</Label>
                <Textarea
                  id="server-description"
                  value={serverDescription}
                  onChange={(e) => setServerDescription(e.target.value)}
                  disabled={!isOwner}
                  placeholder="サーバーの説明を入力"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    <Label htmlFor="private-server">プライベートサーバー</Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    {isPrivate ? "招待されたユーザーのみ参加可能" : "誰でも参加可能（招待コードで）"}
                  </p>
                </div>
                <Switch
                  id="private-server"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  disabled={!isOwner}
                />
              </div>
            </div>

            {isOwner && (
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  サーバーを削除
                </Button>
                <Button onClick={handleUpdateGeneral} disabled={isUpdating}>
                  変更を保存
                </Button>
              </div>
            )}
          </TabsContent>

          {/* チャンネル管理 */}
          <TabsContent value="channels" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">チャンネルの並び替え</h3>
                <p className="text-sm text-gray-500 mb-4">
                  上下ボタンでカテゴリーやチャンネルの順序を変更できます
                </p>
              </div>

              {/* 未分類チャンネル */}
              {localChannels.filter(ch => !ch.categoryId).length > 0 && (
                <div className="border rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">チャンネル（未分類）</h4>
                  <div className="space-y-2">
                    {localChannels
                      .filter(ch => !ch.categoryId)
                      .map((channel, index) => (
                        <div key={channel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{channel.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveChannelUp(undefined, index)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveChannelDown(undefined, index)}
                              disabled={index === localChannels.filter(ch => !ch.categoryId).length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* カテゴリーごとのチャンネル */}
              {localCategories.map((category, catIndex) => (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-gray-500" />
                      <h4 className="font-medium text-sm text-gray-700">{category.name}</h4>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveCategoryUp(catIndex)}
                        disabled={catIndex === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveCategoryDown(catIndex)}
                        disabled={catIndex === localCategories.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 ml-4">
                    {localChannels
                      .filter(ch => ch.categoryId === category.id)
                      .map((channel, index) => (
                        <div key={channel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{channel.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveChannelUp(category.id, index)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveChannelDown(category.id, index)}
                              disabled={index === localChannels.filter(ch => ch.categoryId === category.id).length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {/* 保存ボタン */}
              {isOwner && (
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={saveChannelOrder} 
                    disabled={isSavingOrder}
                  >
                    {isSavingOrder ? "保存中..." : "順序を保存"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 安全性設定 */}
          <TabsContent value="moderation" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-level">認証レベル</Label>
                <Select value={verificationLevel} onValueChange={setVerificationLevel} disabled={!isOwner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    <SelectItem value="low">低 - 認証済みメールアドレス</SelectItem>
                    <SelectItem value="medium">中 - 5分以上のアカウント</SelectItem>
                    <SelectItem value="high">高 - 10分以上のメンバー</SelectItem>
                    <SelectItem value="highest">最高 - 電話番号認証</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-filter">不適切コンテンツフィルター</Label>
                <Select value={explicitContentFilter} onValueChange={setExplicitContentFilter} disabled={!isOwner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">無効</SelectItem>
                    <SelectItem value="members_without_roles">ロールなしメンバー</SelectItem>
                    <SelectItem value="all_members">全メンバー</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>新規メンバーの承認が必要</Label>
                  <p className="text-sm text-gray-500">新しいメンバーが参加する際に管理者の承認が必要</p>
                </div>
                <Switch
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-role">デフォルトロール</Label>
                <Select value={defaultRole} onValueChange={setDefaultRole} disabled={!isOwner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">ゲスト</SelectItem>
                    <SelectItem value="member">メンバー</SelectItem>
                    <SelectItem value="contributor">コントリビューター</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* メンバー管理 */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">サーバーメンバー ({server.memberCount}人)</h3>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    メンバーを追加
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {serverMembers.map((user) => (
                  <div key={user.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{user.name}</p>
                          {user.id === server.ownerId && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {user.role}
                          </Badge>
                          <span className="text-sm text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    {isOwner && user.id !== currentUserId && (
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          ロール変更
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          キック
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 招待管理 */}
          <TabsContent value="invites" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">招待設定</h3>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>招待リンクを有効にする</Label>
                  <p className="text-sm text-gray-500">メンバーが他のユーザーを招待できる</p>
                </div>
                <Switch
                  checked={allowInvites}
                  onCheckedChange={setAllowInvites}
                  disabled={!isOwner}
                />
              </div>

              {allowInvites && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label>サーバー招待コード</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInviteCode(!showInviteCode)}
                      >
                        {showInviteCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={showInviteCode ? inviteCode : "••••••••"}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={copyInviteCode}
                        disabled={!showInviteCode}
                      >
                        <Link className="w-4 h-4 mr-2" />
                        コピー
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      このコードを使用してユーザーをサーバーに招待できます
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 監査ログ */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold">監査ログ</h3>
              <p className="text-sm text-gray-500">
                サーバーで実行された重要なアクションの記録です。
              </p>
              
              <div className="border rounded-lg p-4">
                <div className="text-center text-gray-500 py-8">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>監査ログ機能は近日実装予定です</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};