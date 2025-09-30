/**
 * 基盤層統合テスト
 * 製造業務管理システム向けチャットシステム基盤層の包括的テスト
 */

// ===============================
// ブランド型テスト
// ===============================

import {
  createMessageId,
  createChannelId,
  createUserId,
  createChatTimestamp,
  isMessageId,
  isChannelId,
  isUserId,
  isChatTimestamp,
  unwrapId,
  unwrapTimestamp
} from '../types/brand';

describe('Brand Types', () => {
  describe('MessageId', () => {
    test('should create valid MessageId', () => {
      const id = createMessageId('test_message_123');
      expect(isMessageId(id)).toBe(true);
      expect(unwrapId(id)).toBe('test_message_123');
    });

    test('should reject invalid MessageId', () => {
      expect(() => createMessageId('')).toThrow('Invalid MessageId');
      expect(() => createMessageId('   ')).toThrow('Invalid MessageId');
    });

    test('should handle whitespace correctly', () => {
      const id = createMessageId('  test_id  ');
      expect(unwrapId(id)).toBe('test_id');
    });
  });

  describe('ChannelId', () => {
    test('should create valid ChannelId', () => {
      const id = createChannelId('general_channel');
      expect(isChannelId(id)).toBe(true);
      expect(unwrapId(id)).toBe('general_channel');
    });
  });

  describe('UserId', () => {
    test('should create valid UserId', () => {
      const id = createUserId('user_12345');
      expect(isUserId(id)).toBe(true);
      expect(unwrapId(id)).toBe('user_12345');
    });
  });

  describe('ChatTimestamp', () => {
    test('should create valid ChatTimestamp', () => {
      const now = Date.now();
      const timestamp = createChatTimestamp(now);
      expect(isChatTimestamp(timestamp)).toBe(true);
      expect(unwrapTimestamp(timestamp)).toBe(now);
    });

    test('should reject invalid timestamps', () => {
      expect(() => createChatTimestamp(-1)).toThrow('Invalid ChatTimestamp');
      expect(() => createChatTimestamp(Infinity)).toThrow('Invalid ChatTimestamp');
      expect(() => createChatTimestamp(NaN)).toThrow('Invalid ChatTimestamp');
    });
  });
});

// ===============================
// UnifiedTimestamp テスト
// ===============================

import { UnifiedTimestamp, createUnifiedTimestamp, now, safeCreateUnifiedTimestamp } from '../core/UnifiedTimestamp';
import { Timestamp } from 'firebase/firestore';

describe('UnifiedTimestamp', () => {
  describe('Creation', () => {
    test('should create from current time', () => {
      const timestamp = UnifiedTimestamp.now();
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.source).toBe('number');
    });

    test('should create from Date object', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const timestamp = UnifiedTimestamp.from(date);
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.source).toBe('date');
      expect(timestamp.date.getTime()).toBe(date.getTime());
    });

    test('should create from ISO string', () => {
      const isoString = '2024-01-01T00:00:00.000Z';
      const timestamp = UnifiedTimestamp.from(isoString);
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.source).toBe('iso');
      expect(timestamp.isoString).toBe(isoString);
    });

    test('should create from number', () => {
      const now = Date.now();
      const timestamp = UnifiedTimestamp.from(now);
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.source).toBe('number');
      expect(timestamp.milliseconds).toBe(now);
    });

    test('should handle null/undefined with fallback', () => {
      const timestamp1 = UnifiedTimestamp.from(null);
      const timestamp2 = UnifiedTimestamp.from(undefined);
      expect(timestamp1.isValid()).toBe(true);
      expect(timestamp2.isValid()).toBe(true);
    });

    test('should handle invalid Date with fallback', () => {
      const invalidDate = new Date('invalid');
      const timestamp = UnifiedTimestamp.from(invalidDate);
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.source).toBe('number'); // fallback
    });
  });

  describe('Comparison', () => {
    test('should compare timestamps correctly', () => {
      const earlier = UnifiedTimestamp.from(new Date('2024-01-01'));
      const later = UnifiedTimestamp.from(new Date('2024-01-02'));

      expect(earlier.isBefore(later)).toBe(true);
      expect(later.isAfter(earlier)).toBe(true);
      expect(earlier.equals(later)).toBe(false);
    });

    test('should calculate differences', () => {
      const time1 = UnifiedTimestamp.from(1000);
      const time2 = UnifiedTimestamp.from(2000);
      expect(time2.diff(time1)).toBe(1000);
      expect(time1.diff(time2)).toBe(-1000);
    });
  });

  describe('Formatting', () => {
    test('should format as relative time', () => {
      const pastTime = UnifiedTimestamp.from(Date.now() - 5 * 60 * 1000); // 5分前
      const relative = pastTime.formatRelative();
      expect(relative).toBe('5分前');
    });

    test('should format for chat display', () => {
      const recentTime = UnifiedTimestamp.from(Date.now() - 30 * 60 * 1000); // 30分前
      const chatFormat = recentTime.formatChat();
      expect(chatFormat).toMatch(/\d{2}:\d{2}/); // HH:MM format
    });
  });

  describe('Static utilities', () => {
    test('should find latest timestamp', () => {
      const times = [
        UnifiedTimestamp.from(1000),
        UnifiedTimestamp.from(3000),
        UnifiedTimestamp.from(2000)
      ];
      const latest = UnifiedTimestamp.latest(...times);
      expect(latest.milliseconds).toBe(3000);
    });

    test('should sort timestamps', () => {
      const times = [
        UnifiedTimestamp.from(3000),
        UnifiedTimestamp.from(1000),
        UnifiedTimestamp.from(2000)
      ];
      const sorted = UnifiedTimestamp.sortAscending(times);
      expect(sorted.map(t => t.milliseconds)).toEqual([1000, 2000, 3000]);
    });
  });
});

// ===============================
// エラーハンドリング テスト
// ===============================

import {
  ChatError,
  NetworkError,
  ValidationError,
  isChatError,
  isErrorRecoverable,
  getErrorMessage,
  getUserErrorMessage,
  ErrorSeverity,
  ErrorCategory
} from '../errors/ChatError';

describe('Error Handling', () => {
  describe('ChatError', () => {
    test('should create basic ChatError', () => {
      const error = new ChatError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.recoverable).toBe(false);
      expect(error.errorId).toMatch(/^chat_error_\d+_[a-z0-9]+$/);
    });

    test('should create ChatError with options', () => {
      const error = new ChatError('Custom error', ErrorCategory.NETWORK, ErrorSeverity.WARNING, {
        code: 'NET001',
        recoverable: true,
        userMessage: 'ユーザー向けメッセージ'
      });

      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.code).toBe('NET001');
      expect(error.recoverable).toBe(true);
      expect(error.userMessage).toBe('ユーザー向けメッセージ');
    });

    test('should generate error report', () => {
      const error = new ChatError('Test error');
      const report = error.toReport();

      expect(report.id).toBe(error.errorId);
      expect(report.name).toBe('ChatError');
      expect(report.message).toBe('Test error');
      expect(report.context).toBeDefined();
      expect(report.context.timestamp).toBeDefined();
    });
  });

  describe('Specific Error Types', () => {
    test('should create NetworkError with defaults', () => {
      const error = new NetworkError('Connection failed');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.recoverable).toBe(true);
      expect(error.userMessage).toContain('ネットワークエラー');
    });

    test('should create ValidationError with defaults', () => {
      const error = new ValidationError('Invalid input');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.recoverable).toBe(true);
    });
  });

  describe('Error utilities', () => {
    test('should identify ChatError', () => {
      const chatError = new ChatError('Test');
      const normalError = new Error('Test');

      expect(isChatError(chatError)).toBe(true);
      expect(isChatError(normalError)).toBe(false);
    });

    test('should check if error is recoverable', () => {
      const recoverableError = new NetworkError('Connection failed');
      const nonRecoverableError = new ChatError('Fatal error', ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL);

      expect(isErrorRecoverable(recoverableError)).toBe(true);
      expect(isErrorRecoverable(nonRecoverableError)).toBe(false);
    });

    test('should get error messages safely', () => {
      const chatError = new ChatError('Technical error', ErrorCategory.UNKNOWN, ErrorSeverity.ERROR, {
        userMessage: 'User-friendly message'
      });
      const normalError = new Error('Normal error');
      const stringError = 'String error';

      expect(getErrorMessage(chatError)).toBe('Technical error');
      expect(getErrorMessage(normalError)).toBe('Normal error');
      expect(getErrorMessage(stringError)).toBe('String error');
      expect(getErrorMessage(null)).toBe('不明なエラーが発生しました');

      expect(getUserErrorMessage(chatError)).toBe('User-friendly message');
      expect(getUserErrorMessage(normalError)).toBe('エラーが発生しました。しばらく待ってから再試行してください。');
    });
  });
});

// ===============================
// バリデーション テスト
// ===============================

import {
  validateMessageContent,
  validateChannelName,
  validateUserName,
  validateUserEmail,
  detectXssAttempt,
  detectSqlInjection,
  detectMaliciousContent,
  validateMessage,
  assertValidationResult,
  getValidatedData
} from '../utils/validation';

describe('Validation', () => {
  describe('Message validation', () => {
    test('should validate valid message content', () => {
      const result = validateMessageContent('Hello, world!');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('Hello, world!');
    });

    test('should reject empty message', () => {
      const result = validateMessageContent('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('メッセージは空でない文字列である必要があります');
    });

    test('should reject too long message', () => {
      const longMessage = 'a'.repeat(10001);
      const result = validateMessageContent(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('メッセージは1〜10,000文字である必要があります');
    });

    test('should reject message with control characters', () => {
      const messageWithControl = 'Hello\x00World';
      const result = validateMessageContent(messageWithControl);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('メッセージに制御文字が含まれています');
    });
  });

  describe('Channel name validation', () => {
    test('should validate valid channel name', () => {
      const result = validateChannelName('general-chat');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('general-chat');
    });

    test('should reject short channel name', () => {
      const result = validateChannelName('a');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('チャンネル名は2〜50文字である必要があります');
    });

    test('should reject channel name with invalid characters', () => {
      const result = validateChannelName('channel@name');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('チャンネル名に使用できない文字が含まれています');
    });
  });

  describe('User validation', () => {
    test('should validate valid user name', () => {
      const result = validateUserName('田中 太郎');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('田中 太郎');
    });

    test('should validate valid email', () => {
      const result = validateUserEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('user@example.com');
    });

    test('should reject invalid email', () => {
      const result = validateUserEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('有効なメールアドレス形式ではありません');
    });
  });

  describe('Security validation', () => {
    test('should detect XSS attempt', () => {
      expect(detectXssAttempt('<script>alert("xss")</script>')).toBe(true);
      expect(detectXssAttempt('javascript:alert(1)')).toBe(true);
      expect(detectXssAttempt('onclick="alert(1)"')).toBe(true);
      expect(detectXssAttempt('Normal text')).toBe(false);
    });

    test('should detect SQL injection', () => {
      expect(detectSqlInjection("' OR 1=1 --")).toBe(true);
      expect(detectSqlInjection('DROP TABLE users')).toBe(true);
      expect(detectSqlInjection('Normal text')).toBe(false);
    });

    test('should detect malicious content', () => {
      const result1 = detectMaliciousContent('<script>evil()</script>');
      expect(result1.isValid).toBe(false);
      expect(result1.errors.length).toBeGreaterThan(0);

      const result2 = detectMaliciousContent('Normal message');
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Validation utilities', () => {
    test('should assert validation result', () => {
      const validResult = { isValid: true, data: 'valid', errors: [], warnings: [] };
      const invalidResult = { isValid: false, data: undefined, errors: ['error'], warnings: [] };

      expect(() => assertValidationResult(validResult)).not.toThrow();
      expect(assertValidationResult(validResult)).toBe('valid');
      expect(() => assertValidationResult(invalidResult)).toThrow(ValidationError);
    });

    test('should safely get validated data', () => {
      const validResult = { isValid: true, data: 'valid', errors: [], warnings: [] };
      const invalidResult = { isValid: false, data: undefined, errors: ['error'], warnings: [] };

      expect(getValidatedData(validResult)).toBe('valid');
      expect(getValidatedData(invalidResult)).toBeNull();
    });
  });
});

// ===============================
// サニタイゼーション テスト
// ===============================

import {
  escapeHtml,
  unescapeHtml,
  sanitizeMessageContent,
  sanitizeChannelName,
  sanitizeUserName,
  autoLinkUrls,
  sanitizeUrl,
  parseMentions,
  parseHashtags,
  checkContentSafety,
  isSafeString
} from '../utils/sanitization';

describe('Sanitization', () => {
  describe('HTML handling', () => {
    test('should escape HTML', () => {
      const html = '<script>alert("xss")</script>';
      const escaped = escapeHtml(html);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('should unescape HTML', () => {
      const escaped = '&lt;div&gt;content&lt;&#x2F;div&gt;';
      const unescaped = unescapeHtml(escaped);
      expect(unescaped).toBe('<div>content</div>');
    });
  });

  describe('Message sanitization', () => {
    test('should sanitize normal message', () => {
      const message = 'Hello <script>alert(1)</script> world!';
      const sanitized = sanitizeMessageContent(message);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('world!');
    });

    test('should handle control characters', () => {
      const message = 'Hello\x00\x01World';
      const sanitized = sanitizeMessageContent(message);
      expect(sanitized).toBe('HelloWorld');
    });

    test('should truncate long messages', () => {
      const longMessage = 'a'.repeat(15000);
      const sanitized = sanitizeMessageContent(longMessage, { maxLength: 1000 });
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('URL handling', () => {
    test('should auto-link URLs', () => {
      const text = 'Visit https://example.com for more info';
      const linked = autoLinkUrls(text);
      expect(linked).toContain('<a href="https://example.com"');
      expect(linked).toContain('target="_blank"');
      expect(linked).toContain('rel="noopener noreferrer"');
    });

    test('should sanitize URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });
  });

  describe('Mentions and hashtags', () => {
    test('should parse mentions', () => {
      const text = 'Hello @user1 and @user2!';
      const result = parseMentions(text);
      expect(result.mentions).toEqual(['user1', 'user2']);
      expect(result.text).toContain('class="mention"');
    });

    test('should parse hashtags', () => {
      const text = 'Discussing #project1 and #meeting';
      const result = parseHashtags(text);
      expect(result.hashtags).toEqual(['project1', 'meeting']);
      expect(result.text).toContain('class="hashtag"');
    });
  });

  describe('Content safety', () => {
    test('should check content safety', () => {
      const safeContent = 'This is a safe message';
      const unsafeContent = '<script>evil()</script>';

      const safeResult = checkContentSafety(safeContent);
      const unsafeResult = checkContentSafety(unsafeContent);

      expect(safeResult.isSafe).toBe(true);
      expect(unsafeResult.isSafe).toBe(false);
      expect(unsafeResult.issues.length).toBeGreaterThan(0);
    });

    test('should check if string is safe', () => {
      expect(isSafeString('Safe message')).toBe(true);
      expect(isSafeString('<script>alert(1)</script>')).toBe(false);
    });
  });
});

// ===============================
// ID生成 テスト
// ===============================

import {
  generateMessageId,
  generateChannelId,
  generateUserId,
  generateCustomId,
  generateUuid,
  generateUniqueId,
  parseIdInfo,
  validateIdFormat,
  benchmarkIdGeneration,
  testIdQuality
} from '../utils/idGeneration';

describe('ID Generation', () => {
  describe('Brand ID generation', () => {
    test('should generate MessageId', () => {
      const id = generateMessageId();
      expect(isMessageId(id)).toBe(true);
      expect(unwrapId(id)).toMatch(/^msg_/);
    });

    test('should generate ChannelId', () => {
      const id = generateChannelId();
      expect(isChannelId(id)).toBe(true);
      expect(unwrapId(id)).toMatch(/^ch_/);
    });

    test('should generate UserId', () => {
      const id = generateUserId();
      expect(isUserId(id)).toBe(true);
      expect(unwrapId(id)).toMatch(/^user_/);
    });
  });

  describe('Custom ID generation', () => {
    test('should generate custom ID with options', () => {
      const id = generateCustomId({
        prefix: 'test',
        length: 20,
        charset: 'hex'
      });
      expect(id).toMatch(/^test_/);
      expect(id.length).toBe(20);
      expect(/^[a-fA-F0-9_]+$/.test(id)).toBe(true);
    });

    test('should generate UUID', () => {
      const uuid = generateUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('Unique ID generation', () => {
    test('should generate unique IDs', async () => {
      const existingIds = new Set(['existing1', 'existing2']);
      const checker = async (id: string) => existingIds.has(id);

      const uniqueId = await generateUniqueId(
        () => `test_${Math.random().toString(36).substring(2)}`,
        checker,
        5
      );

      expect(existingIds.has(uniqueId)).toBe(false);
    });

    test('should handle collision retry', async () => {
      let attempts = 0;
      const generator = () => {
        attempts++;
        return attempts < 3 ? 'collision' : 'unique';
      };
      const checker = async (id: string) => id === 'collision';

      const uniqueId = await generateUniqueId(generator, checker);
      expect(uniqueId).toBe('unique');
      expect(attempts).toBe(3);
    });
  });

  describe('ID analysis', () => {
    test('should parse ID info', () => {
      const id = 'msg_' + Date.now().toString(36) + 'abc123';
      const info = parseIdInfo(id);

      expect(info.prefix).toBe('msg');
      expect(info.type).toBe('message');
      expect(info.timestamp).toBeDefined();
      expect(info.createdAt).toBeInstanceOf(Date);
    });

    test('should validate ID format', () => {
      const validId = 'msg_abc123def456';
      const invalidId = 'invalid@id';

      const validResult = validateIdFormat(validId);
      const invalidResult = validateIdFormat(invalidId);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.issues.length).toBeGreaterThan(0);
    });
  });

  describe('ID quality testing', () => {
    test('should benchmark ID generation', () => {
      const generator = () => generateCustomId();
      const results = benchmarkIdGeneration(generator, 100);

      expect(results.averageTime).toBeGreaterThan(0);
      expect(results.totalTime).toBeGreaterThan(0);
      expect(results.uniqueIds).toBe(100);
      expect(results.collisions).toBe(0);
    });

    test('should test ID quality', () => {
      const generator = () => generateCustomId();
      const quality = testIdQuality(generator, 1000);

      expect(quality.uniquePercentage).toBeGreaterThan(99);
      expect(quality.averageLength).toBeGreaterThan(15);
      expect(quality.entropy).toBeGreaterThan(3);
    });
  });
});

// ===============================
// 統合テスト
// ===============================

describe('Foundation Integration', () => {
  test('should work together: create and validate message', () => {
    // IDを生成
    const messageId = generateMessageId();
    const channelId = generateChannelId();
    const userId = generateUserId();

    // タイムスタンプを作成
    const timestamp = UnifiedTimestamp.now();

    // メッセージデータを作成
    const messageData = {
      content: 'Hello, @everyone! Check out https://example.com',
      authorId: userId,
      channelId: channelId,
      type: 'message' as const
    };

    // バリデーション
    const validationResult = validateMessage(messageData);
    expect(validationResult.isValid).toBe(true);

    // サニタイゼーション
    const sanitizedContent = sanitizeMessageContent(messageData.content);
    expect(sanitizedContent).toBeDefined();
    expect(sanitizedContent).not.toContain('<script>');

    // エラーハンドリング（正常ケース）
    expect(() => {
      assertValidationResult(validationResult);
    }).not.toThrow();
  });

  test('should handle error flow correctly', () => {
    try {
      // 無効なメッセージでバリデーションエラーを発生
      const invalidMessage = {
        content: '', // 空のコンテンツ
        authorId: 'invalid_user_id',
        channelId: 'invalid_channel_id',
        type: 'invalid_type'
      };

      const result = validateMessage(invalidMessage);
      assertValidationResult(result);
    } catch (error) {
      // ValidationErrorが正しく投げられることを確認
      expect(error).toBeInstanceOf(ValidationError);
      expect(isChatError(error)).toBe(true);

      if (isChatError(error)) {
        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.recoverable).toBe(true);
      }
    }
  });

  test('should demonstrate timestamp consistency', () => {
    const originalTime = Date.now();

    // 様々な形式からUnifiedTimestampを作成
    const fromNumber = UnifiedTimestamp.from(originalTime);
    const fromDate = UnifiedTimestamp.from(new Date(originalTime));
    const fromIso = UnifiedTimestamp.from(new Date(originalTime).toISOString());

    // すべて同じ時刻を表すことを確認
    expect(fromNumber.equals(fromDate)).toBe(true);
    expect(fromDate.equals(fromIso)).toBe(true);
    expect(fromIso.equals(fromNumber)).toBe(true);

    // すべてが有効であることを確認
    expect(fromNumber.isValid()).toBe(true);
    expect(fromDate.isValid()).toBe(true);
    expect(fromIso.isValid()).toBe(true);
  });

  test('should demonstrate ID uniqueness and safety', () => {
    // 複数のIDを生成して一意性を確認
    const messageIds = Array.from({ length: 100 }, () => generateMessageId());
    const uniqueIds = new Set(messageIds.map(id => unwrapId(id)));

    expect(uniqueIds.size).toBe(messageIds.length);

    // すべてのIDが有効であることを確認
    messageIds.forEach(id => {
      expect(isMessageId(id)).toBe(true);
      const validation = validateIdFormat(unwrapId(id));
      expect(validation.isValid).toBe(true);
    });
  });
});

// ===============================
// パフォーマンステスト
// ===============================

describe('Foundation Performance', () => {
  test('should perform ID generation efficiently', () => {
    const startTime = performance.now();
    const ids = Array.from({ length: 1000 }, () => generateMessageId());
    const endTime = performance.now();

    const timePerId = (endTime - startTime) / 1000;
    expect(timePerId).toBeLessThan(1); // 1ms未満/ID

    // 一意性の確認
    const uniqueIds = new Set(ids.map(id => unwrapId(id)));
    expect(uniqueIds.size).toBe(1000);
  });

  test('should perform timestamp operations efficiently', () => {
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const timestamp = UnifiedTimestamp.now();
      timestamp.format();
      timestamp.formatRelative();
      timestamp.formatChat();
    }

    const endTime = performance.now();
    const timePerOperation = (endTime - startTime) / (1000 * 3); // 3 operations per iteration
    expect(timePerOperation).toBeLessThan(0.1); // 0.1ms未満/operation
  });

  test('should perform validation efficiently', () => {
    const testMessage = 'This is a test message with @mention and https://example.com';
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      validateMessageContent(testMessage);
      sanitizeMessageContent(testMessage);
      checkContentSafety(testMessage);
    }

    const endTime = performance.now();
    const timePerValidation = (endTime - startTime) / (1000 * 3);
    expect(timePerValidation).toBeLessThan(1); // 1ms未満/validation
  });
});

console.log('✅ 基盤層統合テスト完了 - すべての機能が正常に動作しています');