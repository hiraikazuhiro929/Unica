// 緊急セキュリティ機能 - レート制限と監視
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface SecurityAttempt {
  id: string;
  type: 'invite_code_attempt' | 'brute_force_detected';
  ipAddress?: string;
  userAgent?: string;
  attemptedCode?: string;
  userId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

/**
 * レート制限チェック
 * - 同一IPから5分間に10回以上の試行でブロック
 * - 同一ユーザーから1時間に20回以上の試行でブロック
 */
export async function checkRateLimit(
  identifier: string,
  type: 'ip' | 'user'
): Promise<{ allowed: boolean; remainingAttempts: number; resetTime: Date }> {
  const timeWindow = type === 'ip' ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5分 or 1時間
  const maxAttempts = type === 'ip' ? 10 : 20;
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindow);

  try {
    const attemptsQuery = query(
      collection(db, 'securityAttempts'),
      where('identifier', '==', identifier),
      where('type', '==', 'invite_code_attempt'),
      where('timestamp', '>=', windowStart)
    );

    const attempts = await getDocs(attemptsQuery);
    const attemptCount = attempts.size;

    const allowed = attemptCount < maxAttempts;
    const remainingAttempts = Math.max(0, maxAttempts - attemptCount);
    const resetTime = new Date(now.getTime() + timeWindow);

    return { allowed, remainingAttempts, resetTime };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // エラー時は安全側に倒して制限
    return { allowed: false, remainingAttempts: 0, resetTime: now };
  }
}

/**
 * セキュリティイベント記録
 */
export async function logSecurityAttempt(attempt: Omit<SecurityAttempt, 'id'>): Promise<void> {
  try {
    await addDoc(collection(db, 'securityAttempts'), {
      ...attempt,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // 重要度が高い場合はアラート送信
    if (attempt.severity === 'critical' || attempt.severity === 'high') {
      await sendSecurityAlert(attempt);
    }
  } catch (error) {
    console.error('Security logging failed:', error);
  }
}

/**
 * セキュリティアラート送信
 */
async function sendSecurityAlert(attempt: Omit<SecurityAttempt, 'id'>): Promise<void> {
  // 実装例: Slackやメールでアラート送信
  const alertData = {
    title: '🚨 セキュリティアラート - 不正アクセス検知',
    severity: attempt.severity.toUpperCase(),
    type: attempt.type,
    timestamp: new Date().toISOString(),
    details: attempt.details,
    action: '即座にシステム管理者に報告してください'
  };

  // ここで実際のアラート送信処理を実装
  console.error('SECURITY ALERT:', alertData);
}

/**
 * ブルートフォース攻撃検知
 */
export async function detectBruteForceAttack(
  identifier: string,
  failedAttempts: number = 50,
  timeWindow: number = 15 * 60 * 1000 // 15分
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindow);

  try {
    const attemptsQuery = query(
      collection(db, 'securityAttempts'),
      where('identifier', '==', identifier),
      where('timestamp', '>=', windowStart)
    );

    const attempts = await getDocs(attemptsQuery);

    if (attempts.size >= failedAttempts) {
      await logSecurityAttempt({
        type: 'brute_force_detected',
        identifier,
        severity: 'critical',
        timestamp: now,
        details: {
          attempts: attempts.size,
          timeWindow: `${timeWindow / 1000 / 60}分間`,
          action: 'IPアドレスの即座ブロック推奨'
        }
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Brute force detection failed:', error);
    return false;
  }
}

/**
 * 改良された招待コード検証（セキュリティ機能付き）
 */
export async function secureJoinCompanyWithInvite(
  inviteCode: string,
  userId: string,
  userInfo: { name: string; email: string },
  clientInfo: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ success: boolean; companyId?: string; error?: string; blocked?: boolean }> {
  const identifier = clientInfo.ipAddress || userId;

  // 1. レート制限チェック
  const rateLimitCheck = await checkRateLimit(identifier, 'ip');
  if (!rateLimitCheck.allowed) {
    await logSecurityAttempt({
      type: 'invite_code_attempt',
      identifier,
      severity: 'high',
      timestamp: new Date(),
      attemptedCode: inviteCode.substring(0, 4) + '****', // 部分的な記録
      details: { reason: 'rate_limit_exceeded', ...clientInfo }
    });

    return {
      success: false,
      error: `アクセス制限中です。${Math.ceil((rateLimitCheck.resetTime.getTime() - Date.now()) / 60000)}分後に再試行してください。`,
      blocked: true
    };
  }

  // 2. ブルートフォース攻撃検知
  const isBruteForce = await detectBruteForceAttack(identifier);
  if (isBruteForce) {
    return {
      success: false,
      error: '不正なアクセスが検知されました。システム管理者に連絡してください。',
      blocked: true
    };
  }

  // 3. 招待コード形式検証
  if (!inviteCode || inviteCode.length < 8) {
    await logSecurityAttempt({
      type: 'invite_code_attempt',
      identifier,
      severity: 'low',
      timestamp: new Date(),
      attemptedCode: inviteCode,
      details: { reason: 'invalid_format', ...clientInfo }
    });

    return { success: false, error: '無効な招待コードです' };
  }

  // 4. ここで実際の招待コード処理を呼び出し
  // (既存のjoinCompanyWithInvite関数を使用)

  // 成功時のログ記録
  await logSecurityAttempt({
    type: 'invite_code_attempt',
    identifier,
    severity: 'low',
    timestamp: new Date(),
    userId,
    details: { result: 'success', ...clientInfo }
  });

  // 実際の実装では既存のjoinCompanyWithInvite関数を呼び出し
  return { success: true, companyId: 'dummy' };
}