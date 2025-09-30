import React, {
  useTransition,
  useDeferredValue,
  useMemo,
  useCallback,
  Suspense,
  startTransition,
  useRef,
  useEffect
} from 'react';

// =============================================================================
// React 18 Optimization Hooks
// =============================================================================

/**
 * メッセージ送信の最適化フック
 * useTransitionを使用して、メッセージ送信処理を非ブロッキングにする
 */
export const useOptimizedMessageSending = () => {
  const [isPending, startTransition] = useTransition();

  const sendMessageOptimized = useCallback((
    sendFunction: () => Promise<void>,
    optimisticUpdate?: () => void
  ) => {
    // 楽観的UI更新（即座に実行）
    if (optimisticUpdate) {
      optimisticUpdate();
    }

    // メッセージ送信処理（非ブロッキング）
    startTransition(() => {
      sendFunction().catch(error => {
        console.error('Message send failed:', error);
        // エラー時のロールバック処理はここで実行
      });
    });
  }, []);

  return {
    isPending,
    sendMessageOptimized,
  };
};

/**
 * 検索・フィルタリングの最適化フック
 * useDeferredValueを使用して、頻繁な検索入力を最適化
 */
export const useOptimizedSearch = <T,>(
  items: T[],
  searchTerm: string,
  searchFunction: (items: T[], term: string) => T[],
  delay: number = 300
) => {
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isStale, setIsStale] = React.useState(false);

  // 検索結果の計算（遅延された検索語句を使用）
  const filteredItems = useMemo(() => {
    return searchFunction(items, deferredSearchTerm);
  }, [items, deferredSearchTerm, searchFunction]);

  // 入力と実際の検索のタイムラグを検出
  useEffect(() => {
    setIsStale(searchTerm !== deferredSearchTerm);
  }, [searchTerm, deferredSearchTerm]);

  return {
    filteredItems,
    isStale, // 検索結果が最新の入力に追いついていない状態
    deferredSearchTerm,
  };
};

/**
 * メッセージリストの最適化フック
 * 大量のメッセージを効率的に処理
 */
export const useOptimizedMessageList = <T,>(
  messages: T[],
  visibleCount: number = 50
) => {
  const deferredMessages = useDeferredValue(messages);
  const [isPending, startTransition] = useTransition();

  // 表示するメッセージを制限（パフォーマンス向上）
  const visibleMessages = useMemo(() => {
    // 最新のメッセージから指定数だけを表示
    return deferredMessages.slice(-visibleCount);
  }, [deferredMessages, visibleCount]);

  // メッセージの追加を非ブロッキングで処理
  const addMessageOptimized = useCallback((
    newMessage: T,
    addFunction: (message: T) => void
  ) => {
    startTransition(() => {
      addFunction(newMessage);
    });
  }, []);

  return {
    visibleMessages,
    isPending,
    addMessageOptimized,
    totalMessageCount: messages.length,
    visibleMessageCount: visibleMessages.length,
  };
};

/**
 * タイピングインジケーターの最適化フック
 * 頻繁な更新を最適化
 */
export const useOptimizedTypingIndicator = (
  typingUsers: string[],
  debounceMs: number = 500
) => {
  const deferredTypingUsers = useDeferredValue(typingUsers);
  const lastUpdateRef = useRef<number>(0);

  // タイピング状態の文字列生成（メモ化）
  const typingText = useMemo(() => {
    if (deferredTypingUsers.length === 0) return '';
    if (deferredTypingUsers.length === 1) return `${deferredTypingUsers[0]} が入力中...`;
    if (deferredTypingUsers.length === 2) {
      return `${deferredTypingUsers[0]} と ${deferredTypingUsers[1]} が入力中...`;
    }
    return `${deferredTypingUsers.length}人が入力中...`;
  }, [deferredTypingUsers]);

  // 更新頻度の制御
  const shouldShowTyping = useMemo(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > debounceMs) {
      lastUpdateRef.current = now;
      return true;
    }
    return false;
  }, [deferredTypingUsers, debounceMs]);

  return {
    typingText,
    shouldShowTyping: shouldShowTyping && deferredTypingUsers.length > 0,
    typingUserCount: deferredTypingUsers.length,
  };
};

// =============================================================================
// Optimized Components
// =============================================================================

/**
 * 最適化されたSuspenseラッパー
 */
interface OptimizedSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export const OptimizedSuspense: React.FC<OptimizedSuspenseProps> = ({
  children,
  fallback = <div className="animate-pulse bg-gray-200 h-8 rounded" />,
  errorFallback = <div className="text-red-500">エラーが発生しました</div>,
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

/**
 * 高頻度更新コンポーネントの最適化ラッパー
 */
interface HighFrequencyUpdateWrapperProps {
  children: React.ReactNode;
  updateKey: string | number;
  debounceMs?: number;
}

export const HighFrequencyUpdateWrapper: React.FC<HighFrequencyUpdateWrapperProps> = ({
  children,
  updateKey,
  debounceMs = 100,
}) => {
  const deferredUpdateKey = useDeferredValue(updateKey);
  const [isPending, startTransition] = useTransition();

  // 高頻度更新の制御
  const deferredChildren = useMemo(() => {
    return React.cloneElement(children as React.ReactElement, {
      key: deferredUpdateKey,
    });
  }, [children, deferredUpdateKey]);

  return (
    <div className={isPending ? 'opacity-80 transition-opacity' : ''}>
      {deferredChildren}
    </div>
  );
};

/**
 * パフォーマンス最適化された仮想スクロールラッパー
 */
interface OptimizedVirtualScrollProps {
  children: React.ReactNode;
  itemCount: number;
  isLoading?: boolean;
}

export const OptimizedVirtualScroll: React.FC<OptimizedVirtualScrollProps> = ({
  children,
  itemCount,
  isLoading = false,
}) => {
  const [isPending, startTransition] = useTransition();
  const deferredItemCount = useDeferredValue(itemCount);

  // スクロール処理の最適化
  const handleScroll = useCallback((event: React.UIEvent) => {
    startTransition(() => {
      // スクロールイベントの処理
      const element = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = element;

      // スクロール位置の計算などをここで実行
      console.log('Scroll position:', { scrollTop, scrollHeight, clientHeight });
    });
  }, []);

  return (
    <div
      onScroll={handleScroll}
      className={`relative ${isPending || isLoading ? 'opacity-90' : ''}`}
    >
      <Suspense fallback={<div className="animate-pulse h-full bg-gray-100" />}>
        {children}
      </Suspense>

      {/* アイテム数の表示（遅延値を使用） */}
      <div className="absolute top-2 left-2 text-xs text-gray-500 bg-black bg-opacity-50 px-2 py-1 rounded">
        Items: {deferredItemCount}
        {isPending && <span className="ml-1 animate-spin">⟳</span>}
      </div>
    </div>
  );
};

// =============================================================================
// Performance Optimization Utilities
// =============================================================================

/**
 * 重い計算処理を非ブロッキングで実行するユーティリティ
 */
export const executeNonBlocking = <T,>(
  heavyOperation: () => T,
  onComplete: (result: T) => void,
  onError?: (error: Error) => void
) => {
  startTransition(() => {
    try {
      const result = heavyOperation();
      onComplete(result);
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  });
};

/**
 * メモリ使用量を監視するフック
 */
export const useMemoryMonitoring = (intervalMs: number = 5000) => {
  const [memoryInfo, setMemoryInfo] = React.useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const memory = (window.performance as any).memory;
        if (memory) {
          setMemoryInfo({
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          });
        }
      }
    };

    // 初回実行
    updateMemoryInfo();

    // 定期実行
    const interval = setInterval(updateMemoryInfo, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryInfo;
};

/**
 * コンポーネントのレンダリング回数を監視するフック
 */
export const useRenderCount = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  renderCountRef.current += 1;
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
  lastRenderTimeRef.current = currentTime;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCountRef.current} times (${timeSinceLastRender}ms since last render)`);
    }
  });

  return {
    renderCount: renderCountRef.current,
    timeSinceLastRender,
  };
};

// =============================================================================
// Export
// =============================================================================

export type {
  OptimizedSuspenseProps,
  HighFrequencyUpdateWrapperProps,
  OptimizedVirtualScrollProps,
};