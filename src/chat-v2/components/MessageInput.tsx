/**
 * MessageInput - メッセージ入力コンポーネント
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChatMessage, MessageFormData, ChannelId, UserId, DirectMessageId } from '../types';
import { Send, Paperclip, Smile, X, Reply, Loader2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatUser, ChatAttachment } from '@/lib/firebase/chat';
import { uploadChatFile } from '@/lib/firebase/chat';
import chatService from '../services/chatService';
import dmService from '../services/dmService';

interface MessageInputProps {
  channelId?: ChannelId | null;
  dmId?: DirectMessageId | null;
  currentUserId?: UserId;
  currentUserName?: string;
  currentUserRole?: string;
  onSendMessage: (data: MessageFormData) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  availableUsers?: ChatUser[];
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  dmId,
  currentUserId,
  currentUserName,
  currentUserRole,
  onSendMessage,
  onTyping,
  placeholder = 'メッセージを入力...',
  disabled = false,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  availableUsers = [],
  className,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // 編集モード検出
  const isEditing = !!editingMessage;

  // 編集モード時の初期化
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      // テキストエリアにフォーカス
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [editingMessage]);

  // メンション候補のフィルタリング
  const mentionSuggestions = useMemo(() => {
    if (!showMentionSuggestions || !mentionQuery) return availableUsers;
    const query = mentionQuery.toLowerCase();
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.department.toLowerCase().includes(query)
    );
  }, [showMentionSuggestions, mentionQuery, availableUsers]);

  // テキストエリアの高さ自動調整
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // 最大200px
    textarea.style.height = `${newHeight}px`;
  }, []);

  // メンション挿入
  const insertMention = useCallback((user: ChatUser) => {
    if (mentionStart === null) return;

    const beforeMention = content.substring(0, mentionStart);
    const afterMention = content.substring(textareaRef.current?.selectionStart || content.length);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;

    setContent(newContent);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStart(null);
    setSelectedMentionIndex(0);

    // カーソル位置を@mentionの後に移動
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = beforeMention.length + user.name.length + 2;
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [content, mentionStart]);

  // メンション抽出（@username形式）
  const extractMentions = useCallback((text: string): UserId[] => {
    const mentionRegex = /@(\S+)/g;
    const mentions: UserId[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const user = availableUsers.find(u => u.name === mentionedName);
      if (user) {
        mentions.push(user.id);
      }
    }

    return mentions;
  }, [availableUsers]);

  // メッセージ送信
  const handleSend = useCallback(async () => {
    if (!content.trim() && attachments.length === 0) return;
    if (disabled || isUploading) return;
    if (!currentUserId) return;

    console.log('📤 [MessageInput] handleSend started', {
      isEditing,
      contentLength: content.length,
      attachmentsCount: attachments.length
    });

    try {
      setIsUploading(true);

      // 編集モードの場合
      if (isEditing && editingMessage) {
        console.log('📝 [MessageInput] Editing message:', editingMessage.id);

        // DM対応
        if (dmId) {
          const result = await dmService.updateDMMessage(dmId, editingMessage.id, content.trim());

          if (result.error) {
            console.error('❌ [MessageInput] DM edit error:', result.error);
            throw new Error(result.error);
          }

          console.log('✅ [MessageInput] DM message edited successfully');
        } else {
          // チャンネルメッセージ
          const result = await chatService.updateMessage(editingMessage.id, content.trim());

          if (result.error) {
            console.error('❌ [MessageInput] Edit error:', result.error);
            throw new Error(result.error);
          }

          console.log('✅ [MessageInput] Message edited successfully');
        }

        // 編集成功後のクリーンアップ
        setContent('');
        onCancelEdit?.();

        // テキストエリアの高さをリセット
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }

        return;
      }

      // 通常の送信モード
      // ファイルをアップロード
      let uploadedAttachments: ChatAttachment[] | undefined;
      if (attachments.length > 0) {
        console.log('📎 [MessageInput] Uploading files...', attachments.length);
        const uploadResults = await Promise.all(
          attachments.map(async (file, index) => {
            console.log(`📎 [MessageInput] Uploading file ${index + 1}/${attachments.length}: ${file.name}`);
            setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

            const result = await uploadChatFile(file, currentUserId, channelId);
            console.log(`📎 [MessageInput] Upload result for ${file.name}:`, {
              hasUrl: !!result.url,
              hasAttachment: !!result.attachment,
              error: result.error
            });

            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

            if (result.error) {
              console.error(`❌ [MessageInput] Upload error for ${file.name}:`, result.error);
              throw new Error(`${file.name}: ${result.error}`);
            }

            if (!result.attachment) {
              console.error(`❌ [MessageInput] No attachment returned for ${file.name}`);
              throw new Error(`${file.name}: アップロードに失敗しました（添付ファイルが取得できませんでした）`);
            }

            return result.attachment;
          })
        );
        uploadedAttachments = uploadResults.filter((att): att is ChatAttachment => att !== null);
        console.log('✅ [MessageInput] All files uploaded successfully:', uploadedAttachments.length);
      }

      const mentions = extractMentions(content);

      const messageData: MessageFormData = {
        content: content.trim(),
        attachments: uploadedAttachments,
        mentions: mentions.length > 0 ? mentions : undefined,
        replyTo: replyTo ? {
          messageId: replyTo.id,
          content: replyTo.content,
          authorName: replyTo.authorName,
        } : undefined,
      };

      console.log('📤 [MessageInput] Sending message...', {
        hasContent: !!messageData.content,
        attachmentsCount: messageData.attachments?.length || 0,
        mentionsCount: messageData.mentions?.length || 0
      });

      onSendMessage(messageData);

      // 送信成功後のクリーンアップ
      setContent('');
      setAttachments([]);
      setUploadProgress({});
      onCancelReply?.();
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStart(null);

      // テキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // タイピング状態をリセット
      onTyping?.(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      console.log('✅ [MessageInput] Message sent successfully');
    } catch (error) {
      console.error('❌ [MessageInput] Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'メッセージの送信に失敗しました');
    } finally {
      console.log('🔄 [MessageInput] Resetting isUploading to false');
      setIsUploading(false);
    }
  }, [content, attachments, disabled, isUploading, currentUserId, channelId, replyTo, isEditing, editingMessage, onSendMessage, onCancelReply, onCancelEdit, onTyping, extractMentions]);

  // キーボードイベント
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // メンション候補が表示されている場合
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionSuggestions[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStart(null);
        return;
      }
    }

    // 通常の送信
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 入力変更
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newContent);
    adjustTextareaHeight();

    // @の検出とメンション候補表示
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      // @の後にスペースがない場合、メンション候補を表示
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStart(lastAtSymbol);
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionSuggestions(false);
        setMentionStart(null);
      }
    } else {
      setShowMentionSuggestions(false);
      setMentionStart(null);
    }

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
      // 1MB制限（Firebase無料プラン - Base64保存のため）
      if (file.size > 1 * 1024 * 1024) {
        alert(`${file.name} は1MBを超えているため添付できません（Firebase無料プランの制限）。`);
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
      {/* 編集プレビュー */}
      {editingMessage && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                <Edit className="w-4 h-4 inline mr-1" />
                メッセージを編集中
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200 truncate mt-1">
                {editingMessage.content}
              </div>
            </div>
            <button
              onClick={onCancelEdit}
              className="ml-2 p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* 返信プレビュー */}
      {replyTo && !editingMessage && (
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
              placeholder={disabled ? '入力できません' : isEditing ? 'メッセージを編集...' : placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed placeholder:text-gray-400 dark:placeholder:text-gray-500"
              style={{ minHeight: '40px', maxHeight: '200px' }}
            />

            {/* メンション候補ドロップダウン */}
            {showMentionSuggestions && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                <div className="py-2">
                  <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    メンション候補
                  </div>
                  {mentionSuggestions.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left',
                        index === selectedMentionIndex && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      {/* アバター */}
                      <div className="relative flex-shrink-0">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* オンラインステータス */}
                        {user.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 bg-green-500" />
                        )}
                      </div>

                      {/* ユーザー情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-400 truncate">
                          {user.department}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
            disabled={disabled || isUploading || (!content.trim() && attachments.length === 0)}
            className={cn(
              "flex-shrink-0 h-[40px] w-[40px] flex items-center justify-center text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isEditing
                ? "bg-amber-500 hover:bg-amber-600 disabled:hover:bg-amber-500"
                : "bg-blue-500 hover:bg-blue-600 disabled:hover:bg-blue-500"
            )}
            title={isUploading ? "アップロード中..." : isEditing ? "更新 (Enter)" : "送信 (Enter)"}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isEditing ? (
              <Edit className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
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