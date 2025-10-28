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
  Unsubscribe
} from 'firebase/firestore';
import { db } from './config';

// 既存のActivityLog型を再利用
export interface ActivityLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  entityType: 'order' | 'task' | 'report' | 'user' | 'system' | 'notification' | 'bookmark';
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'success';
  ipAddress?: string;
  userAgent?: string;
}

// Firestoreに保存する際の型（Dateフィールドを変換）
export interface ActivityLogFirestore extends Omit<ActivityLog, 'timestamp'> {
  timestamp: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// コレクション名
export const ACTIVITY_LOGS_COLLECTION = 'activity-logs';

// フィルター条件の型
export interface ActivityLogFilters {
  entityType?: string;
  severity?: string;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// ページネーション設定
export const LOGS_PER_PAGE = 20;

/**
 * 活動ログを作成
 */
export const createActivityLog = async (logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<{
  id: string | null;
  error: string | null;
}> => {
  try {
    const timestamp = serverTimestamp();
    const docData: Omit<ActivityLogFirestore, 'id'> = {
      ...logData,
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docRef = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), docData);
    console.log('✅ Activity log created:', docRef.id);

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('❌ Error creating activity log:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 活動ログを取得（フィルタリング・ページネーション対応）
 */
export const getActivityLogs = async (
  filters: ActivityLogFilters = {},
  limitCount: number = LOGS_PER_PAGE,
  lastDoc?: DocumentSnapshot
): Promise<{
  data: ActivityLog[];
  lastVisible: DocumentSnapshot | null;
  error: string | null;
}> => {
  try {
    const constraints: QueryConstraint[] = [];

    // フィルタ条件を追加
    if (filters.entityType && filters.entityType !== 'all') {
      constraints.push(where('entityType', '==', filters.entityType));
    }

    if (filters.severity && filters.severity !== 'all') {
      constraints.push(where('severity', '==', filters.severity));
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
    constraints.push(limit(limitCount));

    // ページネーション（最後のドキュメントから続行）
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const logs: ActivityLog[] = [];
    let lastVisible: DocumentSnapshot | null = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<ActivityLogFirestore, 'id'>;
      const log: ActivityLog = {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
      };

      // 検索クエリでの追加フィルタリング（クライアント側）
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const matches =
          log.description.toLowerCase().includes(searchLower) ||
          log.userName.toLowerCase().includes(searchLower) ||
          log.entityName?.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower);

        if (matches) {
          logs.push(log);
        }
      } else {
        logs.push(log);
      }

      lastVisible = doc;
    });

    console.log(`✅ Retrieved ${logs.length} activity logs`);
    return { data: logs, lastVisible, error: null };
  } catch (error: any) {
    console.error('❌ Error getting activity logs:', error);
    return { data: [], lastVisible: null, error: error.message };
  }
};

/**
 * 活動ログをリアルタイム監視
 */
export const subscribeToActivityLogs = (
  filters: ActivityLogFilters = {},
  limitCount: number = LOGS_PER_PAGE,
  callback: (logs: ActivityLog[], error?: string) => void
): Unsubscribe => {
  try {
    const constraints: QueryConstraint[] = [];

    // フィルタ条件を追加
    if (filters.entityType && filters.entityType !== 'all') {
      constraints.push(where('entityType', '==', filters.entityType));
    }

    if (filters.severity && filters.severity !== 'all') {
      constraints.push(where('severity', '==', filters.severity));
    }

    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    // 日付範囲フィルタ
    if (filters.dateRange) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.dateRange.start)));
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.dateRange.end)));
    }

    // 並び順と件数制限
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), ...constraints);

    return onSnapshot(
      q,
      (querySnapshot) => {
        const logs: ActivityLog[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<ActivityLogFirestore, 'id'>;
          const log: ActivityLog = {
            id: doc.id,
            ...data,
            timestamp: data.timestamp.toDate(),
          };

          // 検索クエリでの追加フィルタリング（クライアント側）
          if (filters.searchQuery) {
            const searchLower = filters.searchQuery.toLowerCase();
            const matches =
              log.description.toLowerCase().includes(searchLower) ||
              log.userName.toLowerCase().includes(searchLower) ||
              log.entityName?.toLowerCase().includes(searchLower) ||
              log.action.toLowerCase().includes(searchLower);

            if (matches) {
              logs.push(log);
            }
          } else {
            logs.push(log);
          }
        });

        console.log(`🔄 Real-time update: ${logs.length} activity logs`);
        callback(logs);
      },
      (error) => {
        console.error('❌ Error in real-time activity logs subscription:', error);
        callback([], error.message);
      }
    );
  } catch (error: any) {
    console.error('❌ Error setting up activity logs subscription:', error);
    callback([], error.message);
    return () => {}; // 空の unsubscribe 関数を返す
  }
};

/**
 * ユーザーの活動統計を取得
 */
export const getActivityStats = async (userId?: string): Promise<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  error: string | null;
}> => {
  try {
    const constraints: QueryConstraint[] = [];

    if (userId) {
      constraints.push(where('userId', '==', userId));
    }

    const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let total = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ActivityLogFirestore;
      total++;

      // タイプ別集計
      byType[data.entityType] = (byType[data.entityType] || 0) + 1;

      // 重要度別集計
      bySeverity[data.severity] = (bySeverity[data.severity] || 0) + 1;
    });

    console.log(`✅ Activity stats retrieved: ${total} total activities`);
    return { total, byType, bySeverity, error: null };
  } catch (error: any) {
    console.error('❌ Error getting activity stats:', error);
    return { total: 0, byType: {}, bySeverity: {}, error: error.message };
  }
};

/**
 * 古い活動ログを削除（保持期間管理）
 */
export const cleanupOldLogs = async (daysToKeep: number = 90): Promise<{
  deletedCount: number;
  error: string | null;
}> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
      limit(500) // 一度に削除する件数を制限
    );

    const querySnapshot = await getDocs(q);
    const batch = [];

    querySnapshot.forEach((doc) => {
      batch.push(doc.ref);
    });

    // バッチ削除は実装が複雑なため、個別削除で対応
    // 本格運用時はCloud Functionsでの実装を推奨
    let deletedCount = 0;
    for (const docRef of batch) {
      try {
        await docRef.delete();
        deletedCount++;
      } catch (error) {
        console.warn('Failed to delete log:', docRef.id, error);
      }
    }

    console.log(`✅ Cleaned up ${deletedCount} old activity logs`);
    return { deletedCount, error: null };
  } catch (error: any) {
    console.error('❌ Error cleaning up old logs:', error);
    return { deletedCount: 0, error: error.message };
  }
};

/**
 * IP地址とUser-Agentを取得するヘルパー関数
 */
export const getClientInfo = (): { ipAddress?: string; userAgent?: string } => {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;

  // IP地址の取得は制限があるため、サーバーサイドで実装することを推奨
  // クライアントサイドでは大まかな情報のみ取得
  return {
    userAgent,
    // ipAddress は外部API呼び出しが必要なため、今回は undefined
  };
};

/**
 * 操作タイプに応じた説明文を生成
 */
export const generateActionDescription = (
  action: string,
  entityType: string,
  entityName?: string,
  metadata?: Record<string, any>
): string => {
  const actionMap: Record<string, Record<string, string>> = {
    created: {
      order: `新規受注「${entityName || ''}」を作成しました`,
      task: `タスク「${entityName || ''}」を作成しました`,
      report: `日報「${entityName || ''}」を作成しました`,
      user: `ユーザー「${entityName || ''}」を作成しました`,
      system: `システム設定を更新しました`,
      notification: `通知を作成しました`,
      bookmark: `ブックマーク「${entityName || ''}」を追加しました`,
    },
    updated: {
      order: `受注「${entityName || ''}」を更新しました`,
      task: `タスク「${entityName || ''}」を更新しました`,
      report: `日報「${entityName || ''}」を更新しました`,
      user: `ユーザー情報を更新しました`,
      system: `システム設定を更新しました`,
      notification: `通知設定を更新しました`,
      bookmark: `ブックマーク「${entityName || ''}」を更新しました`,
    },
    deleted: {
      order: `受注「${entityName || ''}」を削除しました`,
      task: `タスク「${entityName || ''}」を削除しました`,
      report: `日報「${entityName || ''}」を削除しました`,
      user: `ユーザー「${entityName || ''}」を削除しました`,
      system: `システムデータを削除しました`,
      notification: `通知を削除しました`,
      bookmark: `ブックマーク「${entityName || ''}」を削除しました`,
    },
    viewed: {
      order: `受注「${entityName || ''}」を閲覧しました`,
      task: `タスク「${entityName || ''}」を閲覧しました`,
      report: `日報「${entityName || ''}」を閲覧しました`,
      user: `ユーザー情報を閲覧しました`,
      system: `システム情報を閲覧しました`,
      notification: `通知を閲覧しました`,
      bookmark: `ブックマーク一覧を閲覧しました`,
    },
    login: {
      user: 'システムにログインしました',
      system: 'システムログイン処理を実行',
    },
    logout: {
      user: 'システムからログアウトしました',
      system: 'システムログアウト処理を実行',
    },
    error: {
      order: `受注処理でエラーが発生しました: ${metadata?.error || ''}`,
      task: `タスク処理でエラーが発生しました: ${metadata?.error || ''}`,
      report: `日報処理でエラーが発生しました: ${metadata?.error || ''}`,
      user: `ユーザー処理でエラーが発生しました: ${metadata?.error || ''}`,
      system: `システムエラーが発生しました: ${metadata?.error || ''}`,
    },
  };

  return actionMap[action]?.[entityType] || `${action}操作を実行しました`;
};