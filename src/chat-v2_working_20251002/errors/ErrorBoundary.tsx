/**
 * エラー境界とログシステム
 * React Error Boundary とエラーレポート機能
 * 製造業務管理システム向けチャットシステム基盤層
 */

import { ReactNode, Component, ErrorInfo } from 'react';
import { ChatError, ErrorSeverity, ErrorCategory, ErrorReport, isChatError } from './ChatError';

// ===============================
// エラーログレベル
// ===============================

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;
export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// ===============================
// エラーレポーター インターフェース
// ===============================

/**
 * エラー報告機能のインターフェース
 */
export interface ErrorReporter {
  /**
   * エラーを報告
   */
  report(errorReport: ErrorReport): Promise<void>;

  /**
   * ログレベルに応じてメッセージを記録
   */
  log(level: LogLevel, message: string, data?: unknown): void;

  /**
   * パフォーマンス指標を報告
   */
  reportPerformance?(metric: string, value: number, tags?: Record<string, string>): void;
}

// ===============================
// デフォルトエラーレポーター
// ===============================

/**
 * コンソールベースのデフォルトエラーレポーター
 */
export class ConsoleErrorReporter implements ErrorReporter {
  private readonly isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  async report(errorReport: ErrorReport): Promise<void> {
    const logMethod = this.getLogMethod(errorReport.severity);

    if (this.isDevelopment) {
      // 開発環境では詳細な情報を表示
      console.group(`🚨 ${errorReport.name} [${errorReport.category}]`);
      console.log('メッセージ:', errorReport.message);
      console.log('エラーID:', errorReport.id);
      console.log('重要度:', errorReport.severity);
      console.log('復旧可能:', errorReport.recoverable ? 'はい' : 'いいえ');

      if (errorReport.userMessage) {
        console.log('ユーザーメッセージ:', errorReport.userMessage);
      }

      if (errorReport.code) {
        console.log('エラーコード:', errorReport.code);
      }

      console.log('コンテキスト:', errorReport.context);

      if (errorReport.originalError) {
        console.log('元のエラー:', errorReport.originalError);
      }

      console.groupEnd();
    } else {
      // 本番環境では簡潔な情報のみ
      logMethod(`[${errorReport.category}] ${errorReport.message}`, {
        id: errorReport.id,
        severity: errorReport.severity,
        userMessage: errorReport.userMessage,
        timestamp: errorReport.context.timestamp
      });
    }

    // 致命的エラーの場合は追加処理
    if (errorReport.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(errorReport);
    }
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    const logMethod = this.getConsoleMethod(level);
    const timestamp = new Date().toISOString();

    if (data) {
      logMethod(`[${timestamp}] ${message}`, data);
    } else {
      logMethod(`[${timestamp}] ${message}`);
    }
  }

  reportPerformance(metric: string, value: number, tags?: Record<string, string>): void {
    if (this.isDevelopment) {
      console.log(`📊 Performance: ${metric} = ${value}ms`, tags);
    }
  }

  private getLogMethod(severity: ErrorSeverity): (...args: unknown[]) => void {
    switch (severity) {
      case ErrorSeverity.INFO:
        return console.info;
      case ErrorSeverity.WARNING:
        return console.warn;
      case ErrorSeverity.ERROR:
        return console.error;
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private handleCriticalError(errorReport: ErrorReport): void {
    // 致命的エラーの場合の特別処理
    console.error('🔥 CRITICAL ERROR DETECTED 🔥');
    console.error('システムの安定性に影響する可能性があります');

    // 本番環境では外部サービスへの報告なども実装可能
    if (!this.isDevelopment) {
      // 外部エラー報告サービスへの送信
      // this.sendToCrashlytics(errorReport);
      // this.sendToSentry(errorReport);
    }
  }
}

// ===============================
// Error Boundary State
// ===============================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// ===============================
// Error Boundary Props
// ===============================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  errorReporter?: ErrorReporter;
}

// ===============================
// Error Boundary Component
// ===============================

/**
 * React Error Boundary コンポーネント
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorReporter: ErrorReporter;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };

    this.errorReporter = props.errorReporter || new ConsoleErrorReporter();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `boundary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;

    this.setState({ errorInfo });

    // ChatError として処理
    const chatError = this.convertToChatError(error, errorInfo);

    // エラーレポーターに報告
    this.errorReporter.report(chatError.toReport()).catch(reportError => {
      console.error('Error reporting failed:', reportError);
    });

    // カスタムエラーハンドラーを呼び出し
    if (onError) {
      onError(error, errorInfo);
    }

    // パフォーマンス指標の報告
    if (this.errorReporter.reportPerformance) {
      this.errorReporter.reportPerformance('error_boundary_triggered', 1, {
        errorType: error.constructor.name,
        category: isChatError(error) ? error.category : 'unknown'
      });
    }
  }

  private convertToChatError(error: Error, errorInfo: ErrorInfo): ChatError {
    if (isChatError(error)) {
      return error;
    }

    // 一般的な Error を ChatError に変換
    return new ChatError(
      error.message || 'React component error occurred',
      ErrorCategory.UI,
      ErrorSeverity.ERROR,
      {
        code: 'REACT_ERROR_BOUNDARY',
        originalError: error,
        recoverable: true,
        userMessage: 'アプリケーションエラーが発生しました。ページを再読み込みしてください。',
        context: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          timestamp: new Date().toISOString()
        }
      }
    );
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    this.errorReporter.log(LogLevel.INFO, 'Error boundary retry triggered');
  };

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { children, fallback, enableRetry = true } = this.props;

    if (hasError && error && errorId) {
      // カスタムフォールバックが提供されている場合
      if (fallback) {
        return fallback(error, errorId, this.handleRetry);
      }

      // デフォルトエラーUI
      return this.renderDefaultErrorUI(error, errorId);
    }

    return children;
  }

  private renderDefaultErrorUI(error: Error, errorId: string): ReactNode {
    const { enableRetry } = this.props;
    const isRecoverable = isChatError(error) ? error.recoverable : true;
    const userMessage = isChatError(error) ? error.userMessage : undefined;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-400">
              {/* エラーアイコン */}
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              エラーが発生しました
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {userMessage || 'アプリケーションでエラーが発生しました。'}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              エラーID: {errorId}
            </p>
          </div>

          {enableRetry && isRecoverable && (
            <div className="mt-8 space-y-4">
              <button
                onClick={this.handleRetry}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                再試行
              </button>

              <button
                onClick={() => window.location.reload()}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ページを再読み込み
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              問題が続く場合は、管理者にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    );
  }
}

// ===============================
// エラー境界 HOC
// ===============================

/**
 * エラー境界でコンポーネントをラップするHOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// ===============================
// グローバルエラーハンドラー
// ===============================

/**
 * グローバルエラーハンドラーのセットアップ
 */
export function setupGlobalErrorHandling(errorReporter: ErrorReporter = new ConsoleErrorReporter()): () => void {
  // 未処理のPromise rejection
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    const chatError = new ChatError(
      error.message,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.ERROR,
      {
        code: 'UNHANDLED_PROMISE_REJECTION',
        originalError: error,
        recoverable: true,
        userMessage: '予期しないエラーが発生しました。',
        context: {
          type: 'unhandled_promise_rejection',
          timestamp: new Date().toISOString()
        }
      }
    );

    errorReporter.report(chatError.toReport()).catch(console.error);
  };

  // 未処理のJavaScriptエラー
  const handleError = (event: ErrorEvent) => {
    const chatError = new ChatError(
      event.message,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.ERROR,
      {
        code: 'UNHANDLED_ERROR',
        recoverable: true,
        userMessage: 'JavaScriptエラーが発生しました。',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript_error',
          timestamp: new Date().toISOString()
        }
      }
    );

    errorReporter.report(chatError.toReport()).catch(console.error);
  };

  // イベントリスナーの追加
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleError);

  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleError);
  };
}

// ===============================
// エクスポート用のデフォルトインスタンス
// ===============================

/**
 * デフォルトエラーレポーター
 */
export const defaultErrorReporter = new ConsoleErrorReporter();