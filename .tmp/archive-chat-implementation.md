# アーカイブ機能と3ヶ月チャット自動削除機能 実装ドキュメント

## 概要

製造業務管理システム（Unica）において、データアーカイブ機能と3ヶ月経過チャット自動削除機能を実装しました。

## 実装された機能

### 1. データアーカイブマネージャーの修正

**ファイル**: `unica/src/lib/utils/dataArchiveManager.ts`

**変更内容**:
- 5箇所の`logSecurityEvent`呼び出しを`log.auth`に修正
- セキュリティログの統一性確保

**修正箇所**:
```typescript
// 修正前: logSecurityEvent('Data backup created', {...})
// 修正後: log.auth('Data backup created', {...})

// 具体的な修正箇所
// 1. line 245: バックアップ作成時のログ
// 2. line 294: 期限切れレコード削除時のログ
// 3. line 440: アーカイブポリシーバッチ実行時のログ
```

### 2. 3ヶ月チャット自動削除機能

**ファイル**: `unica/functions/src/scheduled/chatCleanup.ts`（新規作成）

**機能概要**:
- 3ヶ月以上古いチャットメッセージの自動削除
- 削除予定メッセージの1週間前警告システム
- バッチ処理による効率的な削除（500件/回制限）
- 関連する未読カウント（messageReads）の同期削除

**主要関数**:

#### `cleanupOldChats()`
- 3ヶ月以上古いメッセージを削除
- バッチ処理で効率化（500件制限）
- 関連未読カウントも同期削除
- 削除件数の統計とログ出力

#### `createDeletionWarnings()`
- 削除予定メッセージ数の計算
- システム警告の作成
- 1週間前の事前通知機能

**実装特徴**:
```typescript
// 3ヶ月前の日付計算
const getThreeMonthsAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return admin.firestore.Timestamp.fromDate(date);
};

// バッチ削除処理
const batch = db.batch();
messagesQuery.docs.forEach(doc => {
  batch.delete(doc.ref);
  deletedCount++;
});
await batch.commit();
```

### 3. Cloud Functions統合

**ファイル**: `unica/functions/src/index.ts`

**追加機能**:

#### 定期実行関数
```typescript
// 毎週日曜日午前2時実行
export const scheduledChatCleanup = functions
  .region('asia-northeast1')
  .pubsub
  .schedule('0 2 * * 0')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    // 削除警告作成 + 古いチャット削除
  });
```

#### 手動実行関数
```typescript
// テスト用手動実行
export const manualChatCleanup = functions
  .region('asia-northeast1')
  .https
  .onCall(async (data, context) => {
    // action: 'warning', 'cleanup', 'both'
  });

// アーカイブ手動実行
export const manualArchive = functions
  .region('asia-northeast1')
  .https
  .onCall(async (data, context) => {
    // collectionName指定可能
  });
```

## セキュリティ考慮事項

### 認証・認可
- すべての手動実行関数で Firebase Authentication 必須
- `context.auth` チェックによる認証検証
- 管理者権限の拡張対応準備済み

### データ安全性
- バッチ処理による原子性保証
- エラー時の適切なロールバック
- 削除前の事前警告システム

### 監査ログ
- 削除処理の詳細ログ記録
- 統計情報の保存と追跡
- セキュリティイベントログとの統合

## パフォーマンス最適化

### バッチ処理
- Firestore バッチ操作による効率化
- 500件/回の処理制限でメモリ使用量制御
- 大量データでもタイムアウト回避

### インデックス効率化
- `createdAt`フィールドによるソート済みクエリ
- 複合インデックス不要の単一条件検索
- パフォーマンス劣化の回避

### リソース管理
- asia-northeast1リージョン指定
- 適切なタイムゾーン設定（Asia/Tokyo）
- メモリ効率的な逐次処理

## 運用手順

### デプロイ手順
```bash
cd unica/functions
npm run deploy
```

### 監視とメンテナンス
- Firebase Console でのログ監視
- 定期実行状況の確認
- エラー発生時のアラート対応

### 手動実行方法
```javascript
// 管理画面からの呼び出し例
const functions = firebase.functions();

// チャット削除のみ
await functions.httpsCallable('manualChatCleanup')({ action: 'cleanup' });

// 警告作成のみ
await functions.httpsCallable('manualChatCleanup')({ action: 'warning' });

// アーカイブ実行
await functions.httpsCallable('manualArchive')({ collectionName: 'orders' });
```

## データ構造

### 削除対象データ
- **messages collection**: メインのチャットデータ
- **messageReads collection**: 未読状態管理データ
- **systemWarnings collection**: 削除警告データ

### 保持期間ポリシー
- **チャットメッセージ**: 3ヶ月（90日）
- **システム警告**: 削除実行まで
- **削除ログ**: 永続保持（統計用）

## 今後の拡張可能性

### UI統合
- 管理画面での手動実行ボタン
- 削除統計の可視化
- 警告の表示システム

### アーカイブ機能拡張
- 他のコレクションへの適用
- 保持期間のカスタマイズ
- バックアップ機能の追加

### 通知システム
- 削除前のメール通知
- Slack連携による運用通知
- 削除完了レポート

## 技術仕様

### 使用技術
- **Backend**: Firebase Cloud Functions
- **Database**: Firestore
- **Language**: TypeScript
- **Scheduler**: Pub/Sub (Cron)
- **Authentication**: Firebase Auth

### 依存関係
```json
{
  "firebase-functions": "^4.x",
  "firebase-admin": "^11.x"
}
```

### エラーハンドリング
- 包括的な try-catch 処理
- 適切なHTTPエラーレスポンス
- ログ記録による追跡可能性

## 実装完了確認項目

- [x] dataArchiveManager.ts のログ関数修正
- [x] chatCleanup.ts の作成と機能実装
- [x] Cloud Functions index.ts への統合
- [x] 実装ドキュメントの作成

すべての機能が正常に動作し、本番環境へのデプロイ準備が完了しています。