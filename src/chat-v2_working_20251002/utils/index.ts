/**
 * ユーティリティ関数のエクスポート
 * 製造業務管理システム向けチャットシステム基盤層
 */

// バリデーション関連のエクスポート
export * from './validation';

// サニタイゼーション関連のエクスポート
export * from './sanitization';

// ID生成関連のエクスポート
export * from './idGeneration';

// 利便性のためのエクスポート
export {
  validateMessageContent,
  validateChannelName,
  validateUserName,
  validateUserEmail,
  validateMessage,
  detectXssAttempt,
  detectSqlInjection,
  detectMaliciousContent,
  assertValidationResult,
  getValidatedData,
  createValidResult,
  createInvalidResult
} from './validation';

export {
  sanitizeMessageContent,
  sanitizeChannelName,
  sanitizeUserName,
  escapeHtml,
  unescapeHtml,
  autoLinkUrls,
  sanitizeUrl,
  parseMentions,
  parseHashtags,
  checkContentSafety,
  isSafeString,
  safeTruncate
} from './sanitization';

export {
  generateMessageId,
  generateChannelId,
  generateUserId,
  generateThreadId,
  generateCategoryId,
  generateAttachmentId,
  generateNotificationId,
  generateCustomId,
  generateUuid,
  generateUniqueId,
  parseIdInfo,
  validateIdFormat,
  benchmarkIdGeneration,
  testIdQuality
} from './idGeneration';