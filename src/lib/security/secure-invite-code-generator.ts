// 緊急セキュリティ改善 - セキュアな招待コード生成
import { webcrypto } from 'crypto';

/**
 * セキュアな招待コード生成（暗号学的に安全）
 * - 16文字の英数字（大文字+数字）
 * - エントロピー: 36^16 = 約7.9 × 10^24通り
 * - セキュアな乱数生成器使用
 */
export function generateSecureInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 16; // 8文字から16文字に強化

  // セキュアな乱数生成
  const randomBytes = new Uint8Array(codeLength);
  webcrypto.getRandomValues(randomBytes);

  let code = '';
  for (let i = 0; i < codeLength; i++) {
    code += chars.charAt(randomBytes[i] % chars.length);
  }

  return code;
}

/**
 * 招待コードの衝突チェック機能
 */
export async function generateUniqueInviteCode(
  checkFunction: (code: string) => Promise<boolean>
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateSecureInviteCode();
    const exists = await checkFunction(code);

    if (!exists) {
      return code;
    }

    attempts++;
  }

  throw new Error('招待コード生成に失敗しました。システム管理者に連絡してください。');
}

/**
 * 招待コード強度検証
 */
export function validateInviteCodeStrength(code: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
} {
  const issues: string[] = [];

  if (code.length < 12) {
    issues.push('長さが不十分（推奨: 16文字以上）');
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    issues.push('無効な文字が含まれています');
  }

  // 連続文字チェック
  if (/(.)\1{2,}/.test(code)) {
    issues.push('同一文字の連続が検出されました');
  }

  // 辞書攻撃チェック（簡易版）
  const commonPatterns = ['ABCD', '1234', 'QWER'];
  if (commonPatterns.some(pattern => code.includes(pattern))) {
    issues.push('予測しやすいパターンが含まれています');
  }

  const strength = issues.length === 0 ? 'strong' :
                  issues.length <= 2 ? 'medium' : 'weak';

  return {
    isValid: issues.length === 0,
    strength,
    issues
  };
}