import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { MessageQueue } from '../services/MessageQueue';
import { FirebaseSyncManager } from '../managers/FirebaseSyncManager';
import { OptimisticUIManager } from '../managers/OptimisticUIManager';
import {
  selectChannel,
  selectThread,
  setMessageContent,
  addAttachment,
  removeAttachment,
  setReplyTo,
  clearMessageInput,
} from '../store/slices/uiSlice';
import {
  setCurrentUser,
  updateUserStatus,
  updateUserActivity,
} from '../store/slices/usersSlice';
import {
  selectMessagesByChannel,
  selectSendingMessages,
  selectFailedMessages,
} from '../store/slices/messagesSlice';
import {
  selectAllChannels,
  selectChannelById,
  selectUnreadCounts,
  selectTotalUnreadCount,
} from '../store/slices/channelsSlice';
import {
  selectCurrentUser,
  selectOnlineUsers,
  selectTypingUsersInChannel,
} from '../store/slices/usersSlice';
import {
  selectSelectedChannelId,
  selectSelectedThreadId,
  selectMessageInput,
  selectIsTyping,
} from '../store/slices/uiSlice';
import {
  selectUnreadNotifications,
  selectVisibleNotifications,
  selectUnreadCount,
} from '../store/slices/notificationsSlice';
import type { ChatAttachment, ChatUser } from '@/lib/firebase/chat';

// =============================================================================
// Chat V2 統合フック
// Redux + Firebase + 楽観的UI + MessageQueue の統合
// =============================================================================

interface UseChatV2Options {
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  userEmail: string;
  avatar?: string;
  autoConnect?: boolean;
}

interface UseChatV2Return {
  // === 接続・初期化 ===
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;

  // === チャンネル・UI状態 ===
  channels: ReturnType<typeof selectAllChannels>;
  selectedChannelId: string | null;
  selectedChannel: ReturnType<typeof selectChannelById>;
  unreadCounts: ReturnType<typeof selectUnreadCounts>;
  totalUnreadCount: number;

  // === メッセージ ===
  messages: ReturnType<typeof selectMessagesByChannel>;
  sendingMessages: ReturnType<typeof selectSendingMessages>;
  failedMessages: ReturnType<typeof selectFailedMessages>;

  // === ユーザー・プレゼンス ===
  currentUser: ReturnType<typeof selectCurrentUser>;
  onlineUsers: ReturnType<typeof selectOnlineUsers>;
  typingUsers: ReturnType<typeof selectTypingUsersInChannel>;

  // === メッセージ入力 ===
  messageInput: ReturnType<typeof selectMessageInput>;
  isTyping: boolean;

  // === 通知 ===
  unreadNotifications: ReturnType<typeof selectUnreadNotifications>;
  visibleNotifications: ReturnType<typeof selectVisibleNotifications>;
  unreadNotificationCount: number;

  // === アクション ===
  actions: {
    // チャンネル操作
    selectChannel: (channelId: string) => void;
    selectThread: (threadId: string | null) => void;

    // メッセージ操作
    sendMessage: (content: string, attachments?: ChatAttachment[]) => Promise<string>;
    retryMessage: (localId: string) => Promise<boolean>;
    removeFailedMessage: (localId: string) => void;

    // メッセージ入力
    updateMessageContent: (content: string) => void;
    addMessageAttachment: (attachment: ChatAttachment) => void;
    removeMessageAttachment: (attachmentId: string) => void;
    setMessageReplyTo: (message: any) => void;
    clearInput: () => void;

    // ユーザー操作
    updateStatus: (status: ChatUser['status'], statusMessage?: string) => Promise<void>;
    setTyping: (isTyping: boolean) => void;

    // 通知操作
    markNotificationAsRead: (notificationId: string) => void;
    markAllNotificationsAsRead: () => void;
  };

  // === 統計・デバッグ ===
  stats: {
    optimisticUI: ReturnType<OptimisticUIManager['getStats']>;
    messageQueue: ReturnType<MessageQueue['getStats']>;
    firebaseSync: ReturnType<FirebaseSyncManager['getStats']>;
  };
}

export const useChatV2 = (options: UseChatV2Options): UseChatV2Return => {
  const {
    userId,
    userName,
    userRole,
    userDepartment,
    userEmail,
    avatar,
    autoConnect = true,
  } = options;

  const dispatch = useAppDispatch();

  // Redux状態の取得
  const selectedChannelId = useAppSelector(selectSelectedChannelId);
  const selectedThreadId = useAppSelector(selectSelectedThreadId);
  const channels = useAppSelector(selectAllChannels);
  const selectedChannel = useAppSelector(state =>
    selectedChannelId ? selectChannelById(state, selectedChannelId) : null
  );
  const unreadCounts = useAppSelector(selectUnreadCounts);
  const totalUnreadCount = useAppSelector(selectTotalUnreadCount);

  const messages = useAppSelector(state =>
    selectedChannelId ? selectMessagesByChannel(state, selectedChannelId) : []
  );
  const sendingMessages = useAppSelector(selectSendingMessages);
  const failedMessages = useAppSelector(selectFailedMessages);

  const currentUser = useAppSelector(selectCurrentUser);
  const onlineUsers = useAppSelector(selectOnlineUsers);
  const typingUsers = useAppSelector(state =>
    selectedChannelId ? selectTypingUsersInChannel(state, selectedChannelId) : []
  );

  const messageInput = useAppSelector(selectMessageInput);
  const isTyping = useAppSelector(selectIsTyping);

  const unreadNotifications = useAppSelector(selectUnreadNotifications);
  const visibleNotifications = useAppSelector(selectVisibleNotifications);
  const unreadNotificationCount = useAppSelector(selectUnreadCount);

  // マネージャー参照
  const messageQueueRef = useRef<MessageQueue>();
  const firebaseSyncRef = useRef<FirebaseSyncManager>();
  const optimisticUIRef = useRef<OptimisticUIManager>();

  // 状態管理
  const isConnectedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  // タイピングタイマー
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // 初期化・接続管理
  // =============================================================================

  const connect = useCallback(async () => {
    if (isConnectedRef.current || isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      errorRef.current = null;

      // マネージャー初期化
      messageQueueRef.current = MessageQueue.getInstance();
      firebaseSyncRef.current = FirebaseSyncManager.getInstance();
      optimisticUIRef.current = OptimisticUIManager.getInstance();

      // 現在のユーザー設定
      dispatch(setCurrentUser(userId));

      // Firebase同期開始
      await firebaseSyncRef.current.startSync(userId);

      isConnectedRef.current = true;
      isLoadingRef.current = false;

      console.log('[useChatV2] Connected successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      errorRef.current = errorMessage;
      isLoadingRef.current = false;
      isConnectedRef.current = false;

      console.error('[useChatV2] Connection failed:', error);
    }
  }, [userId, dispatch]);

  const disconnect = useCallback(() => {
    if (!isConnectedRef.current) {
      return;
    }

    try {
      // Firebase同期停止
      firebaseSyncRef.current?.stopSync();

      // MessageQueue停止
      messageQueueRef.current?.destroy();

      // OptimisticUI クリーンアップ
      optimisticUIRef.current?.cleanupAllOperations();

      // タイピングタイマークリア
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      isConnectedRef.current = false;
      errorRef.current = null;

      console.log('[useChatV2] Disconnected');

    } catch (error) {
      console.error('[useChatV2] Disconnect error:', error);
    }
  }, []);

  // =============================================================================
  // チャンネル操作
  // =============================================================================

  const handleSelectChannel = useCallback((channelId: string) => {
    dispatch(selectChannel(channelId));

    // 新しいチャンネルのメッセージ同期開始
    firebaseSyncRef.current?.subscribeToChannelMessages(channelId);

    // 以前のチャンネルの楽観的操作をクリーンアップ
    if (selectedChannelId && selectedChannelId !== channelId) {
      optimisticUIRef.current?.cleanupChannelOperations(selectedChannelId);
      firebaseSyncRef.current?.unsubscribeChannelMessages(selectedChannelId);
    }
  }, [dispatch, selectedChannelId]);

  const handleSelectThread = useCallback((threadId: string | null) => {
    dispatch(selectThread(threadId));
  }, [dispatch]);

  // =============================================================================
  // メッセージ操作
  // =============================================================================

  const handleSendMessage = useCallback(async (
    content: string,
    attachments: ChatAttachment[] = []
  ): Promise<string> => {
    if (!selectedChannelId || !messageQueueRef.current) {
      throw new Error('Not connected or no channel selected');
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    try {
      const localId = await messageQueueRef.current.enqueueMessage({
        channelId: selectedChannelId,
        content: content.trim(),
        attachments,
        authorId: userId,
        authorName: userName,
        authorRole: userRole,
        priority: 'normal',
      });

      // 入力をクリア
      dispatch(clearMessageInput());

      return localId;

    } catch (error) {
      console.error('[useChatV2] Send message failed:', error);
      throw error;
    }
  }, [selectedChannelId, userId, userName, userRole, dispatch]);

  const handleRetryMessage = useCallback(async (localId: string): Promise<boolean> => {
    if (!messageQueueRef.current) {
      return false;
    }

    try {
      return await messageQueueRef.current.retryMessage(localId);
    } catch (error) {
      console.error('[useChatV2] Retry message failed:', error);
      return false;
    }
  }, []);

  const handleRemoveFailedMessage = useCallback((localId: string) => {
    messageQueueRef.current?.removeMessage(localId);
  }, []);

  // =============================================================================
  // メッセージ入力操作
  // =============================================================================

  const handleUpdateMessageContent = useCallback((content: string) => {
    dispatch(setMessageContent(content));

    // タイピング状態管理
    if (content.length > 0) {
      setTypingStatus(true);
    } else {
      setTypingStatus(false);
    }
  }, [dispatch]);

  const handleAddAttachment = useCallback((attachment: ChatAttachment) => {
    dispatch(addAttachment(attachment));
  }, [dispatch]);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    dispatch(removeAttachment(attachmentId));
  }, [dispatch]);

  const handleSetReplyTo = useCallback((message: any) => {
    dispatch(setReplyTo(message));
  }, [dispatch]);

  const handleClearInput = useCallback(() => {
    dispatch(clearMessageInput());
    setTypingStatus(false);
  }, [dispatch]);

  // =============================================================================
  // ユーザー操作
  // =============================================================================

  const handleUpdateStatus = useCallback(async (
    status: ChatUser['status'],
    statusMessage?: string
  ) => {
    try {
      dispatch(updateUserStatus({
        userId,
        status,
        statusMessage,
      }));

      // Firebaseにも反映（実装は既存のuseChat参照）
      // await updateUserStatus(userId, status, statusMessage);

    } catch (error) {
      console.error('[useChatV2] Update status failed:', error);
    }
  }, [userId, dispatch]);

  const setTypingStatus = useCallback((isTyping: boolean) => {
    if (!selectedChannelId) return;

    // タイピングタイマー管理
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      // 3秒後に自動でタイピング停止
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(false);
      }, 3000);
    }

    // Firebaseタイピング状態更新
    // await updateTypingStatus(userId, userName, selectedChannelId, isTyping);
  }, [selectedChannelId, userId, userName]);

  // =============================================================================
  // 通知操作
  // =============================================================================

  const handleMarkNotificationAsRead = useCallback((notificationId: string) => {
    // 実装予定
  }, []);

  const handleMarkAllNotificationsAsRead = useCallback(() => {
    // 実装予定
  }, []);

  // =============================================================================
  // エフェクト
  // =============================================================================

  // 自動接続
  useEffect(() => {
    if (autoConnect && userId && !isConnectedRef.current) {
      connect();
    }
  }, [autoConnect, userId, connect]);

  // ユーザーアクティビティ更新
  useEffect(() => {
    if (!isConnectedRef.current || !userId) return;

    const interval = setInterval(() => {
      dispatch(updateUserActivity({
        userId,
        lastActivity: new Date(),
      }));
    }, 60000); // 1分ごと

    return () => clearInterval(interval);
  }, [userId, dispatch]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // =============================================================================
  // 統計情報
  // =============================================================================

  const getStats = useCallback(() => {
    return {
      optimisticUI: optimisticUIRef.current?.getStats() || {},
      messageQueue: messageQueueRef.current?.getStats() || {},
      firebaseSync: firebaseSyncRef.current?.getStats() || {},
    };
  }, []);

  // =============================================================================
  // リターン値
  // =============================================================================

  return {
    // 接続・初期化
    isConnected: isConnectedRef.current,
    isLoading: isLoadingRef.current,
    error: errorRef.current,
    connect,
    disconnect,

    // チャンネル・UI状態
    channels,
    selectedChannelId,
    selectedChannel,
    unreadCounts,
    totalUnreadCount,

    // メッセージ
    messages,
    sendingMessages,
    failedMessages,

    // ユーザー・プレゼンス
    currentUser,
    onlineUsers,
    typingUsers,

    // メッセージ入力
    messageInput,
    isTyping,

    // 通知
    unreadNotifications,
    visibleNotifications,
    unreadNotificationCount,

    // アクション
    actions: {
      // チャンネル操作
      selectChannel: handleSelectChannel,
      selectThread: handleSelectThread,

      // メッセージ操作
      sendMessage: handleSendMessage,
      retryMessage: handleRetryMessage,
      removeFailedMessage: handleRemoveFailedMessage,

      // メッセージ入力
      updateMessageContent: handleUpdateMessageContent,
      addMessageAttachment: handleAddAttachment,
      removeMessageAttachment: handleRemoveAttachment,
      setMessageReplyTo: handleSetReplyTo,
      clearInput: handleClearInput,

      // ユーザー操作
      updateStatus: handleUpdateStatus,
      setTyping: setTypingStatus,

      // 通知操作
      markNotificationAsRead: handleMarkNotificationAsRead,
      markAllNotificationsAsRead: handleMarkAllNotificationsAsRead,
    },

    // 統計・デバッグ
    stats: getStats(),
  };
};