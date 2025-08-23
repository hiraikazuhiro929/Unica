"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface CompanyWrapperProps {
  children: React.ReactNode;
}

export default function CompanyWrapper({ children }: CompanyWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentCompany, userCompanies, loading } = useCompany();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  const isCompanySetupPage = pathname.startsWith('/company/setup');
  const isWelcomePage = pathname.startsWith('/welcome');
  const isOnboardingPage = pathname.startsWith('/onboarding');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isCompanyMembersPage = pathname.startsWith('/company/members');
  
  // 特殊ページ（企業選択不要）
  const isSpecialPage = isCompanySetupPage || isWelcomePage || isOnboardingPage || isAuthPage;

  useEffect(() => {
    // ログイン前、特殊ページの場合はスキップ
    if (!user || isSpecialPage) {
      setInitialCheckComplete(true);
      return;
    }

    // まだローディング中の場合は待機
    if (loading) {
      console.log('🔄 Company data loading...');
      return;
    }

    // ローディング完了後、所属企業がない場合のみオンボーディングページへ
    if (!loading && userCompanies.length === 0) {
      console.log('🚀 No companies found after loading, redirecting to onboarding page');
      router.push('/onboarding');
      return;
    }

    // 現在の企業が選択されていない場合（初回ロードなど）
    if (!loading && !currentCompany && userCompanies.length > 0) {
      console.log('🔄 No current company selected, waiting for auto-selection...');
      return;
    }

    // すべてのチェックが完了
    if (!loading) {
      setInitialCheckComplete(true);
    }

  }, [user, loading, currentCompany, userCompanies, isSpecialPage, router]);

  // 特殊ページは即座に表示
  if (isSpecialPage) {
    return <>{children}</>;
  }

  // 初期チェック中またはローディング中は統一されたローディング画面を表示
  if (!initialCheckComplete || (loading && user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 企業が必要なページで企業が選択されていない場合
  if (!currentCompany && userCompanies.length > 0 && !isSpecialPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">企業情報を設定中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}