import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const TASK_COLLECTIONS = {
  COMPANY_TASKS: 'companyTasks',
  PERSONAL_TASKS: 'personalTasks',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CompanyTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  assigneeId: string;
  dueDate?: string;
  createdBy: string;
  createdById: string;
  category: 'general' | 'manufacturing' | 'quality' | 'maintenance' | 'safety';
  relatedProcessId?: string;
  completedAt?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PersonalTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: string;
  dueDate?: string;
  category: 'work' | 'personal' | 'learning' | 'meeting' | 'reminder';
  relatedProcessId?: string;
  completedAt?: string;
  createdAt: any;
  updatedAt: any;
}

// =============================================================================
// COMPANY TASKS OPERATIONS
// =============================================================================

/**
 * 全体タスクを作成
 */
export const createCompanyTask = async (
  taskData: Omit<CompanyTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, TASK_COLLECTIONS.COMPANY_TASKS), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: Error | unknown) {
    console.error('Error creating company task:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 全体タスクのリストを取得
 */
export const getCompanyTasks = async (filters?: {
  assigneeId?: string;
  status?: CompanyTask['status'];
  priority?: CompanyTask['priority'];
  category?: CompanyTask['category'];
  relatedProcessId?: string;
  limit?: number;
}): Promise<{ data: CompanyTask[]; error: string | null }> => {
  try {
    let q = collection(db, TASK_COLLECTIONS.COMPANY_TASKS);
    const constraints: QueryConstraint[] = [];

    // 単一フィルタのみ適用（複合インデックス回避）
    if (filters?.assigneeId) {
      constraints.push(where('assigneeId', '==', filters.assigneeId));
    } else if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    } else if (filters?.priority) {
      constraints.push(where('priority', '==', filters.priority));
    } else if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    } else if (filters?.relatedProcessId) {
      constraints.push(where('relatedProcessId', '==', filters.relatedProcessId));
    } else {
      // デフォルトでは更新日時順
      constraints.push(orderBy('updatedAt', 'desc'));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CompanyTask[];

    // クライアントサイドで追加フィルタリング
    if (filters) {
      if (filters.status && !constraints.some(c => c.toString().includes('status'))) {
        data = data.filter(task => task.status === filters.status);
      }
      if (filters.priority && !constraints.some(c => c.toString().includes('priority'))) {
        data = data.filter(task => task.priority === filters.priority);
      }
      if (filters.category && !constraints.some(c => c.toString().includes('category'))) {
        data = data.filter(task => task.category === filters.category);
      }
    }

    return { data, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting company tasks:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 全体タスクを更新
 */
export const updateCompanyTask = async (
  taskId: string,
  updates: Partial<CompanyTask>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, TASK_COLLECTIONS.COMPANY_TASKS, taskId);
    
    // 完了時は完了日時を設定
    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating company task:', error);
    return { error: error.message };
  }
};

/**
 * 全体タスクを削除
 */
export const deleteCompanyTask = async (
  taskId: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, TASK_COLLECTIONS.COMPANY_TASKS, taskId);
    await deleteDoc(docRef);
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting company task:', error);
    return { error: error.message };
  }
};

// =============================================================================
// PERSONAL TASKS OPERATIONS
// =============================================================================

/**
 * 個人タスクを作成
 */
export const createPersonalTask = async (
  taskData: Omit<PersonalTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, TASK_COLLECTIONS.PERSONAL_TASKS), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: Error | unknown) {
    console.error('Error creating personal task:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 個人タスクのリストを取得
 */
export const getPersonalTasks = async (filters?: {
  userId: string;
  status?: PersonalTask['status'];
  priority?: PersonalTask['priority'];
  category?: PersonalTask['category'];
  relatedProcessId?: string;
  limit?: number;
}): Promise<{ data: PersonalTask[]; error: string | null }> => {
  try {
    if (!filters?.userId) {
      return { data: [], error: 'userId is required' };
    }

    let q = collection(db, TASK_COLLECTIONS.PERSONAL_TASKS);
    const constraints: QueryConstraint[] = [
      where('userId', '==', filters.userId)
    ];

    // 追加のフィルタは1つまで（複合インデックス回避）
    if (filters.status) {
      // statusでフィルタする場合はuserIdと組み合わせられるが、他のフィルタは除外
    } else if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    } else if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    } else if (filters.relatedProcessId) {
      constraints.push(where('relatedProcessId', '==', filters.relatedProcessId));
    } else {
      constraints.push(orderBy('updatedAt', 'desc'));
    }

    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PersonalTask[];

    // クライアントサイドで追加フィルタリング
    if (filters) {
      if (filters.status) {
        data = data.filter(task => task.status === filters.status);
      }
      if (filters.priority && !constraints.some(c => c.toString().includes('priority'))) {
        data = data.filter(task => task.priority === filters.priority);
      }
      if (filters.category && !constraints.some(c => c.toString().includes('category'))) {
        data = data.filter(task => task.category === filters.category);
      }
    }

    return { data, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting personal tasks:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 個人タスクを更新
 */
export const updatePersonalTask = async (
  taskId: string,
  updates: Partial<PersonalTask>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, TASK_COLLECTIONS.PERSONAL_TASKS, taskId);
    
    // 完了時は完了日時を設定
    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating personal task:', error);
    return { error: error.message };
  }
};

/**
 * 個人タスクを削除
 */
export const deletePersonalTask = async (
  taskId: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, TASK_COLLECTIONS.PERSONAL_TASKS, taskId);
    await deleteDoc(docRef);
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting personal task:', error);
    return { error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 全体タスクの変更をリアルタイムで監視
 */
export const subscribeToCompanyTasks = (
  filters: Parameters<typeof getCompanyTasks>[0],
  callback: (data: CompanyTask[]) => void
): (() => void) => {
  let q = collection(db, TASK_COLLECTIONS.COMPANY_TASKS);
  const constraints: QueryConstraint[] = [];

  // 単一フィルタのみ適用
  if (filters?.assigneeId) {
    constraints.push(where('assigneeId', '==', filters.assigneeId));
  } else if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  } else {
    constraints.push(orderBy('updatedAt', 'desc'));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CompanyTask[];

    // クライアントサイドフィルタリング
    if (filters) {
      if (filters.status && !constraints.some(c => c.toString().includes('status'))) {
        data = data.filter(task => task.status === filters.status);
      }
      if (filters.priority) {
        data = data.filter(task => task.priority === filters.priority);
      }
      if (filters.category) {
        data = data.filter(task => task.category === filters.category);
      }
    }

    callback(data);
  }, (error) => {
    console.error('Error in company tasks subscription:', error);
    callback([]);
  });
};

/**
 * 個人タスクの変更をリアルタイムで監視
 */
export const subscribeToPersonalTasks = (
  filters: Parameters<typeof getPersonalTasks>[0],
  callback: (data: PersonalTask[]) => void
): (() => void) => {
  if (!filters?.userId) {
    callback([]);
    return () => {};
  }

  let q = collection(db, TASK_COLLECTIONS.PERSONAL_TASKS);
  const constraints: QueryConstraint[] = [
    where('userId', '==', filters.userId)
  ];

  if (filters.status) {
    // statusとuserIdの組み合わせは可能
  } else if (filters.priority) {
    constraints.push(where('priority', '==', filters.priority));
  } else {
    constraints.push(orderBy('updatedAt', 'desc'));
  }

  if (filters.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PersonalTask[];

    // クライアントサイドフィルタリング
    if (filters) {
      if (filters.status) {
        data = data.filter(task => task.status === filters.status);
      }
      if (filters.category) {
        data = data.filter(task => task.category === filters.category);
      }
    }

    callback(data);
  }, (error) => {
    console.error('Error in personal tasks subscription:', error);
    callback([]);
  });
};

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * 全ての個人タスクを削除（開発用）
 */
export const deleteAllPersonalTasks = async (): Promise<{ error: string | null }> => {
  try {
    const querySnapshot = await getDocs(collection(db, TASK_COLLECTIONS.PERSONAL_TASKS));
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`${querySnapshot.docs.length} 個の個人タスクを削除しました`);
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting all personal tasks:', error);
    return { error: error.message };
  }
};

/**
 * 全ての会社タスクを削除（開発用）
 */
export const deleteAllCompanyTasks = async (): Promise<{ error: string | null }> => {
  try {
    const querySnapshot = await getDocs(collection(db, TASK_COLLECTIONS.COMPANY_TASKS));
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`${querySnapshot.docs.length} 個の会社タスクを削除しました`);
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting all company tasks:', error);
    return { error: error.message };
  }
};

// =============================================================================
// DASHBOARD UTILITIES
// =============================================================================

/**
 * ダッシュボード用タスク統計を取得
 */
export const getTasksStatistics = async (userId?: string): Promise<{
  data: {
    companyTasks: {
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
    };
    personalTasks: {
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
    };
  };
  error: string | null;
}> => {
  try {
    // 全体タスク統計
    const { data: companyTasks, error: companyError } = await getCompanyTasks({ limit: 1000 });
    if (companyError) throw new Error(companyError);

    const companyStats = {
      total: companyTasks.length,
      completed: companyTasks.filter(t => t.status === 'completed').length,
      inProgress: companyTasks.filter(t => t.status === 'progress').length,
      pending: companyTasks.filter(t => t.status === 'pending').length,
    };

    // 個人タスク統計（userIdが提供された場合）
    let personalStats = { total: 0, completed: 0, inProgress: 0, pending: 0 };
    if (userId) {
      const { data: personalTasks, error: personalError } = await getPersonalTasks({ 
        userId, 
        limit: 1000 
      });
      if (personalError) throw new Error(personalError);

      personalStats = {
        total: personalTasks.length,
        completed: personalTasks.filter(t => t.status === 'completed').length,
        inProgress: personalTasks.filter(t => t.status === 'progress').length,
        pending: personalTasks.filter(t => t.status === 'pending').length,
      };
    }

    return {
      data: {
        companyTasks: companyStats,
        personalTasks: personalStats,
      },
      error: null
    };
  } catch (error: Error | unknown) {
    console.error('Error getting tasks statistics:', error);
    return {
      data: {
        companyTasks: { total: 0, completed: 0, inProgress: 0, pending: 0 },
        personalTasks: { total: 0, completed: 0, inProgress: 0, pending: 0 },
      },
      error: error.message
    };
  }
};