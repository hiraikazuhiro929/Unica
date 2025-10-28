/**
 * MessageList - メッセージリストコンポーネント
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage, UserId } from '../types';
import MessageItem from './MessageItem';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: UserId;
  loading?: boolean;
  error?: string | null;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  showAvatars?: boolean;
  isCompact?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  loading = false,
  error = null,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onLoadMore,
  hasMore = false,
  className,
  showAvatars = true,
  isCompact = false,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const previousMessageCount = useRef(messages.length);
  const isInitialMount = useRef(true);

  // スクロール位置の監視
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isNearTop = scrollTop < 100;

    setIsAtBottom(isNearBottom);
    setShowScrollButton(!isNearBottom && messages.length > 10);

    // 上部近くでの追加読み込み
    if (isNearTop && hasMore && onLoadMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore, loading, messages.length]);

  // 新着メッセージの検出
  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      const newMessages = messages.length - previousMessageCount.current;
      if (!isAtBottom) {
        setNewMessageCount(prev => prev + newMessages);
      }
    }
    previousMessageCount.current = messages.length;
  }, [messages.length, isAtBottom]);

  // 自動スクロール（新しいメッセージが来た時のみ、初回ロードは完全除外）
  useEffect(() => {
    // 初回マウント時は何もしない（ページ表示時の自動スクロールを防ぐ）
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // 初回は最新メッセージが表示される位置に即座にスクロール（アニメーションなし）
      if (bottomRef.current && messages.length > 0) {
        // スクロール位置を最下部に設定（即座に、アニメーションなし）
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 0);
      }
      return;
    }

    // 2回目以降: 最下部にいる場合のみスムーズスクロール
    if (isAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // スクロールイベントリスナー
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    listElement.addEventListener('scroll', handleScroll);
    return () => listElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 最下部へのスクロール
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessageCount(0);
  };

  // 日付セパレーター
  const shouldShowDateSeparator = (currentMessage: ChatMessage, previousMessage?: ChatMessage) => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.timestamp?.toDate?.() || currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp?.toDate?.() || previousMessage.timestamp);

    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const formatDateSeparator = (message: ChatMessage) => {
    const date = new Date(message.timestamp?.toDate?.() || message.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400 font-medium">メッセージの読み込みに失敗しました</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">メッセージを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">まだメッセージがありません</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">最初のメッセージを送信してみましょう！</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 relative', className)}>
      {/* メッセージリスト */}
      <div
        ref={listRef}
        className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        {/* 上部読み込み中 */}
        {loading && hasMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* トップアンカー */}
        <div ref={topRef} />

        {/* メッセージ */}
        <div className="py-0">
          {messages.map((message, index) => {
            const previousMessage = index > 0 ? messages[index - 1] : undefined;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
            const showDateSep = shouldShowDateSeparator(message, previousMessage);

            return (
              <React.Fragment key={message.id}>
                {/* 日付セパレーター */}
                {showDateSep && (
                  <div className="flex items-center justify-center py-4">
                    <div className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
                      {formatDateSeparator(message)}
                    </div>
                  </div>
                )}

                {/* メッセージアイテム */}
                <MessageItem
                  message={message}
                  currentUserId={currentUserId}
                  previousMessage={previousMessage}
                  nextMessage={nextMessage}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReaction={onReaction}
                  showAvatar={showAvatars}
                  isCompact={isCompact}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* ボトムアンカー */}
        <div ref={bottomRef} />
      </div>

      {/* 下部スクロールボタン */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={scrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            {newMessageCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
                {newMessageCount > 99 ? '99+' : newMessageCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageList;