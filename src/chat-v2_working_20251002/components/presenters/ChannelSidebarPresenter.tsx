import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Hash,
  Lock,
  Volume2,
  VolumeX,
  Plus,
  Settings,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Users,
  Bell,
  BellOff,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  UnreadBadge,
  MentionBadge,
  Badge,
  LoadingSpinner,
  Avatar,
} from '../shared';
import type { ChannelState, UserState } from '../../store/types';

// =============================================================================
// ChannelSidebarPresenter Component - Discord風チャンネルサイドバー
// =============================================================================

interface ChannelCategory {
  id: string;
  name: string;
  collapsed?: boolean;
  channels: ChannelState[];
}

interface ChannelSidebarPresenterProps {
  /** チャンネルリスト */
  channels: ChannelState[];
  /** 選択中のチャンネルID */
  selectedChannelId?: string;
  /** オンラインユーザーリスト */
  onlineUsers: UserState[];
  /** 現在のユーザー */
  currentUser?: UserState;
  /** ロード中状態 */
  isLoading?: boolean;
  /** サイドバーが折りたたまれているか */
  isCollapsed?: boolean;
  /** チャンネル選択ハンドラー */
  onChannelSelect: (channelId: string) => void;
  /** チャンネル作成ハンドラー */
  onCreateChannel?: () => void;
  /** チャンネル編集ハンドラー */
  onEditChannel?: (channelId: string) => void;
  /** チャンネル削除ハンドラー */
  onDeleteChannel?: (channelId: string) => void;
  /** カテゴリ折りたたみハンドラー */
  onToggleCategory?: (categoryId: string) => void;
  /** 通知設定変更ハンドラー */
  onToggleNotifications?: (channelId: string, enabled: boolean) => void;
  /** ユーザークリックハンドラー */
  onUserClick?: (userId: string) => void;
  /** 設定画面表示ハンドラー */
  onShowSettings?: () => void;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * Discord風チャンネルサイドバーコンポーネント
 *
 * 特徴:
 * - Discord風デザイン
 * - カテゴリ別チャンネル表示
 * - 未読バッジ・メンション表示
 * - オンラインユーザー表示
 * - チャンネル管理機能
 * - 折りたたみ機能
 */
export const ChannelSidebarPresenter: React.FC<ChannelSidebarPresenterProps> = ({
  channels,
  selectedChannelId,
  onlineUsers,
  currentUser,
  isLoading = false,
  isCollapsed = false,
  onChannelSelect,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onToggleCategory,
  onToggleNotifications,
  onUserClick,
  onShowSettings,
  className,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // チャンネルをカテゴリ別にグループ化
  const categorizedChannels = useMemo(() => {
    const categories: ChannelCategory[] = [];
    const categoryMap = new Map<string, ChannelState[]>();

    // チャンネルをカテゴリ別に分類
    channels.forEach(channel => {
      const categoryName = channel.category || '一般';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(channel);
    });

    // カテゴリオブジェクトに変換
    categoryMap.forEach((channelList, categoryName) => {
      categories.push({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        collapsed: collapsedCategories.has(categoryName),
        channels: channelList.sort((a, b) => a.name.localeCompare(b.name)),
      });
    });

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }, [channels, collapsedCategories]);

  // カテゴリの折りたたみ切り替え
  const handleToggleCategory = (categoryId: string, categoryName: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryName)) {
      newCollapsed.delete(categoryName);
    } else {
      newCollapsed.add(categoryName);
    }
    setCollapsedCategories(newCollapsed);
    onToggleCategory?.(categoryId);
  };

  // チャンネルアイコンの取得
  const getChannelIcon = (channel: ChannelState) => {
    if (channel.type === 'voice') return Volume2;
    if (channel.isPrivate) return Lock;
    return Hash;
  };

  // 折りたたみ状態での表示
  if (isCollapsed) {
    return (
      <div className={cn(
        "w-16 bg-discord-bg-secondary border-r border-discord-bg-tertiary flex flex-col",
        className
      )}>
        {/* 現在のユーザー */}
        {currentUser && (
          <div className="p-2 border-b border-discord-bg-tertiary">
            <Avatar
              user={currentUser}
              size="md"
              showStatus
              onClick={() => onUserClick?.(currentUser.id)}
              className="cursor-pointer"
            />
          </div>
        )}

        {/* 折りたたまれたチャンネルリスト */}
        <div className="flex-1 overflow-y-auto p-1">
          {channels.slice(0, 10).map(channel => {
            const Icon = getChannelIcon(channel);
            const isSelected = selectedChannelId === channel.id;
            const hasUnread = channel.unreadCount > 0;

            return (
              <div key={channel.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => onChannelSelect(channel.id)}
                  className={cn(
                    "w-full p-2 rounded flex items-center justify-center transition-colors relative",
                    isSelected
                      ? "bg-discord-accent-primary text-white"
                      : "text-discord-text-secondary hover:bg-discord-bg-tertiary hover:text-discord-text-primary"
                  )}
                  title={channel.name}
                >
                  <Icon size={20} />
                  {hasUnread && (
                    <div className="absolute -top-1 -right-1">
                      <UnreadBadge count={channel.unreadCount} size="xs" />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 設定ボタン */}
        <div className="p-2 border-t border-discord-bg-tertiary">
          <button
            type="button"
            onClick={onShowSettings}
            className="w-full p-2 rounded text-discord-text-secondary hover:bg-discord-bg-tertiary hover:text-discord-text-primary transition-colors"
            title="設定"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ローディング状態
  if (isLoading) {
    return (
      <div className={cn(
        "w-64 bg-discord-bg-secondary border-r border-discord-bg-tertiary",
        className
      )}>
        <div className="p-4">
          <LoadingSpinner label="チャンネルを読み込み中..." />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-64 bg-discord-bg-secondary border-r border-discord-bg-tertiary flex flex-col",
      className
    )}>
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-discord-bg-tertiary">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-discord-text-primary">チャンネル</h2>
          {onCreateChannel && (
            <button
              type="button"
              onClick={onCreateChannel}
              className="p-1 rounded hover:bg-discord-bg-tertiary transition-colors"
              aria-label="チャンネルを作成"
            >
              <Plus size={16} className="text-discord-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* チャンネルリスト */}
      <div className="flex-1 overflow-y-auto">
        {categorizedChannels.map(category => (
          <div key={category.id} className="mb-2">
            {/* カテゴリヘッダー */}
            <button
              type="button"
              onClick={() => handleToggleCategory(category.id, category.name)}
              className="w-full px-2 py-1 flex items-center gap-1 text-xs font-medium text-discord-text-muted hover:text-discord-text-secondary transition-colors"
            >
              {category.collapsed ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              <span className="uppercase tracking-wide">{category.name}</span>
            </button>

            {/* チャンネルリスト */}
            {!category.collapsed && (
              <div className="px-2 space-y-0.5">
                {category.channels.map(channel => {
                  const Icon = getChannelIcon(channel);
                  const isSelected = selectedChannelId === channel.id;
                  const hasUnread = channel.unreadCount > 0;
                  const hasMentions = channel.mentionCount > 0;

                  return (
                    <div key={channel.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onChannelSelect(channel.id)}
                        className={cn(
                          "w-full px-2 py-1 rounded flex items-center gap-2 text-sm transition-colors",
                          isSelected
                            ? "bg-discord-accent-primary bg-opacity-20 text-discord-accent-primary"
                            : hasUnread
                            ? "text-discord-text-primary"
                            : "text-discord-text-secondary hover:bg-discord-bg-tertiary hover:text-discord-text-primary"
                        )}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="flex-1 truncate">{channel.name}</span>

                        {/* 未読・メンションバッジ */}
                        <div className="flex items-center gap-1">
                          {hasMentions && (
                            <MentionBadge count={channel.mentionCount} size="xs" />
                          )}
                          {hasUnread && !hasMentions && (
                            <UnreadBadge count={channel.unreadCount} size="xs" />
                          )}
                        </div>
                      </button>

                      {/* チャンネルアクションメニュー */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-0.5">
                          {/* 通知設定 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleNotifications?.(channel.id, !channel.notificationsEnabled);
                            }}
                            className="p-1 rounded hover:bg-discord-bg-tertiary transition-colors"
                            title={channel.notificationsEnabled ? "通知を無効にする" : "通知を有効にする"}
                          >
                            {channel.notificationsEnabled ? (
                              <Bell size={12} />
                            ) : (
                              <BellOff size={12} />
                            )}
                          </button>

                          {/* その他のメニュー */}
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-discord-bg-tertiary transition-colors"
                            title="チャンネル設定"
                          >
                            <MoreHorizontal size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* チャンネルが空の場合 */}
        {channels.length === 0 && (
          <div className="px-4 py-8 text-center text-discord-text-muted">
            <p className="text-sm">チャンネルがありません</p>
            {onCreateChannel && (
              <button
                type="button"
                onClick={onCreateChannel}
                className="mt-2 text-discord-accent-primary hover:underline text-sm"
              >
                最初のチャンネルを作成
              </button>
            )}
          </div>
        )}
      </div>

      {/* オンラインユーザーリスト */}
      {onlineUsers.length > 0 && (
        <div className="border-t border-discord-bg-tertiary">
          <div className="px-4 py-2">
            <h3 className="text-xs font-medium text-discord-text-muted uppercase tracking-wide mb-2">
              オンライン — {onlineUsers.length}
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {onlineUsers.slice(0, 10).map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onUserClick?.(user.id)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-discord-bg-tertiary transition-colors"
                >
                  <Avatar
                    user={user}
                    size="xs"
                    showStatus
                  />
                  <span className="text-sm text-discord-text-primary truncate">
                    {user.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 現在のユーザー情報 */}
      {currentUser && (
        <div className="px-4 py-2 border-t border-discord-bg-tertiary bg-discord-bg-tertiary">
          <div className="flex items-center gap-2">
            <Avatar
              user={currentUser}
              size="sm"
              showStatus
              onClick={() => onUserClick?.(currentUser.id)}
              className="cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-discord-text-primary truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-discord-text-secondary truncate">
                {currentUser.statusMessage || currentUser.status}
              </p>
            </div>
            <button
              type="button"
              onClick={onShowSettings}
              className="p-1 rounded hover:bg-discord-bg-secondary transition-colors"
              aria-label="設定"
            >
              <Settings size={16} className="text-discord-text-secondary" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

ChannelSidebarPresenter.displayName = 'ChannelSidebarPresenter';

// =============================================================================
// Export
// =============================================================================

export type { ChannelSidebarPresenterProps, ChannelCategory };