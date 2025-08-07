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
// FIRESTORE INDEX OPTIMIZATION STRATEGY
// =============================================================================
/**
 * This file implements a query optimization strategy to avoid composite index requirements.
 * 
 * KEY PRINCIPLES:
 * 1. Use only single-field indexes + orderBy to avoid composite index requirements
 * 2. Primary filter: Always filter by 'createdById' first (security + performance)
 * 3. Secondary filter: Add only ONE additional where clause per query
 * 4. Use 'createdAt' for orderBy instead of 'updatedAt' (automatic index)
 * 5. Apply additional filters client-side when needed
 * 
 * AVAILABLE AUTOMATIC INDEXES:
 * - createdById (equality)
 * - isActive (equality)
 * - category (equality)
 * - isPrivate (equality)
 * - createdAt (ordering) - automatic for all collections
 * 
 * COMPOSITE INDEXES NEEDED (create manually if required):
 * - createdById + isActive + createdAt
 * - createdById + category + createdAt
 * - createdById + isPrivate + createdAt
 */

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const NOTE_COLLECTIONS = {
  NOTES: 'notes',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'personal' | 'work' | 'meeting' | 'idea' | 'todo' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color: string; // bg-color class
  tags?: string[];
  createdBy: string;
  createdById: string;
  isPrivate: boolean; // true = 個人メモ, false = 共有メモ
  relatedEntityType?: 'process' | 'task' | 'order' | 'announcement';
  relatedEntityId?: string;
  reminderDate?: string; // YYYY-MM-DD format
  isArchived: boolean;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

// =============================================================================
// NOTE OPERATIONS
// =============================================================================

/**
 * メモを作成
 */
export const createNote = async (
  noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, NOTE_COLLECTIONS.NOTES), {
      ...noteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating note:', error);
    return { id: null, error: error.message };
  }
};

/**
 * メモのリストを取得 (シンプル化されたクエリ)
 */
export const getNotesList = async (filters?: {
  userId?: string;
  category?: Note['category'];
  isPrivate?: boolean;
  isActive?: boolean;
  limit?: number;
}): Promise<{ data: Note[]; error: string | null }> => {
  try {
    const constraints: QueryConstraint[] = [];

    // Always filter by userId if provided (security first)
    if (filters?.userId) {
      constraints.push(where('createdById', '==', filters.userId));
    }

    // Add only one additional where clause to avoid composite index issues
    if (filters?.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    } else if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    } else if (filters?.isPrivate !== undefined) {
      constraints.push(where('isPrivate', '==', filters.isPrivate));
    }

    // Simple ordering by createdAt (automatic index)
    if (constraints.length === 0 || (constraints.length === 1 && filters?.userId)) {
      constraints.push(orderBy('createdAt', 'desc'));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(
      query(collection(db, NOTE_COLLECTIONS.NOTES), ...constraints)
    );
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Note[];

    // Apply remaining filters client-side
    if (filters) {
      if (filters.category && !constraints.some(c => c.toString().includes('category'))) {
        data = data.filter(note => note.category === filters.category);
      }
      if (filters.isPrivate !== undefined && !constraints.some(c => c.toString().includes('isPrivate'))) {
        data = data.filter(note => note.isPrivate === filters.isPrivate);
      }
      if (filters.isActive !== undefined && !constraints.some(c => c.toString().includes('isActive'))) {
        data = data.filter(note => note.isActive === filters.isActive);
      }
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting notes:', error);
    return { data: [], error: error.message };
  }
};

/**
 * メモを更新
 */
export const updateNote = async (
  noteId: string,
  updates: Partial<Note>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, NOTE_COLLECTIONS.NOTES, noteId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating note:', error);
    return { error: error.message };
  }
};

/**
 * メモを削除
 */
export const deleteNote = async (
  noteId: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, NOTE_COLLECTIONS.NOTES, noteId);
    await deleteDoc(docRef);
    
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return { error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * メモの変更をリアルタイムで監視 (シンプル化されたクエリ)
 */
export const subscribeToNotes = (
  filters: Parameters<typeof getNotesList>[0],
  callback: (data: Note[]) => void
): (() => void) => {
  const constraints: QueryConstraint[] = [];

  // Always filter by userId if provided (security first)
  if (filters?.userId) {
    constraints.push(where('createdById', '==', filters.userId));
  }

  // Add only one additional where clause to avoid composite index issues
  if (filters?.isActive !== undefined) {
    constraints.push(where('isActive', '==', filters.isActive));
  } else if (filters?.category) {
    constraints.push(where('category', '==', filters.category));
  } else if (filters?.isPrivate !== undefined) {
    constraints.push(where('isPrivate', '==', filters.isPrivate));
  }

  // Simple ordering by createdAt (automatic index)
  if (constraints.length === 0 || (constraints.length === 1 && filters?.userId)) {
    constraints.push(orderBy('createdAt', 'desc'));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(
    query(collection(db, NOTE_COLLECTIONS.NOTES), ...constraints), 
    (querySnapshot) => {
      let data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];

      // Apply remaining filters client-side
      if (filters) {
        if (filters.category && !constraints.some(c => c.toString().includes('category'))) {
          data = data.filter(note => note.category === filters.category);
        }
        if (filters.isPrivate !== undefined && !constraints.some(c => c.toString().includes('isPrivate'))) {
          data = data.filter(note => note.isPrivate === filters.isPrivate);
        }
        if (filters.isActive !== undefined && !constraints.some(c => c.toString().includes('isActive'))) {
          data = data.filter(note => note.isActive === filters.isActive);
        }
      }

      callback(data);
    }, 
    (error) => {
      console.error('Error in notes subscription:', error);
      callback([]);
    }
  );
};

// =============================================================================
// OPTIMIZED QUERY FUNCTIONS (NO COMPOSITE INDEX REQUIRED)
// =============================================================================

/**
 * ユーザーのアクティブなメモのみを取得（最も一般的なパターン）
 */
export const getUserActiveNotes = async (
  userId: string,
  limitCount?: number
): Promise<{ data: Note[]; error: string | null }> => {
  try {
    const constraints: QueryConstraint[] = [
      where('createdById', '==', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    ];

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const querySnapshot = await getDocs(query(collection(db, NOTE_COLLECTIONS.NOTES), ...constraints));
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Note[];

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting user active notes:', error);
    return { data: [], error: error.message };
  }
};

/**
 * カテゴリー別のメモを取得（ユーザー指定）
 */
export const getUserNotesByCategory = async (
  userId: string,
  category: Note['category'],
  limitCount?: number
): Promise<{ data: Note[]; error: string | null }> => {
  try {
    const constraints: QueryConstraint[] = [
      where('createdById', '==', userId),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    ];

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const querySnapshot = await getDocs(query(collection(db, NOTE_COLLECTIONS.NOTES), ...constraints));
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Note[];

    // Client-side filter for active notes only
    data = data.filter(note => note.isActive);

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting user notes by category:', error);
    return { data: [], error: error.message };
  }
};

/**
 * プライベート/共有メモの取得（ユーザー指定）
 */
export const getUserNotesByPrivacy = async (
  userId: string,
  isPrivate: boolean,
  limitCount?: number
): Promise<{ data: Note[]; error: string | null }> => {
  try {
    const constraints: QueryConstraint[] = [
      where('createdById', '==', userId),
      where('isPrivate', '==', isPrivate),
      orderBy('createdAt', 'desc')
    ];

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const querySnapshot = await getDocs(query(collection(db, NOTE_COLLECTIONS.NOTES), ...constraints));
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Note[];

    // Client-side filter for active notes only
    data = data.filter(note => note.isActive);

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting user notes by privacy:', error);
    return { data: [], error: error.message };
  }
};

/**
 * リアルタイム監視：ユーザーのアクティブなメモのみ
 */
export const subscribeToUserActiveNotes = (
  userId: string,
  callback: (data: Note[]) => void,
  limitCount?: number
): (() => void) => {
  const constraints: QueryConstraint[] = [
    where('createdById', '==', userId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  ];

  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  return onSnapshot(query(collection(db, NOTE_COLLECTIONS.NOTES), ...constraints), (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Note[];

    callback(data);
  }, (error) => {
    console.error('Error in user active notes subscription:', error);
    callback([]);
  });
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 便利関数: クイックメモ作成
 */
export const createQuickNote = async (data: {
  title: string;
  content: string;
  userId: string;
  userName: string;
  category?: Note['category'];
}): Promise<{ id: string | null; error: string | null }> => {
  return createNote({
    ...data,
    category: data.category || 'personal',
    priority: 'medium',
    color: 'bg-yellow-100',
    createdBy: data.userName,
    createdById: data.userId,
    isPrivate: true,
    isArchived: false,
    isActive: true
  });
};

/**
 * 便利関数: タスク関連メモ作成
 */
export const createTaskNote = async (data: {
  title: string;
  content: string;
  userId: string;
  userName: string;
  taskId: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createNote({
    title: data.title,
    content: data.content,
    category: 'work',
    priority: 'medium',
    color: 'bg-blue-100',
    createdBy: data.userName,
    createdById: data.userId,
    isPrivate: false,
    relatedEntityType: 'task',
    relatedEntityId: data.taskId,
    isArchived: false,
    isActive: true
  });
};