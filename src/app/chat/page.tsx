"use client";
import React from "react";
import { ChatApp } from "@/chat-v2";
import { MessageCircle } from "lucide-react";

/**
 * チャットページ - Chat System v2を使用
 *
 * 新しく再構築されたチャットシステムを使用しています。
 * 以前のバージョンは src/app/chat_backup_20250930_140057 に保存されています。
 *
 * 改善点:
 * - 時刻表示エラー（「時刻不明」）の解決
 * - メッセージ重複問題の解決
 * - Firebase同期の安定化
 * - Discord風UIの実装
 * - 型安全性の向上
 */
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* サイドバーの幅を考慮してメインコンテンツを配置 */}
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* 上部ヘッダー - 他のページと統一されたデザイン */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左側 - ブランドとナビゲーション */}
            <div className="flex items-center space-x-4">
              <MessageCircle className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">チャット</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">リアルタイムコミュニケーション</p>
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/40 dark:to-slate-700/40">
          <ChatApp />
        </div>
      </div>
    </div>
  );
}

/**
 * 既存システムに戻す場合の手順:
 *
 * 1. 現在のpage.tsxをバックアップ
 *    cp src/app/chat/page.tsx src/app/chat/page_v2.tsx
 *
 * 2. 既存バックアップから復元
 *    cp src/app/chat_backup_20250930_140057/page.tsx src/app/chat/page.tsx
 *
 * 3. 関連ファイルも復元
 *    cp -r src/app/chat_backup_20250930_140057/* src/app/chat/
 *
 * 4. 開発サーバーを再起動
 *    npm run dev
 */