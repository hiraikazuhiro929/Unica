import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getPartnerStatistics,
  subscribeToPartners,
  Partner,
} from '@/lib/firebase/partners';

interface UsePartnersReturn {
  partners: Partner[];
  statistics: {
    totalPartners: number;
    activePartners: number;
    potentialPartners: number;
    customers: number;
    suppliers: number;
    vipPartners: number;
    totalRevenue: number;
    overdueFollowups: number;
  };
  loading: boolean;
  error: string | null;
  createPartner: (partnerData: Omit<Partner, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updatePartner: (id: string, updates: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const usePartners = (): UsePartnersReturn => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [statistics, setStatistics] = useState({
    totalPartners: 0,
    activePartners: 0,
    potentialPartners: 0,
    customers: 0,
    suppliers: 0,
    vipPartners: 0,
    totalRevenue: 0,
    overdueFollowups: 0,
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
      const statsData = await getPartnerStatistics();
      setStatistics(statsData);
    } catch (err) {
      console.error('Error loading partners data:', err);
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
    const unsubscribe = subscribeToPartners((partnersData) => {
      setPartners(partnersData);
      // 統計データの更新
      loadData();
    });

    // 初回データ取得
    loadData();

    return () => unsubscribe();
  }, [user?.uid]);

  // パートナー作成
  const createPartnerHandler = async (partnerData: Omit<Partner, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await createPartner({
        ...partnerData,
        createdBy: user.uid,
      });
    } catch (err) {
      console.error('Error creating partner:', err);
      setError('パートナーの作成に失敗しました');
      throw err;
    }
  };

  // パートナー更新
  const updatePartnerHandler = async (id: string, updates: Partial<Partner>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await updatePartner(id, updates);
    } catch (err) {
      console.error('Error updating partner:', err);
      setError('パートナーの更新に失敗しました');
      throw err;
    }
  };

  // パートナー削除
  const deletePartnerHandler = async (id: string) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await deletePartner(id);
    } catch (err) {
      console.error('Error deleting partner:', err);
      setError('パートナーの削除に失敗しました');
      throw err;
    }
  };

  // データの手動更新
  const refreshData = async () => {
    await loadData();
  };

  return {
    partners,
    statistics,
    loading,
    error,
    createPartner: createPartnerHandler,
    updatePartner: updatePartnerHandler,
    deletePartner: deletePartnerHandler,
    refreshData,
  };
};