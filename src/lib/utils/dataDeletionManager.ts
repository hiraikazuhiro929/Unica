// データ自動削除管理システム
// 製造業務管理システム（Unica）専用

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  deleteDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logSecurityEvent } from './securityUtils';
import {
  exportDailyReports,
  exportOrders,
  exportWorkHours,
  exportProcesses
} from './exportUtils';

// =============================================================================
// 型定義
// =============================================================================

export interface DeletionPolicy {
  collectionName: string;
  retentionDays: number;
  requiresExport: boolean;
  autoDelete: boolean;
  warningDays: number[];
  description: string;
  category: 'business' | 'chat' | 'calendar' | 'personal';
}

export interface DeletionJob {
  id: string;
  collectionName: string;
  policy: DeletionPolicy;
  scheduledDate: string;
  status: 'pending' | 'warning' | 'ready' | 'exporting' | 'completed' | 'failed';
  recordsToDelete: string[];
  exportCompleted: boolean;
  exportPath?: string;
  createdAt: string;
  executedAt?: string;
  errorMessage?: string;
  deletedCount: number;
  warningsSent: number;
}

export interface DeletionResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  exportPath?: string;
  errors: string[];
  jobId: string;
}

export interface DeletionStatistics {
  totalDeleted: number;
  deletedByCollection: { [key: string]: number };
  exportedCollections: string[];
  lastRunDate: string;
  nextScheduledRun: string;
  failedJobs: number;
  pendingJobs: number;
}

// =============================================================================
// データ削除ポリシー定義
// =============================================================================

export const DELETION_POLICIES: DeletionPolicy[] = [
  // チャットメッセージ - 3ヶ月で自動削除（エクスポート不要）
  {
    collectionName: 'chat-messages',
    retentionDays: 90,
    requiresExport: false,
    autoDelete: true,
    warningDays: [7, 1],
    description: 'チャットメッセージは3ヶ月後に自動削除されます',
    category: 'chat'
  },

  // ビジネスデータ - 6ヶ月保持後、エクスポート確認して削除
  {
    collectionName: 'orders',
    retentionDays: 180,
    requiresExport: true,
    autoDelete: false,
    warningDays: [30, 14, 7, 1],
    description: '受注データは6ヶ月後にエクスポート確認後削除されます',
    category: 'business'
  },
  {
    collectionName: 'processes',
    retentionDays: 180,
    requiresExport: true,
    autoDelete: false,
    warningDays: [30, 14, 7, 1],
    description: '工程データは6ヶ月後にエクスポート確認後削除されます',
    category: 'business'
  },
  {
    collectionName: 'work-hours',
    retentionDays: 180,
    requiresExport: true,
    autoDelete: false,
    warningDays: [30, 14, 7, 1],
    description: '工数データは6ヶ月後にエクスポート確認後削除されます',
    category: 'business'
  },
  {
    collectionName: 'daily-reports',
    retentionDays: 180,
    requiresExport: true,
    autoDelete: false,
    warningDays: [30, 14, 7, 1],
    description: '日報データは6ヶ月後にエクスポート確認後削除されます',
    category: 'business'
  },
  {
    collectionName: 'companyTasks',
    retentionDays: 180,
    requiresExport: true,
    autoDelete: false,
    warningDays: [30, 14, 7, 1],
    description: '会社タスクは6ヶ月後にエクスポート確認後削除されます',
    category: 'business'
  },

  // カレンダー - 1年で自動削除
  {
    collectionName: 'calendar-events',
    retentionDays: 365,
    requiresExport: false,
    autoDelete: true,
    warningDays: [30, 7],
    description: 'カレンダーイベントは1年後に自動削除されます',
    category: 'calendar'
  },

  // メモ・個人タスク - 自動削除なし（無期限保存）
  {
    collectionName: 'notes',
    retentionDays: -1, // 無期限
    requiresExport: false,
    autoDelete: false,
    warningDays: [],
    description: 'メモは無期限保存されます',
    category: 'personal'
  },
  {
    collectionName: 'personalTasks',
    retentionDays: -1, // 無期限
    requiresExport: false,
    autoDelete: false,
    warningDays: [],
    description: '個人タスクは無期限保存されます',
    category: 'personal'
  }
];

// =============================================================================
// データ削除マネージャークラス
// =============================================================================

class DataDeletionManagerImpl {
  private static instance: DataDeletionManagerImpl;

  private constructor() {}

  public static getInstance(): DataDeletionManagerImpl {
    if (!DataDeletionManagerImpl.instance) {
      DataDeletionManagerImpl.instance = new DataDeletionManagerImpl();
    }
    return DataDeletionManagerImpl.instance;
  }

  // =============================================================================
  // ポリシー管理
  // =============================================================================

  getPolicyForCollection(collectionName: string): DeletionPolicy | null {
    return DELETION_POLICIES.find(policy => policy.collectionName === collectionName) || null;
  }

  getAllPolicies(): DeletionPolicy[] {
    return [...DELETION_POLICIES];
  }

  // =============================================================================
  // 削除対象データ識別
  // =============================================================================

  async findDeletableRecords(collectionName: string): Promise<string[]> {
    const policy = this.getPolicyForCollection(collectionName);
    if (!policy || policy.retentionDays === -1) {
      return []; // 無期限保存または未定義
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    console.log(`🔍 ${collectionName} の削除対象検索開始 (${policy.retentionDays}日前: ${cutoffDate.toISOString()})`);

    try {
      let dateField = 'createdAt';

      // コレクションによって日付フィールドを調整
      if (collectionName === 'daily-reports') {
        dateField = 'date';
      } else if (collectionName === 'orders') {
        dateField = 'orderDate';
      } else if (collectionName === 'processes') {
        dateField = 'createdAt'; // 完了日ではなく作成日で判定
      }

      // 完了済みまたは古いレコードを取得
      const deletableQuery = query(
        collection(db, collectionName),
        where(dateField, '<', cutoffDate.toISOString()),
        orderBy(dateField, 'asc'),
        limit(500) // バッチ処理用制限
      );

      const querySnapshot = await getDocs(deletableQuery);
      const recordIds = querySnapshot.docs.map(doc => doc.id);

      console.log(`📊 ${collectionName}: 削除対象 ${recordIds.length}件`);
      return recordIds;

    } catch (error) {
      console.error(`❌ ${collectionName} の削除対象検索エラー:`, error);
      return [];
    }
  }

  // =============================================================================
  // エクスポート処理
  // =============================================================================

  async exportCollectionData(collectionName: string, recordIds: string[]): Promise<string | null> {
    console.log(`📄 ${collectionName} のデータエクスポート開始 (${recordIds.length}件)`);

    try {
      // レコードデータを取得
      const records: any[] = [];

      // バッチサイズを制限してメモリ使用量を抑制
      const batchSize = 50;
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batchIds = recordIds.slice(i, i + batchSize);

        for (const recordId of batchIds) {
          const docRef = doc(db, collectionName, recordId);
          const docSnap = await getDocs(query(collection(db, collectionName), where('__name__', '==', recordId)));

          if (!docSnap.empty) {
            records.push({
              id: recordId,
              ...docSnap.docs[0].data()
            });
          }
        }
      }

      if (records.length === 0) {
        console.warn(`⚠️ ${collectionName}: エクスポート対象データなし`);
        return null;
      }

      // 削除日をファイル名に追加
      const exportDate = new Date();
      const dateStr = exportDate.toISOString().split('T')[0];
      const filename = `削除前バックアップ_${collectionName}_${dateStr}`;

      // コレクション別エクスポート
      switch (collectionName) {
        case 'daily-reports':
          exportDailyReports(records, 'excel');
          break;
        case 'orders':
          exportOrders(records, 'excel');
          break;
        case 'work-hours':
          exportWorkHours(records, 'excel');
          break;
        case 'processes':
          exportProcesses(records, 'excel');
          break;
        case 'companyTasks':
        default:
          // 汎用エクスポート
          const { exportToExcel } = await import('./exportUtils');
          exportToExcel(records, filename, collectionName);
          break;
      }

      const exportPath = `${filename}.xlsx`;

      // エクスポート記録をログに残す
      logSecurityEvent('data_export_before_deletion', {
        collectionName,
        recordCount: records.length,
        exportPath,
        exportDate: exportDate.toISOString()
      });

      console.log(`✅ ${collectionName} エクスポート完了: ${exportPath}`);
      return exportPath;

    } catch (error) {
      console.error(`❌ ${collectionName} エクスポートエラー:`, error);
      return null;
    }
  }

  // =============================================================================
  // 削除実行
  // =============================================================================

  async executeRecordDeletion(collectionName: string, recordIds: string[]): Promise<DeletionResult> {
    console.log(`🗑️ ${collectionName} データ削除実行開始 (${recordIds.length}件)`);

    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const jobId = `deletion_${collectionName}_${Date.now()}`;

    try {
      // バッチ削除で効率化
      const batchSize = 500; // Firestore制限
      const batches = [];

      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = recordIds.slice(i, i + batchSize);

        for (const recordId of batchIds) {
          const docRef = doc(db, collectionName, recordId);
          batch.delete(docRef);
        }

        batches.push({ batch, count: batchIds.length });
      }

      // バッチを順次実行
      for (const { batch, count } of batches) {
        try {
          await batch.commit();
          deletedCount += count;
          console.log(`✅ バッチ削除完了: ${count}件`);
        } catch (error) {
          failedCount += count;
          errors.push(`バッチ削除エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
          console.error('❌ バッチ削除エラー:', error);
        }
      }

      // 削除記録をログに保存
      await this.recordDeletionLog({
        jobId,
        collectionName,
        deletedCount,
        failedCount,
        recordIds,
        executedAt: new Date().toISOString()
      });

      logSecurityEvent('data_deletion_executed', {
        collectionName,
        deletedCount,
        failedCount,
        jobId,
        recordIds: recordIds.slice(0, 10) // 最初の10件のIDのみ記録
      });

      console.log(`🎯 ${collectionName} 削除完了: 成功 ${deletedCount}件, 失敗 ${failedCount}件`);

      return {
        success: failedCount === 0,
        deletedCount,
        failedCount,
        errors,
        jobId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明な削除エラー';
      console.error(`❌ ${collectionName} 削除処理エラー:`, error);

      return {
        success: false,
        deletedCount,
        failedCount: recordIds.length - deletedCount,
        errors: [...errors, errorMessage],
        jobId
      };
    }
  }

  // =============================================================================
  // 削除ジョブ管理
  // =============================================================================

  async createDeletionJob(collectionName: string): Promise<DeletionJob | null> {
    const policy = this.getPolicyForCollection(collectionName);
    if (!policy) {
      return null;
    }

    const recordsToDelete = await this.findDeletableRecords(collectionName);
    if (recordsToDelete.length === 0) {
      return null; // 削除対象なし
    }

    const now = new Date();
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + 1); // 1日後に実行

    const job: Omit<DeletionJob, 'id'> = {
      collectionName,
      policy,
      scheduledDate: scheduledDate.toISOString(),
      status: policy.requiresExport ? 'warning' : 'ready',
      recordsToDelete,
      exportCompleted: !policy.requiresExport,
      createdAt: now.toISOString(),
      deletedCount: 0,
      warningsSent: 0
    };

    try {
      const jobRef = await addDoc(collection(db, 'deletion-jobs'), job);

      console.log(`📅 削除ジョブ作成: ${collectionName} (${recordsToDelete.length}件)`);

      return {
        id: jobRef.id,
        ...job
      };
    } catch (error) {
      console.error('削除ジョブ作成エラー:', error);
      return null;
    }
  }

  async getDeletionJobs(): Promise<DeletionJob[]> {
    try {
      const jobsQuery = query(
        collection(db, 'deletion-jobs'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(jobsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeletionJob[];
    } catch (error) {
      console.error('削除ジョブ取得エラー:', error);
      return [];
    }
  }

  async updateJobStatus(jobId: string, updates: Partial<DeletionJob>): Promise<boolean> {
    try {
      const jobRef = doc(db, 'deletion-jobs', jobId);
      await updateDoc(jobRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('ジョブ更新エラー:', error);
      return false;
    }
  }

  // =============================================================================
  // 削除ログ管理
  // =============================================================================

  private async recordDeletionLog(logData: {
    jobId: string;
    collectionName: string;
    deletedCount: number;
    failedCount: number;
    recordIds: string[];
    executedAt: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, 'deletion-logs'), {
        ...logData,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('削除ログ記録エラー:', error);
    }
  }

  // =============================================================================
  // 統計とモニタリング
  // =============================================================================

  async getDeletionStatistics(): Promise<DeletionStatistics> {
    try {
      // 削除ログから統計を計算
      const logsQuery = query(
        collection(db, 'deletion-logs'),
        orderBy('executedAt', 'desc'),
        limit(100)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => doc.data());

      const totalDeleted = logs.reduce((sum, log) => sum + (log.deletedCount || 0), 0);

      const deletedByCollection: { [key: string]: number } = {};
      const exportedCollections: string[] = [];

      logs.forEach(log => {
        if (log.collectionName) {
          deletedByCollection[log.collectionName] =
            (deletedByCollection[log.collectionName] || 0) + (log.deletedCount || 0);

          const policy = this.getPolicyForCollection(log.collectionName);
          if (policy?.requiresExport && !exportedCollections.includes(log.collectionName)) {
            exportedCollections.push(log.collectionName);
          }
        }
      });

      // ジョブ統計
      const jobs = await this.getDeletionJobs();
      const failedJobs = jobs.filter(job => job.status === 'failed').length;
      const pendingJobs = jobs.filter(job => job.status === 'pending' || job.status === 'warning').length;

      return {
        totalDeleted,
        deletedByCollection,
        exportedCollections,
        lastRunDate: logs.length > 0 ? logs[0].executedAt : '',
        nextScheduledRun: this.calculateNextScheduledRun(),
        failedJobs,
        pendingJobs
      };
    } catch (error) {
      console.error('統計取得エラー:', error);
      return {
        totalDeleted: 0,
        deletedByCollection: {},
        exportedCollections: [],
        lastRunDate: '',
        nextScheduledRun: '',
        failedJobs: 0,
        pendingJobs: 0
      };
    }
  }

  private calculateNextScheduledRun(): string {
    // 毎日午前2時に実行予定
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow.toISOString();
  }

  // =============================================================================
  // 全自動削除プロセス
  // =============================================================================

  async runScheduledDeletion(): Promise<{
    processedCollections: string[];
    totalDeleted: number;
    errors: string[];
  }> {
    console.log('🔄 定期削除処理開始');

    const processedCollections: string[] = [];
    let totalDeleted = 0;
    const errors: string[] = [];

    // 自動削除対象のポリシーのみ処理
    const autoDeletePolicies = DELETION_POLICIES.filter(policy => policy.autoDelete);

    for (const policy of autoDeletePolicies) {
      try {
        console.log(`🔍 ${policy.collectionName} の処理開始`);

        const recordIds = await this.findDeletableRecords(policy.collectionName);
        if (recordIds.length === 0) {
          console.log(`✅ ${policy.collectionName}: 削除対象なし`);
          continue;
        }

        // エクスポートが必要な場合は実行
        let exportPath: string | undefined;
        if (policy.requiresExport) {
          exportPath = await this.exportCollectionData(policy.collectionName, recordIds) || undefined;
          if (!exportPath) {
            errors.push(`${policy.collectionName}: エクスポートに失敗しました`);
            continue;
          }
        }

        // 削除実行
        const result = await this.executeRecordDeletion(policy.collectionName, recordIds);

        if (result.success) {
          processedCollections.push(policy.collectionName);
          totalDeleted += result.deletedCount;
          console.log(`✅ ${policy.collectionName}: ${result.deletedCount}件削除完了`);
        } else {
          errors.push(`${policy.collectionName}: ${result.errors.join(', ')}`);
        }

      } catch (error) {
        const errorMessage = `${policy.collectionName}: ${error instanceof Error ? error.message : '不明なエラー'}`;
        errors.push(errorMessage);
        console.error('❌ 削除処理エラー:', error);
      }
    }

    // 全体統計をログに記録
    logSecurityEvent('scheduled_deletion_completed', {
      processedCollections,
      totalDeleted,
      errorCount: errors.length,
      executedAt: new Date().toISOString()
    });

    console.log(`🎯 定期削除処理完了: ${totalDeleted}件削除, エラー${errors.length}件`);

    return {
      processedCollections,
      totalDeleted,
      errors
    };
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const dataDeletionManager = DataDeletionManagerImpl.getInstance();

// =============================================================================
// ユーティリティ関数
// =============================================================================

export const initializeDataDeletion = async (): Promise<void> => {
  console.log('🔧 データ削除システム初期化中...');

  try {
    // 各コレクションの削除ジョブを作成
    for (const policy of DELETION_POLICIES) {
      if (policy.retentionDays !== -1) { // 無期限保存以外
        await dataDeletionManager.createDeletionJob(policy.collectionName);
      }
    }

    console.log('✅ データ削除システム初期化完了');
  } catch (error) {
    console.error('❌ 初期化エラー:', error);
  }
};

export const getRetentionPolicyDescription = (collectionName: string): string => {
  const policy = dataDeletionManager.getPolicyForCollection(collectionName);
  return policy ? policy.description : 'データ保持ポリシーが未定義です';
};

export const isCollectionDeletable = (collectionName: string): boolean => {
  const policy = dataDeletionManager.getPolicyForCollection(collectionName);
  return policy ? policy.retentionDays !== -1 : false;
};

export default DataDeletionManagerImpl;