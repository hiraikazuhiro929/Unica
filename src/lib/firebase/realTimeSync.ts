import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { 
  DailyReportEntry, 
  EnhancedWorkHours, 
  SyncResult 
} from '@/app/tasks/types';

import { 
  syncWorkHoursFromDailyReport,
  getWorkHoursList,
  updateWorkHours 
} from './workHours';
import { 
  getDailyReportsList,
  subscribeToDailyReportsList 
} from './dailyReports';

// =============================================================================
// REAL-TIME SYNC MANAGER
// =============================================================================

export class RealTimeSyncManager {
  private unsubscribeFunctions: (() => void)[] = [];
  private syncQueue: Map<string, { reportId: string; data: DailyReportEntry }> = new Map();
  private isProcessing = false;
  private syncHistory: SyncResult[] = [];
  private syncConfig = {
    autoSync: true,
    batchSize: 10,
    syncInterval: 5000, // 5 seconds
    maxRetries: 3
  };

  constructor() {
    this.startRealTimeSync();
  }

  /**
   * リアルタイム同期を開始
   */
  private startRealTimeSync() {
    if (!this.syncConfig.autoSync) return;

    // 日報の変更を監視
    const dailyReportsUnsubscribe = subscribeToDailyReportsList(
      { 
        submitted: true, // 提出済みのみ
        limit: 100,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      },
      (reports) => {
        this.processDailyReportsUpdate(reports);
      }
    );

    this.unsubscribeFunctions.push(dailyReportsUnsubscribe);

    // バッチ処理を定期実行
    const intervalId = setInterval(() => {
      this.processSyncQueue();
    }, this.syncConfig.syncInterval);

    // クリーンアップ用
    this.unsubscribeFunctions.push(() => clearInterval(intervalId));
  }

  /**
   * 日報更新の処理
   */
  private processDailyReportsUpdate(reports: DailyReportEntry[]) {
    reports.forEach(report => {
      // 既にキューに入っているかチェック
      if (!this.syncQueue.has(report.id)) {
        this.syncQueue.set(report.id, { reportId: report.id, data: report });
      }
    });

    // すぐに処理する場合（優先度が高い場合）
    if (this.syncQueue.size >= this.syncConfig.batchSize) {
      this.processSyncQueue();
    }
  }

  /**
   * 同期キューの処理
   */
  private async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.size === 0) return;

    this.isProcessing = true;
    const startTime = Date.now();
    const batchEntries = Array.from(this.syncQueue.entries()).slice(0, this.syncConfig.batchSize);
    
    const syncResult: SyncResult = {
      success: false,
      syncedEntries: 0,
      updatedWorkHours: [],
      errors: [],
      warnings: [],
      metadata: {
        syncedAt: new Date().toISOString(),
        syncSource: 'real-time-sync',
        totalProcessingTime: 0
      }
    };

    try {
      for (const [reportId, { data: report }] of batchEntries) {
        try {
          const result = await syncWorkHoursFromDailyReport(report);
          
          if (result.success) {
            syncResult.syncedEntries += result.syncedEntries;
            syncResult.updatedWorkHours.push(...result.updatedWorkHours);
            syncResult.warnings.push(...result.warnings);
            
            // 成功したエントリをキューから削除
            this.syncQueue.delete(reportId);
          } else {
            syncResult.errors.push(...result.errors);
          }
        } catch (error: any) {
          syncResult.errors.push({
            type: 'sync_error',
            message: `Report ${reportId} sync failed: ${error.message}`,
            data: { reportId, error: error.message }
          });
        }
      }

      syncResult.success = syncResult.errors.length === 0;
      syncResult.metadata.totalProcessingTime = Date.now() - startTime;
      
      // 履歴に追加
      this.syncHistory.unshift(syncResult);
      if (this.syncHistory.length > 50) {
        this.syncHistory = this.syncHistory.slice(0, 50);
      }

      console.log('Real-time sync completed:', syncResult);
      
    } catch (error: any) {
      console.error('Real-time sync batch failed:', error);
      syncResult.errors.push({
        type: 'batch_error',
        message: 'Batch processing failed',
        data: { error: error.message }
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 手動同期トリガー
   */
  public async triggerManualSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const syncResult: SyncResult = {
      success: false,
      syncedEntries: 0,
      updatedWorkHours: [],
      errors: [],
      warnings: [],
      metadata: {
        syncedAt: new Date().toISOString(),
        syncSource: 'manual-trigger',
        totalProcessingTime: 0
      }
    };

    try {
      // 最近の提出済み日報を取得
      const { data: reports, error } = await getDailyReportsList({
        submitted: true,
        limit: 20,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      });

      if (error) {
        syncResult.errors.push({
          type: 'fetch_error',
          message: error
        });
        return syncResult;
      }

      // 各日報を同期
      for (const report of reports) {
        try {
          const result = await syncWorkHoursFromDailyReport(report);
          
          syncResult.syncedEntries += result.syncedEntries;
          syncResult.updatedWorkHours.push(...result.updatedWorkHours);
          syncResult.warnings.push(...result.warnings);
          syncResult.errors.push(...result.errors);
          
        } catch (error: any) {
          syncResult.errors.push({
            type: 'report_sync_error',
            message: `Failed to sync report ${report.id}`,
            data: { reportId: report.id, error: error.message }
          });
        }
      }

      syncResult.success = syncResult.errors.length === 0;
      syncResult.metadata.totalProcessingTime = Date.now() - startTime;

      // 履歴に追加
      this.syncHistory.unshift(syncResult);
      if (this.syncHistory.length > 50) {
        this.syncHistory = this.syncHistory.slice(0, 50);
      }

      return syncResult;

    } catch (error: any) {
      syncResult.errors.push({
        type: 'manual_sync_error',
        message: error.message
      });
      syncResult.metadata.totalProcessingTime = Date.now() - startTime;
      return syncResult;
    }
  }

  /**
   * 双方向同期：工数変更を日報にも反映
   */
  public async syncWorkHoursToReports(workHoursId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const syncResult: SyncResult = {
      success: false,
      syncedEntries: 0,
      updatedWorkHours: [],
      errors: [],
      warnings: [],
      metadata: {
        syncedAt: new Date().toISOString(),
        syncSource: 'work-hours-to-reports',
        totalProcessingTime: 0
      }
    };

    try {
      // TODO: 工数データから関連する日報を検索し、逆同期を実装
      // この機能は将来の拡張として実装予定
      
      syncResult.warnings.push({
        type: 'feature_not_implemented',
        message: 'Work hours to daily reports sync is not yet implemented'
      });

      syncResult.success = true;
      syncResult.metadata.totalProcessingTime = Date.now() - startTime;
      
      return syncResult;

    } catch (error: any) {
      syncResult.errors.push({
        type: 'reverse_sync_error',
        message: error.message
      });
      syncResult.metadata.totalProcessingTime = Date.now() - startTime;
      return syncResult;
    }
  }

  /**
   * 同期統計を取得
   */
  public getSyncStatistics() {
    const totalSyncs = this.syncHistory.length;
    const successfulSyncs = this.syncHistory.filter(s => s.success).length;
    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;
    const totalSyncedEntries = this.syncHistory.reduce((sum, s) => sum + s.syncedEntries, 0);
    const totalErrors = this.syncHistory.reduce((sum, s) => sum + s.errors.length, 0);

    return {
      totalSyncs,
      successRate,
      totalSyncedEntries,
      totalErrors,
      queueSize: this.syncQueue.size,
      isProcessing: this.isProcessing,
      lastSyncAt: this.syncHistory[0]?.metadata.syncedAt,
      averageProcessingTime: totalSyncs > 0 
        ? this.syncHistory.reduce((sum, s) => sum + s.metadata.totalProcessingTime, 0) / totalSyncs
        : 0
    };
  }

  /**
   * 同期履歴を取得
   */
  public getSyncHistory(limit: number = 10): SyncResult[] {
    return this.syncHistory.slice(0, limit);
  }

  /**
   * 同期履歴をクリア
   */
  public clearSyncHistory() {
    this.syncHistory = [];
  }

  /**
   * 同期設定を更新
   */
  public updateSyncConfig(config: Partial<typeof this.syncConfig>) {
    this.syncConfig = { ...this.syncConfig, ...config };
    
    if (config.autoSync !== undefined) {
      if (config.autoSync && this.unsubscribeFunctions.length === 0) {
        this.startRealTimeSync();
      } else if (!config.autoSync) {
        this.stop();
      }
    }
  }

  /**
   * リアルタイム同期を停止
   */
  public stop() {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    this.syncQueue.clear();
    this.isProcessing = false;
  }

  /**
   * 状態をリセット
   */
  public reset() {
    this.stop();
    this.syncHistory = [];
    this.syncQueue.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let syncManagerInstance: RealTimeSyncManager | null = null;

/**
 * RealTimeSyncManagerのシングルトンインスタンスを取得
 */
export const getRealTimeSyncManager = (): RealTimeSyncManager => {
  if (!syncManagerInstance) {
    syncManagerInstance = new RealTimeSyncManager();
  }
  return syncManagerInstance;
};

/**
 * リアルタイム同期を初期化
 */
export const initializeRealTimeSync = (config?: Partial<RealTimeSyncManager['syncConfig']>) => {
  const manager = getRealTimeSyncManager();
  if (config) {
    manager.updateSyncConfig(config);
  }
  return manager;
};

/**
 * リアルタイム同期を停止
 */
export const stopRealTimeSync = () => {
  if (syncManagerInstance) {
    syncManagerInstance.stop();
    syncManagerInstance = null;
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 日報と工数の整合性をチェック
 */
export const validateReportWorkHoursConsistency = async (): Promise<{
  consistent: boolean;
  inconsistencies: Array<{
    reportId: string;
    workHoursId: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}> => {
  const inconsistencies: Array<{
    reportId: string;
    workHoursId: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }> = [];

  try {
    // 最近の日報を取得
    const { data: reports } = await getDailyReportsList({
      submitted: true,
      limit: 50,
      orderByField: 'updatedAt',
      orderDirection: 'desc'
    });

    // 工数データを取得
    const { data: workHours } = await getWorkHoursList({
      limit: 100
    });

    // 整合性チェックのロジック
    for (const report of reports) {
      for (const workEntry of report.workTimeEntries) {
        // 製番に対応する工数レコードを検索
        const matchingWorkHours = workHours.find(wh => 
          wh.managementNumber.includes(workEntry.productionNumber) ||
          wh.processId === workEntry.productionNumber
        );

        if (!matchingWorkHours) {
          inconsistencies.push({
            reportId: report.id,
            workHoursId: 'N/A',
            issue: `製番 ${workEntry.productionNumber} に対応する工数レコードが見つかりません`,
            severity: 'medium'
          });
          continue;
        }

        // 時間の整合性チェック（簡易版）
        const reportTotalMinutes = report.workTimeEntries
          .filter(entry => entry.productionNumber === workEntry.productionNumber)
          .reduce((sum, entry) => sum + entry.durationMinutes, 0);

        const workHoursTotalMinutes = matchingWorkHours.actualHours.total * 60;
        const timeDifference = Math.abs(reportTotalMinutes - workHoursTotalMinutes);

        // 30分以上の差がある場合は不整合とみなす
        if (timeDifference > 30) {
          inconsistencies.push({
            reportId: report.id,
            workHoursId: matchingWorkHours.id,
            issue: `時間の不整合: 日報=${Math.round(reportTotalMinutes/60 * 10)/10}h, 工数=${matchingWorkHours.actualHours.total}h`,
            severity: timeDifference > 120 ? 'high' : 'medium'
          });
        }
      }
    }

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies
    };

  } catch (error) {
    console.error('Error validating consistency:', error);
    return {
      consistent: false,
      inconsistencies: [{
        reportId: 'ERROR',
        workHoursId: 'ERROR',
        issue: `整合性チェック中にエラーが発生: ${error}`,
        severity: 'high'
      }]
    };
  }
};

export {
  type SyncResult
};