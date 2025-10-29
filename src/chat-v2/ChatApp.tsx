/**
 * ChatApp - New Chat System v2 Main Component
 * 新しいチャットシステムのメインコンポーネント
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './store';
import {
  setCurrentChannel,
  setMessages,
  setChannels,
  setCurrentUser,
  setUsers,
} from './store/chatSlice';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChatMessage,
  ChatChannel,
  MessageFormData,
  ChannelId,
  CategoryId,
  ChannelCategory,
  MessageId,
  createChannelId,
  createMessageId,
  createUserId,
  createCategoryId,
} from './types';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ChannelList } from './components/ChannelList';
import { UserProfileModal } from './components/UserProfileModal';
import { TypingIndicator } from './components/TypingIndicator';
import { MemberPanel } from './components/MemberPanel';
import { ThreadPanel } from './components/ThreadPanel';
import { ChannelSettingsModal } from './components/ChannelSettingsModal';
import { CategorySettingsModal } from './components/CategorySettingsModal';
import { ChannelCreateModal } from './components/ChannelCreateModal';
import { CategoryCreateModal } from './components/CategoryCreateModal';
import chatService from './services/chatService';
import UnifiedTimestamp from './core/UnifiedTimestamp';
import { Loader2, AlertCircle, Settings, Users, Search, MessageCircle, Hash } from 'lucide-react';
import type { ChatUser } from '@/lib/firebase/chat';
import { DMList } from './components/DMList';
import dmService from './services/dmService';
import type { DirectMessageChannel, DirectMessageId } from './types';
import { UserSelectModal } from './components/UserSelectModal';

// メイン チャットコンポーネント
const ChatMain: React.FC = () => {
  const dispatch = useAppDispatch();
  const authUser = useAuth(); // 認証済みユーザー情報を取得
  const {
    channels,
    currentChannelId,
    messages,
    users,
    currentUser,
    unreadCounts,
    typingUsers,
    loading,
    error,
  } = useAppSelector((state) => state.chat);

  // デバッグ: Reduxから取得したchannelsを確認
  useEffect(() => {
    // Debug logging removed for production
  }, [channels]);

  const [initialized, setInitialized] = useState(false);

  // UserProfileModal用のstate
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // MemberPanel用のstate
  const [showMemberPanel, setShowMemberPanel] = useState(false);

  // ChannelSettingsModal用のstate
  const [showChannelSettings, setShowChannelSettings] = useState(false);

  // CategorySettingsModal用のstate
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory | null>(null);
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  // ChannelCreateModal用のstate
  const [showChannelCreate, setShowChannelCreate] = useState(false);
  const [channelCreateCategoryId, setChannelCreateCategoryId] = useState<CategoryId | null>(null);

  // CategoryCreateModal用のstate
  const [showCategoryCreate, setShowCategoryCreate] = useState(false);

  // 検索用のstate
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 編集用のstate
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // スレッド用のstate
  const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);

  // ピン留め用のstate
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  // 通知用のstate
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // カテゴリ用のstate
  const [categories, setCategories] = useState<ChannelCategory[]>([]);

  // DM関連のstate
  const [activeTab, setActiveTab] = useState<'channels' | 'dms'>('channels');
  const [dms, setDms] = useState<DirectMessageChannel[]>([]);
  const [activeDM, setActiveDM] = useState<DirectMessageChannel | null>(null);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);
  const [dmMessages, setDmMessages] = useState<Record<string, ChatMessage[]>>({});
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);

  // 現在のチャンネルのメッセージ
  const currentMessages = currentChannelId ? messages[currentChannelId] || [] : [];

  // 現在のチャンネルのタイピングユーザー
  const currentTypingUsers = currentChannelId ? typingUsers[currentChannelId] || [] : [];

  // 初期化
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // 認証済みユーザーがいない場合は初期化しない
        if (!authUser.user) {
          return;
        }

        // 既存の初期化機能をインポート
        const { initializeChatData } = await import('@/lib/firebase/initChatData');

        // チャットデータの初期化（チャンネルとユーザーがない場合は作成）
        const initResult = await initializeChatData();
        if (!initResult.success) {
          console.error('Failed to initialize chat data:', initResult.error);
        }

        // 初期化後、もう一度チャンネルを確認
        const { checkChannelsExist } = await import('@/lib/firebase/initChatData');
        const hasChannels = await checkChannelsExist();

        if (!hasChannels) {
          const { forceRecreateChannels } = await import('@/lib/firebase/initChatData');
          await forceRecreateChannels();
        }

        // 認証システムからユーザー情報を取得
        const currentAppUser = {
          id: createUserId(authUser.user.uid),
          name: authUser.user.name || 'Unknown User',
          email: authUser.user.email || '',
          role: authUser.user.role || 'worker',
          department: authUser.user.department || 'その他',
          avatar: authUser.user.photoURL,
        };

        // ユーザー情報をFirebaseに登録
        await chatService.upsertUser(currentAppUser);
        dispatch(setCurrentUser({
          ...currentAppUser,
          isOnline: true,
          lastSeen: UnifiedTimestamp.now().toTimestamp(),
          status: 'online',
        }));

        // 通知権限をリクエスト
        const permission = await chatService.requestNotificationPermission();
        setNotificationPermission(permission);

        // 1. カテゴリを先に取得
        const categoriesResult = await chatService.getCategories();
        if (categoriesResult.error) {
          console.error('❌ [ChatApp 初期化] カテゴリ取得エラー:', categoriesResult.error);
        } else {
          setCategories(categoriesResult.data);
        }

        // 2. カテゴリがある場合のみチャンネルを取得
        if (categoriesResult.data && categoriesResult.data.length > 0) {
          const channelsResult = await chatService.getChannels(currentAppUser.id);
          if (channelsResult.error) {
            console.error('❌ [ChatApp 初期化] チャンネル取得エラー:', channelsResult.error);
          } else {
            dispatch(setChannels(channelsResult.data));

            // 最初のチャンネルを選択（カテゴリ順にソート済み）
            if (channelsResult.data.length > 0) {
              dispatch(setCurrentChannel(channelsResult.data[0].id));
            }
          }
        }

        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    if (authUser.user && !authUser.loading) {
      initializeChat();
    }
  }, [dispatch, authUser.user, authUser.loading]);

  // リアルタイム監視のセットアップ
  useEffect(() => {
    if (!initialized) return;

    const unsubscribes: (() => void)[] = [];

    // チャンネル監視
    const unsubscribeChannels = chatService.subscribeToChannels((channels) => {
      dispatch(setChannels(channels));
    });
    unsubscribes.push(unsubscribeChannels);

    // ユーザー監視
    const unsubscribeUsers = chatService.subscribeToUsers((users) => {
      dispatch(setUsers(users));
    });
    unsubscribes.push(unsubscribeUsers);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [initialized, dispatch]);

  // 現在のチャンネルのメッセージ監視
  useEffect(() => {
    if (!currentChannelId || !currentUser) return;

    // 前回のメッセージ数を保持（新規メッセージ検出用）
    let previousMessageCount = 0;

    const unsubscribe = chatService.subscribeToMessages(
      currentChannelId,
      async (messages) => {
        dispatch(setMessages({ channelId: currentChannelId, messages }));

        // 新しいメッセージがあるかチェック
        if (messages.length > previousMessageCount) {
          const newMessages = messages.slice(previousMessageCount);

          // 新しいメッセージごとに通知を作成
          for (const message of newMessages) {
            // 自分のメッセージは通知しない
            if (message.authorId === currentUser.id) continue;

            // 現在フォーカス中のチャンネルは通知しない
            if (document.hasFocus() && currentChannelId === message.channelId) continue;

            // 既存の通知システムに追加
            try {
              const { createNotification } = await import('@/lib/firebase/notifications');
              await createNotification({
                type: 'chat',
                title: `${message.authorName}さんからメッセージ`,
                message: message.content,
                priority: message.mentions?.includes(currentUser.id) ? 'high' : 'normal',
                recipientId: currentUser.id,
                senderId: message.authorId,
                senderName: message.authorName,
                relatedEntityType: 'process', // チャット用の適切な型がないため暫定
                relatedEntityId: message.channelId,
                actionUrl: `/chat?channel=${message.channelId}`,
              });
            } catch (error) {
              console.error('Failed to create chat notification:', error);
            }
          }
        }

        previousMessageCount = messages.length;
      }
    );

    return unsubscribe;
  }, [currentChannelId, currentUser, dispatch]);

  // 現在のチャンネルのタイピング状態監視
  useEffect(() => {
    if (!currentChannelId) return;

    const unsubscribe = chatService.subscribeToTypingStatus(
      currentChannelId,
      () => {
        // 自分以外のタイピングユーザーのみ表示
        // Redux storeを更新（実装は省略）
      }
    );

    return unsubscribe;
  }, [currentChannelId, currentUser?.id]);

  // チャンネル選択
  const handleChannelSelect = useCallback((channelId: ChannelId) => {
    dispatch(setCurrentChannel(channelId));
    setActiveDM(null); // DMをクリア
  }, [dispatch]);

  // DM選択ハンドラ
  const handleSelectDM = useCallback((dm: DirectMessageChannel) => {
    setActiveDM(dm);
    // @ts-expect-error - setCurrentChannel accepts null to clear selection
    dispatch(setCurrentChannel(null)); // チャンネル選択をクリア

    // 既読マーク
    if (currentUser && dm.lastMessage && !dm.lastMessage.isRead && dm.lastMessage.senderId !== currentUser.id) {
      dmService.markDMAsRead(dm.id, currentUser.id);
    }
  }, [currentUser, dispatch]);

  // 新規DM開始ハンドラ
  const handleNewDM = useCallback(() => {
    setShowUserSelectModal(true);
  }, []);

  // ユーザー選択時のDM開始
  const handleUserSelect = useCallback(async (userId: string) => {
    if (!currentUser) return;

    const result = await dmService.getOrCreateDM(currentUser.id, createUserId(userId));
    if (result.data) {
      setActiveTab('dms');
      setActiveDM(result.data);
      // @ts-expect-error - setCurrentChannel accepts null to clear selection
      dispatch(setCurrentChannel(null));
    }
  }, [currentUser, dispatch]);

  // UserProfileModalからDM開始
  const handleDirectMessage = useCallback(async (userId: string) => {
    if (!currentUser) return;

    const result = await dmService.getOrCreateDM(currentUser.id, createUserId(userId));
    if (result.data) {
      setActiveTab('dms');
      setActiveDM(result.data);
      // @ts-expect-error - setCurrentChannel accepts null to clear selection
      dispatch(setCurrentChannel(null));
    }
  }, [currentUser, dispatch]);

  // メッセージ送信（シンプル版 - 楽観的UI削除）
  const handleSendMessage = useCallback(async (formData: MessageFormData) => {
    if (!currentUser) return;

    // DM送信
    if (activeDM) {
      const result = await dmService.sendDMMessage(
        activeDM.id,
        currentUser.id,
        formData.content,
        formData.attachments
      );

      if (result.error) {
        console.error('Failed to send DM:', result.error);
        alert('メッセージの送信に失敗しました');
      }
      return;
    }

    // チャンネルメッセージ送信（既存のコード）
    if (!currentChannelId) return;

    try {
      // Firebaseに直接送信
      const result = await chatService.sendMessage(
        currentChannelId,
        formData,
        currentUser.id,
        currentUser.name,
        currentUser.role
      );

      if (result.error) {
        console.error('Failed to send message:', result.error);
        // TODO: ユーザーにエラー通知
      }
      // 送信成功 - subscribeToMessagesが自動的にFirebaseから新しいメッセージを取得して表示
    } catch (error) {
      console.error('Error sending message:', error);
      // TODO: ユーザーにエラー通知
    }
  }, [currentChannelId, currentUser, activeDM]);

  // メッセージ返信
  const handleReply = useCallback((message: ChatMessage) => {
    // 返信情報をメッセージ入力に設定（実装は省略）
  }, []);

  // メッセージ編集
  const handleEditMessage = useCallback((message: ChatMessage) => {
    setEditingMessage(message);
  }, []);

  // 編集キャンセル
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  // スレッドを開く
  const handleOpenThread = useCallback((message: ChatMessage) => {
    setActiveThread(message);
  }, []);

  // スレッドを閉じる
  const handleCloseThread = useCallback(() => {
    setActiveThread(null);
  }, []);

  // ピン留め
  const handlePinMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id) return;

    // DM対応
    if (activeDM) {
      const result = await dmService.pinDMMessage(activeDM.id, messageId as MessageId, currentUser.id);
      if (result.error) {
        console.error('Failed to pin DM message:', result.error);
      }
      return;
    }

    // チャンネルメッセージ
    const result = await chatService.pinMessage(messageId as MessageId, currentUser.id);
    if (result.error) {
      console.error('Failed to pin message:', result.error);
    }
  }, [currentUser, activeDM]);

  // ピン留め解除
  const handleUnpinMessage = useCallback(async (messageId: string) => {
    // DM対応
    if (activeDM) {
      const result = await dmService.unpinDMMessage(activeDM.id, messageId as MessageId);
      if (result.error) {
        console.error('Failed to unpin DM message:', result.error);
      }
      return;
    }

    // チャンネルメッセージ
    const result = await chatService.unpinMessage(messageId as MessageId);
    if (result.error) {
      console.error('Failed to unpin message:', result.error);
    }
  }, [activeDM]);

  // カテゴリ設定を開く
  const handleCategorySettings = useCallback((category: ChannelCategory) => {
    setSelectedCategory(category);
    setShowCategorySettings(true);
  }, []);

  // カテゴリ更新
  const handleUpdateCategory = useCallback(async (categoryId: CategoryId, updates: Partial<ChannelCategory>) => {
    // 名前と権限を同時に更新
    const result = await chatService.updateCategory(categoryId, {
      name: updates.name,
      permissions: updates.permissions,
    });

    if (result.error) {
      console.error('Failed to update category:', result.error);
      alert('カテゴリの更新に失敗しました');
    }
  }, []);

  // カテゴリ削除
  const handleDeleteCategory = useCallback(async (categoryId: CategoryId) => {
    const result = await chatService.deleteCategory(categoryId);
    if (result.error) {
      console.error('Failed to delete category:', result.error);
    }
  }, []);

  // カテゴリ作成 - モーダルを開く
  const handleCategoryCreate = useCallback(() => {
    setShowCategoryCreate(true);
  }, []);

  // カテゴリ作成 - 実際の作成処理
  const handleCategoryCreated = useCallback(async (data: {
    categoryName: string;
    permissions?: {
      viewRole?: string[];
      manageRole?: string[];
    };
  }) => {
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    const result = await chatService.createCategory(
      data.categoryName,
      categories.length,
      currentUser.id,
      data.permissions
    );

    if (result.error) {
      console.error('Failed to create category:', result.error);
      throw new Error('カテゴリの作成に失敗しました');
    }
  }, [currentUser, categories]);

  // チャンネル作成
  const handleChannelCreate = useCallback(async (data: {
    name: string;
    type: 'text' | 'voice' | 'announcement';
    categoryId: CategoryId;
    description?: string;
    topic?: string;
    isPrivate: boolean;
  }) => {
    if (!currentUser) return;

    // categoryIdが必須であることを保証
    if (!data.categoryId) {
      console.error('categoryIdが指定されていません');
      alert('カテゴリが指定されていません。チャンネルを作成できません。');
      return;
    }

    const result = await chatService.createChannel({
      name: data.name,
      type: data.type,
      categoryId: data.categoryId,
      description: data.description,
      topic: data.topic,
      isPrivate: data.isPrivate,
      createdBy: currentUser.id,
    });

    if (result.error) {
      console.error('Failed to create channel:', result.error);
      alert(`チャンネルの作成に失敗しました: ${result.error}`);
    } else if (result.data) {
      // 作成されたチャンネルに自動的に移動
      dispatch(setCurrentChannel(result.data));
    }
  }, [currentUser, dispatch]);

  // ピン留めメッセージ取得
  useEffect(() => {
    if (!currentChannelId) return;

    const loadPinnedMessages = async () => {
      const result = await chatService.getPinnedMessages(currentChannelId);
      if (result.data) {
        setPinnedMessages(result.data);
      }
    };

    loadPinnedMessages();
  }, [currentChannelId]);

  // カテゴリのリアルタイム監視
  useEffect(() => {
    const unsubscribe = chatService.subscribeToCategories((newCategories) => {
      setCategories(newCategories);
    });

    return unsubscribe;
  }, []);

  // 通知のリアルタイム監視
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = chatService.subscribeToNotifications(
      currentUser.id,
      (newNotifications) => {
        setNotifications(newNotifications);

        // 新しい通知があればブラウザ通知を表示
        newNotifications.forEach((notification) => {
          if (!notification.isRead) {
            chatService.showBrowserNotification(
              `${notification.authorName}からメンション`,
              {
                body: notification.content,
                icon: '/icon-192x192.png',
                tag: notification.id,
              }
            );
          }
        });
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // DM一覧取得
  useEffect(() => {
    if (!currentUser) return;

    const fetchDMs = async () => {
      const result = await dmService.getUserDMs(currentUser.id);
      if (result.data) {
        setDms(result.data);

        // 未読数計算
        const unreadCount = result.data.filter(dm =>
          dm.lastMessage &&
          !dm.lastMessage.isRead &&
          dm.lastMessage.senderId !== currentUser.id
        ).length;
        setDmUnreadCount(unreadCount);
      }
    };

    fetchDMs();

    // リアルタイム購読
    const unsubscribe = dmService.subscribeToDMs(currentUser.id, (updatedDMs) => {
      setDms(updatedDMs);

      // 未読数計算
      const unreadCount = updatedDMs.filter(dm =>
        dm.lastMessage &&
        !dm.lastMessage.isRead &&
        dm.lastMessage.senderId !== currentUser.id
      ).length;
      setDmUnreadCount(unreadCount);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // DMメッセージ購読
  useEffect(() => {
    if (!activeDM) return;

    const unsubscribe = dmService.subscribeToDMMessages(
      activeDM.id,
      (messages) => {
        setDmMessages(prev => ({
          ...prev,
          [activeDM.id]: messages,
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeDM]);

  // ユーザープロフィール表示
  const handleUserClick = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setShowUserProfile(true);
    }
  }, [users]);

  // リアクション
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    try {
      // DM対応
      if (activeDM) {
        const result = await dmService.toggleDMReaction(
          activeDM.id,
          createMessageId(messageId),
          emoji,
          currentUser.id
        );

        if (result.error) {
          console.error('Failed to toggle DM reaction:', result.error);
        }
        return;
      }

      // チャンネルメッセージ
      const result = await chatService.toggleReaction(
        createMessageId(messageId),
        emoji,
        currentUser.id
      );

      if (result.error) {
        console.error('Failed to toggle reaction:', result.error);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  }, [currentUser, activeDM]);

  // タイピング状態更新
  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!currentChannelId || !currentUser) return;

    try {
      await chatService.updateTypingStatus(
        currentUser.id,
        currentUser.name,
        currentChannelId,
        isTyping
      );
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [currentChannelId, currentUser]);

  // 検索実行
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const channelIds = channels.map(ch => ch.id);
      const result = await chatService.searchMessages(channelIds, query, 50);
      setSearchResults(result.error ? [] : result.data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [channels]);

  // リアルタイム検索（入力時）
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);

    // 空なら即座に結果をクリア
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    // 即座に検索実行
    handleSearch(value);
  }, [handleSearch]);

  // 検索クリア
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // 過去のメッセージを読み込み（無限スクロール用）
  const handleLoadMore = useCallback(async () => {
    if (!currentChannelId) return;

    const currentMessages = messages[currentChannelId] || [];
    if (currentMessages.length === 0) return;

    // 最も古いメッセージのタイムスタンプを取得
    const oldestMessage = currentMessages[0];
    const oldestTimestamp = oldestMessage.timestamp instanceof Date
      ? oldestMessage.timestamp
      : new Date(oldestMessage.timestamp);

    try {
      const result = await chatService.loadMoreMessages(currentChannelId, oldestTimestamp, 50);

      if (result.error) {
        console.error('Failed to load more messages:', result.error);
        return;
      }

      if (result.data.length > 0) {
        // 既存メッセージの先頭に古いメッセージを追加
        const updatedMessages = [...result.data, ...currentMessages];
        dispatch(setMessages({ channelId: currentChannelId, messages: updatedMessages }));
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
  }, [currentChannelId, messages, dispatch]);

  // メンバーパネルを開く
  const handleOpenMemberPanel = useCallback(() => {
    setShowMemberPanel(true);
  }, []);

  // チャンネル設定モーダルを開く
  const handleOpenChannelSettings = useCallback(() => {
    setShowChannelSettings(true);
  }, []);

  // チャンネル設定更新
  const handleUpdateChannel = useCallback(async (updates: Partial<ChatChannel>) => {
    if (!currentChannelId) return;

    try {
      const result = await chatService.updateChannel(currentChannelId, updates);

      if (result.error) {
        console.error('Failed to update channel:', result.error);
        // TODO: ユーザーにエラー通知
      }
      // 成功 - subscribeToChannelsが自動的に更新を反映
    } catch (error) {
      console.error('Error updating channel:', error);
    }
  }, [currentChannelId]);

  // チャンネルから退出
  const handleLeaveChannel = useCallback(async (channelId: string) => {
    if (!currentUser) return;

    try {
      const result = await chatService.leaveChannel(createChannelId(channelId), currentUser.id);

      if (result.error) {
        console.error('Failed to leave channel:', result.error);
        // TODO: ユーザーにエラー通知
      } else {
        // 成功 - 最初のチャンネルに移動
        if (channels.length > 0) {
          const firstChannel = channels[0];
          if (firstChannel.id !== channelId) {
            dispatch(setCurrentChannel(firstChannel.id));
          } else if (channels.length > 1) {
            dispatch(setCurrentChannel(channels[1].id));
          }
        }
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }, [currentUser, channels, dispatch]);

  // チャンネル削除
  const handleDeleteChannel = useCallback(async (channelId: string) => {
    if (!currentUser) return;

    try {
      const result = await chatService.deleteChannel(createChannelId(channelId), currentUser.id);

      if (result.error) {
        console.error('Failed to delete channel:', result.error);
        alert(`エラー: ${result.error}`);
      } else {
        // 削除成功 - 別のチャンネルに移動
        if (channels.length > 1) {
          const firstChannel = channels.find(c => c.id !== channelId);
          if (firstChannel) {
            dispatch(setCurrentChannel(firstChannel.id));
          }
        }
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      alert('チャンネル削除中にエラーが発生しました');
    }
  }, [currentUser, channels, dispatch]);

  // 認証ローディング中
  if (authUser.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証
  if (!authUser.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">認証が必要です</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">ログインしてください</p>
        </div>
      </div>
    );
  }

  // チャット初期化中
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">チャットシステムを初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* サイドバー - チャンネルリスト（固定、独立スクロール） */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <ChannelList
          channels={channels}
          categories={categories}
          currentChannelId={currentChannelId}
          unreadCounts={unreadCounts}
          currentUserId={currentUser?.id}
          currentUserRole={currentUser?.role}
          onChannelSelect={handleChannelSelect}
          onChannelCreate={(categoryId) => {
            // categoryIdがない場合は最初のカテゴリを使用
            const targetCategoryId = categoryId || (categories.length > 0 ? categories[0].id : undefined);

            if (!targetCategoryId) {
              alert('カテゴリが存在しないため、チャンネルを作成できません。まずカテゴリを作成してください。');
              return;
            }

            setChannelCreateCategoryId(targetCategoryId);
            setShowChannelCreate(true);
          }}
          onChannelEdit={(channel) => {
            // そのチャンネルを選択してから設定を開く
            handleChannelSelect(channel.id);
            handleOpenChannelSettings();
          }}
          onCategorySettings={handleCategorySettings}
          onCategoryCreate={handleCategoryCreate}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dmCount={dmUnreadCount}
          dms={dms}
          users={users.reduce<Record<string, ChatUser>>((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {})}
          activeDmId={activeDM?.id}
          onSelectDM={handleSelectDM}
          onNewDM={handleNewDM}
        />
      </div>

      {/* メインエリア（固定レイアウト） */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 min-w-0">
        {(currentChannelId || activeDM) ? (
          <>
            {/* チャンネルヘッダー（固定） */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {activeDM ? (
                    <>
                      <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                        {users.find(u => u.id === (activeDM.participants[0] === currentUser?.id
                          ? activeDM.participants[1]
                          : activeDM.participants[0]
                        ))?.name || 'ユーザー'}
                      </h2>
                    </>
                  ) : (
                    <>
                      <Hash className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                        {channels.find(c => c.id === currentChannelId)?.name || 'チャンネル'}
                      </h2>
                      <TypingIndicator typingUsers={currentTypingUsers} />
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">{!activeDM && (
                  <>
                  {/* 検索バー */}
                  <div className="w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="メッセージを検索..."
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        className="w-full pl-10 pr-10 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-blue-500 rounded-md focus:outline-none text-gray-800 dark:text-white"
                      />
                      {searchQuery && (
                        <button
                          onClick={handleClearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleOpenMemberPanel}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="メンバーを表示"
                  >
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  </>
                )}
                </div>
              </div>
            </div>

            {/* メッセージエリア（独立スクロール） */}
            <div className="flex-1 overflow-y-auto">
              {activeDM ? (
                <MessageList
                  messages={dmMessages[activeDM.id] || []}
                  currentUserId={currentUser?.id}
                  users={users}
                  loading={false}
                  error={null}
                  onReply={handleReply}
                  onEdit={handleEditMessage}
                  onReaction={handleReaction}
                  onUserClick={handleUserClick}
                  onOpenThread={handleOpenThread}
                  onPin={handlePinMessage}
                  onUnpin={handleUnpinMessage}
                />
              ) : searchResults.length > 0 ? (
                <div className="p-4">
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    「{searchQuery}」の検索結果: {searchResults.length}件
                  </div>
                  <MessageList
                    messages={searchResults}
                    currentUserId={currentUser?.id}
                    users={users}
                    loading={isSearching}
                    error={null}
                    onReply={handleReply}
                    onEdit={handleEditMessage}
                    onReaction={handleReaction}
                    onUserClick={handleUserClick}
                    onOpenThread={handleOpenThread}
                    onPin={handlePinMessage}
                    onUnpin={handleUnpinMessage}
                  />
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>「{searchQuery}」に一致するメッセージが見つかりませんでした</p>
                  </div>
                </div>
              ) : (
                <MessageList
                  messages={currentMessages}
                  currentUserId={currentUser?.id}
                  users={users}
                  loading={loading.messages}
                  error={error.messages}
                  onReply={handleReply}
                  onEdit={handleEditMessage}
                  onReaction={handleReaction}
                  onUserClick={handleUserClick}
                  onOpenThread={handleOpenThread}
                  onPin={handlePinMessage}
                  onUnpin={handleUnpinMessage}
                  onLoadMore={handleLoadMore}
                  hasMore={currentMessages.length >= 50}
                />
              )}
            </div>

            {/* メッセージ入力（固定） */}
            <div className="flex-shrink-0">
              <MessageInput
                channelId={currentChannelId}
                dmId={activeDM?.id}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
                currentUserRole={currentUser?.role}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                availableUsers={users}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                {activeTab === 'dms' ? 'DMを選択してください' : 'チャンネルを選択してください'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'dms' ? '左側のリストから選択できます' : '左側のチャンネルリストから選択できます'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* メンバーパネル（一体化、右側に折りたたみ可能） */}
      <div className={`transition-all duration-300 ease-in-out flex-shrink-0 ${showMemberPanel ? 'w-80' : 'w-0'} overflow-hidden`}>
        <MemberPanel
          isOpen={showMemberPanel}
          onClose={() => setShowMemberPanel(false)}
          channelId={currentChannelId}
          members={users}
          currentUserId={currentUser?.id}
          onUserClick={handleUserClick}
        />
      </div>

      {/* ユーザープロフィールモーダル */}
      <UserProfileModal
        user={selectedUser}
        isOpen={showUserProfile}
        currentUserId={currentUser?.id || ''}
        onClose={() => {
          setShowUserProfile(false);
          setSelectedUser(null);
        }}
        onDirectMessage={handleDirectMessage}
      />

      {/* スレッドパネル */}
      {activeThread && (
        <ThreadPanel
          parentMessage={activeThread}
          currentUserId={currentUser?.id}
          currentUserName={currentUser?.name}
          currentUserRole={currentUser?.role}
          onSendMessage={handleSendMessage}
          onClose={handleCloseThread}
          users={users}
        />
      )}

      {/* チャンネル設定モーダル */}
      <ChannelSettingsModal
        isOpen={showChannelSettings}
        onClose={() => setShowChannelSettings(false)}
        channel={channels.find(c => c.id === currentChannelId) || null}
        currentUserId={currentUser?.id}
        currentUserRole={currentUser?.role}
        onUpdateChannel={handleUpdateChannel}
        onLeaveChannel={handleLeaveChannel}
        onDeleteChannel={handleDeleteChannel}
      />

      {/* カテゴリ設定モーダル */}
      <CategorySettingsModal
        isOpen={showCategorySettings}
        onClose={() => {
          setShowCategorySettings(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        currentUserRole={currentUser?.role || 'worker'}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
      />

      {/* チャンネル作成モーダル */}
      {showChannelCreate && channelCreateCategoryId && (
        <ChannelCreateModal
          isOpen={showChannelCreate}
          onClose={() => {
            setShowChannelCreate(false);
            setChannelCreateCategoryId(null);
          }}
          categoryId={channelCreateCategoryId}
          onCreate={handleChannelCreate}
        />
      )}

      {/* カテゴリ作成モーダル */}
      <CategoryCreateModal
        open={showCategoryCreate}
        onOpenChange={setShowCategoryCreate}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* ユーザー選択モーダル */}
      <UserSelectModal
        isOpen={showUserSelectModal}
        onClose={() => setShowUserSelectModal(false)}
        users={users}
        currentUserId={currentUser?.id || ('' as import('./types').UserId)}
        onSelectUser={handleUserSelect}
      />
    </div>
  );
};

// メインアプリコンポーネント（Provider付き）
const ChatApp: React.FC = () => {
  return (
    <Provider store={store}>
      <ChatMain />
    </Provider>
  );
};

export default ChatApp;