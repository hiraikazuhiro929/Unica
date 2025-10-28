// =============================================================================
// 型ガード関数
// Phase 2データレイヤーの型安全性確保
// =============================================================================

import type {
  MessageState,
  ChannelState,
  UserState,
  OptimisticOperation,
  QueuedMessage,
} from '../store/types';
import type { ChatMessage, ChatChannel, ChatUser, ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// メッセージ関連型ガード
// =============================================================================

/**
 * ChatMessageの型ガード
 */
export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.channelId === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.authorId === 'string' &&
    typeof obj.authorName === 'string' &&
    typeof obj.authorRole === 'string' &&
    (obj.timestamp instanceof Date || typeof obj.timestamp === 'string' || obj.timestamp === null) &&
    ['message', 'system', 'announcement'].includes(obj.type as string) &&
    typeof obj.isDeleted === 'boolean'
  );
}

/**
 * MessageStateの型ガード
 */
export function isMessageState(value: unknown): value is MessageState {
  if (!isChatMessage(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    ['sending', 'sent', 'failed', 'synced'].includes(obj.optimisticStatus as string) &&
    typeof obj.retryCount === 'number' &&
    typeof obj.isOptimistic === 'boolean'
  );
}

/**
 * 楽観的メッセージの型ガード
 */
export function isOptimisticMessage(value: unknown): value is MessageState & { isOptimistic: true } {
  return isMessageState(value) && value.isOptimistic === true;
}

/**
 * 送信中メッセージの型ガード
 */
export function isSendingMessage(value: unknown): value is MessageState & { optimisticStatus: 'sending' } {
  return isMessageState(value) && value.optimisticStatus === 'sending';
}

/**
 * 失敗メッセージの型ガード
 */
export function isFailedMessage(value: unknown): value is MessageState & { optimisticStatus: 'failed' } {
  return isMessageState(value) && value.optimisticStatus === 'failed';
}

// =============================================================================
// チャンネル関連型ガード
// =============================================================================

/**
 * ChatChannelの型ガード
 */
export function isChatChannel(value: unknown): value is ChatChannel {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    ['text', 'voice', 'announcement'].includes(obj.type as string) &&
    typeof obj.isPrivate === 'boolean' &&
    typeof obj.createdBy === 'string' &&
    typeof obj.memberCount === 'number' &&
    typeof obj.order === 'number'
  );
}

/**
 * ChannelStateの型ガード
 */
export function isChannelState(value: unknown): value is ChannelState {
  if (!isChatChannel(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    ['syncing', 'synced', 'error'].includes(obj.syncStatus as string) &&
    obj.messagesPagination &&
    typeof obj.messagesPagination === 'object'
  );
}

// =============================================================================
// ユーザー関連型ガード
// =============================================================================

/**
 * ChatUserの型ガード
 */
export function isChatUser(value: unknown): value is ChatUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string' &&
    typeof obj.department === 'string' &&
    typeof obj.isOnline === 'boolean' &&
    ['online', 'away', 'busy', 'offline'].includes(obj.status as string)
  );
}

/**
 * UserStateの型ガード
 */
export function isUserState(value: unknown): value is UserState {
  if (!isChatUser(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    ['connected', 'connecting', 'disconnected'].includes(obj.connectionStatus as string)
  );
}

/**
 * オンラインユーザーの型ガード
 */
export function isOnlineUser(value: unknown): value is UserState & { isOnline: true } {
  return isUserState(value) && value.isOnline === true;
}

// =============================================================================
// 操作・キュー関連型ガード
// =============================================================================

/**
 * OptimisticOperationの型ガード
 */
export function isOptimisticOperation(value: unknown): value is OptimisticOperation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    ['sendMessage', 'editMessage', 'deleteMessage', 'addReaction'].includes(obj.type as string) &&
    typeof obj.entityId === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.retryCount === 'number' &&
    typeof obj.maxRetries === 'number'
  );
}

/**
 * QueuedMessageの型ガード
 */
export function isQueuedMessage(value: unknown): value is QueuedMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.localId === 'string' &&
    typeof obj.channelId === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.authorId === 'string' &&
    typeof obj.authorName === 'string' &&
    typeof obj.authorRole === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.retryCount === 'number' &&
    ['low', 'normal', 'high'].includes(obj.priority as string) &&
    Array.isArray(obj.attachments)
  );
}

// =============================================================================
// 添付ファイル関連型ガード
// =============================================================================

/**
 * ChatAttachmentの型ガード
 */
export function isChatAttachment(value: unknown): value is ChatAttachment {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.url === 'string' &&
    ['image', 'document', 'video', 'audio'].includes(obj.type as string) &&
    typeof obj.size === 'number' &&
    typeof obj.mimeType === 'string'
  );
}

// =============================================================================
// 配列型ガード
// =============================================================================

/**
 * メッセージ配列の型ガード
 */
export function isMessageArray(value: unknown): value is MessageState[] {
  return Array.isArray(value) && value.every(isMessageState);
}

/**
 * チャンネル配列の型ガード
 */
export function isChannelArray(value: unknown): value is ChannelState[] {
  return Array.isArray(value) && value.every(isChannelState);
}

/**
 * ユーザー配列の型ガード
 */
export function isUserArray(value: unknown): value is UserState[] {
  return Array.isArray(value) && value.every(isUserState);
}

/**
 * 添付ファイル配列の型ガード
 */
export function isAttachmentArray(value: unknown): value is ChatAttachment[] {
  return Array.isArray(value) && value.every(isChatAttachment);
}

// =============================================================================
// ユーティリティ型ガード
// =============================================================================

/**
 * 有効なIDの型ガード
 */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

/**
 * 有効なコンテンツの型ガード
 */
export function isValidContent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 有効なタイムスタンプの型ガード
 */
export function isValidTimestamp(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 空でないオブジェクトの型ガード
 */
export function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0;
}

// =============================================================================
// ランタイム型チェック関数
// =============================================================================

/**
 * 値の型安全性を検証し、エラーを投げる
 */
export function assertMessageState(value: unknown, context = 'value'): asserts value is MessageState {
  if (!isMessageState(value)) {
    throw new TypeError(`${context} is not a valid MessageState`);
  }
}

export function assertChannelState(value: unknown, context = 'value'): asserts value is ChannelState {
  if (!isChannelState(value)) {
    throw new TypeError(`${context} is not a valid ChannelState`);
  }
}

export function assertUserState(value: unknown, context = 'value'): asserts value is UserState {
  if (!isUserState(value)) {
    throw new TypeError(`${context} is not a valid UserState`);
  }
}

export function assertValidId(value: unknown, context = 'value'): asserts value is string {
  if (!isValidId(value)) {
    throw new TypeError(`${context} is not a valid ID`);
  }
}

export function assertValidContent(value: unknown, context = 'value'): asserts value is string {
  if (!isValidContent(value)) {
    throw new TypeError(`${context} is not valid content`);
  }
}

// =============================================================================
// 型変換ヘルパー
// =============================================================================

/**
 * ChatMessageをMessageStateに安全に変換
 */
export function chatMessageToMessageState(message: ChatMessage): MessageState {
  assertValidId(message.id, 'message.id');
  assertValidContent(message.content, 'message.content');

  return {
    ...message,
    optimisticStatus: 'synced',
    retryCount: 0,
    isOptimistic: false,
  };
}

/**
 * ChatChannelをChannelStateに安全に変換
 */
export function chatChannelToChannelState(channel: ChatChannel): ChannelState {
  assertValidId(channel.id, 'channel.id');

  return {
    ...channel,
    syncStatus: 'synced',
    lastSync: new Date(),
    messagesPagination: {
      hasMore: true,
      loading: false,
    },
  };
}

/**
 * ChatUserをUserStateに安全に変換
 */
export function chatUserToUserState(user: ChatUser): UserState {
  assertValidId(user.id, 'user.id');

  return {
    ...user,
    connectionStatus: user.isOnline ? 'connected' : 'disconnected',
    presenceLastUpdate: new Date(),
  };
}