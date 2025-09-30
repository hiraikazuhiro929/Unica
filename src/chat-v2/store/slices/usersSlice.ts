import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { UserState, NormalizedEntities } from '../types';

// =============================================================================
// 初期状態
// =============================================================================

interface UsersSliceState {
  entities: NormalizedEntities<UserState>;

  // 現在のユーザー
  currentUserId: string | null;

  // オンラインユーザー管理
  onlineUsers: string[];

  // タイピング状態管理
  typingStatus: Record<string, {
    userId: string;
    userName: string;
    channelId: string;
    lastUpdate: Date;
  }[]>;

  loading: boolean;
  error: string | null;
}

const initialState: UsersSliceState = {
  entities: {
    byId: {},
    allIds: [],
  },
  currentUserId: null,
  onlineUsers: [],
  typingStatus: {},
  loading: false,
  error: null,
};

// =============================================================================
// Slice定義
// =============================================================================

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // ユーザー一括設定
    setUsers: (state, action: PayloadAction<UserState[]>) => {
      const users = action.payload;

      // エンティティ更新
      state.entities.byId = {};
      state.entities.allIds = [];
      state.onlineUsers = [];

      users.forEach(user => {
        const userWithDefaults: UserState = {
          ...user,
          connectionStatus: user.connectionStatus || 'disconnected',
          presenceLastUpdate: user.presenceLastUpdate || new Date(),
        };

        state.entities.byId[user.id] = userWithDefaults;
        state.entities.allIds.push(user.id);

        // オンラインユーザーリスト更新
        if (user.isOnline) {
          state.onlineUsers.push(user.id);
        }
      });
    },

    // ユーザー追加/更新
    upsertUser: (state, action: PayloadAction<UserState>) => {
      const user = action.payload;

      const userWithDefaults: UserState = {
        ...user,
        connectionStatus: user.connectionStatus || 'disconnected',
        presenceLastUpdate: user.presenceLastUpdate || new Date(),
      };

      const existingUser = state.entities.byId[user.id];
      const wasOnline = existingUser?.isOnline || false;

      // ユーザー情報更新
      state.entities.byId[user.id] = userWithDefaults;

      if (!state.entities.allIds.includes(user.id)) {
        state.entities.allIds.push(user.id);
      }

      // オンライン状態変更処理
      if (user.isOnline && !wasOnline) {
        // オンラインになった
        if (!state.onlineUsers.includes(user.id)) {
          state.onlineUsers.push(user.id);
        }
      } else if (!user.isOnline && wasOnline) {
        // オフラインになった
        const index = state.onlineUsers.indexOf(user.id);
        if (index > -1) {
          state.onlineUsers.splice(index, 1);
        }

        // タイピング状態もクリア
        Object.keys(state.typingStatus).forEach(channelId => {
          state.typingStatus[channelId] = state.typingStatus[channelId]
            .filter(typing => typing.userId !== user.id);
        });
      }
    },

    // 現在のユーザー設定
    setCurrentUser: (state, action: PayloadAction<string>) => {
      state.currentUserId = action.payload;
    },

    // ユーザーステータス更新
    updateUserStatus: (state, action: PayloadAction<{
      userId: string;
      status: UserState['status'];
      statusMessage?: string;
    }>) => {
      const { userId, status, statusMessage } = action.payload;
      const user = state.entities.byId[userId];

      if (user) {
        user.status = status;
        if (statusMessage !== undefined) {
          user.statusMessage = statusMessage;
        }
        user.presenceLastUpdate = new Date();

        // オンライン状態更新
        const shouldBeOnline = status === 'online';
        const currentlyOnline = state.onlineUsers.includes(userId);

        if (shouldBeOnline && !currentlyOnline) {
          state.onlineUsers.push(userId);
        } else if (!shouldBeOnline && currentlyOnline) {
          const index = state.onlineUsers.indexOf(userId);
          if (index > -1) {
            state.onlineUsers.splice(index, 1);
          }
        }

        user.isOnline = shouldBeOnline;
      }
    },

    // ユーザーアクティビティ更新
    updateUserActivity: (state, action: PayloadAction<{
      userId: string;
      lastActivity?: Date;
    }>) => {
      const { userId, lastActivity } = action.payload;
      const user = state.entities.byId[userId];

      if (user) {
        user.lastActivity = lastActivity || new Date();
        user.presenceLastUpdate = new Date();
      }
    },

    // タイピング状態更新
    updateTypingStatus: (state, action: PayloadAction<{
      channelId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }>) => {
      const { channelId, userId, userName, isTyping } = action.payload;

      if (!state.typingStatus[channelId]) {
        state.typingStatus[channelId] = [];
      }

      const existingIndex = state.typingStatus[channelId]
        .findIndex(typing => typing.userId === userId);

      if (isTyping) {
        const typingInfo = {
          userId,
          userName,
          channelId,
          lastUpdate: new Date(),
        };

        if (existingIndex > -1) {
          // 既存の更新
          state.typingStatus[channelId][existingIndex] = typingInfo;
        } else {
          // 新規追加
          state.typingStatus[channelId].push(typingInfo);
        }
      } else {
        // タイピング停止
        if (existingIndex > -1) {
          state.typingStatus[channelId].splice(existingIndex, 1);
        }
      }
    },

    // 古いタイピング状態のクリーンアップ
    cleanupTypingStatus: (state, action: PayloadAction<{
      channelId?: string;
      olderThan: Date;
    }>) => {
      const { channelId, olderThan } = action.payload;

      if (channelId) {
        // 特定チャンネルのクリーンアップ
        if (state.typingStatus[channelId]) {
          state.typingStatus[channelId] = state.typingStatus[channelId]
            .filter(typing => typing.lastUpdate > olderThan);
        }
      } else {
        // 全チャンネルのクリーンアップ
        Object.keys(state.typingStatus).forEach(chId => {
          state.typingStatus[chId] = state.typingStatus[chId]
            .filter(typing => typing.lastUpdate > olderThan);
        });
      }
    },

    // 接続状態更新
    updateConnectionStatus: (state, action: PayloadAction<{
      userId: string;
      connectionStatus: UserState['connectionStatus'];
    }>) => {
      const { userId, connectionStatus } = action.payload;
      const user = state.entities.byId[userId];

      if (user) {
        user.connectionStatus = connectionStatus;
        user.presenceLastUpdate = new Date();

        // 切断された場合はオフラインに
        if (connectionStatus === 'disconnected') {
          user.isOnline = false;
          user.status = 'offline';

          const index = state.onlineUsers.indexOf(userId);
          if (index > -1) {
            state.onlineUsers.splice(index, 1);
          }

          // タイピング状態もクリア
          Object.keys(state.typingStatus).forEach(channelId => {
            state.typingStatus[channelId] = state.typingStatus[channelId]
              .filter(typing => typing.userId !== userId);
          });
        }
      }
    },

    // ユーザー削除
    removeUser: (state, action: PayloadAction<string>) => {
      const userId = action.payload;

      delete state.entities.byId[userId];

      const allIdIndex = state.entities.allIds.indexOf(userId);
      if (allIdIndex > -1) {
        state.entities.allIds.splice(allIdIndex, 1);
      }

      const onlineIndex = state.onlineUsers.indexOf(userId);
      if (onlineIndex > -1) {
        state.onlineUsers.splice(onlineIndex, 1);
      }

      // タイピング状態からも削除
      Object.keys(state.typingStatus).forEach(channelId => {
        state.typingStatus[channelId] = state.typingStatus[channelId]
          .filter(typing => typing.userId !== userId);
      });
    },

    // エラー設定
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    // エラークリア
    clearError: (state) => {
      state.error = null;
    },

    // ローディング状態設定
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

// =============================================================================
// Selectors
// =============================================================================

// 全ユーザーセレクター
export const selectAllUsers = createSelector(
  [(state: RootState) => state.users.entities.byId,
   (state: RootState) => state.users.entities.allIds],
  (usersById, allIds) => {
    return allIds.map(id => usersById[id]).filter(Boolean);
  }
);

// 現在のユーザーセレクター
export const selectCurrentUser = createSelector(
  [(state: RootState) => state.users.entities.byId,
   (state: RootState) => state.users.currentUserId],
  (usersById, currentUserId) => {
    return currentUserId ? usersById[currentUserId] : null;
  }
);

// オンラインユーザーセレクター
export const selectOnlineUsers = createSelector(
  [(state: RootState) => state.users.entities.byId,
   (state: RootState) => state.users.onlineUsers],
  (usersById, onlineUserIds) => {
    return onlineUserIds
      .map(id => usersById[id])
      .filter(Boolean);
  }
);

// 特定ユーザーセレクター
export const selectUserById = (state: RootState, userId: string) =>
  state.users.entities.byId[userId];

// チャンネル別タイピングユーザーセレクター
export const selectTypingUsersInChannel = createSelector(
  [(state: RootState) => state.users.typingStatus,
   (state: RootState, channelId: string) => channelId,
   (state: RootState) => state.users.currentUserId],
  (typingStatus, channelId, currentUserId) => {
    const channelTyping = typingStatus[channelId] || [];

    // 自分以外のタイピングユーザーを返す
    return channelTyping.filter(typing => typing.userId !== currentUserId);
  }
);

// 部門別ユーザーセレクター
export const selectUsersByDepartment = createSelector(
  [(state: RootState) => state.users.entities.byId,
   (state: RootState) => state.users.entities.allIds],
  (usersById, allIds) => {
    const result: Record<string, UserState[]> = {};

    allIds.forEach(id => {
      const user = usersById[id];
      if (user) {
        const department = user.department || 'その他';
        if (!result[department]) {
          result[department] = [];
        }
        result[department].push(user);
      }
    });

    return result;
  }
);

// 接続中ユーザー数セレクター
export const selectConnectedUsersCount = createSelector(
  [(state: RootState) => state.users.entities.byId,
   (state: RootState) => state.users.entities.allIds],
  (usersById, allIds) => {
    return allIds.filter(id => {
      const user = usersById[id];
      return user && user.connectionStatus === 'connected';
    }).length;
  }
);

export const { actions } = usersSlice;
export const {
  setUsers,
  upsertUser,
  setCurrentUser,
  updateUserStatus,
  updateUserActivity,
  updateTypingStatus,
  cleanupTypingStatus,
  updateConnectionStatus,
  removeUser,
  setError,
  clearError,
  setLoading,
} = actions;

export default usersSlice.reducer;