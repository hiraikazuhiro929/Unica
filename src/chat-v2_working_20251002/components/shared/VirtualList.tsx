import React, { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useVirtualScroll } from '../hooks/useVirtualScroll';
import { LoadingSpinner, MessageListLoading, Badge } from './index';
import type { MessageState } from '../../store/types';

// =============================================================================
// VirtualScrollMessageList Component - 仮想スクロール対応メッセージリスト
// =============================================================================

interface VirtualScrollMessageListProps {
  /** メッセージリスト */
  messages: MessageState[];
  /** メッセージアイテムのレンダー関数 */
  renderMessage: (message: MessageState, index: number) => React.ReactNode;
  /** ロード中状態 */
  isLoading?: boolean;
  /** より多くのメッセージを読み込み中 */
  isLoadingMore?: boolean;
  /** 更に古いメッセージがあるか */
  hasMore?: boolean;
  /** 古いメッセージの読み込み関数 */
  onLoadMore?: () => void;
  /** コンテナの高さ */
  height?: number | string;
  /** 自動スクロールを有効にするか */
  autoScroll?: boolean;
  /** 空の状態の表示内容 */
  emptyContent?: React.ReactNode;
  /** エラー状態の表示内容 */
  errorContent?: React.ReactNode;
  /** 追加のCSS クラス */
  className?: string;
  /** メッセージコンテナの追加CSS クラス */
  messageContainerClassName?: string;
}

/**
 * 仮想スクロール対応のメッセージリストコンポーネント
 *
 * 特徴:
 * - @tanstack/react-virtual による仮想化
 * - Discord風の下から上への表示
 * - 自動スクロール制御
 * - 新着メッセージバッジ
 * - 無限スクロール対応
 */
export const VirtualScrollMessageList: React.FC<VirtualScrollMessageListProps> = ({
  messages,
  renderMessage,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  height = '100%',
  autoScroll = true,
  emptyContent,
  errorContent,
  className,
  messageContainerClassName,
}) => {
  // 仮想スクロールの設定
  const {
    virtualizer,
    virtualItems,
    scrollElementRef,
    scrollToBottom,
    isNearBottom,
    showNewMessageBadge,
    handleNewMessageBadgeClick,
  } = useVirtualScroll({
    messages,
    autoScroll,
    autoScrollThreshold: 100,
    overscan: 5,
    reversed: true, // Discord風の下から上表示
  });

  // メッセージのグループ化（連続する同一ユーザーのメッセージ）
  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const prevMessage = messages[index - 1];
      const isFirstInGroup = !prevMessage ||
        prevMessage.authorId !== message.authorId ||
        (message.timestamp.getTime() - prevMessage.timestamp.getTime()) > 5 * 60 * 1000; // 5分以上間隔

      return {
        ...message,
        isFirstInGroup,
        groupIndex: index,
      };
    });
  }, [messages]);

  // 古いメッセージの読み込み処理
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // スクロールイベントハンドラー（上端検知）
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;

    // 逆順表示のため、下方向にスクロールしたときが「古いメッセージの読み込み」
    const isAtTop = Math.abs(scrollTop) >= scrollHeight - clientHeight - 100;

    if (isAtTop && hasMore && !isLoadingMore) {
      handleLoadMore();
    }
  }, [hasMore, isLoadingMore, handleLoadMore]);

  // ローディング状態
  if (isLoading && messages.length === 0) {
    return (
      <div className={cn("flex-1", className)} style={{ height }}>
        <MessageListLoading />
      </div>
    );
  }

  // エラー状態
  if (errorContent) {
    return (
      <div className={cn("flex-1", className)} style={{ height }}>
        {errorContent}
      </div>
    );
  }

  // 空の状態
  if (messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)} style={{ height }}>
        {emptyContent || (
          <div className="text-center text-discord-text-muted">
            <p className="text-lg font-medium mb-2">メッセージがありません</p>
            <p className="text-sm">最初のメッセージを送信してみましょう！</p>
          </div>
        )}
      </div>
    );
  }

  const totalSize = virtualizer.getTotalSize();

  return (
    <div className={cn("relative flex-1 overflow-hidden", className)} style={{ height }}>
      {/* メッセージリストコンテナ */}
      <div
        ref={scrollElementRef}
        className={cn(
          "h-full overflow-auto scrollbar-thin scrollbar-thumb-discord-bg-secondary scrollbar-track-transparent",
          messageContainerClassName
        )}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="メッセージリスト"
      >
        {/* 仮想スクロールコンテナ */}
        <div
          style={{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* 上部のローディング（古いメッセージ読み込み中） */}
          {isLoadingMore && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
              }}
            >
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" label="メッセージを読み込み中..." />
              </div>
            </div>
          )}

          {/* 仮想化されたメッセージアイテム */}
          {virtualItems.map((virtualItem) => {
            const message = groupedMessages[virtualItem.index];
            if (!message) return null;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {renderMessage(message, virtualItem.index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 新着メッセージバッジ */}
      {showNewMessageBadge && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={handleNewMessageBadgeClick}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full",
              "bg-discord-accent-primary hover:bg-discord-accent-hover",
              "text-white text-sm font-medium",
              "shadow-lg transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-discord-accent-primary focus:ring-offset-2"
            )}
            aria-label="新着メッセージに移動"
          >
            <span>新着メッセージ</span>
            <ChevronDown size={16} className="animate-bounce" />
          </button>
        </div>
      )}

      {/* スクロール位置インジケーター（デバッグ用、本番では削除） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-30">
          <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            <div>Messages: {messages.length}</div>
            <div>Virtual: {virtualItems.length}</div>
            <div>Near Bottom: {isNearBottom ? 'Yes' : 'No'}</div>
            <div>Badge: {showNewMessageBadge ? 'Show' : 'Hide'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

VirtualScrollMessageList.displayName = 'VirtualScrollMessageList';

// =============================================================================
// Export
// =============================================================================

export type { VirtualScrollMessageListProps };