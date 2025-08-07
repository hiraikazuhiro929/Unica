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
import { NotificationSynchronizationService } from './notificationSync';

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const ANNOUNCEMENT_COLLECTIONS = {
  ANNOUNCEMENTS: 'announcements',
  ANNOUNCEMENT_READS: 'announcementReads',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'safety' | 'maintenance' | 'schedule' | 'policy' | 'system' | 'emergency';
  authorId: string;
  authorName: string;
  targetAudience: 'all' | 'department' | 'specific'; // 対象範囲
  targetDepartments?: string[]; // 部署指定の場合
  targetUserIds?: string[]; // 個人指定の場合
  isActive: boolean; // 有効/無効
  publishedAt?: string; // 公開日時
  expiresAt?: string; // 有効期限
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }[];
  readCount: number; // 既読数
  totalTargetCount: number; // 対象者数
  createdAt: any;
  updatedAt: any;
}

export interface AnnouncementRead {
  id: string;
  announcementId: string;
  userId: string;
  readAt: string;
  createdAt: any;
}

// =============================================================================
// ANNOUNCEMENT OPERATIONS
// =============================================================================

/**
 * 全体連絡を作成
 */
export const createAnnouncement = async (
  announcementData: Omit<Announcement, 'id' | 'readCount' | 'totalTargetCount' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    // 対象者数を計算（実際の実装では全ユーザー数を取得）
    const totalTargetCount = announcementData.targetAudience === 'all' ? 100 : // 仮の値
                            announcementData.targetUserIds?.length || 
                            (announcementData.targetDepartments?.length || 0) * 10; // 仮の計算

    const docRef = await addDoc(collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS), {
      ...announcementData,
      readCount: 0,
      totalTargetCount,
      publishedAt: announcementData.publishedAt || new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create notifications for active announcements
    if (announcementData.isActive) {
      const fullAnnouncement: Announcement = {
        id: docRef.id,
        ...announcementData,
        readCount: 0,
        totalTargetCount,
        publishedAt: announcementData.publishedAt || new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Create notifications asynchronously (don't wait for completion)
      NotificationSynchronizationService.handleAnnouncementPublished(fullAnnouncement)
        .catch(error => console.error('Failed to create announcement notifications:', error));
    }

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 全体連絡のリストを取得
 */
export const getAnnouncements = async (filters?: {
  priority?: Announcement['priority'];
  category?: Announcement['category'];
  authorId?: string;
  isActive?: boolean;
  userId?: string; // ユーザーが対象の連絡のみ取得
  includeExpired?: boolean;
  limit?: number;
}): Promise<{ data: Announcement[]; error: string | null }> => {
  try {
    let q = collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS);
    const constraints: QueryConstraint[] = [];

    // 単一フィルタのみ適用（複合インデックス回避）
    if (filters?.priority) {
      constraints.push(where('priority', '==', filters.priority));
    } else if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    } else if (filters?.authorId) {
      constraints.push(where('authorId', '==', filters.authorId));
    } else if (filters?.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    } else {
      constraints.push(orderBy('publishedAt', 'desc'));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Announcement[];

    // クライアントサイドで追加フィルタリング
    if (filters) {
      // 有効期限チェック
      if (!filters.includeExpired) {
        const now = new Date().toISOString();
        data = data.filter(announcement => 
          !announcement.expiresAt || announcement.expiresAt > now
        );
      }

      // ユーザー対象フィルタ
      if (filters.userId) {
        data = data.filter(announcement => 
          announcement.targetAudience === 'all' ||
          announcement.targetUserIds?.includes(filters.userId!) ||
          // 部署チェック（実際の実装では部署情報を取得して判定）
          announcement.targetDepartments?.length
        );
      }

      // その他のフィルタ
      if (filters.priority && !constraints.some(c => c.toString().includes('priority'))) {
        data = data.filter(announcement => announcement.priority === filters.priority);
      }
      if (filters.category && !constraints.some(c => c.toString().includes('category'))) {
        data = data.filter(announcement => announcement.category === filters.category);
      }
      if (filters.isActive !== undefined && !constraints.some(c => c.toString().includes('isActive'))) {
        data = data.filter(announcement => announcement.isActive === filters.isActive);
      }
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting announcements:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 全体連絡を取得
 */
export const getAnnouncement = async (
  announcementId: string
): Promise<{ data: Announcement | null; error: string | null }> => {
  try {
    const docRef = doc(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS, announcementId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data
        } as Announcement,
        error: null
      };
    } else {
      return { data: null, error: 'Announcement not found' };
    }
  } catch (error: any) {
    console.error('Error getting announcement:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 全体連絡を更新
 */
export const updateAnnouncement = async (
  announcementId: string,
  updates: Partial<Announcement>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS, announcementId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return { error: error.message };
  }
};

/**
 * 全体連絡を削除
 */
export const deleteAnnouncement = async (
  announcementId: string
): Promise<{ error: string | null }> => {
  try {
    // 関連する既読レコードも削除
    const readsSnapshot = await getDocs(
      query(collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENT_READS), 
            where('announcementId', '==', announcementId))
    );

    const deletePromises = readsSnapshot.docs.map(readDoc => 
      deleteDoc(doc(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENT_READS, readDoc.id))
    );

    await Promise.all(deletePromises);

    // 全体連絡を削除
    const docRef = doc(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS, announcementId);
    await deleteDoc(docRef);
    
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return { error: error.message };
  }
};

// =============================================================================
// READ TRACKING OPERATIONS
// =============================================================================

/**
 * 全体連絡を既読にする
 */
export const markAnnouncementAsRead = async (
  announcementId: string,
  userId: string
): Promise<{ error: string | null }> => {
  try {
    // 既読レコードが存在するかチェック
    const existingRead = await getDocs(
      query(
        collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENT_READS),
        where('announcementId', '==', announcementId),
        where('userId', '==', userId)
      )
    );

    if (existingRead.empty) {
      // 既読レコードを作成
      await addDoc(collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENT_READS), {
        announcementId,
        userId,
        readAt: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      // 全体連絡の既読数を更新
      const announcementRef = doc(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS, announcementId);
      const announcementDoc = await getDoc(announcementRef);
      
      if (announcementDoc.exists()) {
        const currentReadCount = announcementDoc.data().readCount || 0;
        await updateDoc(announcementRef, {
          readCount: currentReadCount + 1,
          updatedAt: serverTimestamp()
        });
      }
    }
    
    return { error: null };
  } catch (error: any) {
    console.error('Error marking announcement as read:', error);
    return { error: error.message };
  }
};

/**
 * ユーザーが既読した全体連絡IDのリストを取得
 */
export const getUserReadAnnouncements = async (
  userId: string
): Promise<{ data: string[]; error: string | null }> => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENT_READS),
        where('userId', '==', userId)
      )
    );

    const readAnnouncementIds = querySnapshot.docs.map(doc => doc.data().announcementId);

    return { data: readAnnouncementIds, error: null };
  } catch (error: any) {
    console.error('Error getting user read announcements:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 全体連絡の既読者リストを取得
 */
export const getAnnouncementReaders = async (
  announcementId: string,
  limit?: number
): Promise<{ data: AnnouncementRead[]; error: string | null }> => {
  try {
    let q = query(
      collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENT_READS),
      where('announcementId', '==', announcementId),
      orderBy('readAt', 'desc')
    );

    if (limit) {
      q = query(q, limit(limit));
    }

    const querySnapshot = await getDocs(q);
    
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AnnouncementRead[];

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting announcement readers:', error);
    return { data: [], error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 全体連絡の変更をリアルタイムで監視
 */
export const subscribeToAnnouncements = (
  filters: Parameters<typeof getAnnouncements>[0],
  callback: (data: Announcement[]) => void
): (() => void) => {
  let q = collection(db, ANNOUNCEMENT_COLLECTIONS.ANNOUNCEMENTS);
  const constraints: QueryConstraint[] = [];

  // 単一フィルタのみ適用
  if (filters?.priority) {
    constraints.push(where('priority', '==', filters.priority));
  } else if (filters?.category) {
    constraints.push(where('category', '==', filters.category));
  } else if (filters?.isActive !== undefined) {
    constraints.push(where('isActive', '==', filters.isActive));
  } else {
    constraints.push(orderBy('publishedAt', 'desc'));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Announcement[];

    // クライアントサイドフィルタリング
    if (filters) {
      // 有効期限チェック
      if (!filters.includeExpired) {
        const now = new Date().toISOString();
        data = data.filter(announcement => 
          !announcement.expiresAt || announcement.expiresAt > now
        );
      }

      // その他のフィルタ
      if (filters.category && !constraints.some(c => c.toString().includes('category'))) {
        data = data.filter(announcement => announcement.category === filters.category);
      }
      if (filters.isActive !== undefined && !constraints.some(c => c.toString().includes('isActive'))) {
        data = data.filter(announcement => announcement.isActive === filters.isActive);
      }
    }

    callback(data);
  }, (error) => {
    console.error('Error in announcements subscription:', error);
    callback([]);
  });
};

// =============================================================================
// DASHBOARD UTILITIES
// =============================================================================

/**
 * ダッシュボード用全体連絡統計を取得
 */
export const getAnnouncementStatistics = async (userId?: string): Promise<{
  data: {
    total: number;
    active: number;
    unread: number;
    byPriority: { [key in Announcement['priority']]?: number };
    byCategory: { [key in Announcement['category']]?: number };
  };
  error: string | null;
}> => {
  try {
    // 全体連絡を取得
    const { data: announcements, error: announcementsError } = await getAnnouncements({ 
      limit: 1000,
      includeExpired: false
    });
    
    if (announcementsError) throw new Error(announcementsError);

    // 既読情報を取得（userIdが提供された場合）
    let readAnnouncementIds: string[] = [];
    if (userId) {
      const { data: readIds, error: readError } = await getUserReadAnnouncements(userId);
      if (readError) throw new Error(readError);
      readAnnouncementIds = readIds;
    }

    const stats = {
      total: announcements.length,
      active: announcements.filter(a => a.isActive).length,
      unread: userId ? announcements.filter(a => !readAnnouncementIds.includes(a.id)).length : 0,
      byPriority: {} as { [key in Announcement['priority']]?: number },
      byCategory: {} as { [key in Announcement['category']]?: number }
    };

    // 優先度別・カテゴリ別統計
    announcements.forEach(announcement => {
      stats.byPriority[announcement.priority] = (stats.byPriority[announcement.priority] || 0) + 1;
      stats.byCategory[announcement.category] = (stats.byCategory[announcement.category] || 0) + 1;
    });

    return { data: stats, error: null };
  } catch (error: any) {
    console.error('Error getting announcement statistics:', error);
    return {
      data: {
        total: 0,
        active: 0,
        unread: 0,
        byPriority: {},
        byCategory: {}
      },
      error: error.message
    };
  }
};

/**
 * 緊急連絡を作成（便利関数）
 */
export const createUrgentAnnouncement = async (data: {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category?: Announcement['category'];
  expiresAt?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createAnnouncement({
    ...data,
    priority: 'urgent',
    category: data.category || 'emergency',
    targetAudience: 'all',
    isActive: true
  });
};

/**
 * 部署向け連絡を作成（便利関数）
 */
export const createDepartmentAnnouncement = async (data: {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetDepartments: string[];
  priority?: Announcement['priority'];
  category?: Announcement['category'];
  expiresAt?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createAnnouncement({
    ...data,
    priority: data.priority || 'normal',
    category: data.category || 'general',
    targetAudience: 'department',
    isActive: true
  });
};