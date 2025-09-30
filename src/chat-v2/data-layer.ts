// =============================================================================
// Chat V2 Data Layer - Main Export
// Phase 2: 堅牢なデータレイヤー実装
// =============================================================================

// Redux Store
export { store, useAppDispatch, useAppSelector } from './store';
export type { RootState, AppDispatch } from './store';

// Types
export type {
  MessageState,
  ChannelState,
  UserState,
  UIState,
  NormalizedEntities,
  OptimisticOperation,
  QueuedMessage,
  SyncState,
  ActionResult,
} from './store/types';

// Slice Actions
export {
  // Messages
  setMessages,
  addOptimisticMessage,
  replaceOptimisticMessage,
  markMessageFailed,
  removeMessage,
  updateMessage,
  selectMessagesByChannel,
  selectSendingMessages,
  selectFailedMessages,
} from './store/slices/messagesSlice';

export {
  // Channels
  setChannels,
  addChannel,
  updateChannel,
  removeChannel,
  updateUnreadCount,
  resetUnreadCount,
  selectAllChannels,
  selectChannelsByCategory,
  selectChannelById,
  selectUnreadCounts,
  selectTotalUnreadCount,
} from './store/slices/channelsSlice';

export {
  // Users
  setUsers,
  upsertUser,
  setCurrentUser,
  updateUserStatus,
  updateUserActivity,
  updateTypingStatus,
  selectCurrentUser,
  selectOnlineUsers,
  selectTypingUsersInChannel,
  selectUserById,
} from './store/slices/usersSlice';

export {
  // UI
  selectChannel,
  selectThread,
  setMessageContent,
  addAttachment,
  removeAttachment,
  setReplyTo,
  clearMessageInput,
  selectSelectedChannelId,
  selectSelectedThreadId,
  selectMessageInput,
  selectIsTyping,
} from './store/slices/uiSlice';

export {
  // Notifications
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  hideNotification,
  selectUnreadNotifications,
  selectVisibleNotifications,
  selectUnreadCount,
} from './store/slices/notificationsSlice';

// Core Managers
export { OptimisticUIManager } from './managers/OptimisticUIManager';
export { FirebaseSyncManager } from './managers/FirebaseSyncManager';

// Services
export { MessageQueue } from './services/MessageQueue';

// Hooks
export { useChatV2 } from './hooks/useChatV2';

// Provider
export { ChatProvider } from './providers/ChatProvider';

// =============================================================================
// Version and Meta Information
// =============================================================================

export const DATA_LAYER_VERSION = '2.0.0';
export const DATA_LAYER_BUILD_DATE = new Date().toISOString();

// =============================================================================
// Usage Example
// =============================================================================

/*
// 1. App.tsx でプロバイダーを設定
import { ChatProvider } from '@/chat-v2/data-layer';

function App() {
  return (
    <ChatProvider>
      <YourChatComponent />
    </ChatProvider>
  );
}

// 2. チャットコンポーネントでフックを使用
import { useChatV2 } from '@/chat-v2/data-layer';

function ChatComponent() {
  const chat = useChatV2({
    userId: 'user123',
    userName: 'John Doe',
    userRole: 'member',
    userDepartment: 'Engineering',
    userEmail: 'john@example.com',
  });

  return (
    <div>
      {chat.messages.map(message => (
        <div key={message.id}>
          {message.content}
          {message.optimisticStatus === 'sending' && <span>送信中...</span>}
          {message.optimisticStatus === 'failed' && (
            <button onClick={() => chat.actions.retryMessage(message.localId!)}>
              再送信
            </button>
          )}
        </div>
      ))}

      <input
        value={chat.messageInput.content}
        onChange={(e) => chat.actions.updateMessageContent(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            chat.actions.sendMessage(chat.messageInput.content);
          }
        }}
      />
    </div>
  );
}

// 3. Redux状態に直接アクセスする場合
import { useAppSelector, selectMessagesByChannel } from '@/chat-v2/data-layer';

function MessagesComponent({ channelId }: { channelId: string }) {
  const messages = useAppSelector(state =>
    selectMessagesByChannel(state, channelId)
  );

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
    </div>
  );
}

// 4. マネージャーを直接使用する場合
import { OptimisticUIManager, MessageQueue, FirebaseSyncManager } from '@/chat-v2/data-layer';

function setupChatSystem() {
  const optimisticUI = OptimisticUIManager.getInstance();
  const messageQueue = MessageQueue.getInstance();
  const firebaseSync = FirebaseSyncManager.getInstance();

  // 手動でのシステム制御が可能
}
*/