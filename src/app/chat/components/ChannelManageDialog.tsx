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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Hash, Volume2, Zap, Lock, Globe } from "lucide-react";
import type { ChatChannel } from "@/lib/firebase/chat";

interface ChannelManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  channel?: ChatChannel;
  onSubmit: (channelData: Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>) => Promise<void>;
  userRole?: string;
}

export const ChannelManageDialog: React.FC<ChannelManageDialogProps> = ({
  isOpen,
  onClose,
  mode,
  channel,
  onSubmit,
  userRole = 'worker',
}) => {
  const [formData, setFormData] = useState({
    name: channel?.name || '',
    description: channel?.description || '',
    topic: channel?.topic || '',
    type: channel?.type || 'text' as const,
    category: channel?.category || 'その他',
    isPrivate: channel?.isPrivate || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        createdBy: channel?.createdBy || '', // 実際の実装では現在のユーザーIDを使用
        permissions: {
          canRead: true,
          canWrite: true,
          canManage: userRole === 'admin' || userRole === 'manager',
        },
      });
      onClose();
    } catch (error) {
      console.error('Channel operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    '一般',
    '製造',
    '品質',
    '開発',
    '営業',
    'プロジェクト',
    'その他'
  ];

  const channelTypes = [
    { value: 'text', label: 'テキスト', icon: Hash, description: 'テキストメッセージとファイル' },
    { value: 'voice', label: 'ボイス', icon: Volume2, description: '音声通話とテキスト' },
    { value: 'announcement', label: 'お知らせ', icon: Zap, description: '重要な通知のみ' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{mode === 'create' ? 'チャンネル作成' : 'チャンネル編集'}</span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'メンバーがコミュニケーションを取るための新しいチャンネルを作成します。'
              : 'チャンネルの設定を変更します。'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* チャンネルタイプ選択 */}
          <div className="space-y-2">
            <Label>チャンネルタイプ</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'text' | 'voice' | 'announcement') =>
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channelTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* チャンネル名 */}
          <div className="space-y-2">
            <Label htmlFor="channel-name">チャンネル名 *</Label>
            <Input
              id="channel-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例: 製造部-一般"
              required
            />
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="channel-description">説明</Label>
            <Textarea
              id="channel-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="このチャンネルの目的を説明してください"
              rows={2}
            />
          </div>

          {/* トピック */}
          <div className="space-y-2">
            <Label htmlFor="channel-topic">トピック</Label>
            <Input
              id="channel-topic"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="現在の話題や注意事項"
            />
          </div>

          {/* カテゴリ */}
          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* プライベートチャンネル設定 */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              {formData.isPrivate ? (
                <Lock className="w-4 h-4 text-gray-600" />
              ) : (
                <Globe className="w-4 h-4 text-gray-600" />
              )}
              <div>
                <div className="font-medium">
                  {formData.isPrivate ? 'プライベートチャンネル' : 'パブリックチャンネル'}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.isPrivate 
                    ? '招待されたメンバーのみが参加できます'
                    : 'すべてのメンバーが参加できます'
                  }
                </div>
              </div>
            </div>
            <Switch
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || isSubmitting}>
              {isSubmitting ? (
                mode === 'create' ? '作成中...' : '更新中...'
              ) : (
                mode === 'create' ? '作成' : '更新'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelManageDialog;