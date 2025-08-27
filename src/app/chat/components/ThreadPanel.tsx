"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  X,
  Send,
  Hash,
  MessageCircle,
  Users,
  Clock,
  Reply,
  Paperclip,
  Smile,
  MoreHorizontal
} from "lucide-react";
import type { ChatMessage, ChatUser, ChatAttachment } from "@/lib/firebase/chat";

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: ChatMessage | null;
  threadMessages: ChatMessage[];
  users: ChatUser[];
  currentUser: ChatUser;
  onSendReply: (content: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  onUploadFile?: (file: File) => Promise<ChatAttachment | null>;
  channelName?: string;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  isOpen,
  onClose,
  parentMessage,
  threadMessages,
  users,
  currentUser,
  onSendReply,
  onUploadFile,
  channelName,
}) => {
  const [replyContent, setReplyContent] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // スクロール制御
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages]);

  // 返信送信
  const handleSendReply = async () => {
    if (!replyContent.trim() && uploadingFiles.length === 0) return;
    
    setIsLoading(true);
    try {
      const attachments: ChatAttachment[] = [];
      
      // ファイルアップロード処理
      if (onUploadFile && uploadingFiles.length > 0) {
        for (const file of uploadingFiles) {
          const attachment = await onUploadFile(file);
          if (attachment) {
            attachments.push(attachment);
          }
        }
      }
      
      const success = await onSendReply(replyContent, attachments);
      if (success) {
        setReplyContent("");
        setUploadingFiles([]);
      }
    } catch (error) {
      console.error('返信送信エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ファイル選択
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(prev => [...prev, ...files]);
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 時刻フォーマット
  const formatTimestamp = (timestamp: any): string => {
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ユーザーのアバター取得
  const getUserAvatar = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name?.charAt(0)?.toUpperCase() || "?";
  };

  // 参加者を取得
  const getThreadParticipants = () => {
    const participantIds = new Set<string>();
    if (parentMessage) participantIds.add(parentMessage.authorId);
    
    threadMessages.forEach(msg => {
      participantIds.add(msg.authorId);
    });
    
    return Array.from(participantIds).map(id => users.find(u => u.id === id)).filter(Boolean) as ChatUser[];
  };

  const participants = getThreadParticipants();

  if (!isOpen || !parentMessage) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-sm">スレッド</h3>
            <p className="text-xs text-gray-600">
              #{channelName || 'チャンネル'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 親メッセージ */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
            {getUserAvatar(parentMessage.authorId)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-sm">{parentMessage.authorName}</span>
              <Badge variant="secondary" className="text-xs">
                {parentMessage.authorRole}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTimestamp(parentMessage.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-800 break-words">
              {parentMessage.content}
            </p>
            
            {/* 親メッセージの添付ファイル */}
            {parentMessage.attachments && parentMessage.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {parentMessage.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-2 p-1 bg-white rounded text-xs">
                    <Paperclip className="w-3 h-3 text-gray-400" />
                    <span className="truncate">{attachment.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* スレッド統計 */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Reply className="w-3 h-3" />
              <span>{threadMessages.length}件の返信</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{participants.length}名が参加</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>最後の返信: {threadMessages.length > 0 ? formatTimestamp(threadMessages[threadMessages.length - 1].timestamp) : '--'}</span>
          </div>
        </div>
      </div>

      {/* 参加者リスト */}
      {participants.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">参加者:</span>
            <div className="flex -space-x-1">
              {participants.slice(0, 5).map((participant) => (
                <div
                  key={participant.id}
                  className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs border-2 border-white"
                  title={participant.name}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {participants.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs border-2 border-white">
                  +{participants.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* スレッドメッセージ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {threadMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">まだ返信がありません</p>
            <p className="text-xs">このメッセージにスレッドで返信してください</p>
          </div>
        ) : (
          threadMessages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3 group">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                {getUserAvatar(message.authorId)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">{message.authorName}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 break-words">
                  {message.content}
                </p>
                
                {/* 添付ファイル */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-100 rounded text-xs">
                        <Paperclip className="w-3 h-3 text-gray-400" />
                        <span className="flex-1 truncate">{attachment.name}</span>
                        {attachment.type === 'image' && (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* メッセージアクション（自分のメッセージの場合） */}
              {message.authorId === currentUser.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* アップロード中のファイル表示 */}
      {uploadingFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 space-y-1">
          <p className="text-xs text-gray-600">アップロード予定:</p>
          {uploadingFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-1 bg-gray-100 rounded text-xs">
              <span className="truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeUploadingFile(index)}
                className="h-4 w-4 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 返信入力 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Input
              placeholder="スレッドで返信..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              disabled={isLoading}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFileSelect}
            disabled={isLoading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
          >
            <Smile className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSendReply}
            disabled={(!replyContent.trim() && uploadingFiles.length === 0) || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFilesSelected}
        />
      </div>
    </div>
  );
};