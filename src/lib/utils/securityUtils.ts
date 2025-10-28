// セキュリティユーティリティ
import { AppUser } from '@/types';
import { log } from '@/lib/logger';

// パスワード強度チェック
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含む必要があります');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含む必要があります');
  }
  
  if (!/\d/.test(password)) {
    errors.push('数字を含む必要があります');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('特殊文字を含む必要があります');
  }
  
  const hasCommonPatterns = /123456|password|qwerty|admin|user|guest/i.test(password);
  if (hasCommonPatterns) {
    errors.push('一般的なパスワードパターンは使用できません');
  }
  
  // 強度判定
  if (errors.length === 0) {
    strength = 'strong';
  } else if (errors.length <= 2) {
    strength = 'medium';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

// メールアドレス検証
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 役割ベースアクセス制御
export const hasPermission = (
  user: AppUser | null,
  requiredRole: AppUser['role']
): boolean => {
  if (!user || !user.isActive) return false;
  
  const roleHierarchy: Record<AppUser['role'], number> = {
    worker: 1,
    leader: 2,
    manager: 3,
    admin: 4,
  };
  
  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

// 部署アクセス制御
export const hasDepartmentAccess = (
  user: AppUser | null,
  allowedDepartments: string[]
): boolean => {
  if (!user || !user.isActive) return false;
  if (user.role === 'admin') return true; // 管理者は全部署アクセス可能
  
  return allowedDepartments.includes(user.department);
};

// データ所有権チェック
export const isOwnerOrManager = (
  user: AppUser | null,
  dataOwnerId: string
): boolean => {
  if (!user || !user.isActive) return false;
  if (user.uid === dataOwnerId) return true;
  if (hasPermission(user, 'manager')) return true;
  
  return false;
};

// セッション管理
export interface SessionInfo {
  lastActivity: number;
  loginTime: number;
  isExpired: boolean;
}

export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24時間

export const getSessionInfo = (): SessionInfo => {
  const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
  const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
  const now = Date.now();
  
  const isExpired = (now - lastActivity) > SESSION_TIMEOUT;
  
  return {
    lastActivity,
    loginTime,
    isExpired
  };
};

export const updateActivity = (): void => {
  const now = Date.now().toString();
  localStorage.setItem('lastActivity', now);
  // セッションが保存されたことを確認
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('lastActivity');
    if (saved === now) {
      log.debug('Activity updated successfully', undefined, 'updateActivity');
    }
  }
};

export const startSession = (): void => {
  const now = Date.now().toString();
  localStorage.setItem('loginTime', now);
  localStorage.setItem('lastActivity', now);
  // セッション開始をログ
  log.auth('Session started', { timestamp: new Date().toISOString() }, 'startSession');
};

export const endSession = (): void => {
  localStorage.removeItem('loginTime');
  localStorage.removeItem('lastActivity');
};

// セキュリティログ
export interface SecurityLog {
  timestamp: string;
  userId?: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

export const logSecurityEvent = (
  action: string,
  details: any,
  userId?: string
): void => {
  const securityLog: SecurityLog = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
  };

  // 開発環境ではコンソールに出力（機密情報をフィルタリング）
  const filteredDetails = filterSensitiveData(details);
  log.info('Security Event logged', {
    action: securityLog.action,
    timestamp: securityLog.timestamp,
    details: filteredDetails
  }, 'logSecurityEvent');

  // 本番環境では外部ログサービスに送信することを検討
  // TODO: 本番環境でのセキュリティログ送信実装
};

// データサニタイゼーション
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // スクリプトタグ削除
    .replace(/[<>'"&]/g, (match) => {
      const charMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return charMap[match];
    });
};

// 製造業特有のデータ検証
export const validateManufacturingId = (id: string): boolean => {
  // 管理番号の形式チェック (例: ORD-2024-001, PROC-2024-001)
  const idPattern = /^[A-Z]{2,4}-\d{4}-\d{3}$/;
  return idPattern.test(id);
};

export const validateProductionDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  // 1年前から1年後の範囲内であることをチェック
  return date >= oneYearAgo && date <= oneYearLater;
};

export const validateQuantity = (quantity: number): boolean => {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 999999;
};

// 機密データフィルタリング
export const filterSensitiveData = (data: any): any => {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  if (typeof data !== 'object' || data === null) return data;
  
  const filtered = { ...data };
  
  Object.keys(filtered).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      filtered[key] = '[FILTERED]';
    } else if (typeof filtered[key] === 'object') {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  });
  
  return filtered;
};