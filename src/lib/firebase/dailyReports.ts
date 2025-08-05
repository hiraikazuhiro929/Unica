import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { DailyReportEntry } from '@/app/tasks/types';

// Re-export for external use
export { DailyReportEntry } from '@/app/tasks/types';

// 日報統計の型定義
export interface DailyReportStatistics {
  totalReports: number;
  totalWorkTime: number;
  averageWorkTime: number;
  reportsByWorker: Record<string, number>;
  reportsByWorkContent: Record<string, number>;
  recentActivityCount: number;
  weeklyTrend: Array<{
    date: string;
    count: number;
    totalHours: number;
  }>;
}

const COLLECTION_NAME = 'daily-reports';
const DRAFTS_COLLECTION_NAME = 'daily-report-drafts';

/**
 * 日報を作成
 */
export const createDailyReport = async (reportData: Omit<DailyReportEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString();
    const newReport = {
      ...reportData,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newReport);
    
    return {
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...newReport }
    };
  } catch (error: any) {
    console.error('Error creating daily report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 日報を更新
 */
export const updateDailyReport = async (id: string, updateData: Partial<DailyReportEntry>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updatedData);
    
    return {
      success: true,
      id,
      data: updatedData
    };
  } catch (error: any) {
    console.error('Error updating daily report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 作業者の日報一覧を取得
 */
export const getDailyReportsByWorker = async (workerId: string, options?: {
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    let queryConstraints: any[] = [where('workerId', '==', workerId)];
    
    if (options?.startDate) {
      queryConstraints.push(where('date', '>=', options.startDate));
    }
    
    if (options?.endDate) {
      queryConstraints.push(where('date', '<=', options.endDate));
    }
    
    queryConstraints.push(orderBy('date', 'desc'));
    
    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }
    
    const queryRef = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(queryRef);
    
    const reports: DailyReportEntry[] = [];
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() } as DailyReportEntry);
    });
    
    return {
      success: true,
      data: reports
    };
  } catch (error: any) {
    console.error('Error getting daily reports:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * 下書きを保存
 */
export const saveDailyReportDraft = async (workerId: string, date: string, draftData: any) => {
  try {
    const draftId = `${workerId}-${date}`;
    const docRef = doc(db, DRAFTS_COLLECTION_NAME, draftId);
    
    const draftDocument = {
      workerId,
      date,
      data: draftData,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, draftDocument).catch(async () => {
      // ドキュメントが存在しない場合は作成
      await addDoc(collection(db, DRAFTS_COLLECTION_NAME), {
        ...draftDocument,
        createdAt: new Date().toISOString()
      });
    });
    
    return {
      success: true,
      id: draftId
    };
  } catch (error: any) {
    console.error('Error saving daily report draft:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 下書きを取得
 */
export const getDailyReportDraft = async (workerId: string, date: string) => {
  try {
    const draftId = `${workerId}-${date}`;
    const docRef = doc(db, DRAFTS_COLLECTION_NAME, draftId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        data: docSnap.data().data
      };
    } else {
      return {
        success: false,
        error: '下書きが見つかりません'
      };
    }
  } catch (error: any) {
    console.error('Error getting daily report draft:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ローカルストレージから下書きをマイグレーション
 */
export const migrateDraftFromLocalStorage = async (localStorageKey: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const savedDraft = localStorage.getItem(localStorageKey);
    if (!savedDraft) return null;
    
    const draftData = JSON.parse(savedDraft);
    if (draftData.workerId && draftData.date) {
      await saveDailyReportDraft(draftData.workerId, draftData.date, draftData);
      return draftData;
    }
    
    return null;
  } catch (error) {
    console.error('Error migrating draft from localStorage:', error);
    return null;
  }
};

/**
 * 日報のリアルタイム購読
 */
export const subscribeToDailyReports = (
  workerId: string,
  callback: (reports: DailyReportEntry[]) => void,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    let queryConstraints: any[] = [where('workerId', '==', workerId)];
    
    if (options?.startDate) {
      queryConstraints.push(where('date', '>=', options.startDate));
    }
    
    if (options?.endDate) {
      queryConstraints.push(where('date', '<=', options.endDate));
    }
    
    queryConstraints.push(orderBy('date', 'desc'));
    
    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }
    
    const queryRef = query(q, ...queryConstraints);
    
    const unsubscribe = onSnapshot(queryRef, (querySnapshot) => {
      const reports: DailyReportEntry[] = [];
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as DailyReportEntry);
      });
      callback(reports);
    }, (error) => {
      console.error('Error in daily reports subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up daily reports subscription:', error);
    return () => {}; // 空の関数を返す
  }
};

/**
 * 日報一覧を取得
 */
export const getDailyReportsList = async (options?: {
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  workerId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    let queryConstraints: any[] = [];
    
    if (options?.workerId) {
      queryConstraints.push(where('workerId', '==', options.workerId));
    }
    
    if (options?.startDate) {
      queryConstraints.push(where('date', '>=', options.startDate));
    }
    
    if (options?.endDate) {
      queryConstraints.push(where('date', '<=', options.endDate));
    }
    
    if (options?.orderByField) {
      queryConstraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
    }
    
    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }
    
    const queryRef = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(queryRef);
    
    const reports: DailyReportEntry[] = [];
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() } as DailyReportEntry);
    });
    
    return {
      success: true,
      data: reports
    };
  } catch (error: any) {
    console.error('Error getting daily reports list:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * 日報一覧のリアルタイム購読
 */
export const subscribeToDailyReportsList = (
  options: {
    limit?: number;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    workerId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  callback: (reports: DailyReportEntry[]) => void
) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    let queryConstraints: any[] = [];
    
    if (options.workerId) {
      queryConstraints.push(where('workerId', '==', options.workerId));
    }
    
    if (options.startDate) {
      queryConstraints.push(where('date', '>=', options.startDate));
    }
    
    if (options.endDate) {
      queryConstraints.push(where('date', '<=', options.endDate));
    }
    
    if (options.orderByField) {
      queryConstraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
    }
    
    if (options.limit) {
      queryConstraints.push(limit(options.limit));
    }
    
    const queryRef = query(q, ...queryConstraints);
    
    const unsubscribe = onSnapshot(queryRef, (querySnapshot) => {
      const reports: DailyReportEntry[] = [];
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as DailyReportEntry);
      });
      callback(reports);
    }, (error) => {
      console.error('Error in daily reports list subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up daily reports list subscription:', error);
    return () => {}; // 空の関数を返す
  }
};

/**
 * 日報統計を計算
 */
export const calculateDailyReportStatistics = async (): Promise<{
  success: boolean;
  data?: DailyReportStatistics;
  error?: string;
}> => {
  try {
    const { data: reports, success } = await getDailyReportsList();
    
    if (!success || !reports) {
      return {
        success: false,
        error: '日報データの取得に失敗しました'
      };
    }
    
    // 基本統計
    const totalReports = reports.length;
    const totalWorkTime = reports.reduce((sum, report) => {
      if (report.workTimeEntries && Array.isArray(report.workTimeEntries)) {
        return sum + report.workTimeEntries.reduce((entrySum, entry) => {
          const hours = entry.durationMinutes / 60;
          return entrySum + (isNaN(hours) ? 0 : hours);
        }, 0);
      }
      return sum;
    }, 0);
    
    const averageWorkTime = totalReports > 0 ? totalWorkTime / totalReports : 0;
    
    // 作業者別統計
    const reportsByWorker: Record<string, number> = {};
    reports.forEach(report => {
      const workerName = report.workerName || 'Unknown';
      reportsByWorker[workerName] = (reportsByWorker[workerName] || 0) + 1;
    });
    
    // 作業内容別統計
    const reportsByWorkContent: Record<string, number> = {};
    reports.forEach(report => {
      if (report.workTimeEntries && Array.isArray(report.workTimeEntries)) {
        report.workTimeEntries.forEach(entry => {
          const workContent = entry.workContentName || 'その他';
          reportsByWorkContent[workContent] = (reportsByWorkContent[workContent] || 0) + 1;
        });
      }
    });
    
    // 最近の活動数（過去7日間）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const recentActivityCount = reports.filter(report => 
      report.date >= sevenDaysAgoStr
    ).length;
    
    // 週次トレンド（過去7日間）
    const weeklyTrend: Array<{ date: string; count: number; totalHours: number; }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayReports = reports.filter(report => report.date === dateStr);
      const dayTotalHours = dayReports.reduce((sum, report) => {
        if (report.workTimeEntries && Array.isArray(report.workTimeEntries)) {
          return sum + report.workTimeEntries.reduce((entrySum, entry) => {
            const hours = entry.durationMinutes / 60;
            return entrySum + (isNaN(hours) ? 0 : hours);
          }, 0);
        }
        return sum;
      }, 0);
      
      weeklyTrend.push({
        date: dateStr,
        count: dayReports.length,
        totalHours: dayTotalHours
      });
    }
    
    const statistics: DailyReportStatistics = {
      totalReports,
      totalWorkTime,
      averageWorkTime,
      reportsByWorker,
      reportsByWorkContent,
      recentActivityCount,
      weeklyTrend
    };
    
    return {
      success: true,
      data: statistics
    };
  } catch (error: any) {
    console.error('Error calculating daily report statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
};