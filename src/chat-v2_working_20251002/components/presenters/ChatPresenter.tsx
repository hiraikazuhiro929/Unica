import React, { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChannelSidebarPresenter } from './ChannelSidebarPresenter';
import { MessageItemPresenter } from './MessageItemPresenter';
import { MessageInputPresenter } from './MessageInputPresenter';
import {
  VirtualScrollMessageList,
  PageLoading,
  Badge,
  ChatErrorBoundary,
  CompactErrorBoundary,
} from '../shared';
import type { MessageState, ChannelState, UserState } from '../../store/types';
import type { ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// ChatPresenter Component - Discord風メインレイアウト
// =============================================================================

interface ChatPresenterProps {
  // 接続状態
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // チャンネル・メッセージ
  channels: ChannelState[];
  selectedChannelId: string | null;
  selectedChannel: ChannelState | null;
  messages: (MessageState & { isFirstInGroup?: boolean })[];
  mentionedMessages: MessageState[];

  // ユーザー・プレゼンス
  currentUser: UserState | null;
  onlineUsers: UserState[];
  typingUsers: UserState[];

  // メッセージ入力
  messageInput: {
    content: string;
    attachments: ChatAttachment[];
    replyTo: any;
    mentions: string[];
  };
  isTyping: boolean;

  // 送信状態
  sendingMessages: MessageState[];
  failedMessages: MessageState[];

  // 通知
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  unreadNotifications: any[];
  visibleNotifications: any[];

  // イベントハンドラー
  onChannelSelect: (channelId: string) => void;
  onSendMessage: (content: string, attachments?: ChatAttachment[]) => Promise<void>;
  onRetryMessage: (localId: string) => Promise<void>;
  onUpdateMessageContent: (content: string) => void;
  onAddAttachment: (attachment: ChatAttachment) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onClearInput: () => void;
  onMessageReply: (message: MessageState) => void;
  onMessageEdit: (message: MessageState) => void;
  onMessageDelete: (message: MessageState) => void;
  onMessageCopy: (message: MessageState) => void;
  onAttachmentClick: (attachment: ChatAttachment) => void;
  onUserClick: (userId: string) => void;
  onToggleNotifications: (channelId: string, enabled: boolean) => void;
  onCreateChannel: () => void;
  onEditChannel: (channelId: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onShowSettings: () => void;

  // 統計・デバッグ
  stats: any;

  // スタイル
  className?: string;
}

/**
 * Discord風メインチャットプレゼンター
 *
 * 特徴:
 * - 3ペインレイアウト（サイドバー・メッセージ・詳細）
 * - 仮想スクロール対応
 * - 楽観的UI表示
 * - エラー境界
 * - アクセシビリティ対応
 */
export const ChatPresenter: React.FC<ChatPresenterProps> = ({
  isConnected,
  isLoading,
  error,
  channels,
  selectedChannelId,
  selectedChannel,
  messages,
  mentionedMessages,
  currentUser,
  onlineUsers,
  typingUsers,
  messageInput,
  isTyping,
  sendingMessages,
  failedMessages,
  unreadCounts,
  totalUnreadCount,
  unreadNotifications,
  visibleNotifications,
  onChannelSelect,
  onSendMessage,
  onRetryMessage,
  onUpdateMessageContent,
  onAddAttachment,
  onRemoveAttachment,
  onClearInput,
  onMessageReply,
  onMessageEdit,
  onMessageDelete,
  onMessageCopy,
  onAttachmentClick,
  onUserClick,
  onToggleNotifications,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onShowSettings,
  stats,
  className,
}) => {
  // メッセージ送信処理
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.content.trim() && messageInput.attachments.length === 0) {
      return;
    }

    try {
      await onSendMessage(messageInput.content, messageInput.attachments);
    } catch (error) {
      console.error('Message send error:', error);
    }
  }, [messageInput.content, messageInput.attachments, onSendMessage]);

  // 添付ファイル追加処理
  const handleAddAttachments = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const attachment: ChatAttachment = {
        id: `temp-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: '', // アップロード後に設定
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
      onAddAttachment(attachment);
    });
  }, [onAddAttachment]);

  // 添付ファイル削除処理
  const handleRemoveAttachment = useCallback((index: number) => {
    if (messageInput.attachments[index]) {
      onRemoveAttachment(messageInput.attachments[index].id);
    }
  }, [messageInput.attachments, onRemoveAttachment]);

  // メッセージレンダラー
  const renderMessage = useCallback((message: MessageState & { isFirstInGroup?: boolean }, index: number) => {
    const isOwnMessage = currentUser ? message.authorId === currentUser.id : false;
    const isMentioned = mentionedMessages.some(m => m.id === message.id);

    return (
      <MessageItemPresenter
        key={message.id}
        message={message}
        isOwnMessage={isOwnMessage}
        isFirstInGroup={message.isFirstInGroup}
        isMentioned={isMentioned}
        currentUserId={currentUser?.id}
        onRetry={() => message.localId && onRetryMessage(message.localId)}
        onReply={() => onMessageReply(message)}
        onEdit={() => onMessageEdit(message)}
        onDelete={() => onMessageDelete(message)}
        onCopy={() => onMessageCopy(message)}
        onAttachmentClick={onAttachmentClick}
        onUserClick={onUserClick}
      />
    );
  }, [
    currentUser,
    mentionedMessages,
    onRetryMessage,
    onMessageReply,
    onMessageEdit,
    onMessageDelete,
    onMessageCopy,
    onAttachmentClick,
    onUserClick,
  ]);

  // チャンネル情報の拡張
  const enrichedChannels = useMemo(() => {
    return channels.map(channel => ({
      ...channel,
      unreadCount: unreadCounts[channel.id] || 0,
      mentionCount: 0, // TODO: メンション数の計算
      notificationsEnabled: true, // TODO: 通知設定の取得
    }));
  }, [channels, unreadCounts]);

  // 初期ロード中
  if (isLoading && !isConnected) {
    return <PageLoading className={className} />;
  }

  // 接続エラー
  if (error && !isConnected) {
    return (
      <div className={cn("flex items-center justify-center min-h-screen bg-discord-bg-primary", className)}>
        <div className="text-center">
          <p className="text-discord-danger text-lg mb-4">接続エラー</p>
          <p className="text-discord-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen bg-discord-bg-primary text-discord-text-primary", className)}>
      {/* サイドバー（チャンネルリスト） */}
      <CompactErrorBoundary>
        <ChannelSidebarPresenter
          channels={enrichedChannels}
          selectedChannelId={selectedChannelId}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          isLoading={isLoading}
          onChannelSelect={onChannelSelect}
          onCreateChannel={onCreateChannel}
          onEditChannel={onEditChannel}
          onDeleteChannel={onDeleteChannel}
          onToggleNotifications={onToggleNotifications}
          onUserClick={onUserClick}
          onShowSettings={onShowSettings}
        />
      </CompactErrorBoundary>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <>
            {/* チャンネルヘッダー */}
            <div className="px-4 py-3 border-b border-discord-bg-secondary bg-discord-bg-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-discord-text-primary">
                    # {selectedChannel.name}
                  </h1>
                  {selectedChannel.description && (
                    <span className="text-sm text-discord-text-secondary">
                      {selectedChannel.description}
                    </span>
                  )}
                </div>

                {/* チャンネル統計 */}
                <div className="flex items-center gap-4 text-sm text-discord-text-secondary">
                  {/* メンバー数 */}
                  <div className="flex items-center gap-1">
                    <span>{onlineUsers.length} オンライン</span>
                  </div>

                  {/* 未読数 */}
                  {totalUnreadCount > 0 && (
                    <Badge variant="unread" count={totalUnreadCount} />
                  )}
                </div>
              </div>

              {/* タイピングインジケーター */}
              {typingUsers.length > 0 && (
                <div className="mt-2 text-sm text-discord-text-secondary">
                  <span>
                    {typingUsers.map(user => user.name).join(', ')} が入力中...
                  </span>
                </div>
              )}
            </div>

            {/* メッセージリスト */}
            <CompactErrorBoundary>
              <VirtualScrollMessageList
                messages={messages}
                renderMessage={renderMessage}
                isLoading={false}
                autoScroll={true}
                emptyContent={
                  <div className="text-center text-discord-text-muted">
                    <p className="text-lg font-medium mb-2">
                      #{selectedChannel.name} チャンネルへようこそ！
                    </p>
                    <p className="text-sm">
                      このチャンネルの最初のメッセージです。
                    </p>
                  </div>
                }
                className="flex-1"
              />
            </CompactErrorBoundary>

            {/* メッセージ入力 */}
            <CompactErrorBoundary>
              <MessageInputPresenter
                value={messageInput.content}
                onChange={onUpdateMessageContent}
                onSend={handleSendMessage}
                attachments={messageInput.attachments}
                onAddAttachment={handleAddAttachments}
                onRemoveAttachment={handleRemoveAttachment}
                placeholder={`#${selectedChannel.name} にメッセージを送信`}
                isSending={sendingMessages.length > 0}
                replyTo={messageInput.replyTo}
                onCancelReply={onClearInput}
                isTyping={isTyping}
              />
            </CompactErrorBoundary>
          </>
        ) : (
          /* チャンネル未選択状態 */
          <div className="flex-1 flex items-center justify-center bg-discord-bg-secondary">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-discord-text-primary mb-2">
                チャンネルを選択してください
              </h2>
              <p className="text-discord-text-secondary">
                左側のサイドバーからチャンネルを選択して、チャットを開始しましょう。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="w-64 bg-discord-bg-tertiary border-l border-discord-bg-secondary p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-discord-text-primary mb-2">
            Debug Info
          </h3>
          <div className="space-y-2 text-xs text-discord-text-secondary">
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Channels: {channels.length}</div>
            <div>Messages: {messages.length}</div>
            <div>Online Users: {onlineUsers.length}</div>
            <div>Sending: {sendingMessages.length}</div>
            <div>Failed: {failedMessages.length}</div>
            {stats && (
              <div className="mt-4">
                <h4 className="font-medium mb-1">Stats</h4>
                <pre className="text-xs overflow-hidden">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

ChatPresenter.displayName = 'ChatPresenter';

// =============================================================================
// Export
// =============================================================================

export type { ChatPresenterProps };