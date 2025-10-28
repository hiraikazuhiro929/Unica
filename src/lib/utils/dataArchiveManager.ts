// データアーカイブ管理システム
// 完了データの自動削除とバックアップシステム

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { exportComprehensiveProjectData } from './comprehensiveExportUtils';
import { log } from '@/lib/logger';

// =============================================================================
// 型定義
// =============================================================================

export interface ArchivePolicy {
  id: string;
  collectionName: string;
  retentionDays: number; // 保持期間（日数）
  backupBeforeDelete: boolean;
  deleteAfterBackup: boolean;
  lastRunAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveOperation {
  id: string;
  policyId: string;
  collectionName: string;
  operationType: 'backup' | 'delete' | 'archive';
  recordCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  backupPath?: string;
  metadata: {
    totalRecords: number;
    processedRecords: number;
    deletedRecords: number;
    backedupRecords: number;
    errors: string[];
  };
}

export interface DataArchiveManager {
  // ポリシー管理
  createArchivePolicy(policy: Omit<ArchivePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateArchivePolicy(policyId: string, updates: Partial<ArchivePolicy>): Promise<boolean>;
  getArchivePolicies(): Promise<ArchivePolicy[]>;

  // アーカイブ実行
  runArchiveForCollection(collectionName: string): Promise<ArchiveOperation>;
  runAllArchivePolicies(): Promise<ArchiveOperation[]>;

  // データ管理
  findExpiredRecords(collectionName: string, retentionDays: number): Promise<any[]>;
  createBackup(records: any[], collectionName: string): Promise<string>;
  deleteExpiredRecords(records: any[], collectionName: string): Promise<number>;
}

// =============================================================================
// データアーカイブマネージャークラス
// =============================================================================

class DataArchiveManagerImpl implements DataArchiveManager {
  private static instance: DataArchiveManagerImpl;

  private constructor() {}

  public static getInstance(): DataArchiveManagerImpl {
    if (!DataArchiveManagerImpl.instance) {
      DataArchiveManagerImpl.instance = new DataArchiveManagerImpl();
    }
    return DataArchiveManagerImpl.instance;
  }

  // =============================================================================
  // ポリシー管理
  // =============================================================================

  async createArchivePolicy(
    policy: Omit<ArchivePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = new Date().toISOString();
    const newPolicy: Omit<ArchivePolicy, 'id'> = {
      ...policy,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, 'archive-policies'), newPolicy);

    log.auth('Archive policy created', {
      policyId: docRef.id,
      collectionName: policy.collectionName,
      retentionDays: policy.retentionDays
    });

    return docRef.id;
  }

  async updateArchivePolicy(policyId: string, updates: Partial<ArchivePolicy>): Promise<boolean> {
    try {
      const policyRef = doc(db, 'archive-policies', policyId);
      await policyRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      log.auth('Archive policy updated', {
        policyId,
        updates: Object.keys(updates)
      });

      return true;
    } catch (error) {
      console.error('ポリシー更新エラー:', error);
      return false;
    }
  }

  async getArchivePolicies(): Promise<ArchivePolicy[]> {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'archive-policies'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      )
    );

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArchivePolicy[];
  }

  // =============================================================================
  // 期限切れレコード検索
  // =============================================================================

  async findExpiredRecords(collectionName: string, retentionDays: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`🔍 期限切れレコード検索: ${collectionName}, 基準日: ${cutoffDate.toLocaleDateString()}`);

    try {
      // 完了済みかつ期限切れのレコードを検索（安全性向上）
      const expiredQuery = query(
        collection(db, collectionName),
        where('status', '==', 'completed'),
        where('completedAt', '!=', null),        // 🔒 完了日が存在することを確認
        where('completedAt', '<', cutoffDate.toISOString()),
        orderBy('completedAt', 'asc'),
        limit(100) // 一度に処理する件数制限
      );

      const querySnapshot = await getDocs(expiredQuery);
      const expiredRecords = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 期限切れレコード発見: ${expiredRecords.length}件`);
      return expiredRecords;

    } catch (error) {
      console.error('期限切れレコード検索エラー:', error);
      // フォールバック: 全完了レコードを取得してクライアントサイドでフィルタ
      try {
        const allCompletedQuery = query(
          collection(db, collectionName),
          where('status', '==', 'completed'),
          orderBy('completedAt', 'asc'),
          limit(50)
        );

        const querySnapshot = await getDocs(allCompletedQuery);
        const records = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // クライアントサイドでフィルタリング
        const expiredRecords = records.filter(record => {
          const completedAt = new Date(record.completedAt || record.updatedAt);
          return completedAt < cutoffDate;
        });

        console.log(`📊 フォールバック検索結果: ${expiredRecords.length}件`);
        return expiredRecords;

      } catch (fallbackError) {
        console.error('フォールバック検索もエラー:', fallbackError);
        return [];
      }
    }
  }

  // =============================================================================
  // バックアップ作成
  // =============================================================================

  async createBackup(records: any[], collectionName: string): Promise<string> {
    if (records.length === 0) {
      throw new Error('バックアップ対象のレコードがありません');
    }

    console.log(`💾 バックアップ作成開始: ${collectionName}, ${records.length}件`);

    try {
      // バックアップレコードをFirestoreに保存
      const backupData = {
        collectionName,
        recordCount: records.length,
        records,
        createdAt: new Date().toISOString(),
        metadata: {
          source: 'automated_archive',
          originalCollection: collectionName,
          backupReason: 'retention_policy'
        }
      };

      const backupRef = await addDoc(collection(db, 'data-backups'), backupData);

      // 統計情報ログ
      const managementNumbers = records
        .map(r => r.managementNumber)
        .filter(Boolean)
        .slice(0, 10); // 最初の10件のみログ

      log.auth('Data backup created', {
        backupId: backupRef.id,
        collectionName,
        recordCount: records.length,
        sampleManagementNumbers: managementNumbers
      });

      console.log(`✅ バックアップ完了: ${backupRef.id}`);
      return backupRef.id;

    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      throw error;
    }
  }

  // =============================================================================
  // 期限切れレコード削除
  // =============================================================================

  async deleteExpiredRecords(records: any[], collectionName: string): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    // 🔒 安全性チェック: 削除前に再度ステータス確認
    const safeRecords = records.filter(record =>
      record.status === 'completed' &&
      record.completedAt &&
      record.completedAt !== null
    );

    if (safeRecords.length < records.length) {
      const unsafeCount = records.length - safeRecords.length;
      console.warn(`⚠️ 安全性チェック: ${unsafeCount}件のレコードをアーカイブ対象から除外`);
      log.auth('Unsafe records excluded from archive', {
        collectionName,
        excludedCount: unsafeCount,
        totalRecords: records.length
      });
    }

    console.log(`🗑️ レコード削除開始: ${collectionName}, ${safeRecords.length}件`);

    const batch = writeBatch(db);
    let deletedCount = 0;

    try {
      // バッチ削除の準備（安全性チェック済みレコードのみ）
      for (const record of safeRecords) {
        if (record.id) {
          const docRef = doc(db, collectionName, record.id);
          batch.delete(docRef);
          deletedCount++;
        }
      }

      // バッチ実行
      await batch.commit();

      // 統計情報ログ（安全性チェック済みレコードベース）
      const managementNumbers = safeRecords
        .map(r => r.managementNumber)
        .filter(Boolean)
        .slice(0, 5); // 最初の5件のみログ

      log.auth('Expired records deleted', {
        collectionName,
        deletedCount,
        sampleManagementNumbers: managementNumbers
      });

      console.log(`✅ レコード削除完了: ${deletedCount}件`);
      return deletedCount;

    } catch (error) {
      console.error('レコード削除エラー:', error);
      throw error;
    }
  }

  // =============================================================================
  // アーカイブ実行
  // =============================================================================

  async runArchiveForCollection(collectionName: string): Promise<ArchiveOperation> {
    console.log(`🔄 アーカイブ処理開始: ${collectionName}`);

    // ポリシーを検索
    const policies = await this.getArchivePolicies();
    const policy = policies.find(p => p.collectionName === collectionName);

    if (!policy) {
      throw new Error(`アーカイブポリシーが見つかりません: ${collectionName}`);
    }

    // オペレーションレコード作成
    const operationData: Omit<ArchiveOperation, 'id'> = {
      policyId: policy.id,
      collectionName,
      operationType: 'archive',
      recordCount: 0,
      status: 'pending',
      startedAt: new Date().toISOString(),
      metadata: {
        totalRecords: 0,
        processedRecords: 0,
        deletedRecords: 0,
        backedupRecords: 0,
        errors: []
      }
    };

    const operationRef = await addDoc(collection(db, 'archive-operations'), operationData);
    const operationId = operationRef.id;

    try {
      // オペレーションを開始状態に更新
      await operationRef.update({
        status: 'running',
        startedAt: new Date().toISOString()
      });

      // 1. 期限切れレコードを検索
      const expiredRecords = await this.findExpiredRecords(collectionName, policy.retentionDays);

      if (expiredRecords.length === 0) {
        await operationRef.update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          recordCount: 0,
          'metadata.totalRecords': 0
        });

        console.log(`ℹ️ 期限切れレコードなし: ${collectionName}`);
        return { id: operationId, ...operationData, status: 'completed', recordCount: 0 };
      }

      // 2. バックアップ作成（必要な場合）
      let backupPath: string | undefined;
      if (policy.backupBeforeDelete) {
        backupPath = await this.createBackup(expiredRecords, collectionName);
        await operationRef.update({
          'metadata.backedupRecords': expiredRecords.length,
          backupPath
        });
      }

      // 3. レコード削除（必要な場合）
      let deletedCount = 0;
      if (policy.deleteAfterBackup) {
        deletedCount = await this.deleteExpiredRecords(expiredRecords, collectionName);
        await operationRef.update({
          'metadata.deletedRecords': deletedCount
        });
      }

      // 4. オペレーション完了
      await operationRef.update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        recordCount: expiredRecords.length,
        'metadata.totalRecords': expiredRecords.length,
        'metadata.processedRecords': expiredRecords.length
      });

      // 5. ポリシーの最終実行日時を更新
      await this.updateArchivePolicy(policy.id, {
        lastRunAt: new Date().toISOString()
      });

      console.log(`✅ アーカイブ処理完了: ${collectionName}`);

      return {
        id: operationId,
        ...operationData,
        status: 'completed',
        recordCount: expiredRecords.length,
        backupPath,
        completedAt: new Date().toISOString()
      };

    } catch (error: any) {
      // エラー時の処理
      await operationRef.update({
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error.message,
        'metadata.errors': [error.message]
      });

      console.error(`❌ アーカイブ処理エラー: ${collectionName}`, error);
      throw error;
    }
  }

  async runAllArchivePolicies(): Promise<ArchiveOperation[]> {
    console.log('🔄 全アーカイブポリシー実行開始');

    const policies = await this.getArchivePolicies();
    const results: ArchiveOperation[] = [];

    for (const policy of policies) {
      try {
        const operation = await this.runArchiveForCollection(policy.collectionName);
        results.push(operation);
      } catch (error) {
        console.error(`ポリシー実行エラー: ${policy.collectionName}`, error);
        // エラーがあっても他のポリシーは続行
      }
    }

    log.auth('Archive policies batch executed', {
      executedPolicies: policies.length,
      successfulOperations: results.filter(r => r.status === 'completed').length,
      failedOperations: results.filter(r => r.status === 'failed').length
    });

    console.log(`✅ 全アーカイブポリシー実行完了: ${results.length}件処理`);
    return results;
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const dataArchiveManager = DataArchiveManagerImpl.getInstance();

// =============================================================================
// デフォルトポリシー設定
// =============================================================================

export const DEFAULT_ARCHIVE_POLICIES = [
  {
    collectionName: 'orders',
    retentionDays: 365, // 1年
    backupBeforeDelete: true,
    deleteAfterBackup: true,
    isActive: true
  },
  {
    collectionName: 'companyTasks',
    retentionDays: 180, // 6ヶ月
    backupBeforeDelete: true,
    deleteAfterBackup: true,
    isActive: true
  },
  {
    collectionName: 'workHours',
    retentionDays: 180, // 6ヶ月
    backupBeforeDelete: true,
    deleteAfterBackup: true,
    isActive: true
  },
  {
    collectionName: 'daily-reports',
    retentionDays: 90, // 3ヶ月
    backupBeforeDelete: true,
    deleteAfterBackup: true,
    isActive: true
  }
];

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * デフォルトアーカイブポリシーを初期化
 */
export const initializeDefaultPolicies = async (): Promise<void> => {
  console.log('🔧 デフォルトアーカイブポリシーを初期化中...');

  for (const policyData of DEFAULT_ARCHIVE_POLICIES) {
    try {
      await dataArchiveManager.createArchivePolicy(policyData);
      console.log(`✅ ポリシー作成: ${policyData.collectionName}`);
    } catch (error) {
      console.log(`⚠️ ポリシー作成スキップ (既存): ${policyData.collectionName}`);
    }
  }
};

/**
 * 手動アーカイブ実行（管理画面用）
 */
export const manualArchiveExecution = async (collectionName?: string): Promise<ArchiveOperation[]> => {
  if (collectionName) {
    const operation = await dataArchiveManager.runArchiveForCollection(collectionName);
    return [operation];
  } else {
    return await dataArchiveManager.runAllArchivePolicies();
  }
};

export default DataArchiveManagerImpl;