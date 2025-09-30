/**
 * MessageItem - Discord風メッセージコンポーネント
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserId } from '../types';
import UnifiedTimestamp from '../core/UnifiedTimestamp';
import {
  User,
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Heart,
  ThumbsUp,
  Smile,
  Copy,
  Pin
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: UserId;
  previousMessage?: ChatMessage;
  nextMessage?: ChatMessage;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  showAvatar?: boolean;
  isCompact?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  previousMessage,
  nextMessage,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  showAvatar = true,
  isCompact = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // 同じユーザーの連続メッセージかどうか
  const isContinuation = previousMessage?.authorId === message.authorId &&
    !isCompact &&
    previousMessage &&
    UnifiedTimestamp.compare(message.timestamp, previousMessage.timestamp) < 5 * 60 * 1000; // 5分以内

  // 時刻表示
  const timeString = UnifiedTimestamp.formatMessageTime(message.timestamp);
  const detailTimeString = UnifiedTimestamp.formatDetailTime(message.timestamp);

  // メンション検出
  const hasMention = message.mentions?.some(mention =>
    mention === currentUserId || mention === 'everyone' || mention === 'here'
  );

  // メッセージのタイプに応じたスタイル
  const getMessageStyle = () => {
    if (message.isDeleted) return 'opacity-60 italic';
    if (message.type === 'system') return 'text-gray-500 italic text-sm';
    if (hasMention) return 'bg-yellow-50 border-l-2 border-yellow-400 pl-2';
    return '';
  };

  // ステータスアイコン
  const getStatusIndicator = () => {
    if (message.status === 'sending') {
      return <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />;
    }
    if (message.status === 'failed') {
      return <div className="w-1 h-1 bg-red-500 rounded-full" />;
    }
    return null;
  };

  // リアクション処理
  const handleReaction = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setShowReactionPicker(false);
  };

  // メンション表示の処理
  const renderMessageContent = (content: string) => {
    if (!message.mentions || message.mentions.length === 0) {
      return content;
    }

    let formattedContent = content;
    message.mentions.forEach(mention => {
      if (mention === 'everyone' || mention === 'here') {
        formattedContent = formattedContent.replace(
          new RegExp(`@${mention}`, 'g'),
          `<span class="bg-blue-100 text-blue-800 px-1 rounded font-medium">@${mention}</span>`
        );
      } else {
        // ユーザー名のメンションも同様に処理
        formattedContent = formattedContent.replace(
          new RegExp(`@${mention}`, 'g'),
          `<span class="bg-blue-100 text-blue-800 px-1 rounded font-medium">@${mention}</span>`
        );
      }
    });

    return <span dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  const commonReactions = ['👍', '❤️', '😄', '😮', '😢', '😡'];

  return (
    <div
      ref={messageRef}
      className={cn(
        'group relative flex gap-3 px-4 py-0 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors',
        isContinuation && !isCompact ? 'mt-0' : 'mt-0',
        getMessageStyle()
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      {/* アバター */}
      <div className="flex-shrink-0 w-10 self-start pt-0.5">
        {showAvatar && !isContinuation ? (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {message.authorAvatar ? (
              <img
                src={message.authorAvatar}
                alt={message.authorName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              message.authorName.charAt(0).toUpperCase()
            )}
          </div>
        ) : (
          <div className="w-10 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-gray-400 dark:text-gray-500">{timeString}</span>
          </div>
        )}
      </div>

      {/* メッセージコンテンツ */}
      <div className="flex-1 min-w-0">
        {/* ヘッダー（初回メッセージのみ） */}
        {!isContinuation && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              {message.authorName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
              {message.authorRole}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500" title={detailTimeString}>
              {timeString}
            </span>
            {message.editedAt && (
              <span className="text-xs text-gray-400">
                (編集済み)
              </span>
            )}
          </div>
        )}

        {/* メッセージ本文 */}
        <div className={cn(
          'text-gray-800 dark:text-gray-200 leading-[1.375]',
          isCompact ? 'text-sm' : 'text-base'
        )}>
          {message.replyTo && (
            <div className="mb-2 pl-2 border-l-2 border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-400">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {message.replyTo.authorName} への返信
              </div>
              <div className="truncate">
                {message.replyTo.content}
              </div>
            </div>
          )}

          {message.isDeleted ? (
            <span className="text-gray-500 dark:text-gray-400 italic">削除されたメッセージ</span>
          ) : (
            renderMessageContent(message.content)
          )}

          {/* ステータスインジケーター */}
          {getStatusIndicator() && (
            <span className="ml-2 inline-flex items-center">
              {getStatusIndicator()}
            </span>
          )}
        </div>

        {/* 添付ファイル */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-slate-700 rounded-md">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {attachment.type === 'image' ? '🖼️' : '📎'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* リアクション */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors',
                  reaction.users.includes(currentUserId!)
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                )}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* スレッド情報 */}
        {message.isThread && message.threadCount && message.threadCount > 0 && (
          <div className="mt-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
            {message.threadCount}件の返信
          </div>
        )}
      </div>

      {/* アクションボタン */}
      {showActions && !message.isDeleted && (
        <div className="absolute right-4 top-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md shadow-sm flex">
          <button
            onClick={() => handleReaction('👍')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="いいね"
          >
            <ThumbsUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>

          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="返信"
            >
              <Reply className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="リアクション"
          >
            <Smile className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="relative">
            <button
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="その他"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            {/* ドロップダウンメニュー（実装予定） */}
          </div>
        </div>
      )}

      {/* リアクションピッカー */}
      {showReactionPicker && (
        <div className="absolute right-4 top-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md shadow-lg p-2 flex gap-1 z-10">
          {commonReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              title={`${emoji} リアクション`}
            >
              <span className="text-lg">{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageItem;