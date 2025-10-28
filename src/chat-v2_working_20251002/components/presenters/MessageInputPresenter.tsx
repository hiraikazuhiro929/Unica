import React, { useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Send,
  Smile,
  Paperclip,
  X,
  Image as ImageIcon,
  File,
  Loader2,
} from 'lucide-react';
import { Badge, StatusIndicator } from '../shared';
import type { ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// MessageInputPresenter Component - Discord風メッセージ入力
// =============================================================================

interface MessageInputPresenterProps {
  /** 入力値 */
  value: string;
  /** 入力変更ハンドラー */
  onChange: (value: string) => void;
  /** 送信ハンドラー */
  onSend: () => void;
  /** 添付ファイル */
  attachments: ChatAttachment[];
  /** 添付ファイル追加ハンドラー */
  onAddAttachment: (files: FileList) => void;
  /** 添付ファイル削除ハンドラー */
  onRemoveAttachment: (index: number) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 送信中状態 */
  isSending?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** 最大文字数 */
  maxLength?: number;
  /** 複数行入力を許可するか */
  multiline?: boolean;
  /** 返信対象のメッセージ */
  replyTo?: {
    id: string;
    authorName: string;
    content: string;
  } | null;
  /** 返信キャンセルハンドラー */
  onCancelReply?: () => void;
  /** タイピング状態 */
  isTyping?: boolean;
  /** タイピング開始ハンドラー */
  onStartTyping?: () => void;
  /** タイピング停止ハンドラー */
  onStopTyping?: () => void;
  /** エラーメッセージ */
  error?: string;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * Discord風メッセージ入力コンポーネント
 *
 * 特徴:
 * - Discord風デザイン
 * - 添付ファイル対応
 * - 返信機能
 * - タイピングインジケーター
 * - 文字数制限
 * - キーボードショートカット
 */
export const MessageInputPresenter: React.FC<MessageInputPresenterProps> = ({
  value,
  onChange,
  onSend,
  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  placeholder = "メッセージを入力...",
  isSending = false,
  disabled = false,
  maxLength = 2000,
  multiline = true,
  replyTo,
  onCancelReply,
  isTyping = false,
  onStartTyping,
  onStopTyping,
  error,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 送信可能状態の判定
  const canSend = useMemo(() => {
    const hasContent = value.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    return (hasContent || hasAttachments) && !isSending && !disabled;
  }, [value, attachments.length, isSending, disabled]);

  // 文字数の計算
  const characterCount = value.length;
  const isOverLimit = characterCount > maxLength;

  // テキストエリアの高さ自動調整
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !multiline) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // 最大120px
    textarea.style.height = `${newHeight}px`;
  }, [multiline]);

  // 入力変更処理
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // 文字数制限チェック
    if (newValue.length > maxLength) {
      return;
    }

    onChange(newValue);
    adjustTextareaHeight();

    // タイピング状態の管理
    if (newValue.length > 0 && !isTyping) {
      onStartTyping?.();
    } else if (newValue.length === 0 && isTyping) {
      onStopTyping?.();
    }
  }, [onChange, maxLength, adjustTextareaHeight, isTyping, onStartTyping, onStopTyping]);

  // キーボードイベント処理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey && multiline) {
        // Shift+Enter: 改行
        return;
      } else {
        // Enter: 送信
        e.preventDefault();
        if (canSend) {
          onSend();
        }
      }
    }

    if (e.key === 'Escape' && replyTo) {
      // Escape: 返信キャンセル
      onCancelReply?.();
    }
  }, [canSend, onSend, multiline, replyTo, onCancelReply]);

  // 送信処理
  const handleSend = useCallback(() => {
    if (canSend) {
      onSend();
    }
  }, [canSend, onSend]);

  // ファイル選択処理
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ファイル追加処理
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddAttachment(files);
      // ファイル入力をリセット
      e.target.value = '';
    }
  }, [onAddAttachment]);

  // 添付ファイルのアイコン取得
  const getAttachmentIcon = useCallback((attachment: ChatAttachment) => {
    if (attachment.type.startsWith('image/')) return ImageIcon;
    return File;
  }, []);

  // コンポーネントの初期化時に高さ調整
  React.useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  return (
    <div className={cn("bg-discord-bg-primary border-t border-discord-bg-secondary", className)}>
      {/* 返信プレビュー */}
      {replyTo && (
        <div className="px-4 py-2 bg-discord-bg-secondary border-l-4 border-discord-accent-primary">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-discord-text-secondary">
                {replyTo.authorName}への返信
              </p>
              <p className="text-sm text-discord-text-primary truncate">
                {replyTo.content}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="ml-2 p-1 rounded hover:bg-discord-bg-tertiary transition-colors"
              aria-label="返信をキャンセル"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 添付ファイルプレビュー */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-discord-bg-secondary">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => {
              const Icon = getAttachmentIcon(attachment);
              const isImage = attachment.type.startsWith('image/');

              return (
                <div
                  key={index}
                  className="relative group bg-discord-bg-secondary rounded-lg p-2 max-w-xs"
                >
                  {isImage && attachment.preview ? (
                    // 画像プレビュー
                    <div className="relative">
                      <img
                        src={attachment.preview}
                        alt={attachment.name}
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        aria-label="添付ファイルを削除"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    // ファイル表示
                    <div className="flex items-center gap-2">
                      <Icon size={20} className="text-discord-text-secondary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-discord-text-primary truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-discord-text-secondary">
                          {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(index)}
                        className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        aria-label="添付ファイルを削除"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* メイン入力エリア */}
      <div className="px-4 py-3">
        <div className={cn(
          "relative bg-discord-bg-secondary rounded-lg border transition-colors",
          "border-discord-bg-tertiary focus-within:border-discord-accent-primary",
          error && "border-red-500"
        )}>
          {/* テキスト入力 */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "w-full px-3 py-2 bg-transparent text-discord-text-primary placeholder-discord-text-muted resize-none",
              "focus:outline-none",
              !multiline && "h-10 overflow-hidden"
            )}
            rows={multiline ? 1 : undefined}
            style={{
              minHeight: multiline ? '40px' : undefined,
              maxHeight: multiline ? '120px' : undefined,
            }}
            aria-label="メッセージを入力"
            aria-describedby={error ? "message-input-error" : undefined}
          />

          {/* ボタン群 */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* 添付ファイルボタン */}
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={disabled || isSending}
              className="p-1.5 rounded hover:bg-discord-bg-tertiary transition-colors disabled:opacity-50"
              aria-label="ファイルを添付"
            >
              <Paperclip size={18} className="text-discord-text-secondary" />
            </button>

            {/* 絵文字ボタン */}
            <button
              type="button"
              disabled={disabled || isSending}
              className="p-1.5 rounded hover:bg-discord-bg-tertiary transition-colors disabled:opacity-50"
              aria-label="絵文字を追加"
            >
              <Smile size={18} className="text-discord-text-secondary" />
            </button>

            {/* 送信ボタン */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "p-1.5 rounded transition-colors",
                canSend
                  ? "bg-discord-accent-primary text-white hover:bg-discord-accent-hover"
                  : "bg-discord-bg-tertiary text-discord-text-muted cursor-not-allowed"
              )}
              aria-label="メッセージを送信"
            >
              {isSending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>

        {/* フッター情報 */}
        <div className="flex items-center justify-between mt-2">
          {/* エラーメッセージ */}
          {error && (
            <p id="message-input-error" className="text-red-400 text-sm">
              {error}
            </p>
          )}

          {/* 文字数カウンターとヒント */}
          <div className="ml-auto flex items-center gap-2">
            {/* 文字数カウンター */}
            {characterCount > maxLength * 0.8 && (
              <Badge
                variant={isOverLimit ? "danger" : "warning"}
                size="xs"
              >
                {characterCount}/{maxLength}
              </Badge>
            )}

            {/* キーボードヒント */}
            <span className="text-xs text-discord-text-muted">
              {multiline ? "Shift+Enter で改行" : "Enter で送信"}
            </span>
          </div>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

MessageInputPresenter.displayName = 'MessageInputPresenter';

// =============================================================================
// Export
// =============================================================================

export type { MessageInputPresenterProps };