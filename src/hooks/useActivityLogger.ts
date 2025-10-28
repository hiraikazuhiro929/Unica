import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createActivityLog,
  generateActionDescription,
  getClientInfo,
  ActivityLog
} from '@/lib/firebase/activityLogs';

export type LogAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'uploaded'
  | 'login'
  | 'logout'
  | 'error'
  | 'notification'
  | 'sync'
  | 'comment';

export type LogEntityType =
  | 'order'
  | 'task'
  | 'report'
  | 'user'
  | 'system'
  | 'notification'
  | 'bookmark';

export type LogSeverity = 'info' | 'warning' | 'error' | 'success';

export interface LogOptions {
  entityId?: string;
  entityName?: string;
  description?: string;
  metadata?: Record<string, any>;
  severity?: LogSeverity;
  customUserId?: string;
  customUserName?: string;
}

/**
 * 活動ログ収集用カスタムフック
 *
 * 使用例:
 * ```tsx
 * const { logActivity } = useActivityLogger();
 *
 * // 受注作成ログ
 * await logActivity('created', 'order', {
 *   entityId: orderId,
 *   entityName: orderName,
 *   metadata: { amount: 1500000 }
 * });
 *
 * // エラーログ
 * await logActivity('error', 'system', {
 *   description: 'ファイルアップロードに失敗',
 *   metadata: { error: error.message },
 *   severity: 'error'
 * });
 * ```
 */
export const useActivityLogger = () => {
  const { user } = useAuth();

  /**
   * 活動ログを記録
   */
  const logActivity = useCallback(async (
    action: LogAction,
    entityType: LogEntityType,
    options: LogOptions = {}
  ): Promise<{ success: boolean; error?: string; logId?: string }> => {
    try {
      // 認証状態をチェック
      const currentUser = options.customUserId ? {
        uid: options.customUserId,
        displayName: options.customUserName || 'Unknown',
        name: options.customUserName || 'Unknown'
      } : user;

      if (!currentUser?.uid) {
        console.warn('⚠️ Cannot log activity: User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }

      // クライアント情報を取得
      const clientInfo = getClientInfo();

      // 説明文を生成（カスタム説明がない場合）
      const description = options.description ||
        generateActionDescription(action, entityType, options.entityName, options.metadata);

      // ログデータを構築
      const logData: Omit<ActivityLog, 'id' | 'timestamp'> = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.name || 'Unknown User',
        action,
        entityType,
        entityId: options.entityId,
        entityName: options.entityName,
        description,
        metadata: options.metadata,
        severity: options.severity || getSeverityFromAction(action),
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      };

      // Firestore に保存
      const result = await createActivityLog(logData);

      if (result.error) {
        console.error('❌ Failed to log activity:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Activity logged successfully:', {
        action,
        entityType,
        entityName: options.entityName,
        logId: result.id
      });

      return { success: true, logId: result.id || undefined };

    } catch (error: any) {
      console.error('❌ Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

  /**
   * 受注関連の活動ログ
   */
  const logOrderActivity = useCallback(async (
    action: LogAction,
    orderId: string,
    orderName: string,
    metadata?: Record<string, any>
  ) => {
    return logActivity(action, 'order', {
      entityId: orderId,
      entityName: orderName,
      metadata,
    });
  }, [logActivity]);

  /**
   * タスク関連の活動ログ
   */
  const logTaskActivity = useCallback(async (
    action: LogAction,
    taskId: string,
    taskName: string,
    metadata?: Record<string, any>
  ) => {
    return logActivity(action, 'task', {
      entityId: taskId,
      entityName: taskName,
      metadata,
    });
  }, [logActivity]);

  /**
   * 日報関連の活動ログ
   */
  const logReportActivity = useCallback(async (
    action: LogAction,
    reportId: string,
    reportName: string,
    metadata?: Record<string, any>
  ) => {
    return logActivity(action, 'report', {
      entityId: reportId,
      entityName: reportName,
      metadata,
    });
  }, [logActivity]);

  /**
   * ユーザー関連の活動ログ
   */
  const logUserActivity = useCallback(async (
    action: LogAction,
    description?: string,
    metadata?: Record<string, any>
  ) => {
    return logActivity(action, 'user', {
      description,
      metadata,
    });
  }, [logActivity]);

  /**
   * システム関連の活動ログ
   */
  const logSystemActivity = useCallback(async (
    action: LogAction,
    description: string,
    metadata?: Record<string, any>,
    severity?: LogSeverity
  ) => {
    return logActivity(action, 'system', {
      description,
      metadata,
      severity,
    });
  }, [logActivity]);

  /**
   * エラーログ専用関数
   */
  const logError = useCallback(async (
    error: Error | string,
    context: {
      entityType?: LogEntityType;
      entityId?: string;
      entityName?: string;
      metadata?: Record<string, any>;
    } = {}
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error !== 'string' ? error.stack : undefined;

    return logActivity('error', context.entityType || 'system', {
      entityId: context.entityId,
      entityName: context.entityName,
      description: `エラーが発生しました: ${errorMessage}`,
      metadata: {
        ...context.metadata,
        error: errorMessage,
        stack: errorStack,
      },
      severity: 'error',
    });
  }, [logActivity]);

  /**
   * ログイン・ログアウト専用関数
   */
  const logAuthActivity = useCallback(async (
    action: 'login' | 'logout',
    metadata?: Record<string, any>
  ) => {
    return logActivity(action, 'user', {
      metadata,
      severity: 'info',
    });
  }, [logActivity]);

  /**
   * 通知関連ログ
   */
  const logNotificationActivity = useCallback(async (
    action: LogAction,
    description: string,
    metadata?: Record<string, any>
  ) => {
    return logActivity(action, 'notification', {
      description,
      metadata,
    });
  }, [logActivity]);

  return {
    logActivity,
    logOrderActivity,
    logTaskActivity,
    logReportActivity,
    logUserActivity,
    logSystemActivity,
    logError,
    logAuthActivity,
    logNotificationActivity,
  };
};

/**
 * アクションタイプから重要度を推定
 */
const getSeverityFromAction = (action: LogAction): LogSeverity => {
  switch (action) {
    case 'error':
      return 'error';
    case 'created':
    case 'updated':
    case 'sync':
      return 'success';
    case 'deleted':
      return 'warning';
    case 'viewed':
    case 'login':
    case 'logout':
    case 'notification':
    case 'comment':
    case 'uploaded':
    default:
      return 'info';
  }
};