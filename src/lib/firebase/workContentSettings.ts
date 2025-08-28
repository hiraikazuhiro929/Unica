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

    // デフォルトデータがない場合は作成
    if (workContentTypes.length === 0) {
      await createDefaultWorkContentTypes();
      return getWorkContentTypes(); // 再帰的に呼び出し
    }

    return { data: workContentTypes, error: null };
  } catch (error: any) {
    console.error('Error getting work content types:', error);
    
    // エラー時はデフォルトデータを返す
    return { data: [
      {
        id: "1",
        name: "data",
        nameJapanese: "データ",
        isActive: true,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "chamfering",
        nameJapanese: "面取り",
        isActive: true,
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "3",
        name: "finishing",
        nameJapanese: "仕上げ",
        isActive: true,
        order: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "4",
        name: "machining",
        nameJapanese: "機械加工",
        isActive: true,
        order: 4,
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
      name: "data",
      nameJapanese: "データ",
      isActive: true,
      order: 1,
    },
    {
      name: "chamfering", 
      nameJapanese: "面取り",
      isActive: true,
      order: 2,
    },
    {
      name: "finishing",
      nameJapanese: "仕上げ",
      isActive: true,
      order: 3,
    },
    {
      name: "machining",
      nameJapanese: "機械加工",
      isActive: true,
      order: 4,
    },
    {
      name: "others",
      nameJapanese: "その他",
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