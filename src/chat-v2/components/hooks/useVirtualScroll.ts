import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MessageState } from '../../store/types';

// =============================================================================
// useVirtualScroll Hook - 仮想スクロールの管理
// =============================================================================

interface UseVirtualScrollOptions {
  /** メッセージリスト */
  messages: MessageState[];
  /** コンテナの高さ（固定の場合） */
  height?: number;
  /** メッセージの推定高さ */
  estimateSize?: (index: number) => number;
  /** オーバースキャン（表示範囲外でもレンダリングする項目数） */
  overscan?: number;
  /** スクロール方向を逆転するか（Discord風の下から上） */
  reversed?: boolean;
  /** 新着メッセージ時の自動スクロールを有効にするか */
  autoScroll?: boolean;
  /** 自動スクロールの閾値（下から何px以内で自動スクロール） */
  autoScrollThreshold?: number;
}

interface UseVirtualScrollReturn {
  /** 仮想化されたリスト情報 */
  virtualizer: ReturnType<typeof useVirtualizer>;
  /** 仮想アイテムのリスト */
  virtualItems: ReturnType<typeof useVirtualizer>['getVirtualItems'];
  /** スクロールコンテナのref */
  scrollElementRef: React.RefObject<HTMLDivElement>;
  /** 最下部にスクロール */
  scrollToBottom: () => void;
  /** 指定インデックスにスクロール */
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
  /** 最下部付近にいるかどうか */
  isNearBottom: boolean;
  /** ユーザーが手動でスクロール中かどうか */
  isUserScrolling: boolean;
  /** 新着メッセージがあることを示すバッジを表示するか */
  showNewMessageBadge: boolean;
  /** 新着メッセージバッジのクリックハンドラー */
  handleNewMessageBadgeClick: () => void;
}

/**
 * 仮想スクロールを管理するフック
 *
 * 特徴:
 * - @tanstack/react-virtualを活用
 * - Discord風の下から上への表示
 * - 自動スクロール制御
 * - パフォーマンス最適化
 */
export const useVirtualScroll = (options: UseVirtualScrollOptions): UseVirtualScrollReturn => {
  const {
    messages,
    height,
    estimateSize = () => 80, // デフォルト推定高さ
    overscan = 5,
    reversed = true,
    autoScroll = true,
    autoScrollThreshold = 100,
  } = options;

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(messages.length);

  // メッセージの推定高さを計算
  const dynamicEstimateSize = useCallback((index: number) => {
    const message = messages[index];
    if (!message) return estimateSize(index);

    // メッセージの長さに基づいて高さを推定
    const baseHeight = 60; // 基本高さ（アバター、ユーザー名、タイムスタンプ）
    const lineHeight = 20; // 1行あたりの高さ
    const maxWidth = 600; // 最大文字幅（概算）
    const charactersPerLine = 50; // 1行あたりの文字数（概算）

    const contentLength = message.content?.length || 0;
    const estimatedLines = Math.max(1, Math.ceil(contentLength / charactersPerLine));
    const contentHeight = estimatedLines * lineHeight;

    // 添付ファイルがある場合の追加高さ
    const attachmentHeight = message.attachments?.length ? 120 : 0;

    return baseHeight + contentHeight + attachmentHeight;
  }, [messages, estimateSize]);

  // 仮想化の設定
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: dynamicEstimateSize,
    overscan,
    // Discord風の逆順表示のため、アイテムの順序を逆転
    reversed,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // スクロール位置の監視
  const isNearBottom = useMemo(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return true;

    const { scrollTop, scrollHeight, clientHeight } = scrollElement;

    if (reversed) {
      // 逆順の場合、scrollTopが0に近いと最下部
      return Math.abs(scrollTop) <= autoScrollThreshold;
    } else {
      // 通常の場合
      return scrollHeight - scrollTop - clientHeight <= autoScrollThreshold;
    }
  }, [virtualizer.range, autoScrollThreshold, reversed]);

  // 新着メッセージ検知
  const hasNewMessages = messages.length > lastMessageCountRef.current;
  const showNewMessageBadge = hasNewMessages && !isNearBottom && !isUserScrollingRef.current;

  // 最下部にスクロール
  const scrollToBottom = useCallback(() => {
    if (messages.length === 0) return;

    const targetIndex = reversed ? 0 : messages.length - 1;
    virtualizer.scrollToIndex(targetIndex, {
      align: 'end',
      behavior: 'smooth'
    });
  }, [virtualizer, messages.length, reversed]);

  // 指定インデックスにスクロール
  const scrollToIndex = useCallback((
    index: number,
    align: 'start' | 'center' | 'end' | 'auto' = 'auto'
  ) => {
    virtualizer.scrollToIndex(index, { align, behavior: 'smooth' });
  }, [virtualizer]);

  // 新着メッセージバッジクリック
  const handleNewMessageBadgeClick = useCallback(() => {
    scrollToBottom();
    lastMessageCountRef.current = messages.length;
  }, [scrollToBottom, messages.length]);

  // ユーザースクロール検知
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      isUserScrollingRef.current = true;

      // スクロール終了の検知（100ms後にリセット）
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // 新着メッセージ時の自動スクロール
  useEffect(() => {
    if (!autoScroll) return;

    const hasNewMessages = messages.length > lastMessageCountRef.current;

    if (hasNewMessages && isNearBottom && !isUserScrollingRef.current) {
      // 少し遅延させてDOM更新を待つ
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }

      autoScrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom();
        lastMessageCountRef.current = messages.length;
      }, 50);
    } else if (hasNewMessages) {
      // 新着メッセージはあるが自動スクロールしない場合
      lastMessageCountRef.current = messages.length;
    }

    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [messages.length, isNearBottom, autoScroll, scrollToBottom]);

  // 初回ロード時に最下部にスクロール
  useEffect(() => {
    if (messages.length > 0 && lastMessageCountRef.current === 0) {
      // 初回のみ即座にスクロール（アニメーションなし）
      setTimeout(() => {
        const targetIndex = reversed ? 0 : messages.length - 1;
        virtualizer.scrollToIndex(targetIndex, {
          align: 'end',
          behavior: 'auto'
        });
        lastMessageCountRef.current = messages.length;
      }, 0);
    }
  }, [messages.length, virtualizer, reversed]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    virtualizer,
    virtualItems,
    scrollElementRef,
    scrollToBottom,
    scrollToIndex,
    isNearBottom,
    isUserScrolling: isUserScrollingRef.current,
    showNewMessageBadge,
    handleNewMessageBadgeClick,
  };
};

// =============================================================================
// 型定義の再エクスポート
// =============================================================================

export type { UseVirtualScrollOptions, UseVirtualScrollReturn };