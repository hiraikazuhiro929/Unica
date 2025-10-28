/**
 * ブランド型定義 - 型安全性を保証する厳密なID管理
 * 製造業務管理システム向けチャットシステム基盤層
 */

// ブランド型のベース定義
declare const __brand: unique symbol;
type Brand<T, K> = T & { readonly [__brand]: K };

// ===============================
// ブランド型定義
// ===============================

/**
 * メッセージID - メッセージを一意に特定
 */
export type MessageId = Brand<string, 'MessageId'>;

/**
 * チャンネルID - チャンネルを一意に特定
 */
export type ChannelId = Brand<string, 'ChannelId'>;

/**
 * ユーザーID - ユーザーを一意に特定
 */
export type UserId = Brand<string, 'UserId'>;

/**
 * スレッドID - スレッドを一意に特定
 */
export type ThreadId = Brand<string, 'ThreadId'>;

/**
 * カテゴリID - カテゴリを一意に特定
 */
export type CategoryId = Brand<string, 'CategoryId'>;

/**
 * アタッチメントID - ファイルアタッチメントを一意に特定
 */
export type AttachmentId = Brand<string, 'AttachmentId'>;

/**
 * 通知ID - 通知を一意に特定
 */
export type NotificationId = Brand<string, 'NotificationId'>;

/**
 * タイムスタンプ - 統一された時刻表現
 */
export type ChatTimestamp = Brand<number, 'ChatTimestamp'>;

// ===============================
// ブランド型作成関数
// ===============================

/**
 * MessageIdを作成
 */
export const createMessageId = (id: string): MessageId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid MessageId: must be a non-empty string');
  }
  return id.trim() as MessageId;
};

/**
 * ChannelIdを作成
 */
export const createChannelId = (id: string): ChannelId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid ChannelId: must be a non-empty string');
  }
  return id.trim() as ChannelId;
};

/**
 * UserIdを作成
 */
export const createUserId = (id: string): UserId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid UserId: must be a non-empty string');
  }
  return id.trim() as UserId;
};

/**
 * ThreadIdを作成
 */
export const createThreadId = (id: string): ThreadId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid ThreadId: must be a non-empty string');
  }
  return id.trim() as ThreadId;
};

/**
 * CategoryIdを作成
 */
export const createCategoryId = (id: string): CategoryId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid CategoryId: must be a non-empty string');
  }
  return id.trim() as CategoryId;
};

/**
 * AttachmentIdを作成
 */
export const createAttachmentId = (id: string): AttachmentId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid AttachmentId: must be a non-empty string');
  }
  return id.trim() as AttachmentId;
};

/**
 * NotificationIdを作成
 */
export const createNotificationId = (id: string): NotificationId => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid NotificationId: must be a non-empty string');
  }
  return id.trim() as NotificationId;
};

/**
 * ChatTimestampを作成
 */
export const createChatTimestamp = (timestamp: number): ChatTimestamp => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error('Invalid ChatTimestamp: must be a positive finite number');
  }
  return timestamp as ChatTimestamp;
};

// ===============================
// ブランド型検証関数
// ===============================

/**
 * MessageIdかどうか検証
 */
export const isMessageId = (value: unknown): value is MessageId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * ChannelIdかどうか検証
 */
export const isChannelId = (value: unknown): value is ChannelId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * UserIdかどうか検証
 */
export const isUserId = (value: unknown): value is UserId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * ThreadIdかどうか検証
 */
export const isThreadId = (value: unknown): value is ThreadId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * CategoryIdかどうか検証
 */
export const isCategoryId = (value: unknown): value is CategoryId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * AttachmentIdかどうか検証
 */
export const isAttachmentId = (value: unknown): value is AttachmentId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * NotificationIdかどうか検証
 */
export const isNotificationId = (value: unknown): value is NotificationId => {
  return typeof value === 'string' && value.trim() !== '';
};

/**
 * ChatTimestampかどうか検証
 */
export const isChatTimestamp = (value: unknown): value is ChatTimestamp => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
};

// ===============================
// ユーティリティ型
// ===============================

/**
 * すべてのIDブランド型の組合せ
 */
export type ChatId = MessageId | ChannelId | UserId | ThreadId | CategoryId | AttachmentId | NotificationId;

/**
 * IDを文字列に変換
 */
export const unwrapId = (id: ChatId): string => id as string;

/**
 * タイムスタンプを数値に変換
 */
export const unwrapTimestamp = (timestamp: ChatTimestamp): number => timestamp as number;

/**
 * ID検証用のユニオン型ガード
 */
export const isChatId = (value: unknown): value is ChatId => {
  return isMessageId(value) || isChannelId(value) || isUserId(value) ||
         isThreadId(value) || isCategoryId(value) || isAttachmentId(value) ||
         isNotificationId(value);
};