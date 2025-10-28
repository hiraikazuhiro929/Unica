import React from 'react';
import { ChatContainer } from '../containers/ChatContainer';
import { ChatProvider } from '../../providers/ChatProvider';
import { ChatErrorBoundary } from '../shared';

// =============================================================================
// ChatPage Component - メインチャットページ
// =============================================================================

interface ChatPageProps {
  /** 現在のユーザー情報 */
  user: {
    id: string;
    name: string;
    role: string;
    department: string;
    email: string;
    avatar?: string;
  };
  /** 初期選択チャンネルID */
  initialChannelId?: string;
  /** 自動接続するか */
  autoConnect?: boolean;
  /** ページタイトル */
  title?: string;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * メインチャットページコンポーネント
 *
 * 特徴:
 * - ChatProviderによる状態管理
 * - エラー境界の実装
 * - ユーザー認証との統合
 * - SEO対応
 */
export const ChatPage: React.FC<ChatPageProps> = ({
  user,
  initialChannelId,
  autoConnect = true,
  title = 'Unica Chat',
  className,
}) => {
  // エラーハンドリング
  const handleError = (error: Error) => {
    console.error('Chat Page Error:', error);

    // エラー報告（将来実装）
    // reportError(error, {
    //   user: user.id,
    //   page: 'chat',
    //   timestamp: new Date().toISOString(),
    // });
  };

  return (
    <div className={className}>
      {/* ページタイトル設定 */}
      <title>{title}</title>

      {/* メタ情報 */}
      <meta name="description" content="Unica製造業務管理システムのチャット機能" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* メインチャット */}
      <ChatErrorBoundary
        onError={handleError}
        maxRetries={3}
      >
        <ChatProvider>
          <ChatContainer
            userId={user.id}
            userName={user.name}
            userRole={user.role}
            userDepartment={user.department}
            userEmail={user.email}
            userAvatar={user.avatar}
            initialChannelId={initialChannelId}
            autoConnect={autoConnect}
            onError={handleError}
          />
        </ChatProvider>
      </ChatErrorBoundary>
    </div>
  );
};

ChatPage.displayName = 'ChatPage';

// =============================================================================
// Export
// =============================================================================

export type { ChatPageProps };