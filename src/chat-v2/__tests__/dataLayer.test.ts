// =============================================================================
// Chat V2 Data Layer - 基本テスト
// 型安全性とコアロジックの検証
// =============================================================================

import { configureStore } from '@reduxjs/toolkit';
import messagesReducer, {
  setMessages,
  addOptimisticMessage,
  replaceOptimisticMessage,
  markMessageFailed,
  selectMessagesByChannel,
} from '../store/slices/messagesSlice';
import channelsReducer, {
  setChannels,
  addChannel,
  updateUnreadCount,
  selectAllChannels,
} from '../store/slices/channelsSlice';
import usersReducer, {
  setUsers,
  upsertUser,
  updateUserStatus,
  selectOnlineUsers,
} from '../store/slices/usersSlice';
import uiReducer, {
  selectChannel,
  setMessageContent,
  selectSelectedChannelId,
} from '../store/slices/uiSlice';
import {
  isMessageState,
  isChannelState,
  isUserState,
  chatMessageToMessageState,
  assertValidId,
} from '../utils/typeGuards';
import type { MessageState, ChannelState, UserState } from '../store/types';
import type { ChatMessage, ChatChannel, ChatUser } from '@/lib/firebase/chat';

// =============================================================================
// テスト用ストア作成
// =============================================================================

const createTestStore = () => {
  return configureStore({
    reducer: {
      messages: messagesReducer,
      channels: channelsReducer,
      users: usersReducer,
      ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // テスト用に無効化
      }),
  });
};

// =============================================================================
// テストデータ
// =============================================================================

const mockChatMessage: ChatMessage = {
  id: 'msg-123',
  channelId: 'ch-456',
  content: 'テストメッセージ',
  authorId: 'user-789',
  authorName: 'テストユーザー',
  authorRole: 'member',
  timestamp: new Date(),
  type: 'message',
  priority: 'normal',
  attachments: [],
  reactions: [],
  isDeleted: false,
};

const mockChatChannel: ChatChannel = {
  id: 'ch-456',
  name: 'テストチャンネル',
  type: 'text',
  isPrivate: false,
  createdBy: 'user-789',
  createdAt: new Date(),
  updatedAt: new Date(),
  memberCount: 1,
  order: 0,
};

const mockChatUser: ChatUser = {
  id: 'user-789',
  name: 'テストユーザー',
  email: 'test@example.com',
  role: 'member',
  department: 'テスト部門',
  isOnline: true,
  lastSeen: new Date(),
  status: 'online',
};

// =============================================================================
// 型ガードテスト
// =============================================================================

describe('Type Guards', () => {
  test('isMessageState should validate MessageState correctly', () => {
    const validMessageState: MessageState = {
      ...mockChatMessage,
      optimisticStatus: 'synced',
      retryCount: 0,
      isOptimistic: false,
    };

    expect(isMessageState(validMessageState)).toBe(true);
    expect(isMessageState(mockChatMessage)).toBe(false); // 拡張プロパティがない
    expect(isMessageState(null)).toBe(false);
    expect(isMessageState({})).toBe(false);
  });

  test('isChannelState should validate ChannelState correctly', () => {
    const validChannelState: ChannelState = {
      ...mockChatChannel,
      syncStatus: 'synced',
      messagesPagination: {
        hasMore: true,
        loading: false,
      },
    };

    expect(isChannelState(validChannelState)).toBe(true);
    expect(isChannelState(mockChatChannel)).toBe(false); // 拡張プロパティがない
  });

  test('isUserState should validate UserState correctly', () => {
    const validUserState: UserState = {
      ...mockChatUser,
      connectionStatus: 'connected',
      presenceLastUpdate: new Date(),
    };

    expect(isUserState(validUserState)).toBe(true);
    expect(isUserState(mockChatUser)).toBe(false); // 拡張プロパティがない
  });

  test('assertValidId should throw for invalid IDs', () => {
    expect(() => assertValidId('valid-id')).not.toThrow();
    expect(() => assertValidId('')).toThrow();
    expect(() => assertValidId('  ')).toThrow();
    expect(() => assertValidId(null)).toThrow();
    expect(() => assertValidId(123)).toThrow();
  });
});

// =============================================================================
// 型変換テスト
// =============================================================================

describe('Type Conversions', () => {
  test('chatMessageToMessageState should convert correctly', () => {
    const messageState = chatMessageToMessageState(mockChatMessage);

    expect(messageState.id).toBe(mockChatMessage.id);
    expect(messageState.content).toBe(mockChatMessage.content);
    expect(messageState.optimisticStatus).toBe('synced');
    expect(messageState.retryCount).toBe(0);
    expect(messageState.isOptimistic).toBe(false);
  });
});

// =============================================================================
// Redux Store テスト
// =============================================================================

describe('Redux Store Integration', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Messages Slice', () => {
    test('should add optimistic message correctly', () => {
      const localId = 'local-123';
      const message = {
        channelId: 'ch-456',
        content: '楽観的メッセージ',
        authorId: 'user-789',
        authorName: 'テストユーザー',
        authorRole: 'member',
        type: 'message' as const,
        priority: 'normal' as const,
        attachments: [],
        reactions: [],
        isDeleted: false,
        timestamp: new Date(),
      };

      store.dispatch(addOptimisticMessage({ message, localId }));

      const state = store.getState();
      const addedMessage = state.messages.entities.byId[localId];

      expect(addedMessage).toBeDefined();
      expect(addedMessage.content).toBe(message.content);
      expect(addedMessage.optimisticStatus).toBe('sending');
      expect(addedMessage.isOptimistic).toBe(true);
      expect(addedMessage.localId).toBe(localId);
    });

    test('should replace optimistic message with server message', () => {
      const localId = 'local-123';
      const serverId = 'server-456';

      // 楽観的メッセージ追加
      const optimisticMessage = {
        channelId: 'ch-456',
        content: '楽観的メッセージ',
        authorId: 'user-789',
        authorName: 'テストユーザー',
        authorRole: 'member',
        type: 'message' as const,
        priority: 'normal' as const,
        attachments: [],
        reactions: [],
        isDeleted: false,
        timestamp: new Date(),
      };

      store.dispatch(addOptimisticMessage({ message: optimisticMessage, localId }));

      // サーバーメッセージで置換
      const serverMessage: MessageState = {
        ...optimisticMessage,
        id: serverId,
        optimisticStatus: 'synced',
        retryCount: 0,
        isOptimistic: false,
      };

      store.dispatch(replaceOptimisticMessage({ localId, serverMessage }));

      const state = store.getState();

      // 楽観的メッセージが削除されている
      expect(state.messages.entities.byId[localId]).toBeUndefined();

      // サーバーメッセージが追加されている
      expect(state.messages.entities.byId[serverId]).toBeDefined();
      expect(state.messages.entities.byId[serverId].optimisticStatus).toBe('synced');
    });

    test('should mark message as failed', () => {
      const localId = 'local-123';
      const errorMessage = 'Network error';

      // まず楽観的メッセージを追加
      const message = {
        channelId: 'ch-456',
        content: '失敗メッセージ',
        authorId: 'user-789',
        authorName: 'テストユーザー',
        authorRole: 'member',
        type: 'message' as const,
        priority: 'normal' as const,
        attachments: [],
        reactions: [],
        isDeleted: false,
        timestamp: new Date(),
      };

      store.dispatch(addOptimisticMessage({ message, localId }));

      // 失敗マーク
      store.dispatch(markMessageFailed({ localId, error: errorMessage }));

      const state = store.getState();
      const failedMessage = state.messages.entities.byId[localId];

      expect(failedMessage.optimisticStatus).toBe('failed');
      expect(failedMessage.retryCount).toBe(1);
    });

    test('selectMessagesByChannel should return filtered messages', () => {
      const channelId = 'ch-456';
      const messages: MessageState[] = [
        {
          ...mockChatMessage,
          id: 'msg-1',
          channelId,
          optimisticStatus: 'synced',
          retryCount: 0,
          isOptimistic: false,
        },
        {
          ...mockChatMessage,
          id: 'msg-2',
          channelId: 'other-channel',
          optimisticStatus: 'synced',
          retryCount: 0,
          isOptimistic: false,
        },
      ];

      store.dispatch(setMessages({ channelId, messages, replace: true }));

      const state = store.getState();
      const channelMessages = selectMessagesByChannel(state, channelId);

      expect(channelMessages).toHaveLength(1);
      expect(channelMessages[0].id).toBe('msg-1');
    });
  });

  describe('Channels Slice', () => {
    test('should set channels correctly', () => {
      const channels: ChannelState[] = [
        {
          ...mockChatChannel,
          syncStatus: 'synced',
          messagesPagination: {
            hasMore: true,
            loading: false,
          },
        },
      ];

      store.dispatch(setChannels(channels));

      const state = store.getState();
      const allChannels = selectAllChannels(state);

      expect(allChannels).toHaveLength(1);
      expect(allChannels[0].id).toBe(mockChatChannel.id);
      expect(allChannels[0].syncStatus).toBe('synced');
    });

    test('should update unread count', () => {
      const channelId = 'ch-456';
      const count = 5;

      store.dispatch(updateUnreadCount({ channelId, count }));

      const state = store.getState();
      expect(state.channels.unreadCounts[channelId]).toBe(count);
    });
  });

  describe('Users Slice', () => {
    test('should set users correctly', () => {
      const users: UserState[] = [
        {
          ...mockChatUser,
          connectionStatus: 'connected',
          presenceLastUpdate: new Date(),
        },
      ];

      store.dispatch(setUsers(users));

      const state = store.getState();
      const onlineUsers = selectOnlineUsers(state);

      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0].id).toBe(mockChatUser.id);
    });

    test('should update user status', () => {
      const userId = 'user-789';
      const users: UserState[] = [
        {
          ...mockChatUser,
          id: userId,
          connectionStatus: 'connected',
          presenceLastUpdate: new Date(),
        },
      ];

      store.dispatch(setUsers(users));
      store.dispatch(updateUserStatus({
        userId,
        status: 'away',
        statusMessage: 'ランチ中',
      }));

      const state = store.getState();
      const user = state.users.entities.byId[userId];

      expect(user.status).toBe('away');
      expect(user.statusMessage).toBe('ランチ中');
    });
  });

  describe('UI Slice', () => {
    test('should select channel correctly', () => {
      const channelId = 'ch-456';

      store.dispatch(selectChannel(channelId));

      const state = store.getState();
      const selectedChannelId = selectSelectedChannelId(state);

      expect(selectedChannelId).toBe(channelId);
    });

    test('should update message content', () => {
      const content = 'テスト入力';

      store.dispatch(setMessageContent(content));

      const state = store.getState();
      expect(state.ui.messageInput.content).toBe(content);
    });
  });
});

// =============================================================================
// パフォーマンステスト
// =============================================================================

describe('Performance Tests', () => {
  test('should handle large number of messages efficiently', () => {
    const store = createTestStore();
    const channelId = 'ch-456';
    const messageCount = 1000;

    const messages: MessageState[] = Array.from({ length: messageCount }, (_, index) => ({
      ...mockChatMessage,
      id: `msg-${index}`,
      content: `メッセージ ${index}`,
      optimisticStatus: 'synced' as const,
      retryCount: 0,
      isOptimistic: false,
    }));

    const startTime = performance.now();
    store.dispatch(setMessages({ channelId, messages, replace: true }));
    const endTime = performance.now();

    const state = store.getState();
    const channelMessages = selectMessagesByChannel(state, channelId);

    expect(channelMessages).toHaveLength(messageCount);
    expect(endTime - startTime).toBeLessThan(100); // 100ms以内
  });
});

// =============================================================================
// エラーハンドリングテスト
// =============================================================================

describe('Error Handling', () => {
  test('should handle invalid message data gracefully', () => {
    const store = createTestStore();

    // 不正なデータでもエラーを投げない（型ガードで事前チェック）
    expect(() => {
      // 型ガードを使用した安全な操作
      const invalidData = { invalid: 'data' };
      if (isMessageState(invalidData)) {
        // この条件は満たされないため、実行されない
        store.dispatch(setMessages({
          channelId: 'ch-456',
          messages: [invalidData],
          replace: true,
        }));
      }
    }).not.toThrow();
  });
});

// =============================================================================
// 統合テスト
// =============================================================================

describe('Integration Tests', () => {
  test('should handle complete message flow', () => {
    const store = createTestStore();
    const channelId = 'ch-456';
    const localId = 'local-123';
    const serverId = 'server-456';

    // 1. チャンネル選択
    store.dispatch(selectChannel(channelId));

    // 2. メッセージ入力
    store.dispatch(setMessageContent('統合テストメッセージ'));

    // 3. 楽観的メッセージ追加
    const message = {
      channelId,
      content: '統合テストメッセージ',
      authorId: 'user-789',
      authorName: 'テストユーザー',
      authorRole: 'member',
      type: 'message' as const,
      priority: 'normal' as const,
      attachments: [],
      reactions: [],
      isDeleted: false,
      timestamp: new Date(),
    };

    store.dispatch(addOptimisticMessage({ message, localId }));

    // 4. サーバーレスポンスでの置換
    const serverMessage: MessageState = {
      ...message,
      id: serverId,
      optimisticStatus: 'synced',
      retryCount: 0,
      isOptimistic: false,
    };

    store.dispatch(replaceOptimisticMessage({ localId, serverMessage }));

    // 5. 状態検証
    const state = store.getState();

    expect(selectSelectedChannelId(state)).toBe(channelId);
    expect(state.messages.entities.byId[localId]).toBeUndefined(); // 楽観的メッセージ削除
    expect(state.messages.entities.byId[serverId]).toBeDefined(); // サーバーメッセージ存在
    expect(state.messages.entities.byId[serverId].optimisticStatus).toBe('synced');

    const channelMessages = selectMessagesByChannel(state, channelId);
    expect(channelMessages).toHaveLength(1);
    expect(channelMessages[0].id).toBe(serverId);
  });
});