import Sidebar from "../components/layout/Sidebar";
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Unica",
  description: "Unica管理アプリプロトタイプ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* サイドバーはfixedで重ねる */}
        <Sidebar />
        {/* mainは全画面、余白なし */}
        <main className="w-full min-h-screen">{children}</main>
      </body>
    </html>
  );
}