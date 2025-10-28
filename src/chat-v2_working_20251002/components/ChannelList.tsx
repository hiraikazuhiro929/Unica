/**
 * ChannelList - Discord風チャンネルリストコンポーネント
 */

import React, { useState } from 'react';
import { ChatChannel, UnreadCount, ChannelId, UserId } from '../types';
import UnifiedTimestamp from '../core/UnifiedTimestamp';
import { Hash, Volume2, Megaphone, Plus, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelListProps {
  channels: ChatChannel[];
  currentChannelId?: ChannelId | null;
  unreadCounts: UnreadCount[];
  currentUserId?: UserId;
  onChannelSelect: (channelId: ChannelId) => void;
  onChannelCreate?: () => void;
  onChannelEdit?: (channel: ChatChannel) => void;
  className?: string;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  currentChannelId,
  unreadCounts,
  currentUserId,
  onChannelSelect,
  onChannelCreate,
  onChannelEdit,
  className,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // チャンネルタイプのアイコン
  const getChannelIcon = (type: ChatChannel['type']) => {
    switch (type) {
      case 'text':
        return <Hash className="w-4 h-4" />;
      case 'voice':
        return <Volume2 className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  // 未読数取得
  const getUnreadCount = (channelId: ChannelId) => {
    if (!currentUserId) return 0;
    const unread = unreadCounts.find(
      u => u.channelId === channelId && u.userId === currentUserId
    );
    return unread?.count || 0;
  };

  // カテゴリー別にチャンネルをグループ化
  const groupedChannels = channels.reduce((groups, channel) => {
    const categoryId = channel.categoryId || 'uncategorized';
    if (!groups[categoryId]) {
      groups[categoryId] = [];
    }
    groups[categoryId].push(channel);
    return groups;
  }, {} as Record<string, ChatChannel[]>);

  // カテゴリーの展開/折りたたみ
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // チャンネルアイテムコンポーネント
  const ChannelItem: React.FC<{ channel: ChatChannel }> = ({ channel }) => {
    const unreadCount = getUnreadCount(channel.id);
    const isActive = currentChannelId === channel.id;
    const hasUnread = unreadCount > 0;

    return (
      <div
        onClick={() => onChannelSelect(channel.id)}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 mx-1 rounded cursor-pointer transition-colors',
          isActive
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
            : hasUnread
            ? 'text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-100 dark:hover:bg-slate-700'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        {/* チャンネルアイコン */}
        <div className={cn(
          'flex-shrink-0',
          isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
        )}>
          {getChannelIcon(channel.type)}
        </div>

        {/* チャンネル名 */}
        <span className={cn(
          'flex-1 truncate text-sm',
          hasUnread && !isActive ? 'font-medium' : 'font-normal'
        )}>
          {channel.name}
        </span>

        {/* 未読バッジ */}
        {hasUnread && (
          <div className="flex-shrink-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* プライベートチャンネルインジケーター */}
        {channel.isPrivate && (
          <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full" title="プライベートチャンネル" />
        )}

        {/* ホバー時の設定ボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChannelEdit?.(channel);
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-all"
          title="チャンネル設定"
        >
          <Settings className="w-3 h-3 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    );
  };

  // カテゴリーヘッダーコンポーネント
  const CategoryHeader: React.FC<{ categoryId: string; categoryName: string; channelCount: number }> = ({
    categoryId,
    categoryName,
    channelCount,
  }) => {
    const isCollapsed = collapsedCategories.has(categoryId);

    return (
      <div className="flex items-center justify-between px-2 py-2 mt-4 first:mt-0">
        <button
          onClick={() => toggleCategory(categoryId)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>{categoryName}</span>
          <span className="ml-1">({channelCount})</span>
        </button>

        {/* カテゴリー内にチャンネル追加ボタン */}
        {onChannelCreate && (
          <button
            onClick={() => onChannelCreate()}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-all"
            title="チャンネルを追加"
          >
            <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700', className)}>
      {/* ヘッダー */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-white">チャンネル</h2>
          {onChannelCreate && (
            <button
              onClick={onChannelCreate}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              title="新しいチャンネルを作成"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* チャンネルリスト */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedChannels).map(([categoryId, categoryChannels]) => {
          const isCollapsed = collapsedCategories.has(categoryId);
          const categoryName = categoryId === 'uncategorized' ? 'チャンネル' : categoryId;

          return (
            <div key={categoryId} className="group">
              <CategoryHeader
                categoryId={categoryId}
                categoryName={categoryName}
                channelCount={categoryChannels.length}
              />

              {/* チャンネル一覧 */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {categoryChannels
                    .sort((a, b) => a.position - b.position)
                    .map((channel) => (
                      <ChannelItem key={channel.id} channel={channel} />
                    ))}
                </div>
              )}
            </div>
          );
        })}

        {/* チャンネルが存在しない場合 */}
        {channels.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              <Hash className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">チャンネルがありません</p>
            {onChannelCreate && (
              <button
                onClick={onChannelCreate}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                最初のチャンネルを作成
              </button>
            )}
          </div>
        )}
      </div>

      {/* フッター（オンラインユーザー数など） */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {channels.length} チャンネル
        </div>
      </div>
    </div>
  );
};

export default ChannelList;