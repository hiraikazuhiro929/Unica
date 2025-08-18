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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  UploadTask
} from 'firebase/storage';
import { db, storage } from './config';

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
  imageUrls?: string[]; // Firebase Storage URLs for images
  createdBy: string;
  createdById: string;
  isPrivate: boolean; // true = 個人メモ, false = 共有メモ
  relatedEntityType?: 'process' | 'task' | 'order' | 'announcement';
  relatedEntityId?: string;
  reminderDate?: string; // YYYY-MM-DD format
  isPinned?: boolean; // ピン留め状態
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
 * メモを削除（関連画像も削除）
 */
export const deleteNote = async (
  noteId: string
): Promise<{ error: string | null }> => {
  try {
    // メモの情報を取得して画像URLを確認
    const docRef = doc(db, NOTE_COLLECTIONS.NOTES, noteId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const noteData = docSnap.data() as Note;
      
      // 関連画像を削除
      if (noteData.imageUrls && noteData.imageUrls.length > 0) {
        const { errors } = await deleteAllNoteImages(noteData.imageUrls);
        if (errors.length > 0) {
          console.warn('Some images could not be deleted:', errors);
        }
      }
    }
    
    // メモを削除
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
// IMAGE UPLOAD FUNCTIONS
// =============================================================================

/**
 * 画像をFirebase Storageにアップロード
 */
export const uploadImage = async (
  file: File,
  userId: string,
  noteId?: string
): Promise<{ url: string | null; error: string | null }> => {
  try {
    // ファイル検証
    if (!file.type.startsWith('image/')) {
      return { url: null, error: '画像ファイルを選択してください' };
    }

    // ファイルサイズ制限 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { url: null, error: 'ファイルサイズは5MB以下にしてください' };
    }

    // ファイル名生成
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_${randomId}.${extension}`;
    
    // Storage参照作成
    const path = noteId 
      ? `notes/${userId}/${noteId}/${fileName}`
      : `notes/${userId}/temp/${fileName}`;
    const storageRef = ref(storage, path);

    // アップロード実行
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { url: downloadURL, error: null };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return { url: null, error: error.message };
  }
};

/**
 * 複数の画像を一括アップロード（CORS問題回避のためBase64使用）
 */
export const uploadImages = async (
  files: File[],
  userId: string,
  onProgress?: (progress: number, fileIndex: number) => void,
  noteId?: string
): Promise<{ urls: string[]; errors: string[] }> => {
  console.log("uploadImages function called (using Base64 fallback)", { filesCount: files.length, userId, noteId });
  const urls: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing file ${i + 1}/${files.length}:`, { name: file.name, type: file.type, size: file.size });
    
    try {
      // ファイル検証
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: 画像ファイルではありません`);
        continue;
      }

      // ファイルサイズ制限 (1MB - Base64エンコーディングのため制限を厳しく)
      const maxSize = 1 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: ファイルサイズは1MB以下にしてください（CORS回避のため）`);
        continue;
      }

      console.log(`Converting ${file.name} to Base64...`);
      
      // ファイルをBase64に変換
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log(`Successfully converted ${file.name} to Base64 (${base64.length} characters)`);
      
      // Base64 データURLを返す（一時的な解決策）
      urls.push(base64);
      
      // 進行状況更新
      onProgress?.(100, i);

    } catch (error: any) {
      console.error(`Error processing ${file.name}:`, error);
      const errorMessage = error.message || 'Unknown error';
      errors.push(`${file.name}: ${errorMessage}`);
    }
  }

  console.log("uploadImages function completed (Base64)", { successCount: urls.length, errorCount: errors.length });
  return { urls, errors };
};

/**
 * Firebase Storageアップロード（CORS問題があるため現在は無効）
 */
export const uploadImagesToFirebaseStorage = async (
  files: File[],
  userId: string,
  onProgress?: (progress: number, fileIndex: number) => void,
  noteId?: string
): Promise<{ urls: string[]; errors: string[] }> => {
  console.log("uploadImagesToFirebaseStorage function called", { filesCount: files.length, userId, noteId });
  const urls: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing file ${i + 1}/${files.length}:`, { name: file.name, type: file.type, size: file.size });
    
    try {
      // ファイル検証
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: 画像ファイルではありません`);
        continue;
      }

      // ファイルサイズ制限 (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: ファイルサイズは5MB以下にしてください`);
        continue;
      }

      // ファイル名生成
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${randomId}.${extension}`;
      
      // Storage参照作成
      const path = noteId 
        ? `notes/${userId}/${noteId}/${fileName}`
        : `notes/${userId}/temp/${fileName}`;
      console.log(`Creating storage reference for file ${file.name}:`, { path });
      const storageRef = ref(storage, path);

      // 進行状況付きアップロード
      console.log(`Starting upload for file ${file.name}...`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.(progress, i);
          },
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`Successfully uploaded ${file.name}:`, downloadURL);
              urls.push(downloadURL);
              resolve();
            } catch (error) {
              console.error(`Failed to get download URL for ${file.name}:`, error);
              reject(error);
            }
          }
        );
      });

    } catch (error: any) {
      console.error(`Error uploading ${file.name}:`, error);
      const errorMessage = error.code ? `${error.code}: ${error.message}` : error.message;
      errors.push(`${file.name}: ${errorMessage}`);
    }
  }

  console.log("uploadImagesToFirebaseStorage function completed", { successCount: urls.length, errorCount: errors.length, urls, errors });
  return { urls, errors };
};

/**
 * 画像を削除
 */
export const deleteImage = async (
  imageUrl: string
): Promise<{ error: string | null }> => {
  try {
    // URL からStorage参照を作成
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
    
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return { error: error.message };
  }
};

/**
 * メモに関連する全ての画像を削除
 */
export const deleteAllNoteImages = async (
  imageUrls: string[]
): Promise<{ errors: string[] }> => {
  const errors: string[] = [];

  for (const imageUrl of imageUrls) {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch (error: any) {
      console.error(`Error deleting image ${imageUrl}:`, error);
      errors.push(`${imageUrl}: ${error.message}`);
    }
  }

  return { errors };
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
  const noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
    title: data.title,
    content: data.content,
    category: data.category || 'personal',
    priority: 'medium',
    color: 'bg-yellow-100',
    createdBy: data.userName,
    createdById: data.userId,
    isPrivate: true,
    isArchived: false,
    isActive: true
  };
  
  return createNote(noteData);
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