/**
 * エラーハンドリングのエクスポート
 * 製造業務管理システム向けチャットシステム基盤層
 */

// エラークラスのエクスポート
export * from './ChatError';

// Error Boundaryのエクスポート
export * from './ErrorBoundary';

// 利便性のためのエクスポート
export {
  ChatError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  DatabaseError,
  FileError,
  TimestampError,
  RealtimeError,
  UIError,
  ConfigurationError,
  ErrorSeverity,
  ErrorCategory,
  isChatError,
  isErrorCritical,
  isErrorRecoverable,
  getErrorMessage,
  getUserErrorMessage,
  categorizeError
} from './ChatError';

export {
  ErrorBoundary,
  withErrorBoundary,
  setupGlobalErrorHandling,
  defaultErrorReporter,
  ConsoleErrorReporter,
  LogLevel
} from './ErrorBoundary';