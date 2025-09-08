import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// コレクション名
export const DEFECT_REPORTS_COLLECTIONS = {
  REPORTS: 'defect-reports',
  ACTIONS: 'defect-actions',
  ATTACHMENTS: 'defect-attachments',
} as const;

// 型定義
export interface DefectReport {
  id: string;
  reportNumber: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "in_progress" | "resolved" | "closed";
  category: "quality" | "equipment" | "process" | "material" | "safety" | "other";
  reporter: string;
  assignee?: string;
  department: string;
  location: string;
  dateReported: Date;
  dateResolved?: Date;
  estimatedResolution?: Date;
  actualCost?: number;
  estimatedCost?: number;
  attachments?: string[];
  correctionActions?: string[];
  preventiveActions?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface DefectAction {
  id: string;
  reportId: string;
  type: "correction" | "prevention" | "investigation";
  description: string;
  assignee: string;
  dueDate?: Date;
  completedDate?: Date;
  status: "pending" | "in_progress" | "completed";
  cost?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 不具合報告操作関数
export const createDefectReport = async (reportData: Omit<DefectReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    
    // 報告番号を生成（例: DEF-2025-001）
    const year = now.getFullYear();
    const reportNumber = `DEF-${year}-${String(Date.now()).slice(-6)}`;
    
    const docRef = await addDoc(collection(db, DEFECT_REPORTS_COLLECTIONS.REPORTS), {
      ...reportData,
      reportNumber,
      dateReported: Timestamp.fromDate(reportData.dateReported),
      dateResolved: reportData.dateResolved ? Timestamp.fromDate(reportData.dateResolved) : null,
      estimatedResolution: reportData.estimatedResolution ? Timestamp.fromDate(reportData.estimatedResolution) : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating defect report:', error);
    throw error;
  }
};

export const getDefectReports = async (): Promise<DefectReport[]> => {
  try {
    const q = query(
      collection(db, DEFECT_REPORTS_COLLECTIONS.REPORTS),
      orderBy('dateReported', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateReported: data.dateReported?.toDate(),
        dateResolved: data.dateResolved?.toDate(),
        estimatedResolution: data.estimatedResolution?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as DefectReport;
    });
  } catch (error) {
    console.error('Error getting defect reports:', error);
    throw error;
  }
};

export const updateDefectReport = async (id: string, updates: Partial<DefectReport>): Promise<void> => {
  try {
    const docRef = doc(db, DEFECT_REPORTS_COLLECTIONS.REPORTS, id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Date型のフィールドを適切に変換
    if (updates.dateReported) {
      updateData.dateReported = Timestamp.fromDate(updates.dateReported);
    }
    if (updates.dateResolved) {
      updateData.dateResolved = Timestamp.fromDate(updates.dateResolved);
    }
    if (updates.estimatedResolution) {
      updateData.estimatedResolution = Timestamp.fromDate(updates.estimatedResolution);
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating defect report:', error);
    throw error;
  }
};

export const deleteDefectReport = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, DEFECT_REPORTS_COLLECTIONS.REPORTS, id));
  } catch (error) {
    console.error('Error deleting defect report:', error);
    throw error;
  }
};

// ステータス別取得
export const getDefectReportsByStatus = async (status: DefectReport['status']): Promise<DefectReport[]> => {
  try {
    const q = query(
      collection(db, DEFECT_REPORTS_COLLECTIONS.REPORTS),
      where('status', '==', status),
      orderBy('dateReported', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateReported: doc.data().dateReported?.toDate(),
      dateResolved: doc.data().dateResolved?.toDate(),
      estimatedResolution: doc.data().estimatedResolution?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as DefectReport));
  } catch (error) {
    console.error('Error getting defect reports by status:', error);
    throw error;
  }
};

// 重要度別取得
export const getDefectReportsBySeverity = async (severity: DefectReport['severity']): Promise<DefectReport[]> => {
  try {
    const q = query(
      collection(db, DEFECT_REPORTS_COLLECTIONS.REPORTS),
      where('severity', '==', severity),
      orderBy('dateReported', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateReported: doc.data().dateReported?.toDate(),
      dateResolved: doc.data().dateResolved?.toDate(),
      estimatedResolution: doc.data().estimatedResolution?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as DefectReport));
  } catch (error) {
    console.error('Error getting defect reports by severity:', error);
    throw error;
  }
};

// リアルタイム取得
export const subscribeToDefectReports = (callback: (reports: DefectReport[]) => void) => {
  const q = query(
    collection(db, DEFECT_REPORTS_COLLECTIONS.REPORTS),
    orderBy('dateReported', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const reports = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateReported: data.dateReported?.toDate(),
        dateResolved: data.dateResolved?.toDate(),
        estimatedResolution: data.estimatedResolution?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as DefectReport;
    });
    callback(reports);
  });
};

// 統計データ取得
export const getDefectReportStatistics = async () => {
  try {
    const reports = await getDefectReports();
    
    const totalReports = reports.length;
    const openReports = reports.filter(r => !["resolved", "closed"].includes(r.status)).length;
    const criticalReports = reports.filter(r => r.severity === 'critical').length;
    const highReports = reports.filter(r => r.severity === 'high').length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;
    const closedReports = reports.filter(r => r.status === 'closed').length;
    
    // 平均解決時間（日）
    const resolvedWithDates = reports.filter(r => r.dateResolved && r.dateReported);
    const avgResolutionTime = resolvedWithDates.length > 0 
      ? resolvedWithDates.reduce((sum, r) => {
          const days = (r.dateResolved!.getTime() - r.dateReported.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / resolvedWithDates.length
      : 0;

    // 今月の報告数
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthReports = reports.filter(r => r.dateReported >= firstDayOfMonth).length;

    // 総コスト
    const totalCost = reports.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0);

    return {
      totalReports,
      openReports,
      criticalReports,
      highReports,
      resolvedReports,
      closedReports,
      avgResolutionTime,
      thisMonthReports,
      totalCost,
    };
  } catch (error) {
    console.error('Error getting defect report statistics:', error);
    throw error;
  }
};