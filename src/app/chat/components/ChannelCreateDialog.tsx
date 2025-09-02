"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Hash, Volume2, Zap, Lock, Globe } from "lucide-react";
import type { ChatChannel } from "@/lib/firebase/chat";

interface ChannelCreateDialogProps {
  onCreateChannel: (channelData: Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>) => Promise<void>;
  trigger?: React.ReactNode;
  currentUserId: string;
  categoryId?: string; // カテゴリーIDを追加
}


const CHANNEL_TYPES: Array<{
  value: ChatChannel['type'];
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    value: "text",
    label: "テキストチャンネル",
    icon: <Hash className="w-4 h-4" />,
    description: "メッセージの送受信"
  },
  {
    value: "voice",
    label: "ボイスチャンネル",
    icon: <Volume2 className="w-4 h-4" />,
    description: "音声通話（将来実装）"
  },
  {
    value: "announcement",
    label: "お知らせチャンネル",
    icon: <Zap className="w-4 h-4" />,
    description: "重要な通知専用"
  },
];

const ALLOWED_ROLES = [
  { value: "admin", label: "管理者" },
  { value: "manager", label: "管理職" },
  { value: "leader", label: "リーダー" },
  { value: "worker", label: "作業者" },
  { value: "guest", label: "ゲスト" },
];

export const ChannelCreateDialog: React.FC<ChannelCreateDialogProps> = ({
  onCreateChannel,
  trigger,
  currentUserId,
  categoryId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topic: "",
    type: "text" as ChatChannel['type'],
    isPrivate: false,
    allowedRoles: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      const permissions: any = {
        canRead: true,
        canWrite: true,
        canManage: false,
      };

      // allowedRolesがある場合のみ追加
      if (formData.allowedRoles.length > 0) {
        permissions.allowedRoles = formData.allowedRoles;
      }

      const channelData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        topic: formData.topic.trim(),
        type: formData.type,
        position: 0, // デフォルトポジション
        isPrivate: formData.isPrivate,
        createdBy: currentUserId,
        permissions: permissions,
      };

      // カテゴリーIDがある場合のみcategoryIdを設定、ない場合はcategoryを設定
      if (categoryId) {
        channelData.categoryId = categoryId;
      } else {
        channelData.category = "general";
      }

      await onCreateChannel(channelData);
      
      // フォームリセット
      setFormData({
        name: "",
        description: "",
        topic: "",
        type: "text",
        isPrivate: false,
        allowedRoles: [],
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error("チャンネル作成エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleToggle = (roleValue: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(roleValue)
        ? prev.allowedRoles.filter(r => r !== roleValue)
        : [...prev.allowedRoles, roleValue]
    }));
  };

  const selectedType = CHANNEL_TYPES.find(type => type.value === formData.type);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            新しいチャンネルを作成
          </DialogTitle>
          <DialogDescription>
            チームメンバーが参加できる新しいチャンネルを作成します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">チャンネル名 *</Label>
              <Input
                id="name"
                placeholder="例：製造-ライン1、品質-検査チーム"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                placeholder="このチャンネルの目的や使用方法を説明してください"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="topic">トピック</Label>
              <Input
                id="topic"
                placeholder="現在のトピックや重要な情報"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              />
            </div>
          </div>

          {/* チャンネル設定 */}
          <div className="space-y-4">
            <div>
              <Label>チャンネルタイプ</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {CHANNEL_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  >
                    <div className="flex items-center space-x-3">
                      {type.icon}
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  {formData.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  プライベートチャンネル
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.isPrivate
                    ? "指定されたメンバーのみがアクセスできます"
                    : "全てのチームメンバーがアクセスできます"
                  }
                </p>
              </div>
              <Switch
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
              />
            </div>
          </div>

          {/* 権限設定（プライベートチャンネルの場合） */}
          {formData.isPrivate && (
            <div>
              <Label>アクセス可能な役職</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ALLOWED_ROLES.map((role) => (
                  <div
                    key={role.value}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      formData.allowedRoles.includes(role.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleRoleToggle(role.value)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{role.label}</span>
                      {formData.allowedRoles.includes(role.value) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {formData.allowedRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.allowedRoles.map((roleValue) => {
                    const role = ALLOWED_ROLES.find(r => r.value === roleValue);
                    return (
                      <Badge key={roleValue} variant="secondary" className="text-xs">
                        {role?.label}
                        <button
                          type="button"
                          onClick={() => handleRoleToggle(roleValue)}
                          className="ml-1 hover:bg-gray-300 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || isLoading}>
              {isLoading ? "作成中..." : "チャンネルを作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};