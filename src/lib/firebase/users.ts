import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { User } from '@/app/tasks/types';

const COLLECTION_NAME = 'users';

/**
 * ユーザー一覧を取得
 */
export const getUsers = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
    
    return {
      success: true,
      data: users
    };
  } catch (error: any) {
    console.error('Error getting users:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * ユーザーを作成
 */
export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString();
    const newUser = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newUser);
    
    return {
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...newUser }
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ユーザーを更新
 */
export const updateUser = async (id: string, updateData: Partial<User>) => {
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
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ユーザーを削除
 */
export const deleteUser = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    
    return {
      success: true,
      id
    };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ユーザーIDで検索
 */
export const getUserById = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() } as User
      };
    } else {
      return {
        success: false,
        error: 'User not found'
      };
    }
  } catch (error: any) {
    console.error('Error getting user by ID:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * メールアドレスでユーザー検索
 */
export const getUserByEmail = async (email: string) => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        success: true,
        data: { id: doc.id, ...doc.data() } as User
      };
    } else {
      return {
        success: false,
        error: 'User not found'
      };
    }
  } catch (error: any) {
    console.error('Error getting user by email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 権限チェック用のヘルパー関数
 */
export const checkUserPermission = (user: User, permission: keyof User['permissions']): boolean => {
  return user.permissions[permission] || false;
};

/**
 * 役割別権限のデフォルト値
 */
export const getDefaultPermissions = (role: User['role']): User['permissions'] => {
  switch (role) {
    case 'admin':
      return {
        canConfirmReports: true,
        canReplyToReports: true,
        canViewAllReports: true,
        canManageUsers: true,
      };
    case 'supervisor':
      return {
        canConfirmReports: true,
        canReplyToReports: true,
        canViewAllReports: false,
        canManageUsers: false,
      };
    case 'worker':
    default:
      return {
        canConfirmReports: false,
        canReplyToReports: false,
        canViewAllReports: false,
        canManageUsers: false,
      };
  }
};