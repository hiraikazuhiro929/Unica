// =============================================================================
// Chat V2 Components - Main Export
// Phase 3: Discord風UIレイヤー完全実装
// =============================================================================

// Shared UI Components
export * from './shared';

// Container Components (Business Logic)
export { ChatContainer } from './containers/ChatContainer';
export type { ChatContainerProps } from './containers/ChatContainer';

// Presenter Components (UI Display)
export { ChatPresenter } from './presenters/ChatPresenter';
export type { ChatPresenterProps } from './presenters/ChatPresenter';

export { MessageItemPresenter } from './presenters/MessageItemPresenter';
export type { MessageItemPresenterProps } from './presenters/MessageItemPresenter';

export { MessageInputPresenter } from './presenters/MessageInputPresenter';
export type { MessageInputPresenterProps } from './presenters/MessageInputPresenter';

export { ChannelSidebarPresenter } from './presenters/ChannelSidebarPresenter';
export type { ChannelSidebarPresenterProps, ChannelCategory } from './presenters/ChannelSidebarPresenter';

// Hooks
export { useVirtualScroll } from './hooks/useVirtualScroll';
export type { UseVirtualScrollOptions, UseVirtualScrollReturn } from './hooks/useVirtualScroll';

// Pages
export { ChatPage } from '../pages/ChatPage';
export type { ChatPageProps } from '../pages/ChatPage';

// =============================================================================
// Component Collections - 用途別コンポーネント集
// =============================================================================

/**
 * コンテナコンポーネント（ビジネスロジック）
 */
export const ContainerComponents = {
  ChatContainer,
} as const;

/**
 * プレゼンターコンポーネント（UI表示）
 */
export const PresenterComponents = {
  ChatPresenter,
  MessageItemPresenter,
  MessageInputPresenter,
  ChannelSidebarPresenter,
} as const;

/**
 * メッセージ関連コンポーネント
 */
export const MessageComponents = {
  MessageItemPresenter,
  MessageInputPresenter,
  VirtualScrollMessageList: VirtualScrollMessageList,
} as const;

/**
 * レイアウト関連コンポーネント
 */
export const LayoutComponents = {
  ChatPresenter,
  ChannelSidebarPresenter,
} as const;

// =============================================================================
// Version Information
// =============================================================================

export const UI_LAYER_VERSION = '3.0.0';
export const UI_LAYER_BUILD_DATE = new Date().toISOString();

// =============================================================================
// Component Tree Structure
// =============================================================================

/*
Phase 3 UI Layer Component Tree:

ChatPage (pages/)
└── ChatProvider (providers/)
    └── ChatContainer (containers/)
        └── ChatPresenter (presenters/)
            ├── ChannelSidebarPresenter
            │   ├── Avatar
            │   ├── UnreadBadge
            │   ├── MentionBadge
            │   └── LoadingSpinner
            ├── VirtualScrollMessageList (shared/)
            │   └── MessageItemPresenter
            │       ├── Avatar
            │       ├── StatusIndicator
            │       ├── MessageTimestamp
            │       └── Badge
            └── MessageInputPresenter
                ├── StatusIndicator
                └── Badge

Hooks Integration:
- useChatV2 (data-layer integration)
- useVirtualScroll (@tanstack/react-virtual)

Error Boundaries:
- ChatErrorBoundary (main level)
- CompactErrorBoundary (component level)
*/

// =============================================================================
// Usage Examples
// =============================================================================

/*
// Basic Usage
import { ChatPage } from '@/chat-v2/components';

function App() {
  return (
    <ChatPage
      user={{
        id: 'user123',
        name: 'John Doe',
        role: 'Engineer',
        department: 'Development',
        email: 'john@example.com',
      }}
      autoConnect
    />
  );
}

// Advanced Usage with Custom Layout
import { ChatContainer, ChatProvider } from '@/chat-v2/components';

function CustomChatApp() {
  return (
    <ChatProvider>
      <div className="custom-layout">
        <ChatContainer
          userId="user123"
          userName="John Doe"
          userRole="Engineer"
          userDepartment="Development"
          userEmail="john@example.com"
          initialChannelId="general"
        />
      </div>
    </ChatProvider>
  );
}

// Direct Component Usage
import {
  MessageItemPresenter,
  MessageInputPresenter,
  VirtualScrollMessageList
} from '@/chat-v2/components';

function CustomMessageView({ messages, onSend }) {
  return (
    <div>
      <VirtualScrollMessageList
        messages={messages}
        renderMessage={(message) => (
          <MessageItemPresenter
            message={message}
            isOwnMessage={false}
          />
        )}
      />
      <MessageInputPresenter
        value=""
        onChange={() => {}}
        onSend={onSend}
        attachments={[]}
        onAddAttachment={() => {}}
        onRemoveAttachment={() => {}}
      />
    </div>
  );
}
*/