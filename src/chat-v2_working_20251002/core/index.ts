/**
 * コアクラスのエクスポート
 * 製造業務管理システム向けチャットシステム基盤層
 */

// UnifiedTimestamp関連のエクスポート
export * from './UnifiedTimestamp';

// 利便性のための関数エクスポート
export {
  UnifiedTimestamp,
  now,
  createUnifiedTimestamp,
  safeCreateUnifiedTimestamp,
  sortTimestampsAsc,
  sortTimestampsDesc
} from './UnifiedTimestamp';