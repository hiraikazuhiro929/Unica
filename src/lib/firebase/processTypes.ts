import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

export interface ProcessType {
  id?: string;
  name: string;
  nameJapanese: string;
  category?: 'setup' | 'machining' | 'finishing' | 'inspection' | 'other';
  isActive: boolean;
  order: number;
  hourlyRate?: number; // 工程別の標準時間単価
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION_NAME = 'process-types';

/**
 * 工程タイプを取得
 */
export const getProcessTypes = async (): Promise<{ data: ProcessType[]; error: string | null }> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const processTypes: ProcessType[] = [];
    
    querySnapshot.forEach((doc) => {
      processTypes.push({ id: doc.id, ...doc.data() } as ProcessType);
    });

    // 重複を除去（同じnameJapaneseのものは最初のもののみ保持）
    const uniqueProcessTypes = processTypes.filter((type, index, self) =>
      index === self.findIndex(t => t.nameJapanese === type.nameJapanese)
    );

    console.log('🔍 Process Types Debug:', {
      total: processTypes.length,
      unique: uniqueProcessTypes.length,
      removed: processTypes.length - uniqueProcessTypes.length,
      duplicates: processTypes.map(pt => pt.nameJapanese)
    });

    // デフォルトデータがない場合は作成
    if (uniqueProcessTypes.length === 0) {
      await createDefaultProcessTypes();
      return getProcessTypes(); // 再帰的に呼び出し
    }

    return { data: uniqueProcessTypes, error: null };
  } catch (error: any) {
    console.error('Error getting process types:', error);
    return { data: getDefaultProcessTypes(), error: error.message };
  }
};

/**
 * デフォルトの工程タイプを返す（エラー時のフォールバック）
 */
const getDefaultProcessTypes = (): ProcessType[] => {
  return [
    {
      id: "1",
      name: "inspection",
      nameJapanese: "検査",
      category: 'inspection',
      isActive: true,
      order: 1,
      hourlyRate: 3000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "packing",
      nameJapanese: "梱包",
      category: 'other',
      isActive: true,
      order: 2,
      hourlyRate: 2500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      name: "assembly",
      nameJapanese: "組立",
      category: 'finishing',
      isActive: true,
      order: 3,
      hourlyRate: 3500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "4",
      name: "welding",
      nameJapanese: "溶接",
      category: 'machining',
      isActive: true,
      order: 4,
      hourlyRate: 4000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "5",
      name: "painting",
      nameJapanese: "塗装",
      category: 'finishing',
      isActive: true,
      order: 5,
      hourlyRate: 3200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "6",
      name: "drying",
      nameJapanese: "乾燥",
      category: 'other',
      isActive: true,
      order: 6,
      hourlyRate: 2000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "7",
      name: "adjustment",
      nameJapanese: "調整",
      category: 'setup',
      isActive: true,
      order: 7,
      hourlyRate: 3500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "8",
      name: "quality_check",
      nameJapanese: "品質チェック",
      category: 'inspection',
      isActive: true,
      order: 8,
      hourlyRate: 3300,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "9",
      name: "cleaning",
      nameJapanese: "清掃",
      category: 'other',
      isActive: true,
      order: 9,
      hourlyRate: 2200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "10",
      name: "transport",
      nameJapanese: "運搬",
      category: 'other',
      isActive: true,
      order: 10,
      hourlyRate: 2800,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "11",
      name: "other",
      nameJapanese: "その他",
      category: 'other',
      isActive: true,
      order: 11,
      hourlyRate: 3000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
};

/**
 * デフォルトの工程タイプを作成
 */
const createDefaultProcessTypes = async () => {
  const defaultTypes = getDefaultProcessTypes();
  const now = new Date().toISOString();
  
  for (const type of defaultTypes) {
    const { id, ...data } = type;
    await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
};

/**
 * 工程タイプを作成
 */
export const createProcessType = async (data: Omit<ProcessType, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString();
    const newType = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newType);
    return { data: { id: docRef.id, ...newType }, error: null };
  } catch (error: any) {
    console.error('Error creating process type:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 工程タイプを更新
 */
export const updateProcessType = async (id: string, data: Partial<Omit<ProcessType, 'id' | 'createdAt'>>) => {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    await updateDoc(doc(db, COLLECTION_NAME, id), updateData);
    return { error: null };
  } catch (error: any) {
    console.error('Error updating process type:', error);
    return { error: error.message };
  }
};

/**
 * 工程タイプを削除
 */
export const deleteProcessType = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting process type:', error);
    return { error: error.message };
  }
};

/**
 * データベースから重複した工程タイプを削除
 */
export const cleanupDuplicateProcessTypes = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);

    const processTypes: (ProcessType & { docId: string })[] = [];
    querySnapshot.forEach((doc) => {
      processTypes.push({ docId: doc.id, id: doc.id, ...doc.data() } as ProcessType & { docId: string });
    });

    // nameJapaneseでグループ化
    const grouped = processTypes.reduce((acc, type) => {
      const key = type.nameJapanese;
      if (!acc[key]) acc[key] = [];
      acc[key].push(type);
      return acc;
    }, {} as Record<string, (ProcessType & { docId: string })[]>);

    let deletedCount = 0;

    // 各グループで最初の1つ以外を削除
    for (const [nameJapanese, types] of Object.entries(grouped)) {
      if (types.length > 1) {
        console.log(`🗑️ Found ${types.length} duplicates for "${nameJapanese}"`);
        // 最初の1つ以外を削除
        for (let i = 1; i < types.length; i++) {
          await deleteDoc(doc(db, COLLECTION_NAME, types[i].docId));
          deletedCount++;
          console.log(`🗑️ Deleted duplicate: ${nameJapanese} (${types[i].docId})`);
        }
      }
    }

    console.log(`✅ Cleanup completed. Deleted ${deletedCount} duplicate process types.`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('Error cleaning up duplicate process types:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 工程タイプの変更をリアルタイムで監視
 */
export const subscribeToProcessTypes = (
  onUpdate: (types: ProcessType[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('order', 'asc')
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const processTypes: ProcessType[] = [];
      querySnapshot.forEach((doc) => {
        processTypes.push({ id: doc.id, ...doc.data() } as ProcessType);
      });

      // リアルタイム監視でも重複除去
      const uniqueProcessTypes = processTypes.filter((type, index, self) =>
        index === self.findIndex(t => t.nameJapanese === type.nameJapanese)
      );

      onUpdate(uniqueProcessTypes);
    },
    (error) => {
      console.error('Error in process types subscription:', error);
      if (onError) onError(error);
    }
  );
};