/**
 * Chat System v2 - Type Definitions
 * 新しいチャットシステムの型定義
 */

import { Timestamp } from 'firebase/firestore';

// =============================================================================
// BRAND TYPES - 型安全性のためのブランド型
// =============================================================================

export type ChannelId = string & { readonly __brand: 'ChannelId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type ThreadId = string & { readonly __brand: 'ThreadId' };
export type CategoryId = string & { readonly __brand: 'CategoryId' };
export type DirectMessageId = string & { readonly __brand: 'DirectMessageId' };

// ブランド型のファクトリー関数
export const createChannelId = (id: string): ChannelId => id as ChannelId;
export const createMessageId = (id: string): MessageId => id as MessageId;
export const createUserId = (id: string): UserId => id as UserId;
export const createThreadId = (id: string): ThreadId => id as ThreadId;
export const createCategoryId = (id: string): CategoryId => id as CategoryId;
export const createDirectMessageId = (id: string): DirectMessageId => id as DirectMessageId;

// =============================================================================
// CORE MESSAGE TYPES
// =============================================================================

export interface ChatMessage {
  id: MessageId;
  channelId: ChannelId;
  content: string;
  authorId: UserId;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  timestamp: Timestamp;
  editedAt?: Timestamp;
  type: 'message' | 'system' | 'announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  mentions?: string[]; // メンションされたユーザー名またはID
  replyTo?: {
    messageId: MessageId;
    content: string;
    authorName: string;
  };
  threadId?: ThreadId;
  parentMessageId?: MessageId; // スレッド返信の場合、親メッセージID
  isThread?: boolean;
  threadCount?: number;
  isPinned?: boolean; // ピン留めされているか
  pinnedBy?: UserId; // 誰がピン留めしたか
  pinnedAt?: Timestamp; // ピン留めした日時
  isDeleted: boolean;
  status?: 'sending' | 'sent' | 'failed';
  localId?: string; // 楽観的UI用のローカルID
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio';
  size: number;
  mimeType: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: UserId[];
}

// =============================================================================
// CHANNEL TYPES
// =============================================================================

export interface ChatChannel {
  id: ChannelId;
  name: string;
  description?: string;
  topic?: string;
  type: 'text' | 'voice' | 'announcement';
  categoryId?: CategoryId;
  position: number;
  isPrivate: boolean;
  createdBy: UserId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  memberCount: number;
  permissions?: ChannelPermissions;
  lastMessage?: LastMessage;
}

export interface ChannelPermissions {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  allowedRoles?: string[];
  blockedUsers?: UserId[];
}

export interface LastMessage {
  content: string;
  authorName: string;
  timestamp: Timestamp;
}

export interface ChannelCategory {
  id: CategoryId;
  name: string;
  position: number;
  isCollapsed?: boolean;
  createdBy: UserId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  permissions?: {
    viewRole?: string[];
    manageRole?: string[];
  };
}

// =============================================================================
// USER TYPES
// =============================================================================

export interface ChatUser {
  id: UserId;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  status: 'online' | 'away' | 'busy' | 'offline';
  statusMessage?: string;
  lastActivity?: Timestamp;
  permissions?: UserPermissions;
}

export interface UserPermissions {
  canCreateChannels: boolean;
  canManageChannels: boolean;
  canMentionEveryone: boolean;
}

// =============================================================================
// THREAD TYPES
// =============================================================================

export interface Thread {
  id: ThreadId;
  channelId: ChannelId;
  parentMessageId: MessageId;
  messageCount: number;
  participants: UserId[];
  lastActivity: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface ChatNotification {
  id: string;
  userId: UserId;
  type: 'mention' | 'reply' | 'channel_message' | 'thread_reply';
  title: string;
  message: string;
  channelId: ChannelId;
  messageId?: MessageId;
  fromUserId: UserId;
  fromUserName: string;
  isRead: boolean;
  createdAt: Timestamp;
}

// =============================================================================
// OPERATIONAL TYPES
// =============================================================================

export interface ChannelMember {
  channelId: ChannelId;
  userId: UserId;
  joinedAt: Timestamp;
  role: 'admin' | 'member';
  canWrite: boolean;
  notifications: boolean;
}

export interface UnreadCount {
  userId: UserId;
  channelId: ChannelId;
  count: number;
  lastReadMessageId?: MessageId;
  lastReadAt: Timestamp;
}

export interface TypingStatus {
  userId: UserId;
  channelId: ChannelId;
  userName: string;
  timestamp: Timestamp;
}

// =============================================================================
// DIRECT MESSAGE TYPES
// =============================================================================

export interface DirectMessageChannel {
  id: DirectMessageId;
  participants: [UserId, UserId];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessage?: {
    content: string;
    senderId: UserId;
    timestamp: Timestamp;
    isRead: boolean;
  };
}

// =============================================================================
// STATE MANAGEMENT TYPES
// =============================================================================

export interface ChatState {
  channels: ChatChannel[];
  currentChannelId: ChannelId | null;
  messages: Record<string, ChatMessage[]>;
  users: ChatUser[];
  currentUser: ChatUser | null;
  unreadCounts: UnreadCount[];
  notifications: ChatNotification[];
  typingUsers: Record<string, TypingStatus[]>;
  loading: {
    channels: boolean;
    messages: boolean;
    users: boolean;
  };
  error: {
    channels: string | null;
    messages: string | null;
    users: string | null;
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export interface MessageResponse {
  id: MessageId | null;
  error: string | null;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface MessageFormData {
  content: string;
  attachments?: ChatAttachment[];
  mentions?: UserId[];
  replyTo?: {
    messageId: MessageId;
    content: string;
    authorName: string;
  };
  parentMessageId?: MessageId; // スレッド返信の場合
}

export interface ChannelFormData {
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'announcement';
  isPrivate: boolean;
  categoryId?: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface MessageSentEvent {
  type: 'MESSAGE_SENT';
  payload: {
    message: ChatMessage;
    channelId: ChannelId;
  };
}

export interface ChannelChangedEvent {
  type: 'CHANNEL_CHANGED';
  payload: {
    channelId: ChannelId;
  };
}

export interface UserStatusChangedEvent {
  type: 'USER_STATUS_CHANGED';
  payload: {
    userId: UserId;
    status: ChatUser['status'];
  };
}

export type ChatEvent = MessageSentEvent | ChannelChangedEvent | UserStatusChangedEvent;

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type MessageWithOptimistic = ChatMessage & {
  isOptimistic?: boolean;
};

export type PartialMessage = Partial<ChatMessage> & {
  id: MessageId;
  channelId: ChannelId;
};

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface MessageValidation extends ValidationResult {
  sanitizedContent?: string;
}

// =============================================================================
// SORTING AND FILTERING
// =============================================================================

export type MessageSortOrder = 'asc' | 'desc';
export type ChannelSortBy = 'name' | 'created' | 'updated' | 'activity';
export type MessageFilterType = 'all' | 'unread' | 'mentions' | 'files';

export interface MessageFilter {
  type: MessageFilterType;
  authorId?: UserId;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasAttachments?: boolean;
}

export interface ChannelFilter {
  type?: 'text' | 'voice' | 'announcement';
  categoryId?: string;
  isPrivate?: boolean;
  hasAccess?: boolean;
}