import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import type { Process, Company } from '@/app/tasks/types';

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const COLLECTIONS = {
  PROCESSES: 'processes',
  COMPANIES: 'companies',
  PROCESS_TEMPLATES: 'processTemplates',
  PROCESS_HISTORY: 'processHistory',
} as const;

// =============================================================================
// PROCESS CRUD OPERATIONS
// =============================================================================

/**
 * 新しい工程を作成
 */
export const createProcess = async (
  processData: Omit<Process, 'id'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.PROCESSES), {
      ...processData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update company's process list if company exists
    if (processData.orderClient) {
      await updateCompanyProcessList(processData.orderClient, docRef.id, 'add');
    }

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating process:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 工程を取得
 */
export const getProcess = async (
  processId: string
): Promise<{ data: Process | null; error: string | null }> => {
  try {
    const docRef = doc(db, COLLECTIONS.PROCESSES, processId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data
        } as Process,
        error: null
      };
    } else {
      return { data: null, error: 'Process not found' };
    }
  } catch (error: any) {
    console.error('Error getting process:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 複数の工程を取得
 */
export const getProcessesList = async (filters?: {
  orderId?: string;
  orderClient?: string;
  status?: Process['status'];
  priority?: Process['priority'];
  assignee?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
  orderByField?: 'orderDate' | 'dueDate' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}): Promise<{ data: Process[]; error: string | null }> => {
  try {
    let q = collection(db, COLLECTIONS.PROCESSES);
    const constraints: QueryConstraint[] = [];

    // 複合インデックスを避けるため、フィルタを優先順位で制限
    let appliedFilters = 0;
    const maxFilters = 1; // 複合インデックス問題を避けるため一度に1つのフィルタのみ

    // 優先順位：orderClient > status > orderId > priority > assignee
    if (filters?.orderClient && appliedFilters < maxFilters) {
      constraints.push(where('orderClient', '==', filters.orderClient));
      appliedFilters++;
    } else if (filters?.status && appliedFilters < maxFilters) {
      constraints.push(where('status', '==', filters.status));
      appliedFilters++;
    } else if (filters?.orderId && appliedFilters < maxFilters) {
      constraints.push(where('orderId', '==', filters.orderId));
      appliedFilters++;
    } else if (filters?.priority && appliedFilters < maxFilters) {
      constraints.push(where('priority', '==', filters.priority));
      appliedFilters++;
    } else if (filters?.assignee && appliedFilters < maxFilters) {
      constraints.push(where('assignee', '==', filters.assignee));
      appliedFilters++;
    }
    
    // 日付範囲クエリは複合インデックスが必要なので、他のフィルタがない場合のみ適用
    if (filters?.dateRange && appliedFilters === 0) {
      constraints.push(where('orderDate', '>=', filters.dateRange.start));
      constraints.push(where('orderDate', '<=', filters.dateRange.end));
    }

    // orderByは他のフィルタがない場合、または適用されたフィルタが同じフィールドの場合のみ
    const orderField = filters?.orderByField || 'updatedAt';
    const orderDirection = filters?.orderDirection || 'desc';
    
    // 単一フィールドのクエリの場合のみorderByを適用
    if (appliedFilters === 0) {
      constraints.push(orderBy(orderField, orderDirection));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Process[];

    // クライアントサイドで追加フィルタリングを実行
    if (filters) {
      if (filters.status && appliedFilters === 0) {
        data = data.filter(process => process.status === filters.status);
      }
      if (filters.priority && !constraints.some(c => c.toString().includes('priority'))) {
        data = data.filter(process => process.priority === filters.priority);
      }
      if (filters.assignee && !constraints.some(c => c.toString().includes('assignee'))) {
        data = data.filter(process => process.assignee === filters.assignee);
      }
      if (filters.dateRange && appliedFilters > 0) {
        data = data.filter(process => 
          process.orderDate >= filters.dateRange!.start && 
          process.orderDate <= filters.dateRange!.end
        );
      }
    }

    // クライアントサイドでソート（orderByが適用されなかった場合）
    if (appliedFilters > 0) {
      const orderField = filters?.orderByField || 'updatedAt';
      const orderDirection = filters?.orderDirection || 'desc';
      
      data.sort((a, b) => {
        const aValue = (a as any)[orderField];
        const bValue = (b as any)[orderField];
        
        if (orderDirection === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting processes list:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 工程を更新
 */
export const updateProcess = async (
  processId: string,
  updates: Partial<Process>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, COLLECTIONS.PROCESSES, processId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating process:', error);
    return { error: error.message };
  }
};

/**
 * 工程を削除
 */
export const deleteProcess = async (
  processId: string
): Promise<{ error: string | null }> => {
  try {
    // Get process data to update company list
    const { data: process } = await getProcess(processId);
    
    const docRef = doc(db, COLLECTIONS.PROCESSES, processId);
    await deleteDoc(docRef);
    
    // Update company's process list
    if (process?.orderClient) {
      await updateCompanyProcessList(process.orderClient, processId, 'remove');
    }
    
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting process:', error);
    return { error: error.message };
  }
};

// =============================================================================
// COMPANY MANAGEMENT
// =============================================================================

/**
 * 会社を作成または取得
 */
export const getOrCreateCompany = async (
  companyName: string
): Promise<{ data: Company | null; error: string | null }> => {
  try {
    // First try to get existing company
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTIONS.COMPANIES), where('name', '==', companyName))
    );

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        data: {
          id: doc.id,
          ...data
        } as Company,
        error: null
      };
    }

    // Create new company if it doesn't exist
    const newCompany: Omit<Company, 'id'> = {
      name: companyName,
      processes: [],
      isExpanded: true
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.COMPANIES), {
      ...newCompany,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      data: {
        id: docRef.id,
        ...newCompany
      },
      error: null
    };
  } catch (error: any) {
    console.error('Error getting or creating company:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 会社の工程リストを更新
 */
const updateCompanyProcessList = async (
  companyName: string,
  processId: string,
  action: 'add' | 'remove'
): Promise<void> => {
  try {
    const { data: company } = await getOrCreateCompany(companyName);
    if (!company) return;

    let updatedProcessIds = [...(company.processes || [])];
    
    if (action === 'add' && !updatedProcessIds.includes(processId)) {
      updatedProcessIds.push(processId);
    } else if (action === 'remove') {
      updatedProcessIds = updatedProcessIds.filter(id => id !== processId);
    }

    const docRef = doc(db, COLLECTIONS.COMPANIES, company.id);
    await updateDoc(docRef, {
      processes: updatedProcessIds,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating company process list:', error);
  }
};

/**
 * 会社とその工程データを取得
 */
export const getCompaniesWithProcesses = async (): Promise<{ 
  data: Company[]; 
  error: string | null 
}> => {
  try {
    // Get all companies
    const companiesSnapshot = await getDocs(collection(db, COLLECTIONS.COMPANIES));
    const companies = companiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Company[];

    // Get all processes for these companies
    const companyNames = companies.map(c => c.name);
    const processesSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.PROCESSES),
        where('orderClient', 'in', companyNames.slice(0, 10)) // Firestore 'in' limit is 10
      )
    );

    const processes = processesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Process[];

    // Group processes by company
    const companiesWithProcesses = companies.map(company => ({
      ...company,
      processes: processes.filter(p => p.orderClient === company.name)
    }));

    return { data: companiesWithProcesses, error: null };
  } catch (error: any) {
    console.error('Error getting companies with processes:', error);
    return { data: [], error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 工程の変更をリアルタイムで監視
 */
export const subscribeToProcess = (
  processId: string,
  callback: (data: Process | null) => void
): (() => void) => {
  const docRef = doc(db, COLLECTIONS.PROCESSES, processId);

  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data()
      } as Process);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in process subscription:', error);
    callback(null);
  });
};

/**
 * 工程リストの変更をリアルタイムで監視
 */
export const subscribeToProcessesList = (
  filters: Parameters<typeof getProcessesList>[0],
  callback: (data: Process[]) => void
): (() => void) => {
  let q = collection(db, COLLECTIONS.PROCESSES);
  const constraints: QueryConstraint[] = [];

  // 複合インデックスを避けるため、1つのフィルタのみ適用
  let appliedFilters = 0;
  const maxFilters = 1;

  // 優先順位：orderClient > status > orderId > priority > assignee
  if (filters?.orderClient && appliedFilters < maxFilters) {
    constraints.push(where('orderClient', '==', filters.orderClient));
    appliedFilters++;
  } else if (filters?.status && appliedFilters < maxFilters) {
    constraints.push(where('status', '==', filters.status));
    appliedFilters++;
  } else if (filters?.orderId && appliedFilters < maxFilters) {
    constraints.push(where('orderId', '==', filters.orderId));
    appliedFilters++;
  } else if (filters?.priority && appliedFilters < maxFilters) {
    constraints.push(where('priority', '==', filters.priority));
    appliedFilters++;
  } else if (filters?.assignee && appliedFilters < maxFilters) {
    constraints.push(where('assignee', '==', filters.assignee));
    appliedFilters++;
  }

  // orderByは他のフィルタがない場合のみ適用
  if (appliedFilters === 0) {
    const orderField = filters?.orderByField || 'updatedAt';
    const orderDirection = filters?.orderDirection || 'desc';
    constraints.push(orderBy(orderField, orderDirection));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Process[];

    // クライアントサイドで追加フィルタリング
    if (filters) {
      if (filters.status && appliedFilters === 0) {
        data = data.filter(process => process.status === filters.status);
      }
      if (filters.priority && !constraints.some(c => c.toString().includes('priority'))) {
        data = data.filter(process => process.priority === filters.priority);
      }
      if (filters.assignee && !constraints.some(c => c.toString().includes('assignee'))) {
        data = data.filter(process => process.assignee === filters.assignee);
      }
      if (filters.dateRange) {
        data = data.filter(process => 
          process.orderDate >= filters.dateRange!.start && 
          process.orderDate <= filters.dateRange!.end
        );
      }
    }

    // クライアントサイドでソート（orderByが適用されなかった場合）
    if (appliedFilters > 0 && filters?.orderByField) {
      const orderField = filters.orderByField;
      const orderDirection = filters.orderDirection || 'desc';
      
      data.sort((a, b) => {
        const aValue = (a as any)[orderField];
        const bValue = (b as any)[orderField];
        
        if (orderDirection === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    callback(data);
  }, (error) => {
    console.error('Error in processes list subscription:', error);
    callback([]);
  });
};

/**
 * 会社と工程データの変更をリアルタイムで監視
 */
export const subscribeToCompaniesWithProcesses = (
  callback: (data: Company[]) => void
): (() => void) => {
  // Subscribe to companies
  const companiesUnsubscribe = onSnapshot(
    collection(db, COLLECTIONS.COMPANIES),
    async (companiesSnapshot) => {
      try {
        const companies = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Company[];

        // Get processes for these companies
        if (companies.length > 0) {
          const companyNames = companies.map(c => c.name);
          
          // Handle Firestore 'in' query limit of 10
          const allProcesses: Process[] = [];
          for (let i = 0; i < companyNames.length; i += 10) {
            const batch = companyNames.slice(i, i + 10);
            const processesSnapshot = await getDocs(
              query(
                collection(db, COLLECTIONS.PROCESSES),
                where('orderClient', 'in', batch)
              )
            );
            
            const batchProcesses = processesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Process[];
            
            allProcesses.push(...batchProcesses);
          }

          // Group processes by company
          const companiesWithProcesses = companies.map(company => ({
            ...company,
            processes: allProcesses.filter(p => p.orderClient === company.name)
          }));

          callback(companiesWithProcesses);
        } else {
          callback([]);
        }
      } catch (error) {
        console.error('Error in companies with processes subscription:', error);
        callback([]);
      }
    },
    (error) => {
      console.error('Error in companies subscription:', error);
      callback([]);
    }
  );

  return companiesUnsubscribe;
};

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * 複数の工程を一括更新
 */
export const bulkUpdateProcesses = async (
  updates: { id: string; data: Partial<Process> }[]
): Promise<{ success: boolean; errors: { id: string; error: string }[] }> => {
  const batch = writeBatch(db);
  const errors: { id: string; error: string }[] = [];

  try {
    for (const update of updates) {
      try {
        const docRef = doc(db, COLLECTIONS.PROCESSES, update.id);
        batch.update(docRef, {
          ...update.data,
          updatedAt: serverTimestamp()
        });
      } catch (error: any) {
        errors.push({ id: update.id, error: error.message });
      }
    }

    if (errors.length === 0) {
      await batch.commit();
    }

    return { success: errors.length === 0, errors };
  } catch (error: any) {
    console.error('Error in bulk update processes:', error);
    return { 
      success: false, 
      errors: updates.map(u => ({ id: u.id, error: error.message }))
    };
  }
};

/**
 * 工程ステータスを一括更新
 */
export const bulkUpdateProcessStatus = async (
  processIds: string[],
  status: Process['status']
): Promise<{ success: boolean; errors: { id: string; error: string }[] }> => {
  const updates = processIds.map(id => ({
    id,
    data: { status }
  }));

  return await bulkUpdateProcesses(updates);
};

/**
 * 工程の担当者を一括更新
 */
export const bulkUpdateProcessAssignee = async (
  processIds: string[],
  assignee: string
): Promise<{ success: boolean; errors: { id: string; error: string }[] }> => {
  const updates = processIds.map(id => ({
    id,
    data: { assignee }
  }));

  return await bulkUpdateProcesses(updates);
};

// =============================================================================
// PROCESS TEMPLATES
// =============================================================================

/**
 * 工程テンプレートを作成
 */
export const createProcessTemplate = async (
  templateData: {
    name: string;
    description?: string;
    defaultWorkDetails: Process['workDetails'];
    defaultSettings: Partial<Process>;
  }
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.PROCESS_TEMPLATES), {
      ...templateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating process template:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 工程テンプレートのリストを取得
 */
export const getProcessTemplates = async (): Promise<{ 
  data: any[]; 
  error: string | null 
}> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTIONS.PROCESS_TEMPLATES), orderBy('name'))
    );
    
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting process templates:', error);
    return { data: [], error: error.message };
  }
};

export {
  // Types for external use
  type Process,
  type Company
};