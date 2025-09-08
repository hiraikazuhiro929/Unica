import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDefectReports,
  createDefectReport,
  updateDefectReport,
  deleteDefectReport,
  getDefectReportStatistics,
  subscribeToDefectReports,
  DefectReport,
} from '@/lib/firebase/defectReports';

interface UseDefectReportsReturn {
  defectReports: DefectReport[];
  statistics: {
    totalReports: number;
    openReports: number;
    criticalReports: number;
    highReports: number;
    resolvedReports: number;
    closedReports: number;
    avgResolutionTime: number;
    thisMonthReports: number;
    totalCost: number;
  };
  loading: boolean;
  error: string | null;
  createReport: (reportData: Omit<DefectReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'reportNumber'>) => Promise<void>;
  updateReport: (id: string, updates: Partial<DefectReport>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useDefectReports = (): UseDefectReportsReturn => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [defectReports, setDefectReports] = useState<DefectReport[]>([]);
  const [statistics, setStatistics] = useState({
    totalReports: 0,
    openReports: 0,
    criticalReports: 0,
    highReports: 0,
    resolvedReports: 0,
    closedReports: 0,
    avgResolutionTime: 0,
    thisMonthReports: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データの取得
  const loadData = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 統計データの取得
      const statsData = await getDefectReportStatistics();
      setStatistics(statsData);
    } catch (err) {
      console.error('Error loading defect reports data:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // リアルタイムデータ購読
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // リアルタイム購読
    const unsubscribe = subscribeToDefectReports((reportsData) => {
      setDefectReports(reportsData);
      // 統計データの更新
      loadData();
    });

    // 初回データ取得
    loadData();

    return () => unsubscribe();
  }, [user?.uid]);

  // 不具合報告作成
  const createReport = async (reportData: Omit<DefectReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'reportNumber'>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await createDefectReport({
        ...reportData,
        createdBy: user?.uid.uid,
      });
    } catch (err) {
      console.error('Error creating defect report:', err);
      setError('不具合報告の作成に失敗しました');
      throw err;
    }
  };

  // 不具合報告更新
  const updateReport = async (id: string, updates: Partial<DefectReport>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await updateDefectReport(id, updates);
    } catch (err) {
      console.error('Error updating defect report:', err);
      setError('不具合報告の更新に失敗しました');
      throw err;
    }
  };

  // 不具合報告削除
  const deleteReport = async (id: string) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await deleteDefectReport(id);
    } catch (err) {
      console.error('Error deleting defect report:', err);
      setError('不具合報告の削除に失敗しました');
      throw err;
    }
  };

  // データの手動更新
  const refreshData = async () => {
    await loadData();
  };

  return {
    defectReports,
    statistics,
    loading,
    error,
    createReport,
    updateReport,
    deleteReport,
    refreshData,
  };
};