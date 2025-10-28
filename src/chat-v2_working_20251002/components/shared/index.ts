// =============================================================================
// Chat V2 Shared UI Components - Main Export
// Discord風共通UIコンポーネント
// =============================================================================

// Avatar Components
export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';
export { avatarVariants, statusIndicatorVariants } from './Avatar';

// Status & Timestamp Components
export {
  StatusIndicator,
  MessageTimestamp
} from './StatusIndicator';
export type {
  StatusIndicatorProps,
  MessageTimestampProps
} from './StatusIndicator';
export { statusIndicatorVariants } from './StatusIndicator';

// Loading Components
export {
  LoadingSpinner,
  MessageListLoading,
  PageLoading,
  InlineLoading,
  MessageSkeleton,
  ChannelListSkeleton
} from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';
export { spinnerVariants, containerVariants } from './LoadingSpinner';

// Error Boundary Components
export {
  ChatErrorBoundary,
  CompactErrorBoundary
} from './ErrorBoundary';
export type {
  ChatErrorBoundaryProps,
  CompactErrorBoundaryProps,
  DefaultErrorFallbackProps
} from './ErrorBoundary';

// Badge Components
export {
  Badge,
  UnreadBadge,
  MentionBadge,
  OnlineBadge,
  StatusBadge,
  RoleBadge
} from './Badge';
export type { BadgeProps } from './Badge';
export { badgeVariants } from './Badge';

// Virtual List Components
export { VirtualScrollMessageList } from './VirtualList';
export type { VirtualScrollMessageListProps } from './VirtualList';

// =============================================================================
// Type Aggregations - 型の再エクスポート
// =============================================================================

export type SharedUIProps = {
  Avatar: AvatarProps;
  StatusIndicator: StatusIndicatorProps;
  MessageTimestamp: MessageTimestampProps;
  LoadingSpinner: LoadingSpinnerProps;
  Badge: BadgeProps;
  ChatErrorBoundary: ChatErrorBoundaryProps;
  CompactErrorBoundary: CompactErrorBoundaryProps;
};

// =============================================================================
// Component Collections - 用途別コンポーネント集
// =============================================================================

/**
 * メッセージ表示関連コンポーネント
 */
export const MessageUIComponents = {
  Avatar,
  StatusIndicator,
  MessageTimestamp,
  Badge,
  UnreadBadge,
  MentionBadge,
} as const;

/**
 * ローディング関連コンポーネント
 */
export const LoadingUIComponents = {
  LoadingSpinner,
  MessageListLoading,
  PageLoading,
  InlineLoading,
  MessageSkeleton,
  ChannelListSkeleton,
} as const;

/**
 * エラーハンドリング関連コンポーネント
 */
export const ErrorUIComponents = {
  ChatErrorBoundary,
  CompactErrorBoundary,
} as const;

/**
 * ステータス表示関連コンポーネント
 */
export const StatusUIComponents = {
  StatusIndicator,
  Badge,
  UnreadBadge,
  MentionBadge,
  OnlineBadge,
  StatusBadge,
  RoleBadge,
} as const;

// =============================================================================
// Utility Functions - ユーティリティ関数
// =============================================================================

/**
 * ユーザーの表示名を取得
 */
export const getDisplayName = (user: {
  name?: string;
  displayName?: string;
  email?: string;
}): string => {
  return user.displayName || user.name || user.email || 'Unknown User';
};

/**
 * アバターのイニシャルを生成
 */
export const generateInitials = (name: string): string => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return '?';

  // 英数字の場合は最初の2文字
  if (/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
    const words = trimmedName.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return trimmedName.substring(0, 2).toUpperCase();
  }

  // 日本語の場合は最初の1文字
  return trimmedName[0];
};

/**
 * 相対時間をフォーマット
 */
export const formatRelativeTime = (timestamp: Date, now: Date = new Date()): string => {
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return timestamp.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
};

/**
 * 未読件数をフォーマット（99+対応）
 */
export const formatUnreadCount = (count: number, max: number = 99): string => {
  if (count <= 0) return '0';
  if (count <= max) return count.toString();
  return `${max}+`;
};

/**
 * オンライン状態の判定
 */
export const isUserOnline = (user: {
  status?: string;
  lastActivity?: Date;
}): boolean => {
  if (user.status === 'online') return true;
  if (user.status === 'offline') return false;

  // 最終アクティビティから5分以内はオンライン扱い
  if (user.lastActivity) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return user.lastActivity > fiveMinutesAgo;
  }

  return false;
};

// =============================================================================
// Constants - 定数
// =============================================================================

/**
 * Discord風カラーパレット
 */
export const DISCORD_COLORS = {
  bg: {
    primary: '#36393f',
    secondary: '#2f3136',
    tertiary: '#202225',
  },
  text: {
    primary: '#dcddde',
    secondary: '#b9bbbe',
    muted: '#72767d',
  },
  accent: {
    primary: '#5865f2',
    hover: '#4752c4',
  },
  status: {
    online: '#3ba55c',
    idle: '#faa61a',
    busy: '#ed4245',
    offline: '#747f8d',
  },
  message: {
    sending: '#faa61a',
    sent: '#3ba55c',
    failed: '#ed4245',
  }
} as const;

/**
 * デフォルトサイズ設定
 */
export const DEFAULT_SIZES = {
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  },
  badge: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
  },
  icon: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  }
} as const;

// =============================================================================
// Version Information
// =============================================================================

export const SHARED_UI_VERSION = '1.0.0';
export const SHARED_UI_BUILD_DATE = new Date().toISOString();