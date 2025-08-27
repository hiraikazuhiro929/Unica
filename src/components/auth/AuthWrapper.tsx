"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import CompanyWrapper from "./CompanyWrapper";
import { Loader2 } from "lucide-react";

interface AuthWrapperProps {
  children: ReactNode;
}

// 認証不要なページパス
const PUBLIC_PATHS = ["/login", "/register"];
// 企業選択不要なページパス（認証は必要だが企業は不要）
const COMPANY_OPTIONAL_PATHS = ["/company/setup", "/welcome", "/onboarding"];

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  console.log('🔒 AuthWrapper:', { pathname, user: !!user, loading, isPublic: PUBLIC_PATHS.includes(pathname) });

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // 認証状態チェック中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // パブリックページ（ログイン・登録）
  if (isPublicPath) {
    return <>{children}</>;
  }

  // 認証が必要なページで未ログイン
  if (!user) {
    // クライアントサイドでのリダイレクト
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">ログインページにリダイレクト中...</p>
        </div>
      </div>
    );
  }

  // 認証済みユーザー
  const isCompanyOptional = COMPANY_OPTIONAL_PATHS.some(path => pathname.startsWith(path));
  
  if (isCompanyOptional) {
    // 企業選択不要なページ（企業設定ページなど）
    return <CompanyWrapper>{children}</CompanyWrapper>;
  }

  // 通常のページ - サイドバー付きレイアウト + 企業チェック
  return (
    <CompanyWrapper>
      <Sidebar />
      <main className="w-full min-h-screen bg-white dark:bg-slate-900">{children}</main>
    </CompanyWrapper>
  );
};

export default AuthWrapper;