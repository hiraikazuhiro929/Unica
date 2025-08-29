"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Smile,
  Reply,
  Edit,
  Trash2,
  Check,
  X,
  FileText,
} from "lucide-react";
import { MessageContent } from "./MessageContent";
import type { ChatMessage } from "@/lib/firebase/chat";

interface VirtualMessageListProps {
  messages: ChatMessage[];
  users: any[];
  currentUser: any;
  editingMessage: string | null;
  editingContent: string;
  showEmojiPicker: string | null;
  expandedImage: string | null;
  editInputRef: React.RefObject<HTMLTextAreaElement>;
  onEditingContentChange: (content: string) => void;
  onStartEdit: (message: { id: string; content: string }) => void;
  onCancelEdit: () => void;
  onEditMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onOpenThread: (message: ChatMessage) => void;
  onUserClick: (user: any) => void;
  onExpandImage: (url: string | null) => void;
  onToggleEmojiPicker: (messageId: string | null) => void;
  formatTimestamp: (timestamp: any) => string;
  formatFileSize: (bytes: number) => string;
  getPriorityColor: (priority?: string) => string;
  isCurrentUserMentioned: (message: ChatMessage) => boolean;
}

const EmojiPicker: React.FC<{
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}> = ({ onEmojiSelect, onClose }) => {
  const emojis = ["👍", "❤️", "😊", "😢", "😡", "👏", "🔥", "💯", "✅", "❌"];
  
  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-2 z-50">
      <div className="grid grid-cols-5 gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-lg"
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  users,
  currentUser,
  editingMessage,
  editingContent,
  showEmojiPicker,
  expandedImage,
  editInputRef,
  onEditingContentChange,
  onStartEdit,
  onCancelEdit,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onOpenThread,
  onUserClick,
  onExpandImage,
  onToggleEmojiPicker,
  formatTimestamp,
  formatFileSize,
  getPriorityColor,
  isCurrentUserMentioned,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 85, // Discordの実際の高さに近づける
    overscan: 5,
    measureElement: (element) => element?.getBoundingClientRect().height || 85,
  });

  // 新しいメッセージが追加されたときに自動スクロール
  useEffect(() => {
    if (!scrollingRef.current && messages.length > 0) {
      const lastItem = rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1];
      if (lastItem) {
        parentRef.current?.scrollTo({
          top: parentRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages.length]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-4 py-2 bg-white dark:bg-slate-800 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800"
      onScroll={() => {
        scrollingRef.current = true;
        setTimeout(() => {
          scrollingRef.current = false;
        }, 150);
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                className={`flex space-x-4 group px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 relative transition-colors ${getPriorityColor(message.priority)} ${
                  isCurrentUserMentioned(message)
                    ? 'bg-yellow-50/50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 pl-3'
                    : ''
                }`}
              >
                {/* アバター */}
                <div className="flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const author = users.find(u => u.name === message.authorName);
                      if (author) {
                        onUserClick(author);
                      }
                    }}
                  >
                    {message.authorName?.charAt(0) || "?"}
                  </div>
                </div>
                
                {/* メッセージ内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2 mb-1">
                    <span 
                      className="font-semibold text-base text-gray-900 dark:text-white hover:underline cursor-pointer"
                      onClick={() => {
                        const author = users.find(u => u.name === message.authorName);
                        if (author) {
                          onUserClick(author);
                        }
                      }}
                    >
                      {message.authorName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {message.authorRole}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.editedAt && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">(編集済み)</span>
                    )}
                  </div>
                  
                  {/* メッセージ内容 */}
                  {editingMessage === message.id ? (
                    <div className="space-y-2">
                      <Textarea
                        ref={editingMessage === message.id ? editInputRef : undefined}
                        value={editingContent}
                        onChange={(e) => onEditingContentChange(e.target.value)}
                        className="min-h-[60px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onEditMessage(message.id);
                          }
                          if (e.key === 'Escape') {
                            onCancelEdit();
                          }
                        }}
                      />
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => onEditMessage(message.id)}
                          disabled={!editingContent.trim()}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onCancelEdit}
                        >
                          <X className="w-3 h-3 mr-1" />
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-800 dark:text-slate-200 break-words">
                      {message.isDeleted ? (
                        <span className="text-gray-400 dark:text-slate-500 italic">このメッセージは削除されました</span>
                      ) : (
                        <MessageContent 
                          content={message.content} 
                          mentions={message.mentions}
                          users={users}
                          currentUserId={currentUser?.userId}
                          onUserClick={onUserClick}
                        />
                      )}
                    </div>
                  )}

                  {/* 添付ファイル */}
                  {message.attachments && message.attachments.length > 0 && !message.isDeleted && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600"
                        >
                          {attachment.type === 'image' ? (
                            <div
                              className="cursor-pointer"
                              onClick={() => onExpandImage(attachment.url)}
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="max-w-sm max-h-64 rounded border object-cover"
                              />
                            </div>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 text-blue-500" />
                              <div className="flex-1">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:underline"
                                >
                                  {attachment.name}
                                </a>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                  {formatFileSize(attachment.size)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* リアクション */}
                  {message.reactions && message.reactions.length > 0 && !message.isDeleted && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.reactions.map((reaction, index) => (
                        <button
                          key={index}
                          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full text-sm"
                          onClick={() => onAddReaction(message.id, reaction.emoji)}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-xs font-medium">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* メッセージアクション */}
                {!message.isDeleted && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-start space-x-1 transition-opacity">
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => onToggleEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                      >
                        <Smile className="w-3 h-3" />
                      </Button>
                      {showEmojiPicker === message.id && (
                        <EmojiPicker
                          onEmojiSelect={(emoji) => onAddReaction(message.id, emoji)}
                          onClose={() => onToggleEmojiPicker(null)}
                        />
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => onOpenThread(message)}
                    >
                      <Reply className="w-3 h-3" />
                    </Button>
                    {message.authorId === currentUser?.userId && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => onStartEdit(message)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => onDeleteMessage(message.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};