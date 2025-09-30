import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { UIState } from '../types';
import type { ChatMessage, ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// 初期状態
// =============================================================================

const initialState: UIState = {
  selectedChannelId: null,
  selectedThreadId: null,

  sidebar: {
    isCollapsed: false,
    activeTab: 'channels',
  },

  messageInput: {
    content: '',
    attachments: [],
    replyTo: null,
    mentions: [],
  },

  search: {
    query: '',
    filters: {
      channels: [],
      users: [],
      dateRange: null,
    },
    results: {
      messages: [],
      loading: false,
    },
  },

  notifications: {
    sound: true,
    desktop: true,
    mentions: true,
  },
};

// =============================================================================
// Slice定義
// =============================================================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // チャンネル選択
    selectChannel: (state, action: PayloadAction<string | null>) => {
      state.selectedChannelId = action.payload;
      // チャンネル変更時にスレッドをクリア
      state.selectedThreadId = null;
      // メッセージ入力状態もクリア
      state.messageInput.content = '';
      state.messageInput.attachments = [];
      state.messageInput.replyTo = null;
      state.messageInput.mentions = [];
    },

    // スレッド選択
    selectThread: (state, action: PayloadAction<string | null>) => {
      state.selectedThreadId = action.payload;
      // スレッド変更時にメッセージ入力状態をクリア
      state.messageInput.content = '';
      state.messageInput.attachments = [];
      state.messageInput.replyTo = null;
      state.messageInput.mentions = [];
    },

    // サイドバー制御
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isCollapsed = action.payload;
    },

    setSidebarActiveTab: (state, action: PayloadAction<UIState['sidebar']['activeTab']>) => {
      state.sidebar.activeTab = action.payload;
    },

    // メッセージ入力状態管理
    setMessageContent: (state, action: PayloadAction<string>) => {
      state.messageInput.content = action.payload;
    },

    addAttachment: (state, action: PayloadAction<ChatAttachment>) => {
      const attachment = action.payload;
      // 重複チェック
      const exists = state.messageInput.attachments.some(att => att.id === attachment.id);
      if (!exists) {
        state.messageInput.attachments.push(attachment);
      }
    },

    removeAttachment: (state, action: PayloadAction<string>) => {
      const attachmentId = action.payload;
      state.messageInput.attachments = state.messageInput.attachments
        .filter(att => att.id !== attachmentId);
    },

    setReplyTo: (state, action: PayloadAction<ChatMessage | null>) => {
      state.messageInput.replyTo = action.payload;
    },

    addMention: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      if (!state.messageInput.mentions.includes(userId)) {
        state.messageInput.mentions.push(userId);
      }
    },

    removeMention: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      state.messageInput.mentions = state.messageInput.mentions
        .filter(id => id !== userId);
    },

    clearMessageInput: (state) => {
      state.messageInput.content = '';
      state.messageInput.attachments = [];
      state.messageInput.replyTo = null;
      state.messageInput.mentions = [];
    },

    // 検索状態管理
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
      // クエリ変更時に結果をクリア
      state.search.results.messages = [];
    },

    setSearchFilters: (state, action: PayloadAction<Partial<UIState['search']['filters']>>) => {
      state.search.filters = {
        ...state.search.filters,
        ...action.payload,
      };
      // フィルター変更時に結果をクリア
      state.search.results.messages = [];
    },

    setSearchResults: (state, action: PayloadAction<{
      messages: string[];
      loading: boolean;
    }>) => {
      state.search.results = action.payload;
    },

    clearSearch: (state) => {
      state.search.query = '';
      state.search.filters = {
        channels: [],
        users: [],
        dateRange: null,
      };
      state.search.results = {
        messages: [],
        loading: false,
      };
    },

    // 通知設定
    updateNotificationSettings: (state, action: PayloadAction<Partial<UIState['notifications']>>) => {
      state.notifications = {
        ...state.notifications,
        ...action.payload,
      };
    },

    // 状態リセット（ログアウト時など）
    resetUIState: () => initialState,
  },
});

// =============================================================================
// Selectors
// =============================================================================

// 選択されたチャンネルID
export const selectSelectedChannelId = (state: RootState) => state.ui.selectedChannelId;

// 選択されたスレッドID
export const selectSelectedThreadId = (state: RootState) => state.ui.selectedThreadId;

// サイドバー状態
export const selectSidebarState = (state: RootState) => state.ui.sidebar;

// メッセージ入力状態
export const selectMessageInput = (state: RootState) => state.ui.messageInput;

// 検索状態
export const selectSearchState = (state: RootState) => state.ui.search;

// 通知設定
export const selectNotificationSettings = (state: RootState) => state.ui.notifications;

// メッセージ入力中かどうか
export const selectIsTyping = (state: RootState) => {
  return state.ui.messageInput.content.length > 0;
};

// 添付ファイルがあるかどうか
export const selectHasAttachments = (state: RootState) => {
  return state.ui.messageInput.attachments.length > 0;
};

// 返信メッセージがあるかどうか
export const selectHasReply = (state: RootState) => {
  return state.ui.messageInput.replyTo !== null;
};

// 検索中かどうか
export const selectIsSearching = (state: RootState) => {
  return state.ui.search.query.length > 0 || state.ui.search.results.loading;
};

export const { actions } = uiSlice;
export const {
  selectChannel,
  selectThread,
  setSidebarCollapsed,
  setSidebarActiveTab,
  setMessageContent,
  addAttachment,
  removeAttachment,
  setReplyTo,
  addMention,
  removeMention,
  clearMessageInput,
  setSearchQuery,
  setSearchFilters,
  setSearchResults,
  clearSearch,
  updateNotificationSettings,
  resetUIState,
} = actions;

export default uiSlice.reducer;