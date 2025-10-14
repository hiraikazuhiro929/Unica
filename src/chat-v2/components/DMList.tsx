/**
 * DMList - Direct Message List Component
 * ダイレクトメッセージ一覧コンポーネント
 */

import React, { useState } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import type { DirectMessageChannel, UserId, ChatUser } from '../types';

interface DMListProps {
  dms: DirectMessageChannel[];
  currentUserId: UserId;
  users: Record<string, ChatUser>;
  activeDmId?: string;
  onSelectDM: (dm: DirectMessageChannel) => void;
  onNewDM?: () => void;
}

export const DMList: React.FC<DMListProps> = ({
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

  const formatRelativeTime = (timestamp: Timestamp | Date | number): string => {
    if (!timestamp) return '';

    const date = (timestamp as Timestamp).toDate
      ? (timestamp as Timestamp).toDate()
      : new Date(timestamp);
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* 検索 */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700">
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

      {/* DMリスト */}
      <div className="flex-1 overflow-y-auto p-2">
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
                onClick={() => onSelectDM(dm)}
                className={`w-full p-3 flex items-center gap-3 rounded transition-colors ${
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
      </div>
    </div>
  );
};
