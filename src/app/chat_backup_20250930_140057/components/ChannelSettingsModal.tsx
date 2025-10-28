"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Hash,
  Settings,
  Users,
  Shield,
  Trash2,
  UserPlus,
  UserMinus,
  Bell,
  Lock,
  Unlock,
} from "lucide-react";
import type { ChatChannel, ChatUser } from "@/lib/firebase/chat";

interface ChannelSettingsModalProps {
  channel: ChatChannel | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (channelId: string, updates: Partial<ChatChannel>) => Promise<void>;
  onDelete: (channelId: string) => Promise<void>;
  users: ChatUser[];
  currentUserId: string;
}

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  channel,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  users,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [channelName, setChannelName] = useState(channel?.name || "");
  const [channelTopic, setChannelTopic] = useState(channel?.topic || "");
  const [channelDescription, setChannelDescription] = useState(channel?.description || "");
  const [isPrivate, setIsPrivate] = useState(channel?.isPrivate || false);
  const [channelType, setChannelType] = useState(channel?.type || "text");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    if (channel) {
      setChannelName(channel.name);
      setChannelTopic(channel.topic || "");
      setChannelDescription(channel.description || "");
      setIsPrivate(channel.isPrivate);
      setChannelType(channel.type);
    }
  }, [channel]);

  const handleUpdateGeneral = async () => {
    if (!channel) return;
    setIsUpdating(true);
    try {
      await onUpdate(channel.id, {
        name: channelName,
        topic: channelTopic,
        description: channelDescription,
        isPrivate,
        type: channelType,
      });
      onClose();
    } catch (error) {
      console.error("チャンネル更新エラー:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!channel) return;
    if (!confirm(`本当に「${channel.name}」チャンネルを削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(channel.id);
      onClose();
    } catch (error) {
      console.error("チャンネル削除エラー:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!channel) return null;

  const isOwner = channel.createdBy === currentUserId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-slate-800">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 -m-6 mb-6 p-6 rounded-t-lg">
          <DialogTitle className="flex items-center space-x-2 dark:text-white">
            <Hash className="w-5 h-5" />
            <span>{channel.name} の設定</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              一般
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-2" />
              権限
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              メンバー
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              通知
            </TabsTrigger>
          </TabsList>

          {/* 一般設定 */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">チャンネル名</Label>
              <Input
                id="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                disabled={!isOwner}
                placeholder="チャンネル名を入力"
                className="dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-topic">トピック</Label>
              <Input
                id="channel-topic"
                value={channelTopic}
                onChange={(e) => setChannelTopic(e.target.value)}
                disabled={!isOwner}
                placeholder="このチャンネルの話題を設定"
                className="dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-description">説明</Label>
              <Textarea
                id="channel-description"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                disabled={!isOwner}
                placeholder="チャンネルの説明を入力"
                rows={3}
                className="dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-type">チャンネルタイプ</Label>
              <Select value={channelType} onValueChange={(value: any) => setChannelType(value)} disabled={!isOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="text">テキスト</SelectItem>
                  <SelectItem value="voice">ボイス</SelectItem>
                  <SelectItem value="announcement">アナウンス</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="private-channel">プライベートチャンネル</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400">招待されたメンバーのみアクセス可能</p>
              </div>
              <Switch
                id="private-channel"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                disabled={!isOwner}
              />
            </div>

            {isOwner && (
              <div className="flex justify-between pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  チャンネルを削除
                </Button>
                <Button onClick={handleUpdateGeneral} disabled={isUpdating}>
                  変更を保存
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 権限設定 */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold dark:text-white">ロール別権限</h3>
              
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium dark:text-white">管理者</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">すべての権限を持つ</p>
                  </div>
                  <Badge>フルアクセス</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium dark:text-white">メンバー</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">メッセージの送信と閲覧</p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant="outline">読み取り</Badge>
                    <Badge variant="outline">書き込み</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium dark:text-white">ゲスト</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">閲覧のみ</p>
                  </div>
                  <Badge variant="outline">読み取りのみ</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm dark:text-white">詳細権限</h4>
                
                <div className="flex items-center justify-between">
                  <Label>メッセージを送信</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label>ファイルをアップロード</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label>メンションを使用</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label>メッセージを固定</Label>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <Label>メッセージを削除</Label>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* メンバー管理 */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold dark:text-white">チャンネルメンバー ({channel.memberCount || 0}人)</h3>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  メンバーを追加
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {users.slice(0, 5).map((user) => (
                  <div key={user.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{user.role}</p>
                      </div>
                    </div>
                    {isOwner && user.id !== currentUserId && (
                      <Button variant="ghost" size="sm">
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 通知設定 */}
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold dark:text-white">通知設定</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>すべてのメッセージ</Label>
                    <p className="text-sm text-gray-500 dark:text-slate-400">すべての新着メッセージを通知</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>@メンションのみ</Label>
                    <p className="text-sm text-gray-500 dark:text-slate-400">自分がメンションされたときのみ通知</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>なし</Label>
                    <p className="text-sm text-gray-500 dark:text-slate-400">このチャンネルの通知を無効化</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm dark:text-white">サウンド設定</h4>
                
                <div className="flex items-center justify-between">
                  <Label>通知音を再生</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label>デスクトップ通知を表示</Label>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};