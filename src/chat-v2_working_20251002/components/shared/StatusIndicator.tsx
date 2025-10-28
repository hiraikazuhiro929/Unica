import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Loader2,
  type LucideIcon
} from 'lucide-react';
import type { MessageState } from '../../store/types';

// =============================================================================
// StatusIndicator Component - メッセージ送信状態表示
// =============================================================================

const statusIndicatorVariants = cva(
  "inline-flex items-center gap-1 text-xs font-medium",
  {
    variants: {
      status: {
        sending: "text-status-sending",
        sent: "text-status-sent",
        failed: "text-status-failed",
        synced: "text-status-sent",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
      }
    },
    defaultVariants: {
      status: "sent",
      size: "sm",
    },
  }
);

interface StatusConfig {
  icon: LucideIcon;
  label: string;
  ariaLabel: string;
  showSpinner?: boolean;
}

const statusConfig: Record<MessageState['optimisticStatus'], StatusConfig> = {
  sending: {
    icon: Clock,
    label: '送信中',
    ariaLabel: 'メッセージを送信中',
    showSpinner: true,
  },
  sent: {
    icon: Check,
    label: '送信済み',
    ariaLabel: 'メッセージを送信しました',
  },
  synced: {
    icon: CheckCheck,
    label: '配信済み',
    ariaLabel: 'メッセージが配信されました',
  },
  failed: {
    icon: AlertCircle,
    label: '送信失敗',
    ariaLabel: 'メッセージの送信に失敗しました',
  },
};

interface StatusIndicatorProps extends VariantProps<typeof statusIndicatorVariants> {
  /** メッセージの送信状態 */
  status: MessageState['optimisticStatus'];
  /** ラベルテキストを表示するか */
  showLabel?: boolean;
  /** アイコンサイズ */
  iconSize?: number;
  /** リトライ機能を有効にするか（failed時のみ） */
  enableRetry?: boolean;
  /** リトライボタンのクリックハンドラー */
  onRetry?: () => void;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * Discord風メッセージステータスインジケーター
 *
 * 特徴:
 * - 送信状態の視覚的表示
 * - アニメーション（送信中）
 * - リトライ機能（失敗時）
 * - アクセシビリティ対応
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = "sm",
  showLabel = false,
  iconSize = 14,
  enableRetry = false,
  onRetry,
  className,
  ...props
}) => {
  const config = statusConfig[status];
  const Icon = config.showSpinner ? Loader2 : config.icon;

  const handleRetryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry) {
      onRetry();
    }
  };

  const handleRetryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (onRetry) {
        onRetry();
      }
    }
  };

  return (
    <div
      className={cn(statusIndicatorVariants({ status, size }), className)}
      role="status"
      aria-label={config.ariaLabel}
      {...props}
    >
      {/* ステータスアイコン */}
      <Icon
        size={iconSize}
        className={cn(
          "shrink-0",
          config.showSpinner && "animate-spin"
        )}
        aria-hidden="true"
      />

      {/* ラベルテキスト */}
      {showLabel && (
        <span className="truncate">
          {config.label}
        </span>
      )}

      {/* リトライボタン（失敗時のみ） */}
      {status === 'failed' && enableRetry && onRetry && (
        <button
          type="button"
          onClick={handleRetryClick}
          onKeyDown={handleRetryKeyDown}
          className={cn(
            "ml-1 px-1.5 py-0.5 text-xs rounded",
            "bg-discord-danger hover:bg-red-600",
            "text-white font-medium",
            "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1",
            "transition-colors duration-200"
          )}
          aria-label="メッセージを再送信"
        >
          再送信
        </button>
      )}

      {/* スクリーンリーダー用の動的メッセージ */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {config.ariaLabel}
      </span>
    </div>
  );
};

StatusIndicator.displayName = 'StatusIndicator';

// =============================================================================
// 関連コンポーネント: MessageTimestamp
// =============================================================================

interface MessageTimestampProps {
  /** メッセージのタイムスタンプ */
  timestamp: Date;
  /** フォーマット種類 */
  format?: 'relative' | 'absolute' | 'both';
  /** サイズ */
  size?: 'sm' | 'md';
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * メッセージのタイムスタンプ表示
 */
export const MessageTimestamp: React.FC<MessageTimestampProps> = ({
  timestamp,
  format = 'relative',
  size = 'sm',
  className
}) => {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // 1分ごとに現在時刻を更新（相対時間の精度向上）
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatRelativeTime = (date: Date): string => {
    const diffMs = currentTime.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAbsoluteTime = (date: Date): string => {
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const relativeTime = formatRelativeTime(timestamp);
  const absoluteTime = formatAbsoluteTime(timestamp);

  const displayText = format === 'relative' ? relativeTime :
                     format === 'absolute' ? absoluteTime :
                     relativeTime;

  return (
    <time
      dateTime={timestamp.toISOString()}
      className={cn(
        "text-discord-text-muted",
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
      title={format === 'relative' ? absoluteTime : undefined}
    >
      {displayText}
    </time>
  );
};

MessageTimestamp.displayName = 'MessageTimestamp';

// =============================================================================
// Export
// =============================================================================

export type { StatusIndicatorProps, MessageTimestampProps };
export { statusIndicatorVariants };