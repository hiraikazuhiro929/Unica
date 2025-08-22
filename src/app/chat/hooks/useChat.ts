import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChatChannel,
  ChatMessage,
  ChatUser,
  ChatAttachment,
  UnreadCount,
  subscribeToChannels,
  subscribeToMessages,
  subscribeToUsers,
  subscribeToUnreadCounts,
  sendMessage,
  updateMessage,
  deleteMessage,
  uploadChatFile,
  toggleReaction,
  upsertChatUser,
  updateUserStatus,
  updateUnreadCount,
  createChannel,
  searchMessages,
  searchChannelMessages,
} from '@/lib/firebase/chat';

interface UseChatOptions {
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  userEmail: string;
  enableRealtime?: boolean;
}

interface UseChatReturn {
  // State
  channels: ChatChannel[];
  messages: ChatMessage[];
  users: ChatUser[];
  unreadCounts: UnreadCount[];
  currentChannel: ChatChannel | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  selectChannel: (channelId: string) => void;
  sendNewMessage: (content: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  removeMessage: (messageId: string) => Promise<boolean>;
  uploadFile: (file: File) => Promise<ChatAttachment | null>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  updateStatus: (status: ChatUser['status'], statusMessage?: string) => Promise<boolean>;
  markAsRead: (channelId: string, lastMessageId?: string) => Promise<boolean>;
  createNewChannel: (channelData: Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>) => Promise<string | null>;
  searchAllMessages: (query: string) => Promise<ChatMessage[]>;
  searchCurrentChannel: (query: string) => Promise<ChatMessage[]>;
  
  // Utilities
  getUnreadCount: (channelId: string) => number;
  getOnlineUsers: () => ChatUser[];
  getCurrentUser: () => ChatUser | null;
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

  // State
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const unsubscribeChannels = useRef<(() => void) | null>(null);
  const unsubscribeMessages = useRef<(() => void) | null>(null);
  const unsubscribeUsers = useRef<(() => void) | null>(null);
  const unsubscribeUnreadCounts = useRef<(() => void) | null>(null);

  // Computed values
  const currentChannel = channels.find(ch => ch.id === selectedChannelId) || null;
  const currentUser = users.find(u => u.id === userId) || null;
  const onlineUsers = users.filter(u => u.isOnline);

  // Initialize user and subscriptions
  useEffect(() => {
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
          // チャンネル監視
          unsubscribeChannels.current = subscribeToChannels((channelsData) => {
            setChannels(channelsData);
            // 最初のチャンネルを自動選択
            if (channelsData.length > 0 && !selectedChannelId) {
              setSelectedChannelId(channelsData[0].id);
            }
          });

          // ユーザー監視
          unsubscribeUsers.current = subscribeToUsers(setUsers);

          // 未読数監視
          unsubscribeUnreadCounts.current = subscribeToUnreadCounts(userId, setUnreadCounts);
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
      
      // ユーザーをオフラインに
      updateUserStatus(userId, 'offline').catch(console.error);
    };
  }, [userId, userName, userEmail, userRole, userDepartment, enableRealtime, selectedChannelId]);

  // メッセージ監視（選択されたチャンネルが変更された時）
  useEffect(() => {
    if (!selectedChannelId || !enableRealtime) return;

    // 既存の監視を停止
    unsubscribeMessages.current?.();

    // 新しいチャンネルのメッセージを監視
    unsubscribeMessages.current = subscribeToMessages(
      selectedChannelId,
      setMessages,
      100 // 最大100件
    );

    // チャンネル変更時に未読をクリア
    updateUnreadCount(userId, selectedChannelId).catch(console.error);

    return () => {
      unsubscribeMessages.current?.();
    };
  }, [selectedChannelId, enableRealtime, userId]);

  // Actions
  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
  }, []);

  const sendNewMessage = useCallback(async (
    content: string,
    attachments?: ChatAttachment[]
  ): Promise<boolean> => {
    if (!selectedChannelId) return false;

    try {
      const result = await sendMessage({
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

  // Utilities
  const getUnreadCount = useCallback((channelId: string): number => {
    const unread = unreadCounts.find(uc => uc.channelId === channelId);
    return unread?.count || 0;
  }, [unreadCounts]);

  const getOnlineUsers = useCallback((): ChatUser[] => {
    return onlineUsers;
  }, [onlineUsers]);

  const getCurrentUser = useCallback((): ChatUser | null => {
    return currentUser;
  }, [currentUser]);

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

  return {
    // State
    channels,
    messages,
    users,
    unreadCounts,
    currentChannel,
    isLoading,
    error,
    
    // Actions
    selectChannel,
    sendNewMessage,
    editMessage,
    removeMessage,
    uploadFile,
    addReaction,
    updateStatus,
    markAsRead,
    createNewChannel,
    searchAllMessages,
    searchCurrentChannel,
    
    // Utilities
    getUnreadCount,
    getOnlineUsers,
    getCurrentUser,
  };
};