import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { NormalizedEntities } from '../types';
import type { ChatNotification } from '@/lib/firebase/chat';

// =============================================================================
// 拡張通知型
// =============================================================================

interface NotificationState extends ChatNotification {
  // UI状態
  isVisible: boolean;
  dismissedAt?: Date;

  // 分類
  category: 'message' | 'mention' | 'system' | 'error';

  // 表示制御
  autoHide: boolean;
  hideAfter?: number; // ミリ秒
}

// =============================================================================
// 初期状態
// =============================================================================

interface NotificationsSliceState {
  entities: NormalizedEntities<NotificationState>;

  // カテゴリ別分類
  byCategory: Record<string, string[]>;

  // 未読管理
  unreadIds: string[];

  // 表示中通知（トースト等）
  visibleIds: string[];

  // 設定
  settings: {
    sound: boolean;
    desktop: boolean;
    mentions: boolean;
    maxVisible: number;
    defaultHideAfter: number;
  };

  loading: boolean;
  error: string | null;
}

const initialState: NotificationsSliceState = {
  entities: {
    byId: {},
    allIds: [],
  },
  byCategory: {},
  unreadIds: [],
  visibleIds: [],
  settings: {
    sound: true,
    desktop: true,
    mentions: true,
    maxVisible: 5,
    defaultHideAfter: 5000,
  },
  loading: false,
  error: null,
};

// =============================================================================
// Slice定義
// =============================================================================

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // 通知一括設定
    setNotifications: (state, action: PayloadAction<NotificationState[]>) => {
      const notifications = action.payload;

      // エンティティリセット
      state.entities.byId = {};
      state.entities.allIds = [];
      state.byCategory = {};
      state.unreadIds = [];

      notifications.forEach(notification => {
        const notificationWithDefaults: NotificationState = {
          ...notification,
          isVisible: notification.isVisible || false,
          category: notification.category || 'message',
          autoHide: notification.autoHide !== false,
          hideAfter: notification.hideAfter || state.settings.defaultHideAfter,
        };

        state.entities.byId[notification.id] = notificationWithDefaults;
        state.entities.allIds.push(notification.id);

        // カテゴリ別分類
        const category = notificationWithDefaults.category;
        if (!state.byCategory[category]) {
          state.byCategory[category] = [];
        }
        state.byCategory[category].push(notification.id);

        // 未読管理
        if (!notification.isRead) {
          state.unreadIds.push(notification.id);
        }

        // 表示状態管理
        if (notificationWithDefaults.isVisible) {
          state.visibleIds.push(notification.id);
        }
      });

      // タイムスタンプ順にソート（新しい順）
      state.entities.allIds.sort((a, b) => {
        const notifA = state.entities.byId[a];
        const notifB = state.entities.byId[b];
        const timeA = notifA.timestamp instanceof Date ?
          notifA.timestamp.getTime() :
          new Date(notifA.timestamp).getTime();
        const timeB = notifB.timestamp instanceof Date ?
          notifB.timestamp.getTime() :
          new Date(notifB.timestamp).getTime();
        return timeB - timeA; // 新しい順
      });
    },

    // 新しい通知追加
    addNotification: (state, action: PayloadAction<Omit<NotificationState, 'id'>>) => {
      const notificationData = action.payload;
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const notification: NotificationState = {
        ...notificationData,
        id,
        isVisible: true,
        category: notificationData.category || 'message',
        autoHide: notificationData.autoHide !== false,
        hideAfter: notificationData.hideAfter || state.settings.defaultHideAfter,
        timestamp: notificationData.timestamp || new Date(),
      };

      // エンティティ追加
      state.entities.byId[id] = notification;
      state.entities.allIds.unshift(id); // 先頭に追加（新しい順）

      // カテゴリ別追加
      const category = notification.category;
      if (!state.byCategory[category]) {
        state.byCategory[category] = [];
      }
      state.byCategory[category].unshift(id);

      // 未読追加
      if (!notification.isRead) {
        state.unreadIds.unshift(id);
      }

      // 表示リストに追加
      state.visibleIds.unshift(id);

      // 最大表示数制限
      if (state.visibleIds.length > state.settings.maxVisible) {
        const removedId = state.visibleIds.pop();
        if (removedId && state.entities.byId[removedId]) {
          state.entities.byId[removedId].isVisible = false;
        }
      }
    },

    // 通知を既読にする
    markAsRead: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notification = state.entities.byId[notificationId];

      if (notification && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();

        // 未読リストから削除
        const unreadIndex = state.unreadIds.indexOf(notificationId);
        if (unreadIndex > -1) {
          state.unreadIds.splice(unreadIndex, 1);
        }
      }
    },

    // 複数通知を既読にする
    markMultipleAsRead: (state, action: PayloadAction<string[]>) => {
      const notificationIds = action.payload;

      notificationIds.forEach(id => {
        const notification = state.entities.byId[id];
        if (notification && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date();

          const unreadIndex = state.unreadIds.indexOf(id);
          if (unreadIndex > -1) {
            state.unreadIds.splice(unreadIndex, 1);
          }
        }
      });
    },

    // 全て既読にする
    markAllAsRead: (state) => {
      state.unreadIds.forEach(id => {
        const notification = state.entities.byId[id];
        if (notification) {
          notification.isRead = true;
          notification.readAt = new Date();
        }
      });
      state.unreadIds = [];
    },

    // 通知を非表示にする
    hideNotification: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notification = state.entities.byId[notificationId];

      if (notification) {
        notification.isVisible = false;
        notification.dismissedAt = new Date();

        // 表示リストから削除
        const visibleIndex = state.visibleIds.indexOf(notificationId);
        if (visibleIndex > -1) {
          state.visibleIds.splice(visibleIndex, 1);
        }
      }
    },

    // 複数通知を非表示にする
    hideMultipleNotifications: (state, action: PayloadAction<string[]>) => {
      const notificationIds = action.payload;

      notificationIds.forEach(id => {
        const notification = state.entities.byId[id];
        if (notification) {
          notification.isVisible = false;
          notification.dismissedAt = new Date();

          const visibleIndex = state.visibleIds.indexOf(id);
          if (visibleIndex > -1) {
            state.visibleIds.splice(visibleIndex, 1);
          }
        }
      });
    },

    // 全通知を非表示にする
    hideAllNotifications: (state) => {
      state.visibleIds.forEach(id => {
        const notification = state.entities.byId[id];
        if (notification) {
          notification.isVisible = false;
          notification.dismissedAt = new Date();
        }
      });
      state.visibleIds = [];
    },

    // 通知削除
    removeNotification: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notification = state.entities.byId[notificationId];

      if (notification) {
        // エンティティから削除
        delete state.entities.byId[notificationId];

        const allIdIndex = state.entities.allIds.indexOf(notificationId);
        if (allIdIndex > -1) {
          state.entities.allIds.splice(allIdIndex, 1);
        }

        // カテゴリから削除
        const categoryIds = state.byCategory[notification.category];
        if (categoryIds) {
          const categoryIndex = categoryIds.indexOf(notificationId);
          if (categoryIndex > -1) {
            categoryIds.splice(categoryIndex, 1);
          }
        }

        // 未読リストから削除
        const unreadIndex = state.unreadIds.indexOf(notificationId);
        if (unreadIndex > -1) {
          state.unreadIds.splice(unreadIndex, 1);
        }

        // 表示リストから削除
        const visibleIndex = state.visibleIds.indexOf(notificationId);
        if (visibleIndex > -1) {
          state.visibleIds.splice(visibleIndex, 1);
        }
      }
    },

    // 古い通知のクリーンアップ
    cleanupOldNotifications: (state, action: PayloadAction<{
      olderThan: Date;
      keepUnread?: boolean;
    }>) => {
      const { olderThan, keepUnread = true } = action.payload;

      const toRemove: string[] = [];

      state.entities.allIds.forEach(id => {
        const notification = state.entities.byId[id];
        if (notification) {
          const timestamp = notification.timestamp instanceof Date ?
            notification.timestamp :
            new Date(notification.timestamp);

          const shouldRemove = timestamp < olderThan &&
            !(keepUnread && !notification.isRead);

          if (shouldRemove) {
            toRemove.push(id);
          }
        }
      });

      // 一括削除
      toRemove.forEach(id => {
        const notification = state.entities.byId[id];
        if (notification) {
          delete state.entities.byId[id];

          const allIdIndex = state.entities.allIds.indexOf(id);
          if (allIdIndex > -1) {
            state.entities.allIds.splice(allIdIndex, 1);
          }

          const categoryIds = state.byCategory[notification.category];
          if (categoryIds) {
            const categoryIndex = categoryIds.indexOf(id);
            if (categoryIndex > -1) {
              categoryIds.splice(categoryIndex, 1);
            }
          }

          const unreadIndex = state.unreadIds.indexOf(id);
          if (unreadIndex > -1) {
            state.unreadIds.splice(unreadIndex, 1);
          }

          const visibleIndex = state.visibleIds.indexOf(id);
          if (visibleIndex > -1) {
            state.visibleIds.splice(visibleIndex, 1);
          }
        }
      });
    },

    // 設定更新
    updateSettings: (state, action: PayloadAction<Partial<NotificationsSliceState['settings']>>) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
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

// 全通知セレクター
export const selectAllNotifications = createSelector(
  [(state: RootState) => state.notifications.entities.byId,
   (state: RootState) => state.notifications.entities.allIds],
  (notificationsById, allIds) => {
    return allIds.map(id => notificationsById[id]).filter(Boolean);
  }
);

// カテゴリ別通知セレクター
export const selectNotificationsByCategory = createSelector(
  [(state: RootState) => state.notifications.entities.byId,
   (state: RootState) => state.notifications.byCategory,
   (state: RootState, category: string) => category],
  (notificationsById, byCategory, category) => {
    const notificationIds = byCategory[category] || [];
    return notificationIds.map(id => notificationsById[id]).filter(Boolean);
  }
);

// 未読通知セレクター
export const selectUnreadNotifications = createSelector(
  [(state: RootState) => state.notifications.entities.byId,
   (state: RootState) => state.notifications.unreadIds],
  (notificationsById, unreadIds) => {
    return unreadIds.map(id => notificationsById[id]).filter(Boolean);
  }
);

// 表示中通知セレクター
export const selectVisibleNotifications = createSelector(
  [(state: RootState) => state.notifications.entities.byId,
   (state: RootState) => state.notifications.visibleIds],
  (notificationsById, visibleIds) => {
    return visibleIds.map(id => notificationsById[id]).filter(Boolean);
  }
);

// 未読数セレクター
export const selectUnreadCount = (state: RootState) => state.notifications.unreadIds.length;

// カテゴリ別未読数セレクター
export const selectUnreadCountByCategory = createSelector(
  [(state: RootState) => state.notifications.entities.byId,
   (state: RootState) => state.notifications.byCategory,
   (state: RootState) => state.notifications.unreadIds,
   (state: RootState, category: string) => category],
  (notificationsById, byCategory, unreadIds, category) => {
    const categoryIds = byCategory[category] || [];
    return categoryIds.filter(id => unreadIds.includes(id)).length;
  }
);

// 通知設定セレクター
export const selectNotificationSettings = (state: RootState) => state.notifications.settings;

export const { actions } = notificationsSlice;
export const {
  setNotifications,
  addNotification,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  hideNotification,
  hideMultipleNotifications,
  hideAllNotifications,
  removeNotification,
  cleanupOldNotifications,
  updateSettings,
  setError,
  clearError,
  setLoading,
} = actions;

export default notificationsSlice.reducer;