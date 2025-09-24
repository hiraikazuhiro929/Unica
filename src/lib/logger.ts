/**
 * 本番環境対応ロギングシステム
 * 開発環境でのデバッグ支援と本番環境での適切なロギング制御を提供
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  error?: Error;
  userId?: string;
  component?: string;
}

class Logger {
  private isDevelopment: boolean;
  private currentLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.currentLevel = this.isDevelopment ? LogLevel.INFO : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = LogLevel[entry.level];
    const component = entry.component ? `[${entry.component}]` : '';
    const category = entry.category ? `[${entry.category}]` : '';

    return `${timestamp} ${level}${component}${category}: ${entry.message}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    category: string,
    data?: unknown,
    error?: Error,
    component?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error,
      component,
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    // AuthContextから現在のユーザーIDを取得
    // ここではブラウザ環境での実装
    if (typeof window !== 'undefined') {
      try {
        const authData = localStorage.getItem('auth-user');
        if (authData) {
          const user = JSON.parse(authData);
          return user.uid;
        }
      } catch {
        // 無視 - ユーザー情報が取得できない場合
      }
    }
    return undefined;
  }

  // エラーレベル - 常に記録
  error(message: string, error?: Error, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, 'ERROR', data, error, component);

    if (this.isDevelopment) {
      console.error(this.formatMessage(entry), error || data || '');
    }

    // 本番環境では外部ロギングサービスに送信可能
    this.sendToExternalService(entry);
  }

  // 警告レベル - 本番環境でも記録
  warn(message: string, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, 'WARN', data, undefined, component);

    if (this.shouldLog(LogLevel.WARN)) {
      if (this.isDevelopment) {
        console.warn(this.formatMessage(entry), data || '');
      }

      this.sendToExternalService(entry);
    }
  }

  // 情報レベル - 重要な操作の記録
  info(message: string, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, 'INFO', data, undefined, component);

    if (this.shouldLog(LogLevel.INFO)) {
      if (this.isDevelopment) {
        console.info(this.formatMessage(entry), data || '');
      }

      // 本番環境では重要な情報のみ記録
      if (!this.isDevelopment && this.isImportantInfo(message)) {
        this.sendToExternalService(entry);
      }
    }
  }

  // デバッグレベル - 開発環境のみ
  debug(message: string, data?: unknown, component?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, 'DEBUG', data, undefined, component);

    if (this.isDevelopment) {
      console.log(this.formatMessage(entry), data || '');
    }
  }

  // 認証関連の専用ログ
  auth(message: string, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, 'AUTH', data, undefined, component);

    if (this.isDevelopment) {
      console.log(`🔐 ${this.formatMessage(entry)}`, data || '');
    }

    // 認証ログは本番環境でも記録（セキュリティ監査用）
    this.sendToExternalService(entry);
  }

  // API関連の専用ログ
  api(message: string, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, 'API', data, undefined, component);

    if (this.isDevelopment) {
      console.log(`🌐 ${this.formatMessage(entry)}`, data || '');
    }

    // API呼び出しログは開発環境のみ
  }

  // ユーザー操作の記録
  userAction(message: string, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, 'USER_ACTION', data, undefined, component);

    if (this.isDevelopment) {
      console.log(`👤 ${this.formatMessage(entry)}`, data || '');
    }

    // ユーザー操作は本番環境では分析用途で記録
    if (!this.isDevelopment) {
      this.sendToAnalytics(entry);
    }
  }

  // パフォーマンス関連
  performance(message: string, data?: unknown, component?: string): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, 'PERFORMANCE', data, undefined, component);

    if (this.isDevelopment) {
      console.log(`⚡ ${this.formatMessage(entry)}`, data || '');
    }

    // パフォーマンスログは本番環境でも記録
    this.sendToExternalService(entry);
  }

  private isImportantInfo(message: string): boolean {
    const importantKeywords = [
      'login', 'logout', 'signup', 'delete', 'payment',
      'error', 'fail', 'success', 'complete', 'start', 'end'
    ];

    return importantKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
  }

  private sendToExternalService(entry: LogEntry): void {
    // 本番環境では外部ロギングサービス（Sentry、LogRocket等）に送信
    // 現在は開発段階なので実装省略
    if (!this.isDevelopment && entry.level <= LogLevel.ERROR) {
      // 実装例：
      // sentryLogger.captureException(entry.error, entry);
    }
  }

  private sendToAnalytics(entry: LogEntry): void {
    // ユーザー行動分析サービスに送信
    // Google Analytics、Mixpanel等
    if (!this.isDevelopment) {
      // 実装例：
      // analytics.track(entry.category, entry.data);
    }
  }

  // デバッグ用：現在の設定表示
  getConfig(): { isDevelopment: boolean; currentLevel: string } {
    return {
      isDevelopment: this.isDevelopment,
      currentLevel: LogLevel[this.currentLevel]
    };
  }
}

// シングルトンインスタンス
const logger = new Logger();

export default logger;

// 便利な関数エクスポート
export const log = {
  error: (message: string, error?: Error, data?: unknown, component?: string) =>
    logger.error(message, error, data, component),

  warn: (message: string, data?: unknown, component?: string) =>
    logger.warn(message, data, component),

  info: (message: string, data?: unknown, component?: string) =>
    logger.info(message, data, component),

  debug: (message: string, data?: unknown, component?: string) =>
    logger.debug(message, data, component),

  auth: (message: string, data?: unknown, component?: string) =>
    logger.auth(message, data, component),

  api: (message: string, data?: unknown, component?: string) =>
    logger.api(message, data, component),

  userAction: (message: string, data?: unknown, component?: string) =>
    logger.userAction(message, data, component),

  performance: (message: string, data?: unknown, component?: string) =>
    logger.performance(message, data, component)
};

// 従来のconsole.logを置き換える際の互換性関数
export const legacyLog = (message: string, ...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(message, args.length > 0 ? args : undefined);
  }
};