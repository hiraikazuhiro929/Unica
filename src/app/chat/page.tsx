"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Hash,
  Plus,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Users,
  Settings,
  Volume2,
  VolumeX,
  Search,
  Bell,
  BellOff,
  Phone,
  Video,
  Pin,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  MessageSquare,
  AlertTriangle,
  Clock,
  Building2,
  Wrench,
  CheckCircle,
  UserPlus,
  Calendar,
  FileText,
  Image,
  Zap,
  Upload,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { useChat } from "./hooks/useChat";
import type { ChatAttachment } from "@/lib/firebase/chat";
import { initializeChatData } from "@/lib/firebase/initChatData";

// 型定義とユーザー情報
const AVAILABLE_USERS = [
  {
    userId: "user-tanaka",
    userName: "田中作業員", 
    userRole: "作業員",
    userDepartment: "生産部",
    userEmail: "tanaka@company.com",
  },
  {
    userId: "user-sato",
    userName: "佐藤班長",
    userRole: "班長", 
    userDepartment: "生産部",
    userEmail: "sato@company.com",
  },
  {
    userId: "user-suzuki",
    userName: "鈴木品質管理者",
    userRole: "品質管理者",
    userDepartment: "品質管理部", 
    userEmail: "suzuki@company.com",
  },
  {
    userId: "user-yamada",
    userName: "山田保全担当",
    userRole: "保全担当",
    userDepartment: "設備保全部",
    userEmail: "yamada@company.com",
  },
  {
    userId: "user-watanabe",
    userName: "渡辺部長",
    userRole: "部長",
    userDepartment: "生産部", 
    userEmail: "watanabe@company.com",
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const emojis = ["👍", "❤️", "😊", "😢", "😡", "👏", "🔥", "💯", "✅", "❌"];
  
  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
      <div className="grid grid-cols-5 gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            className="p-2 hover:bg-gray-100 rounded text-lg"
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

interface FileDropZoneProps {
  onFilesDrop: (files: File[]) => void;
  children: React.ReactNode;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ onFilesDrop, children }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesDrop(files);
  }, [onFilesDrop]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <p className="text-blue-700 font-medium">ファイルをドロップしてアップロード</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

const DiscordLikeChat = () => {
  // ユーザー選択状態
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const currentUser = AVAILABLE_USERS[selectedUserIndex];

  // Firebase連携フック
  const {
    channels,
    messages,
    users,
    currentChannel,
    isLoading,
    error,
    selectChannel,
    sendNewMessage,
    editMessage,
    removeMessage,
    uploadFile,
    addReaction,
    updateStatus,
    markAsRead,
    getUnreadCount,
    getOnlineUsers,
    getCurrentUser,
  } = useChat(currentUser);

  // ローカル状態
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserList, setShowUserList] = useState(true);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // 計算された値
  const onlineUsers = getOnlineUsers();
  const firebaseCurrentUser = getCurrentUser();

  // ハンドラー関数
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !currentChannel) return;

    // 先に入力をクリアして即座にUI更新
    const messageToSend = messageInput;
    setMessageInput("");

    const attachments: ChatAttachment[] = [];
    
    // アップロード中のファイルがある場合は処理
    if (uploadingFiles.length > 0) {
      for (const file of uploadingFiles) {
        const attachment = await uploadFile(file);
        if (attachment) {
          attachments.push(attachment);
        }
      }
      setUploadingFiles([]);
    }

    const success = await sendNewMessage(messageToSend, attachments);
    if (!success) {
      // 送信失敗時は入力を復元
      setMessageInput(messageToSend);
    }
  }, [messageInput, currentChannel, uploadingFiles, sendNewMessage, uploadFile]);

  const handleFileAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingFiles(prev => [...prev, ...files]);
  }, []);

  const handleFilesDrop = useCallback((files: File[]) => {
    handleFilesSelected(files);
  }, [handleFilesSelected]);

  const handleRemoveUploadingFile = useCallback((index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji);
    setShowEmojiPicker(null);
  }, [addReaction]);

  const handleEditMessage = useCallback(async (messageId: string) => {
    if (!editingContent.trim()) return;
    
    const success = await editMessage(messageId, editingContent);
    if (success) {
      setEditingMessage(null);
      setEditingContent("");
    }
  }, [editingContent, editMessage]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (window.confirm("このメッセージを削除しますか？")) {
      await removeMessage(messageId);
    }
  }, [removeMessage]);

  const handleStartEdit = useCallback((message: { id: string; content: string }) => {
    setEditingMessage(message.id);
    setEditingContent(message.content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditingContent("");
  }, []);

  const handleChannelSelect = useCallback((channelId: string) => {
    selectChannel(channelId);
  }, [selectChannel]);

  const handleStatusUpdate = useCallback(async (status: string) => {
    await updateStatus(status);
  }, [updateStatus]);

  // ユーティリティ関数
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  }, []);

  const getChannelIcon = useCallback((channel: { type: string }) => {
    switch (channel.type) {
      case "announcement":
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case "voice":
        return <Volume2 className="w-4 h-4 text-green-500" />;
      default:
        return <Hash className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  const getPriorityColor = useCallback((priority?: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-red-500 bg-red-50";
      case "high":
        return "border-l-4 border-orange-500 bg-orange-50";
      case "normal":
        return "";
      case "low":
        return "border-l-4 border-gray-300";
      default:
        return "";
    }
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTimestamp = useCallback((timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("ja-JP", { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // ユーザー選択ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserSelector) {
        const target = event.target as Element;
        if (!target.closest('[data-user-selector]')) {
          setShowUserSelector(false);
        }
      }
    };

    if (showUserSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserSelector]);

  // 初期データ作成
  useEffect(() => {
    const initData = async () => {
      if (channels.length === 0 && !isLoading) {
        console.log('🚀 初期データを作成中...');
        const result = await initializeChatData();
        if (result.success) {
          console.log('✅ 初期データ作成完了');
        } else {
          console.error('❌ 初期データ作成失敗:', result.error);
        }
      }
    };
    
    initData();
  }, [channels.length, isLoading]);

  // エフェクト
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (editingMessage && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessage]);

  // ローディング状態
  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center ml-0 md:ml-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">チャットを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <FileDropZone onFilesDrop={handleFilesDrop}>
      <div className="h-screen bg-white flex ml-0 md:ml-16">
        {/* エラー表示 */}
        {error && (
          <div className="absolute top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* チャンネルサイドバー */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg hidden md:flex">
          {/* サーバーヘッダー */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Unica製造チーム</h2>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{onlineUsers.length}人がオンライン</p>
          </div>

          {/* チャンネルリスト */}
          <div className="flex-1 overflow-y-auto p-2">
            {Object.entries(
              channels.reduce((acc, channel) => {
                const category = channel.category || "その他";
                if (!acc[category]) acc[category] = [];
                acc[category].push(channel);
                return acc;
              }, {} as Record<string, unknown[]>)
            ).map(([category, categoryChannels]) => (
              <div key={category} className="mb-4">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <span>{category}</span>
                  <Plus className="w-3 h-3 hover:text-gray-700 cursor-pointer" />
                </div>
                {categoryChannels.map((channel) => {
                  const unreadCount = getUnreadCount(channel.id);
                  return (
                    <button
                      key={channel.id}
                      className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-gray-100 transition-colors ${
                        currentChannel?.id === channel.id ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700"
                      }`}
                      onClick={() => handleChannelSelect(channel.id)}
                    >
                      {getChannelIcon(channel)}
                      <span className="flex-1 truncate">{channel.name}</span>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1 min-w-0">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* チャットヘッダー */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* モバイル用メニューボタン */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden"
              onClick={() => setShowUserList(!showUserList)}
            >
              <Hash className="w-4 h-4" />
            </Button>
            {currentChannel && getChannelIcon(currentChannel)}
            <div>
              <h3 className="font-semibold text-gray-900">
                {currentChannel?.name}
              </h3>
              <p className="text-sm text-gray-600 hidden sm:block">
                {currentChannel?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* ユーザー選択ボタン */}
            <div className="relative" data-user-selector>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="flex items-center space-x-2"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                  {currentUser?.userName?.charAt(0) || "?"}
                </div>
                <span className="hidden sm:block">{currentUser?.userName}</span>
              </Button>
              
              {/* ユーザー選択ドロップダウン */}
              {showUserSelector && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[200px]">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                    ユーザー選択
                  </div>
                  {AVAILABLE_USERS.map((user, index) => (
                    <button
                      key={user.userId}
                      className={`w-full flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded text-left ${
                        selectedUserIndex === index ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSelectedUserIndex(index);
                        setShowUserSelector(false);
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                        {user.userName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {user.userName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.userDepartment}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Search className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowUserList(!showUserList)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex space-x-3 group hover:bg-gray-50 p-2 rounded relative ${getPriorityColor(message.priority)}`}
            >
              {/* アバター */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {message.authorName?.charAt(0) || "?"}
                </div>
              </div>
              
              {/* メッセージ内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {message.authorName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {message.authorRole}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  {message.editedAt && (
                    <span className="text-xs text-gray-400">(編集済み)</span>
                  )}
                </div>
                
                {/* メッセージ内容 */}
                {editingMessage === message.id ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={editInputRef}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditMessage(message.id);
                        }
                        if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditMessage(message.id)}
                        disabled={!editingContent.trim()}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3 h-3 mr-1" />
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-800 break-words">
                    {message.isDeleted ? (
                      <span className="text-gray-400 italic">このメッセージは削除されました</span>
                    ) : (
                      message.content
                    )}
                  </div>
                )}

                {/* 添付ファイル */}
                {message.attachments && message.attachments.length > 0 && !message.isDeleted && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 p-2 bg-gray-100 rounded border"
                      >
                        {attachment.type === 'image' ? (
                          <div
                            className="cursor-pointer"
                            onClick={() => setExpandedImage(attachment.url)}
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
                              <div className="text-xs text-gray-500">
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
                        className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                        onClick={() => handleAddReaction(message.id, reaction.emoji)}
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
                      onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                    >
                      <Smile className="w-3 h-3" />
                    </Button>
                    {showEmojiPicker === message.id && (
                      <EmojiPicker
                        onEmojiSelect={(emoji) => handleAddReaction(message.id, emoji)}
                        onClose={() => setShowEmojiPicker(null)}
                      />
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Reply className="w-3 h-3" />
                  </Button>
                  {message.authorId === currentUser.userId && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => handleStartEdit(message)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* メッセージ入力エリア */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {/* アップロード中のファイル表示 */}
          {uploadingFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600">アップロード予定のファイル:</p>
              {uploadingFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUploadingFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder={`#${currentChannel?.name}にメッセージを送信...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="pr-20 min-h-[44px] resize-none"
                disabled={!currentChannel}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleFileAttach}
                  disabled={!currentChannel}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={!currentChannel}
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() && uploadingFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
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
            onChange={(e) => {
              if (e.target.files) {
                handleFilesSelected(Array.from(e.target.files));
              }
            }}
          />
        </div>
      </div>

        {/* ユーザーリスト */}
        {showUserList && (
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm hidden lg:flex">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                メンバー ({users.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {Object.entries(
                users.reduce((acc, user) => {
                  if (!acc[user.status]) acc[user.status] = [];
                  acc[user.status].push(user);
                  return acc;
                }, {} as Record<string, unknown[]>)
              ).map(([status, statusUsers]) => (
                <div key={status} className="mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {status === "online" ? "オンライン" : 
                     status === "away" ? "離席中" :
                     status === "busy" ? "取り込み中" : "オフライン"}
                    ({statusUsers.length})
                  </div>
                  {statusUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                          {user.name?.charAt(0) || "?"}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                            user.status
                          )}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.department}
                        </div>
                        {user.statusMessage && (
                          <div className="text-xs text-gray-400 truncate italic">
                            {user.statusMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 画像拡大表示モーダル */}
        {expandedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setExpandedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-white hover:bg-white hover:bg-opacity-20"
                onClick={() => setExpandedImage(null)}
              >
                <X className="w-6 h-6" />
              </Button>
              <img
                src={expandedImage}
                alt="拡大画像"
                className="max-w-full max-h-full object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </FileDropZone>
  );
};

export default DiscordLikeChat;