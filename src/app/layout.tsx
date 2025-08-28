import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import AuthWrapper from "@/components/auth/AuthWrapper";
import { AutoLogoutConnector } from "@/components/AutoLogoutConnector";
import { ToastProvider } from "@/components/ui/toast";

export const metadata = {
  title: "Unica",
  description: "Unica管理アプリプロトタイプ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <SettingsProvider>
            <CompanyProvider>
              <ToastProvider>
                <AutoLogoutConnector />
                <AuthWrapper>{children}</AuthWrapper>
              </ToastProvider>
            </CompanyProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}