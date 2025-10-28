"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  AppUser, 
  subscribeToAppUserAuth, 
  getAppUserData,
  logOut 
} from '@/lib/firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  updateActivity,
  getSessionInfo,
  endSession,
  startSession,
  logSecurityEvent
} from '@/lib/utils/securityUtils';
import { log } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface AuthContextType {
  // 状態
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  
  // アクション
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkSession: () => boolean;
  extendSession: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    log.auth('Initializing auth state listener', undefined, 'AuthProvider');
    
    const unsubscribe = subscribeToAppUserAuth(async (appUser) => {
      try {
        setError(null);
        
        if (appUser) {
          log.auth('User logged in', {
            uid: appUser.uid,
            name: appUser.name,
            role: appUser.role,
            department: appUser.department
          }, 'AuthProvider');
          
          // Firebase User も設定
          setFirebaseUser(auth.currentUser);
          
          // セッションを開始
          startSession();
          
          // アクティブユーザーかチェック
          if (appUser.isActive === false) {
            log.warn('User account is inactive', undefined, 'AuthProvider');
            await logOut();
            setUser(null);
            setFirebaseUser(null);
            setError('アカウントが無効化されています');
          } else {
            setUser(appUser);
          }
        } else {
          log.auth('User logged out', undefined, 'AuthProvider');
          setUser(null);
          setFirebaseUser(null);
        }
      } catch (err: Error | unknown) {
        console.error('❌ AuthProvider: Error in auth state change:', err);
        setError(`認証エラー: ${err.message || 'Unknown error'}`);
        setUser(null);
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ユーザー情報の手動更新
  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        const updatedUser = await getAppUserData(firebaseUser.uid);
        setUser(updatedUser);
      } catch (err: Error | unknown) {
        console.error('Error refreshing user:', err);
        setError('ユーザー情報の更新に失敗しました');
      }
    }
  };

  // セッション管理機能
  const checkSession = (): boolean => {
    const sessionInfo = getSessionInfo();
    if (sessionInfo.isExpired) {
      setSessionExpired(true);
      logSecurityEvent('session_expired', { userId: user?.uid });
      return false;
    }
    return true;
  };

  const extendSession = (): void => {
    updateActivity();
    setSessionExpired(false);
  };

  // セッションチェックのインターバル
  useEffect(() => {
    if (user) {
      // ユーザー操作のアクティビティを更新
      const handleActivity = () => {
        updateActivity();
      };
      
      // イベントリスナーを追加
      window.addEventListener('click', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('mousemove', handleActivity);
      
      // セッションチェックのインターバル
      const interval = setInterval(() => {
        if (!checkSession()) {
          // セッション期限切れの場合は自動ログアウト
          logout();
        }
      }, 300000); // 5分毎にチェック（频度を減らす）

      return () => {
        clearInterval(interval);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keypress', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('mousemove', handleActivity);
      };
    }
  }, [user]);

  // ログアウト
  const logout = async () => {
    try {
      setError(null);
      logSecurityEvent('logout', { userId: user?.uid });
      await logOut();
      endSession();
    } catch (err: Error | unknown) {
      console.error('Logout error:', err);
      setError('ログアウトに失敗しました');
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    sessionExpired,
    logout,
    refreshUser,
    checkSession,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * 認証が必要なページで使用するフック
 */
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    shouldRedirect: !loading && !user,
  };
};

/**
 * 特定の役職以上のアクセス権限チェック
 */
export const useRoleAccess = (requiredRole: AppUser['role']) => {
  const { user } = useAuth();
  
  const roleHierarchy: Record<AppUser['role'], number> = {
    worker: 1,
    leader: 2,
    manager: 3,
    admin: 4,
  };
  
  const hasAccess = user && 
    roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  
  return {
    hasAccess: !!hasAccess,
    userRole: user?.role,
    requiredRole,
  };
};

/**
 * 部署アクセス権限チェック
 */
export const useDepartmentAccess = (allowedDepartments: string[]) => {
  const { user } = useAuth();
  
  const hasAccess = user && 
    (allowedDepartments.includes(user.department) || user.role === 'admin');
  
  return {
    hasAccess: !!hasAccess,
    userDepartment: user?.department,
    allowedDepartments,
  };
};