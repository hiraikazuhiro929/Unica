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
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Mail,
  Building2,
  Clock,
  UserCheck,
  UserX,
  Shield,
  X,
  AtSign,
  Phone,
  Calendar,
} from "lucide-react";
import type { ChatUser } from "@/lib/firebase/chat";

interface UserProfileModalProps {
  user: ChatUser | null;
  isOpen: boolean;
  onClose: () => void;
  onDirectMessage?: (userId: string) => void;
  onMention?: (userName: string) => void;
  currentUserId: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onDirectMessage,
  onMention,
  currentUserId,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "オンライン";
      case "away":
        return "離席中";
      case "busy":
        return "取り込み中";
      case "offline":
        return "オフライン";
      default:
        return "不明";
    }
  };

  const formatLastSeen = (lastSeen: any): string => {
    if (!lastSeen) return '不明';
    
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDirectMessage = () => {
    if (onDirectMessage) {
      setIsLoading(true);
      onDirectMessage(user.id);
      onClose();
      setIsLoading(false);
    }
  };

  const handleMention = () => {
    if (onMention) {
      onMention(user.name);
      onClose();
    }
  };

  const isCurrentUser = user.id === currentUserId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>ユーザープロフィール</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* プロフィール画像とステータス */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${getStatusColor(
                  user.status
                )}`}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {user.role}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getStatusText(user.status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* ユーザー情報 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{user.email}</span>
            </div>
            
            <div className="flex items-center space-x-3 text-sm">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{user.department}</span>
            </div>
            
            <div className="flex items-center space-x-3 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                最後のアクティブ: {formatLastSeen(user.lastSeen)}
              </span>
            </div>

            {user.statusMessage && (
              <div className="flex items-center space-x-3 text-sm">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 italic">"{user.statusMessage}"</span>
              </div>
            )}
          </div>

          {/* 権限情報 */}
          {user.permissions && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">権限</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {user.permissions.canCreateChannels && (
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-3 h-3 text-green-500" />
                    <span>チャンネル作成</span>
                  </div>
                )}
                {user.permissions.canManageChannels && (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-3 h-3 text-blue-500" />
                    <span>チャンネル管理</span>
                  </div>
                )}
                {user.permissions.canMentionEveryone && (
                  <div className="flex items-center space-x-2">
                    <AtSign className="w-3 h-3 text-yellow-500" />
                    <span>全体メンション</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          {!isCurrentUser && (
            <div className="border-t pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDirectMessage}
                  disabled={isLoading || !onDirectMessage}
                  className="flex items-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>DM送信</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMention}
                  disabled={!onMention}
                  className="flex items-center space-x-2"
                >
                  <AtSign className="w-4 h-4" />
                  <span>メンション</span>
                </Button>
              </div>
              
              {/* 追加のアクションボタン */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="flex items-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>通話開始</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="flex items-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>予定確認</span>
                </Button>
              </div>
            </div>
          )}

          {/* 現在のユーザーの場合 */}
          {isCurrentUser && (
            <div className="border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">あなたのプロフィール</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  設定でプロフィールを変更できます
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};