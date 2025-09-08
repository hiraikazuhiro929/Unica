import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryStatistics,
  subscribeToInventoryItems,
  initializeCategories,
  getCategories,
  createMaintenanceRecord,
  getMaintenanceRecords,
  InventoryItem,
  InventoryCategory,
  MaintenanceRecord,
} from '@/lib/firebase/inventory';

interface UseInventoryReturn {
  items: InventoryItem[];
  categories: InventoryCategory[];
  statistics: {
    totalItems: number;
    totalValue: number;
    availableItems: number;
    inUseItems: number;
    maintenanceItems: number;
    repairItems: number;
    averageAge: number;
    maintenanceDueItems: number;
  };
  loading: boolean;
  error: string | null;
  createItem: (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  createMaintenance: (recordData: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  getMaintenanceHistory: (itemId: string) => Promise<MaintenanceRecord[]>;
  refreshData: () => Promise<void>;
}

export const useInventory = (): UseInventoryReturn => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [statistics, setStatistics] = useState({
    totalItems: 0,
    totalValue: 0,
    availableItems: 0,
    inUseItems: 0,
    maintenanceItems: 0,
    repairItems: 0,
    averageAge: 0,
    maintenanceDueItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // カテゴリの初期化
  const initializeData = async () => {
    if (!user?.uid) return;
    
    try {
      // カテゴリの初期化
      await initializeCategories();
      
      // カテゴリの取得
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error initializing categories:', err);
      setError('カテゴリの初期化に失敗しました');
    }
  };

  // データの取得
  const loadData = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 統計データの取得
      const statsData = await getInventoryStatistics();
      setStatistics(statsData);
    } catch (err) {
      console.error('Error loading inventory data:', err);
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

    // 初期データの設定
    initializeData();

    // リアルタイム購読
    const unsubscribe = subscribeToInventoryItems((itemsData) => {
      setItems(itemsData);
      // 統計データの更新
      loadData();
    });

    // 初回データ取得
    loadData();

    return () => unsubscribe();
  }, [user?.uid]);

  // アイテム作成
  const createItem = async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await createInventoryItem({
        ...itemData,
        createdBy: user?.uid,
      });
    } catch (err) {
      console.error('Error creating inventory item:', err);
      setError('アイテムの作成に失敗しました');
      throw err;
    }
  };

  // アイテム更新
  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await updateInventoryItem(id, updates);
    } catch (err) {
      console.error('Error updating inventory item:', err);
      setError('アイテムの更新に失敗しました');
      throw err;
    }
  };

  // アイテム削除
  const deleteItem = async (id: string) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await deleteInventoryItem(id);
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      setError('アイテムの削除に失敗しました');
      throw err;
    }
  };

  // メンテナンス記録作成
  const createMaintenance = async (recordData: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    
    try {
      setError(null);
      await createMaintenanceRecord({
        ...recordData,
        createdBy: user?.uid,
      });
    } catch (err) {
      console.error('Error creating maintenance record:', err);
      setError('メンテナンス記録の作成に失敗しました');
      throw err;
    }
  };

  // メンテナンス履歴取得
  const getMaintenanceHistory = async (itemId: string): Promise<MaintenanceRecord[]> => {
    try {
      return await getMaintenanceRecords(itemId);
    } catch (err) {
      console.error('Error getting maintenance history:', err);
      setError('メンテナンス履歴の取得に失敗しました');
      throw err;
    }
  };

  // データの手動更新
  const refreshData = async () => {
    await loadData();
  };

  return {
    items,
    categories,
    statistics,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    createMaintenance,
    getMaintenanceHistory,
    refreshData,
  };
};