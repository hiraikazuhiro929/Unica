/**
 * 統一された日付フォーマットユーティリティ
 * Firebase Timestampと通常のDateオブジェクトの両方に対応
 * "invalid" 表示を防ぐための堅牢なエラーハンドリング
 */

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * Firebase Timestamp型（toDate()メソッドを持つ）
 */
interface FirebaseTimestamp {
  toDate(): Date;
  seconds?: number;
  nanoseconds?: number;
}

/**
 * 日付型の型ガード
 */
function isFirebaseTimestamp(value: any): value is FirebaseTimestamp {
  return value && typeof value.toDate === 'function';
}

function isDate(value: any): value is Date {
  return value instanceof Date;
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
}

/**
 * 任意の日付値を安全にDateオブジェクトに変換
 */
function toSafeDate(timestamp: any): Date | null {
  if (!timestamp) {
    return null;
  }

  try {
    // Firebase Timestamp
    if (isFirebaseTimestamp(timestamp)) {
      const date = timestamp.toDate();
      return isValidDate(date) ? date : null;
    }

    // Date オブジェクト
    if (isDate(timestamp)) {
      return isValidDate(timestamp) ? timestamp : null;
    }

    // 文字列または数値
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isValidDate(date) ? date : null;
    }

    return null;
  } catch (error) {
    console.warn('Date conversion failed:', error);
    return null;
  }
}

/**
 * チャットメッセージ用の標準日時フォーマット
 * 例: "12月25日 14:30"
 */
export function formatChatTimestamp(timestamp: any): string {
  // nullやundefinedの場合は現在時刻を使用
  if (!timestamp) {
    return new Date().toLocaleString("ja-JP", {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  try {

    // Firebase Timestampの直接処理
    if (timestamp && typeof timestamp === 'object') {
      // Firebase Timestampの場合
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        if (isValidDate(date)) {
          return date.toLocaleString("ja-JP", {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }

      // Firestore Timestamp形式 { seconds: number, nanoseconds: number }
      if (typeof timestamp.seconds === 'number') {
        const date = new Date(timestamp.seconds * 1000);
        if (isValidDate(date)) {
          return date.toLocaleString("ja-JP", {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    }

    // 既にDateオブジェクトの場合
    if (timestamp instanceof Date) {
      if (isValidDate(timestamp)) {
        return timestamp.toLocaleString("ja-JP", {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    // 文字列や数値からDateオブジェクトを作成
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      if (isValidDate(date)) {
        return date.toLocaleString("ja-JP", {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

  } catch (error) {
    console.warn('Date formatting failed:', error);
  }

  return '時刻不明';
}

/**
 * 相対時間フォーマット（〜分前、〜時間前など）
 * 例: "3分前", "2時間前", "昨日"
 */
export function formatRelativeTime(timestamp: any): string {
  const date = toSafeDate(timestamp);

  if (!date) {
    return '不明';
  }

  try {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    // 直近の場合は分・時間単位で表示
    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;

    // それ以上は日付形式
    return formatChatTimestamp(timestamp);
  } catch (error) {
    console.warn('Relative time formatting failed:', error);
    return '不明';
  }
}

/**
 * date-fnsを使った高度な相対時間フォーマット
 * 例: "3分前", "約2時間前", "昨日", "先週"
 */
export function formatRelativeTimeAdvanced(timestamp: any): string {
  const date = toSafeDate(timestamp);

  if (!date) {
    return '不明';
  }

  try {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: ja
    });
  } catch (error) {
    console.warn('Advanced relative time formatting failed:', error);
    // フォールバックとして基本的な相対時間を使用
    return formatRelativeTime(timestamp);
  }
}

/**
 * 最終アクティブ時間フォーマット
 * 最新のactivityとlastSeenを比較して適切な時間を表示
 */
export function formatLastActivity(lastSeen: any, lastActivity: any): string {
  const lastSeenDate = toSafeDate(lastSeen);
  const lastActivityDate = toSafeDate(lastActivity);

  // より新しい日付を選択
  let latestDate: Date | null = null;

  if (lastSeenDate && lastActivityDate) {
    latestDate = lastActivityDate > lastSeenDate ? lastActivityDate : lastSeenDate;
  } else if (lastSeenDate) {
    latestDate = lastSeenDate;
  } else if (lastActivityDate) {
    latestDate = lastActivityDate;
  }

  return formatRelativeTime(latestDate);
}

/**
 * 通知用の時間フォーマット
 * より詳細な時間情報が必要な場合
 */
export function formatNotificationTime(timestamp: any): string {
  const date = toSafeDate(timestamp);

  if (!date) {
    return '時間不明';
  }

  try {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;

    // 1日以上経過している場合は日付を表示
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Notification time formatting failed:', error);
    return '時間不明';
  }
}

/**
 * デバッグ用：日付値の詳細情報を出力
 */
export function debugDateValue(timestamp: any, label?: string): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[DateFormatter Debug] ${label || 'Date'}:`, {
      original: timestamp,
      type: typeof timestamp,
      isFirebaseTimestamp: isFirebaseTimestamp(timestamp),
      isDate: isDate(timestamp),
      converted: toSafeDate(timestamp),
      formatted: formatChatTimestamp(timestamp),
    });
  }
}

/**
 * 日付の妥当性をチェック
 */
export function isValidTimestamp(timestamp: any): boolean {
  return toSafeDate(timestamp) !== null;
}