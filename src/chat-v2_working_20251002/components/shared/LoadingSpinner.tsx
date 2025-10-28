import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// =============================================================================
// LoadingSpinner Component - Discord風ローディング表示
// =============================================================================

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-12 h-12",
      },
      variant: {
        default: "text-discord-text-secondary",
        primary: "text-discord-accent-primary",
        muted: "text-discord-text-muted",
        inherit: "text-current",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

const containerVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      fullWidth: {
        true: "w-full",
        false: "",
      },
      fullHeight: {
        true: "h-full",
        false: "",
      }
    },
    defaultVariants: {
      fullWidth: false,
      fullHeight: false,
    },
  }
);

interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  /** ラベルテキスト */
  label?: string;
  /** 全幅に拡張するか */
  fullWidth?: boolean;
  /** 全高に拡張するか */
  fullHeight?: boolean;
  /** 追加のCSS クラス */
  className?: string;
  /** コンテナの追加CSS クラス */
  containerClassName?: string;
}

/**
 * Discord風ローディングスピナー
 *
 * 特徴:
 * - 複数サイズ対応
 * - アクセシビリティ対応
 * - ラベル表示オプション
 * - フレキシブルレイアウト
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "default",
  label,
  fullWidth = false,
  fullHeight = false,
  className,
  containerClassName,
  ...props
}) => {
  return (
    <div
      className={cn(
        containerVariants({ fullWidth, fullHeight }),
        containerClassName
      )}
      role="status"
      aria-label={label || "読み込み中"}
      {...props}
    >
      {/* スピナーアイコン */}
      <Loader2
        className={cn(spinnerVariants({ size, variant }), className)}
        aria-hidden="true"
      />

      {/* ラベルテキスト */}
      {label && (
        <span className="ml-2 text-sm text-discord-text-secondary">
          {label}
        </span>
      )}

      {/* スクリーンリーダー用 */}
      <span className="sr-only">
        {label || "読み込み中"}
      </span>
    </div>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';

// =============================================================================
// 特殊用途のローディングコンポーネント
// =============================================================================

/**
 * メッセージリスト用ローディング
 */
export const MessageListLoading: React.FC<{
  className?: string;
}> = ({ className }) => (
  <div className={cn("flex items-center justify-center py-8", className)}>
    <LoadingSpinner
      size="lg"
      variant="muted"
      label="メッセージを読み込み中..."
    />
  </div>
);

/**
 * ページ全体のローディング
 */
export const PageLoading: React.FC<{
  className?: string;
}> = ({ className }) => (
  <div className={cn(
    "flex items-center justify-center min-h-screen bg-discord-bg-primary",
    className
  )}>
    <div className="text-center">
      <LoadingSpinner
        size="xl"
        variant="primary"
        className="mb-4"
      />
      <p className="text-discord-text-secondary">
        チャットを準備中...
      </p>
    </div>
  </div>
);

/**
 * インラインローディング（送信中など）
 */
export const InlineLoading: React.FC<{
  text?: string;
  className?: string;
}> = ({ text = "処理中...", className }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <LoadingSpinner size="xs" variant="inherit" />
    <span className="text-xs text-current">
      {text}
    </span>
  </div>
);

/**
 * スケルトンローディング（メッセージアイテム用）
 */
export const MessageSkeleton: React.FC<{
  showAvatar?: boolean;
  className?: string;
}> = ({ showAvatar = true, className }) => (
  <div className={cn("flex gap-3 p-3 animate-pulse", className)}>
    {/* アバタースケルトン */}
    {showAvatar && (
      <div className="w-10 h-10 bg-discord-bg-secondary rounded-full shrink-0" />
    )}

    <div className="flex-1 space-y-2">
      {/* ユーザー名とタイムスタンプ */}
      <div className="flex items-center gap-2">
        <div className="h-4 bg-discord-bg-secondary rounded w-20" />
        <div className="h-3 bg-discord-bg-secondary rounded w-16" />
      </div>

      {/* メッセージ内容 */}
      <div className="space-y-1">
        <div className="h-4 bg-discord-bg-secondary rounded w-full" />
        <div className="h-4 bg-discord-bg-secondary rounded w-3/4" />
      </div>
    </div>
  </div>
);

/**
 * チャンネルリスト用スケルトン
 */
export const ChannelListSkeleton: React.FC<{
  itemCount?: number;
  className?: string;
}> = ({ itemCount = 5, className }) => (
  <div className={cn("space-y-1 p-2", className)}>
    {Array.from({ length: itemCount }, (_, i) => (
      <div
        key={i}
        className="flex items-center gap-2 px-2 py-1.5 animate-pulse"
      >
        <div className="w-4 h-4 bg-discord-bg-secondary rounded" />
        <div className="h-4 bg-discord-bg-secondary rounded flex-1" />
        <div className="w-5 h-4 bg-discord-bg-secondary rounded" />
      </div>
    ))}
  </div>
);

// =============================================================================
// Export
// =============================================================================

export type { LoadingSpinnerProps };
export { spinnerVariants, containerVariants };