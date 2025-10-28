/**
 * Chat Redux Slice
 * チャットシステムの状態管理
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ChatState,
  ChatMessage,
  ChatChannel,
  ChatUser,
  UnreadCount,
  ChatNotification,
  TypingStatus,
  ChannelId,
  MessageId,
  UserId,
  createChannelId,
  createMessageId,
  createUserId
} from '../types';

// 初期状態
const initialState: ChatState = {
  channels: [],
  currentChannelId: null,
  messages: {},
  users: [],
  currentUser: null,
  unreadCounts: [],
  notifications: [],
  typingUsers: {},
  loading: {
    channels: false,
    messages: false,
    users: false,
  },
  error: {
    channels: null,
    messages: null,
    users: null,
  },
};

// 非同期アクション定義（実際のFirebase操作は後で実装）
export const fetchChannels = createAsyncThunk(
  'chat/fetchChannels',
  async (userId?: string) => {
    // Firebase実装は後で追加
    return [];
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (channelId: ChannelId) => {
    // Firebase実装は後で追加
    return [];
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData: {
    channelId: ChannelId;
    content: string;
    authorId: UserId;
    authorName: string;
    authorRole: string;
  }) => {
    // Firebase実装は後で追加
    const newMessage: ChatMessage = {
      id: createMessageId(Date.now().toString()),
      channelId: messageData.channelId,
      content: messageData.content,
      authorId: messageData.authorId,
      authorName: messageData.authorName,
      authorRole: messageData.authorRole,
      timestamp: new Date() as any, // 仮実装
      type: 'message',
      isDeleted: false,
      status: 'sent',
    };
    return newMessage;
  }
);

// Redux slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // チャンネル関連
    setCurrentChannel: (state, action: PayloadAction<ChannelId>) => {
      state.currentChannelId = action.payload;
    },

    setChannels: (state, action: PayloadAction<ChatChannel[]>) => {
      state.channels = action.payload;
    },

    addChannel: (state, action: PayloadAction<ChatChannel>) => {
      const existingIndex = state.channels.findIndex(c => c.id === action.payload.id);
      if (existingIndex >= 0) {
        state.channels[existingIndex] = action.payload;
      } else {
        state.channels.push(action.payload);
      }
    },

    updateChannel: (state, action: PayloadAction<{ id: ChannelId; updates: Partial<ChatChannel> }>) => {
      const index = state.channels.findIndex(c => c.id === action.payload.id);
      if (index >= 0) {
        state.channels[index] = { ...state.channels[index], ...action.payload.updates };
      }
    },

    removeChannel: (state, action: PayloadAction<ChannelId>) => {
      state.channels = state.channels.filter(c => c.id !== action.payload);
      if (state.currentChannelId === action.payload) {
        state.currentChannelId = null;
      }
      delete state.messages[action.payload];
    },

    // メッセージ関連（シンプル版）
    setMessages: (state, action: PayloadAction<{ channelId: ChannelId; messages: ChatMessage[] }>) => {
      const { channelId, messages } = action.payload;
      // Firebaseから来たメッセージをそのまま保存（chatServiceで既にソート済み）
      state.messages[channelId] = messages;
    },

    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      const channelId = action.payload.channelId;
      if (!state.messages[channelId]) {
        state.messages[channelId] = [];
      }

      // 重複チェック
      const existingIndex = state.messages[channelId].findIndex(m => m.id === action.payload.id);
      if (existingIndex >= 0) {
        state.messages[channelId][existingIndex] = action.payload;
      } else {
        state.messages[channelId].push(action.payload);
        // 時系列でソート
        state.messages[channelId].sort((a, b) => {
          const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
          const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
          return aTime - bTime;
        });
      }
    },

    updateMessage: (state, action: PayloadAction<{ channelId: ChannelId; messageId: MessageId; updates: Partial<ChatMessage> }>) => {
      const { channelId, messageId, updates } = action.payload;
      if (state.messages[channelId]) {
        const index = state.messages[channelId].findIndex(m => m.id === messageId);
        if (index >= 0) {
          state.messages[channelId][index] = { ...state.messages[channelId][index], ...updates };
        }
      }
    },

    removeMessage: (state, action: PayloadAction<{ channelId: ChannelId; messageId: MessageId }>) => {
      const { channelId, messageId } = action.payload;
      if (state.messages[channelId]) {
        const index = state.messages[channelId].findIndex(m => m.id === messageId);
        if (index >= 0) {
          state.messages[channelId][index].isDeleted = true;
          state.messages[channelId][index].content = '[削除されたメッセージ]';
        }
      }
    },

    // 楽観的UI用
    addOptimisticMessage: (state, action: PayloadAction<ChatMessage & { localId: string }>) => {
      const message = { ...action.payload, status: 'sending' as const };
      const channelId = message.channelId;

      if (!state.messages[channelId]) {
        state.messages[channelId] = [];
      }

      // 重複チェック: 同じlocalIdのメッセージは追加しない
      const existingIndex = state.messages[channelId].findIndex(m => m.localId === message.localId);
      if (existingIndex < 0) {
        state.messages[channelId].push(message);
      }
    },

    confirmOptimisticMessage: (state, action: PayloadAction<{ localId: string; serverMessage: ChatMessage }>) => {
      const { localId, serverMessage } = action.payload;
      const channelId = serverMessage.channelId;

      if (state.messages[channelId]) {
        const index = state.messages[channelId].findIndex(m => m.localId === localId);
        if (index >= 0) {
          state.messages[channelId][index] = serverMessage;
        }
      }
    },

    failOptimisticMessage: (state, action: PayloadAction<string>) => {
      const localId = action.payload;

      Object.keys(state.messages).forEach(channelId => {
        const index = state.messages[channelId].findIndex(m => m.localId === localId);
        if (index >= 0) {
          state.messages[channelId][index].status = 'failed';
        }
      });
    },

    // 楽観的メッセージを削除（送信成功後にFirebaseメッセージが届いた時用）
    removeOptimisticMessage: (state, action: PayloadAction<string>) => {
      const localId = action.payload;

      Object.keys(state.messages).forEach(channelId => {
        state.messages[channelId] = state.messages[channelId].filter(m => m.localId !== localId);
      });
    },

    // ユーザー関連
    setUsers: (state, action: PayloadAction<ChatUser[]>) => {
      state.users = action.payload;
    },

    setCurrentUser: (state, action: PayloadAction<ChatUser>) => {
      state.currentUser = action.payload;
    },

    updateUser: (state, action: PayloadAction<{ id: UserId; updates: Partial<ChatUser> }>) => {
      const index = state.users.findIndex(u => u.id === action.payload.id);
      if (index >= 0) {
        state.users[index] = { ...state.users[index], ...action.payload.updates };
      }

      if (state.currentUser && state.currentUser.id === action.payload.id) {
        state.currentUser = { ...state.currentUser, ...action.payload.updates };
      }
    },

    addUser: (state, action: PayloadAction<ChatUser>) => {
      const existingIndex = state.users.findIndex(u => u.id === action.payload.id);
      if (existingIndex >= 0) {
        state.users[existingIndex] = action.payload;
      } else {
        state.users.push(action.payload);
      }
    },

    // タイピング状態
    setTypingUsers: (state, action: PayloadAction<{ channelId: ChannelId; users: TypingStatus[] }>) => {
      state.typingUsers[action.payload.channelId] = action.payload.users;
    },

    addTypingUser: (state, action: PayloadAction<TypingStatus>) => {
      const channelId = action.payload.channelId;
      if (!state.typingUsers[channelId]) {
        state.typingUsers[channelId] = [];
      }

      const existingIndex = state.typingUsers[channelId].findIndex(
        u => u.userId === action.payload.userId
      );

      if (existingIndex >= 0) {
        state.typingUsers[channelId][existingIndex] = action.payload;
      } else {
        state.typingUsers[channelId].push(action.payload);
      }
    },

    removeTypingUser: (state, action: PayloadAction<{ channelId: ChannelId; userId: UserId }>) => {
      const { channelId, userId } = action.payload;
      if (state.typingUsers[channelId]) {
        state.typingUsers[channelId] = state.typingUsers[channelId].filter(
          u => u.userId !== userId
        );
      }
    },

    // 未読数
    setUnreadCounts: (state, action: PayloadAction<UnreadCount[]>) => {
      state.unreadCounts = action.payload;
    },

    updateUnreadCount: (state, action: PayloadAction<UnreadCount>) => {
      const index = state.unreadCounts.findIndex(
        u => u.channelId === action.payload.channelId && u.userId === action.payload.userId
      );

      if (index >= 0) {
        state.unreadCounts[index] = action.payload;
      } else {
        state.unreadCounts.push(action.payload);
      }
    },

    markChannelAsRead: (state, action: PayloadAction<{ channelId: ChannelId; userId: UserId }>) => {
      const { channelId, userId } = action.payload;
      const index = state.unreadCounts.findIndex(
        u => u.channelId === channelId && u.userId === userId
      );

      if (index >= 0) {
        state.unreadCounts[index].count = 0;
      }
    },

    // 通知
    setNotifications: (state, action: PayloadAction<ChatNotification[]>) => {
      state.notifications = action.payload;
    },

    addNotification: (state, action: PayloadAction<ChatNotification>) => {
      const existingIndex = state.notifications.findIndex(n => n.id === action.payload.id);
      if (existingIndex >= 0) {
        state.notifications[existingIndex] = action.payload;
      } else {
        state.notifications.unshift(action.payload); // 新しい通知を先頭に追加
      }
    },

    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index >= 0) {
        state.notifications[index].isRead = true;
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    // ローディング状態
    setLoading: (state, action: PayloadAction<{ key: keyof ChatState['loading']; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },

    // エラー状態
    setError: (state, action: PayloadAction<{ key: keyof ChatState['error']; error: string | null }>) => {
      state.error[action.payload.key] = action.payload.error;
    },

    // 全体リセット
    resetChat: () => initialState,

    // チャンネル切り替え時のクリーンアップ
    cleanupChannelData: (state, action: PayloadAction<ChannelId>) => {
      const channelId = action.payload;
      delete state.typingUsers[channelId];
      state.error.messages = null;
    },
  },

  extraReducers: (builder) => {
    // fetchChannels
    builder
      .addCase(fetchChannels.pending, (state) => {
        state.loading.channels = true;
        state.error.channels = null;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.loading.channels = false;
        state.channels = action.payload;
      })
      .addCase(fetchChannels.rejected, (state, action) => {
        state.loading.channels = false;
        state.error.channels = action.error.message || 'チャンネルの取得に失敗しました';
      });

    // fetchMessages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading.messages = true;
        state.error.messages = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading.messages = false;
        if (state.currentChannelId) {
          state.messages[state.currentChannelId] = action.payload;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading.messages = false;
        state.error.messages = action.error.message || 'メッセージの取得に失敗しました';
      });

    // sendMessage
    builder
      .addCase(sendMessage.fulfilled, (state, action) => {
        // 楽観的UIで既に追加されているはずなので、ここでは確認処理
        const message = action.payload;
        const channelId = message.channelId;

        if (!state.messages[channelId]) {
          state.messages[channelId] = [];
        }

        const existingIndex = state.messages[channelId].findIndex(m => m.id === message.id);
        if (existingIndex === -1) {
          state.messages[channelId].push(message);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error.messages = action.error.message || 'メッセージの送信に失敗しました';
      });
  },
});

// Actions export
export const {
  setCurrentChannel,
  setChannels,
  addChannel,
  updateChannel,
  removeChannel,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  addOptimisticMessage,
  confirmOptimisticMessage,
  failOptimisticMessage,
  removeOptimisticMessage,
  setUsers,
  setCurrentUser,
  updateUser,
  addUser,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  setUnreadCounts,
  updateUnreadCount,
  markChannelAsRead,
  setNotifications,
  addNotification,
  markNotificationAsRead,
  removeNotification,
  setLoading,
  setError,
  resetChat,
  cleanupChannelData,
} = chatSlice.actions;

// Selectors
export const selectCurrentChannel = (state: { chat: ChatState }) => {
  if (!state.chat.currentChannelId) return null;
  return state.chat.channels.find(c => c.id === state.chat.currentChannelId) || null;
};

export const selectCurrentMessages = (state: { chat: ChatState }) => {
  if (!state.chat.currentChannelId) return [];
  return state.chat.messages[state.chat.currentChannelId] || [];
};

export const selectChannelById = (channelId: ChannelId) => (state: { chat: ChatState }) => {
  return state.chat.channels.find(c => c.id === channelId) || null;
};

export const selectMessagesByChannelId = (channelId: ChannelId) => (state: { chat: ChatState }) => {
  return state.chat.messages[channelId] || [];
};

export const selectUserById = (userId: UserId) => (state: { chat: ChatState }) => {
  return state.chat.users.find(u => u.id === userId) || null;
};

export const selectUnreadCountForChannel = (channelId: ChannelId, userId: UserId) => (state: { chat: ChatState }) => {
  const unread = state.chat.unreadCounts.find(u => u.channelId === channelId && u.userId === userId);
  return unread?.count || 0;
};

export const selectTypingUsersForChannel = (channelId: ChannelId) => (state: { chat: ChatState }) => {
  return state.chat.typingUsers[channelId] || [];
};

export const selectUnreadNotifications = (state: { chat: ChatState }) => {
  return state.chat.notifications.filter(n => !n.isRead);
};

export const selectChannelsByCategory = (state: { chat: ChatState }) => {
  const channelsWithoutCategory = state.chat.channels.filter(c => !c.categoryId);
  const channelsWithCategory = state.chat.channels.filter(c => c.categoryId);

  // TODO: カテゴリー情報が実装されたら適切にグループ化
  return {
    uncategorized: channelsWithoutCategory,
    categorized: channelsWithCategory,
  };
};

export default chatSlice.reducer;