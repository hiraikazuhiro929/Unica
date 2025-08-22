import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import AuthWrapper from "@/components/auth/AuthWrapper";
import { AutoLogoutConnector } from "@/components/AutoLogoutConnector";

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
              <AutoLogoutConnector />
              <AuthWrapper>{children}</AuthWrapper>
            </CompanyProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}