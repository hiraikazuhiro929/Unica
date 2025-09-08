// エラーハンドリングユーティリティ
import { toast } from './toast';

// エラータイプの定義
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  FIREBASE_AUTH = 'FIREBASE_AUTH',
  FIREBASE_FIRESTORE = 'FIREBASE_FIRESTORE',
  FIREBASE_STORAGE = 'FIREBASE_STORAGE',
  MANUFACTURING_DATA = 'MANUFACTURING_DATA',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN'
}

// エラー分類
export const classifyError = (error: any): ErrorType => {
  if (!error) return ErrorType.UNKNOWN;
  
  const message = error.message || error.toString();
  const code = error.code || '';
  
  // Firebase Authentication errors
  if (code.startsWith('auth/')) {
    return ErrorType.FIREBASE_AUTH;
  }
  
  // Firebase Firestore errors
  if (code.startsWith('firestore/') || message.includes('firestore')) {
    return ErrorType.FIREBASE_FIRESTORE;
  }
  
  // Firebase Storage errors
  if (code.startsWith('storage/') || message.includes('storage')) {
    return ErrorType.FIREBASE_STORAGE;
  }
  
  // Network and connectivity errors
  if (message.includes('network') || 
      message.includes('fetch') || 
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      !navigator.onLine) {
    return navigator.onLine ? ErrorType.NETWORK : ErrorType.OFFLINE;
  }
  
  // Permission and access errors
  if (message.includes('permission') || 
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      code === 'permission-denied') {
    return ErrorType.PERMISSION;
  }
  
  // Not found errors
  if (message.includes('not found') || 
      message.includes('404') ||
      code === 'not-found') {
    return ErrorType.NOT_FOUND;
  }
  
  // Validation errors
  if (message.includes('validation') || 
      message.includes('invalid') ||
      message.includes('required') ||
      code.includes('invalid')) {
    return ErrorType.VALIDATION;
  }
  
  // Manufacturing specific data errors
  if (message.includes('工程') || 
      message.includes('受注') ||
      message.includes('工数') ||
      message.includes('manufacturing')) {
    return ErrorType.MANUFACTURING_DATA;
  }
  
  return ErrorType.UNKNOWN;
};

// ユーザーフレンドリーなエラーメッセージ
export const getUserFriendlyMessage = (error: any): string => {
  const errorType = classifyError(error);
  const code = error.code || '';
  
  switch (errorType) {
    case ErrorType.FIREBASE_AUTH:
      switch (code) {
        case 'auth/user-not-found':
          return 'ユーザーが見つかりません。';
        case 'auth/wrong-password':
          return 'パスワードが間違っています。';
        case 'auth/email-already-in-use':
          return 'このメールアドレスは既に使用されています。';
        case 'auth/weak-password':
          return 'パスワードが弱すぎます。6文字以上で設定してください。';
        case 'auth/invalid-email':
          return '無効なメールアドレス形式です。';
        case 'auth/too-many-requests':
          return 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください。';
        default:
          return '認証エラーが発生しました。';
      }
    case ErrorType.FIREBASE_FIRESTORE:
      switch (code) {
        case 'permission-denied':
          return 'データへのアクセス権限がありません。';
        case 'not-found':
          return '指定されたデータが見つかりません。';
        case 'already-exists':
          return 'データが既に存在します。';
        case 'resource-exhausted':
          return 'リクエスト制限に達しました。しばらく待ってから再試行してください。';
        default:
          return 'データベースエラーが発生しました。';
      }
    case ErrorType.FIREBASE_STORAGE:
      return 'ファイルの保存・取得でエラーが発生しました。';
    case ErrorType.NETWORK:
      return 'ネットワークエラーが発生しました。接続を確認してください。';
    case ErrorType.OFFLINE:
      return 'オフライン状態です。インターネット接続を確認してください。';
    case ErrorType.PERMISSION:
      return 'この操作を実行する権限がありません。';
    case ErrorType.NOT_FOUND:
      return '指定されたデータが見つかりません。';
    case ErrorType.VALIDATION:
      return '入力データに問題があります。内容を確認してください。';
    case ErrorType.MANUFACTURING_DATA:
      return '製造データの処理でエラーが発生しました。データを確認してください。';
    default:
      return 'エラーが発生しました。しばらく待ってから再試行してください。';
  }
};

// エラー表示（toast通知を使用）
export const showError = (error: any, customMessage?: string) => {
  const message = customMessage || getUserFriendlyMessage(error);
  
  // toastがない場合はalertを使用
  if (typeof toast !== 'undefined') {
    toast.error(message);
  } else {
    alert(message);
  }
  
  // 開発環境ではコンソールにも出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', error);
  }
};

// 成功メッセージ表示
export const showSuccess = (message: string) => {
  if (typeof toast !== 'undefined') {
    toast.success(message);
  } else {
    console.log('Success:', message);
  }
};

// リトライ機能付きの非同期処理実行
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // ネットワークエラーの場合のみリトライ
      if (classifyError(error) !== ErrorType.NETWORK || i === maxRetries - 1) {
        throw error;
      }
      
      // 待機してからリトライ
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError;
};

// ローカルストレージへの一時保存（オフライン対応）
export const saveToLocalStorage = (key: string, data: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

// ローカルストレージからの復元
export const loadFromLocalStorage = (key: string): any | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    // 24時間以内のデータのみ有効とする
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

// Firebase操作のラッパー（エラーハンドリング付き）
export const safeFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  fallbackKey?: string
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const data = await retryOperation(operation);
    
    // 成功したらローカルストレージから削除
    if (fallbackKey) {
      localStorage.removeItem(fallbackKey);
    }
    
    return { success: true, data };
  } catch (error) {
    const errorMessage = getUserFriendlyMessage(error);
    
    // ネットワークエラーの場合、ローカルストレージに保存
    if (fallbackKey && classifyError(error) === ErrorType.NETWORK) {
      saveToLocalStorage(fallbackKey, { pending: true, error: errorMessage });
    }
    
    return { success: false, error: errorMessage };
  }
};