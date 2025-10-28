/**
 * ChatApp - New Chat System v2 Main Component
 * 新しいチャットシステムのメインコンポーネント
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './store';
import {
  setCurrentChannel,
  addMessage,
  setMessages,
  setChannels,
  setCurrentUser,
  addOptimisticMessage,
  confirmOptimisticMessage,
  failOptimisticMessage,
  removeOptimisticMessage,
  addTypingUser,
  removeTypingUser,
  setUsers,
} from './store/chatSlice';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChatMessage,
  MessageFormData,
  ChannelId,
  UserId,
  createChannelId,
  createMessageId,
  createUserId,
} from './types';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ChannelList } from './components/ChannelList';
import chatService from './services/chatService';
import UnifiedTimestamp from './core/UnifiedTimestamp';
import { Loader2, AlertCircle, Settings, Users } from 'lucide-react';

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

  const [initialized, setInitialized] = useState(false);
  const [unsubscribeFunctions, setUnsubscribeFunctions] = useState<(() => void)[]>([]);

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
          console.warn('No authenticated user, skipping chat initialization');
          return;
        }

        // 既存の初期化機能をインポート
        const { initializeChatData } = await import('@/lib/firebase/initChatData');

        // チャットデータの初期化（チャンネルとユーザーがない場合は作成）
        const initResult = await initializeChatData();
        if (!initResult.success) {
          console.error('Failed to initialize chat data:', initResult.error);
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

        // チャンネル一覧を取得
        const channelsResult = await chatService.getChannels(currentAppUser.id);
        if (channelsResult.error) {
          console.error('Failed to get channels:', channelsResult.error);
        } else {
          console.log('Channels loaded:', channelsResult.data);
          dispatch(setChannels(channelsResult.data));

          // 最初のチャンネルを選択
          if (channelsResult.data.length > 0) {
            dispatch(setCurrentChannel(channelsResult.data[0].id));
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

    setUnsubscribeFunctions(unsubscribes);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [initialized, dispatch]);

  // 現在のチャンネルのメッセージ監視
  useEffect(() => {
    if (!currentChannelId) return;

    const unsubscribe = chatService.subscribeToMessages(
      currentChannelId,
      (messages) => {
        dispatch(setMessages({ channelId: currentChannelId, messages }));
      }
    );

    return unsubscribe;
  }, [currentChannelId, dispatch]);

  // 現在のチャンネルのタイピング状態監視
  useEffect(() => {
    if (!currentChannelId) return;

    const unsubscribe = chatService.subscribeToTypingStatus(
      currentChannelId,
      (typingUsers) => {
        // 自分以外のタイピングユーザーのみ表示
        const filteredUsers = typingUsers.filter(
          user => user.userId !== currentUser?.id
        );
        // Redux storeを更新（実装は省略）
      }
    );

    return unsubscribe;
  }, [currentChannelId, currentUser?.id]);

  // チャンネル選択
  const handleChannelSelect = useCallback((channelId: ChannelId) => {
    dispatch(setCurrentChannel(channelId));
  }, [dispatch]);

  // メッセージ送信（シンプル版 - 楽観的UI削除）
  const handleSendMessage = useCallback(async (formData: MessageFormData) => {
    if (!currentChannelId || !currentUser) return;

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
  }, [currentChannelId, currentUser]);

  // メッセージ返信
  const handleReply = useCallback((message: ChatMessage) => {
    // 返信情報をメッセージ入力に設定（実装は省略）
    console.log('Reply to message:', message);
  }, []);

  // リアクション
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    try {
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
  }, [currentUser]);

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
          currentChannelId={currentChannelId}
          unreadCounts={unreadCounts}
          currentUserId={currentUser?.id}
          onChannelSelect={handleChannelSelect}
        />
      </div>

      {/* メインエリア（固定レイアウト） */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
        {currentChannelId ? (
          <>
            {/* チャンネルヘッダー（固定） */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                    # {channels.find(c => c.id === currentChannelId)?.name || 'チャンネル'}
                  </h2>
                  {currentTypingUsers.length > 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {currentTypingUsers.map(u => u.userName).join(', ')} が入力中...
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* メッセージエリア（独立スクロール） */}
            <div className="flex-1 overflow-y-auto">
              <MessageList
                messages={currentMessages}
                currentUserId={currentUser?.id}
                loading={loading.messages}
                error={error.messages}
                onReply={handleReply}
                onReaction={handleReaction}
                onLoadMore={handleLoadMore}
                hasMore={currentMessages.length >= 50}
              />
            </div>

            {/* メッセージ入力（固定） */}
            <div className="flex-shrink-0">
              <MessageInput
                channelId={currentChannelId}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
                currentUserRole={currentUser?.role}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">チャンネルを選択してください</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">左側のチャンネルリストから選択できます</p>
            </div>
          </div>
        )}
      </div>
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