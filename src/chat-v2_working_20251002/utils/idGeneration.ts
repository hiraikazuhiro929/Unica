/**
 * ID生成・重複チェックユーティリティ
 * 一意性保証、衝突回避、安全なID生成
 * 製造業務管理システム向けチャットシステム基盤層
 */

import {
  MessageId,
  ChannelId,
  UserId,
  ThreadId,
  CategoryId,
  AttachmentId,
  NotificationId,
  createMessageId,
  createChannelId,
  createUserId,
  createThreadId,
  createCategoryId,
  createAttachmentId,
  createNotificationId
} from '../types/brand';

// ===============================
// ID生成設定
// ===============================

/**
 * ID生成オプション
 */
export interface IdGenerationOptions {
  /** プレフィックス */
  prefix?: string;
  /** 長さ（文字数） */
  length?: number;
  /** 使用する文字セット */
  charset?: 'alphanumeric' | 'hex' | 'base62' | 'uuid';
  /** タイムスタンプを含めるか */
  includeTimestamp?: boolean;
  /** ランダム部分の長さ */
  randomLength?: number;
}

/**
 * デフォルトID生成設定
 */
export const DEFAULT_ID_OPTIONS: Required<IdGenerationOptions> = {
  prefix: '',
  length: 20,
  charset: 'base62',
  includeTimestamp: true,
  randomLength: 8
};

/**
 * 文字セット定義
 */
export const CHARSETS = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  hex: '0123456789ABCDEF',
  base62: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  uuid: '0123456789ABCDEF'
} as const;

// ===============================
// 基本ID生成関数
// ===============================

/**
 * 暗号学的に安全な乱数生成
 */
export const generateSecureRandom = (length: number, charset: string): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // ブラウザ環境: Web Crypto API使用
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  } else if (typeof require !== 'undefined') {
    // Node.js環境: crypto モジュール使用
    try {
      const crypto = require('crypto');
      const bytes = crypto.randomBytes(length);
      return Array.from(bytes, byte => charset[byte % charset.length]).join('');
    } catch {
      // fallback
    }
  }

  // フォールバック: Math.random()使用（非推奨だが動作保証のため）
  console.warn('Falling back to Math.random() for ID generation. This is not cryptographically secure.');
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * タイムスタンプベースのID部分生成
 */
export const generateTimestampPart = (): string => {
  const now = Date.now();
  return now.toString(36); // Base36エンコード（より短い表現）
};

/**
 * カウンターベースのID部分生成（同一ミリ秒内の衝突回避）
 */
let sequenceCounter = 0;
const generateSequencePart = (): string => {
  sequenceCounter = (sequenceCounter + 1) % 1000; // 3桁でループ
  return sequenceCounter.toString(36).padStart(2, '0');
};

/**
 * UUID v4 形式のID生成
 */
export const generateUuid = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Manual UUID v4 generation
  const hex = CHARSETS.hex;
  const random = (length: number) => generateSecureRandom(length, hex);

  return [
    random(8),
    random(4),
    '4' + random(3), // Version 4
    (8 + Math.floor(Math.random() * 4)).toString(16) + random(3), // Variant bits
    random(12)
  ].join('-').toLowerCase();
};

/**
 * カスタムID生成
 */
export const generateCustomId = (options: Partial<IdGenerationOptions> = {}): string => {
  const opts = { ...DEFAULT_ID_OPTIONS, ...options };
  const charset = CHARSETS[opts.charset];

  let id = '';

  // プレフィックス
  if (opts.prefix) {
    id += opts.prefix + '_';
  }

  // タイムスタンプ部分
  if (opts.includeTimestamp) {
    id += generateTimestampPart();
    id += generateSequencePart();
  }

  // ランダム部分
  const randomPart = generateSecureRandom(opts.randomLength, charset);
  id += randomPart;

  // 長さ調整
  if (id.length > opts.length) {
    id = id.substring(0, opts.length);
  } else if (id.length < opts.length) {
    const padding = generateSecureRandom(opts.length - id.length, charset);
    id += padding;
  }

  return id;
};

// ===============================
// 型安全なブランドID生成関数
// ===============================

/**
 * MessageIdの生成
 */
export const generateMessageId = (options: Partial<IdGenerationOptions> = {}): MessageId => {
  const id = generateCustomId({
    prefix: 'msg',
    length: 24,
    ...options
  });
  return createMessageId(id);
};

/**
 * ChannelIdの生成
 */
export const generateChannelId = (options: Partial<IdGenerationOptions> = {}): ChannelId => {
  const id = generateCustomId({
    prefix: 'ch',
    length: 20,
    ...options
  });
  return createChannelId(id);
};

/**
 * UserIdの生成
 */
export const generateUserId = (options: Partial<IdGenerationOptions> = {}): UserId => {
  const id = generateCustomId({
    prefix: 'user',
    length: 22,
    ...options
  });
  return createUserId(id);
};

/**
 * ThreadIdの生成
 */
export const generateThreadId = (options: Partial<IdGenerationOptions> = {}): ThreadId => {
  const id = generateCustomId({
    prefix: 'thread',
    length: 26,
    ...options
  });
  return createThreadId(id);
};

/**
 * CategoryIdの生成
 */
export const generateCategoryId = (options: Partial<IdGenerationOptions> = {}): CategoryId => {
  const id = generateCustomId({
    prefix: 'cat',
    length: 18,
    ...options
  });
  return createCategoryId(id);
};

/**
 * AttachmentIdの生成
 */
export const generateAttachmentId = (options: Partial<IdGenerationOptions> = {}): AttachmentId => {
  const id = generateCustomId({
    prefix: 'att',
    length: 20,
    ...options
  });
  return createAttachmentId(id);
};

/**
 * NotificationIdの生成
 */
export const generateNotificationId = (options: Partial<IdGenerationOptions> = {}): NotificationId => {
  const id = generateCustomId({
    prefix: 'notif',
    length: 24,
    ...options
  });
  return createNotificationId(id);
};

// ===============================
// ID衝突検出・回避
// ===============================

/**
 * ID重複チェック関数の型定義
 */
export type IdExistsChecker<T = string> = (id: T) => Promise<boolean>;

/**
 * 一意なIDを生成（重複チェック付き）
 */
export const generateUniqueId = async <T>(
  generator: () => T,
  existsChecker: IdExistsChecker<T>,
  maxAttempts: number = 10
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const id = generator();

    try {
      const exists = await existsChecker(id);
      if (!exists) {
        return id;
      }
    } catch (error) {
      console.warn(`ID existence check failed on attempt ${attempt}:`, error);
      // チェックに失敗した場合でも、生成されたIDを使用
      if (attempt === maxAttempts) {
        return id;
      }
    }

    // 最初の数回は短い待機、後は長めに
    const delay = attempt <= 3 ? 10 : 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
};

/**
 * 型安全な一意MessageId生成
 */
export const generateUniqueMessageId = async (
  existsChecker: IdExistsChecker<MessageId>,
  options: Partial<IdGenerationOptions> = {}
): Promise<MessageId> => {
  return generateUniqueId(
    () => generateMessageId(options),
    existsChecker
  );
};

/**
 * 型安全な一意ChannelId生成
 */
export const generateUniqueChannelId = async (
  existsChecker: IdExistsChecker<ChannelId>,
  options: Partial<IdGenerationOptions> = {}
): Promise<ChannelId> => {
  return generateUniqueId(
    () => generateChannelId(options),
    existsChecker
  );
};

/**
 * 型安全な一意UserId生成
 */
export const generateUniqueUserId = async (
  existsChecker: IdExistsChecker<UserId>,
  options: Partial<IdGenerationOptions> = {}
): Promise<UserId> => {
  return generateUniqueId(
    () => generateUserId(options),
    existsChecker
  );
};

// ===============================
// ID解析・情報抽出
// ===============================

/**
 * IDから情報を抽出
 */
export interface IdInfo {
  /** プレフィックス */
  prefix?: string;
  /** タイムスタンプ（推定） */
  timestamp?: number;
  /** ID種別 */
  type?: string;
  /** 生成時期（推定） */
  createdAt?: Date;
}

/**
 * IDから情報を解析
 */
export const parseIdInfo = (id: string): IdInfo => {
  const info: IdInfo = {};

  // プレフィックスを抽出
  const prefixMatch = id.match(/^([a-z]+)_/);
  if (prefixMatch) {
    info.prefix = prefixMatch[1];

    // プレフィックスから種別を推定
    const typeMap: Record<string, string> = {
      'msg': 'message',
      'ch': 'channel',
      'user': 'user',
      'thread': 'thread',
      'cat': 'category',
      'att': 'attachment',
      'notif': 'notification'
    };
    info.type = typeMap[info.prefix] || 'unknown';
  }

  // タイムスタンプを推定（Base36エンコードされた部分を探す）
  if (info.prefix) {
    const afterPrefix = id.substring(info.prefix.length + 1);
    const timestampPart = afterPrefix.substring(0, 8); // 最初の8文字程度

    try {
      const parsedTimestamp = parseInt(timestampPart, 36);
      if (parsedTimestamp > 0 && parsedTimestamp < Date.now()) {
        info.timestamp = parsedTimestamp;
        info.createdAt = new Date(parsedTimestamp);
      }
    } catch {
      // タイムスタンプ解析失敗は無視
    }
  }

  return info;
};

/**
 * IDの有効性をチェック
 */
export const validateIdFormat = (id: string): {
  isValid: boolean;
  issues: string[];
  info: IdInfo;
} => {
  const issues: string[] = [];
  const info = parseIdInfo(id);

  // 基本的な形式チェック
  if (!id || typeof id !== 'string') {
    issues.push('IDが文字列ではありません');
  } else {
    // 長さチェック
    if (id.length < 8) {
      issues.push('IDが短すぎます');
    }
    if (id.length > 50) {
      issues.push('IDが長すぎます');
    }

    // 文字チェック
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      issues.push('IDに使用できない文字が含まれています');
    }

    // プレフィックスチェック
    if (!info.prefix) {
      issues.push('IDにプレフィックスがありません');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    info
  };
};

// ===============================
// バッチID生成
// ===============================

/**
 * 複数のIDを一括生成
 */
export const generateMultipleIds = <T>(
  generator: () => T,
  count: number
): T[] => {
  const ids: T[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(generator());
  }
  return ids;
};

/**
 * 複数のMessageIdを生成
 */
export const generateMultipleMessageIds = (
  count: number,
  options: Partial<IdGenerationOptions> = {}
): MessageId[] => {
  return generateMultipleIds(() => generateMessageId(options), count);
};

/**
 * 複数のChannelIdを生成
 */
export const generateMultipleChannelIds = (
  count: number,
  options: Partial<IdGenerationOptions> = {}
): ChannelId[] => {
  return generateMultipleIds(() => generateChannelId(options), count);
};

// ===============================
// デバッグ・テスト用ユーティリティ
// ===============================

/**
 * ID生成のパフォーマンス測定
 */
export const benchmarkIdGeneration = (
  generator: () => string,
  iterations: number = 1000
): {
  averageTime: number;
  totalTime: number;
  uniqueIds: number;
  collisions: number;
} => {
  const startTime = performance.now();
  const ids = new Set<string>();

  for (let i = 0; i < iterations; i++) {
    const id = generator();
    ids.add(id);
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  return {
    averageTime: totalTime / iterations,
    totalTime,
    uniqueIds: ids.size,
    collisions: iterations - ids.size
  };
};

/**
 * ID生成品質のテスト
 */
export const testIdQuality = (
  generator: () => string,
  sampleSize: number = 10000
): {
  uniquePercentage: number;
  averageLength: number;
  characterDistribution: Record<string, number>;
  entropy: number;
} => {
  const ids = new Set<string>();
  const allIds: string[] = [];
  const charCount: Record<string, number> = {};

  for (let i = 0; i < sampleSize; i++) {
    const id = generator();
    ids.add(id);
    allIds.push(id);

    // 文字分布の計算
    for (const char of id) {
      charCount[char] = (charCount[char] || 0) + 1;
    }
  }

  // エントロピーの計算
  const totalChars = allIds.join('').length;
  let entropy = 0;
  for (const count of Object.values(charCount)) {
    const probability = count / totalChars;
    entropy -= probability * Math.log2(probability);
  }

  return {
    uniquePercentage: (ids.size / sampleSize) * 100,
    averageLength: allIds.reduce((sum, id) => sum + id.length, 0) / allIds.length,
    characterDistribution: charCount,
    entropy
  };
};