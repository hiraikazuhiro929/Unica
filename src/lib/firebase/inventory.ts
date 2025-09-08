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
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// コレクション名
export const INVENTORY_COLLECTIONS = {
  ITEMS: 'inventory-items',
  CATEGORIES: 'inventory-categories',
  MAINTENANCE: 'maintenance-records',
} as const;

// 型定義
export interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  condition: "excellent" | "good" | "fair" | "poor" | "broken";
  status: "available" | "in-use" | "maintenance" | "repair" | "retired";
  location: string;
  assignedTo?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  usageHours?: number;
  specifications: { [key: string]: string };
  notes?: string;
  tags: string[];
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecord {
  id: string;
  itemId: string;
  date: string;
  type: "inspection" | "repair" | "replacement" | "calibration";
  description: string;
  cost: number;
  technician: string;
  nextDueDate?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 在庫アイテム操作関数
export const createInventoryItem = async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, INVENTORY_COLLECTIONS.ITEMS), {
      ...itemData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(
      collection(db, INVENTORY_COLLECTIONS.ITEMS),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as InventoryItem));
  } catch (error) {
    console.error('Error getting inventory items:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
  try {
    const docRef = doc(db, INVENTORY_COLLECTIONS.ITEMS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTIONS.ITEMS, id));
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

// ステータス別取得
export const getInventoryItemsByStatus = async (status: InventoryItem['status']): Promise<InventoryItem[]> => {
  try {
    const q = query(
      collection(db, INVENTORY_COLLECTIONS.ITEMS),
      where('status', '==', status),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as InventoryItem));
  } catch (error) {
    console.error('Error getting inventory items by status:', error);
    throw error;
  }
};

// カテゴリ別取得
export const getInventoryItemsByCategory = async (categoryId: string): Promise<InventoryItem[]> => {
  try {
    const q = query(
      collection(db, INVENTORY_COLLECTIONS.ITEMS),
      where('categoryId', '==', categoryId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as InventoryItem));
  } catch (error) {
    console.error('Error getting inventory items by category:', error);
    throw error;
  }
};

// リアルタイム取得
export const subscribeToInventoryItems = (callback: (items: InventoryItem[]) => void) => {
  const q = query(
    collection(db, INVENTORY_COLLECTIONS.ITEMS),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as InventoryItem));
    callback(items);
  });
};

// メンテナンス記録操作
export const createMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, INVENTORY_COLLECTIONS.MAINTENANCE), {
      ...recordData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    throw error;
  }
};

export const getMaintenanceRecords = async (itemId?: string): Promise<MaintenanceRecord[]> => {
  try {
    let q;
    if (itemId) {
      q = query(
        collection(db, INVENTORY_COLLECTIONS.MAINTENANCE),
        where('itemId', '==', itemId),
        orderBy('date', 'desc')
      );
    } else {
      q = query(
        collection(db, INVENTORY_COLLECTIONS.MAINTENANCE),
        orderBy('date', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as MaintenanceRecord));
  } catch (error) {
    console.error('Error getting maintenance records:', error);
    throw error;
  }
};

// メンテナンス期限切れアイテム取得
export const getMaintenanceDueItems = async (daysAhead: number = 30): Promise<InventoryItem[]> => {
  try {
    const items = await getInventoryItems();
    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(now.getDate() + daysAhead);
    
    return items.filter(item => {
      if (!item.nextMaintenanceDate) return false;
      const nextDate = new Date(item.nextMaintenanceDate);
      return nextDate <= dueDate;
    });
  } catch (error) {
    console.error('Error getting maintenance due items:', error);
    throw error;
  }
};

// 統計データ取得
export const getInventoryStatistics = async () => {
  try {
    const items = await getInventoryItems();
    
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
    const availableItems = items.filter(item => item.status === "available").length;
    const inUseItems = items.filter(item => item.status === "in-use").length;
    const maintenanceItems = items.filter(item => item.status === "maintenance").length;
    const repairItems = items.filter(item => item.status === "repair").length;
    
    const avgAge = items.reduce((sum, item) => {
      const purchaseDate = new Date(item.purchaseDate);
      const now = new Date();
      const ageInYears = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return sum + ageInYears;
    }, 0) / totalItems || 0;

    const maintenanceDueItems = await getMaintenanceDueItems(30);

    return {
      totalItems,
      totalValue,
      availableItems,
      inUseItems,
      maintenanceItems,
      repairItems,
      averageAge: avgAge,
      maintenanceDueItems: maintenanceDueItems.length,
    };
  } catch (error) {
    console.error('Error getting inventory statistics:', error);
    throw error;
  }
};

// カテゴリ操作（初期データ用）
export const initializeCategories = async () => {
  try {
    // 既存のカテゴリをチェック
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTIONS.CATEGORIES));
    if (querySnapshot.docs.length > 0) {
      return; // 既にカテゴリが存在する場合は何もしない
    }

    const defaultCategories = [
      {
        id: "cutting-tools",
        name: "切削工具",
        iconName: "Scissors",
        color: "text-blue-600",
        bgColor: "bg-blue-100 border-blue-300",
        description: "エンドミル、ドリル、バイトなど",
      },
      {
        id: "measuring-tools",
        name: "測定器具",
        iconName: "Ruler",
        color: "text-green-600",
        bgColor: "bg-green-100 border-green-300",
        description: "ノギス、マイクロメータ、ゲージなど",
      },
      {
        id: "jigs-fixtures",
        name: "治具・取付具",
        iconName: "Wrench",
        color: "text-purple-600",
        bgColor: "bg-purple-100 border-purple-300",
        description: "バイス、治具、取付具など",
      },
      {
        id: "hand-tools",
        name: "作業工具",
        iconName: "Wrench",
        color: "text-orange-600",
        bgColor: "bg-orange-100 border-orange-300",
        description: "レンチ、ドライバー、ハンマーなど",
      },
      {
        id: "machines",
        name: "機械・設備",
        iconName: "Settings",
        color: "text-red-600",
        bgColor: "bg-red-100 border-red-300",
        description: "工作機械、測定機器など",
      },
      {
        id: "consumables",
        name: "消耗品",
        iconName: "Package",
        color: "text-gray-600",
        bgColor: "bg-gray-100 border-gray-300",
        description: "研磨剤、潤滑油、安全用品など",
      },
    ];

    const batch = writeBatch(db);
    const now = new Date();

    defaultCategories.forEach(category => {
      const docRef = doc(collection(db, INVENTORY_COLLECTIONS.CATEGORIES));
      batch.set(docRef, {
        ...category,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    });

    await batch.commit();
    console.log('Default categories initialized');
  } catch (error) {
    console.error('Error initializing categories:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<InventoryCategory[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTIONS.CATEGORIES));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as InventoryCategory));
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};