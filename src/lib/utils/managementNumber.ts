// 製番管理システム - 全データの統一管理
import { db } from '@/lib/firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  writeBatch,
  increment
} from 'firebase/firestore';
import { logSecurityEvent } from './securityUtils';

// =============================================================================
// 製番管理の型定義
// =============================================================================

export interface ManagementNumberRecord {
  id: string;
  managementNumber: string;
  type: 'order' | 'process' | 'work-hours' | 'batch' | 'other';
  status: 'active' | 'completed' | 'cancelled';
  
  // 関連データID
  relatedIds: {
    orderId?: string;
    processId?: string;
    workHoursId?: string;
    dailyReportIds?: string[];
  };
  
  // 基本情報
  projectName: string;
  client: string;
  assignee?: string;
  
  // 日程
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // 追加情報
  quantity?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  notes?: string;
}

export interface ManagementNumberConfig {
  id: string;
  type: ManagementNumberRecord['type'];
  prefix: string; // 例: "ORD", "PROC", "WH"
  yearFormat: 'YYYY' | 'YY'; // 年の表示形式
  sequence: number; // 現在の連番
  sequenceLength: number; // 連番の桁数（例: 3なら001, 002...）
  resetYearly: boolean; // 年度でリセットするか
  description: string;
  isActive: boolean;
  updatedAt: string;
}

// =============================================================================
// 製番管理クラス
// =============================================================================

export class ManagementNumberManager {
  private static instance: ManagementNumberManager;
  private configCache: Record<string, ManagementNumberConfig> = {};

  private constructor() {}

  public static getInstance(): ManagementNumberManager {
    if (!ManagementNumberManager.instance) {
      ManagementNumberManager.instance = new ManagementNumberManager();
    }
    return ManagementNumberManager.instance;
  }

  // =============================================================================
  // 製番生成
  // =============================================================================

  /**
   * 新しい製番を生成
   */
  public async generateManagementNumber(
    type: ManagementNumberRecord['type'],
    additionalData: {
      projectName: string;
      client: string;
      assignee?: string;
      quantity?: number;
      priority?: ManagementNumberRecord['priority'];
    }
  ): Promise<{ managementNumber: string; recordId: string }> {
    const config = await this.getConfig(type);
    const managementNumber = await this.generateNextNumber(config);
    
    // レコード作成
    const record: Omit<ManagementNumberRecord, 'id'> = {
      managementNumber,
      type,
      status: 'active',
      relatedIds: {},
      projectName: additionalData.projectName,
      client: additionalData.client,
      assignee: additionalData.assignee,
      quantity: additionalData.quantity,
      priority: additionalData.priority || 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const recordRef = doc(collection(db, 'management-numbers'));
    await setDoc(recordRef, record);

    logSecurityEvent('management_number_generated', {
      type,
      managementNumber,
      recordId: recordRef.id,
      client: additionalData.client
    });

    return {
      managementNumber,
      recordId: recordRef.id
    };
  }

  /**
   * 次の連番を生成
   */
  private async generateNextNumber(config: ManagementNumberConfig): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearStr = config.yearFormat === 'YYYY' 
      ? currentYear.toString() 
      : currentYear.toString().slice(-2);

    // 年度リセットの場合、現在の年と設定の年を比較
    const configRef = doc(db, 'management-number-configs', config.id);
    
    if (config.resetYearly) {
      const lastYear = parseInt(config.updatedAt.slice(0, 4));
      if (currentYear > lastYear) {
        // 年度が変わっている場合はリセット
        config.sequence = 1;
        await updateDoc(configRef, {
          sequence: 1,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 連番をインクリメント
    await updateDoc(configRef, {
      sequence: increment(1),
      updatedAt: new Date().toISOString()
    });

    // 製番を組み立て
    const sequenceStr = (config.sequence + 1).toString().padStart(config.sequenceLength, '0');
    return `${config.prefix}-${yearStr}-${sequenceStr}`;
  }

  // =============================================================================
  // 設定管理
  // =============================================================================

  /**
   * 設定を取得（キャッシュ対応）
   */
  private async getConfig(type: ManagementNumberRecord['type']): Promise<ManagementNumberConfig> {
    if (this.configCache[type]) {
      return this.configCache[type];
    }

    const configDoc = await getDoc(doc(db, 'management-number-configs', type));
    
    if (!configDoc.exists()) {
      // デフォルト設定を作成
      const defaultConfig = this.getDefaultConfig(type);
      await setDoc(doc(db, 'management-number-configs', type), defaultConfig);
      this.configCache[type] = { id: type, ...defaultConfig };
      return this.configCache[type];
    }

    const config = { id: configDoc.id, ...configDoc.data() } as ManagementNumberConfig;
    this.configCache[type] = config;
    return config;
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(type: ManagementNumberRecord['type']): Omit<ManagementNumberConfig, 'id'> {
    const baseConfig = {
      yearFormat: 'YYYY' as const,
      sequence: 0,
      sequenceLength: 3,
      resetYearly: true,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    switch (type) {
      case 'order':
        return {
          ...baseConfig,
          type: 'order',
          prefix: 'ORD',
          description: '受注案件番号'
        };
      case 'process':
        return {
          ...baseConfig,
          type: 'process',
          prefix: 'PROC',
          description: '工程番号'
        };
      case 'work-hours':
        return {
          ...baseConfig,
          type: 'work-hours',
          prefix: 'WH',
          description: '工数番号'
        };
      case 'batch':
        return {
          ...baseConfig,
          type: 'batch',
          prefix: 'LOT',
          description: 'ロット番号'
        };
      default:
        return {
          ...baseConfig,
          type: 'other',
          prefix: 'OTHER',
          description: 'その他番号'
        };
    }
  }

  // =============================================================================
  // レコード管理
  // =============================================================================

  /**
   * 製番でレコードを検索
   */
  public async findByManagementNumber(managementNumber: string): Promise<ManagementNumberRecord | null> {
    const q = query(
      collection(db, 'management-numbers'),
      where('managementNumber', '==', managementNumber),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ManagementNumberRecord;
  }

  /**
   * 関連IDでレコードを検索
   */
  public async findByRelatedId(
    relatedType: keyof ManagementNumberRecord['relatedIds'],
    relatedId: string
  ): Promise<ManagementNumberRecord[]> {
    const q = query(
      collection(db, 'management-numbers'),
      where(`relatedIds.${relatedType}`, '==', relatedId)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ManagementNumberRecord[];
  }

  /**
   * 関連IDを更新
   */
  public async linkRelatedId(
    managementNumber: string,
    relatedType: keyof ManagementNumberRecord['relatedIds'],
    relatedId: string
  ): Promise<boolean> {
    try {
      const record = await this.findByManagementNumberWithRepair(managementNumber);
      if (!record) {
        throw new Error(`Management number not found: ${managementNumber}`);
      }

      const updateData: any = {
        [`relatedIds.${relatedType}`]: relatedId,
        updatedAt: new Date().toISOString()
      };

      // 日報IDsの場合は配列に追加
      if (relatedType === 'dailyReportIds') {
        const currentIds = record.relatedIds.dailyReportIds || [];
        if (!currentIds.includes(relatedId)) {
          updateData[`relatedIds.${relatedType}`] = [...currentIds, relatedId];
        }
      }

      await updateDoc(doc(db, 'management-numbers', record.id), updateData);

      logSecurityEvent('management_number_linked', {
        managementNumber,
        relatedType,
        relatedId
      });

      return true;
    } catch (error) {
      console.error('Failed to link related ID:', error);
      return false;
    }
  }

  /**
   * ステータスを更新
   */
  public async updateStatus(
    managementNumber: string,
    status: ManagementNumberRecord['status']
  ): Promise<boolean> {
    try {
      const record = await this.findByManagementNumberWithRepair(managementNumber);
      if (!record) {
        throw new Error(`Management number not found: ${managementNumber}`);
      }

      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'management-numbers', record.id), updateData);

      logSecurityEvent('management_number_status_updated', {
        managementNumber,
        oldStatus: record.status,
        newStatus: status
      });

      return true;
    } catch (error) {
      console.error('Failed to update status:', error);
      return false;
    }
  }

  // =============================================================================
  // データ修復・同期
  // =============================================================================

  /**
   * 管理番号レコードが存在しない場合の修復処理
   * 既存のデータから管理番号レコードを再構築
   */
  public async repairMissingRecord(managementNumber: string): Promise<ManagementNumberRecord | null> {
    console.log(`🔧 管理番号レコードの修復を試行: ${managementNumber}`);

    try {
      // 既存の受注データを検索
      const ordersQuery = query(
        collection(db, 'orders'),
        where('managementNumber', '==', managementNumber),
        limit(1)
      );
      const ordersSnapshot = await getDocs(ordersQuery);

      if (!ordersSnapshot.empty) {
        const orderDoc = ordersSnapshot.docs[0];
        const orderData = { id: orderDoc.id, ...orderDoc.data() };

        // 管理番号レコードを再構築
        const newRecord: Omit<ManagementNumberRecord, 'id'> = {
          managementNumber,
          type: 'order',
          status: orderData.status === 'completed' ? 'completed' : 'active',
          relatedIds: {
            orderId: orderDoc.id
          },
          projectName: orderData.projectName || '',
          client: orderData.client || '',
          assignee: orderData.assignee,
          quantity: orderData.quantity,
          priority: orderData.priority || 'medium',
          tags: orderData.tags || [],
          notes: orderData.description,
          createdAt: orderData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 関連する工程データを検索
        const processesQuery = query(
          collection(db, 'companyTasks'),
          where('managementNumber', '==', managementNumber),
          limit(1)
        );
        const processesSnapshot = await getDocs(processesQuery);

        if (!processesSnapshot.empty) {
          const processDoc = processesSnapshot.docs[0];
          newRecord.relatedIds.processId = processDoc.id;
        }

        // 関連する工数データを検索
        const workHoursQuery = query(
          collection(db, 'workHours'),
          where('managementNumber', '==', managementNumber),
          limit(1)
        );
        const workHoursSnapshot = await getDocs(workHoursQuery);

        if (!workHoursSnapshot.empty) {
          const workHoursDoc = workHoursSnapshot.docs[0];
          newRecord.relatedIds.workHoursId = workHoursDoc.id;
        }

        // レコードを保存
        const recordRef = doc(collection(db, 'management-numbers'));
        await setDoc(recordRef, newRecord);

        const repairedRecord = { id: recordRef.id, ...newRecord };

        console.log(`✅ 管理番号レコードを修復しました: ${managementNumber}`);
        logSecurityEvent('management_number_repaired', {
          managementNumber,
          recordId: recordRef.id,
          foundRelatedIds: Object.keys(newRecord.relatedIds).length
        });

        return repairedRecord;
      }

      console.log(`❌ 修復対象のデータが見つかりません: ${managementNumber}`);
      return null;

    } catch (error) {
      console.error('管理番号レコード修復エラー:', error);
      return null;
    }
  }

  /**
   * 拡張検索: 管理番号レコードが見つからない場合は修復を試行
   */
  public async findByManagementNumberWithRepair(managementNumber: string): Promise<ManagementNumberRecord | null> {
    // まず通常の検索を試行
    let record = await this.findByManagementNumber(managementNumber);

    if (!record) {
      // 見つからない場合は修復を試行
      console.log(`🔍 管理番号レコードが見つかりません。修復を試行します: ${managementNumber}`);
      record = await this.repairMissingRecord(managementNumber);
    }

    return record;
  }

  // =============================================================================
  // 検索・統計
  // =============================================================================

  /**
   * 条件に基づいてレコードを検索
   */
  public async searchRecords(filters: {
    type?: ManagementNumberRecord['type'];
    status?: ManagementNumberRecord['status'];
    client?: string;
    assignee?: string;
    priority?: ManagementNumberRecord['priority'];
    dateRange?: { start: string; end: string };
    limit?: number;
  }): Promise<ManagementNumberRecord[]> {
    let q = collection(db, 'management-numbers');
    const constraints = [];

    if (filters.type) {
      constraints.push(where('type', '==', filters.type));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.client) {
      constraints.push(where('client', '==', filters.client));
    }
    if (filters.assignee) {
      constraints.push(where('assignee', '==', filters.assignee));
    }
    if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }

    if (filters.dateRange) {
      constraints.push(where('createdAt', '>=', filters.dateRange.start));
      constraints.push(where('createdAt', '<=', filters.dateRange.end));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ManagementNumberRecord[];
  }

  /**
   * 製番から関連する全てのデータを取得
   */
  public async getRelatedData(managementNumber: string): Promise<{
    record: ManagementNumberRecord | null;
    orderData?: any;
    processData?: any;
    workHoursData?: any;
    dailyReports?: any[];
  }> {
    const record = await this.findByManagementNumberWithRepair(managementNumber);
    
    if (!record) {
      return { record: null };
    }

    const result: any = { record };

    // 関連データを並列取得
    const promises = [];

    if (record.relatedIds.orderId) {
      promises.push(
        getDoc(doc(db, 'orders', record.relatedIds.orderId))
          .then(doc => doc.exists() ? { orderData: { id: doc.id, ...doc.data() } } : {})
      );
    }

    if (record.relatedIds.processId) {
      promises.push(
        getDoc(doc(db, 'processes', record.relatedIds.processId))
          .then(doc => doc.exists() ? { processData: { id: doc.id, ...doc.data() } } : {})
      );
    }

    if (record.relatedIds.workHoursId) {
      promises.push(
        getDoc(doc(db, 'workHours', record.relatedIds.workHoursId))
          .then(doc => doc.exists() ? { workHoursData: { id: doc.id, ...doc.data() } } : {})
      );
    }

    if (record.relatedIds.dailyReportIds?.length) {
      const reportPromises = record.relatedIds.dailyReportIds.map(reportId =>
        getDoc(doc(db, 'daily-reports', reportId))
          .then(doc => doc.exists() ? { id: doc.id, ...doc.data() } : null)
      );
      promises.push(
        Promise.all(reportPromises)
          .then(reports => ({ dailyReports: reports.filter(r => r !== null) }))
      );
    }

    const relatedData = await Promise.all(promises);
    
    // 結果をマージ
    relatedData.forEach(data => {
      Object.assign(result, data);
    });

    return result;
  }

  // =============================================================================
  // バッチ処理
  // =============================================================================

  /**
   * 複数の製番を一括でステータス更新
   */
  public async batchUpdateStatus(
    managementNumbers: string[],
    status: ManagementNumberRecord['status']
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const batch = writeBatch(db);
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // 各製番のレコードを取得
      for (const managementNumber of managementNumbers) {
        try {
          const record = await this.findByManagementNumberWithRepair(managementNumber);
          if (!record) {
            results.failed++;
            results.errors.push(`Management number not found: ${managementNumber}`);
            continue;
          }

          const updateData: any = {
            status,
            updatedAt: new Date().toISOString()
          };

          if (status === 'completed') {
            updateData.completedAt = new Date().toISOString();
          }

          batch.update(doc(db, 'management-numbers', record.id), updateData);
          results.success++;

        } catch (error: any) {
          results.failed++;
          results.errors.push(`Failed to process ${managementNumber}: ${error.message}`);
        }
      }

      // バッチ実行
      await batch.commit();

      logSecurityEvent('management_numbers_batch_updated', {
        count: managementNumbers.length,
        newStatus: status,
        successCount: results.success,
        failedCount: results.failed
      });

    } catch (error: any) {
      results.errors.push(`Batch commit failed: ${error.message}`);
    }

    return results;
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const managementNumberManager = ManagementNumberManager.getInstance();

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * 製番から関連データを全て取得（簡易版）
 */
export const getManagementNumberDetails = async (managementNumber: string) => {
  return await managementNumberManager.getRelatedData(managementNumber);
};

/**
 * 新しい受注の製番を生成
 */
export const generateOrderNumber = async (projectName: string, client: string, assignee?: string) => {
  return await managementNumberManager.generateManagementNumber('order', {
    projectName,
    client,
    assignee
  });
};

/**
 * 製番の存在確認（拡張版 - 修復機能付き）
 */
export const validateManagementNumber = async (managementNumber: string): Promise<boolean> => {
  const record = await managementNumberManager.findByManagementNumberWithRepair(managementNumber);
  return record !== null && record.status === 'active';
};

/**
 * 管理番号から関連データを全て取得（拡張版 - 修復機能付き）
 */
export const getManagementNumberDetailsWithRepair = async (managementNumber: string) => {
  const record = await managementNumberManager.findByManagementNumberWithRepair(managementNumber);

  if (!record) {
    return { record: null };
  }

  const result: any = { record };

  // 関連データを並列取得
  const promises = [];

  if (record.relatedIds.orderId) {
    promises.push(
      getDoc(doc(db, 'orders', record.relatedIds.orderId))
        .then(doc => doc.exists() ? { orderData: { id: doc.id, ...doc.data() } } : {})
    );
  }

  if (record.relatedIds.processId) {
    promises.push(
      getDoc(doc(db, 'companyTasks', record.relatedIds.processId))
        .then(doc => doc.exists() ? { processData: { id: doc.id, ...doc.data() } } : {})
    );
  }

  if (record.relatedIds.workHoursId) {
    promises.push(
      getDoc(doc(db, 'workHours', record.relatedIds.workHoursId))
        .then(doc => doc.exists() ? { workHoursData: { id: doc.id, ...doc.data() } } : {})
    );
  }

  if (record.relatedIds.dailyReportIds?.length) {
    const reportPromises = record.relatedIds.dailyReportIds.map(reportId =>
      getDoc(doc(db, 'daily-reports', reportId))
        .then(doc => doc.exists() ? { id: doc.id, ...doc.data() } : null)
    );
    promises.push(
      Promise.all(reportPromises)
        .then(reports => ({ dailyReports: reports.filter(r => r !== null) }))
    );
  }

  const relatedData = await Promise.all(promises);

  // 結果をマージ
  relatedData.forEach(data => {
    Object.assign(result, data);
  });

  return result;
};

export default ManagementNumberManager;