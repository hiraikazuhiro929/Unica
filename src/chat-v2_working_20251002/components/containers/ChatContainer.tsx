import React, { useCallback, useMemo, useEffect } from 'react';
import { useChatV2 } from '../../hooks/useChatV2';
import { ChatPresenter } from '../presenters/ChatPresenter';
import { ChatErrorBoundary } from '../shared';
import {
  PerformanceMonitor,
  useOptimizedMessageSending,
  useOptimizedMessageList,
  useOptimizedTypingIndicator,
  useRenderCount,
  detectDevicePerformance,
  OPTIMIZATION_PRESETS,
} from '../performance';
import type { MessageState } from '../../store/types';
import type { ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// ChatContainer Component - メインチャットロジック統合
// =============================================================================

interface ChatContainerProps {
  /** 現在のユーザー情報 */
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  userEmail: string;
  userAvatar?: string;
  /** 初期選択チャンネルID */
  initialChannelId?: string;
  /** 自動接続するか */
  autoConnect?: boolean;
  /** エラー処理のコールバック */
  onError?: (error: Error) => void;
  /** 追加のCSS クラス */
  className?: string;
  /** パフォーマンス監視を有効にするか */
  enablePerformanceMonitoring?: boolean;
  /** React 18最適化を有効にするか */
  enableReact18Optimizations?: boolean;
  /** パフォーマンス設定のプリセット */
  performancePreset?: keyof typeof OPTIMIZATION_PRESETS;
}

/**
 * メインチャットコンテナ
 *
 * 特徴:
 * - useChatV2フックとの統合
 * - 全体的なビジネスロジック管理
 * - エラー境界の実装
 * - パフォーマンス最適化
 */
export const ChatContainer: React.FC<ChatContainerProps> = ({
  userId,
  userName,
  userRole,
  userDepartment,
  userEmail,
  userAvatar,
  initialChannelId,
  autoConnect = true,
  onError,
  className,
  enablePerformanceMonitoring = process.env.NODE_ENV === 'development',
  enableReact18Optimizations = true,
  performancePreset = detectDevicePerformance(),
}) => {
  // パフォーマンス監視
  const { renderCount } = useRenderCount('ChatContainer');

  // 最適化設定の取得
  const optimizationConfig = OPTIMIZATION_PRESETS[performancePreset];

  // メインチャットフックの使用
  const chat = useChatV2({
    userId,
    userName,
    userRole,
    userDepartment,
    userEmail,
    avatar: userAvatar,
    autoConnect,
  });

  // React 18最適化フック（有効な場合のみ）
  const { isPending: isMessageSendPending, sendMessageOptimized } = enableReact18Optimizations
    ? useOptimizedMessageSending()
    : { isPending: false, sendMessageOptimized: null };

  const {
    visibleMessages: optimizedMessages,
    isPending: isMessageListPending,
    addMessageOptimized,
  } = enableReact18Optimizations
    ? useOptimizedMessageList(
        chat.messages,
        optimizationConfig.messageListVisibleCount
      )
    : {
        visibleMessages: chat.messages,
        isPending: false,
        addMessageOptimized: null,
      };

  const { typingText, shouldShowTyping } = enableReact18Optimizations
    ? useOptimizedTypingIndicator(
        chat.typingUsers.map(user => user.name),
        optimizationConfig.typingIndicatorDebounceMs
      )
    : {
        typingText: '',
        shouldShowTyping: false,
      };

  // 初期チャンネル選択
  useEffect(() => {
    if (initialChannelId && chat.channels.length > 0 && !chat.selectedChannelId) {
      const targetChannel = chat.channels.find(ch => ch.id === initialChannelId);
      if (targetChannel) {
        chat.actions.selectChannel(initialChannelId);
      }
    } else if (!chat.selectedChannelId && chat.channels.length > 0) {
      // デフォルトで最初のチャンネルを選択
      chat.actions.selectChannel(chat.channels[0].id);
    }
  }, [initialChannelId, chat.channels, chat.selectedChannelId, chat.actions]);

  // エラーハンドリング
  useEffect(() => {
    if (chat.error && onError) {
      onError(new Error(chat.error));
    }
  }, [chat.error, onError]);

  // メッセージ送信（React 18最適化版）
  const handleSendMessage = useCallback(async (
    content: string,
    attachments: ChatAttachment[] = []
  ) => {
    if (enableReact18Optimizations && sendMessageOptimized) {
      // 最適化版メッセージ送信
      sendMessageOptimized(
        () => chat.actions.sendMessage(content, attachments),
        () => {
          // 楽観的UI更新（即座に実行）
          console.log('Optimistic UI: Message sent');
        }
      );
    } else {
      // 従来版メッセージ送信
      try {
        await chat.actions.sendMessage(content, attachments);
      } catch (error) {
        console.error('メッセージ送信エラー:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('メッセージ送信に失敗しました'));
        }
      }
    }
  }, [chat.actions, onError, enableReact18Optimizations, sendMessageOptimized]);

  // メッセージリトライ
  const handleRetryMessage = useCallback(async (localId: string) => {
    try {
      const success = await chat.actions.retryMessage(localId);
      if (!success) {
        throw new Error('リトライに失敗しました');
      }
    } catch (error) {
      console.error('メッセージリトライエラー:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('メッセージのリトライに失敗しました'));
      }
    }
  }, [chat.actions, onError]);

  // チャンネル選択
  const handleChannelSelect = useCallback((channelId: string) => {
    chat.actions.selectChannel(channelId);
  }, [chat.actions]);

  // メッセージインタラクション
  const handleMessageReply = useCallback((message: MessageState) => {
    chat.actions.setMessageReplyTo(message);
  }, [chat.actions]);

  const handleMessageEdit = useCallback((message: MessageState) => {
    // 編集機能の実装（将来拡張）
    console.log('Edit message:', message.id);
  }, []);

  const handleMessageDelete = useCallback((message: MessageState) => {
    // 削除機能の実装（将来拡張）
    console.log('Delete message:', message.id);
  }, []);

  const handleMessageCopy = useCallback((message: MessageState) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content || '');
    }
  }, []);

  // 添付ファイル処理
  const handleAttachmentClick = useCallback((attachment: ChatAttachment) => {
    // 添付ファイルの表示・ダウンロード処理
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  }, []);

  // ユーザークリック処理
  const handleUserClick = useCallback((userId: string) => {
    // ユーザープロファイル表示（将来拡張）
    console.log('User clicked:', userId);
  }, []);

  // 通知設定変更
  const handleToggleNotifications = useCallback((channelId: string, enabled: boolean) => {
    // 通知設定の変更（将来拡張）
    console.log('Toggle notifications:', channelId, enabled);
  }, []);

  // チャンネル管理
  const handleCreateChannel = useCallback(() => {
    // チャンネル作成（将来拡張）
    console.log('Create channel');
  }, []);

  const handleEditChannel = useCallback((channelId: string) => {
    // チャンネル編集（将来拡張）
    console.log('Edit channel:', channelId);
  }, []);

  const handleDeleteChannel = useCallback((channelId: string) => {
    // チャンネル削除（将来拡張）
    console.log('Delete channel:', channelId);
  }, []);

  // 設定画面表示
  const handleShowSettings = useCallback(() => {
    // 設定画面表示（将来拡張）
    console.log('Show settings');
  }, []);

  // メッセージのメモ化（パフォーマンス最適化）
  const messagesToProcess = enableReact18Optimizations ? optimizedMessages : chat.messages;

  const memoizedMessages = useMemo(() => {
    return messagesToProcess.map((message, index) => {
      const prevMessage = messagesToProcess[index - 1];
      const isFirstInGroup = !prevMessage ||
        prevMessage.authorId !== message.authorId ||
        (message.timestamp.getTime() - prevMessage.timestamp.getTime()) > 5 * 60 * 1000;

      return {
        ...message,
        isFirstInGroup,
      };
    });
  }, [messagesToProcess]);

  // メンション検出
  const mentionedMessages = useMemo(() => {
    return memoizedMessages.filter(message =>
      message.content?.includes(`@${userName}`) ||
      message.mentions?.includes(userId)
    );
  }, [memoizedMessages, userName, userId]);

  // 現在選択中のチャンネル
  const selectedChannel = useMemo(() => {
    return chat.channels.find(channel => channel.id === chat.selectedChannelId) || null;
  }, [chat.channels, chat.selectedChannelId]);

  // パフォーマンス統計情報の拡張
  const extendedStats = useMemo(() => {
    return {
      ...chat.stats,
      renderCount,
      optimization: {
        enabled: enableReact18Optimizations,
        preset: performancePreset,
        config: optimizationConfig,
        pendingStates: {
          messageSend: isMessageSendPending,
          messageList: isMessageListPending,
        },
      },
    };
  }, [
    chat.stats,
    renderCount,
    enableReact18Optimizations,
    performancePreset,
    optimizationConfig,
    isMessageSendPending,
    isMessageListPending,
  ]);

  const containerContent = (
    <ChatErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Chat Error Boundary:', error, errorInfo);
        if (onError) {
          onError(error);
        }
      }}
    >
      <ChatPresenter
        // 接続状態
        isConnected={chat.isConnected}
        isLoading={chat.isLoading}
        error={chat.error}

        // チャンネル・メッセージ
        channels={chat.channels}
        selectedChannelId={chat.selectedChannelId}
        selectedChannel={selectedChannel}
        messages={memoizedMessages}
        mentionedMessages={mentionedMessages}

        // ユーザー・プレゼンス
        currentUser={chat.currentUser}
        onlineUsers={chat.onlineUsers}
        typingUsers={enableReact18Optimizations && shouldShowTyping ?
          [{ name: typingText, id: 'optimized', email: '', role: '', department: '' }] :
          chat.typingUsers
        }

        // メッセージ入力
        messageInput={chat.messageInput}
        isTyping={chat.isTyping}

        // 送信状態
        sendingMessages={chat.sendingMessages}
        failedMessages={chat.failedMessages}

        // 通知
        unreadCounts={chat.unreadCounts}
        totalUnreadCount={chat.totalUnreadCount}
        unreadNotifications={chat.unreadNotifications}
        visibleNotifications={chat.visibleNotifications}

        // イベントハンドラー
        onChannelSelect={handleChannelSelect}
        onSendMessage={handleSendMessage}
        onRetryMessage={handleRetryMessage}
        onUpdateMessageContent={chat.actions.updateMessageContent}
        onAddAttachment={chat.actions.addMessageAttachment}
        onRemoveAttachment={chat.actions.removeMessageAttachment}
        onClearInput={chat.actions.clearInput}
        onMessageReply={handleMessageReply}
        onMessageEdit={handleMessageEdit}
        onMessageDelete={handleMessageDelete}
        onMessageCopy={handleMessageCopy}
        onAttachmentClick={handleAttachmentClick}
        onUserClick={handleUserClick}
        onToggleNotifications={handleToggleNotifications}
        onCreateChannel={handleCreateChannel}
        onEditChannel={handleEditChannel}
        onDeleteChannel={handleDeleteChannel}
        onShowSettings={handleShowSettings}

        // 統計・デバッグ（拡張版）
        stats={extendedStats}

        // スタイル
        className={className}
      />
    </ChatErrorBoundary>
  );

  // パフォーマンス監視でラップ（有効な場合のみ）
  return enablePerformanceMonitoring ? (
    <PerformanceMonitor
      componentName="ChatContainer"
      enableInProduction={false}
      showStats={process.env.NODE_ENV === 'development'}
    >
      {containerContent}
    </PerformanceMonitor>
  ) : (
    containerContent
  );
};

ChatContainer.displayName = 'ChatContainer';

// =============================================================================
// Export
// =============================================================================

export type { ChatContainerProps };