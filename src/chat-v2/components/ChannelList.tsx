/**
 * ChannelList - Discord風チャンネルリストコンポーネント
 */

import React, { useState } from 'react';
import { ChatChannel, UnreadCount, ChannelId, UserId, ChannelCategory, CategoryId, createCategoryId, DirectMessageChannel, ChatUser } from '../types';
import UnifiedTimestamp from '../core/UnifiedTimestamp';
import { Hash, Volume2, Megaphone, Plus, Settings, ChevronDown, ChevronRight, Edit2, Check, X, GripVertical, FolderPlus, Search, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canCreateChannel, canManageChannel } from '../services/chatService';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ChannelListProps {
  channels: ChatChannel[];
  categories?: ChannelCategory[];
  currentChannelId?: ChannelId | null;
  unreadCounts: UnreadCount[];
  currentUserId?: UserId;
  currentUserRole?: 'admin' | 'manager' | 'leader' | 'worker';
  onChannelSelect: (channelId: ChannelId) => void;
  onChannelCreate?: (categoryId?: CategoryId) => void;
  onChannelEdit?: (channel: ChatChannel) => void;
  onCategorySettings?: (category: ChannelCategory) => void;
  onCategoryCreate?: () => void;
  onServerSettings?: () => void;
  activeTab?: 'channels' | 'dms';
  onTabChange?: (tab: 'channels' | 'dms') => void;
  dmCount?: number;

  // DM用props
  dms?: DirectMessageChannel[];
  users?: Record<string, ChatUser>;
  activeDmId?: string;
  onSelectDM?: (dm: DirectMessageChannel) => void;
  onNewDM?: () => void;

  className?: string;
}

/**
 * DMListContent - DM一覧表示（ChannelList内部用）
 */
interface DMListContentProps {
  dms: DirectMessageChannel[];
  currentUserId: UserId;
  users: Record<string, ChatUser>;
  activeDmId?: string;
  onSelectDM?: (dm: DirectMessageChannel) => void;
  onNewDM?: () => void;
}

const DMListContent: React.FC<DMListContentProps> = ({
  dms,
  currentUserId,
  users,
  activeDmId,
  onSelectDM,
  onNewDM,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getOtherUserId = (dm: DirectMessageChannel): UserId => {
    return dm.participants[0] === currentUserId
      ? dm.participants[1]
      : dm.participants[0];
  };

  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const filteredDMs = dms.filter(dm => {
    const otherUserId = getOtherUserId(dm);
    const otherUser = users[otherUserId];
    if (!otherUser) return false;

    return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      {/* 検索 */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="ユーザーを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 新しいDMボタン */}
      {onNewDM && (
        <button
          onClick={onNewDM}
          className="w-full p-3 mb-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-white">
              新しいDM
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ユーザーを選んでメッセージを送信
            </div>
          </div>
        </button>
      )}

      {/* DMリスト */}
      {filteredDMs.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          {searchQuery ? '該当するユーザーが見つかりません' : 'DMがありません'}
        </div>
      ) : (
        filteredDMs.map(dm => {
          const otherUserId = getOtherUserId(dm);
          const otherUser = users[otherUserId];
          if (!otherUser) return null;

          const isActive = activeDmId === dm.id;
          const hasUnread = dm.lastMessage && !dm.lastMessage.isRead && dm.lastMessage.senderId !== currentUserId;

          return (
            <button
              key={dm.id}
              onClick={() => onSelectDM?.(dm)}
              className={`w-full p-3 mb-1 flex items-center gap-3 rounded transition-colors ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {/* アバター */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {otherUser.name.charAt(0).toUpperCase()}
                </div>
                {/* オンライン状態 */}
                {otherUser.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                )}
              </div>

              {/* ユーザー情報 */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium truncate ${
                    hasUnread
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {otherUser.name}
                  </span>
                  {dm.lastMessage && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                      {formatRelativeTime(dm.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
                {dm.lastMessage && (
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${
                      hasUnread
                        ? 'text-gray-800 dark:text-gray-200 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {dm.lastMessage.senderId === currentUserId ? 'あなた: ' : ''}
                      {dm.lastMessage.content}
                    </p>
                    {hasUnread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </>
  );
};

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  categories = [],
  currentChannelId,
  unreadCounts,
  currentUserId,
  currentUserRole = 'worker',
  onChannelSelect,
  onChannelCreate,
  onChannelEdit,
  onCategorySettings,
  onCategoryCreate,
  onServerSettings,
  activeTab = 'channels',
  onTabChange,
  dmCount = 0,
  dms,
  users,
  activeDmId,
  onSelectDM,
  onNewDM,
  className,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // デバッグ: 受け取ったchannelsを確認
  React.useEffect(() => {
    console.log('🔍 [ChannelList] Received channels:', {
      channelsCount: channels?.length || 0,
      channels: channels,
      isEmpty: !channels || channels.length === 0,
    });
  }, [channels]);

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
    // categoryIdが必須（ない場合はデータ不整合なので削除）
    if (!channel.categoryId) {
      console.warn('データ不整合: チャンネルにcategoryIdがありません。削除します:', channel);
      // Firestoreから削除
      deleteDoc(doc(db, 'chat_channels', channel.id)).catch(err => {
        console.error('チャンネル削除エラー:', err);
      });
      return groups;
    }
    const categoryId = channel.categoryId;
    if (!groups[categoryId]) {
      groups[categoryId] = [];
    }
    groups[categoryId].push(channel);
    return groups;
  }, {} as Record<string, ChatChannel[]>);

  // 全カテゴリを表示するため、Firestoreのカテゴリも追加
  categories.forEach(cat => {
    if (!groupedChannels[cat.id]) {
      groupedChannels[cat.id] = [];
    }
  });

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

        {/* ホバー時の設定ボタン（管理者とマネージャーのみ表示） */}
        {canManageChannel(currentUserRole) && (
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
        )}
      </div>
    );
  };

  // カテゴリーヘッダーコンポーネント
  const CategoryHeader: React.FC<{
    categoryId: string;
    categoryName: string;
    channelCount: number;
    category?: ChannelCategory;
  }> = ({
    categoryId,
    categoryName,
    channelCount,
    category,
  }) => {
    const isCollapsed = collapsedCategories.has(categoryId);
    const canManage = canManageChannel(currentUserRole);

    return (
      <div className="group flex items-center justify-between px-2 py-2 mt-4 first:mt-0">
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

        <div className="flex items-center gap-1">
          {/* カテゴリ設定ボタン */}
          {canManage && category && onCategorySettings && (
            <button
              onClick={() => onCategorySettings(category)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-all"
              title="カテゴリ設定"
            >
              <Settings className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* カテゴリー内にチャンネル追加ボタン（管理者とマネージャーのみ表示） */}
          {onChannelCreate && canCreateChannel(currentUserRole) && category && (
            <button
              onClick={() => onChannelCreate(category.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-all"
              title="このカテゴリにチャンネルを追加"
            >
              <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700', className)}>
      {/* ヘッダー */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* タブ */}
        {onTabChange && (
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => onTabChange('channels')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                activeTab === 'channels'
                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              チャンネル
            </button>
            <button
              onClick={() => onTabChange('dms')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors rounded relative ${
                activeTab === 'dms'
                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              DM
              {dmCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {dmCount > 9 ? '9+' : dmCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* アクションボタン（チャンネルタブの時のみ表示） */}
        {activeTab === 'channels' && (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">チャンネル</h2>
            <div className="flex items-center gap-1">
              {onCategoryCreate && canManageChannel(currentUserRole) && (
                <button
                  onClick={onCategoryCreate}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="カテゴリを作成"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              )}
              {onChannelCreate && canCreateChannel(currentUserRole) && (
                <button
                  onClick={() => onChannelCreate()}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="新しいチャンネルを作成"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {onServerSettings && (
                <button
                  onClick={onServerSettings}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="サーバー設定"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* チャンネルリスト */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'channels' ? (
          // チャンネルリスト表示
          <>
            {Object.entries(groupedChannels).map(([categoryId, categoryChannels]) => {
              const isCollapsed = collapsedCategories.has(categoryId);
              const category = categories.find(c => c.id === categoryId);
              const categoryName = category?.name || categoryId;

              return (
                <div key={categoryId} className="group">
                  <CategoryHeader
                    categoryId={categoryId}
                    categoryName={categoryName}
                    channelCount={categoryChannels.length}
                    category={category}
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
                    onClick={() => onChannelCreate()}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    最初のチャンネルを作成
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          // DMリスト表示
          <DMListContent
            dms={dms || []}
            currentUserId={currentUserId || ('' as UserId)}
            users={users || {}}
            activeDmId={activeDmId}
            onSelectDM={onSelectDM}
            onNewDM={onNewDM}
          />
        )}
      </div>

      {/* フッター（オンラインユーザー数など） */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {activeTab === 'channels' ? (
            <>{channels.length} チャンネル</>
          ) : (
            <>{dms?.length || 0} DM</>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelList;