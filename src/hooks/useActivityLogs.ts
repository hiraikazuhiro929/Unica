import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivityLog,
  ActivityLogFilters,
  getActivityLogs,
  subscribeToActivityLogs,
  getActivityStats,
  LOGS_PER_PAGE
} from '@/lib/firebase/activityLogs';
import { DocumentSnapshot, Unsubscribe } from 'firebase/firestore';

// フィルターの状態管理型
export interface ActivityLogsState {
  logs: ActivityLog[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  stats: {
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

// Hook の設定オプション
export interface UseActivityLogsOptions {
  enableRealtime?: boolean; // リアルタイム更新を有効にするか
  pageSize?: number; // 1ページあたりの件数
  initialFilters?: Partial<ActivityLogFilters>; // 初期フィルター
}

/**
 * 活動ログ表示用カスタムフック
 *
 * 使用例:
 * ```tsx
 * const {
 *   logs,
 *   loading,
 *   error,
 *   filters,
 *   setFilters,
 *   loadMore,
 *   refresh,
 *   stats
 * } = useActivityLogs({
 *   enableRealtime: true,
 *   pageSize: 20
 * });
 * ```
 */
export const useActivityLogs = (options: UseActivityLogsOptions = {}) => {
  const { user } = useAuth();
  const {
    enableRealtime = true,
    pageSize = LOGS_PER_PAGE,
    initialFilters = {}
  } = options;

  // 状態管理
  const [state, setState] = useState<ActivityLogsState>({
    logs: [],
    loading: true,
    error: null,
    hasMore: true,
    total: 0,
    stats: { byType: {}, bySeverity: {} }
  });

  const [filters, setFilters] = useState<ActivityLogFilters>(initialFilters);

  // ページネーション用の最後のドキュメント
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  // リアルタイム購読の管理
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // フィルターの変更フラグ
  const [filtersChanged, setFiltersChanged] = useState(false);

  /**
   * 活動ログを読み込み
   */
  const loadLogs = useCallback(async (
    isLoadMore = false,
    currentFilters = filters
  ) => {
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      const targetLastDoc = isLoadMore ? lastDoc : null;
      const result = await getActivityLogs(currentFilters, pageSize, targetLastDoc || undefined);

      if (result.error) {
        setState(prev => ({
          ...prev,
          error: result.error,
          loading: false
        }));
        return;
      }

      const newLogs = result.data;
      const newLastDoc = result.lastVisible;

      setState(prev => ({
        ...prev,
        logs: isLoadMore ? [...prev.logs, ...newLogs] : newLogs,
        hasMore: newLogs.length === pageSize,
        loading: false,
        error: null
      }));

      setLastDoc(newLastDoc);

      // 統計も更新（初回読み込み時のみ）
      if (!isLoadMore) {
        updateStats(currentFilters);
      }

    } catch (error: any) {
      console.error('❌ Error loading activity logs:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  }, [filters, lastDoc, pageSize]);

  /**
   * リアルタイム監視を設定
   */
  const setupRealtimeSubscription = useCallback((currentFilters = filters) => {
    if (!enableRealtime) return;

    // 既存の購読をクリア
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const unsubscribe = subscribeToActivityLogs(
        currentFilters,
        pageSize,
        (logs, error) => {
          if (error) {
            setState(prev => ({ ...prev, error }));
            return;
          }

          setState(prev => ({
            ...prev,
            logs,
            loading: false,
            error: null,
            hasMore: logs.length === pageSize
          }));

          // 統計も更新
          updateStats(currentFilters);
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error: any) {
      console.error('❌ Error setting up realtime subscription:', error);
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, [enableRealtime, filters, pageSize]);

  /**
   * 統計情報を更新
   */
  const updateStats = useCallback(async (currentFilters = filters) => {
    try {
      const userId = currentFilters.userId;
      const statsResult = await getActivityStats(userId);

      if (!statsResult.error) {
        setState(prev => ({
          ...prev,
          total: statsResult.total,
          stats: {
            byType: statsResult.byType,
            bySeverity: statsResult.bySeverity
          }
        }));
      }
    } catch (error: any) {
      console.error('❌ Error updating stats:', error);
    }
  }, [filters]);

  /**
   * フィルターを更新
   */
  const updateFilters = useCallback((newFilters: Partial<ActivityLogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setFiltersChanged(true);
    setLastDoc(null); // ページネーションをリセット
  }, []);

  /**
   * さらに読み込み
   */
  const loadMore = useCallback(() => {
    if (state.loading || !state.hasMore) return;
    loadLogs(true);
  }, [state.loading, state.hasMore, loadLogs]);

  /**
   * 更新
   */
  const refresh = useCallback(() => {
    setLastDoc(null);
    if (enableRealtime) {
      setupRealtimeSubscription();
    } else {
      loadLogs(false);
    }
  }, [enableRealtime, setupRealtimeSubscription, loadLogs]);

  /**
   * 検索クエリを設定
   */
  const setSearchQuery = useCallback((query: string) => {
    updateFilters({ searchQuery: query });
  }, [updateFilters]);

  /**
   * エンティティタイプフィルターを設定
   */
  const setEntityTypeFilter = useCallback((entityType: string) => {
    updateFilters({ entityType });
  }, [updateFilters]);

  /**
   * 重要度フィルターを設定
   */
  const setSeverityFilter = useCallback((severity: string) => {
    updateFilters({ severity });
  }, [updateFilters]);

  /**
   * 日付範囲フィルターを設定
   */
  const setDateRangeFilter = useCallback((dateRange: 'today' | 'week' | 'month' | 'all') => {
    let dateFilter: { start: Date; end: Date } | undefined;

    if (dateRange !== 'all') {
      const now = new Date();
      const start = new Date();

      switch (dateRange) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setDate(now.getDate() - 30);
          break;
      }

      dateFilter = { start, end: now };
    }

    updateFilters({ dateRange: dateFilter });
  }, [updateFilters]);

  /**
   * ユーザーフィルターを設定
   */
  const setUserFilter = useCallback((userId?: string) => {
    updateFilters({ userId });
  }, [updateFilters]);

  // 初期化 & フィルター変更時の処理
  useEffect(() => {
    if (!user?.uid) return;

    if (filtersChanged || state.logs.length === 0) {
      if (enableRealtime) {
        setupRealtimeSubscription(filters);
      } else {
        loadLogs(false, filters);
      }
      setFiltersChanged(false);
    }
  }, [
    user?.uid,
    filters,
    filtersChanged,
    enableRealtime,
    setupRealtimeSubscription,
    loadLogs,
    state.logs.length
  ]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // パフォーマンス最適化：フィルタリング結果をメモ化
  const filteredLogs = state.logs;

  return {
    // 状態
    logs: filteredLogs,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    total: state.total,
    stats: state.stats,

    // フィルター
    filters,
    setFilters: updateFilters,
    setSearchQuery,
    setEntityTypeFilter,
    setSeverityFilter,
    setDateRangeFilter,
    setUserFilter,

    // 操作
    loadMore,
    refresh,

    // メタデータ
    pageSize,
    enableRealtime,
  };
};

/**
 * 活動ログの統計情報のみを取得するHook
 */
export const useActivityStats = (userId?: string) => {
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    loading: true,
    error: null as string | null
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        const result = await getActivityStats(userId);

        if (result.error) {
          setStats(prev => ({
            ...prev,
            error: result.error,
            loading: false
          }));
          return;
        }

        setStats({
          total: result.total,
          byType: result.byType,
          bySeverity: result.bySeverity,
          loading: false,
          error: null
        });

      } catch (error: any) {
        setStats(prev => ({
          ...prev,
          error: error.message,
          loading: false
        }));
      }
    };

    loadStats();
  }, [userId]);

  return stats;
};