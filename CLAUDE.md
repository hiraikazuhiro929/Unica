# 製造業務管理システム (Unica) - Claude設定ファイル

## プロジェクト概要
Next.js 14 App Router + Firebase + TypeScriptを使用した製造業務管理システム

## 主要機能
- 受注案件管理 (`/orders`)
- 工程管理 (`/tasks`) - ガントチャート対応
- 工数管理 (`/work-hours`) - 日報との自動連携
- 日報管理 (`/daily-reports`) - 作業時間追跡
- **メモ管理 (`/notes`) - Google Keep風UI、画像対応** ✨ NEW
- **カレンダー管理 (`/calendar`) - Google Calendar連携対応** ✨ NEW

## 技術スタック
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Firestore, Authentication)
- **状態管理**: React useState/useEffect, カスタムフック
- **UI**: Lucide React Icons, Radix UI primitives

## 重要なファイル構造
```
src/
├── app/
│   ├── orders/page.tsx                 # 受注管理
│   ├── tasks/                          # 工程管理
│   │   ├── page.tsx
│   │   ├── components/gantt/           # ガントチャート
│   │   ├── hooks/useProcessManagement.ts
│   │   └── types.ts                    # 型定義
│   ├── work-hours/                     # 工数管理
│   │   ├── page.tsx
│   │   ├── hooks/useDailyReportSync.ts
│   │   └── components/
│   ├── daily-reports/                  # 日報管理
│   ├── notes/                          # メモ管理 ✨ NEW
│   │   ├── page.tsx                    # Google Keep風UI
│   │   ├── page_backup.tsx            # シンプル版バックアップ
│   │   └── hooks/useNotes.ts          # メモ操作フック
│   └── calendar/                       # カレンダー管理 ✨ NEW
│       └── page.tsx                    # Google Calendar風UI
├── lib/firebase/                       # Firebase関連
│   ├── config.ts
│   ├── orders.ts
│   ├── processes.ts                    # COLLECTIONS export
│   ├── workHours.ts                    # WORK_HOURS_COLLECTIONS export
│   ├── dailyReports.ts
│   ├── notes.ts                        # NOTE_COLLECTIONS export
│   └── calendar.ts                     # CALENDAR_COLLECTIONS export ✨ NEW
├── types/
│   └── google-api.d.ts                 # Google API型定義 ✨ NEW
└── components/ui/                      # UI部品
```

## バグチェック・互換性チェック設定

### 1. 型定義の一貫性チェック
修正前に以下を確認：
- `WorkDetails`型に必須フィールド（`useDynamicSteps`, `totalEstimatedHours`, `totalActualHours`）があるか
- `WorkTimeEntry`型に`isSyncedToProcess: boolean`があるか
- Firebase関数の戻り値型が正しいか

### 2. Firebase関連のチェック
- **重複エクスポート**: `COLLECTIONS` (processes.ts) と `WORK_HOURS_COLLECTIONS` (workHours.ts) が異なる名前か
- **インデックスエラー回避**: 複合クエリ（where + orderBy）を使っていないか
- **必須フィールド**: createWorkHours時に`createdAt`, `updatedAt`があるか

### 3. import/export チェック
修正時に確認すべき依存関係：
```typescript
// ✅ 正しいimport
import { getClientColor } from "@/app/tasks/components/gantt/ganttUtils";
import { COLLECTIONS } from "@/lib/firebase/processes";
import { WORK_HOURS_COLLECTIONS } from "@/lib/firebase/workHours";

// ❌ 間違ったimport
import { getClientColor } from "@/app/tasks/constants"; // 存在しない
```

### 4. コンポーネントの必須props
- **GanttBar**: `onResizeStart`にMouseEventを渡す
- **WorkHoursModal**: 3タブ構造（基本情報、工数詳細、予算管理）
- **DailyReports**: `isSyncedToProcess`フィールドの処理

### 5. 修正時の手順
1. **影響範囲の特定**: 修正するファイルがimport/exportされている場所を特定
2. **型チェック**: TypeScript型エラーがないか確認
3. **依存関係チェック**: 変更したexportを使用している全ファイルを確認
4. **実行時テスト**: 修正後は必ず以下をテスト
   - ページの表示
   - CRUD操作
   - リアルタイム更新
   - Firebase接続

### 6. よくあるバグパターン
- **型の不完全性**: 新しい必須フィールドの追加漏れ
- **import パスミス**: 相対パス・絶対パスの間違い
- **Firebase クエリ**: 複合インデックスが必要なクエリの使用
- **型キャスト**: `as` を使った危険な型変換
- **null/undefined**: オプショナルプロパティの未チェック

### 7. 修正コマンド
```bash
# 型チェック
npm run type-check

# ビルドチェック
npm run build

# 開発サーバー起動
npm run dev
```

## 今後の機能追加時の注意点
1. 新しい型定義は`types.ts`に集約
2. Firebase関数は適切なファイルに分離
3. 複合インデックス回避のため単一フィルタクエリを使用
4. UI状態管理は適切なカスタムフック使用
5. エラーハンドリングを必ず実装

## システム連携フロー
受注管理 → 工程作成 → 工数管理 ← 日報システム（自動同期）
Google Calendar ← カレンダー管理（一方向同期）

## Google Calendar連携機能 ✨ NEW

### 実装済み機能
- **Google Identity Services API使用**: 新しいOAuth2認証方式
- **一方向同期**: Google Calendar → Unica Calendar
- **アクセストークン永続化**: ローカルストレージで1時間保持
- **自動初期化**: ページリロード時のトークン復元
- **エラーハンドリング**: undefinedフィールドの安全な処理

### 設定要件
```bash
# .env.local に設定が必要
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Google Cloud Console設定
1. Google Calendar API有効化
2. OAuth 2.0 クライアント ID作成
3. 承認済みJavaScript生成元: `http://localhost:3000`
4. 承認済みリダイレクトURI: `http://localhost:3000`

### 使用方法
1. 「連携」ボタン → Google認証
2. 「同期」ボタン → イベント取得・表示
3. リロード後も認証状態維持（1時間）

## 今後実装予定の機能（データ管理・アーカイブ）

### 背景・課題
- 完了済みデータが増え続けることによるパフォーマンス低下懸念
- Firebaseクエリコストの増加
- UIの見通しが悪くなる（完了済みが大量表示）

### 実装予定のアーカイブシステム

#### 1. データ保持ポリシー
- **アクティブデータ**: 未完了 + 完了後30日以内
- **アーカイブデータ**: 完了後30日〜1年（別コレクションへ自動移動）
- **削除対象**: 1年以上経過（エクスポート後に削除）

#### 2. アーカイブ構造（Firebase）
```
現在のコレクション:
- companyTasks, personalTasks
- orders, processes
- daily-reports, work-hours

アーカイブコレクション（追加予定）:
- archivedTasks
- archivedOrders
- archivedProcesses
- archivedReports
```

#### 3. UI設計
- 各ページ: 直近30日の完了済みまで表示
- 専用アーカイブページ（/archives）: 過去データの検索・閲覧
- 各ページにアーカイブタブ追加も検討

#### 4. エクスポート機能
- Excel/CSV形式でのダウンロード
- 期間指定・フィルター機能
- 一括/個別エクスポート対応

#### 5. 実装優先順位
1. エクスポート機能（データバックアップ優先）
2. 自動アーカイブシステム
3. アーカイブ閲覧画面
4. データ削除ポリシーの実装

### 技術的考慮事項
- Cloud Functions for Firebaseでの自動アーカイブ処理
- バッチ処理による効率的なデータ移動
- アーカイブデータの圧縮保存も検討

## 将来構想：動的ページ作成システム（Notion風）

### 概要
ユーザーが自由にカスタムページを作成できるシステム
- サイドバーの「+」ボタンから新規ページ作成
- 複数のスタイル・テンプレートから選択可能
- フィールドやレイアウトを自由にカスタマイズ

### ページスタイル種類
1. **📋 テーブル形式** - データを行・列で管理（タスク管理風）
2. **📄 ドキュメント形式** - 自由記述・画像対応（メモ管理風）
3. **📊 ダッシュボード形式** - 統計・グラフ中心
4. **🗂️ ファイル管理形式** - アップロード・フォルダ管理中心

### テンプレート例
- 📁 ファイル・資料管理（タイトル、種類、更新日、担当者、URL）
- 📦 在庫管理（品名、数量、単価、仕入先、期限）
- 👥 顧客管理（会社名、担当者、連絡先、契約状況）
- ⚙️ 設備管理（設備名、型式、点検日、状態、担当者）

### 対応予定フィールドタイプ
- 基本: テキスト、数値、日付、URL、チェックボックス
- 選択: 単一選択、複数選択
- 高度: ファイルアップロード、リレーション、計算式

### 技術実装方針
- 動的ルーティング: `/custom/[pageId]`
- 設定情報はFirebaseに保存
- コンポーネントの動的生成
- 段階的実装（テーブル形式 → その他スタイル）

### 実装優先順位（将来）
1. 基本のテーブル形式ページ作成機能
2. カスタムフィールド定義機能  
3. テンプレート機能
4. その他スタイル（ドキュメント、ダッシュボード等）
5. 高度な機能（計算式、リレーション等）