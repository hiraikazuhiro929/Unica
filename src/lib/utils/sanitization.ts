import DOMPurify from 'dompurify';

/**
 * メッセージ内容をサニタイズしてXSS攻撃を防ぐ
 *
 * @param content - サニタイズするテキスト内容
 * @returns サニタイズされたテキスト
 */
export const sanitizeMessageContent = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // DOMPurifyの設定
  const config = {
    // HTMLタグを完全に除去（テキストのみ許可）
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    // より厳格な設定
    KEEP_CONTENT: true, // タグは除去してもテキスト内容は保持
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // 危険なプロトコルを除去
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  };

  // サニタイズ実行
  const sanitized = DOMPurify.sanitize(content, config);

  // 追加の安全チェック: スクリプト関連のプロトコルを完全除去
  return sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // onerror=, onclick= などを除去
};

/**
 * URL文字列をサニタイズしてセキュアなリンクにする
 *
 * @param url - サニタイズするURL
 * @returns サニタイズされたURL、または null（無効な場合）
 */
export const sanitizeUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // 許可されたプロトコルのみ
  const allowedProtocols = ['http:', 'https:', 'mailto:'];

  try {
    const urlObj = new URL(url);

    // 許可されたプロトコルかチェック
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return null;
    }

    // DOMPurifyでも追加チェック
    const sanitized = DOMPurify.sanitize(url, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    return sanitized === url ? url : null;
  } catch {
    // 無効なURLの場合
    return null;
  }
};

/**
 * ユーザー名をサニタイズ（メンション表示用）
 *
 * @param username - サニタイズするユーザー名
 * @returns サニタイズされたユーザー名
 */
export const sanitizeUsername = (username: string): string => {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // HTMLエンティティをエスケープし、危険な文字を除去
  return DOMPurify.sanitize(username, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).replace(/[<>'"&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#x27;',
      '"': '&quot;',
      '&': '&amp;'
    };
    return entities[match] || match;
  });
};

/**
 * XSS攻撃テスト用の危険なペイロード検出
 * 開発・テスト環境でのみ使用
 */
export const detectXssAttempt = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(content));
};