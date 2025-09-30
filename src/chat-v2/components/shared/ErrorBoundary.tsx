import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// =============================================================================
// ChatErrorBoundary Component - チャット専用エラー境界
// =============================================================================

interface ErrorInfo {
  componentStack: string;
}

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ChatErrorBoundaryProps {
  /** エラー発生時のフォールバックUI */
  fallback?: React.ComponentType<{
    error: Error | null;
    retry: () => void;
    goHome: () => void;
  }>;
  /** エラー報告のコールバック */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 最大リトライ回数 */
  maxRetries?: number;
  /** 子コンポーネント */
  children: React.ReactNode;
  /** 追加のCSS クラス */
  className?: string;
}

/**
 * チャット専用エラー境界コンポーネント
 *
 * 特徴:
 * - 自動リトライ機能
 * - カスタマイズ可能なフォールバックUI
 * - エラー報告機能
 * - アクセシビリティ対応
 */
export class ChatErrorBoundary extends React.Component<
  ChatErrorBoundaryProps,
  ChatErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ChatErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ChatErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // エラー報告
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 開発環境でのエラーログ
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Chat Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  retry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  goHome = () => {
    // チャットページから離脱
    window.location.href = '/';
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { fallback: Fallback, maxRetries = 3, children, className } = this.props;

    if (hasError) {
      // カスタムフォールバックがある場合
      if (Fallback) {
        return (
          <div className={className}>
            <Fallback
              error={error}
              retry={this.retry}
              goHome={this.goHome}
            />
          </div>
        );
      }

      // デフォルトのフォールバックUI
      return (
        <DefaultErrorFallback
          error={error}
          retry={this.retry}
          goHome={this.goHome}
          canRetry={retryCount < maxRetries}
          retryCount={retryCount}
          maxRetries={maxRetries}
          className={className}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// デフォルトエラーフォールバックUI
// =============================================================================

interface DefaultErrorFallbackProps {
  error: Error | null;
  retry: () => void;
  goHome: () => void;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  className?: string;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  retry,
  goHome,
  canRetry,
  retryCount,
  maxRetries,
  className
}) => {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-[400px] p-8",
      "bg-discord-bg-primary border border-discord-bg-secondary rounded-lg",
      className
    )}>
      <div className="text-center max-w-md">
        {/* エラーアイコン */}
        <div className="mb-6">
          <AlertTriangle
            size={64}
            className="mx-auto text-discord-danger"
            aria-hidden="true"
          />
        </div>

        {/* エラーメッセージ */}
        <h3 className="text-xl font-semibold text-discord-text-primary mb-2">
          チャットで問題が発生しました
        </h3>

        <p className="text-discord-text-secondary mb-6">
          申し訳ありませんが、チャット機能で予期しないエラーが発生しました。
          {retryCount > 0 && (
            <span className="block mt-2 text-sm">
              リトライ回数: {retryCount}/{maxRetries}
            </span>
          )}
        </p>

        {/* エラー詳細（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-discord-text-muted hover:text-discord-text-secondary">
              エラー詳細を表示
            </summary>
            <pre className="mt-2 p-3 bg-discord-bg-tertiary rounded text-xs text-discord-text-secondary overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* リトライボタン */}
          {canRetry && (
            <button
              type="button"
              onClick={retry}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md",
                "bg-discord-accent-primary hover:bg-discord-accent-hover",
                "text-white font-medium",
                "focus:outline-none focus:ring-2 focus:ring-discord-accent-primary focus:ring-offset-2",
                "transition-colors duration-200"
              )}
              aria-describedby="retry-description"
            >
              <RefreshCw size={16} aria-hidden="true" />
              再試行
            </button>
          )}

          {/* ホームボタン */}
          <button
            type="button"
            onClick={goHome}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-md",
              "bg-discord-bg-secondary hover:bg-gray-600",
              "text-discord-text-primary font-medium",
              "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
              "transition-colors duration-200"
            )}
          >
            <Home size={16} aria-hidden="true" />
            ホームに戻る
          </button>
        </div>

        {/* 説明テキスト */}
        <p
          id="retry-description"
          className="mt-4 text-sm text-discord-text-muted"
        >
          問題が続く場合は、ページを再読み込みするか、システム管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// 軽量版エラー境界（小さなコンポーネント用）
// =============================================================================

interface CompactErrorBoundaryProps {
  /** エラー発生時のフォールバックコンテンツ */
  fallback?: React.ReactNode;
  /** 子コンポーネント */
  children: React.ReactNode;
  /** 追加のCSS クラス */
  className?: string;
}

interface CompactErrorBoundaryState {
  hasError: boolean;
}

/**
 * 軽量版エラー境界（小さなコンポーネント用）
 */
export class CompactErrorBoundary extends React.Component<
  CompactErrorBoundaryProps,
  CompactErrorBoundaryState
> {
  constructor(props: CompactErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CompactErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Compact Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={cn("text-center py-4", this.props.className)}>
          {this.props.fallback || (
            <div className="text-discord-text-muted text-sm">
              <AlertTriangle size={16} className="inline mr-2" />
              読み込みエラー
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// Export
// =============================================================================

export type {
  ChatErrorBoundaryProps,
  CompactErrorBoundaryProps,
  DefaultErrorFallbackProps
};