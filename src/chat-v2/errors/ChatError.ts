/**
 * チャットエラー基底クラスとエラーハンドリングシステム
 * 製造業務管理システム向けチャットシステム基盤層
 */

import { MessageId, ChannelId, UserId } from '../types/brand';

// ===============================
// エラー重要度レベル
// ===============================

export const ErrorSeverity = {
  /** 情報レベル - ログ記録のみ */
  INFO: 'info',
  /** 警告レベル - 処理継続可能だが注意が必要 */
  WARNING: 'warning',
  /** エラーレベル - 処理失敗、ユーザーへの通知必要 */
  ERROR: 'error',
  /** 致命的レベル - システム停止の可能性 */
  CRITICAL: 'critical'
} as const;
export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

// ===============================
// エラーカテゴリ
// ===============================

export const ErrorCategory = {
  /** ネットワーク関連エラー */
  NETWORK: 'network',
  /** データ検証エラー */
  VALIDATION: 'validation',
  /** 認証・認可エラー */
  AUTHENTICATION: 'authentication',
  /** データベース操作エラー */
  DATABASE: 'database',
  /** ファイル操作エラー */
  FILE: 'file',
  /** タイムスタンプ関連エラー */
  TIMESTAMP: 'timestamp',
  /** リアルタイム同期エラー */
  REALTIME: 'realtime',
  /** UI/UX関連エラー */
  UI: 'ui',
  /** 設定エラー */
  CONFIGURATION: 'configuration',
  /** 不明なエラー */
  UNKNOWN: 'unknown'
} as const;
export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

// ===============================
// エラーコンテキスト
// ===============================

/**
 * エラー発生時のコンテキスト情報
 */
export interface ErrorContext {
  /** エラー発生時刻（ISO文字列） */
  readonly timestamp: string;
  /** ユーザーID（分かる場合） */
  readonly userId?: UserId;
  /** チャンネルID（分かる場合） */
  readonly channelId?: ChannelId;
  /** メッセージID（分かる場合） */
  readonly messageId?: MessageId;
  /** ブラウザ情報 */
  readonly userAgent?: string;
  /** URL情報 */
  readonly url?: string;
  /** 追加のメタデータ */
  readonly metadata?: Record<string, unknown>;
  /** スタックトレース */
  readonly stackTrace?: string;
}

// ===============================
// エラー報告情報
// ===============================

/**
 * エラー報告用の構造化データ
 */
export interface ErrorReport {
  /** エラーID（一意識別子） */
  readonly id: string;
  /** エラー名 */
  readonly name: string;
  /** エラーメッセージ */
  readonly message: string;
  /** エラーカテゴリ */
  readonly category: ErrorCategory;
  /** 重要度 */
  readonly severity: ErrorSeverity;
  /** エラーコード */
  readonly code?: string;
  /** コンテキスト情報 */
  readonly context: ErrorContext;
  /** 元のエラー（存在する場合） */
  readonly originalError?: Error;
  /** 復旧可能かどうか */
  readonly recoverable: boolean;
  /** ユーザー向けメッセージ */
  readonly userMessage?: string;
}

// ===============================
// ChatError 基底クラス
// ===============================

/**
 * チャットシステム用エラー基底クラス
 */
export class ChatError extends Error {
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly code?: string;
  readonly context: ErrorContext;
  readonly originalError?: Error;
  readonly recoverable: boolean;
  readonly userMessage?: string;
  readonly errorId: string;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(message);

    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.code = options.code;
    this.originalError = options.originalError;
    this.recoverable = options.recoverable ?? false;
    this.userMessage = options.userMessage;
    this.errorId = this.generateErrorId();

    // コンテキストの構築
    this.context = {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      stackTrace: this.stack,
      ...options.context
    };

    // スタックトレースの適切な設定
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * エラーIDの生成
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `chat_error_${timestamp}_${random}`;
  }

  /**
   * エラー報告用オブジェクトを生成
   */
  toReport(): ErrorReport {
    return {
      id: this.errorId,
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      context: this.context,
      originalError: this.originalError,
      recoverable: this.recoverable,
      userMessage: this.userMessage
    };
  }

  /**
   * JSON化（ログ出力用）
   */
  toJSON(): object {
    return {
      errorId: this.errorId,
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      recoverable: this.recoverable,
      userMessage: this.userMessage,
      context: this.context,
      originalError: this.originalError?.message
    };
  }
}

// ===============================
// 具体的なエラークラス
// ===============================

/**
 * ネットワーク関連エラー
 */
export class NetworkError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.ERROR,
      {
        recoverable: true,
        userMessage: 'ネットワークエラーが発生しました。接続状況を確認してください。',
        ...options
      }
    );
  }
}

/**
 * データ検証エラー
 */
export class ValidationError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.WARNING,
      {
        recoverable: true,
        userMessage: '入力データに問題があります。内容を確認してください。',
        ...options
      }
    );
  }
}

/**
 * 認証・認可エラー
 */
export class AuthenticationError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.ERROR,
      {
        recoverable: false,
        userMessage: '認証エラーが発生しました。再度ログインしてください。',
        ...options
      }
    );
  }
}

/**
 * データベース操作エラー
 */
export class DatabaseError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.ERROR,
      {
        recoverable: true,
        userMessage: 'データベースエラーが発生しました。しばらく待ってから再試行してください。',
        ...options
      }
    );
  }
}

/**
 * ファイル操作エラー
 */
export class FileError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.FILE,
      ErrorSeverity.ERROR,
      {
        recoverable: true,
        userMessage: 'ファイル操作エラーが発生しました。ファイル形式やサイズを確認してください。',
        ...options
      }
    );
  }
}

/**
 * タイムスタンプ関連エラー
 */
export class TimestampError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.TIMESTAMP,
      ErrorSeverity.WARNING,
      {
        recoverable: true,
        userMessage: '時刻データの処理でエラーが発生しました。',
        ...options
      }
    );
  }
}

/**
 * リアルタイム同期エラー
 */
export class RealtimeError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.REALTIME,
      ErrorSeverity.ERROR,
      {
        recoverable: true,
        userMessage: 'リアルタイム同期でエラーが発生しました。ページを再読み込みしてください。',
        ...options
      }
    );
  }
}

/**
 * UI/UX関連エラー
 */
export class UIError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.UI,
      ErrorSeverity.WARNING,
      {
        recoverable: true,
        userMessage: 'UI表示でエラーが発生しました。',
        ...options
      }
    );
  }
}

/**
 * 設定エラー
 */
export class ConfigurationError extends ChatError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.CRITICAL,
      {
        recoverable: false,
        userMessage: 'システム設定エラーが発生しました。管理者にお問い合わせください。',
        ...options
      }
    );
  }
}

// ===============================
// エラーハンドリングユーティリティ
// ===============================

/**
 * エラーが ChatError かどうかチェック
 */
export const isChatError = (error: unknown): error is ChatError => {
  return error instanceof ChatError;
};

/**
 * エラーの重要度をチェック
 */
export const isErrorCritical = (error: unknown): boolean => {
  return isChatError(error) && error.severity === ErrorSeverity.CRITICAL;
};

/**
 * エラーが復旧可能かチェック
 */
export const isErrorRecoverable = (error: unknown): boolean => {
  return isChatError(error) && error.recoverable;
};

/**
 * 安全なエラーメッセージ取得
 */
export const getErrorMessage = (error: unknown): string => {
  if (isChatError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '不明なエラーが発生しました';
};

/**
 * ユーザー向けエラーメッセージ取得
 */
export const getUserErrorMessage = (error: unknown): string => {
  if (isChatError(error) && error.userMessage) {
    return error.userMessage;
  }
  return 'エラーが発生しました。しばらく待ってから再試行してください。';
};

/**
 * エラー分類の判定
 */
export const categorizeError = (error: unknown): ErrorCategory => {
  if (isChatError(error)) {
    return error.category;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('firebase') || message.includes('firestore')) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes('auth')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
  }

  return ErrorCategory.UNKNOWN;
};