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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

// 作業者の型定義
export interface Worker {
  id?: string;
  name: string;
  hourlyRate: number;
  skills: string[];
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION_NAME = 'workers';

/**
 * 作業者を作成
 */
export const createWorker = async (workerData: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...workerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error: any) {
    console.error('Error creating worker:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 作業者を更新
 */
export const updateWorker = async (id: string, updateData: Partial<Worker>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id
    };
  } catch (error: any) {
    console.error('Error updating worker:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 作業者を削除
 */
export const deleteWorker = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    
    return {
      success: true,
      id
    };
  } catch (error: any) {
    console.error('Error deleting worker:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 作業者リストを取得
 */
export const getWorkers = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const workers: Worker[] = [];
    querySnapshot.forEach((doc) => {
      workers.push({ id: doc.id, ...doc.data() } as Worker);
    });
    
    return {
      success: true,
      data: workers
    };
  } catch (error: any) {
    console.error('Error getting workers:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * 作業者のリアルタイム購読
 */
export const subscribeToWorkers = (callback: (workers: Worker[]) => void) => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const workers: Worker[] = [];
      querySnapshot.forEach((doc) => {
        workers.push({ id: doc.id, ...doc.data() } as Worker);
      });
      callback(workers);
    }, (error) => {
      console.error('Error in workers subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up workers subscription:', error);
    return () => {};
  }
};