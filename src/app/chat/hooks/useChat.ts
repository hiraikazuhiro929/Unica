import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChatChannel,
  ChatMessage,
  ChatUser,
  ChatAttachment,
  UnreadCount,
  ChatNotification,
  TypingStatus,
  Thread,
  ChannelCategory,
  subscribeToChannels,
  subscribeToCategories,
  subscribeToMessages,
  subscribeToUsers,
  subscribeToUnreadCounts,
  subscribeToNotifications,
  subscribeToTypingStatus,
  subscribeToThreadMessages,
  sendMessage,
  sendThreadMessage,
  updateMessage,
  deleteMessage,
  uploadChatFile,
  toggleReaction,
  upsertChatUser,
  updateUserStatus,
  updateUserActivity,
  updateUnreadCount,
  updateTypingStatus,
  createChannel,
  updateChannel,
  deleteChannel,
  createCategory,
  updateCategory,
  deleteCategory,
  searchMessages,
  searchChannelMessages,
  searchMessagesByDate,
  searchMessagesByUser,
  markNotificationAsRead,
  createThread,
} from '@/lib/firebase/chat';
import { sanitizeMessageContent, detectXssAttempt } from '@/lib/utils/sanitization';

interface UseChatOptions {
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  userEmail: string;
  avatar?: string;
  enableRealtime?: boolean;
}

interface UseChatReturn {
  // State
  channels: ChatChannel[];
  messages: ChatMessage[];
  users: ChatUser[];
  unreadCounts: UnreadCount[];
  notifications: ChatNotification[];
  typingUsers: TypingStatus[];
  threadMessages: ChatMessage[];
  currentChannel: ChatChannel | null;
  currentThread: Thread | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  selectChannel: (channelId: string) => void;
  selectThread: (threadId: string) => void;
  sendNewMessage: (content: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  sendReply: (threadId: string, content: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  removeMessage: (messageId: string) => Promise<boolean>;
  uploadFile: (file: File) => Promise<ChatAttachment | null>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  updateStatus: (status: ChatUser['status'], statusMessage?: string) => Promise<boolean>;
  setTyping: (isTyping: boolean) => void;
  markAsRead: (channelId: string, lastMessageId?: string) => Promise<boolean>;
  markNotificationRead: (notificationId: string) => Promise<boolean>;
  createNewChannel: (channelData: Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>) => Promise<string | null>;
  editChannel: (channelId: string, updateData: Partial<ChatChannel>) => Promise<boolean>;
  removeChannel: (channelId: string) => Promise<boolean>;
  createNewThread: (parentMessageId: string, channelId: string) => Promise<string | null>;
  searchAllMessages: (query: string) => Promise<ChatMessage[]>;
  searchCurrentChannel: (query: string) => Promise<ChatMessage[]>;
  searchByDate: (startDate: Date, endDate: Date) => Promise<ChatMessage[]>;
  searchByUser: (userId: string) => Promise<ChatMessage[]>;
  
  // Utilities
  getUnreadCount: (channelId?: string) => number;
  getOnlineUsers: () => ChatUser[];
  getCurrentUser: () => ChatUser | null;
  getUnreadNotificationCount: () => number;

  // Sending state
  isSending: boolean;
}

export const useChat = (options: UseChatOptions): UseChatReturn => {
  const {
    userId,
    userName,
    userRole,
    userDepartment,
    userEmail,
    enableRealtime = true,
  } = options;

  // パラメータの検証 - userIdが無効な場合は早期リターン
  const isValidUserId = userId && typeof userId === 'string' && userId.trim() !== '';

  if (!isValidUserId) {
    // userIdが無効な場合は、何もしないダミーオブジェクトを返す
    return {
      // State
      channels: [],
      messages: [],
      users: [],
      unreadCounts: [],
      notifications: [],
      typingUsers: [],
      threadMessages: [],
      currentChannel: null,
      currentThread: null,
      isLoading: false,
      error: null,

      // Actions
      selectChannel: () => {},
      selectThread: () => {},
      sendNewMessage: async () => false,
      sendReply: async () => false,
      editMessage: async () => false,
      removeMessage: async () => false,
      uploadFile: async () => null,
      addReaction: async () => false,
      updateStatus: async () => false,
      setTyping: () => {},
      markAsRead: async () => false,
      markNotificationRead: async () => false,
      createNewChannel: async () => null,
      editChannel: async () => false,
      removeChannel: async () => false,
      createNewThread: async () => null,
      searchAllMessages: async () => [],
      searchCurrentChannel: async () => [],
      searchByDate: async () => [],
      searchByUser: async () => [],

      // Utilities
      getUnreadCount: () => 0,
      getOnlineUsers: () => [],
      getCurrentUser: () => null,
      getUnreadNotificationCount: () => 0,
    } as UseChatReturn;
  }

  // Core State（必要最小限に簡素化）
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);

  // UI State（シンプル化）
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 送信中メッセージのID追跡（シンプルなフィードバック用）
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());

  // Refs for cleanup
  const unsubscribeChannels = useRef<(() => void) | null>(null);
  const unsubscribeMessages = useRef<(() => void) | null>(null);
  const unsubscribeUsers = useRef<(() => void) | null>(null);
  const unsubscribeUnreadCounts = useRef<(() => void) | null>(null);
  const unsubscribeNotifications = useRef<(() => void) | null>(null);
  const unsubscribeTypingStatus = useRef<(() => void) | null>(null);
  const unsubscribeThreadMessages = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const currentChannel = channels.find(ch => ch.id === selectedChannelId) || null;
  const currentThread = null; // スレッド機能は後で実装
  const currentUser = users.find(u => u.id === userId) || null;
  const onlineUsers = users.filter(u => u.isOnline);
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  // Initialize user and subscriptions
  useEffect(() => {
    // 無効なuserIdの場合は初期化をスキップ
    if (!isValidUserId) {
      setIsLoading(false);
      return;
    }

    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // ユーザー情報を作成/更新
        await upsertChatUser({
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole,
          department: userDepartment,
          status: 'online',
        });

        if (enableRealtime) {
          // チャンネル監視（簡素化）
          unsubscribeChannels.current = subscribeToChannels((channelsData) => {
            setChannels(channelsData);
            // 最初のチャンネルを自動選択
            if (channelsData.length > 0 && !selectedChannelId) {
              setSelectedChannelId(channelsData[0].id);
            }
          });

          // その他の監視設定
          unsubscribeUsers.current = subscribeToUsers(setUsers);
          unsubscribeUnreadCounts.current = subscribeToUnreadCounts(userId, setUnreadCounts);
          unsubscribeNotifications.current = subscribeToNotifications(userId, setNotifications);
        }

        setIsLoading(false);
      } catch (err: unknown) {
        console.error('Chat initialization error:', err);
        setError(err instanceof Error ? err.message : 'Chat initialization failed');
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup
    return () => {
      unsubscribeChannels.current?.();
      unsubscribeMessages.current?.();
      unsubscribeUsers.current?.();
      unsubscribeUnreadCounts.current?.();
      unsubscribeNotifications.current?.();
      unsubscribeTypingStatus.current?.();
      unsubscribeThreadMessages.current?.();

      // タイピング状態をクリア
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 送信中メッセージをクリア
      setSendingMessages(new Set());

      // ユーザーをオフラインに
      if (userId) {
        updateUserStatus(userId, 'offline').catch(console.error);
      }
    };
  }, [isValidUserId, userId, userName, userEmail, userRole, userDepartment, enableRealtime]);

  // メッセージ監視（選択されたチャンネルが変更された時）
  useEffect(() => {
    console.log('🔄 [useChat] useEffect実行:', {
      チャンネル: selectedChannelId,
      リアルタイム: enableRealtime,
      条件チェック: !selectedChannelId || !enableRealtime ? 'スキップ' : '実行',
    });

    if (!selectedChannelId || !enableRealtime) {
      console.warn('⚠️ [useChat] メッセージ監視がスキップされました');
      return;
    }

    // 既存の監視を停止
    unsubscribeMessages.current?.();
    unsubscribeTypingStatus.current?.();

    // チャンネル変更時に送信中メッセージをクリア
    setSendingMessages(new Set());

    console.log('🔌 [useChat] メッセージ監視を開始します:', {
      チャンネル: selectedChannelId,
      リアルタイム有効: enableRealtime,
    });

    // 新しいチャンネルのメッセージを監視（シンプルな実装）
    unsubscribeMessages.current = subscribeToMessages(
      selectedChannelId,
      (newMessages) => {
        console.log('🔔 受信:', newMessages.length, '件');

        // ソート前の最後5件を記録
        const beforeSort = newMessages.slice(-5).map(m => ({
          内容: m.content.substring(0, 10),
          時刻: m.timestamp instanceof Date ? m.timestamp.toLocaleTimeString('ja-JP') : 'Invalid',
          ミリ秒: m.timestamp instanceof Date ? m.timestamp.getTime() : 0,
        }));

        const sorted = newMessages.sort((a, b) => {
          // 時系列順にソート（古い → 新しい、下からプッシュ表示用）
          const getTime = (msg: ChatMessage) => {
            if (!msg.timestamp) return 0;
            if (typeof msg.timestamp === 'object' && 'toDate' in msg.timestamp) {
              return (msg.timestamp as any).toDate().getTime();
            }
            if (msg.timestamp instanceof Date) {
              return msg.timestamp.getTime();
            }
            return new Date(msg.timestamp).getTime();
          };
          return getTime(a) - getTime(b);
        });

        // ソート後の最後5件を記録
        const afterSort = sorted.slice(-5).map(m => ({
          内容: m.content.substring(0, 10),
          時刻: m.timestamp instanceof Date ? m.timestamp.toLocaleTimeString('ja-JP') : 'Invalid',
        }));

        console.log('📊 ソート前:', beforeSort);
        console.log('📊 ソート後:', afterSort);

        setMessages(sorted);
      },
      50
    );

    console.log('✅ [useChat] メッセージ監視設定完了');

    // タイピング状態を監視
    unsubscribeTypingStatus.current = subscribeToTypingStatus(
      selectedChannelId,
      (typingList) => {
        // 自分のタイピング状態を除外
        const filteredTyping = typingList.filter(t => t.userId !== userId);
        setTypingUsers(filteredTyping);
      }
    );

    // チャンネル変更時に未読をクリア
    updateUnreadCount(userId, selectedChannelId).catch(console.error);

    return () => {
      unsubscribeMessages.current?.();
      unsubscribeTypingStatus.current?.();
    };
  }, [selectedChannelId, enableRealtime, userId]);
  
  // スレッドメッセージ監視（選択されたスレッドが変更された時）
  useEffect(() => {
    if (!selectedThreadId || !enableRealtime) return;

    // 既存の監視を停止
    unsubscribeThreadMessages.current?.();

    // 新しいスレッドのメッセージを監視
    unsubscribeThreadMessages.current = subscribeToThreadMessages(
      selectedThreadId,
      setThreadMessages,
      50 // 最大50件
    );

    return () => {
      unsubscribeThreadMessages.current?.();
    };
  }, [selectedThreadId, enableRealtime]);
  
  // ユーザーアクティビティ更新（1分ごと）
  useEffect(() => {
    // 無効なuserIdの場合はアクティビティ更新をスキップ
    if (!isValidUserId) return;

    const interval = setInterval(() => {
      updateUserActivity(userId).catch(console.error);
    }, 60000); // 1分ごと

    return () => clearInterval(interval);
  }, [isValidUserId, userId]);

  // Actions
  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedThreadId(null); // チャンネル変更時はスレッドを閉じる
  }, []);
  
  const selectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
  }, []);
  
  const sendReply = useCallback(async (
    threadId: string,
    content: string,
    attachments?: ChatAttachment[]
  ): Promise<boolean> => {
    if (!selectedChannelId) return false;

    try {
      const result = await sendThreadMessage(threadId, {
        channelId: selectedChannelId,
        content,
        authorId: userId,
        authorName: userName,
        authorRole: userRole,
        type: 'message',
        priority: 'normal',
        attachments: attachments || [],
        reactions: [],
      });

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [selectedChannelId, userId, userName, userRole]);

  const sendNewMessage = useCallback(async (
    content: string,
    attachments?: ChatAttachment[]
  ): Promise<boolean> => {
    if (!selectedChannelId) return false;

    // コンテンツをサニタイズ（XSS対策）
    const sanitizedContent = sanitizeMessageContent(content);

    // XSS攻撃を検知した場合は送信を拒否
    if (detectXssAttempt(content)) {
      setError('メッセージに不正なコンテンツが含まれています。');
      return false;
    }

    // 空のメッセージは送信しない
    if (!sanitizedContent.trim()) {
      return false;
    }

    // 送信中状態の管理（シンプルなフィードバック）
    const sendingId = `${selectedChannelId}_${Date.now()}`;
    setSendingMessages(prev => new Set(prev).add(sendingId));

    try {
      const result = await sendMessage({
        channelId: selectedChannelId,
        content: sanitizedContent,
        authorId: userId,
        authorName: userName,
        authorRole: userRole,
        type: 'message',
        priority: 'normal',
        attachments: attachments || [],
        reactions: [],
      });

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      // 送信中状態を解除
      setSendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(sendingId);
        return newSet;
      });
    }
  }, [selectedChannelId, userId, userName, userRole]);

  const editMessage = useCallback(async (
    messageId: string,
    content: string
  ): Promise<boolean> => {
    try {
      const result = await updateMessage(messageId, content);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const removeMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const result = await deleteMessage(messageId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<ChatAttachment | null> => {
    if (!selectedChannelId) return null;

    try {
      const result = await uploadChatFile(file, userId, selectedChannelId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.attachment;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [selectedChannelId, userId]);

  const addReaction = useCallback(async (
    messageId: string,
    emoji: string
  ): Promise<boolean> => {
    try {
      const result = await toggleReaction(messageId, emoji, userId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [userId]);

  const updateStatus = useCallback(async (
    status: ChatUser['status'],
    statusMessage?: string
  ): Promise<boolean> => {
    try {
      if (!userId) {
        console.warn('Cannot update status: userId is undefined');
        return false;
      }
      
      const result = await updateUserStatus(userId, status, statusMessage);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [userId]);

  const markAsRead = useCallback(async (
    channelId: string,
    lastMessageId?: string
  ): Promise<boolean> => {
    try {
      const result = await updateUnreadCount(userId, channelId, lastMessageId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [userId]);
  
  const markNotificationRead = useCallback(async (
    notificationId: string
  ): Promise<boolean> => {
    try {
      const result = await markNotificationAsRead(notificationId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);
  
  const setTyping = useCallback((isTyping: boolean) => {
    if (!selectedChannelId) return;
    
    updateTypingStatus(userId, userName, selectedChannelId, isTyping)
      .catch(console.error);
    
    // タイピング状態を3秒後に自動でクリア
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(userId, userName, selectedChannelId, false)
          .catch(console.error);
      }, 3000);
    }
  }, [selectedChannelId, userId, userName]);

  const createNewChannel = useCallback(async (
    channelData: Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>
  ): Promise<string | null> => {
    try {
      const result = await createChannel(channelData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.id;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);
  
  const editChannel = useCallback(async (
    channelId: string,
    updateData: Partial<ChatChannel>
  ): Promise<boolean> => {
    try {
      const result = await updateChannel(channelId, updateData);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);
  
  const removeChannel = useCallback(async (
    channelId: string
  ): Promise<boolean> => {
    try {
      const result = await deleteChannel(channelId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);
  
  const createNewThread = useCallback(async (
    parentMessageId: string,
    channelId: string
  ): Promise<string | null> => {
    try {
      const result = await createThread(parentMessageId, channelId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.id;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // Utilities
  const getUnreadCount = useCallback((channelId?: string): number => {
    if (!isValidUserId) return 0;
    
    // channelIdが指定されていない場合は全体の未読数を返す
    if (!channelId) {
      return unreadCounts.reduce((total, unread) => total + unread.count, 0);
    }
    
    const unread = unreadCounts.find(uc => uc.channelId === channelId);
    return unread?.count || 0;
  }, [isValidUserId, unreadCounts]);

  const getOnlineUsers = useCallback((): ChatUser[] => {
    return onlineUsers;
  }, [onlineUsers]);

  const getCurrentUser = useCallback((): ChatUser | null => {
    return currentUser;
  }, [currentUser]);
  
  const getUnreadNotificationCount = useCallback((): number => {
    return unreadNotificationCount;
  }, [unreadNotificationCount]);

  const searchAllMessages = useCallback(async (query: string): Promise<ChatMessage[]> => {
    if (!query.trim()) return [];

    try {
      const channelIds = channels.map(ch => ch.id);
      const result = await searchMessages(channelIds, query, 100);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [channels]);

  const searchCurrentChannel = useCallback(async (query: string): Promise<ChatMessage[]> => {
    if (!query.trim() || !selectedChannelId) return [];

    try {
      const result = await searchChannelMessages(selectedChannelId, query, 100);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [selectedChannelId]);
  
  const searchByDate = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<ChatMessage[]> => {
    try {
      const channelIds = channels.map(ch => ch.id);
      const result = await searchMessagesByDate(channelIds, startDate, endDate, 100);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [channels]);
  
  const searchByUser = useCallback(async (authorId: string): Promise<ChatMessage[]> => {
    try {
      const channelIds = channels.map(ch => ch.id);
      const result = await searchMessagesByUser(channelIds, authorId, 100);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [channels]);

  return {
    // State
    channels,
    messages,
    users,
    unreadCounts,
    notifications,
    typingUsers,
    threadMessages,
    currentChannel,
    currentThread,
    isLoading,
    error,
    
    // Actions
    selectChannel,
    selectThread,
    sendNewMessage,
    sendReply,
    editMessage,
    removeMessage,
    uploadFile,
    addReaction,
    updateStatus,
    setTyping,
    markAsRead,
    markNotificationRead,
    createNewChannel,
    editChannel,
    removeChannel,
    createNewThread,
    searchAllMessages,
    searchCurrentChannel,
    searchByDate,
    searchByUser,
    
    // Utilities
    getUnreadCount,
    getOnlineUsers,
    getCurrentUser,
    getUnreadNotificationCount,

    // Sending state
    isSending: sendingMessages.size > 0,
  };
};