/**
 * コア型定義 - チャットシステムの中核となるデータ構造
 * 製造業務管理システム向けチャットシステム基盤層
 */

import {
  MessageId,
  ChannelId,
  UserId,
  ThreadId,
  CategoryId,
  AttachmentId,
  NotificationId,
  ChatTimestamp
} from './brand';

// ===============================
// 基本列挙型
// ===============================

/**
 * メッセージタイプ
 */
export const MessageType = {
  MESSAGE: 'message',
  SYSTEM: 'system',
  ANNOUNCEMENT: 'announcement'
} as const;
export type MessageType = typeof MessageType[keyof typeof MessageType];

/**
 * チャンネルタイプ
 */
export const ChannelType = {
  TEXT: 'text',
  VOICE: 'voice',
  ANNOUNCEMENT: 'announcement'
} as const;
export type ChannelType = typeof ChannelType[keyof typeof ChannelType];

/**
 * ユーザーステータス
 */
export const UserStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
} as const;
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

/**
 * メッセージ優先度
 */
export const MessagePriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;
export type MessagePriority = typeof MessagePriority[keyof typeof MessagePriority];

/**
 * アタッチメントタイプ
 */
export const AttachmentType = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio'
} as const;
export type AttachmentType = typeof AttachmentType[keyof typeof AttachmentType];

/**
 * 通知タイプ
 */
export const NotificationType = {
  MENTION: 'mention',
  REPLY: 'reply',
  CHANNEL_MESSAGE: 'channel_message',
  THREAD_REPLY: 'thread_reply'
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

/**
 * メッセージステータス（送信状態）
 */
export const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed'
} as const;
export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus];

// ===============================
// 権限システム
// ===============================

/**
 * チャンネル権限
 */
export interface ChannelPermissions {
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canManage: boolean;
  readonly allowedRoles: readonly string[];
  readonly blockedUsers: readonly UserId[];
}

/**
 * ユーザー権限
 */
export interface UserPermissions {
  readonly canCreateChannels: boolean;
  readonly canManageChannels: boolean;
  readonly canMentionEveryone: boolean;
}

// ===============================
// アタッチメント
// ===============================

/**
 * チャットアタッチメント
 */
export interface ChatAttachment {
  readonly id: AttachmentId;
  readonly name: string;
  readonly url: string;
  readonly type: AttachmentType;
  readonly size: number;
  readonly mimeType: string;
}

/**
 * リアクション
 */
export interface ChatReaction {
  readonly emoji: string;
  readonly count: number;
  readonly users: readonly UserId[];
}

// ===============================
// メッセージ関連
// ===============================

/**
 * 返信先メッセージ情報
 */
export interface ReplyToMessage {
  readonly messageId: MessageId;
  readonly content: string;
  readonly authorName: string;
}

/**
 * チャットメッセージ（完全型安全）
 */
export interface ChatMessage {
  readonly id: MessageId;
  readonly channelId: ChannelId;
  readonly content: string;
  readonly authorId: UserId;
  readonly authorName: string;
  readonly authorRole: string;
  readonly timestamp: ChatTimestamp;
  readonly authorAvatar?: string;
  readonly editedAt?: ChatTimestamp;
  readonly type: MessageType;
  readonly priority: MessagePriority;
  readonly attachments: readonly ChatAttachment[];
  readonly reactions: readonly ChatReaction[];
  readonly mentions: readonly string[];
  readonly replyTo?: ReplyToMessage;
  readonly threadId?: ThreadId;
  readonly isThread: boolean;
  readonly threadCount: number;
  readonly isDeleted: boolean;
  readonly isOptimistic: boolean;
  readonly status: MessageStatus;
  readonly localId?: string;
}

// ===============================
// ユーザー関連
// ===============================

/**
 * チャットユーザー
 */
export interface ChatUser {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly department: string;
  readonly avatar?: string;
  readonly isOnline: boolean;
  readonly lastSeen: ChatTimestamp;
  readonly status: UserStatus;
  readonly statusMessage?: string;
  readonly lastActivity?: ChatTimestamp;
  readonly permissions: UserPermissions;
}

/**
 * タイピング状態
 */
export interface TypingStatus {
  readonly userId: UserId;
  readonly channelId: ChannelId;
  readonly userName: string;
  readonly timestamp: ChatTimestamp;
}

// ===============================
// チャンネル関連
// ===============================

/**
 * 最後のメッセージ情報
 */
export interface LastMessage {
  readonly content: string;
  readonly authorName: string;
  readonly timestamp: ChatTimestamp;
}

/**
 * チャンネルカテゴリ
 */
export interface ChannelCategory {
  readonly id: CategoryId;
  readonly name: string;
  readonly position: number;
  readonly order: number;
  readonly isCollapsed: boolean;
  readonly createdBy: UserId;
  readonly createdAt: ChatTimestamp;
  readonly updatedAt: ChatTimestamp;
  readonly permissions?: {
    readonly viewRole?: readonly string[];
    readonly manageRole?: readonly string[];
  };
}

/**
 * チャットチャンネル
 */
export interface ChatChannel {
  readonly id: ChannelId;
  readonly name: string;
  readonly description?: string;
  readonly topic?: string;
  readonly type: ChannelType;
  readonly categoryId?: CategoryId;
  readonly position: number;
  readonly order: number;
  readonly isPrivate: boolean;
  readonly createdBy: UserId;
  readonly createdAt: ChatTimestamp;
  readonly updatedAt: ChatTimestamp;
  readonly memberCount: number;
  readonly permissions: ChannelPermissions;
  readonly lastMessage?: LastMessage;
}

/**
 * チャンネルメンバー
 */
export interface ChannelMember {
  readonly channelId: ChannelId;
  readonly userId: UserId;
  readonly joinedAt: ChatTimestamp;
  readonly role: 'admin' | 'member';
  readonly canWrite: boolean;
  readonly notifications: boolean;
}

// ===============================
// スレッド関連
// ===============================

/**
 * チャットスレッド
 */
export interface ChatThread {
  readonly id: ThreadId;
  readonly channelId: ChannelId;
  readonly parentMessageId: MessageId;
  readonly messageCount: number;
  readonly participants: readonly UserId[];
  readonly lastActivity: ChatTimestamp;
  readonly createdAt: ChatTimestamp;
  readonly updatedAt: ChatTimestamp;
}

// ===============================
// 通知関連
// ===============================

/**
 * チャット通知
 */
export interface ChatNotification {
  readonly id: NotificationId;
  readonly userId: UserId;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly channelId: ChannelId;
  readonly messageId?: MessageId;
  readonly fromUserId: UserId;
  readonly fromUserName: string;
  readonly isRead: boolean;
  readonly createdAt: ChatTimestamp;
}

/**
 * 未読数情報
 */
export interface UnreadCount {
  readonly userId: UserId;
  readonly channelId: ChannelId;
  readonly count: number;
  readonly lastReadMessageId?: MessageId;
  readonly lastReadAt: ChatTimestamp;
}

// ===============================
// 作成・更新用型（readonly除去）
// ===============================

/**
 * メッセージ作成用型
 */
export type CreateMessageData = Omit<ChatMessage,
  'id' | 'timestamp' | 'isDeleted' | 'isOptimistic' | 'status' | 'threadCount' | 'editedAt'
> & {
  timestamp?: ChatTimestamp;
  isDeleted?: boolean;
  isOptimistic?: boolean;
  status?: MessageStatus;
  threadCount?: number;
  editedAt?: ChatTimestamp;
};

/**
 * ユーザー作成・更新用型
 */
export type CreateUserData = Omit<ChatUser,
  'isOnline' | 'lastSeen' | 'status' | 'lastActivity'
> & {
  isOnline?: boolean;
  lastSeen?: ChatTimestamp;
  status?: UserStatus;
  lastActivity?: ChatTimestamp;
};

/**
 * チャンネル作成用型
 */
export type CreateChannelData = Omit<ChatChannel,
  'id' | 'createdAt' | 'updatedAt' | 'memberCount'
> & {
  memberCount?: number;
};

/**
 * カテゴリ作成用型
 */
export type CreateCategoryData = Omit<ChannelCategory,
  'id' | 'createdAt' | 'updatedAt'
>;

// ===============================
// 型ガード関数
// ===============================

/**
 * MessageTypeの型ガード
 */
export const isMessageType = (value: unknown): value is MessageType => {
  return typeof value === 'string' && Object.values(MessageType).includes(value as MessageType);
};

/**
 * ChannelTypeの型ガード
 */
export const isChannelType = (value: unknown): value is ChannelType => {
  return typeof value === 'string' && Object.values(ChannelType).includes(value as ChannelType);
};

/**
 * UserStatusの型ガード
 */
export const isUserStatus = (value: unknown): value is UserStatus => {
  return typeof value === 'string' && Object.values(UserStatus).includes(value as UserStatus);
};

/**
 * MessagePriorityの型ガード
 */
export const isMessagePriority = (value: unknown): value is MessagePriority => {
  return typeof value === 'string' && Object.values(MessagePriority).includes(value as MessagePriority);
};

/**
 * AttachmentTypeの型ガード
 */
export const isAttachmentType = (value: unknown): value is AttachmentType => {
  return typeof value === 'string' && Object.values(AttachmentType).includes(value as AttachmentType);
};

/**
 * NotificationTypeの型ガード
 */
export const isNotificationType = (value: unknown): value is NotificationType => {
  return typeof value === 'string' && Object.values(NotificationType).includes(value as NotificationType);
};

/**
 * MessageStatusの型ガード
 */
export const isMessageStatus = (value: unknown): value is MessageStatus => {
  return typeof value === 'string' && Object.values(MessageStatus).includes(value as MessageStatus);
};