/**
 * ThreadPanel - スレッド表示パネルコンポーネント
 */

import React, { useEffect, useState } from 'react';
import { ChatMessage, MessageFormData, UserId } from '../types';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import chatService from '../services/chatService';
import { X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatUser } from '@/lib/firebase/chat';

interface ThreadPanelProps {
  parentMessage: ChatMessage;
  currentUserId?: UserId;
  currentUserName?: string;
  currentUserRole?: string;
  onSendMessage: (data: MessageFormData) => void;
  onClose: () => void;
  users?: ChatUser[];
  className?: string;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  parentMessage,
  currentUserId,
  currentUserName,
  currentUserRole,
  onSendMessage,
  onClose,
  users = [],
  className,
}) => {
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);

  // スレッドメッセージをリアルタイム監視
  useEffect(() => {
    const unsubscribe = chatService.subscribeToThread(
      parentMessage.id,
      (messages) => {
        setThreadMessages(messages);
      }
    );

    return () => unsubscribe();
  }, [parentMessage.id]);

  // スレッド内メッセージ送信ハンドラー
  const handleThreadSend = (data: MessageFormData) => {
    // parentMessageIdを追加してスレッド返信として送信
    onSendMessage({
      ...data,
      parentMessageId: parentMessage.id,
    });
  };

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full w-[480px] bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 shadow-xl flex flex-col z-40',
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            スレッド
          </h2>
          {threadMessages.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {threadMessages.length}件の返信
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="スレッドを閉じる"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* 親メッセージ */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <MessageItem
          message={parentMessage}
          currentUserId={currentUserId}
          users={users}
          showAvatar={true}
          isCompact={false}
        />
      </div>

      {/* スレッドメッセージ一覧 */}
      <div className="flex-1 overflow-y-auto">
        {threadMessages.length > 0 ? (
          <div className="py-4">
            {threadMessages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                previousMessage={index > 0 ? threadMessages[index - 1] : undefined}
                nextMessage={index < threadMessages.length - 1 ? threadMessages[index + 1] : undefined}
                users={users}
                showAvatar={true}
                isCompact={false}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">まだ返信がありません</p>
            <p className="text-xs mt-1">最初の返信を送信してください</p>
          </div>
        )}
      </div>

      {/* メッセージ入力 */}
      <div className="border-t border-gray-200 dark:border-slate-700">
        <MessageInput
          channelId={parentMessage.channelId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          onSendMessage={handleThreadSend}
          placeholder={`${parentMessage.authorName}のスレッドに返信...`}
          availableUsers={users}
        />
      </div>
    </div>
  );
};

export default ThreadPanel;
