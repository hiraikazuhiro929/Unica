import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const NOTIFICATION_COLLECTIONS = {
  NOTIFICATIONS: 'notifications',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Notification {
  id: string;
  type: 'system' | 'mention' | 'alert' | 'reminder' | 'chat' | 'task' | 'process';
  title: string;
  message: string;
  priority: 'normal' | 'high' | 'urgent';
  isRead: boolean;
  recipientId: string; // 受信者のユーザーID
  senderId?: string; // 送信者のユーザーID（システム通知の場合はundefined）
  senderName?: string; // 送信者名（表示用）
  relatedEntityType?: 'process' | 'task' | 'order' | 'workHours' | 'dailyReport';
  relatedEntityId?: string;
  actionUrl?: string; // クリック時の遷移先URL
  readAt?: string;
  createdAt: any;
  updatedAt: any;
}

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================

/**
 * 通知を作成（自動クリーンアップ付き）
 */
export const createNotification = async (
  notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'isRead' | 'readAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS), {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 新しい通知作成後、古い通知をクリーンアップ
    await cleanupOldNotifications(notificationData.recipientId);

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 通知のリストを取得
 */
export const getNotifications = async (filters?: {
  recipientId?: string;
  type?: Notification['type'];
  isRead?: boolean;
  priority?: Notification['priority'];
  relatedEntityType?: string;
  relatedEntityId?: string;
  limit?: number;
}): Promise<{ data: Notification[]; error: string | null }> => {
  try {
    let q = collection(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS);
    const constraints: QueryConstraint[] = [];

    // 単一フィルタのみ適用（複合インデックス回避）
    if (filters?.recipientId) {
      constraints.push(where('recipientId', '==', filters.recipientId));
      // recipientIdの場合は追加でisReadフィルタも可能
      if (filters.isRead !== undefined) {
        constraints.push(where('isRead', '==', filters.isRead));
      }
    } else if (filters?.type) {
      constraints.push(where('type', '==', filters.type));
    } else if (filters?.priority) {
      constraints.push(where('priority', '==', filters.priority));
    } else if (filters?.relatedEntityType) {
      constraints.push(where('relatedEntityType', '==', filters.relatedEntityType));
    } else if (filters?.relatedEntityId) {
      constraints.push(where('relatedEntityId', '==', filters.relatedEntityId));
    } else {
      constraints.push(orderBy('createdAt', 'desc'));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];

    // クライアントサイドで追加フィルタリング
    if (filters) {
      if (filters.type && !constraints.some(c => c.toString().includes('type'))) {
        data = data.filter(notification => notification.type === filters.type);
      }
      if (filters.priority && !constraints.some(c => c.toString().includes('priority'))) {
        data = data.filter(notification => notification.priority === filters.priority);
      }
      if (filters.isRead !== undefined && !constraints.some(c => c.toString().includes('isRead'))) {
        data = data.filter(notification => notification.isRead === filters.isRead);
      }
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting notifications:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 通知を更新
 */
export const updateNotification = async (
  notificationId: string,
  updates: Partial<Omit<Notification, 'id' | 'createdAt'>>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS, notificationId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return { error: error.message };
  }
};

/**
 * 通知を既読にする
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS, notificationId);
    
    await updateDoc(docRef, {
      isRead: true,
      readAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { error: error.message };
  }
};

/**
 * 複数の通知を一括で既読にする
 */
export const markNotificationsAsRead = async (
  notificationIds: string[]
): Promise<{ success: boolean; errors: { id: string; error: string }[] }> => {
  const errors: { id: string; error: string }[] = [];

  try {
    const promises = notificationIds.map(async (id) => {
      try {
        const docRef = doc(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS, id);
        await updateDoc(docRef, {
          isRead: true,
          readAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      } catch (error: any) {
        errors.push({ id, error: error.message });
      }
    });

    await Promise.all(promises);

    return { success: errors.length === 0, errors };
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return { 
      success: false, 
      errors: notificationIds.map(id => ({ id, error: error.message }))
    };
  }
};

/**
 * ユーザーの全未読通知を既読にする
 */
export const markAllNotificationsAsRead = async (
  recipientId: string
): Promise<{ error: string | null }> => {
  try {
    // 未読通知を取得
    const { data: unreadNotifications, error } = await getNotifications({
      recipientId,
      isRead: false,
      limit: 1000
    });

    if (error) throw new Error(error);

    if (unreadNotifications.length > 0) {
      const notificationIds = unreadNotifications.map(n => n.id);
      const { success, errors } = await markNotificationsAsRead(notificationIds);
      
      if (!success) {
        console.warn('Some notifications could not be marked as read:', errors);
      }
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { error: error.message };
  }
};

/**
 * 通知を削除
 */
export const deleteNotification = async (
  notificationId: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS, notificationId);
    await deleteDoc(docRef);
    
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return { error: error.message };
  }
};

/**
 * 既読通知を一括削除
 */
export const deleteReadNotifications = async (
  recipientId: string
): Promise<{ error: string | null }> => {
  try {
    // 既読通知を取得
    const { data: readNotifications, error } = await getNotifications({
      recipientId,
      isRead: true,
      limit: 1000
    });

    if (error) throw new Error(error);

    if (readNotifications.length > 0) {
      const promises = readNotifications.map(notification => 
        deleteNotification(notification.id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error !== null);
      
      if (errors.length > 0) {
        console.warn('Some notifications could not be deleted:', errors);
      }
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting read notifications:', error);
    return { error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 通知の変更をリアルタイムで監視
 */
export const subscribeToNotifications = (
  filters: Parameters<typeof getNotifications>[0],
  callback: (data: Notification[]) => void
): (() => void) => {
  let q = collection(db, NOTIFICATION_COLLECTIONS.NOTIFICATIONS);
  const constraints: QueryConstraint[] = [];

  // 単一フィルタのみ適用
  if (filters?.recipientId) {
    constraints.push(where('recipientId', '==', filters.recipientId));
    if (filters.isRead !== undefined) {
      constraints.push(where('isRead', '==', filters.isRead));
    }
    constraints.push(orderBy('createdAt', 'desc'));
  } else if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  } else {
    constraints.push(orderBy('createdAt', 'desc'));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];

    // クライアントサイドフィルタリング
    if (filters) {
      if (filters.type && !constraints.some(c => c.toString().includes('type'))) {
        data = data.filter(notification => notification.type === filters.type);
      }
      if (filters.priority) {
        data = data.filter(notification => notification.priority === filters.priority);
      }
      if (filters.isRead !== undefined && !constraints.some(c => c.toString().includes('isRead'))) {
        data = data.filter(notification => notification.isRead === filters.isRead);
      }
    }

    callback(data);
  }, (error) => {
    console.error('Error in notifications subscription:', error);
    callback([]);
  });
};

// =============================================================================
// NOTIFICATION UTILITIES
// =============================================================================

/**
 * 通知統計を取得
 */
export const getNotificationStatistics = async (
  recipientId: string
): Promise<{
  data: {
    total: number;
    unread: number;
    byType: { [key in Notification['type']]?: number };
    byPriority: { [key in Notification['priority']]?: number };
  };
  error: string | null;
}> => {
  try {
    const { data: notifications, error } = await getNotifications({ 
      recipientId, 
      limit: 1000 
    });
    
    if (error) throw new Error(error);

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {} as { [key in Notification['type']]?: number },
      byPriority: {} as { [key in Notification['priority']]?: number }
    };

    // タイプ別統計
    notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
    });

    return { data: stats, error: null };
  } catch (error: any) {
    console.error('Error getting notification statistics:', error);
    return {
      data: {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {}
      },
      error: error.message
    };
  }
};

/**
 * システム通知を作成（便利関数）
 */
export const createSystemNotification = async (data: {
  title: string;
  message: string;
  recipientId: string;
  priority?: Notification['priority'];
  relatedEntityType?: Notification['relatedEntityType'];
  relatedEntityId?: string;
  actionUrl?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createNotification({
    type: 'system',
    priority: data.priority || 'normal',
    ...data
  });
};

/**
 * メンション通知を作成（便利関数）
 */
export const createMentionNotification = async (data: {
  title: string;
  message: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  relatedEntityType?: Notification['relatedEntityType'];
  relatedEntityId?: string;
  actionUrl?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createNotification({
    type: 'mention',
    priority: 'high',
    ...data
  });
};

/**
 * タスク通知を作成（便利関数）
 */
export const createTaskNotification = async (data: {
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  priority?: Notification['priority'];
  relatedEntityId?: string;
  actionUrl?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createNotification({
    type: 'task',
    relatedEntityType: 'task',
    priority: data.priority || 'normal',
    ...data
  });
};

/**
 * 工程通知を作成（便利関数）
 */
export const createProcessNotification = async (data: {
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  priority?: Notification['priority'];
  relatedEntityId?: string;
  actionUrl?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createNotification({
    type: 'process',
    relatedEntityType: 'process',
    priority: data.priority || 'normal',
    ...data
  });
};

// =============================================================================
// NOTIFICATION CLEANUP UTILITIES
// =============================================================================

/**
 * 通知の保存上限数
 */
const NOTIFICATION_RETENTION_LIMIT = 100;

/**
 * 古い既読通知を自動削除してストレージを最適化
 */
export const cleanupOldNotifications = async (
  recipientId: string,
  retentionLimit: number = NOTIFICATION_RETENTION_LIMIT
): Promise<{ error: string | null; deletedCount: number }> => {
  try {
    // 該当ユーザーの全通知を取得（作成日時順）
    const { data: allNotifications, error } = await getNotifications({
      recipientId,
      limit: 1000 // 十分に大きな数で取得
    });

    if (error) throw new Error(error);

    // 保存上限を超えている場合のみクリーンアップ
    if (allNotifications.length <= retentionLimit) {
      return { error: null, deletedCount: 0 };
    }

    // 削除対象を決定: 最新の通知は保持、古い既読通知を優先削除
    const sortedNotifications = allNotifications.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime(); // 新しい順
    });

    const toDelete = [];
    const toKeep = [];

    // 削除対象の選定ロジック
    for (const notification of sortedNotifications) {
      if (toKeep.length < retentionLimit) {
        // まず未読通知と重要な通知を保持
        if (!notification.isRead || notification.priority === 'urgent') {
          toKeep.push(notification);
        } else if (toKeep.length + toDelete.length < retentionLimit) {
          toKeep.push(notification);
        } else {
          toDelete.push(notification);
        }
      } else {
        toDelete.push(notification);
      }
    }

    // 既読通知から削除（未読通知は保持優先）
    const readNotificationsToDelete = toDelete.filter(n => n.isRead);
    const deleteCount = Math.max(0, allNotifications.length - retentionLimit);
    const finalDeleteList = readNotificationsToDelete.slice(0, deleteCount);

    if (finalDeleteList.length === 0) {
      return { error: null, deletedCount: 0 };
    }

    // 一括削除実行
    const deletePromises = finalDeleteList.map(notification => 
      deleteNotification(notification.id)
    );

    const results = await Promise.all(deletePromises);
    const successCount = results.filter(result => result.error === null).length;

    console.log(`通知クリーンアップ完了: ${successCount}件の古い通知を削除 (対象ユーザー: ${recipientId})`);

    return { error: null, deletedCount: successCount };
  } catch (error: any) {
    console.error('Error cleaning up old notifications:', error);
    return { error: error.message, deletedCount: 0 };
  }
};

/**
 * 手動で通知クリーンアップを実行
 */
export const manualCleanupNotifications = async (
  recipientId: string,
  options?: {
    retentionLimit?: number;
    deleteOnlyRead?: boolean;
    olderThanDays?: number;
  }
): Promise<{ error: string | null; deletedCount: number }> => {
  try {
    const retentionLimit = options?.retentionLimit || NOTIFICATION_RETENTION_LIMIT;
    const deleteOnlyRead = options?.deleteOnlyRead || true;
    const olderThanDays = options?.olderThanDays;

    const { data: notifications, error } = await getNotifications({
      recipientId,
      limit: 1000
    });

    if (error) throw new Error(error);

    let candidatesForDeletion = notifications;

    // 既読のみ削除する場合
    if (deleteOnlyRead) {
      candidatesForDeletion = notifications.filter(n => n.isRead);
    }

    // 指定日数より古い通知のみ削除
    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      candidatesForDeletion = candidatesForDeletion.filter(notification => {
        const notificationDate = notification.createdAt?.toDate?.() || new Date(notification.createdAt);
        return notificationDate < cutoffDate;
      });
    }

    // 保存上限を考慮した削除
    const totalAfterDeletion = notifications.length - candidatesForDeletion.length;
    if (totalAfterDeletion >= retentionLimit) {
      // 削除不要
      return { error: null, deletedCount: 0 };
    }

    const deleteCount = Math.min(
      candidatesForDeletion.length,
      Math.max(0, notifications.length - retentionLimit)
    );

    if (deleteCount === 0) {
      return { error: null, deletedCount: 0 };
    }

    // 古い順に削除
    const sortedCandidates = candidatesForDeletion.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return aDate.getTime() - bDate.getTime(); // 古い順
    });

    const toDelete = sortedCandidates.slice(0, deleteCount);

    const deletePromises = toDelete.map(notification => 
      deleteNotification(notification.id)
    );

    const results = await Promise.all(deletePromises);
    const successCount = results.filter(result => result.error === null).length;

    return { error: null, deletedCount: successCount };
  } catch (error: any) {
    console.error('Error in manual cleanup:', error);
    return { error: error.message, deletedCount: 0 };
  }
};