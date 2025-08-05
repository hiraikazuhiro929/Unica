import { useState, useEffect, useCallback } from 'react';
import {
  getRealTimeSyncManager,
  initializeRealTimeSync,
  validateReportWorkHoursConsistency,
  type SyncResult
} from '@/lib/firebase/realTimeSync';
import {
  getDailyReportsList,
  subscribeToDailyReportsList,
  calculateDailyReportStatistics,
  type DailyReportEntry,
  type DailyReportStatistics
} from '@/lib/firebase/dailyReports';
import { 
  getWorkHoursList,
  subscribeToWorkHoursList,
  type EnhancedWorkHours 
} from '@/lib/firebase/workHours';

// =============================================================================
// DAILY REPORT INTEGRATION HOOK
// =============================================================================

export interface DailyReportIntegrationState {
  // Data
  reports: DailyReportEntry[];
  workHours: EnhancedWorkHours[];
  statistics: DailyReportStatistics | null;
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  
  // Error states
  error: string | null;
  syncErrors: string[];
  
  // Sync state
  syncHistory: SyncResult[];
  syncStatistics: ReturnType<typeof getRealTimeSyncManager>['getSyncStatistics'] | null;
  lastSyncAt: string | null;
  
  // Consistency
  consistencyCheck: {
    consistent: boolean;
    inconsistencies: Array<{
      reportId: string;
      workHoursId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  } | null;
}

export interface DailyReportIntegrationActions {
  // Data operations
  refreshData: () => Promise<void>;
  loadReports: (filters?: Parameters<typeof getDailyReportsList>[0]) => Promise<void>;
  
  // Sync operations
  triggerManualSync: () => Promise<SyncResult>;
  validateConsistency: () => Promise<void>;
  clearSyncHistory: () => void;
  
  // Configuration
  updateSyncConfig: (config: any) => void;
  
  // Error handling
  clearError: () => void;
  clearSyncErrors: () => void;
}

export const useDailyReportIntegration = (): DailyReportIntegrationState & DailyReportIntegrationActions => {
  // State
  const [state, setState] = useState<DailyReportIntegrationState>({
    reports: [],
    workHours: [],
    statistics: null,
    isLoading: true,
    isSyncing: false,
    error: null,
    syncErrors: [],
    syncHistory: [],
    syncStatistics: null,
    lastSyncAt: null,
    consistencyCheck: null,
  });

  // Sync manager instance
  const [syncManager] = useState(() => {
    return initializeRealTimeSync({
      autoSync: true,
      batchSize: 5,
      syncInterval: 10000, // 10 seconds
      maxRetries: 3
    });
  });

  // Initialize data loading
  useEffect(() => {
    loadInitialData();
    
    // Set up real-time subscriptions
    const unsubscribeFunctions = setupRealTimeSubscriptions();
    
    // Cleanup
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Update sync statistics periodically
  useEffect(() => {
    const updateSyncStats = () => {
      const stats = syncManager.getSyncStatistics();
      const history = syncManager.getSyncHistory(10);
      
      setState(prev => ({
        ...prev,
        syncStatistics: stats,
        syncHistory: history,
        lastSyncAt: stats.lastSyncAt || null
      }));
    };

    updateSyncStats();
    const interval = setInterval(updateSyncStats, 5000);
    
    return () => clearInterval(interval);
  }, [syncManager]);

  const loadInitialData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Load daily reports
      const { data: reports, error: reportsError } = await getDailyReportsList({
        limit: 50,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      });

      if (reportsError) {
        throw new Error(`Failed to load reports: ${reportsError}`);
      }

      // Load work hours
      const { data: workHours, error: workHoursError } = await getWorkHoursList({
        limit: 100
      });

      if (workHoursError) {
        throw new Error(`Failed to load work hours: ${workHoursError}`);
      }

      // Calculate statistics
      const { data: statistics, error: statsError } = await calculateDailyReportStatistics();
      
      if (statsError) {
        console.warn('Failed to calculate statistics:', statsError);
      }

      setState(prev => ({
        ...prev,
        reports,
        workHours,
        statistics,
        isLoading: false
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  };

  const setupRealTimeSubscriptions = () => {
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to daily reports
    const reportsUnsubscribe = subscribeToDailyReportsList(
      {
        limit: 50,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      },
      (reports) => {
        setState(prev => ({ ...prev, reports }));
      }
    );
    unsubscribeFunctions.push(reportsUnsubscribe);

    // Subscribe to work hours
    const workHoursUnsubscribe = subscribeToWorkHoursList(
      { limit: 100 },
      (workHours) => {
        setState(prev => ({ ...prev, workHours }));
      }
    );
    unsubscribeFunctions.push(workHoursUnsubscribe);

    return unsubscribeFunctions;
  };

  // Actions
  const refreshData = useCallback(async () => {
    await loadInitialData();
  }, []);

  const loadReports = useCallback(async (filters?: Parameters<typeof getDailyReportsList>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { data: reports, error } = await getDailyReportsList(filters);
      
      if (error) {
        throw new Error(error);
      }

      setState(prev => ({
        ...prev,
        reports,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);

  const triggerManualSync = useCallback(async (): Promise<SyncResult> => {
    setState(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));
    
    try {
      const result = await syncManager.triggerManualSync();
      
      const newSyncErrors = result.errors.map(e => e.message);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: newSyncErrors,
        syncHistory: syncManager.getSyncHistory(10),
        syncStatistics: syncManager.getSyncStatistics()
      }));

      return result;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [error.message]
      }));
      
      throw error;
    }
  }, [syncManager]);

  const validateConsistency = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const consistencyCheck = await validateReportWorkHoursConsistency();
      
      setState(prev => ({
        ...prev,
        consistencyCheck,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: `Consistency check failed: ${error.message}`,
        isLoading: false
      }));
    }
  }, []);

  const clearSyncHistory = useCallback(() => {
    syncManager.clearSyncHistory();
    setState(prev => ({
      ...prev,
      syncHistory: [],
      syncStatistics: syncManager.getSyncStatistics()
    }));
  }, [syncManager]);

  const updateSyncConfig = useCallback((config: any) => {
    syncManager.updateSyncConfig(config);
    setState(prev => ({
      ...prev,
      syncStatistics: syncManager.getSyncStatistics()
    }));
  }, [syncManager]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearSyncErrors = useCallback(() => {
    setState(prev => ({ ...prev, syncErrors: [] }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    refreshData,
    loadReports,
    triggerManualSync,
    validateConsistency,
    clearSyncHistory,
    updateSyncConfig,
    clearError,
    clearSyncErrors,
  };
};

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * 簡易版のリアルタイム同期ステータス用フック
 */
export const useSyncStatus = () => {
  const [syncManager] = useState(() => getRealTimeSyncManager());
  const [stats, setStats] = useState(() => syncManager.getSyncStatistics());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(syncManager.getSyncStatistics());
    }, 2000);

    return () => clearInterval(interval);
  }, [syncManager]);

  return {
    ...stats,
    triggerSync: () => syncManager.triggerManualSync(),
    clearHistory: () => {
      syncManager.clearSyncHistory();
      setStats(syncManager.getSyncStatistics());
    }
  };
};

/**
 * 工数と日報の整合性チェック用フック
 */
export const useConsistencyCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof validateReportWorkHoursConsistency>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const checkResult = await validateReportWorkHoursConsistency();
      setResult(checkResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isChecking,
    result,
    error,
    runCheck,
    clearResult: () => setResult(null),
    clearError: () => setError(null)
  };
};