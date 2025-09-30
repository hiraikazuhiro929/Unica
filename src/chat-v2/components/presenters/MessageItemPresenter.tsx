import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Copy,
  AlertCircle,
  ExternalLink,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
} from 'lucide-react';
import {
  Avatar,
  StatusIndicator,
  MessageTimestamp,
  Badge,
  RoleBadge,
} from '../shared';
import type { MessageState } from '../../store/types';
import type { ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// MessageItemPresenter Component - Discord風メッセージ表示
// =============================================================================

interface MessageItemPresenterProps {
  /** メッセージデータ */
  message: MessageState;
  /** 自分のメッセージかどうか */
  isOwnMessage: boolean;
  /** グループ表示の最初のメッセージか */
  isFirstInGroup?: boolean;
  /** アバターを表示するか */
  showAvatar?: boolean;
  /** タイムスタンプを表示するか */
  showTimestamp?: boolean;
  /** ホバー時のアクションボタンを表示するか */
  showActions?: boolean;
  /** メンションされているか */
  isMentioned?: boolean;
  /** ハイライトするか */
  isHighlighted?: boolean;
  /** 選択されているか */
  isSelected?: boolean;
  /** 現在のユーザーID */
  currentUserId?: string;
  /** リトライハンドラー */
  onRetry?: () => void;
  /** 削除ハンドラー */
  onDelete?: () => void;
  /** 編集ハンドラー */
  onEdit?: () => void;
  /** 返信ハンドラー */
  onReply?: () => void;
  /** コピーハンドラー */
  onCopy?: () => void;
  /** リアクション追加ハンドラー */
  onAddReaction?: (emoji: string) => void;
  /** 添付ファイルクリックハンドラー */
  onAttachmentClick?: (attachment: ChatAttachment) => void;
  /** ユーザークリックハンドラー */
  onUserClick?: (userId: string) => void;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * Discord風個別メッセージ表示コンポーネント
 *
 * 特徴:
 * - Discord風デザイン
 * - 送信状態表示
 * - メンション検出とハイライト
 * - 添付ファイル表示
 * - アクションメニュー
 * - アクセシビリティ対応
 */
export const MessageItemPresenter: React.FC<MessageItemPresenterProps> = ({
  message,
  isOwnMessage,
  isFirstInGroup = true,
  showAvatar = true,
  showTimestamp = true,
  showActions = true,
  isMentioned = false,
  isHighlighted = false,
  isSelected = false,
  currentUserId,
  onRetry,
  onDelete,
  onEdit,
  onReply,
  onCopy,
  onAddReaction,
  onAttachmentClick,
  onUserClick,
  className,
}) => {
  // メンション検出
  const mentionRegex = /@(\w+)/g;
  const mentions = useMemo(() => {
    const found: string[] = [];
    let match;
    while ((match = mentionRegex.exec(message.content || '')) !== null) {
      found.push(match[1]);
    }
    return found;
  }, [message.content]);

  // メッセージ内容のレンダリング（メンション、リンクをハイライト）
  const renderMessageContent = useMemo(() => {
    let content = message.content || '';

    // メンションのハイライト
    content = content.replace(
      mentionRegex,
      '<span class="bg-discord-accent-primary bg-opacity-20 text-discord-accent-primary px-1 rounded">@$1</span>'
    );

    // URLリンクの検出とリンク化
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(
      urlRegex,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-discord-accent-primary hover:underline">$1</a>'
    );

    return { __html: content };
  }, [message.content]);

  // 添付ファイルのアイコン取得
  const getAttachmentIcon = (attachment: ChatAttachment) => {
    if (attachment.type.startsWith('image/')) return ImageIcon;
    if (attachment.type.startsWith('video/')) return Video;
    if (attachment.type.startsWith('audio/')) return Music;
    return FileText;
  };

  // ユーザークリック
  const handleUserClick = () => {
    if (onUserClick && message.authorId) {
      onUserClick(message.authorId);
    }
  };

  return (
    <div
      className={cn(
        "group relative px-4 py-2 hover:bg-discord-bg-secondary hover:bg-opacity-30 transition-colors",
        isMentioned && "bg-yellow-500 bg-opacity-10 border-l-4 border-yellow-500",
        isHighlighted && "bg-discord-accent-primary bg-opacity-20",
        isSelected && "bg-discord-accent-primary bg-opacity-30",
        isOwnMessage && "bg-blue-500 bg-opacity-5",
        className
      )}
      role="article"
      aria-labelledby={`message-author-${message.id}`}
      aria-describedby={`message-content-${message.id}`}
    >
      <div className="flex gap-3">
        {/* アバター表示 */}
        {showAvatar && isFirstInGroup && (
          <div className="shrink-0">
            <Avatar
              user={{
                id: message.authorId,
                name: message.authorName,
                avatar: message.authorAvatar,
                status: 'online', // 実際の状態は別途取得
              }}
              size="md"
              showStatus={false}
              onClick={handleUserClick}
              className="cursor-pointer"
            />
          </div>
        )}

        {/* アバタープレースホルダー（グループ表示で非表示時） */}
        {(!showAvatar || !isFirstInGroup) && (
          <div className="w-10 shrink-0 flex justify-center">
            {showTimestamp && (
              <MessageTimestamp
                timestamp={message.timestamp}
                format="relative"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-5"
              />
            )}
          </div>
        )}

        {/* メッセージ本体 */}
        <div className="flex-1 min-w-0">
          {/* ユーザー情報行（グループ最初のメッセージのみ） */}
          {isFirstInGroup && (
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                id={`message-author-${message.id}`}
                onClick={handleUserClick}
                className="font-medium text-discord-text-primary hover:underline cursor-pointer"
              >
                {message.authorName}
              </button>

              {/* ロールバッジ */}
              {message.authorRole && (
                <RoleBadge
                  role={message.authorRole}
                  color="primary"
                  size="xs"
                />
              )}

              {/* タイムスタンプ */}
              {showTimestamp && (
                <MessageTimestamp
                  timestamp={message.timestamp}
                  format="relative"
                  className="text-xs"
                />
              )}

              {/* 送信状態インジケーター */}
              {isOwnMessage && message.optimisticStatus !== 'synced' && (
                <StatusIndicator
                  status={message.optimisticStatus}
                  enableRetry={message.optimisticStatus === 'failed'}
                  onRetry={onRetry}
                />
              )}
            </div>
          )}

          {/* メッセージ内容 */}
          <div
            id={`message-content-${message.id}`}
            className="text-discord-text-primary break-words"
            dangerouslySetInnerHTML={renderMessageContent}
          />

          {/* 添付ファイル */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => {
                const Icon = getAttachmentIcon(attachment);
                const isImage = attachment.type.startsWith('image/');

                return (
                  <div
                    key={index}
                    className={cn(
                      "border border-discord-bg-secondary rounded-lg overflow-hidden",
                      isImage ? "max-w-md" : "max-w-sm"
                    )}
                  >
                    {isImage ? (
                      // 画像プレビュー
                      <button
                        type="button"
                        onClick={() => onAttachmentClick?.(attachment)}
                        className="block w-full hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-auto max-h-96 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      // ファイル表示
                      <div className="flex items-center gap-3 p-3 bg-discord-bg-secondary">
                        <Icon
                          size={32}
                          className="text-discord-text-secondary shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-discord-text-primary truncate">
                            {attachment.name}
                          </p>
                          <p className="text-sm text-discord-text-secondary">
                            {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => onAttachmentClick?.(attachment)}
                            className="p-1 rounded hover:bg-discord-bg-tertiary transition-colors"
                            aria-label="ファイルを開く"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(attachment.url, '_blank')}
                            className="p-1 rounded hover:bg-discord-bg-tertiary transition-colors"
                            aria-label="ファイルをダウンロード"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* リアクション表示 */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onAddReaction?.(reaction.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                    "border border-discord-bg-secondary",
                    "hover:bg-discord-bg-secondary transition-colors",
                    reaction.users?.includes(currentUserId || '') &&
                    "bg-discord-accent-primary bg-opacity-20 border-discord-accent-primary"
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-discord-text-secondary">
                    {reaction.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* アクションボタン（ホバー時表示） */}
        {showActions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <div className="flex items-center gap-1 bg-discord-bg-primary border border-discord-bg-secondary rounded shadow-lg p-1">
              {/* 返信 */}
              <button
                type="button"
                onClick={onReply}
                className="p-1 rounded hover:bg-discord-bg-secondary transition-colors"
                aria-label="返信"
              >
                <Reply size={16} />
              </button>

              {/* 編集（自分のメッセージのみ） */}
              {isOwnMessage && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1 rounded hover:bg-discord-bg-secondary transition-colors"
                  aria-label="編集"
                >
                  <Edit3 size={16} />
                </button>
              )}

              {/* コピー */}
              <button
                type="button"
                onClick={onCopy}
                className="p-1 rounded hover:bg-discord-bg-secondary transition-colors"
                aria-label="コピー"
              >
                <Copy size={16} />
              </button>

              {/* その他のメニュー */}
              <button
                type="button"
                className="p-1 rounded hover:bg-discord-bg-secondary transition-colors"
                aria-label="その他の操作"
              >
                <MoreHorizontal size={16} />
              </button>

              {/* 削除（自分のメッセージのみ） */}
              {isOwnMessage && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1 rounded hover:bg-red-600 transition-colors text-red-400 hover:text-white"
                  aria-label="削除"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* エラー状態の表示 */}
      {message.optimisticStatus === 'failed' && (
        <div className="mt-2 flex items-center gap-2 text-discord-danger text-sm">
          <AlertCircle size={16} />
          <span>メッセージの送信に失敗しました</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="underline hover:no-underline"
            >
              再試行
            </button>
          )}
        </div>
      )}
    </div>
  );
};

MessageItemPresenter.displayName = 'MessageItemPresenter';

// =============================================================================
// Export
// =============================================================================

export type { MessageItemPresenterProps };