import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLog {
  id: string;
  companyId: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  actionType: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'system';
  resourceType: 'order' | 'process' | 'workHours' | 'dailyReport' | 'user' | 'setting' | 'system';
  resourceId?: string;
  resourceName?: string;
  details?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning';
}

// Firestoreに保存する際の型（Dateフィールドを変換）
export interface AuditLogFirestore extends Omit<AuditLog, 'timestamp'> {
  timestamp: Timestamp;
  createdAt: Timestamp;
}

// フィルター条件
export interface AuditLogFilters {
  companyId?: string;
  actionType?: string;
  resourceType?: string;
  severity?: string;
  status?: string;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const AUDIT_LOGS_COLLECTION = 'auditLogs';
export const LOGS_PER_PAGE = 50;

// アクション種別の日本語マップ
export const ACTION_TYPE_LABELS = {
  create: '作成',
  read: '参照',
  update: '更新',
  delete: '削除',
  login: 'ログイン',
  logout: 'ログアウト',
  system: 'システム',
} as const;

// リソース種別の日本語マップ
export const RESOURCE_TYPE_LABELS = {
  order: '受注案件',
  process: '工程',
  workHours: '工数',
  dailyReport: '日報',
  user: 'ユーザー',
  setting: '設定',
  system: 'システム',
} as const;

// 重要度の日本語マップ
export const SEVERITY_LABELS = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '重要',
} as const;

// ステータスの日本語マップ
export const STATUS_LABELS = {
  success: '成功',
  failure: '失敗',
  warning: '警告',
} as const;

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * 監査ログを作成
 */
export const createAuditLog = async (logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> => {
  try {
    const timestamp = serverTimestamp();
    const auditLogId = uuidv4();

    const docData: Omit<AuditLogFirestore, 'id'> = {
      ...logData,
      timestamp,
      createdAt: timestamp,
    };

    // undefined値を除去（Firestore用）
    const cleanData = removeUndefinedFields(docData);

    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
      id: auditLogId,
      ...cleanData,
    });

    console.log('✅ Audit log created:', auditLogId);
    return { success: true, id: auditLogId };
  } catch (error: any) {
    console.error('❌ Error creating audit log:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 監査ログを取得（フィルタリング・ページネーション対応）
 */
export const getAuditLogs = async (
  filters: AuditLogFilters = {},
  limitCount: number = LOGS_PER_PAGE,
  lastDoc?: DocumentSnapshot
): Promise<{
  data: AuditLog[];
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
  error?: string;
}> => {
  try {
    const constraints: QueryConstraint[] = [];

    // 企業IDフィルタは必須
    if (filters.companyId) {
      constraints.push(where('companyId', '==', filters.companyId));
    }

    // その他のフィルタ条件
    if (filters.actionType && filters.actionType !== 'all') {
      constraints.push(where('actionType', '==', filters.actionType));
    }

    if (filters.resourceType && filters.resourceType !== 'all') {
      constraints.push(where('resourceType', '==', filters.resourceType));
    }

    if (filters.severity && filters.severity !== 'all') {
      constraints.push(where('severity', '==', filters.severity));
    }

    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    // 日付範囲フィルタ
    if (filters.dateRange) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.dateRange.start)));
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.dateRange.end)));
    }

    // 並び順とページネーション
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount + 1)); // hasMoreを判定するため+1

    // ページネーション（最後のドキュメントから続行）
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const logs: AuditLog[] = [];
    let lastVisible: DocumentSnapshot | null = null;
    let hasMore = false;

    querySnapshot.forEach((doc, index) => {
      // limitCount+1で取得しているので、最後の1件はhasMoreの判定用
      if (index >= limitCount) {
        hasMore = true;
        return;
      }

      const data = doc.data() as Omit<AuditLogFirestore, 'id'>;
      const log: AuditLog = {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
      };

      // 検索クエリでの追加フィルタリング（クライアント側）
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const matches =
          log.action.toLowerCase().includes(searchLower) ||
          log.userName.toLowerCase().includes(searchLower) ||
          log.resourceName?.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower);

        if (matches) {
          logs.push(log);
        }
      } else {
        logs.push(log);
      }

      if (index === limitCount - 1) {
        lastVisible = doc;
      }
    });

    console.log(`✅ Retrieved ${logs.length} audit logs`);
    return { data: logs, lastVisible, hasMore, error: undefined };
  } catch (error: any) {
    console.error('❌ Error getting audit logs:', error);
    return { data: [], lastVisible: null, hasMore: false, error: error.message };
  }
};

/**
 * 監査ログをリアルタイム監視
 */
export const subscribeToAuditLogs = (
  filters: AuditLogFilters = {},
  limitCount: number = LOGS_PER_PAGE,
  callback: (logs: AuditLog[], error?: string) => void
): Unsubscribe => {
  try {
    const constraints: QueryConstraint[] = [];

    // 企業IDフィルタは必須
    if (filters.companyId) {
      constraints.push(where('companyId', '==', filters.companyId));
    }

    // その他のフィルタ条件
    if (filters.actionType && filters.actionType !== 'all') {
      constraints.push(where('actionType', '==', filters.actionType));
    }

    if (filters.resourceType && filters.resourceType !== 'all') {
      constraints.push(where('resourceType', '==', filters.resourceType));
    }

    if (filters.severity && filters.severity !== 'all') {
      constraints.push(where('severity', '==', filters.severity));
    }

    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    // 並び順と件数制限
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);

    return onSnapshot(
      q,
      (querySnapshot) => {
        const logs: AuditLog[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<AuditLogFirestore, 'id'>;
          const log: AuditLog = {
            id: doc.id,
            ...data,
            timestamp: data.timestamp.toDate(),
          };

          // 検索クエリでの追加フィルタリング（クライアント側）
          if (filters.searchQuery) {
            const searchLower = filters.searchQuery.toLowerCase();
            const matches =
              log.action.toLowerCase().includes(searchLower) ||
              log.userName.toLowerCase().includes(searchLower) ||
              log.resourceName?.toLowerCase().includes(searchLower) ||
              log.details?.toLowerCase().includes(searchLower);

            if (matches) {
              logs.push(log);
            }
          } else {
            logs.push(log);
          }
        });

        console.log(`🔄 Real-time audit logs update: ${logs.length} logs`);
        callback(logs);
      },
      (error) => {
        console.error('❌ Error in real-time audit logs subscription:', error);
        callback([], error.message);
      }
    );
  } catch (error: any) {
    console.error('❌ Error setting up audit logs subscription:', error);
    callback([], error.message);
    return () => {}; // 空の unsubscribe 関数を返す
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * 業務操作のログを簡単に作成するヘルパー関数
 */
export const logBusinessAction = async (params: {
  companyId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  actionType: AuditLog['actionType'];
  resourceType: AuditLog['resourceType'];
  resourceId?: string;
  resourceName?: string;
  details?: string;
  metadata?: Record<string, any>;
  severity?: AuditLog['severity'];
  status?: AuditLog['status'];
}): Promise<void> => {
  const clientInfo = getClientInfo();

  const result = await createAuditLog({
    companyId: params.companyId,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    actionType: params.actionType,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    resourceName: params.resourceName,
    details: params.details || generateActionDescription(params.action, params.resourceType, params.resourceName),
    metadata: params.metadata,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    severity: params.severity || 'low',
    status: params.status || 'success',
  });

  if (!result.success) {
    console.error('監査ログの作成に失敗:', result.error);
  }
};

/**
 * 操作タイプに応じた説明文を生成
 */
export const generateActionDescription = (
  action: string,
  resourceType: string,
  resourceName?: string,
  metadata?: Record<string, any>
): string => {
  const resourceLabel = RESOURCE_TYPE_LABELS[resourceType as keyof typeof RESOURCE_TYPE_LABELS] || resourceType;
  const name = resourceName ? `「${resourceName}」` : '';

  switch (action) {
    case 'created':
      return `${resourceLabel}${name}を作成しました`;
    case 'updated':
      return `${resourceLabel}${name}を更新しました`;
    case 'deleted':
      return `${resourceLabel}${name}を削除しました`;
    case 'viewed':
      return `${resourceLabel}${name}を閲覧しました`;
    case 'exported':
      return `${resourceLabel}${name}をエクスポートしました`;
    case 'approved':
      return `${resourceLabel}${name}を承認しました`;
    case 'rejected':
      return `${resourceLabel}${name}を却下しました`;
    case 'completed':
      return `${resourceLabel}${name}を完了しました`;
    case 'started':
      return `${resourceLabel}${name}を開始しました`;
    default:
      return `${resourceLabel}${name}の${action}操作を実行しました`;
  }
};

/**
 * IP地址とUser-Agentを取得するヘルパー関数
 */
export const getClientInfo = (): { ipAddress?: string; userAgent?: string } => {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;

  // IP地址の取得は制限があるため、サーバーサイドで実装することを推奨
  return {
    userAgent,
    // ipAddress は外部API呼び出しが必要なため、今回は undefined
  };
};

/**
 * undefined値を除去するヘルパー関数（Firestore用）
 */
export function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  if (typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && !(obj[key] instanceof Timestamp)) {
          cleaned[key] = removeUndefinedFields(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    });
    return cleaned;
  }

  return obj;
}

/**
 * 監査ログの統計情報を取得
 */
export const getAuditLogStats = async (companyId: string, days: number = 30): Promise<{
  total: number;
  byActionType: Record<string, number>;
  byResourceType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  error?: string;
}> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const constraints: QueryConstraint[] = [
      where('companyId', '==', companyId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
    ];

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const byActionType: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let total = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data() as AuditLogFirestore;
      total++;

      // アクション種別集計
      byActionType[data.actionType] = (byActionType[data.actionType] || 0) + 1;

      // リソース種別集計
      byResourceType[data.resourceType] = (byResourceType[data.resourceType] || 0) + 1;

      // 重要度別集計
      bySeverity[data.severity] = (bySeverity[data.severity] || 0) + 1;

      // ステータス別集計
      byStatus[data.status] = (byStatus[data.status] || 0) + 1;
    });

    console.log(`✅ Audit log stats retrieved: ${total} total logs in ${days} days`);
    return { total, byActionType, byResourceType, bySeverity, byStatus };
  } catch (error: any) {
    console.error('❌ Error getting audit log stats:', error);
    return { total: 0, byActionType: {}, byResourceType: {}, bySeverity: {}, byStatus: {}, error: error.message };
  }
};

/**
 * 古い監査ログを削除（保持期間管理）
 */
export const cleanupOldAuditLogs = async (companyId: string, daysToKeep: number = 365): Promise<{
  deletedCount: number;
  error?: string;
}> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('companyId', '==', companyId),
      where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
      limit(100) // 一度に削除する件数を制限
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    let batchCount = 0;
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      batchCount++;
    });

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Cleaned up ${batchCount} old audit logs`);
    return { deletedCount: batchCount };
  } catch (error: any) {
    console.error('❌ Error cleaning up old audit logs:', error);
    return { deletedCount: 0, error: error.message };
  }
};