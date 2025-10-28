import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// =============================================================================
// Badge Component - Discord風バッジ表示
// =============================================================================

const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-full transition-colors",
  {
    variants: {
      variant: {
        default: "bg-discord-bg-secondary text-discord-text-primary",
        primary: "bg-discord-accent-primary text-white",
        success: "bg-discord-success text-white",
        warning: "bg-discord-warning text-white",
        danger: "bg-discord-danger text-white",
        unread: "bg-red-500 text-white",
        mention: "bg-red-600 text-white",
        online: "bg-green-500 text-white",
        outline: "border border-discord-bg-secondary text-discord-text-secondary",
      },
      size: {
        xs: "text-xs h-4 min-w-[16px] px-1",
        sm: "text-xs h-5 min-w-[20px] px-1.5",
        md: "text-sm h-6 min-w-[24px] px-2",
        lg: "text-sm h-7 min-w-[28px] px-2.5",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
      pulse: false,
    },
  }
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  /** バッジの表示内容 */
  children?: React.ReactNode;
  /** 数値（自動的にフォーマット） */
  count?: number;
  /** 最大表示数（超えた場合は "99+" のように表示） */
  max?: number;
  /** 0件でも表示するか */
  showZero?: boolean;
  /** ドット表示（数値なし） */
  dot?: boolean;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * Discord風バッジコンポーネント
 *
 * 特徴:
 * - 未読件数表示
 * - メンション通知
 * - オンライン状態
 * - 数値の自動フォーマット
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  count,
  max = 99,
  showZero = false,
  dot = false,
  variant = "default",
  size = "sm",
  pulse = false,
  className,
  ...props
}) => {
  // カウント表示の判定
  const shouldShowCount = count !== undefined && (count > 0 || showZero);
  const shouldShow = shouldShowCount || dot || children;

  if (!shouldShow) {
    return null;
  }

  // カウント表示内容の決定
  const displayContent = React.useMemo(() => {
    if (dot) {
      return null; // ドットのみ
    }

    if (children) {
      return children;
    }

    if (count !== undefined) {
      if (count <= max) {
        return count.toString();
      }
      return `${max}+`;
    }

    return null;
  }, [children, count, max, dot]);

  // ドット用のスタイル調整
  const dotClasses = dot ? {
    xs: "w-2 h-2 min-w-[8px]",
    sm: "w-2.5 h-2.5 min-w-[10px]",
    md: "w-3 h-3 min-w-[12px]",
    lg: "w-3.5 h-3.5 min-w-[14px]",
  }[size!] : "";

  return (
    <span
      className={cn(
        badgeVariants({ variant, size, pulse }),
        dot && dotClasses,
        className
      )}
      role={count !== undefined ? "status" : undefined}
      aria-label={count !== undefined ? `${count}件の未読` : undefined}
      {...props}
    >
      {displayContent}
    </span>
  );
};

Badge.displayName = 'Badge';

// =============================================================================
// 特殊用途のバッジコンポーネント
// =============================================================================

/**
 * 未読件数バッジ
 */
export const UnreadBadge: React.FC<{
  count: number;
  max?: number;
  size?: BadgeProps['size'];
  className?: string;
}> = ({ count, max = 99, size = "sm", className }) => {
  if (count <= 0) return null;

  return (
    <Badge
      variant="unread"
      size={size}
      count={count}
      max={max}
      className={className}
      aria-label={`${count}件の未読メッセージ`}
    />
  );
};

/**
 * メンションバッジ
 */
export const MentionBadge: React.FC<{
  count: number;
  max?: number;
  size?: BadgeProps['size'];
  className?: string;
}> = ({ count, max = 99, size = "sm", className }) => {
  if (count <= 0) return null;

  return (
    <Badge
      variant="mention"
      size={size}
      count={count}
      max={max}
      pulse
      className={className}
      aria-label={`${count}件のメンション`}
    />
  );
};

/**
 * オンライン状態バッジ
 */
export const OnlineBadge: React.FC<{
  isOnline: boolean;
  size?: BadgeProps['size'];
  className?: string;
}> = ({ isOnline, size = "xs", className }) => {
  if (!isOnline) return null;

  return (
    <Badge
      variant="online"
      size={size}
      dot
      className={className}
      aria-label="オンライン"
    />
  );
};

/**
 * ステータスバッジ（成功、警告、エラーなど）
 */
export const StatusBadge: React.FC<{
  status: 'success' | 'warning' | 'danger';
  text: string;
  size?: BadgeProps['size'];
  className?: string;
}> = ({ status, text, size = "sm", className }) => {
  const variantMap = {
    success: 'success' as const,
    warning: 'warning' as const,
    danger: 'danger' as const,
  };

  return (
    <Badge
      variant={variantMap[status]}
      size={size}
      className={className}
    >
      {text}
    </Badge>
  );
};

/**
 * ロールバッジ（ユーザーの役割表示）
 */
export const RoleBadge: React.FC<{
  role: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: BadgeProps['size'];
  className?: string;
}> = ({ role, color = 'default', size = "xs", className }) => {
  const variantMap = {
    default: 'outline' as const,
    primary: 'primary' as const,
    success: 'success' as const,
    warning: 'warning' as const,
    danger: 'danger' as const,
  };

  return (
    <Badge
      variant={variantMap[color]}
      size={size}
      className={className}
    >
      {role}
    </Badge>
  );
};

// =============================================================================
// Export
// =============================================================================

export type { BadgeProps };
export { badgeVariants };