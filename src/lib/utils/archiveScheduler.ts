// アーカイブスケジューラー
// 定期的なデータアーカイブの自動実行システム

import { dataArchiveManager, type ArchiveOperation } from './dataArchiveManager';
import { logSecurityEvent } from './securityUtils';

// =============================================================================
// 型定義
// =============================================================================

export interface ScheduleConfig {
  enabled: boolean;
  intervalHours: number; // 実行間隔（時間）
  runTime?: string; // 実行時刻（HH:MM形式、例: "03:00"）
  maxConcurrentOperations: number;
  retryAttempts: number;
  retryDelayMinutes: number;
}

export interface SchedulerState {
  isRunning: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  activeOperations: number;
  lastResults?: ArchiveOperation[];
  error?: string;
}

// =============================================================================
// アーカイブスケジューラークラス
// =============================================================================

class ArchiveSchedulerImpl {
  private static instance: ArchiveSchedulerImpl;
  private config: ScheduleConfig;
  private state: SchedulerState;
  private intervalId?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor() {
    this.config = {
      enabled: false, // デフォルトは無効
      intervalHours: 24, // 24時間間隔
      runTime: '03:00', // 午前3時実行
      maxConcurrentOperations: 3,
      retryAttempts: 3,
      retryDelayMinutes: 30
    };

    this.state = {
      isRunning: false,
      activeOperations: 0
    };
  }

  public static getInstance(): ArchiveSchedulerImpl {
    if (!ArchiveSchedulerImpl.instance) {
      ArchiveSchedulerImpl.instance = new ArchiveSchedulerImpl();
    }
    return ArchiveSchedulerImpl.instance;
  }

  // =============================================================================
  // 設定管理
  // =============================================================================

  public updateConfig(newConfig: Partial<ScheduleConfig>): void {
    this.config = { ...this.config, ...newConfig };

    logSecurityEvent('archive_scheduler_config_updated', {
      enabled: this.config.enabled,
      intervalHours: this.config.intervalHours,
      runTime: this.config.runTime
    });

    // 設定変更時はスケジューラーを再起動
    if (this.isInitialized) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }
  }

  public getConfig(): ScheduleConfig {
    return { ...this.config };
  }

  public getState(): SchedulerState {
    return { ...this.state };
  }

  // =============================================================================
  // スケジューラー制御
  // =============================================================================

  public start(): void {
    if (this.intervalId) {
      console.log('⚠️ アーカイブスケジューラーは既に実行中です');
      return;
    }

    if (!this.config.enabled) {
      console.log('ℹ️ アーカイブスケジューラーは無効化されています');
      return;
    }

    console.log('🕐 アーカイブスケジューラー開始');

    // 次回実行時刻を計算
    this.calculateNextRunTime();

    // 定期チェックを開始（1分間隔でチェック）
    this.intervalId = setInterval(() => {
      this.checkAndExecute();
    }, 60 * 1000); // 1分

    this.isInitialized = true;

    logSecurityEvent('archive_scheduler_started', {
      intervalHours: this.config.intervalHours,
      nextRunAt: this.state.nextRunAt
    });
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;

      console.log('⏹️ アーカイブスケジューラー停止');

      logSecurityEvent('archive_scheduler_stopped', {
        lastRunAt: this.state.lastRunAt,
        activeOperations: this.state.activeOperations
      });
    }
  }

  // =============================================================================
  // 実行時刻計算
  // =============================================================================

  private calculateNextRunTime(): void {
    const now = new Date();
    let nextRun = new Date();

    if (this.config.runTime) {
      // 指定時刻での実行
      const [hours, minutes] = this.config.runTime.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);

      // 今日の時刻が過ぎている場合は明日に設定
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else {
      // 間隔ベースの実行
      if (this.state.lastRunAt) {
        const lastRun = new Date(this.state.lastRunAt);
        nextRun = new Date(lastRun.getTime() + (this.config.intervalHours * 60 * 60 * 1000));
      } else {
        // 初回は現在時刻から間隔時間後
        nextRun = new Date(now.getTime() + (this.config.intervalHours * 60 * 60 * 1000));
      }
    }

    this.state.nextRunAt = nextRun.toISOString();
    console.log(`⏰ 次回アーカイブ実行予定: ${nextRun.toLocaleString('ja-JP')}`);
  }

  // =============================================================================
  // 実行チェック
  // =============================================================================

  private async checkAndExecute(): Promise<void> {
    if (!this.config.enabled || this.state.isRunning) {
      return;
    }

    const now = new Date();
    const nextRunTime = this.state.nextRunAt ? new Date(this.state.nextRunAt) : null;

    if (!nextRunTime || now < nextRunTime) {
      return; // まだ実行時刻ではない
    }

    console.log('🚀 アーカイブ自動実行開始');
    await this.executeArchive();
  }

  // =============================================================================
  // アーカイブ実行
  // =============================================================================

  private async executeArchive(retryCount = 0): Promise<void> {
    this.state.isRunning = true;
    this.state.error = undefined;

    try {
      console.log(`🔄 アーカイブ実行中... (試行: ${retryCount + 1})`);

      // アーカイブ処理実行
      const results = await dataArchiveManager.runAllArchivePolicies();

      // 結果を保存
      this.state.lastResults = results;
      this.state.lastRunAt = new Date().toISOString();

      // 統計情報をログに記録
      const successCount = results.filter(r => r.status === 'completed').length;
      const failCount = results.filter(r => r.status === 'failed').length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);

      console.log(`✅ アーカイブ自動実行完了: 成功 ${successCount}件, 失敗 ${failCount}件, 処理レコード ${totalRecords}件`);

      logSecurityEvent('archive_auto_execution_completed', {
        successCount,
        failCount,
        totalRecords,
        executionDurationMinutes: this.calculateExecutionDuration()
      });

      // 次回実行時刻を再計算
      this.calculateNextRunTime();

    } catch (error: any) {
      console.error('❌ アーカイブ自動実行エラー:', error);
      this.state.error = error.message;

      // リトライ処理
      if (retryCount < this.config.retryAttempts) {
        console.log(`🔄 ${this.config.retryDelayMinutes}分後にリトライします... (${retryCount + 1}/${this.config.retryAttempts})`);

        setTimeout(() => {
          this.executeArchive(retryCount + 1);
        }, this.config.retryDelayMinutes * 60 * 1000);

        return; // リトライ待機中なのでisRunningはtrueのまま
      } else {
        console.error(`❌ アーカイブ実行リトライ上限到達。次回定期実行まで待機します。`);

        logSecurityEvent('archive_auto_execution_failed', {
          error: error.message,
          retryAttempts: retryCount + 1,
          nextRetryAt: this.state.nextRunAt
        });

        // 次回実行時刻を再計算（失敗時は通常間隔で次回実行）
        this.calculateNextRunTime();
      }
    } finally {
      this.state.isRunning = false;
    }
  }

  // =============================================================================
  // ユーティリティ
  // =============================================================================

  private calculateExecutionDuration(): number {
    // 実装簡略化のため固定値を返す（実際は実行開始時刻を記録して計算）
    return 5; // 5分と仮定
  }

  // =============================================================================
  // 手動実行
  // =============================================================================

  public async executeManually(): Promise<ArchiveOperation[]> {
    if (this.state.isRunning) {
      throw new Error('アーカイブ処理が既に実行中です');
    }

    console.log('🖱️ アーカイブ手動実行開始');

    try {
      this.state.isRunning = true;
      const results = await dataArchiveManager.runAllArchivePolicies();

      this.state.lastResults = results;
      this.state.lastRunAt = new Date().toISOString();

      logSecurityEvent('archive_manual_execution_completed', {
        successCount: results.filter(r => r.status === 'completed').length,
        failCount: results.filter(r => r.status === 'failed').length,
        totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0)
      });

      console.log('✅ アーカイブ手動実行完了');
      return results;

    } finally {
      this.state.isRunning = false;
    }
  }

  // =============================================================================
  // 状態リセット
  // =============================================================================

  public reset(): void {
    this.stop();
    this.state = {
      isRunning: false,
      activeOperations: 0
    };
    console.log('🔄 アーカイブスケジューラー状態をリセットしました');
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const archiveScheduler = ArchiveSchedulerImpl.getInstance();

// =============================================================================
// 初期化関数
// =============================================================================

/**
 * アーカイブスケジューラーを初期化（アプリ起動時に呼び出し）
 */
export const initializeArchiveScheduler = (config?: Partial<ScheduleConfig>): void => {
  console.log('🔧 アーカイブスケジューラー初期化中...');

  if (config) {
    archiveScheduler.updateConfig(config);
  }

  // 本番環境でのみ自動実行を有効化（開発環境では手動実行のみ）
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    archiveScheduler.updateConfig({ enabled: true });
    archiveScheduler.start();
    console.log('✅ アーカイブスケジューラー本番モードで開始');
  } else {
    console.log('ℹ️ 開発環境: アーカイブスケジューラーは手動実行のみ');
  }
};

// =============================================================================
// エクスポート
// =============================================================================

export default ArchiveSchedulerImpl;
export type { ScheduleConfig, SchedulerState };