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
 * 通知を作成
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