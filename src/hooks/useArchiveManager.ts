// アーカイブ管理のためのReact Hook
// 統合的なアーカイブ・削除・通知システム

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  enhancedArchiveManager,
  type ArchiveWarning,
  type ArchiveSettings,
  type ArchiveStatistics,
  type ArchiveRecord,
  type ChatDeletionRecord,
  processArchiveAndDeletion
} from '@/lib/utils/enhancedArchiveManager';
import {
  enhancedExportManager,
  type ExportOptions,
  type BulkExportResult,
  type ExportProgress
} from '@/lib/utils/enhancedExportUtils';

// =============================================================================
// 型定義
// =============================================================================

export interface UseArchiveManagerOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableNotifications?: boolean;
}

export interface ArchiveOperationResult {
  success: boolean;
  message: string;
  details?: any;
}

// =============================================================================
// メインフック
// =============================================================================

export const useArchiveManager = (options: UseArchiveManagerOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1分
    enableNotifications = true
  } = options;

  // =============================================================================
  // 状態管理
  // =============================================================================

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ArchiveWarning[]>([]);
  const [statistics, setStatistics] = useState<ArchiveStatistics | null>(null);
  const [settings, setSettings] = useState<ArchiveSettings | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // エクスポート関連
  const [activeExports, setActiveExports] = useState<Map<string, ExportProgress>>(new Map());
  const [exportHistory, setExportHistory] = useState<BulkExportResult[]>([]);

  // =============================================================================
  // データ取得
  // =============================================================================

  const fetchWarnings = useCallback(async () => {
    try {
      const activeWarnings = await enhancedArchiveManager.getAllActiveWarnings();
      setWarnings(activeWarnings);
      return activeWarnings;
    } catch (error) {
      console.error('警告取得エラー:', error);
      setError(error instanceof Error ? error.message : '警告の取得に失敗しました');
      return [];
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await enhancedArchiveManager.getWarningsStatistics();
      setStatistics(stats);
      return stats;
    } catch (error) {
      console.error('統計取得エラー:', error);
      setError(error instanceof Error ? error.message : '統計の取得に失敗しました');
      return null;
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const currentSettings = await enhancedArchiveManager.getArchiveSettings();
      setSettings(currentSettings);
      return currentSettings;
    } catch (error) {
      console.error('設定取得エラー:', error);
      setError(error instanceof Error ? error.message : '設定の取得に失敗しました');
      return null;
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchWarnings(),
        fetchStatistics(),
        fetchSettings()
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('データ更新エラー:', error);
      setError('データの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [fetchWarnings, fetchStatistics, fetchSettings]);

  // =============================================================================
  // 警告操作
  // =============================================================================

  const handleWarningResponse = useCallback(async (
    warningId: string,
    response: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ): Promise<ArchiveOperationResult> => {
    try {
      setIsLoading(true);
      const success = await enhancedArchiveManager.handleUserResponse(
        warningId,
        response,
        additionalDays
      );

      if (success) {
        await refreshData(); // データを再取得
        return {
          success: true,
          message: `警告への応答を正常に処理しました: ${response}`
        };
      } else {
        return {
          success: false,
          message: '警告への応答処理に失敗しました'
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      setError(message);
      return {
        success: false,
        message: `エラー: ${message}`
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  const handleBulkWarningResponse = useCallback(async (
    warningIds: string[],
    response: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ): Promise<ArchiveOperationResult> => {
    try {
      setIsLoading(true);
      const result = await enhancedArchiveManager.handleBulkResponse(
        warningIds,
        response,
        additionalDays
      );

      await refreshData(); // データを再取得

      return {
        success: result.success > 0,
        message: `処理完了: 成功 ${result.success}件, 失敗 ${result.failed}件`,
        details: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      setError(message);
      return {
        success: false,
        message: `エラー: ${message}`
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  const markWarningAsRead = useCallback(async (warningId: string): Promise<boolean> => {
    try {
      const success = await enhancedArchiveManager.markWarningAsRead(warningId);
      if (success) {
        await fetchWarnings(); // 警告リストを更新
      }
      return success;
    } catch (error) {
      console.error('既読処理エラー:', error);
      return false;
    }
  }, [fetchWarnings]);

  // =============================================================================
  // 設定操作
  // =============================================================================

  const updateSettings = useCallback(async (
    newSettings: Partial<ArchiveSettings>
  ): Promise<ArchiveOperationResult> => {
    try {
      setIsLoading(true);
      const settingsId = await enhancedArchiveManager.updateArchiveSettings(newSettings);
      await fetchSettings(); // 設定を再取得

      return {
        success: true,
        message: '設定を正常に更新しました',
        details: { settingsId }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      setError(message);
      return {
        success: false,
        message: `設定更新エラー: ${message}`
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSettings]);

  // =============================================================================
  // エクスポート操作
  // =============================================================================

  const exportCollection = useCallback(async (
    collectionName: string,
    options: ExportOptions
  ): Promise<BulkExportResult> => {
    try {
      setIsLoading(true);
      const result = await enhancedExportManager.exportSingleCollection(collectionName, options);

      if (result.progressId) {
        // プログレス追跡を開始
        const progress = enhancedExportManager.getProgress(result.progressId);
        if (progress) {
          setActiveExports(prev => new Map(prev.set(result.progressId!, progress)));
        }
      }

      // エクスポート履歴に追加
      setExportHistory(prev => [result, ...prev.slice(0, 9)]); // 最新10件まで保持

      return result;
    } catch (error) {
      console.error('エクスポートエラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportMultipleCollections = useCallback(async (
    collectionNames: string[],
    options: ExportOptions
  ): Promise<BulkExportResult> => {
    try {
      setIsLoading(true);
      const result = await enhancedExportManager.exportMultipleCollections(collectionNames, options);

      if (result.progressId) {
        const progress = enhancedExportManager.getProgress(result.progressId);
        if (progress) {
          setActiveExports(prev => new Map(prev.set(result.progressId!, progress)));
        }
      }

      setExportHistory(prev => [result, ...prev.slice(0, 9)]);
      return result;
    } catch (error) {
      console.error('一括エクスポートエラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getExportProgress = useCallback((progressId: string): ExportProgress | null => {
    return enhancedExportManager.getProgress(progressId);
  }, []);

  // =============================================================================
  // メインアーカイブ処理
  // =============================================================================

  const executeArchiveProcess = useCallback(async (): Promise<ArchiveOperationResult> => {
    try {
      setIsLoading(true);
      const result = await processArchiveAndDeletion();

      await refreshData(); // データを再取得

      const message = `アーカイブ処理完了: アーカイブ ${result.archived.success}件, 削除 ${result.deleted.success}件`;

      return {
        success: result.archived.failed === 0 && result.deleted.failed === 0,
        message,
        details: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      setError(message);
      return {
        success: false,
        message: `アーカイブ処理エラー: ${message}`
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  // =============================================================================
  // 通知関連
  // =============================================================================

  const sendTestNotification = useCallback(async (): Promise<ArchiveOperationResult> => {
    try {
      if (warnings.length === 0) {
        return {
          success: false,
          message: '送信する警告がありません'
        };
      }

      const result = await enhancedArchiveManager.sendNotifications(warnings);

      return {
        success: result.email.sent > 0 || result.browser.sent > 0 || result.dashboard.sent > 0,
        message: `通知送信完了: Email ${result.email.sent}件, Browser ${result.browser.sent}件, Dashboard ${result.dashboard.sent}件`,
        details: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      return {
        success: false,
        message: `通知送信エラー: ${message}`
      };
    }
  }, [warnings]);

  // =============================================================================
  // 効果とクリーンアップ
  // =============================================================================

  // 初回データ取得
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // ブラウザ通知の権限管理
  useEffect(() => {
    if (enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enableNotifications]);

  // =============================================================================
  // ユーティリティ関数
  // =============================================================================

  const getWarningsByLevel = useCallback((level: 'critical' | 'warning' | 'info') => {
    return warnings.filter(w => w.warningLevel === level);
  }, [warnings]);

  const getWarningsByCollection = useCallback((collectionName: string) => {
    return warnings.filter(w => w.collectionName === collectionName);
  }, [warnings]);

  const getUnreadWarnings = useCallback(() => {
    return warnings.filter(w => !w.isRead);
  }, [warnings]);

  // =============================================================================
  // 戻り値
  // =============================================================================

  return {
    // 状態
    isLoading,
    error,
    warnings,
    statistics,
    settings,
    lastRefresh,
    activeExports,
    exportHistory,

    // データ操作
    refreshData,
    setError: (error: string | null) => setError(error),

    // 警告操作
    handleWarningResponse,
    handleBulkWarningResponse,
    markWarningAsRead,

    // 設定操作
    updateSettings,

    // エクスポート操作
    exportCollection,
    exportMultipleCollections,
    getExportProgress,

    // アーカイブ処理
    executeArchiveProcess,

    // 通知
    sendTestNotification,

    // ユーティリティ
    getWarningsByLevel,
    getWarningsByCollection,
    getUnreadWarnings
  };
};

// =============================================================================
// 追加のヘルパーフック
// =============================================================================

export const useArchiveWarnings = () => {
  const { warnings, isLoading, error, refreshData } = useArchiveManager({
    autoRefresh: true,
    refreshInterval: 30000 // 30秒間隔
  });

  return {
    warnings,
    isLoading,
    error,
    refreshData,
    criticalWarnings: warnings.filter(w => w.warningLevel === 'critical'),
    warningWarnings: warnings.filter(w => w.warningLevel === 'warning'),
    infoWarnings: warnings.filter(w => w.warningLevel === 'info'),
    unreadCount: warnings.filter(w => !w.isRead).length
  };
};

export const useArchiveStatistics = () => {
  const { statistics, isLoading, error, refreshData } = useArchiveManager({
    autoRefresh: true,
    refreshInterval: 60000 // 1分間隔
  });

  return {
    statistics,
    isLoading,
    error,
    refreshData
  };
};

export const useExportManager = () => {
  const {
    activeExports,
    exportHistory,
    exportCollection,
    exportMultipleCollections,
    getExportProgress,
    isLoading,
    error
  } = useArchiveManager({ autoRefresh: false });

  return {
    activeExports,
    exportHistory,
    exportCollection,
    exportMultipleCollections,
    getExportProgress,
    isLoading,
    error,

    // 利用可能なコレクション
    availableCollections: enhancedExportManager.getAvailableCollections()
  };
};