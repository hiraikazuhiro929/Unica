import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { WorkContentType } from '@/app/tasks/types';

const COLLECTION_NAME = 'work-content-types';

/**
 * 作業内容タイプを取得
 */
export const getWorkContentTypes = async (): Promise<{ data: WorkContentType[]; error: string | null }> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const workContentTypes: WorkContentType[] = [];
    
    querySnapshot.forEach((doc) => {
      workContentTypes.push({ id: doc.id, ...doc.data() } as WorkContentType);
    });

    // 重複を除去（同じnameJapaneseのものは最初のもののみ保持）
    const uniqueTypes = workContentTypes.filter((type, index, self) => 
      index === self.findIndex(t => t.nameJapanese === type.nameJapanese)
    );

    // デフォルトデータがない場合は作成
    if (uniqueTypes.length === 0) {
      await createDefaultWorkContentTypes();
      return getWorkContentTypes(); // 再帰的に呼び出し
    }

    return { data: uniqueTypes, error: null };
  } catch (error: any) {
    console.error('Error getting work content types:', error);
    
    // エラー時はデフォルトデータを返す
    return { data: [
      {
        id: "1",
        name: "setup",
        nameJapanese: "段取り",
        isActive: true,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "machining",
        nameJapanese: "機械加工",
        isActive: true,
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "3",
        name: "finishing",
        nameJapanese: "仕上",
        isActive: true,
        order: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "4",
        name: "data",
        nameJapanese: "データ作業",
        isActive: true,
        order: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "5",
        name: "chamfering",
        nameJapanese: "面取",
        isActive: true,
        order: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ], error: error.message };
  }
};

/**
 * デフォルトの作業内容タイプを作成
 */
const createDefaultWorkContentTypes = async () => {
  const defaultTypes = [
    {
      name: "setup",
      nameJapanese: "段取り",
      isActive: true,
      order: 1,
    },
    {
      name: "machining",
      nameJapanese: "機械加工",
      isActive: true,
      order: 2,
    },
    {
      name: "finishing",
      nameJapanese: "仕上",
      isActive: true,
      order: 3,
    },
    {
      name: "data",
      nameJapanese: "データ作業",
      isActive: true,
      order: 4,
    },
    {
      name: "chamfering",
      nameJapanese: "面取",
      isActive: true,
      order: 5,
    },
  ];

  const now = new Date().toISOString();
  
  for (const type of defaultTypes) {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...type,
      createdAt: now,
      updatedAt: now,
    });
  }
};

/**
 * 作業内容タイプを作成
 */
export const createWorkContentType = async (data: Omit<WorkContentType, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString();
    const newType = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newType);
    
    return {
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...newType }
    };
  } catch (error: any) {
    console.error('Error creating work content type:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 作業内容タイプを更新
 */
export const updateWorkContentType = async (id: string, updateData: Partial<WorkContentType>) => {
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
    console.error('Error updating work content type:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 重複データを削除する（一度実行用）
 */
export const cleanupDuplicateWorkContentTypes = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    
    const allTypes: (WorkContentType & { docId: string })[] = [];
    querySnapshot.forEach((doc) => {
      allTypes.push({ docId: doc.id, id: doc.id, ...doc.data() } as WorkContentType & { docId: string });
    });

    // 日本語名でグループ化
    const grouped = allTypes.reduce((acc, type) => {
      if (!acc[type.nameJapanese]) {
        acc[type.nameJapanese] = [];
      }
      acc[type.nameJapanese].push(type);
      return acc;
    }, {} as Record<string, (WorkContentType & { docId: string })[]>);

    // 重複を削除（最初のもの以外を削除）
    let deletedCount = 0;
    for (const [name, types] of Object.entries(grouped)) {
      if (types.length > 1) {
        console.log(`重複発見: ${name} (${types.length}件)`);
        // 最初のもの以外を削除
        for (let i = 1; i < types.length; i++) {
          await deleteDoc(doc(db, COLLECTION_NAME, types[i].docId));
          deletedCount++;
          console.log(`削除: ${name} - ${types[i].docId}`);
        }
      }
    }

    console.log(`✅ クリーンアップ完了: ${deletedCount}件の重複を削除しました`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('❌ クリーンアップエラー:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 作業内容タイプを削除
 */
export const deleteWorkContentType = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    
    return {
      success: true,
      id
    };
  } catch (error: any) {
    console.error('Error deleting work content type:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 作業内容タイプのリアルタイム購読
 */
export const subscribeToWorkContentTypes = (callback: (types: WorkContentType[]) => void) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('order', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const types: WorkContentType[] = [];
      querySnapshot.forEach((doc) => {
        types.push({ id: doc.id, ...doc.data() } as WorkContentType);
      });
      callback(types);
    }, (error) => {
      console.error('Error in work content types subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up work content types subscription:', error);
    return () => {}; // 空の関数を返す
  }
};