/**
 * MessageInput - メッセージ入力コンポーネント
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatMessage, MessageFormData, ChannelId, UserId } from '../types';
import { Send, Paperclip, Smile, X, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  channelId: ChannelId;
  currentUserId?: UserId;
  currentUserName?: string;
  currentUserRole?: string;
  onSendMessage: (data: MessageFormData) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  currentUserId,
  currentUserName,
  currentUserRole,
  onSendMessage,
  onTyping,
  placeholder = 'メッセージを入力...',
  disabled = false,
  replyTo,
  onCancelReply,
  className,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // テキストエリアの高さ自動調整
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // 最大200px
    textarea.style.height = `${newHeight}px`;
  }, []);

  // メッセージ送信
  const handleSend = useCallback(() => {
    if (!content.trim() && attachments.length === 0) return;
    if (disabled) return;

    const messageData: MessageFormData = {
      content: content.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      replyTo: replyTo ? {
        messageId: replyTo.id,
        content: replyTo.content,
        authorName: replyTo.authorName,
      } : undefined,
    };

    onSendMessage(messageData);
    setContent('');
    setAttachments([]);
    onCancelReply?.();

    // テキストエリアの高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // タイピング状態をリセット
    onTyping?.(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [content, attachments, disabled, replyTo, onSendMessage, onCancelReply, onTyping]);

  // キーボードイベント
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 入力変更
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    adjustTextareaHeight();

    // タイピング状態の通知
    if (onTyping) {
      onTyping(newContent.length > 0);

      // 3秒後にタイピング状態を解除
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // 10MB制限
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} は10MBを超えているため添付できません。`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 添付ファイル削除
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // メンション入力の処理（簡易版）
  const handleMentionInput = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      // TODO: メンション候補の表示
    }
  };

  // コンポーネントのアンマウント時にタイピング状態をクリア
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
    };
  }, [onTyping]);

  // チャンネル変更時にクリア
  useEffect(() => {
    setContent('');
    setAttachments([]);
    onCancelReply?.();
  }, [channelId, onCancelReply]);

  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '😊'];

  return (
    <div className={cn('border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800', className)}>
      {/* 返信プレビュー */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <Reply className="w-4 h-4 inline mr-1" />
                {replyTo.authorName} への返信
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200 truncate mt-1">
                {replyTo.content}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* 添付ファイル */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2"
              >
                <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-40">
                  {file.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({(file.size / 1024).toFixed(1)}KB)
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* メイン入力エリア */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* ファイル添付ボタン */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="ファイルを添付"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* テキスト入力 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleMentionInput}
              placeholder={disabled ? '入力できません' : placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed placeholder:text-gray-400 dark:placeholder:text-gray-500"
              style={{ minHeight: '40px', maxHeight: '200px' }}
            />

            {/* 絵文字ピッカーボタン */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              className="absolute top-1/2 -translate-y-1/2 right-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="絵文字"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* 絵文字ピッカー */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 z-10">
                <div className="grid grid-cols-4 gap-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setContent(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <span className="text-lg">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={disabled || (!content.trim() && attachments.length === 0)}
            className="flex-shrink-0 h-[40px] w-[40px] flex items-center justify-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
            title="送信 (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />
    </div>
  );
};

export default MessageInput;