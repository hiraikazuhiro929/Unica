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

// 機械の型定義
export interface Machine {
  id?: string;
  name: string;
  type: string;
  hourlyRate: number;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION_NAME = 'machines';

/**
 * 機械を作成
 */
export const createMachine = async (machineData: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...machineData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error: any) {
    console.error('Error creating machine:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 機械を更新
 */
export const updateMachine = async (id: string, updateData: Partial<Machine>) => {
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
    console.error('Error updating machine:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 機械を削除
 */
export const deleteMachine = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    
    return {
      success: true,
      id
    };
  } catch (error: any) {
    console.error('Error deleting machine:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 機械リストを取得
 */
export const getMachines = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const machines: Machine[] = [];
    querySnapshot.forEach((doc) => {
      machines.push({ id: doc.id, ...doc.data() } as Machine);
    });
    
    return {
      success: true,
      data: machines
    };
  } catch (error: any) {
    console.error('Error getting machines:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * 機械のリアルタイム購読
 */
export const subscribeToMachines = (callback: (machines: Machine[]) => void) => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const machines: Machine[] = [];
      querySnapshot.forEach((doc) => {
        machines.push({ id: doc.id, ...doc.data() } as Machine);
      });
      callback(machines);
    }, (error) => {
      console.error('Error in machines subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up machines subscription:', error);
    return () => {};
  }
};