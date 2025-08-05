# 製造業務管理システム (Unica) - Claude設定ファイル

## プロジェクト概要
Next.js 14 App Router + Firebase + TypeScriptを使用した製造業務管理システム

## 主要機能
- 受注案件管理 (`/orders`)
- 工程管理 (`/tasks`) - ガントチャート対応
- 工数管理 (`/work-hours`) - 日報との自動連携
- 日報管理 (`/daily-reports`) - 作業時間追跡

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
│   └── daily-reports/                  # 日報管理
├── lib/firebase/                       # Firebase関連
│   ├── config.ts
│   ├── orders.ts
│   ├── processes.ts                    # COLLECTIONS export
│   ├── workHours.ts                    # WORK_HOURS_COLLECTIONS export
│   └── dailyReports.ts
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