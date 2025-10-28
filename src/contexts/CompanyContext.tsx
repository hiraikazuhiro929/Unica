"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  Company, 
  CompanyMember,
  getUserCompanies,
  getCompany,
  getCompanyMembers,
  hasPermission,
  hasMinimumRole,
  CompanyRole,
} from '@/lib/firebase/company';

// =============================================================================
// TYPES
// =============================================================================

interface CompanyContextType {
  // 現在選択中の企業
  currentCompany: Company | null;
  currentMembership: CompanyMember | null;
  
  // ユーザーの所属企業リスト
  userCompanies: CompanyMember[];
  
  // 現在の企業のメンバーリスト
  companyMembers: CompanyMember[];
  
  // 状態
  loading: boolean;
  error: string | null;
  
  // アクション
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
  
  // 権限チェック
  hasPermission: (permission: keyof CompanyMember['permissions']) => boolean;
  hasMinimumRole: (requiredRole: CompanyRole) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [currentMembership, setCurrentMembership] = useState<CompanyMember | null>(null);
  const [userCompanies, setUserCompanies] = useState<CompanyMember[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ユーザーの所属企業を取得
  useEffect(() => {
    // 認証がまだ読み込み中の場合は待つ
    if (authLoading) {
      return;
    }

    if (!user) {
      setCurrentCompany(null);
      setCurrentMembership(null);
      setUserCompanies([]);
      setCompanyMembers([]);
      setLoading(false);
      return;
    }

    loadUserCompanies();
  }, [user, authLoading]);

  // 所属企業リストを読み込み
  const loadUserCompanies = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const companies = await getUserCompanies(user.uid);
      setUserCompanies(companies);
      
      // 保存された最後の企業、または最初の企業を選択
      const lastCompanyId = localStorage.getItem('unica-last-company');
      const targetCompany = companies.find(c => c.companyId === lastCompanyId) || companies[0];
      
      if (targetCompany) {
        await switchCompany(targetCompany.companyId);
      } else {
        // 所属企業がない場合
        setLoading(false);
      }
    } catch (err: Error | unknown) {
      console.error('Error loading user companies:', err);
      setError('企業情報の読み込みに失敗しました');
      setLoading(false);
    }
  };

  // 企業を切り替え
  const switchCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 企業情報を取得
      const company = await getCompany(companyId);
      if (!company) {
        throw new Error('企業が見つかりません');
      }
      
      // メンバーシップ情報を取得（userCompaniesから探すか、直接取得）
      let membership = userCompanies.find(c => c.companyId === companyId);
      
      // userCompaniesにない場合は、直接取得を試みる
      if (!membership) {
        const freshCompanies = await getUserCompanies(user.uid);
        setUserCompanies(freshCompanies);
        membership = freshCompanies.find(c => c.companyId === companyId);
        
        if (!membership) {
          throw new Error('この企業のメンバーではありません');
        }
      }
      
      // メンバーリストを取得
      const members = await getCompanyMembers(companyId);
      
      setCurrentCompany(company);
      setCurrentMembership(membership);
      setCompanyMembers(members);
      
      // 最後に選択した企業を保存
      localStorage.setItem('unica-last-company', companyId);
      
      setLoading(false);
    } catch (err: Error | unknown) {
      console.error('Error switching company:', err);
      setError('企業の切り替えに失敗しました');
      setLoading(false);
    }
  };

  // 企業データを再読み込み
  const refreshCompanyData = async () => {
    await loadUserCompanies();
  };

  // 権限チェック関数
  const hasPermissionCheck = (permission: keyof CompanyMember['permissions']): boolean => {
    if (!currentMembership) return false;
    return hasPermission(currentMembership, permission);
  };

  const hasMinimumRoleCheck = (requiredRole: CompanyRole): boolean => {
    if (!currentMembership) return false;
    return hasMinimumRole(currentMembership.role, requiredRole);
  };

  const isOwner = (): boolean => {
    return currentMembership?.role === 'owner';
  };

  const isAdmin = (): boolean => {
    return currentMembership?.role === 'owner' || currentMembership?.role === 'admin';
  };

  const value: CompanyContextType = {
    currentCompany,
    currentMembership,
    userCompanies,
    companyMembers,
    loading,
    error,
    switchCompany,
    refreshCompanyData,
    hasPermission: hasPermissionCheck,
    hasMinimumRole: hasMinimumRoleCheck,
    isOwner,
    isAdmin,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * 企業が選択されていることを確認するフック
 */
export const useRequireCompany = () => {
  const { currentCompany, loading } = useCompany();
  
  return {
    company: currentCompany,
    loading,
    hasCompany: !!currentCompany,
    shouldRedirect: !loading && !currentCompany,
  };
};

/**
 * 管理者権限を確認するフック
 */
export const useRequireAdmin = () => {
  const { currentMembership, isAdmin } = useCompany();
  
  return {
    membership: currentMembership,
    isAdmin: isAdmin(),
    hasAccess: isAdmin(),
  };
};