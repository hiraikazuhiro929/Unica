/**
 * 日付フォーマッターユーティリティのテスト
 * "invalid" 表示問題の修正を検証
 */

import {
  formatChatTimestamp,
  formatRelativeTime,
  formatLastActivity,
  formatNotificationTime,
  isValidTimestamp
} from './dateFormatter';

// Firebaseタイムスタンプのモック
const createMockFirebaseTimestamp = (date: Date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

describe('dateFormatter', () => {
  describe('formatChatTimestamp', () => {
    it('有効な日付を正しくフォーマットする', () => {
      const date = new Date('2024-12-25T14:30:00');
      const result = formatChatTimestamp(date);
      expect(result).toMatch(/12月25日 14:30/);
    });

    it('Firebase Timestampを正しく処理する', () => {
      const date = new Date('2024-12-25T14:30:00');
      const mockTimestamp = createMockFirebaseTimestamp(date);
      const result = formatChatTimestamp(mockTimestamp);
      expect(result).toMatch(/12月25日 14:30/);
    });

    it('無効な日付に対してフォールバック値を返す', () => {
      expect(formatChatTimestamp(null)).toBe('--');
      expect(formatChatTimestamp(undefined)).toBe('--');
      expect(formatChatTimestamp('')).toBe('--');
      expect(formatChatTimestamp(new Date('invalid'))).toBe('--');
    });

    it('破損したFirebaseタイムスタンプを処理する', () => {
      const brokenTimestamp = { toDate: () => new Date('invalid') };
      expect(formatChatTimestamp(brokenTimestamp)).toBe('--');
    });
  });

  describe('formatRelativeTime', () => {
    it('相対時間を正しく計算する', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5分前');
      expect(formatRelativeTime(twoHoursAgo)).toBe('2時間前');
    });

    it('直近の時間を処理する', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      expect(formatRelativeTime(thirtySecondsAgo)).toBe('たった今');
    });

    it('無効な日付に対してフォールバック値を返す', () => {
      expect(formatRelativeTime(null)).toBe('不明');
      expect(formatRelativeTime(undefined)).toBe('不明');
      expect(formatRelativeTime('')).toBe('不明');
    });
  });

  describe('formatLastActivity', () => {
    it('最新のアクティビティを選択する', () => {
      const old = new Date('2024-12-25T10:00:00');
      const recent = new Date('2024-12-25T11:00:00');

      // lastActivityの方が新しい場合
      const result1 = formatLastActivity(old, recent);
      expect(result1).not.toBe('不明');

      // lastSeenの方が新しい場合
      const result2 = formatLastActivity(recent, old);
      expect(result2).not.toBe('不明');
    });

    it('片方がnullでも処理する', () => {
      const date = new Date('2024-12-25T10:00:00');

      expect(formatLastActivity(null, date)).not.toBe('不明');
      expect(formatLastActivity(date, null)).not.toBe('不明');
    });

    it('両方がnullの場合フォールバック値を返す', () => {
      expect(formatLastActivity(null, null)).toBe('不明');
    });
  });

  describe('formatNotificationTime', () => {
    it('通知用の時間フォーマットを適用する', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      expect(formatNotificationTime(fiveMinutesAgo)).toBe('5分前');
    });

    it('無効な日付に対してフォールバック値を返す', () => {
      expect(formatNotificationTime(null)).toBe('時間不明');
      expect(formatNotificationTime(undefined)).toBe('時間不明');
    });
  });

  describe('isValidTimestamp', () => {
    it('有効な日付を正しく判定する', () => {
      expect(isValidTimestamp(new Date())).toBe(true);
      expect(isValidTimestamp(new Date('2024-12-25'))).toBe(true);
      expect(isValidTimestamp('2024-12-25')).toBe(true);
    });

    it('無効な日付を正しく判定する', () => {
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
      expect(isValidTimestamp('')).toBe(false);
      expect(isValidTimestamp('invalid')).toBe(false);
      expect(isValidTimestamp(new Date('invalid'))).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('toDateが例外を投げる場合のフォールバック', () => {
      const mockTimestamp = {
        toDate: () => {
          throw new Error('Firebase error');
        }
      };

      expect(formatChatTimestamp(mockTimestamp)).toBe('--');
      expect(formatRelativeTime(mockTimestamp)).toBe('不明');
    });

    it('日付フォーマット関数が例外を投げる場合', () => {
      // Date.prototype.toLocaleStringが例外を投げるケースを想定
      const mockDate = {
        getTime: () => Date.now(),
        toLocaleString: () => {
          throw new Error('Locale error');
        }
      } as any;

      // エラーが発生しても適切なフォールバックが返る
      const result = formatChatTimestamp(mockDate);
      expect(result).toBe('--');
    });
  });
});