import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type {
  MessageState,
  NormalizedEntities,
  OptimisticOperation
} from '../types';

// =============================================================================
// 初期状態
// =============================================================================

interface MessagesSliceState {
  entities: NormalizedEntities<MessageState>;

  // チャンネル別メッセージID管理
  byChannel: Record<string, string[]>;

  // 楽観的UI管理
  optimisticOperations: Record<string, OptimisticOperation>;

  // 送信キュー（メッセージ重複防止）
  sendingQueue: Record<string, {
    localId: string;
    timestamp: Date;
    retryCount: number;
  }>;

  // ページネーション状態
  pagination: Record<string, {
    hasMore: boolean;
    loading: boolean;
    oldestMessageId?: string;
  }>;

  // 状態フラグ
  loading: boolean;
  error: string | null;
}

const initialState: MessagesSliceState = {
  entities: {
    byId: {},
    allIds: [],
  },
  byChannel: {},
  optimisticOperations: {},
  sendingQueue: {},
  pagination: {},
  loading: false,
  error: null,
};

// =============================================================================
// Slice定義
// =============================================================================

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // メッセージ一括追加（Firebase同期時）
    setMessages: (state, action: PayloadAction<{
      channelId: string;
      messages: MessageState[];
      replace?: boolean;
    }>) => {
      const { channelId, messages, replace = false } = action.payload;

      if (replace) {
        // チャンネルの既存メッセージをクリア
        const existingIds = state.byChannel[channelId] || [];
        existingIds.forEach(id => {
          delete state.entities.byId[id];
          const index = state.entities.allIds.indexOf(id);
          if (index > -1) {
            state.entities.allIds.splice(index, 1);
          }
        });
        state.byChannel[channelId] = [];
      }

      // 新しいメッセージを追加
      messages.forEach(message => {
        const messageWithDefaults: MessageState = {
          ...message,
          optimisticStatus: message.optimisticStatus || 'synced',
          retryCount: message.retryCount || 0,
          isOptimistic: message.isOptimistic || false,
        };

        state.entities.byId[message.id] = messageWithDefaults;

        if (!state.entities.allIds.includes(message.id)) {
          state.entities.allIds.push(message.id);
        }

        if (!state.byChannel[channelId]) {
          state.byChannel[channelId] = [];
        }

        if (!state.byChannel[channelId].includes(message.id)) {
          state.byChannel[channelId].push(message.id);
        }
      });

      // チャンネル内メッセージをタイムスタンプ順にソート
      if (state.byChannel[channelId]) {
        state.byChannel[channelId].sort((a, b) => {
          const messageA = state.entities.byId[a];
          const messageB = state.entities.byId[b];
          const timeA = messageA.timestamp instanceof Date ?
            messageA.timestamp.getTime() :
            new Date(messageA.timestamp).getTime();
          const timeB = messageB.timestamp instanceof Date ?
            messageB.timestamp.getTime() :
            new Date(messageB.timestamp).getTime();
          return timeA - timeB;
        });
      }
    },

    // 楽観的メッセージ追加
    addOptimisticMessage: (state, action: PayloadAction<{
      message: Omit<MessageState, 'id'>;
      localId: string;
    }>) => {
      const { message, localId } = action.payload;

      const optimisticMessage: MessageState = {
        ...message,
        id: localId, // 一時的にlocalIdをidとして使用
        localId,
        optimisticStatus: 'sending',
        retryCount: 0,
        isOptimistic: true,
        timestamp: new Date(),
      };

      state.entities.byId[localId] = optimisticMessage;
      state.entities.allIds.push(localId);

      if (!state.byChannel[message.channelId]) {
        state.byChannel[message.channelId] = [];
      }
      state.byChannel[message.channelId].push(localId);

      // 送信キューに追加
      state.sendingQueue[localId] = {
        localId,
        timestamp: new Date(),
        retryCount: 0,
      };
    },

    // 楽観的メッセージをサーバーメッセージに置換（重複除去）
    replaceOptimisticMessage: (state, action: PayloadAction<{
      localId: string;
      serverMessage: MessageState;
    }>) => {
      const { localId, serverMessage } = action.payload;
      const optimisticMsg = state.entities.byId[localId];

      if (optimisticMsg) {
        // 楽観的メッセージを削除
        delete state.entities.byId[localId];
        const allIdIndex = state.entities.allIds.indexOf(localId);
        if (allIdIndex > -1) {
          state.entities.allIds.splice(allIdIndex, 1);
        }

        // チャンネル内リストからも削除
        const channelMessages = state.byChannel[optimisticMsg.channelId];
        if (channelMessages) {
          const channelIndex = channelMessages.indexOf(localId);
          if (channelIndex > -1) {
            channelMessages.splice(channelIndex, 1);
          }
        }

        // 送信キューから削除
        delete state.sendingQueue[localId];
      }

      // サーバーメッセージを追加（重複チェック）
      if (!state.entities.byId[serverMessage.id]) {
        const finalMessage: MessageState = {
          ...serverMessage,
          optimisticStatus: 'synced',
          retryCount: 0,
          isOptimistic: false,
        };

        state.entities.byId[serverMessage.id] = finalMessage;
        state.entities.allIds.push(serverMessage.id);

        if (!state.byChannel[serverMessage.channelId]) {
          state.byChannel[serverMessage.channelId] = [];
        }
        state.byChannel[serverMessage.channelId].push(serverMessage.id);

        // ソート
        state.byChannel[serverMessage.channelId].sort((a, b) => {
          const msgA = state.entities.byId[a];
          const msgB = state.entities.byId[b];
          const timeA = msgA.timestamp instanceof Date ?
            msgA.timestamp.getTime() :
            new Date(msgA.timestamp).getTime();
          const timeB = msgB.timestamp instanceof Date ?
            msgB.timestamp.getTime() :
            new Date(msgB.timestamp).getTime();
          return timeA - timeB;
        });
      }
    },

    // メッセージ送信失敗処理
    markMessageFailed: (state, action: PayloadAction<{
      localId: string;
      error: string;
    }>) => {
      const { localId, error } = action.payload;
      const message = state.entities.byId[localId];

      if (message) {
        message.optimisticStatus = 'failed';
        message.retryCount += 1;
        message.lastAttempt = new Date();
      }

      const queueItem = state.sendingQueue[localId];
      if (queueItem) {
        queueItem.retryCount += 1;
      }

      state.error = error;
    },

    // メッセージ削除
    removeMessage: (state, action: PayloadAction<string>) => {
      const messageId = action.payload;
      const message = state.entities.byId[messageId];

      if (message) {
        delete state.entities.byId[messageId];

        const allIdIndex = state.entities.allIds.indexOf(messageId);
        if (allIdIndex > -1) {
          state.entities.allIds.splice(allIdIndex, 1);
        }

        const channelMessages = state.byChannel[message.channelId];
        if (channelMessages) {
          const channelIndex = channelMessages.indexOf(messageId);
          if (channelIndex > -1) {
            channelMessages.splice(channelIndex, 1);
          }
        }

        // 送信キューからも削除
        delete state.sendingQueue[messageId];
      }
    },

    // メッセージ更新
    updateMessage: (state, action: PayloadAction<{
      id: string;
      updates: Partial<MessageState>;
    }>) => {
      const { id, updates } = action.payload;
      const message = state.entities.byId[id];

      if (message) {
        Object.assign(message, updates);
      }
    },

    // ページネーション状態更新
    updatePagination: (state, action: PayloadAction<{
      channelId: string;
      pagination: Partial<MessagesSliceState['pagination'][string]>;
    }>) => {
      const { channelId, pagination } = action.payload;

      if (!state.pagination[channelId]) {
        state.pagination[channelId] = {
          hasMore: true,
          loading: false,
        };
      }

      Object.assign(state.pagination[channelId], pagination);
    },

    // エラークリア
    clearError: (state) => {
      state.error = null;
    },

    // チャンネルメッセージクリア
    clearChannelMessages: (state, action: PayloadAction<string>) => {
      const channelId = action.payload;
      const messageIds = state.byChannel[channelId] || [];

      messageIds.forEach(id => {
        delete state.entities.byId[id];
        const index = state.entities.allIds.indexOf(id);
        if (index > -1) {
          state.entities.allIds.splice(index, 1);
        }
      });

      delete state.byChannel[channelId];
      delete state.pagination[channelId];
    },
  },
});

// =============================================================================
// Selectors（メモ化による最適化）
// =============================================================================

// チャンネル別メッセージセレクター
export const selectMessagesByChannel = createSelector(
  [(state: RootState) => state.messages.entities.byId,
   (state: RootState) => state.messages.byChannel,
   (state: RootState, channelId: string) => channelId],
  (messagesById, byChannel, channelId) => {
    const messageIds = byChannel[channelId] || [];
    return messageIds.map(id => messagesById[id]).filter(Boolean);
  }
);

// 送信中メッセージセレクター
export const selectSendingMessages = createSelector(
  [(state: RootState) => state.messages.entities.byId,
   (state: RootState) => state.messages.sendingQueue],
  (messagesById, sendingQueue) => {
    return Object.keys(sendingQueue)
      .map(localId => messagesById[localId])
      .filter(msg => msg && msg.optimisticStatus === 'sending');
  }
);

// 失敗メッセージセレクター
export const selectFailedMessages = createSelector(
  [(state: RootState) => state.messages.entities.byId],
  (messagesById) => {
    return Object.values(messagesById)
      .filter(msg => msg.optimisticStatus === 'failed');
  }
);

// チャンネルページネーション状態セレクター
export const selectChannelPagination = (state: RootState, channelId: string) =>
  state.messages.pagination[channelId] || { hasMore: true, loading: false };

export const { actions } = messagesSlice;
export const {
  setMessages,
  addOptimisticMessage,
  replaceOptimisticMessage,
  markMessageFailed,
  removeMessage,
  updateMessage,
  updatePagination,
  clearError,
  clearChannelMessages,
} = actions;

export default messagesSlice.reducer;