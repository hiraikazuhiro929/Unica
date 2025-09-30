/**
 * サニタイゼーション・データクリーニングユーティリティ
 * XSS対策、HTML安全化、コンテンツフィルタリング
 * 製造業務管理システム向けチャットシステム基盤層
 */

import { ValidationError } from '../errors/ChatError';

// ===============================
// サニタイゼーション設定
// ===============================

/**
 * サニタイゼーション設定オプション
 */
export interface SanitizationOptions {
  /** HTMLタグを許可するか */
  allowHtml?: boolean;
  /** 許可するHTMLタグのリスト */
  allowedTags?: string[];
  /** 許可するHTML属性のリスト */
  allowedAttributes?: string[];
  /** URLを自動リンク化するか */
  autoLink?: boolean;
  /** 絵文字を許可するか */
  allowEmoji?: boolean;
  /** Markdownを処理するか */
  allowMarkdown?: boolean;
  /** 最大長制限 */
  maxLength?: number;
}

/**
 * デフォルトサニタイゼーション設定
 */
export const DEFAULT_SANITIZATION_OPTIONS: Required<SanitizationOptions> = {
  allowHtml: false,
  allowedTags: [],
  allowedAttributes: [],
  autoLink: true,
  allowEmoji: true,
  allowMarkdown: false,
  maxLength: 10000
};

/**
 * 安全なHTMLタグ（チャット用）
 */
export const SAFE_HTML_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 'code', 'pre', 'br'
];

/**
 * 安全なHTML属性
 */
export const SAFE_HTML_ATTRIBUTES = [
  'class', 'id'
];

// ===============================
// 基本サニタイゼーション関数
// ===============================

/**
 * HTMLエスケープ
 */
export const escapeHtml = (text: string): string => {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (match) => htmlEscapeMap[match] || match);
};

/**
 * HTMLデコード
 */
export const unescapeHtml = (text: string): string => {
  const htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };

  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g, (match) => htmlUnescapeMap[match] || match);
};

/**
 * 危険なHTMLタグを除去
 */
export const removeDangerousHtml = (html: string): string => {
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'link', 'meta', 'style',
    'form', 'input', 'button', 'select', 'textarea', 'img', 'video', 'audio'
  ];

  let sanitized = html;

  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');

    const selfClosingRegex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  return sanitized;
};

/**
 * 危険な属性を除去
 */
export const removeDangerousAttributes = (html: string): string => {
  const dangerousAttrs = [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'href', 'src', 'action',
    'formaction', 'data', 'ping', 'download'
  ];

  let sanitized = html;

  dangerousAttrs.forEach(attr => {
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');

    const unquotedRegex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]+`, 'gi');
    sanitized = sanitized.replace(unquotedRegex, '');
  });

  return sanitized;
};

// ===============================
// URL・リンク処理
// ===============================

/**
 * URLの自動検出とリンク化
 */
export const autoLinkUrls = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;

  return text.replace(urlRegex, (url) => {
    // URL自体をサニタイズ
    const sanitizedUrl = sanitizeUrl(url);
    if (!sanitizedUrl) {
      return url; // 無効なURLはそのまま返す
    }

    return `<a href="${escapeHtml(sanitizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
  });
};

/**
 * URLのサニタイゼーション
 */
export const sanitizeUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);

    // 危険なプロトコルをブロック
    const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return null;
    }

    // JavaScriptスキームなどをブロック
    if (parsedUrl.protocol === 'javascript:' ||
        parsedUrl.protocol === 'data:' ||
        parsedUrl.protocol === 'vbscript:') {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

// ===============================
// メンション・特殊記法処理
// ===============================

/**
 * メンション記法の解析
 */
export const parseMentions = (text: string): { text: string; mentions: string[] } => {
  const mentions: string[] = [];
  const mentionRegex = /@(\w+)/g;

  const processedText = text.replace(mentionRegex, (match, username) => {
    mentions.push(username);
    return `<span class="mention" data-user="${escapeHtml(username)}">${escapeHtml(match)}</span>`;
  });

  return {
    text: processedText,
    mentions: [...new Set(mentions)] // 重複除去
  };
};

/**
 * ハッシュタグの解析
 */
export const parseHashtags = (text: string): { text: string; hashtags: string[] } => {
  const hashtags: string[] = [];
  const hashtagRegex = /#(\w+)/g;

  const processedText = text.replace(hashtagRegex, (match, tag) => {
    hashtags.push(tag);
    return `<span class="hashtag" data-tag="${escapeHtml(tag)}">${escapeHtml(match)}</span>`;
  });

  return {
    text: processedText,
    hashtags: [...new Set(hashtags)] // 重複除去
  };
};

// ===============================
// 絵文字処理
// ===============================

/**
 * 絵文字の検証
 */
export const isValidEmoji = (emoji: string): boolean => {
  // Unicode絵文字の基本的な範囲をチェック
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(emoji);
};

/**
 * カスタム絵文字記法の処理
 */
export const parseCustomEmoji = (text: string): string => {
  const customEmojiRegex = /:(\w+):/g;

  return text.replace(customEmojiRegex, (match, emojiName) => {
    // カスタム絵文字名をサニタイズ
    const sanitizedName = escapeHtml(emojiName);
    return `<span class="custom-emoji" data-emoji="${sanitizedName}">${escapeHtml(match)}</span>`;
  });
};

// ===============================
// コンテンツフィルタリング
// ===============================

/**
 * 不適切なコンテンツの検出
 */
export const detectInappropriateContent = (text: string): { isInappropriate: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // 基本的なフィルタリング（製造業務環境向け）
  const inappropriatePatterns = [
    { pattern: /\b(死ね|殺す|爆弾|テロ)\b/gi, reason: '暴力的な表現が含まれています' },
    { pattern: /\b(詐欺|騙し|パスワード|ログイン情報)\b/gi, reason: '詐欺やフィッシングの可能性があります' },
    { pattern: /\b(個人情報|住所|電話番号|クレジットカード)\b/gi, reason: '個人情報が含まれている可能性があります' }
  ];

  inappropriatePatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      reasons.push(reason);
    }
  });

  return {
    isInappropriate: reasons.length > 0,
    reasons
  };
};

/**
 * スパムコンテンツの検出
 */
export const detectSpamContent = (text: string): { isSpam: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // 繰り返し文字のチェック
  if (/(.)\1{10,}/.test(text)) {
    reasons.push('同じ文字の繰り返しが多すぎます');
  }

  // 過度な大文字使用
  const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (upperCaseRatio > 0.7 && text.length > 20) {
    reasons.push('大文字の使用が多すぎます');
  }

  // 過度な記号使用
  const symbolRatio = (text.match(/[!@#$%^&*()_+=\-{}[\]:";'<>?,./]/g) || []).length / text.length;
  if (symbolRatio > 0.3 && text.length > 10) {
    reasons.push('記号の使用が多すぎます');
  }

  return {
    isSpam: reasons.length > 0,
    reasons
  };
};

// ===============================
// メインサニタイゼーション関数
// ===============================

/**
 * チャットメッセージの包括的サニタイゼーション
 */
export const sanitizeMessageContent = (
  content: string,
  options: Partial<SanitizationOptions> = {}
): string => {
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };

  if (!content || typeof content !== 'string') {
    throw new ValidationError('Invalid content: must be a string');
  }

  let sanitized = content.trim();

  // 長さ制限
  if (sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  // 制御文字の除去
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // HTMLの処理
  if (!opts.allowHtml) {
    sanitized = escapeHtml(sanitized);
  } else {
    sanitized = removeDangerousHtml(sanitized);
    sanitized = removeDangerousAttributes(sanitized);
  }

  // メンション処理
  const mentionResult = parseMentions(sanitized);
  sanitized = mentionResult.text;

  // ハッシュタグ処理
  const hashtagResult = parseHashtags(sanitized);
  sanitized = hashtagResult.text;

  // カスタム絵文字処理
  if (opts.allowEmoji) {
    sanitized = parseCustomEmoji(sanitized);
  }

  // URL自動リンク化
  if (opts.autoLink) {
    sanitized = autoLinkUrls(sanitized);
  }

  return sanitized;
};

/**
 * チャンネル名のサニタイゼーション
 */
export const sanitizeChannelName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Invalid channel name: must be a string');
  }

  let sanitized = name.trim();

  // HTMLエスケープ
  sanitized = escapeHtml(sanitized);

  // 特殊文字の正規化
  sanitized = sanitized.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '');

  // 連続するハイフンやアンダースコアを単一に
  sanitized = sanitized.replace(/[-_]{2,}/g, (match) => match[0]);

  return sanitized;
};

/**
 * ユーザー名のサニタイゼーション
 */
export const sanitizeUserName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Invalid user name: must be a string');
  }

  let sanitized = name.trim();

  // HTMLエスケープ
  sanitized = escapeHtml(sanitized);

  // 制御文字と不適切な文字の除去
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // 連続するスペースを単一に
  sanitized = sanitized.replace(/\s{2,}/g, ' ');

  return sanitized;
};

// ===============================
// セキュリティチェック関数
// ===============================

/**
 * コンテンツの安全性チェック
 */
export const checkContentSafety = (content: string): {
  isSafe: boolean;
  issues: string[];
  sanitizedContent: string;
} => {
  const issues: string[] = [];

  // 不適切なコンテンツチェック
  const inappropriateCheck = detectInappropriateContent(content);
  if (inappropriateCheck.isInappropriate) {
    issues.push(...inappropriateCheck.reasons);
  }

  // スパムチェック
  const spamCheck = detectSpamContent(content);
  if (spamCheck.isSpam) {
    issues.push(...spamCheck.reasons);
  }

  // XSS攻撃チェック
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i
  ];

  if (xssPatterns.some(pattern => pattern.test(content))) {
    issues.push('悪意のあるスクリプトが検出されました');
  }

  // サニタイゼーション実行
  let sanitizedContent: string;
  try {
    sanitizedContent = sanitizeMessageContent(content);
  } catch (error) {
    issues.push('コンテンツのサニタイゼーションに失敗しました');
    sanitizedContent = escapeHtml(content);
  }

  return {
    isSafe: issues.length === 0,
    issues,
    sanitizedContent
  };
};

// ===============================
// ユーティリティ関数
// ===============================

/**
 * 安全な文字列かどうかチェック
 */
export const isSafeString = (str: string): boolean => {
  const { isSafe } = checkContentSafety(str);
  return isSafe;
};

/**
 * 文字列を安全に切り詰め
 */
export const safeTruncate = (str: string, maxLength: number, suffix: string = '...'): string => {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * 安全な文字列比較（タイミング攻撃対策）
 */
export const safeStringCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};