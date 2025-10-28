"use client";
import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Bell,
  BellOff,
  BellRing,
  LogOut,
  Save,
  X,
  AlertTriangle,
  Shield,
  Eye,
  Trash2,
} from "lucide-react";
import { ChatChannel, UserId } from "../types";
import { Badge } from "@/components/ui/badge";
import { canDeleteChannel } from "../services/chatService";

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChatChannel | null;
  currentUserId: UserId | undefined;
  currentUserRole?: string;
  onUpdateChannel?: (updates: Partial<ChatChannel>) => Promise<void>;
  onLeaveChannel?: (channelId: string) => Promise<void>;
  onDeleteChannel?: (channelId: string) => Promise<void>;
}

type NotificationSetting = "all" | "mentions" | "muted";

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  isOpen,
  onClose,
  channel,
  currentUserId,
  currentUserRole,
  onUpdateChannel,
  onLeaveChannel,
  onDeleteChannel,
}) => {
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [notificationSetting, setNotificationSetting] =
    useState<NotificationSetting>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  // チャンネル情報が変わったら初期化
  useEffect(() => {
    if (channel) {
      setChannelName(channel.name);
      setChannelDescription(channel.description || "");
      setChannelTopic(channel.topic || "");
      setIsPrivate(channel.isPrivate || false);
      setAllowedRoles(channel.permissions?.allowedRoles || []);
      // 通知設定はローカルストレージから取得（実装例）
      const savedNotification = localStorage.getItem(
        `channel_notification_${channel.id}`
      );
      setNotificationSetting(
        (savedNotification as NotificationSetting) || "all"
      );
      setHasChanges(false);
    }
  }, [channel]);

  // 変更検知
  useEffect(() => {
    if (!channel) return;

    const changed =
      channelName !== channel.name ||
      channelDescription !== (channel.description || "") ||
      channelTopic !== (channel.topic || "") ||
      isPrivate !== (channel.isPrivate || false) ||
      JSON.stringify(allowedRoles) !== JSON.stringify(channel.permissions?.allowedRoles || []);

    setHasChanges(changed);
  }, [channelName, channelDescription, channelTopic, isPrivate, allowedRoles, channel]);

  if (!channel) return null;

  // 権限チェック: 管理者またはチャンネル作成者のみ編集可能
  const canEdit = currentUserId === channel.createdBy;

  // 削除権限チェック: admin/managerのみ
  const canDelete = currentUserRole ? canDeleteChannel(currentUserRole as 'admin' | 'manager' | 'leader' | 'worker') : false;

  const handleSave = async () => {
    if (!onUpdateChannel || !hasChanges) return;

    setIsLoading(true);
    try {
      await onUpdateChannel({
        name: channelName,
        description: channelDescription,
        topic: channelTopic,
        isPrivate,
        permissions: {
          ...channel.permissions,
          allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined,
        },
      });

      // 通知設定を保存（ローカルストレージ）
      localStorage.setItem(
        `channel_notification_${channel.id}`,
        notificationSetting
      );

      onClose();
    } catch (error) {
      console.error("Failed to update channel:", error);
      // TODO: エラー通知
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setAllowedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleLeave = async () => {
    if (!onLeaveChannel) return;

    setIsLoading(true);
    try {
      await onLeaveChannel(channel.id);
      setShowLeaveConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to leave channel:", error);
      // TODO: エラー通知
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteChannel) return;

    setIsLoading(true);
    try {
      await onDeleteChannel(channel.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete channel:", error);
      // TODO: エラー通知
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (value: NotificationSetting) => {
    setNotificationSetting(value);
    // すぐに保存
    localStorage.setItem(`channel_notification_${channel.id}`, value);
  };

  const getNotificationIcon = () => {
    switch (notificationSetting) {
      case "all":
        return <BellRing className="w-4 h-4" />;
      case "mentions":
        return <Bell className="w-4 h-4" />;
      case "muted":
        return <BellOff className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg dark:bg-slate-800">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 -m-6 mb-6 p-6 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <DialogTitle className="dark:text-white">
                チャンネル設定
              </DialogTitle>
            </div>
            <DialogDescription className="dark:text-slate-300">
              # {channel.name} の設定を変更できます
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* チャンネル情報セクション */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  チャンネル情報
                </h3>
                {!canEdit && (
                  <Badge variant="secondary" className="text-xs">
                    閲覧のみ
                  </Badge>
                )}
              </div>

              {/* チャンネル名 */}
              <div className="space-y-2">
                <Label htmlFor="channel-name">チャンネル名</Label>
                <Input
                  id="channel-name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  disabled={!canEdit || isLoading}
                  placeholder="例: general"
                  className="dark:bg-slate-700 dark:text-white"
                />
              </div>

              {/* トピック */}
              <div className="space-y-2">
                <Label htmlFor="channel-topic">トピック</Label>
                <Input
                  id="channel-topic"
                  value={channelTopic}
                  onChange={(e) => setChannelTopic(e.target.value)}
                  disabled={!canEdit || isLoading}
                  placeholder="チャンネルのトピックを入力..."
                  className="dark:bg-slate-700 dark:text-white"
                />
              </div>

              {/* 説明 */}
              <div className="space-y-2">
                <Label htmlFor="channel-description">説明</Label>
                <Textarea
                  id="channel-description"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  disabled={!canEdit || isLoading}
                  placeholder="チャンネルの説明を入力..."
                  rows={3}
                  className="dark:bg-slate-700 dark:text-white resize-none"
                />
              </div>
            </div>

            {/* 通知設定セクション */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                通知設定
              </h3>

              <div className="space-y-2">
                <Label htmlFor="notification-setting">通知の受け取り方</Label>
                <Select
                  value={notificationSetting}
                  onValueChange={handleNotificationChange}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="notification-setting"
                    className="dark:bg-slate-700 dark:text-white"
                  >
                    <div className="flex items-center gap-2">
                      {getNotificationIcon()}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <BellRing className="w-4 h-4" />
                        <span>すべての通知</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mentions">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span>メンションのみ</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="muted">
                      <div className="flex items-center gap-2">
                        <BellOff className="w-4 h-4" />
                        <span>ミュート</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {notificationSetting === "all" &&
                    "このチャンネルのすべてのメッセージで通知を受け取ります"}
                  {notificationSetting === "mentions" &&
                    "自分がメンションされた時のみ通知を受け取ります"}
                  {notificationSetting === "muted" &&
                    "このチャンネルからの通知を受け取りません"}
                </p>
              </div>
            </div>

            {/* 権限設定セクション */}
            {canEdit && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    アクセス権限
                  </h3>
                </div>

                {/* プライベートチャンネル設定 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is-private">プライベートチャンネル</Label>
                    <input
                      id="is-private"
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      disabled={!canEdit || isLoading}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    プライベートチャンネルは指定した役割のみアクセスできます
                  </p>
                </div>

                {/* 許可された役割 */}
                {isPrivate && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <Label>アクセス可能な役割</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['admin', 'manager', 'leader', 'worker'].map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 p-3 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={allowedRoles.includes(role)}
                            onChange={() => toggleRole(role)}
                            disabled={!canEdit || isLoading}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {role === 'admin' ? '管理者' : role === 'manager' ? 'マネージャー' : role === 'leader' ? 'リーダー' : 'ワーカー'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 危険な操作セクション */}
            {(onDeleteChannel || onLeaveChannel) && (
              <div className="border-t border-red-200 dark:border-red-900 pt-4 space-y-4">
                <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  危険な操作
                </h3>

                {/* チャンネル削除 */}
                {onDeleteChannel && canDelete && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                      このチャンネルと全てのメッセージが完全に削除されます。この操作は取り消せません。
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      チャンネルを削除
                    </Button>
                  </div>
                )}

                {/* チャンネル退出 */}
                {onLeaveChannel && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                      このチャンネルから退出します。再度参加するには招待が必要です。
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowLeaveConfirm(true)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      チャンネルから退出
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "保存中..." : "変更を保存"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="dark:bg-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
              チャンネルを削除しますか?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-300">
              <strong>#{channel.name}</strong>{" "}
              とその中の全てのメッセージが完全に削除されます。
              <br />
              <span className="text-red-600 dark:text-red-400 font-semibold">
                この操作は取り消せません。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "削除中..." : "完全に削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出確認ダイアログ */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="dark:bg-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              チャンネルから退出しますか?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-300">
              <strong>#{channel.name}</strong>{" "}
              から退出します。この操作は取り消せません。
              <br />
              再度参加するには、メンバーからの招待が必要です。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "退出中..." : "退出する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
