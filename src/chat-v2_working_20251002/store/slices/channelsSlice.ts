import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ChannelState, NormalizedEntities } from '../types';

// =============================================================================
// 初期状態
// =============================================================================

interface ChannelsSliceState {
  entities: NormalizedEntities<ChannelState>;

  // カテゴリ別チャンネル管理
  byCategory: Record<string, string[]>;

  // 未読数管理
  unreadCounts: Record<string, number>;

  // 同期状態
  syncStatus: Record<string, {
    isSubscribed: boolean;
    lastSync: Date | null;
    error?: string;
  }>;

  loading: boolean;
  error: string | null;
}

const initialState: ChannelsSliceState = {
  entities: {
    byId: {},
    allIds: [],
  },
  byCategory: {},
  unreadCounts: {},
  syncStatus: {},
  loading: false,
  error: null,
};

// =============================================================================
// Slice定義
// =============================================================================

const channelsSlice = createSlice({
  name: 'channels',
  initialState,
  reducers: {
    // チャンネル一括設定
    setChannels: (state, action: PayloadAction<ChannelState[]>) => {
      const channels = action.payload;

      // エンティティ更新
      state.entities.byId = {};
      state.entities.allIds = [];
      state.byCategory = {};

      channels.forEach(channel => {
        const channelWithDefaults: ChannelState = {
          ...channel,
          syncStatus: channel.syncStatus || 'synced',
          messagesPagination: channel.messagesPagination || {
            hasMore: true,
            loading: false,
          },
        };

        state.entities.byId[channel.id] = channelWithDefaults;
        state.entities.allIds.push(channel.id);

        // カテゴリ別グループ化
        const categoryId = channel.categoryId || 'uncategorized';
        if (!state.byCategory[categoryId]) {
          state.byCategory[categoryId] = [];
        }
        state.byCategory[categoryId].push(channel.id);
      });

      // カテゴリ内でposition順にソート
      Object.keys(state.byCategory).forEach(categoryId => {
        state.byCategory[categoryId].sort((a, b) => {
          const channelA = state.entities.byId[a];
          const channelB = state.entities.byId[b];
          return (channelA.position || 0) - (channelB.position || 0);
        });
      });
    },

    // チャンネル追加
    addChannel: (state, action: PayloadAction<ChannelState>) => {
      const channel = action.payload;

      const channelWithDefaults: ChannelState = {
        ...channel,
        syncStatus: channel.syncStatus || 'synced',
        messagesPagination: channel.messagesPagination || {
          hasMore: true,
          loading: false,
        },
      };

      state.entities.byId[channel.id] = channelWithDefaults;

      if (!state.entities.allIds.includes(channel.id)) {
        state.entities.allIds.push(channel.id);
      }

      // カテゴリ別追加
      const categoryId = channel.categoryId || 'uncategorized';
      if (!state.byCategory[categoryId]) {
        state.byCategory[categoryId] = [];
      }

      if (!state.byCategory[categoryId].includes(channel.id)) {
        state.byCategory[categoryId].push(channel.id);

        // position順にソート
        state.byCategory[categoryId].sort((a, b) => {
          const channelA = state.entities.byId[a];
          const channelB = state.entities.byId[b];
          return (channelA.position || 0) - (channelB.position || 0);
        });
      }
    },

    // チャンネル更新
    updateChannel: (state, action: PayloadAction<{
      id: string;
      updates: Partial<ChannelState>;
    }>) => {
      const { id, updates } = action.payload;
      const channel = state.entities.byId[id];

      if (channel) {
        const oldCategoryId = channel.categoryId || 'uncategorized';
        const newCategoryId = updates.categoryId || oldCategoryId;

        // チャンネル情報更新
        Object.assign(channel, updates);

        // カテゴリが変更された場合の処理
        if (oldCategoryId !== newCategoryId) {
          // 古いカテゴリから削除
          const oldCategoryChannels = state.byCategory[oldCategoryId];
          if (oldCategoryChannels) {
            const index = oldCategoryChannels.indexOf(id);
            if (index > -1) {
              oldCategoryChannels.splice(index, 1);
            }
          }

          // 新しいカテゴリに追加
          if (!state.byCategory[newCategoryId]) {
            state.byCategory[newCategoryId] = [];
          }

          if (!state.byCategory[newCategoryId].includes(id)) {
            state.byCategory[newCategoryId].push(id);

            // position順にソート
            state.byCategory[newCategoryId].sort((a, b) => {
              const channelA = state.entities.byId[a];
              const channelB = state.entities.byId[b];
              return (channelA.position || 0) - (channelB.position || 0);
            });
          }
        }
      }
    },

    // チャンネル削除
    removeChannel: (state, action: PayloadAction<string>) => {
      const channelId = action.payload;
      const channel = state.entities.byId[channelId];

      if (channel) {
        // エンティティから削除
        delete state.entities.byId[channelId];

        const allIdIndex = state.entities.allIds.indexOf(channelId);
        if (allIdIndex > -1) {
          state.entities.allIds.splice(allIdIndex, 1);
        }

        // カテゴリから削除
        const categoryId = channel.categoryId || 'uncategorized';
        const categoryChannels = state.byCategory[categoryId];
        if (categoryChannels) {
          const index = categoryChannels.indexOf(channelId);
          if (index > -1) {
            categoryChannels.splice(index, 1);
          }
        }

        // 関連データクリア
        delete state.unreadCounts[channelId];
        delete state.syncStatus[channelId];
      }
    },

    // 未読数更新
    updateUnreadCount: (state, action: PayloadAction<{
      channelId: string;
      count: number;
    }>) => {
      const { channelId, count } = action.payload;
      state.unreadCounts[channelId] = Math.max(0, count);
    },

    // 未読数リセット
    resetUnreadCount: (state, action: PayloadAction<string>) => {
      const channelId = action.payload;
      state.unreadCounts[channelId] = 0;
    },

    // 同期状態更新
    updateSyncStatus: (state, action: PayloadAction<{
      channelId: string;
      status: ChannelsSliceState['syncStatus'][string];
    }>) => {
      const { channelId, status } = action.payload;
      state.syncStatus[channelId] = {
        ...state.syncStatus[channelId],
        ...status,
      };
    },

    // チャンネル同期状態設定
    setChannelSyncStatus: (state, action: PayloadAction<{
      channelId: string;
      syncStatus: ChannelState['syncStatus'];
    }>) => {
      const { channelId, syncStatus } = action.payload;
      const channel = state.entities.byId[channelId];

      if (channel) {
        channel.syncStatus = syncStatus;
        channel.lastSync = new Date();
      }
    },

    // メッセージページネーション状態更新
    updateMessagesPagination: (state, action: PayloadAction<{
      channelId: string;
      pagination: Partial<ChannelState['messagesPagination']>;
    }>) => {
      const { channelId, pagination } = action.payload;
      const channel = state.entities.byId[channelId];

      if (channel) {
        channel.messagesPagination = {
          ...channel.messagesPagination,
          ...pagination,
        };
      }
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

// 全チャンネルセレクター
export const selectAllChannels = createSelector(
  [(state: RootState) => state.channels.entities.byId,
   (state: RootState) => state.channels.entities.allIds],
  (channelsById, allIds) => {
    return allIds.map(id => channelsById[id]).filter(Boolean);
  }
);

// カテゴリ別チャンネルセレクター
export const selectChannelsByCategory = createSelector(
  [(state: RootState) => state.channels.entities.byId,
   (state: RootState) => state.channels.byCategory],
  (channelsById, byCategory) => {
    const result: Record<string, ChannelState[]> = {};

    Object.entries(byCategory).forEach(([categoryId, channelIds]) => {
      result[categoryId] = channelIds
        .map(id => channelsById[id])
        .filter(Boolean);
    });

    return result;
  }
);

// 特定チャンネルセレクター
export const selectChannelById = (state: RootState, channelId: string) =>
  state.channels.entities.byId[channelId];

// 未読数セレクター
export const selectUnreadCounts = (state: RootState) => state.channels.unreadCounts;

export const selectChannelUnreadCount = (state: RootState, channelId: string) =>
  state.channels.unreadCounts[channelId] || 0;

// 総未読数セレクター
export const selectTotalUnreadCount = createSelector(
  [(state: RootState) => state.channels.unreadCounts],
  (unreadCounts) => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }
);

// 同期状態セレクター
export const selectChannelSyncStatus = (state: RootState, channelId: string) =>
  state.channels.syncStatus[channelId] || { isSubscribed: false, lastSync: null };

// 購読中チャンネルセレクター
export const selectSubscribedChannels = createSelector(
  [(state: RootState) => state.channels.entities.allIds,
   (state: RootState) => state.channels.syncStatus],
  (allIds, syncStatus) => {
    return allIds.filter(id => syncStatus[id]?.isSubscribed);
  }
);

export const { actions } = channelsSlice;
export const {
  setChannels,
  addChannel,
  updateChannel,
  removeChannel,
  updateUnreadCount,
  resetUnreadCount,
  updateSyncStatus,
  setChannelSyncStatus,
  updateMessagesPagination,
  setError,
  clearError,
  setLoading,
} = actions;

export default channelsSlice.reducer;