import { 
  User,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  NextOrObserver,
  AuthError,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  deleteUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './config';
import { AppUser } from '@/types';
import { log } from '@/lib/logger';

const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

// AppUser型はsrc/types/index.tsに統一

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(result.user, {
      displayName: displayName
    });

    await createUserProfile(result.user);
    
    return { user: result.user, error: null };
  } catch (error: Error | unknown) {
    return { user: null, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error: Error | unknown) {
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserProfile(result.user);
    return { user: result.user, error: null };
  } catch (error: Error | unknown) {
    return { user: null, error: error.message };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: Error | unknown) {
    return { error: error.message };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: Error | unknown) {
    return { error: error.message };
  }
};

export const createUserProfile = async (user: User) => {
  if (!user) return;
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    try {
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
        createdAt,
        updatedAt
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }
  
  return userRef;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const onAuthStateChange = (callback: NextOrObserver<User>) => {
  return onAuthStateChanged(auth, callback);
};

// =============================================================================
// MANUFACTURING USER MANAGEMENT
// =============================================================================

/**
 * 製造業ユーザー登録
 */
export const registerAppUser = async (userData: {
  email: string;
  password: string;
  name: string;
  role: AppUser['role'];
  department: string;
  employeeId: string;
}): Promise<{
  user: AppUser | null;
  error: string | null;
}> => {
  try {
    log.auth('Starting registration process', undefined, 'registerAppUser');
    
    // 社員番号の重複チェック
    log.debug('Checking employee ID', { employeeId: userData.employeeId }, 'registerAppUser');
    const employeeExists = await checkEmployeeIdExists(userData.employeeId);
    if (employeeExists) {
      console.warn('⚠️ Employee ID already exists:', userData.employeeId);
      return { user: null, error: '社員番号が既に使用されています' };
    }

    // Firebase Authentication でユーザー作成
    log.auth('Creating Firebase user', { email: userData.email }, 'registerAppUser');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    const firebaseUser = userCredential.user;
    log.auth('Firebase user created', { uid: firebaseUser.uid }, 'registerAppUser');

    // プロフィール更新
    log.debug('Updating user profile', undefined, 'registerAppUser');
    await updateProfile(firebaseUser, {
      displayName: userData.name,
    });

    // Firestore にユーザー情報を保存
    const appUser: AppUser = {
      uid: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      department: userData.department,
      employeeId: userData.employeeId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    log.debug('Saving to Firestore', { uid: appUser.uid, name: appUser.name }, 'registerAppUser');
    await setDoc(doc(db, 'appUsers', firebaseUser.uid), appUser);
    log.info('User data saved to Firestore', undefined, 'registerAppUser');

    return { user: appUser, error: null };
  } catch (error: Error | unknown) {
    console.error('❌ Registration error:', error);
    return { user: null, error: getAuthErrorMessage(error) };
  }
};

/**
 * アプリユーザーデータ取得
 */
export const getAppUserData = async (uid: string): Promise<AppUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'appUsers', uid));
    if (userDoc.exists()) {
      return userDoc.data() as AppUser;
    }
    return null;
  } catch (error) {
    console.error('Error getting app user data:', error);
    return null;
  }
};

/**
 * 社員番号の重複チェック
 */
export const checkEmployeeIdExists = async (employeeId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'appUsers'),
      where('employeeId', '==', employeeId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking employee ID:', error);
    return false;
  }
};

/**
 * 認証状態監視（アプリユーザー用）
 */
export const subscribeToAppUserAuth = (
  callback: (user: AppUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (firebaseUser) {
      const appUser = await getAppUserData(firebaseUser.uid);
      callback(appUser);
    } else {
      callback(null);
    }
  });
};

/**
 * Firebase Auth エラーメッセージの日本語化
 */
const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に使用されています';
    case 'auth/weak-password':
      return 'パスワードが弱すぎます（6文字以上にしてください）';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません';
    case 'auth/user-not-found':
      return 'ユーザーが見つかりません';
    case 'auth/wrong-password':
      return 'パスワードが間違っています';
    case 'auth/too-many-requests':
      return 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
    case 'auth/user-disabled':
      return 'このアカウントは無効化されています';
    case 'auth/operation-not-allowed':
      return 'この操作は許可されていません';
    case 'auth/network-request-failed':
      return 'ネットワークエラーが発生しました';
    default:
      return error.message || '認証エラーが発生しました';
  }
};

/**
 * 役職の日本語名取得
 */
export const getRoleDisplayName = (role: AppUser['role']): string => {
  switch (role) {
    case 'admin':
      return '管理者';
    case 'manager':
      return '部長';
    case 'leader':
      return '班長';
    case 'worker':
      return '作業員';
    default:
      return role;
  }
};

/**
 * 部署一覧
 */
export const DEPARTMENTS = [
  '生産部',
  '品質管理部',
  '設備保全部',
  '安全管理部',
  '総務部',
  '営業部',
] as const;

/**
 * 役職一覧
 */
export const ROLES: { value: AppUser['role']; label: string }[] = [
  { value: 'worker', label: '作業員' },
  { value: 'leader', label: '班長' },
  { value: 'manager', label: '部長' },
  { value: 'admin', label: '管理者' },
];

/**
 * ユーザー情報更新
 */
export const updateAppUser = async (
  uid: string,
  updateData: Partial<Omit<AppUser, 'uid' | 'createdAt'>>
): Promise<{ error: string | null }> => {
  try {
    log.debug('Updating user data', { uid, updateData }, 'updateAppUser');
    
    // 社員番号が変更される場合は重複チェック
    if (updateData.employeeId) {
      const currentUser = await getAppUserData(uid);
      if (currentUser && currentUser.employeeId !== updateData.employeeId) {
        const employeeExists = await checkEmployeeIdExists(updateData.employeeId);
        if (employeeExists) {
          return { error: '社員番号が既に使用されています' };
        }
      }
    }

    await updateDoc(doc(db, 'appUsers', uid), {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    // 表示名も更新（Firebase Auth）
    if (updateData.name && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updateData.name,
      });
    }

    log.info('User data updated successfully', undefined, 'updateAppUser');
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('❌ Update user error:', error);
    return { error: error.message || 'ユーザー情報の更新に失敗しました' };
  }
};

/**
 * パスワード変更
 */
export const updateUserPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> => {
  try {
    if (!auth.currentUser) {
      return { error: 'ログインが必要です' };
    }

    // 現在のパスワードで再認証
    const email = auth.currentUser.email;
    if (!email) {
      return { error: 'メールアドレスが取得できません' };
    }

    // 再認証
    const credential = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);

    // パスワード更新
    await firebaseUpdatePassword(auth.currentUser, newPassword);
    
    log.info('Password updated successfully', undefined, 'updatePassword');
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('❌ Password update error:', error);
    return { error: getAuthErrorMessage(error) };
  }
};

/**
 * アカウント削除
 */
export const deleteUserAccount = async (): Promise<{ error: string | null }> => {
  try {
    if (!auth.currentUser) {
      return { error: 'ログインが必要です' };
    }

    const uid = auth.currentUser.uid;

    // Firestoreからユーザーデータを削除
    await deleteDoc(doc(db, 'appUsers', uid));
    
    // Firebase Authからアカウント削除
    await deleteUser(auth.currentUser);
    
    log.info('Account deleted successfully', undefined, 'deleteAccount');
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('❌ Account deletion error:', error);
    return { error: getAuthErrorMessage(error) };
  }
};

export { auth };