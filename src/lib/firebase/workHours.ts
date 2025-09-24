import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  WorkHours,
  EnhancedWorkHours,
  WorkHoursAdjustment,
  WorkHoursHistory,
  WorkHoursAnalytics,
  WorkHoursApprovalWorkflow,
  SyncResult,
  DailyReportEntry,
  ActualHours
} from '@/app/tasks/types';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Firestore用のデータをサニタイズ（undefined値を完全に除去）
 */
const sanitizeForFirestore = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }
  
  // serverTimestamp()の場合はそのまま返す
  if (typeof data === 'function' || (data && data._methodName === 'serverTimestamp')) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  
  if (typeof data === 'object' && data !== null) {
    const cleaned: any = {};
    Object.entries(data).forEach(([key, value]) => {
      const sanitizedValue = sanitizeForFirestore(value);
      if (sanitizedValue !== undefined) {
        cleaned[key] = sanitizedValue;
      }
    });
    return cleaned;
  }
  
  return data;
};

// =============================================================================
// FIREBASE WORK_HOURS_COLLECTIONS
// =============================================================================

export const WORK_HOURS_COLLECTIONS = {
  WORK_HOURS: 'workHours',
  WORK_HOURS_ADJUSTMENTS: 'workHoursAdjustments',
  WORK_HOURS_HISTORY: 'workHoursHistory',
  WORK_HOURS_ANALYTICS: 'workHoursAnalytics',
  WORK_HOURS_WORKFLOWS: 'workHoursWorkflows',
  WORK_HOURS_CONFIG: 'workHoursConfig',
} as const;

// =============================================================================
// WORK HOURS CRUD OPERATIONS
// =============================================================================

/**
 * 新しい工数レコードを作成
 */
export const createWorkHours = async (
  workHoursData: Omit<WorkHours, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const enhancedData: Omit<EnhancedWorkHours, 'id' | 'createdAt' | 'updatedAt'> = {
      ...workHoursData,
      version: 1,
      locked: false,
      priority: 'medium',
      tags: [],
      integrations: {
        dailyReportIds: [],
        adjustmentIds: []
      },
      // undefined値のフィールドにデフォルト値を設定
      lastSyncedAt: undefined,
      syncSource: undefined,
      lockedBy: undefined,
      lockedAt: undefined,
      estimatedCompletionDate: undefined,
      actualCompletionDate: undefined,
      qualityMetrics: undefined
    };

    // undefined値を除去
    const cleanedData = Object.fromEntries(
      Object.entries({
        ...enhancedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).filter(([_, value]) => value !== undefined)
    );

    const docRef = await addDoc(collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS), sanitizeForFirestore(cleanedData));

    // 管理番号システムに工数IDを関連付け
    if (workHoursData.managementNumber) {
      try {
        const { managementNumberManager } = await import('../utils/managementNumber');
        await managementNumberManager.linkRelatedId(
          workHoursData.managementNumber,
          'workHoursId',
          docRef.id
        );
        console.log(`✅ 工数ID同期完了: ${docRef.id} -> ${workHoursData.managementNumber}`);
      } catch (linkError) {
        console.error('管理番号同期エラー:', linkError);
        // 同期エラーは警告として記録するが、作成は成功として扱う
      }
    }

    // 履歴記録
    await createWorkHoursHistory({
      workHoursId: docRef.id || '',
      timestamp: new Date().toISOString(),
      changeType: 'created',
      changes: [],
      triggeredBy: 'system',
      source: 'manual',
      metadata: {}
    });

    return { id: docRef.id, error: null };
  } catch (error: Error | unknown) {
    console.error('Error creating work hours:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 工数レコードを取得
 */
export const getWorkHours = async (
  workHoursId: string
): Promise<{ data: EnhancedWorkHours | null; error: string | null }> => {
  try {
    const docRef = doc(db, WORK_HOURS_COLLECTIONS.WORK_HOURS, workHoursId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || '',
          updatedAt: data.updatedAt?.toDate()?.toISOString() || ''
        } as EnhancedWorkHours,
        error: null
      };
    } else {
      return { data: null, error: 'Work hours record not found' };
    }
  } catch (error: Error | unknown) {
    console.error('Error getting work hours:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 複数の工数レコードを取得
 */
export const getWorkHoursList = async (filters?: {
  orderId?: string;
  processId?: string;
  status?: WorkHours['status'];
  client?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
}): Promise<{ data: EnhancedWorkHours[]; error: string | null }> => {
  try {
    let q = collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS);
    const constraints = [];

    // 複合インデックス対応済み - 複数フィルターが利用可能
    
    // 複合インデックスパターン1: processId + status + createdAt
    if (filters?.processId && filters?.status) {
      constraints.push(where('processId', '==', filters.processId));
      constraints.push(where('status', '==', filters.status));
      constraints.push(orderBy('createdAt', 'desc'));
    }
    // 複合インデックスパターン2: managementNumber + status
    else if (filters?.client && filters?.status) {
      // clientベースの検索は製番管理で重要
      constraints.push(where('client', '==', filters.client));
      constraints.push(where('status', '==', filters.status));
      constraints.push(orderBy('createdAt', 'desc'));
    }
    // 単一フィルター処理
    else {
      if (filters?.processId) {
        constraints.push(where('processId', '==', filters.processId));
      }
      if (filters?.orderId) {
        constraints.push(where('orderId', '==', filters.orderId));
      }
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters?.client) {
        constraints.push(where('client', '==', filters.client));
      }
      
      // 日付範囲フィルタ
      if (filters?.dateRange) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateRange.start))));
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateRange.end))));
      }

      // 並び順
      constraints.push(orderBy('createdAt', 'desc'));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    const data = querySnapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : (typeof docData.createdAt === 'string' ? docData.createdAt : ''),
        updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate().toISOString() : (typeof docData.updatedAt === 'string' ? docData.updatedAt : '')
      } as EnhancedWorkHours;
    });

    return { data, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting work hours list:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 工数レコードを更新
 */
export const updateWorkHours = async (
  workHoursId: string,
  updates: Partial<WorkHours>,
  metadata?: {
    triggeredBy: string;
    source: 'manual' | 'daily-report' | 'approval-workflow' | 'system';
    reason?: string;
  }
): Promise<{ error: string | null }> => {
  try {
    // 現在のデータを取得
    const { data: currentData } = await getWorkHours(workHoursId);
    if (!currentData) {
      return { error: 'Work hours record not found' };
    }

    // ロック状態チェック
    if (currentData.locked && metadata?.source !== 'system') {
      return { error: 'Work hours record is locked and cannot be modified' };
    }

    const batch = writeBatch(db);
    const workHoursRef = doc(db, WORK_HOURS_COLLECTIONS.WORK_HOURS, workHoursId);

    // 変更履歴を作成
    const changes = Object.entries(updates)
      .filter(([key, value]) => {
        const currentValue = (currentData as Record<string, any>)[key];
        return JSON.stringify(currentValue) !== JSON.stringify(value);
      })
      .map(([field, newValue]) => ({
        field,
        oldValue: (currentData as Record<string, any>)[field],
        newValue
      }));

    if (changes.length === 0) {
      return { error: null }; // 変更がない場合は何もしない
    }

    // バージョン更新
    const newVersion = (currentData.version || 1) + 1;

    // メインドキュメントを更新（undefined値を除去）
    const cleanedUpdates = Object.fromEntries(
      Object.entries({
        ...updates,
        version: newVersion,
        updatedAt: serverTimestamp()
      }).filter(([_, value]) => value !== undefined)
    );
    batch.update(workHoursRef, sanitizeForFirestore(cleanedUpdates));

    // 履歴を記録
    const historyRef = doc(collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS_HISTORY));
    const historyData = {
      workHoursId: workHoursId || '',
      timestamp: serverTimestamp(),
      changeType: 'updated' as const,
      changes: changes || [],
      triggeredBy: metadata?.triggeredBy || 'system',
      source: metadata?.source || 'manual',
      metadata: metadata?.reason ? { reason: metadata.reason } : {}
    };
    batch.set(historyRef, sanitizeForFirestore(historyData));

    await batch.commit();

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating work hours:', error);
    return { error: error.message };
  }
};

/**
 * 工数レコードを削除
 */
export const deleteWorkHours = async (
  workHoursId: string,
  triggeredBy: string
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);
    
    // メインドキュメントを削除
    const workHoursRef = doc(db, WORK_HOURS_COLLECTIONS.WORK_HOURS, workHoursId);
    batch.delete(workHoursRef);

    // 履歴を記録
    const historyRef = doc(collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS_HISTORY));
    const historyData = {
      workHoursId: workHoursId || '',
      timestamp: serverTimestamp(),
      changeType: 'deleted' as const,
      changes: [],
      triggeredBy: triggeredBy || 'system',
      source: 'manual' as const,
      metadata: {}
    };
    batch.set(historyRef, sanitizeForFirestore(historyData));

    await batch.commit();

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting work hours:', error);
    return { error: error.message };
  }
};

// =============================================================================
// DAILY REPORT INTEGRATION
// =============================================================================

/**
 * 日報データから工数を同期
 */
export const syncWorkHoursFromDailyReport = async (
  dailyReport: DailyReportEntry
): Promise<SyncResult> => {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    syncedEntries: 0,
    updatedWorkHours: [],
    errors: [],
    warnings: [],
    metadata: {
      syncedAt: new Date().toISOString(),
      syncSource: 'daily-report',
      totalProcessingTime: 0
    }
  };

  try {
    // 製番別に作業時間をグループ化
    const workTimeByProductionNumber = dailyReport.workTimeEntries.reduce((acc, entry) => {
      if (!acc[entry.productionNumber]) {
        acc[entry.productionNumber] = [];
      }
      acc[entry.productionNumber].push(entry);
      return acc;
    }, {} as Record<string, typeof dailyReport.workTimeEntries>);

    // 各製番の工数を更新
    for (const [productionNumber, entries] of Object.entries(workTimeByProductionNumber)) {
      try {
        // 製番管理システムを使用して正確に検索
        const { managementNumberManager } = await import('../utils/managementNumber');
        
        // 1. 製番でレコードを直接検索（修復機能付き）
        const managementRecord = await managementNumberManager.findByManagementNumberWithRepair(productionNumber);
        
        let matchingWorkHours = null;
        
        if (managementRecord?.relatedIds?.workHoursId) {
          // 製番管理から工数IDを取得
          const { data: workHours } = await getWorkHours(managementRecord.relatedIds.workHoursId);
          matchingWorkHours = workHours;
        } else {
          // フォールバック: managementNumberで直接検索
          const { data: workHoursList } = await getWorkHoursList({
            limit: 50
          });
          
          matchingWorkHours = workHoursList.find(wh => 
            wh.managementNumber === productionNumber
          );
        }

        if (!matchingWorkHours) {
          result.warnings.push({
            type: 'no_matching_work_hours',
            message: `製番 ${productionNumber} に対応する工数レコードが見つかりません`,
            data: { productionNumber, entries: entries.length }
          });
          continue;
        }

        // 実績時間を計算
        const actualHours = calculateActualHoursFromEntries(entries);

        // 同期状態をチェック（重複同期を避ける）
        const alreadySynced = matchingWorkHours.integrations?.dailyReportIds?.includes(dailyReport.id);
        
        if (alreadySynced) {
          result.warnings.push({
            type: 'already_synced',
            message: `日報 ${dailyReport.id} は既に製番 ${productionNumber} の工数と同期済み`,
            data: { productionNumber, dailyReportId: dailyReport.id }
          });
          continue;
        }

        // 実績時間を既存値に加算（累積）
        const currentActual = matchingWorkHours.actualHours || { setup: 0, machining: 0, finishing: 0, total: 0 };
        const updatedActualHours = {
          setup: Math.round((currentActual.setup + actualHours.setup) * 100) / 100,
          machining: Math.round((currentActual.machining + actualHours.machining) * 100) / 100,
          finishing: Math.round((currentActual.finishing + actualHours.finishing) * 100) / 100,
          total: Math.round((currentActual.total + actualHours.total) * 100) / 100
        };

        // 工数レコードを更新（統合情報も同時に更新）
        const updateResult = await updateWorkHours(
          matchingWorkHours.id,
          { 
            actualHours: updatedActualHours,
            lastSyncedAt: new Date().toISOString(),
            syncSource: 'daily-report'
          } as Partial<EnhancedWorkHours>,
          {
            triggeredBy: dailyReport.workerId,
            source: 'daily-report',
            reason: `日報ID: ${dailyReport.id} からの自動同期`
          }
        );

        if (updateResult.error) {
          result.errors.push({
            type: 'update_failed',
            message: `工数レコード ${matchingWorkHours.id} の更新に失敗`,
            data: { workHoursId: matchingWorkHours.id, error: updateResult.error }
          });
        } else {
          result.syncedEntries++;
          result.updatedWorkHours.push(matchingWorkHours.id);
          
          // 製番管理に日報IDを関連付け
          if (managementRecord) {
            await managementNumberManager.linkRelatedId(
              productionNumber, 
              'dailyReportIds', 
              dailyReport.id
            );
          }
        }
      } catch (error: Error | unknown) {
        result.errors.push({
          type: 'processing_error',
          message: `製番 ${productionNumber} の処理中にエラーが発生`,
          data: { productionNumber, error: error.message }
        });
      }
    }

    result.success = result.errors.length === 0;
    result.metadata.totalProcessingTime = Date.now() - startTime;

    return result;
  } catch (error: Error | unknown) {
    result.errors.push({
      type: 'sync_error',
      message: 'Daily report sync failed',
      data: { error: error.message }
    });
    result.metadata.totalProcessingTime = Date.now() - startTime;
    return result;
  }
};

/**
 * 作業時間エントリから実績時間を計算
 */
export const calculateActualHoursFromEntries = (
  entries: DailyReportEntry['workTimeEntries']
): ActualHours => {
  const timeByContent = entries.reduce((acc, entry) => {
    const contentName = entry.workContentName.toLowerCase();
    const hours = entry.durationMinutes / 60;

    if (contentName.includes('段取り') || contentName.includes('セットアップ')) {
      acc.setup += hours;
    } else if (contentName.includes('機械加工') || contentName.includes('加工')) {
      acc.machining += hours;
    } else if (contentName.includes('仕上げ') || contentName.includes('検査')) {
      acc.finishing += hours;
    } else {
      acc.finishing += hours; // その他は仕上げに分類
    }

    return acc;
  }, { setup: 0, machining: 0, finishing: 0 });

  return {
    setup: Math.round(timeByContent.setup * 100) / 100,
    machining: Math.round(timeByContent.machining * 100) / 100,
    finishing: Math.round(timeByContent.finishing * 100) / 100,
    total: Math.round((timeByContent.setup + timeByContent.machining + timeByContent.finishing) * 100) / 100
  };
};

// =============================================================================
// WORK HOURS HISTORY OPERATIONS
// =============================================================================

/**
 * 工数履歴を作成
 */
export const createWorkHoursHistory = async (
  historyData: Omit<WorkHoursHistory, 'id'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    // undefined値を排除し、デフォルト値を設定
    const cleanedData = {
      workHoursId: historyData.workHoursId || '',
      timestamp: serverTimestamp(),
      changeType: historyData.changeType || 'updated',
      changes: historyData.changes || [],
      triggeredBy: historyData.triggeredBy || 'system',
      source: historyData.source || 'manual',
      metadata: historyData.metadata || {}
    };

    const docRef = await addDoc(collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS_HISTORY), sanitizeForFirestore(cleanedData));

    return { id: docRef.id, error: null };
  } catch (error: Error | unknown) {
    console.error('Error creating work hours history:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 工数履歴を取得
 */
export const getWorkHoursHistory = async (
  workHoursId: string,
  limitCount?: number
): Promise<{ data: WorkHoursHistory[]; error: string | null }> => {
  try {
    const constraints: any[] = [
      where('workHoursId', '==', workHoursId),
      orderBy('timestamp', 'desc')
    ];

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const querySnapshot = await getDocs(query(
      collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS_HISTORY),
      ...constraints
    ));

    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()?.toISOString() || ''
    })) as WorkHoursHistory[];

    return { data, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting work hours history:', error);
    return { data: [], error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 工数レコードの変更をリアルタイムで監視
 */
export const subscribeToWorkHours = (
  workHoursId: string,
  callback: (data: EnhancedWorkHours | null) => void
): (() => void) => {
  const docRef = doc(db, WORK_HOURS_COLLECTIONS.WORK_HOURS, workHoursId);

  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || '',
        updatedAt: data.updatedAt?.toDate()?.toISOString() || ''
      } as EnhancedWorkHours);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in work hours subscription:', error);
    callback(null);
  });
};

/**
 * 工数リストの変更をリアルタイムで監視
 */
export const subscribeToWorkHoursList = (
  filters: Parameters<typeof getWorkHoursList>[0],
  callback: (data: EnhancedWorkHours[]) => void
): (() => void) => {
  let q = collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS);
  const constraints = [];

  // 複合インデックスが必要なクエリを避けるため、単一フィールドクエリのみ使用
  const priorityOrder = ['processId', 'orderId', 'status', 'client'];
  let appliedFilter = false;

  for (const filterType of priorityOrder) {
    if (appliedFilter) break;
    
    if (filterType === 'processId' && filters?.processId) {
      constraints.push(where('processId', '==', filters.processId));
      appliedFilter = true;
    } else if (filterType === 'orderId' && filters?.orderId) {
      constraints.push(where('orderId', '==', filters.orderId));
      appliedFilter = true;
    } else if (filterType === 'status' && filters?.status) {
      constraints.push(where('status', '==', filters.status));
      appliedFilter = true;
    } else if (filterType === 'client' && filters?.client) {
      constraints.push(where('client', '==', filters.client));
      appliedFilter = true;
    }
  }

  // createdAtでの並び替えは、他のwhereクエリがない場合のみ
  if (!appliedFilter) {
    constraints.push(orderBy('createdAt', 'desc'));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : (typeof docData.createdAt === 'string' ? docData.createdAt : ''),
        updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate().toISOString() : (typeof docData.updatedAt === 'string' ? docData.updatedAt : '')
      } as EnhancedWorkHours;
    });

    callback(data);
  }, (error) => {
    console.error('Error in work hours list subscription:', error);
    callback([]);
  });
};

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * 複数の工数レコードを一括更新
 */
export const bulkUpdateWorkHours = async (
  updates: { id: string; data: Partial<WorkHours> }[],
  metadata?: {
    triggeredBy: string;
    source: 'manual' | 'daily-report' | 'approval-workflow' | 'system';
  }
): Promise<{ success: boolean; errors: { id: string; error: string }[] }> => {
  const batch = writeBatch(db);
  const errors: { id: string; error: string }[] = [];

  try {
    for (const update of updates) {
      try {
        const docRef = doc(db, WORK_HOURS_COLLECTIONS.WORK_HOURS, update.id);
        // undefined値を除去
        const cleanedData = Object.fromEntries(
          Object.entries({
            ...update.data,
            updatedAt: serverTimestamp()
          }).filter(([_, value]) => value !== undefined)
        );
        batch.update(docRef, sanitizeForFirestore(cleanedData));
      } catch (error: Error | unknown) {
        errors.push({ id: update.id, error: error.message });
      }
    }

    if (errors.length === 0) {
      await batch.commit();
    }

    return { success: errors.length === 0, errors };
  } catch (error: Error | unknown) {
    console.error('Error in bulk update:', error);
    return { 
      success: false, 
      errors: updates.map(u => ({ id: u.id, error: error.message }))
    };
  }
};

// =============================================================================
// PROCESS INTEGRATION - 工程からの自動工数生成
// =============================================================================

/**
 * 工程データから工数管理レコードを自動作成
 */
export const createWorkHoursFromProcess = async (
  processId: string,
  processData: any
): Promise<{ id: string | null; error: string | null; workHoursData?: EnhancedWorkHours }> => {
  try {
    // 工程データから工数の初期値を計算
    const estimatedHours = calculateEstimatedHoursFromProcess(processData);
    
    // 工数管理用のデータを構築
    const workHoursData: Omit<WorkHours, 'id' | 'createdAt' | 'updatedAt'> = {
      processId,
      orderId: processData.orderId || '',
      managementNumber: processData.managementNumber || '',
      client: processData.orderClient || '',
      projectName: processData.processName || '',
      unit: processData.unit || 'pcs',
      
      // 予定工数を工程から算出
      estimatedHours,
      
      // 実績は未入力で初期化
      actualHours: {
        setup: 0,
        machining: 0,
        finishing: 0,
        total: 0
      },
      
      // ステータスは計画中で開始
      status: 'planning',
      
      // 工程の担当者を引き継ぎ
      assignee: processData.assignee || '',
      
      // 納期情報を引き継ぎ
      deliveryDate: processData.deliveryDate || '',
      
      // 予算情報（工程から推定）
      budgetInfo: {
        estimatedCost: calculateEstimatedCostFromProcess(processData),
        actualCost: 0,
        laborCost: 0,
        materialCost: 0,
        overheadCost: 0,
        budgetStatus: 'within-budget'
      }
    };

    // 工数レコードを作成
    const result = await createWorkHours(workHoursData);
    
    if (result.id) {
      console.log(`✅ Auto-created work hours: ${result.id} for process: ${processId}`);
      
      // 作成されたデータを取得して返す
      const { data: createdWorkHours } = await getWorkHours(result.id);
      
      return {
        id: result.id,
        error: null,
        workHoursData: createdWorkHours || undefined
      };
    } else {
      return {
        id: null,
        error: result.error || 'Failed to create work hours'
      };
    }
    
  } catch (error: Error | unknown) {
    console.error('Error creating work hours from process:', error);
    return {
      id: null,
      error: error.message || '工程から工数自動生成に失敗しました'
    };
  }
};

/**
 * 工程データから予定工数を計算
 */
const calculateEstimatedHoursFromProcess = (processData: any): ActualHours => {
  // 基本的な工数推定ロジック
  const baseSetupTime = 0.5; // 段取り基準時間（時間）
  const baseMachiningTime = processData.quantity ? processData.quantity * 0.2 : 2; // 加工時間（数量×単価時間）
  const baseFinishingTime = processData.quantity ? processData.quantity * 0.1 : 1; // 仕上げ時間
  
  // 優先度による係数調整
  let priorityMultiplier = 1.0;
  if (processData.priority === 'high') {
    priorityMultiplier = 1.2; // 高優先度は20%増
  } else if (processData.priority === 'low') {
    priorityMultiplier = 0.8; // 低優先度は20%減
  }
  
  const setup = Math.round(baseSetupTime * priorityMultiplier * 100) / 100;
  const machining = Math.round(baseMachiningTime * priorityMultiplier * 100) / 100;
  const finishing = Math.round(baseFinishingTime * priorityMultiplier * 100) / 100;
  
  return {
    setup,
    machining,
    finishing,
    total: Math.round((setup + machining + finishing) * 100) / 100
  };
};

/**
 * 工程データから予算を推定
 */
const calculateEstimatedCostFromProcess = (processData: any): number => {
  // 基本的な単価設定
  const setupCostPerHour = 3000; // 段取り時間単価
  const machiningCostPerHour = 2500; // 加工時間単価
  const finishingCostPerHour = 2000; // 仕上げ時間単価
  
  const estimatedHours = calculateEstimatedHoursFromProcess(processData);
  
  const totalCost = 
    estimatedHours.setup * setupCostPerHour +
    estimatedHours.machining * machiningCostPerHour +
    estimatedHours.finishing * finishingCostPerHour;
    
  return Math.round(totalCost);
};

export {
  // Types for external use
  type WorkHours,
  type EnhancedWorkHours,
  type WorkHoursAdjustment,
  type WorkHoursHistory,
  type SyncResult
};