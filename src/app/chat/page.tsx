"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
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
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useChat } from "./hooks/useChat";
import type { ChatAttachment, ChatMessage, ChatChannel } from "@/lib/firebase/chat";
import { updateChannel, deleteChannel, updateServer, deleteServer, getServerInfo, ServerInfo, createCategory, subscribeToCategories, ChannelCategory } from "@/lib/firebase/chat";
import { initializeChatData } from "@/lib/firebase/initChatData";
import { formatChatTimestamp } from "@/lib/utils/dateFormatter";

// 新しいコンポーネント
import { ChannelCreateDialog } from "./components/ChannelCreateDialog";
import { CategoryCreateDialog } from "./components/CategoryCreateDialog";
import { MentionInput } from "./components/MentionInput";
import { NotificationSystem } from "./components/NotificationSystem";
import { ThreadPanel } from "./components/ThreadPanel";
import { UserProfileModal } from "./components/UserProfileModal";
import { MessageContent } from "./components/MessageContent";
import { ChannelSettingsModal } from "./components/ChannelSettingsModal";
import { ServerSettingsModal } from "./components/ServerSettingsModal";
import { InviteModal } from "./components/InviteModal";
import { RoleManagementModal } from "./components/RoleManagementModal";
import { VirtualMessageList } from "./components/VirtualMessageList";
import { ChannelContextMenu } from "./components/ChannelContextMenu";

// 型定義
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

// EmojiPickerコンポーネントは削除（VirtualMessageList内に移動済み）

// FileDropZoneコンポーネント定義
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
      className={`relative ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600' : ''}`}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <p className="text-blue-700 dark:text-blue-300 font-medium">ファイルをドロップしてアップロード</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// メインコンポーネント
const DiscordLikeChat = () => {
  // 実際のユーザー情報を取得
  const { user: authUser } = useAuth();
  const { currentCompany } = useCompany();
  const { trackAction } = useActivityTracking();

  // 実際のユーザー情報を使用
  const currentUser = authUser ? {
    userId: authUser.uid,
    userName: authUser.name || authUser.email || 'Unknown User',
    userRole: authUser.role || 'worker',
    userDepartment: authUser.department || '未設定',
    userEmail: authUser.email || '',
    avatar: authUser.avatar || undefined,
  } : null;

  // Firebase連携フック
  const {
    channels,
    messages,
    users,
    notifications,
    threadMessages,
    currentChannel,
    isLoading,
    error,
    selectChannel,
    sendNewMessage,
    sendReply,
    editMessage,
    removeMessage,
    uploadFile,
    addReaction,
    updateStatus,
    markAsRead,
    markNotificationRead,
    createNewChannel,
    createNewThread,
    getUnreadCount,
    getOnlineUsers,
    getCurrentUser,
  } = useChat(currentUser!);

  // ローカル状態
  const [categories, setCategories] = useState<ChannelCategory[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserList, setShowUserList] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<ChatMessage | null>(null);
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState<string | null>(null);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [currentServer, setCurrentServer] = useState<ServerInfo | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    channel: any;
  }>({ show: false, x: 0, y: 0, channel: null });
  const [channelSettings, setChannelSettings] = useState<{
    notifications: Record<string, boolean>;
    muted: Record<string, boolean>;
  }>(() => {
    // ローカルストレージから設定を読み込み
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-channel-settings');
      return saved ? JSON.parse(saved) : { notifications: {}, muted: {} };
    }
    return { notifications: {}, muted: {} };
  });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const unsubscribeCategories = useRef<(() => void) | null>(null);

  // 計算された値
  const onlineUsers = getOnlineUsers();
  const firebaseCurrentUser = getCurrentUser();

  // ハンドラー関数
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !currentChannel) return;

    const messageToSend = messageInput;
    setMessageInput("");

    const attachments: ChatAttachment[] = [];
    
    if (uploadingFiles.length > 0) {
      for (const file of uploadingFiles) {
        const attachment = await uploadFile(file);
        if (attachment) {
          attachments.push(attachment);
        }
      }
      setUploadingFiles([]);
    }

    try {
      const success = await sendNewMessage(messageToSend, attachments);
      
      if (success) {
        trackAction('chat_message_sent', {
          channelId: currentChannel.id,
          messageLength: messageToSend.length,
          hasAttachments: attachments.length > 0,
          attachmentCount: attachments.length
        });
      } else {
        setMessageInput(messageToSend);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setMessageInput(messageToSend);
    }
  }, [messageInput, currentChannel, uploadingFiles, sendNewMessage, uploadFile, trackAction]);

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

  const handleChannelSelect = useCallback(async (channelId: string) => {
    selectChannel(channelId);
    // チャンネル選択時に未読数をクリア
    await markAsRead(channelId);
  }, [selectChannel, markAsRead]);

  const handleStatusUpdate = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline') => {
    await updateStatus(status);
  }, [updateStatus]);

  const handleCreateChannel = useCallback(async (channelData: any) => {
    try {
      console.log('🔧 チャンネル作成開始:', channelData);
      const channelId = await createNewChannel(channelData);
      if (channelId) {
        // 新しく作成したチャンネルを選択
        selectChannel(channelId);
        console.log('✅ チャンネル作成成功:', channelId);
      } else {
        console.error('❌ チャンネル作成に失敗しました');
      }
    } catch (error) {
      console.error('💥 チャンネル作成エラー:', error);
    }
  }, [createNewChannel, selectChannel]);

  const handleCreateCategory = useCallback(async (categoryData: any) => {
    try {
      console.log('📁 カテゴリー作成開始:', categoryData);
      const result = await createCategory({
        ...categoryData,
        createdBy: currentUser?.userId || 'unknown',
      });
      
      if (result.id) {
        console.log('✅ カテゴリー作成成功:', result.id);
      } else {
        console.error('❌ カテゴリー作成失敗:', result.error);
      }
    } catch (error) {
      console.error('💥 カテゴリー作成エラー:', error);
    }
  }, [currentUser]);


  const handleUpdateChannel = useCallback(async (channelId: string, updates: Partial<ChatChannel>) => {
    try {
      const { error } = await updateChannel(channelId, updates);
      if (error) {
        alert(`チャンネル更新エラー: ${error}`);
      } else {
        alert('チャンネルを更新しました');
      }
    } catch (error) {
      console.error('チャンネル更新エラー:', error);
    }
  }, []);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    try {
      const { error } = await deleteChannel(channelId);
      if (error) {
        alert(`チャンネル削除エラー: ${error}`);
      } else {
        alert('チャンネルを削除しました');
        if (currentChannel?.id === channelId) {
          // 削除したチャンネルが選択中の場合、別のチャンネルを選択
          const otherChannel = channels.find(ch => ch.id !== channelId);
          if (otherChannel) {
            handleChannelSelect(otherChannel.id);
          }
        }
      }
    } catch (error) {
      console.error('チャンネル削除エラー:', error);
    }
  }, [currentChannel, channels, selectChannel]);

  const handleUpdateServer = useCallback(async (serverId: string, updates: Partial<ServerInfo>) => {
    try {
      const { error } = await updateServer(serverId, updates);
      if (error) {
        alert(`サーバー更新エラー: ${error}`);
      } else {
        alert('サーバー設定を更新しました');
        // サーバー情報を再取得
        setCurrentServer(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('サーバー更新エラー:', error);
    }
  }, []);

  const handleDeleteServer = useCallback(async (serverId: string) => {
    try {
      const { error } = await deleteServer(serverId);
      if (error) {
        alert(`サーバー削除エラー: ${error}`);
      } else {
        alert('サーバーを削除しました');
        // ここでリダイレクトなどの処理を行う
      }
    } catch (error) {
      console.error('サーバー削除エラー:', error);
    }
  }, []);

  const handleInviteMember = useCallback(async (email: string, role: string) => {
    try {
      console.log(`招待送信: ${email} (ロール: ${role})`);
      
      // TODO: Firebase Functionsでメール送信を実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 成功通知（NotificationSystemを活用）
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('notification', {
          detail: {
            title: '招待送信完了',
            message: `${email} に招待メールを送信しました`,
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('招待送信エラー:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('notification', {
          detail: {
            title: 'エラー',
            message: '招待メールの送信に失敗しました',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    }
  }, []);

  // コンテキストメニュー関連の関数
  const handleChannelRightClick = useCallback((e: React.MouseEvent, channel: any) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      channel
    });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  const handleToggleNotifications = useCallback((channelId: string, enabled: boolean) => {
    setChannelSettings(prev => {
      const newSettings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          [channelId]: enabled
        }
      };
      // ローカルストレージに保存
      localStorage.setItem('chat-channel-settings', JSON.stringify(newSettings));
      return newSettings;
    });
    
    // 通知設定変更の通知
    const channelName = channels.find(c => c.id === channelId)?.name || 'チャンネル';
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('notification', {
        detail: {
          title: '通知設定を変更',
          message: `${channelName} の通知を${enabled ? '有効' : '無効'}にしました`,
          type: 'info'
        }
      });
      window.dispatchEvent(event);
    }
  }, [channels]);

  const handleToggleMute = useCallback((channelId: string, muted: boolean) => {
    setChannelSettings(prev => {
      const newSettings = {
        ...prev,
        muted: {
          ...prev.muted,
          [channelId]: muted
        }
      };
      // ローカルストレージに保存
      localStorage.setItem('chat-channel-settings', JSON.stringify(newSettings));
      return newSettings;
    });
    
    // ミュート設定変更の通知
    const channelName = channels.find(c => c.id === channelId)?.name || 'チャンネル';
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('notification', {
        detail: {
          title: 'ミュート設定を変更',
          message: `${channelName} を${muted ? 'ミュート' : 'ミュート解除'}しました`,
          type: 'info'
        }
      });
      window.dispatchEvent(event);
    }
  }, [channels]);

  const handleCopyChannelId = useCallback((channelId: string) => {
    navigator.clipboard.writeText(channelId);
    
    // コピー完了通知
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('notification', {
        detail: {
          title: 'コピー完了',
          message: 'チャンネルIDをクリップボードにコピーしました',
          type: 'success'
        }
      });
      window.dispatchEvent(event);
    }
  }, []);

  const handleOpenThread = useCallback((message: ChatMessage) => {
    setSelectedThreadMessage(message);
    setShowThreadPanel(true);
  }, []);

  const handleCloseThread = useCallback(() => {
    setShowThreadPanel(false);
    setSelectedThreadMessage(null);
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    for (const notification of unreadNotifications) {
      await markNotificationRead(notification.id);
    }
  }, [notifications, markNotificationRead]);

  const handleUserClick = useCallback((user: any) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  }, []);

  const handleDirectMessage = useCallback(async (userId: string) => {
    // DMチャンネルを作成または検索
    console.log('DMチャンネルを作成:', userId);
    // 実装予定: DMチャンネル機能
  }, []);

  const handleMentionUser = useCallback((userName: string) => {
    setMessageInput(prev => prev + `@${userName} `);
  }, []);

  // 自分宛てのメンションかどうかを判定する関数
  const isCurrentUserMentioned = useCallback((message: ChatMessage) => {
    if (!currentUser?.userName) {
      return false;
    }
    
    // メッセージ内容から直接@メンションを解析
    const mentionPattern = /@([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
    const matches = message.content.match(mentionPattern);
    
    if (!matches) {
      return false;
    }
    
    // ユーザー名でのメンション判定
    const currentUserName = currentUser.userName;
    const isMentioned = matches.some(mention => {
      const mentionName = mention.substring(1); // @を除去
      return mentionName === currentUserName || 
             mentionName.toLowerCase() === currentUserName.toLowerCase();
    });
    
    return isMentioned;
  }, [currentUser?.userName]);

  // ユーティリティ関数
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  }, []);

  const getChannelIcon = useCallback((channel: { type: string }) => {
    switch (channel.type) {
      case "announcement": return <Zap className="w-4 h-4 text-yellow-500" />;
      case "voice": return <Volume2 className="w-4 h-4 text-green-500" />;
      default: return <Hash className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
    }
  }, []);

  const getPriorityColor = useCallback((priority?: string) => {
    switch (priority) {
      case "urgent": return "border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20";
      case "high": return "border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20";
      case "normal": return "";
      case "low": return "border-l-4 border-gray-300 dark:border-slate-600";
      default: return "";
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
    return formatChatTimestamp(timestamp);
  }, []);

  // 初期データ作成
  useEffect(() => {
    const initData = async () => {
      console.log('📊 デバッグ情報:');
      console.log('- currentUser:', currentUser);
      console.log('- channels.length:', channels.length);
      console.log('- users.length:', users.length);
      console.log('- isLoading:', isLoading);
      console.log('- error:', error);
      
      if (channels.length === 0 && !isLoading && currentUser) {
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
  }, [channels.length, isLoading, currentUser, users.length, error]);

  // カテゴリーのリアルタイム監視
  useEffect(() => {
    console.log('🏷️ カテゴリー監視を開始');
    unsubscribeCategories.current = subscribeToCategories((categoriesData) => {
      console.log('📁 カテゴリーデータ受信:', categoriesData);
      setCategories(categoriesData);
    });

    return () => {
      if (unsubscribeCategories.current) {
        unsubscribeCategories.current();
      }
    };
  }, []);

  // サーバー情報初期化
  useEffect(() => {
    const mockServer: ServerInfo = {
      id: 'unica-manufacturing',
      name: 'unica製造チーム',
      description: '製造業務管理システムのコミュニケーションサーバー',
      isPrivate: false,
      ownerId: currentUser?.userId || 'mock-owner',
      memberCount: users.length,
      createdAt: new Date() as any,
      settings: {
        allowInvites: true,
        requireApproval: false,
        defaultRole: 'member',
        explicitContentFilter: 'disabled',
        verificationLevel: 'none',
      }
    };
    setCurrentServer(mockServer);
  }, [currentUser?.userId, users.length]);

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
      <div className="h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center ml-0 md:ml-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">チャットを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <FileDropZone onFilesDrop={handleFilesDrop}>
        <div className="h-screen bg-gray-50 dark:bg-slate-900 flex ml-0 md:ml-16">
        {/* エラー表示 */}
        {error && (
          <div className="absolute top-4 right-4 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* チャンネルサイドバー */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col shadow-lg hidden md:flex">
          {/* サーバーヘッダー */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Unica製造チーム</h2>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => setShowServerMenu(!showServerMenu)}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {showServerMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 z-50">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-gray-900 dark:text-white"
                      onClick={() => {
                        setShowServerMenu(false);
                        setShowServerSettings(true);
                      }}
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      サーバー設定
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-gray-900 dark:text-white"
                      onClick={() => {
                        setShowServerMenu(false);
                        setShowInviteModal(true);
                      }}
                    >
                      <UserPlus className="w-4 h-4 inline mr-2" />
                      メンバーを招待
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-gray-900 dark:text-white"
                      onClick={() => {
                        setShowServerMenu(false);
                        setShowServerSettings(true);
                      }}
                    >
                      <Users className="w-4 h-4 inline mr-2" />
                      メンバー管理
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-gray-900 dark:text-white"
                      onClick={() => {
                        setShowServerMenu(false);
                        setShowRoleManagement(true);
                      }}
                    >
                      <Shield className="w-4 h-4 inline mr-2" />
                      ロール・権限設定
                    </button>
                    <div className="border-t border-gray-200 dark:border-slate-600"></div>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400"
                      onClick={() => {
                        setShowServerMenu(false);
                        if (window.confirm('本当にサーバーを削除しますか？この操作は取り消せません。')) {
                          handleDeleteServer(currentServer?.id || '');
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      サーバーを削除
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{onlineUsers.length}人がオンライン</p>
          </div>

          {/* チャンネルリスト */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800">
            {/* カテゴリー作成ボタン */}
            <div className="mb-2 px-2">
              <CategoryCreateDialog 
                onCreateCategory={handleCreateCategory}
                trigger={
                  <button className="w-full flex items-center justify-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                    <Plus className="w-3 h-3" />
                    <span>カテゴリーを作成</span>
                  </button>
                }
              />
            </div>

            {/* 未分類チャンネル */}
            {channels.filter((ch: any) => !ch.categoryId && !ch.category).length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>チャンネル</span>
                  <ChannelCreateDialog 
                    onCreateChannel={handleCreateChannel}
                    currentUserId={currentUser?.userId || ''}
                    categoryId={undefined}
                    trigger={<Plus className="w-3 h-3 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer" />}
                  />
                </div>
                {channels
                  .filter((ch: any) => !ch.categoryId && !ch.category)
                  .map((channel: any) => {
                    const unreadCount = getUnreadCount(channel.id);
                    return (
                      <div
                        key={channel.id}
                        className={`w-full group flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                          currentChannel?.id === channel.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-slate-300"
                        }`}
                        onContextMenu={(e) => handleChannelRightClick(e, channel)}
                      >
                        <button
                          className="flex-1 flex items-center space-x-2 text-left"
                          onClick={() => handleChannelSelect(channel.id)}
                        >
                          {getChannelIcon(channel)}
                          <span className="flex-1 truncate text-sm">{channel.name}</span>
                          {unreadCount > 0 && !channelSettings.muted[channel.id] && (
                            <Badge variant="destructive" className="text-xs px-1 min-w-0">
                              {unreadCount}
                            </Badge>
                          )}
                          {channelSettings.muted[channel.id] && (
                            <VolumeX className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                          )}
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChannel(channel);
                            setShowChannelSettings(true);
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* カテゴリーごとのチャンネル */}
            {categories.map((category) => {
              const isCollapsed = collapsedCategories.has(category.id);
              return (
              <div key={category.id} className="mb-4">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider group">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-slate-200"
                    onClick={() => {
                      setCollapsedCategories(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(category.id)) {
                          newSet.delete(category.id);
                        } else {
                          newSet.add(category.id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    <span>{category.name}</span>
                  </button>
                  <ChannelCreateDialog 
                    onCreateChannel={handleCreateChannel}
                    currentUserId={currentUser?.userId || ''}
                    categoryId={category.id}
                    trigger={<Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer transition-opacity" />}
                  />
                </div>
                {!isCollapsed && channels
                  .filter((ch: any) => ch.categoryId === category.id || ch.category === category.name)
                  .map((channel: any) => {
                    const unreadCount = getUnreadCount(channel.id);
                    return (
                      <div
                        key={channel.id}
                        className={`w-full group flex items-center space-x-2 px-2 py-1 ml-3 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                          currentChannel?.id === channel.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-slate-300"
                        }`}
                        onContextMenu={(e) => handleChannelRightClick(e, channel)}
                      >
                        <button
                          className="flex-1 flex items-center space-x-2 text-left"
                          onClick={() => handleChannelSelect(channel.id)}
                        >
                          {getChannelIcon(channel)}
                          <span className="flex-1 truncate text-sm">{channel.name}</span>
                          {unreadCount > 0 && !channelSettings.muted[channel.id] && (
                            <Badge variant="destructive" className="text-xs px-1 min-w-0">
                              {unreadCount}
                            </Badge>
                          )}
                          {channelSettings.muted[channel.id] && (
                            <VolumeX className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                          )}
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChannel(channel);
                            setShowChannelSettings(true);
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
              );
            })}
          </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* チャットヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {currentChannel?.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 hidden sm:block">
                {currentChannel?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* 現在のユーザー表示 */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                {currentUser?.userName?.charAt(0) || "?"}
              </div>
              <span className="hidden sm:block text-gray-900 dark:text-white">{currentUser?.userName}</span>
            </div>

            <NotificationSystem
              users={users}
              currentUserId={currentUser?.userId || ''}
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowUserList(!showUserList)}
              title={showUserList ? "ユーザーリストを非表示" : "ユーザーリストを表示"}
            >
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* メッセージエリア */}
        <VirtualMessageList
          messages={messages}
          users={users}
          currentUser={currentUser}
          editingMessage={editingMessage}
          editingContent={editingContent}
          showEmojiPicker={showEmojiPicker}
          expandedImage={expandedImage}
          editInputRef={editInputRef}
          onEditingContentChange={setEditingContent}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddReaction={handleAddReaction}
          onOpenThread={handleOpenThread}
          onUserClick={handleUserClick}
          onExpandImage={setExpandedImage}
          onToggleEmojiPicker={setShowEmojiPicker}
          formatTimestamp={formatTimestamp}
          formatFileSize={formatFileSize}
          getPriorityColor={getPriorityColor}
          isCurrentUserMentioned={isCurrentUserMentioned}
        />

        {/* メッセージ入力エリア */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
          {/* アップロード中のファイル表示 */}
          {uploadingFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-slate-400">アップロード予定のファイル:</p>
              {uploadingFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-700 rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{formatFileSize(file.size)}</div>
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

          <MentionInput
            value={messageInput}
            onChange={setMessageInput}
            onSend={handleSendMessage}
            users={users}
            placeholder={`#${currentChannel?.name}にメッセージを送信...`}
            disabled={!currentChannel}
            onFileAttach={handleFileAttach}
          />
          
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
          <div className="w-64 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col shadow-sm hidden lg:flex">
            <div className="p-4 border-b border-gray-200 dark:border-slate-600">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <Users className="w-4 h-4 mr-2" />
                メンバー ({users.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800">
              {Object.entries(
                users.reduce((acc, user) => {
                  if (!acc[user.status]) acc[user.status] = [];
                  acc[user.status].push(user);
                  return acc;
                }, {} as Record<string, any[]>)
              ).map(([status, statusUsers]: [string, any[]]) => (
                <div key={status} className="mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {status === "online" ? "オンライン" : 
                     status === "away" ? "離席中" :
                     status === "busy" ? "取り込み中" : "オフライン"}
                    ({statusUsers.length})
                  </div>
                  {statusUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                      onClick={() => handleUserClick(user)}
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
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {user.department}
                        </div>
                        {user.statusMessage && (
                          <div className="text-xs text-gray-400 dark:text-slate-500 truncate italic">
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
                className="absolute top-2 right-2 text-white hover:bg-white hover:bg-opacity-20 dark:hover:bg-slate-700"
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

        {/* スレッドパネル */}
        <ThreadPanel
          isOpen={showThreadPanel}
          onClose={handleCloseThread}
          parentMessage={selectedThreadMessage}
          threadMessages={threadMessages}
          users={users}
          currentUser={firebaseCurrentUser || {
            id: currentUser?.userId || '',
            name: currentUser?.userName || '',
            email: currentUser?.userEmail || '',
            role: currentUser?.userRole || '',
            department: currentUser?.userDepartment || '',
            status: 'online' as const,
            isOnline: true,
            lastSeen: new Date(),
            lastActivity: new Date(),
            statusMessage: ''
          }}
          onSendReply={async (content: string, attachments?: ChatAttachment[]) => {
            if (!selectedThreadMessage) return false;
            const threadId = await createNewThread(selectedThreadMessage.id, selectedThreadMessage.channelId);
            if (threadId) {
              return await sendReply(threadId, content, attachments);
            }
            return false;
          }}
          onUploadFile={uploadFile}
          channelName={currentChannel?.name}
        />

        {/* ユーザープロフィールモーダル */}
        <UserProfileModal
          user={selectedUser}
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          onDirectMessage={handleDirectMessage}
          onMention={handleMentionUser}
          currentUserId={currentUser?.userId || ''}
        />

        <ChannelSettingsModal
          channel={editingChannel}
          isOpen={showChannelSettings}
          onClose={() => {
            setShowChannelSettings(false);
            setEditingChannel(null);
          }}
          onUpdate={handleUpdateChannel}
          onDelete={handleDeleteChannel}
          users={users}
          currentUserId={currentUser?.userId || ''}
        />

        <ServerSettingsModal
          server={currentServer}
          isOpen={showServerSettings}
          onClose={() => setShowServerSettings(false)}
          onUpdate={handleUpdateServer}
          onDelete={handleDeleteServer}
          users={users}
          currentUserId={currentUser?.userId || ''}
          channels={channels}
          categories={categories}
        />

        <InviteModal
          server={currentServer}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteMember}
        />

        <RoleManagementModal
          server={currentServer}
          isOpen={showRoleManagement}
          onClose={() => setShowRoleManagement(false)}
          users={users}
          currentUserId={currentUser?.userId || ''}
        />

        {/* チャンネル右クリックメニュー */}
        {contextMenu.show && (
          <ChannelContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            channel={contextMenu.channel}
            onClose={handleContextMenuClose}
            onEdit={() => {
              setEditingChannel(contextMenu.channel);
              setShowChannelSettings(true);
            }}
            onDelete={() => handleDeleteChannel(contextMenu.channel.id)}
            onToggleNotifications={handleToggleNotifications}
            onToggleMute={handleToggleMute}
            onCopyId={handleCopyChannelId}
            isNotificationsEnabled={channelSettings.notifications[contextMenu.channel?.id] ?? true}
            isMuted={channelSettings.muted[contextMenu.channel?.id] ?? false}
          />
        )}
      </div>
      </FileDropZone>
    </>
  );
};

export default DiscordLikeChat;