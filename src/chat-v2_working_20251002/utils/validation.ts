/**
 * バリデーション・検証ユーティリティ
 * メッセージ検証、サニタイゼーション、セキュリティチェック
 * 製造業務管理システム向けチャットシステム基盤層
 */

import { MessageId, ChannelId, UserId, isChatId } from '../types/brand';
import { MessageType, ChannelType, UserStatus, isMessageType, isChannelType, isUserStatus } from '../types/core';
import { ValidationError } from '../errors/ChatError';

// ===============================
// バリデーション結果型
// ===============================

/**
 * バリデーション結果
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * 成功したバリデーション結果を作成
 */
export const createValidResult = <T>(data: T, warnings: string[] = []): ValidationResult<T> => ({
  isValid: true,
  data,
  errors: [],
  warnings: Object.freeze(warnings)
});

/**
 * 失敗したバリデーション結果を作成
 */
export const createInvalidResult = (errors: string[], warnings: string[] = []): ValidationResult => ({
  isValid: false,
  errors: Object.freeze(errors),
  warnings: Object.freeze(warnings)
});

// ===============================
// 基本バリデーション関数
// ===============================

/**
 * 文字列が空でないかチェック
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * 安全な文字列長チェック
 */
export const isValidLength = (value: string, min: number = 0, max: number = Infinity): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max;
};

/**
 * 英数字とアンダースコアのみかチェック
 */
export const isAlphanumericUnderscore = (value: string): boolean => {
  return /^[a-zA-Z0-9_]+$/.test(value);
};

/**
 * 安全なメールアドレスかチェック
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

/**
 * URLが有効かチェック
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ===============================
// ID バリデーション
// ===============================

/**
 * チャットIDのバリデーション
 */
export const validateChatId = (id: unknown, type: string): ValidationResult<string> => {
  if (!isNonEmptyString(id)) {
    return createInvalidResult([`${type}は空でない文字列である必要があります`]);
  }

  if (!isValidLength(id, 1, 100)) {
    return createInvalidResult([`${type}は1〜100文字である必要があります`]);
  }

  // FirebaseのドキュメントIDとして有効かチェック
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return createInvalidResult([`${type}には英数字、アンダースコア、ハイフンのみ使用できます`]);
  }

  return createValidResult(id.trim());
};

/**
 * MessageIDのバリデーション
 */
export const validateMessageId = (id: unknown): ValidationResult<MessageId> => {
  const result = validateChatId(id, 'メッセージID');
  if (!result.isValid || !result.data) {
    return createInvalidResult(result.errors);
  }

  try {
    // ブランド型として安全に作成できるかチェック
    if (!isChatId(result.data)) {
      return createInvalidResult(['無効なメッセージIDです']);
    }
    return createValidResult(result.data as MessageId);
  } catch (error) {
    return createInvalidResult(['メッセージIDの作成に失敗しました']);
  }
};

/**
 * ChannelIDのバリデーション
 */
export const validateChannelId = (id: unknown): ValidationResult<ChannelId> => {
  const result = validateChatId(id, 'チャンネルID');
  if (!result.isValid || !result.data) {
    return createInvalidResult(result.errors);
  }

  try {
    if (!isChatId(result.data)) {
      return createInvalidResult(['無効なチャンネルIDです']);
    }
    return createValidResult(result.data as ChannelId);
  } catch (error) {
    return createInvalidResult(['チャンネルIDの作成に失敗しました']);
  }
};

/**
 * UserIDのバリデーション
 */
export const validateUserId = (id: unknown): ValidationResult<UserId> => {
  const result = validateChatId(id, 'ユーザーID');
  if (!result.isValid || !result.data) {
    return createInvalidResult(result.errors);
  }

  try {
    if (!isChatId(result.data)) {
      return createInvalidResult(['無効なユーザーIDです']);
    }
    return createValidResult(result.data as UserId);
  } catch (error) {
    return createInvalidResult(['ユーザーIDの作成に失敗しました']);
  }
};

// ===============================
// メッセージバリデーション
// ===============================

/**
 * メッセージコンテンツのバリデーション
 */
export const validateMessageContent = (content: unknown): ValidationResult<string> => {
  if (!isNonEmptyString(content)) {
    return createInvalidResult(['メッセージは空でない文字列である必要があります']);
  }

  const trimmed = content.trim();

  // 長さチェック（最大10,000文字）
  if (!isValidLength(trimmed, 1, 10000)) {
    return createInvalidResult(['メッセージは1〜10,000文字である必要があります']);
  }

  // 制御文字のチェック
  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
    return createInvalidResult(['メッセージに制御文字が含まれています']);
  }

  return createValidResult(trimmed);
};

/**
 * メッセージタイプのバリデーション
 */
export const validateMessageType = (type: unknown): ValidationResult<MessageType> => {
  if (!isMessageType(type)) {
    return createInvalidResult(['無効なメッセージタイプです']);
  }

  return createValidResult(type);
};

// ===============================
// チャンネルバリデーション
// ===============================

/**
 * チャンネル名のバリデーション
 */
export const validateChannelName = (name: unknown): ValidationResult<string> => {
  if (!isNonEmptyString(name)) {
    return createInvalidResult(['チャンネル名は空でない文字列である必要があります']);
  }

  const trimmed = name.trim();

  // 長さチェック（2〜50文字）
  if (!isValidLength(trimmed, 2, 50)) {
    return createInvalidResult(['チャンネル名は2〜50文字である必要があります']);
  }

  // 不適切な文字のチェック
  if (!/^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+$/.test(trimmed)) {
    return createInvalidResult(['チャンネル名に使用できない文字が含まれています']);
  }

  return createValidResult(trimmed);
};

/**
 * チャンネルタイプのバリデーション
 */
export const validateChannelType = (type: unknown): ValidationResult<ChannelType> => {
  if (!isChannelType(type)) {
    return createInvalidResult(['無効なチャンネルタイプです']);
  }

  return createValidResult(type);
};

/**
 * チャンネル説明のバリデーション
 */
export const validateChannelDescription = (description: unknown): ValidationResult<string | undefined> => {
  if (description === null || description === undefined) {
    return createValidResult(undefined);
  }

  if (!isNonEmptyString(description)) {
    return createInvalidResult(['チャンネル説明は文字列である必要があります']);
  }

  const trimmed = description.trim();

  // 長さチェック（最大500文字）
  if (!isValidLength(trimmed, 0, 500)) {
    return createInvalidResult(['チャンネル説明は500文字以内である必要があります']);
  }

  return createValidResult(trimmed || undefined);
};

// ===============================
// ユーザーバリデーション
// ===============================

/**
 * ユーザー名のバリデーション
 */
export const validateUserName = (name: unknown): ValidationResult<string> => {
  if (!isNonEmptyString(name)) {
    return createInvalidResult(['ユーザー名は空でない文字列である必要があります']);
  }

  const trimmed = name.trim();

  // 長さチェック（2〜50文字）
  if (!isValidLength(trimmed, 2, 50)) {
    return createInvalidResult(['ユーザー名は2〜50文字である必要があります']);
  }

  // 不適切な文字のチェック（日本語、英数字、スペース、一部記号）
  if (!/^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s._-]+$/.test(trimmed)) {
    return createInvalidResult(['ユーザー名に使用できない文字が含まれています']);
  }

  return createValidResult(trimmed);
};

/**
 * ユーザーメールアドレスのバリデーション
 */
export const validateUserEmail = (email: unknown): ValidationResult<string> => {
  if (!isNonEmptyString(email)) {
    return createInvalidResult(['メールアドレスは空でない文字列である必要があります']);
  }

  const trimmed = email.trim();

  if (!isValidEmail(trimmed)) {
    return createInvalidResult(['有効なメールアドレス形式ではありません']);
  }

  return createValidResult(trimmed);
};

/**
 * ユーザーステータスのバリデーション
 */
export const validateUserStatus = (status: unknown): ValidationResult<UserStatus> => {
  if (!isUserStatus(status)) {
    return createInvalidResult(['無効なユーザーステータスです']);
  }

  return createValidResult(status);
};

// ===============================
// セキュリティバリデーション
// ===============================

/**
 * XSS攻撃の検出
 */
export const detectXssAttempt = (content: string): boolean => {
  const xssPatterns = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<link[^>]*>/i,
    /<style[^>]*>/i,
    /expression\s*\(/i,
    /url\s*\(/i
  ];

  return xssPatterns.some(pattern => pattern.test(content));
};

/**
 * SQLインジェクション攻撃の検出
 */
export const detectSqlInjection = (content: string): boolean => {
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b)|(\bINSERT\b.*\bINTO\b)|(\bUPDATE\b.*\bSET\b)|(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)|(\bCREATE\b.*\bTABLE\b)|(\bALTER\b.*\bTABLE\b)/i,
    /(\bEXEC\b.*\()|(\bEXECUTE\b.*\()/i,
    /(\bOR\b.*=.*)|(\bAND\b.*=.*)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(content));
};

/**
 * 悪意のあるコンテンツの検出（包括的）
 */
export const detectMaliciousContent = (content: string): ValidationResult<string> => {
  const errors: string[] = [];

  if (detectXssAttempt(content)) {
    errors.push('XSS攻撃の可能性があるコンテンツが検出されました');
  }

  if (detectSqlInjection(content)) {
    errors.push('SQLインジェクション攻撃の可能性があるコンテンツが検出されました');
  }

  // その他の悪意のあるパターン
  const maliciousPatterns = [
    /data:text\/html/i,
    /data:application\/javascript/i,
    /vbscript:/i,
    /livescript:/i,
    /mocha:/i
  ];

  if (maliciousPatterns.some(pattern => pattern.test(content))) {
    errors.push('悪意のあるコンテンツが検出されました');
  }

  if (errors.length > 0) {
    return createInvalidResult(errors);
  }

  return createValidResult(content);
};

// ===============================
// 包括的バリデーション関数
// ===============================

/**
 * メッセージ全体のバリデーション
 */
export const validateMessage = (messageData: unknown): ValidationResult<{
  content: string;
  authorId: UserId;
  channelId: ChannelId;
  type: MessageType;
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!messageData || typeof messageData !== 'object') {
    return createInvalidResult(['メッセージデータが無効です']);
  }

  const data = messageData as any;

  // コンテンツバリデーション
  const contentResult = validateMessageContent(data.content);
  if (!contentResult.isValid) {
    errors.push(...contentResult.errors);
  }

  // セキュリティチェック
  if (contentResult.isValid && contentResult.data) {
    const securityResult = detectMaliciousContent(contentResult.data);
    if (!securityResult.isValid) {
      errors.push(...securityResult.errors);
    }
  }

  // 作者IDバリデーション
  const authorResult = validateUserId(data.authorId);
  if (!authorResult.isValid) {
    errors.push(...authorResult.errors);
  }

  // チャンネルIDバリデーション
  const channelResult = validateChannelId(data.channelId);
  if (!channelResult.isValid) {
    errors.push(...channelResult.errors);
  }

  // メッセージタイプバリデーション
  const typeResult = validateMessageType(data.type);
  if (!typeResult.isValid) {
    errors.push(...typeResult.errors);
  }

  if (errors.length > 0) {
    return createInvalidResult(errors, warnings);
  }

  return createValidResult({
    content: contentResult.data!,
    authorId: authorResult.data!,
    channelId: channelResult.data!,
    type: typeResult.data!
  }, warnings);
};

// ===============================
// バリデーションエラーの投げ方
// ===============================

/**
 * バリデーション結果をチェックしてエラーを投げる
 */
export const assertValidationResult = <T>(result: ValidationResult<T>): T => {
  if (!result.isValid) {
    throw new ValidationError(
      `Validation failed: ${result.errors.join(', ')}`,
      {
        code: 'VALIDATION_FAILED',
        context: {
          errors: result.errors,
          warnings: result.warnings
        }
      }
    );
  }

  return result.data!;
};

/**
 * バリデーション結果から安全にデータを取得
 */
export const getValidatedData = <T>(result: ValidationResult<T>): T | null => {
  return result.isValid ? result.data! : null;
};