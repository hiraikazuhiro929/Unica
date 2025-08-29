"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Trash2,
  Bell,
  BellOff,
  Hash,
  Volume2,
  VolumeX,
  Copy,
  Edit,
} from "lucide-react";

interface ChannelContextMenuProps {
  x: number;
  y: number;
  channel: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleNotifications: (channelId: string, enabled: boolean) => void;
  onToggleMute: (channelId: string, muted: boolean) => void;
  onCopyId: (channelId: string) => void;
  isNotificationsEnabled: boolean;
  isMuted: boolean;
}

export const ChannelContextMenu: React.FC<ChannelContextMenuProps> = ({
  x,
  y,
  channel,
  onClose,
  onEdit,
  onDelete,
  onToggleNotifications,
  onToggleMute,
  onCopyId,
  isNotificationsEnabled,
  isMuted,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // 画面端での位置調整
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, x, y]);

  const handleDelete = () => {
    if (window.confirm(`チャンネル「${channel.name}」を削除しますか？この操作は取り消せません。`)) {
      onDelete();
      onClose();
    }
  };

  const handleCopyId = () => {
    onCopyId(channel.id);
    onClose();
  };

  const handleToggleNotifications = () => {
    onToggleNotifications(channel.id, !isNotificationsEnabled);
    onClose();
  };

  const handleToggleMute = () => {
    onToggleMute(channel.id, !isMuted);
    onClose();
  };

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 min-w-[200px] py-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-600">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-900 dark:text-white">
          <Hash className="w-4 h-4" />
          <span className="truncate">{channel.name}</span>
        </div>
      </div>

      <div className="py-1">
        <button
          onClick={handleEdit}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>チャンネル設定</span>
        </button>

        <button
          onClick={handleToggleNotifications}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isNotificationsEnabled ? (
            <BellOff className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          <span>{isNotificationsEnabled ? '通知をオフ' : '通知をオン'}</span>
        </button>

        <button
          onClick={handleToggleMute}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isMuted ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          <span>{isMuted ? 'ミュートを解除' : 'ミュート'}</span>
        </button>

        <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>

        <button
          onClick={handleCopyId}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>IDをコピー</span>
        </button>

        <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>

        <button
          onClick={handleDelete}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>チャンネルを削除</span>
        </button>
      </div>
    </div>
  );
};