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

// 招待コードの検証（セキュリティ要件：32文字以上の英数字のみ許可）
const validateInvitationCode = (code: string): boolean => {
  // 32文字以上の英数字のみを許可
  const INVITATION_CODE_PATTERN = /^[A-Za-z0-9]{32,}$/;
  return INVITATION_CODE_PATTERN.test(code);
};

// セキュアな招待パス検証
const isValidInvitationPath = (pathname: string): boolean => {
  const invitationPathPattern = /^\/join\/([A-Za-z0-9]+)$/;
  const match = pathname.match(invitationPathPattern);

  if (!match) return false;

  const code = match[1];
  return validateInvitationCode(code);
};

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isValidInvitation = isValidInvitationPath(pathname);

  console.log('🔒 AuthWrapper:', {
    pathname,
    user: !!user,
    loading,
    isPublic: isPublicPath,
    isValidInvitation: isValidInvitation
  });

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

  // パブリックページ（ログイン・登録・有効な招待リンク）
  if (isPublicPath || isValidInvitation) {
    return <>{children}</>;
  }

  // 認証が必要なページで未ログイン
  if (!user) {
    // 無効な招待リンクの場合はセキュリティエラーを表示
    if (pathname.startsWith("/join/")) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">無効な招待リンク</h2>
            <p className="text-gray-600 mb-6">
              この招待リンクは無効です。招待コードが正しいかご確認ください。
            </p>
            <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
              <p className="font-medium mb-1">セキュリティ要件:</p>
              <ul className="text-left">
                <li>• 32文字以上の英数字のみ有効</li>
                <li>• 不正なパターンは拒否されます</li>
              </ul>
            </div>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/login";
                }
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ログインページへ
            </button>
          </div>
        </div>
      );
    }

    // 通常のログインリダイレクト
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