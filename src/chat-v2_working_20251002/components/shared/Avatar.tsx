import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { UserState } from '../../store/types';

// =============================================================================
// Avatar Component - Discord風アバター表示
// =============================================================================

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-full select-none overflow-hidden",
  {
    variants: {
      size: {
        xs: "w-6 h-6 text-xs",
        sm: "w-8 h-8 text-sm",
        md: "w-10 h-10 text-base",
        lg: "w-12 h-12 text-lg",
        xl: "w-16 h-16 text-xl",
      },
      variant: {
        default: "bg-discord-bg-secondary text-discord-text-primary",
        online: "bg-discord-bg-secondary text-discord-text-primary",
        offline: "bg-discord-bg-tertiary text-discord-text-muted",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

const statusIndicatorVariants = cva(
  "absolute bottom-0 right-0 rounded-full border-2 border-discord-bg-primary",
  {
    variants: {
      size: {
        xs: "w-2 h-2",
        sm: "w-2.5 h-2.5",
        md: "w-3 h-3",
        lg: "w-3.5 h-3.5",
        xl: "w-4 h-4",
      },
      status: {
        online: "bg-discord-success",
        idle: "bg-yellow-500",
        busy: "bg-discord-danger",
        offline: "bg-gray-500",
      }
    },
    defaultVariants: {
      size: "md",
      status: "offline",
    },
  }
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** ユーザー情報 */
  user?: Pick<UserState, 'id' | 'name' | 'avatar' | 'status'>;
  /** 表示名（userが未指定の場合） */
  displayName?: string;
  /** アバター画像URL（userが未指定の場合） */
  src?: string;
  /** オンライン状態（userが未指定の場合） */
  status?: UserState['status'];
  /** ステータスインジケーターを表示するか */
  showStatus?: boolean;
  /** クリックハンドラー */
  onClick?: () => void;
  /** アクセシビリティ用のaria-label */
  'aria-label'?: string;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * Discord風アバターコンポーネント
 *
 * 特徴:
 * - 画像とフォールバック（イニシャル）表示
 * - オンライン状態インジケーター
 * - 複数サイズ対応
 * - アクセシビリティ対応
 */
export const Avatar: React.FC<AvatarProps> = ({
  user,
  displayName,
  src,
  status,
  size = "md",
  variant = "default",
  showStatus = true,
  onClick,
  'aria-label': ariaLabel,
  className,
  ...props
}) => {
  // ユーザー情報から値を取得、fallbackを使用
  const finalDisplayName = user?.name || displayName || 'Unknown';
  const finalSrc = user?.avatar || src;
  const finalStatus = user?.status || status || 'offline';

  // イニシャル生成（日本語対応）
  const initials = React.useMemo(() => {
    const name = finalDisplayName.trim();
    if (name.length === 0) return '?';

    // 英数字の場合は最初の2文字
    if (/^[a-zA-Z0-9\s]+$/.test(name)) {
      const words = name.split(/\s+/);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }

    // 日本語の場合は最初の1文字
    return name[0];
  }, [finalDisplayName]);

  // 画像読み込み状態管理
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    if (finalSrc) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [finalSrc]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  // アクセシビリティラベル
  const accessibilityLabel = ariaLabel ||
    `${finalDisplayName}${showStatus ? `, ${finalStatus}` : ''}`;

  // スタイル計算
  const avatarClasses = cn(
    avatarVariants({ size, variant }),
    onClick && "cursor-pointer hover:opacity-80 transition-opacity",
    className
  );

  return (
    <div
      className={avatarClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={accessibilityLabel}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      {...props}
    >
      {/* 画像表示 */}
      {finalSrc && !imageError && (
        <img
          src={finalSrc}
          alt={`${finalDisplayName}のアバター`}
          className={cn(
            "w-full h-full object-cover",
            !imageLoaded && "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}

      {/* イニシャル表示（画像がない場合やエラー時） */}
      {(!finalSrc || imageError || !imageLoaded) && (
        <span
          className="font-medium"
          aria-hidden="true"
        >
          {initials}
        </span>
      )}

      {/* ステータスインジケーター */}
      {showStatus && (
        <div
          className={statusIndicatorVariants({ size, status: finalStatus })}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';

// =============================================================================
// Export
// =============================================================================

export type { AvatarProps };
export { avatarVariants, statusIndicatorVariants };