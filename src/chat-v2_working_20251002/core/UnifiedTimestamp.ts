/**
 * UnifiedTimestamp - 統一時刻処理クラス
 * Firebase Timestampとクライアント時刻の統一処理
 * 「時刻不明」エラーの解決を目的とする
 */

import { Timestamp } from 'firebase/firestore';

export class UnifiedTimestamp {
  private timestamp: Timestamp | null;
  private fallbackDate: Date;

  constructor(timestampValue?: any) {
    this.timestamp = this.parseTimestamp(timestampValue);
    this.fallbackDate = new Date();
  }

  /**
   * 様々な形式のタイムスタンプを統一的に解析
   */
  private parseTimestamp(value: any): Timestamp | null {
    try {
      // null または undefined の場合
      if (value == null) {
        return null;
      }

      // Firebase Timestamp オブジェクトの場合
      if (value instanceof Timestamp) {
        return value;
      }

      // Firebase Timestamp オブジェクト（toDate メソッドを持つ）の場合
      if (value && typeof value.toDate === 'function') {
        return value as Timestamp;
      }

      // Date オブジェクトの場合
      if (value instanceof Date) {
        return Timestamp.fromDate(value);
      }

      // 数値（ミリ秒）の場合
      if (typeof value === 'number') {
        return Timestamp.fromMillis(value);
      }

      // 文字列の場合
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return Timestamp.fromDate(date);
        }
      }

      // その他の場合はnullを返す
      return null;
    } catch (error) {
      console.warn('Failed to parse timestamp:', value, error);
      return null;
    }
  }

  /**
   * JavaScriptのDateオブジェクトとして取得
   */
  toDate(): Date {
    if (this.timestamp) {
      try {
        return this.timestamp.toDate();
      } catch (error) {
        console.warn('Failed to convert timestamp to date:', error);
      }
    }
    return this.fallbackDate;
  }

  /**
   * 相対時間表示（例: "2分前", "昨日", "今日 14:30"）
   */
  toRelativeString(): string {
    const date = this.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // 1分未満
    if (diffSeconds < 60) {
      return '今';
    }

    // 1時間未満
    if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    }

    // 今日（24時間未満かつ同じ日）
    if (diffHours < 24 && this.isSameDay(date, now)) {
      return `今日 ${this.formatTime(date)}`;
    }

    // 昨日
    if (diffDays === 1 || (diffHours < 48 && this.isYesterday(date, now))) {
      return `昨日 ${this.formatTime(date)}`;
    }

    // 1週間以内
    if (diffDays < 7) {
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      return `${weekdays[date.getDay()]}曜日 ${this.formatTime(date)}`;
    }

    // 今年
    if (date.getFullYear() === now.getFullYear()) {
      return `${date.getMonth() + 1}/${date.getDate()} ${this.formatTime(date)}`;
    }

    // 過去の年
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${this.formatTime(date)}`;
  }

  /**
   * フォーマットされた時刻文字列（例: "14:30"）
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 絶対時間表示（例: "2023/12/15 14:30:25"）
   */
  toAbsoluteString(): string {
    const date = this.toDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 簡潔な表示（例: "14:30" または "12/15"）
   */
  toShortString(): string {
    const date = this.toDate();
    const now = new Date();

    // 今日の場合は時刻のみ
    if (this.isSameDay(date, now)) {
      return this.formatTime(date);
    }

    // 今年の場合は月日のみ
    if (date.getFullYear() === now.getFullYear()) {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}/${day}`;
    }

    // 過去の年の場合は年月日
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Discord風の時刻表示
   */
  toDiscordString(): string {
    const date = this.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // 1分以内
    if (diffMinutes < 1) {
      return '今';
    }

    // 今日
    if (this.isSameDay(date, now)) {
      return `今日 ${this.formatTime(date)}`;
    }

    // 昨日
    if (this.isYesterday(date, now)) {
      return `昨日 ${this.formatTime(date)}`;
    }

    // それ以外
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();

    if (year === now.getFullYear()) {
      return `${month}/${day}`;
    } else {
      return `${year}/${month}/${day}`;
    }
  }

  /**
   * ISO文字列として取得
   */
  toISOString(): string {
    return this.toDate().toISOString();
  }

  /**
   * ミリ秒として取得
   */
  toMillis(): number {
    return this.toDate().getTime();
  }

  /**
   * Firebase Timestampとして取得
   */
  toTimestamp(): Timestamp {
    if (this.timestamp) {
      return this.timestamp;
    }
    return Timestamp.fromDate(this.fallbackDate);
  }

  /**
   * 有効な時刻が設定されているかチェック
   */
  isValid(): boolean {
    return this.timestamp !== null;
  }

  /**
   * 同じ日かどうかをチェック
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * 昨日かどうかをチェック
   */
  private isYesterday(date: Date, today: Date): boolean {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return this.isSameDay(date, yesterday);
  }

  /**
   * 静的メソッド: 現在時刻のUnifiedTimestampを作成
   */
  static now(): UnifiedTimestamp {
    return new UnifiedTimestamp(new Date());
  }

  /**
   * 静的メソッド: サーバータイムスタンプ用のプレースホルダー
   */
  static serverTimestamp(): UnifiedTimestamp {
    // サーバータイムスタンプの場合は現在時刻で代替
    return new UnifiedTimestamp(new Date());
  }

  /**
   * 静的メソッド: 様々な形式から作成
   */
  static from(value: any): UnifiedTimestamp {
    return new UnifiedTimestamp(value);
  }

  /**
   * 静的メソッド: メッセージの時刻表示用フォーマット
   */
  static formatMessageTime(timestamp: any): string {
    const unified = new UnifiedTimestamp(timestamp);
    return unified.toDiscordString();
  }

  /**
   * 静的メソッド: チャンネルリストの最終メッセージ時刻用フォーマット
   */
  static formatChannelTime(timestamp: any): string {
    const unified = new UnifiedTimestamp(timestamp);
    return unified.toShortString();
  }

  /**
   * 静的メソッド: 詳細表示用フォーマット
   */
  static formatDetailTime(timestamp: any): string {
    const unified = new UnifiedTimestamp(timestamp);
    return unified.toAbsoluteString();
  }

  /**
   * 静的メソッド: 2つの時刻を比較
   */
  static compare(timestamp1: any, timestamp2: any): number {
    const time1 = new UnifiedTimestamp(timestamp1).toMillis();
    const time2 = new UnifiedTimestamp(timestamp2).toMillis();
    return time1 - time2;
  }

  /**
   * 静的メソッド: 時刻順でソート
   */
  static sortByTime<T>(
    items: T[],
    getTimestamp: (item: T) => any,
    order: 'asc' | 'desc' = 'asc'
  ): T[] {
    return items.sort((a, b) => {
      const comparison = UnifiedTimestamp.compare(getTimestamp(a), getTimestamp(b));
      return order === 'asc' ? comparison : -comparison;
    });
  }
}

// デフォルトエクスポート
export default UnifiedTimestamp;