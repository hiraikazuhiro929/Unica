"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyWrapperProps {
  children: React.ReactNode;
}

export default function CompanyWrapper({ children }: CompanyWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentCompany, userCompanies, loading } = useCompany();

  const isCompanySetupPage = pathname.startsWith('/company/setup');
  const isWelcomePage = pathname.startsWith('/welcome');
  const isOnboardingPage = pathname.startsWith('/onboarding');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  useEffect(() => {
    // ログイン前、特殊ページの場合はスキップ
    if (!user || isCompanySetupPage || isWelcomePage || isOnboardingPage || isAuthPage) {
      return;
    }

    // まだローディング中の場合は待機
    if (loading) {
      console.log('🔄 Company data loading...');
      return;
    }

    // ローディング完了後、所属企業がない場合のみオンボーディングページへ
    if (userCompanies.length === 0) {
      console.log('🚀 No companies found after loading, redirecting to onboarding page');
      router.push('/onboarding');
      return;
    }

    // 現在の企業が選択されていない場合（初回ロードなど）
    if (!currentCompany && userCompanies.length > 0) {
      console.log('🔄 No current company selected, waiting for auto-selection...');
      return;
    }

  }, [user, loading, currentCompany, userCompanies, isCompanySetupPage, isWelcomePage, isOnboardingPage, isAuthPage, router, pathname]);

  // ローディング中は表示しない
  if (loading && user && !isAuthPage && !isCompanySetupPage && !isWelcomePage && !isOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">企業情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}