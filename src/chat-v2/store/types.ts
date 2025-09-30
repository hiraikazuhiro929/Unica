// Phase 1基盤層の型システムを活用・拡張
import type {
  ChatMessage,
  ChatChannel,
  ChatUser,
  ChatAttachment,
  ChatReaction,
  UnreadCount,
  TypingStatus,
  ChatNotification
} from '@/lib/firebase/chat';

// =============================================================================
// 正規化されたエンティティ型
// =============================================================================

export interface NormalizedEntities<T> {
  byId: Record<string, T>;
  allIds: string[];
}

// =============================================================================
// メッセージ状態管理の拡張型
// =============================================================================

export interface MessageState extends ChatMessage {
  // 楽観的UI用の拡張フィールド
  localId?: string;           // ローカル一意ID
  serverId?: string;          // サーバーから返されたID
  optimisticStatus: 'sending' | 'sent' | 'failed' | 'synced';
  retryCount: number;         // リトライ回数
  lastAttempt?: Date;         // 最後の送信試行時刻
  isOptimistic: boolean;      // 楽観的メッセージフラグ
}

// =============================================================================
// チャンネル状態管理の拡張型
// =============================================================================

export interface ChannelState extends ChatChannel {
  // リアルタイム同期状態
  syncStatus: 'syncing' | 'synced' | 'error';
  lastSync?: Date;
  messagesPagination: {
    hasMore: boolean;
    lastMessageId?: string;
    loading: boolean;
  };
}

// =============================================================================
// ユーザー状態管理の拡張型
// =============================================================================

export interface UserState extends ChatUser {
  // 拡張ユーザー情報
  presenceLastUpdate?: Date;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

// =============================================================================
// UI状態管理型
// =============================================================================

export interface UIState {
  // チャンネル/メッセージ選択状態
  selectedChannelId: string | null;
  selectedThreadId: string | null;

  // サイドバー・モーダル状態
  sidebar: {
    isCollapsed: boolean;
    activeTab: 'channels' | 'threads' | 'notifications';
  };

  // メッセージ入力状態
  messageInput: {
    content: string;
    attachments: ChatAttachment[];
    replyTo: ChatMessage | null;
    mentions: string[];
  };

  // 検索・フィルター状態
  search: {
    query: string;
    filters: {
      channels: string[];
      users: string[];
      dateRange: { start?: Date; end?: Date } | null;
    };
    results: {
      messages: string[];
      loading: boolean;
    };
  };

  // 通知設定
  notifications: {
    sound: boolean;
    desktop: boolean;
    mentions: boolean;
  };
}

// =============================================================================
// アクション結果型
// =============================================================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// 楽観的UI操作型
// =============================================================================

export interface OptimisticOperation {
  id: string;
  type: 'sendMessage' | 'editMessage' | 'deleteMessage' | 'addReaction';
  entityId: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  originalData?: any;
  rollbackData?: any;
}

// =============================================================================
// メッセージキュー型
// =============================================================================

export interface QueuedMessage {
  localId: string;
  channelId: string;
  content: string;
  attachments: ChatAttachment[];
  authorId: string;
  authorName: string;
  authorRole: string;
  timestamp: Date;
  retryCount: number;
  priority: 'low' | 'normal' | 'high';
}

// =============================================================================
// Firebase同期状態型
// =============================================================================

export interface SyncState {
  channels: {
    [channelId: string]: {
      isSubscribed: boolean;
      lastUpdate: Date;
      error?: string;
    };
  };

  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  retryAttempts: number;

  // バッチ同期状態
  pendingUpdates: {
    messages: string[];
    channels: string[];
    users: string[];
  };
}