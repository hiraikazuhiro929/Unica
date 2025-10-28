# ダミーデータ削除計画

## 調査実施日
2025年10月28日

## 調査対象
プロジェクト: `c:\Users\N2312-1\本番開発.Unica(仮)\unica`

---

## 🔴 優先度高（本番リリース前に必須削除）

### 1. ログインページのデモアカウント機能
**ファイル**: `src\app\login\page.tsx`
**行番号**: 128-153, 258-294

**内容**:
```typescript
// 行128-153: handleDemoLogin関数（パスワード "demo123" ハードコード）
const handleDemoLogin = async (email: string) => {
  setFormData({
    email,
    password: "demo123",  // ハードコードされたパスワード
  });

  const result = await signInWithEmail(email, "demo123");
  // ...
};

// 行258-294: デモアカウントボタン3つ
<Button onClick={() => handleDemoLogin("tanaka@company.com")}>
  田中作業員でログイン
</Button>
<Button onClick={() => handleDemoLogin("sato@company.com")}>
  佐藤班長でログイン
</Button>
<Button onClick={() => handleDemoLogin("watanabe@company.com")}>
  渡辺部長でログイン
</Button>
```

**削除方法**:
- `handleDemoLogin` 関数を削除（行128-153）
- デモアカウントセクション全体を削除（行258-294）
  - 「デモアカウント」区切り線とボタン3つ

**削除後の状態**:
- 通常のログインフォームのみ残す
- 新規アカウント作成リンクは維持

---

### 2. チャット初期化用の仮ユーザーデータ
**ファイル**: `src\lib\firebase\initChatData.ts`
**行番号**: 69-110

**内容**:
```typescript
const sampleUsers = [
  {
    id: "user-tanaka",
    name: "田中作業員",
    email: "tanaka@company.com",
    // ...
  },
  {
    id: "user-sato",
    name: "佐藤班長",
    email: "sato@company.com",
    // ...
  },
  {
    id: "user-yamada",
    name: "山田保全担当",
    email: "yamada@company.com",
    // ...
  },
  {
    id: "user-watanabe",
    name: "渡辺部長",
    email: "watanabe@company.com",
    // ...
  }
];
```

**削除方法**:
- このファイル全体を削除するか、使用されていない場合は削除
- 使用箇所を確認してから削除

**代替案**:
- チャット機能は実際のFirebase Authenticationユーザーのみ使用

---

### 3. ダッシュボードのサンプルデータ投入スクリプト
**ファイル**: `src\scripts\seed-dashboard-data.ts`
**全体**: 全304行

**内容**:
- 工程データのサンプル作成（M-001, M-002, M-003）
- タスクのサンプル作成
- 通知のサンプル作成
- 全体連絡のサンプル作成

**削除方法**:
- **ファイル全体を削除**
- このファイルは完全に開発/デモ用

---

### 4. メインダッシュボードのデバッグ用データ投入関数
**ファイル**: `src\app\page.tsx`
**行番号**: 62-415, 531-538

**内容**:
```typescript
// 行62-65: seedFirebaseData関数（削除予定のコメント付き）
const seedFirebaseData = async () => {
  console.log('Firebase にサンプルデータを投入中...');
};

// 行68-415: clearTaskData関数 + seedFirebaseDataの実装
// 大量のサンプル工程・通知・カレンダーデータ作成コード

// 行531-538: window オブジェクトへの関数登録
useEffect(() => {
  (window as any).seedFirebaseData = seedFirebaseData;
  (window as any).clearTaskData = clearTaskData;
  console.log('🔧 デバッグ用関数を追加しました。');
  console.log('コンソールで window.seedFirebaseData() を実行してFirebaseにサンプルデータを投入できます。');
  console.log('コンソールで window.clearTaskData() を実行してタスクデータを削除できます。');
}, []);
```

**削除方法**:
1. `seedFirebaseData` 関数全体を削除（行62-65の空実装と実装部分）
2. `clearTaskData` 関数全体を削除（行68-415）
3. `window` オブジェクトへの登録 useEffect を削除（行531-538）

**警告**:
- 行88-415 に大量の実装コードが含まれているため、慎重に削除範囲を確認

---

### 5. 認証管理ページのモックユーザーデータ
**ファイル**: `src\app\auth\page.tsx`
**行番号**: 107-159

**内容**:
```typescript
const mockUsers: UserAccount[] = [
  {
    id: user.uid,  // 現在のユーザー（これは実データなのでOK）
    name: user.displayName || user.name || 'ユーザー',
    email: user.email || '',
    role: 'admin',
    // ...
  },
  {
    id: '2',
    name: '田中太郎',
    email: 'tanaka@company.com',
    // ...
  },
  {
    id: '3',
    name: '佐藤花子',
    email: 'sato@company.com',
    // ...
  },
  {
    id: '4',
    name: '山田次郎',
    email: 'yamada@company.com',
    // ...
  },
];

setUsers(mockUsers);
```

**削除方法**:
- `mockUsers` 配列から、`id: '2'`, `'3'`, `'4'` の3つの仮ユーザーを削除
- 現在のユーザー（`user.uid`）のみ残す
- または、Firebase から実際のユーザー一覧を取得するように実装変更

**代替案**:
```typescript
// 実際のFirebaseデータ取得に変更
const { data: realUsers } = await getAllUsers();
setUsers([...realUsers]);
```

---

## 🟡 優先度中（できれば削除）

### 6. プレースホルダーの仮ユーザー名
**複数ファイル**:

- `src\app\login\page.tsx:199` - `placeholder="例: tanaka@company.com"`
- `src\app\auth\page.tsx:577` - `placeholder="例: 田中太郎"`
- `src\app\auth\page.tsx:589` - `placeholder="例: tanaka@company.com"`
- `src\app\register\page.tsx:208` - `placeholder="例: 田中太郎"`
- `src\app\register\page.tsx:251` - `placeholder="例: tanaka@company.com"`
- `src\app\profile\page.tsx:290` - `placeholder="例: 田中太郎"`

**内容**:
```tsx
<Input placeholder="例: tanaka@company.com" />
<Input placeholder="例: 田中太郎" />
```

**削除方法**:
- プレースホルダーをより汎用的な例に変更
- 推奨: `"例: yourname@company.com"` または `"例: 山田太郎"`
- または完全に削除して `"メールアドレスを入力"` などに変更

**優先度理由**:
- セキュリティリスクは低いが、特定個人名を避けるべき
- ユーザー体験に影響は少ない

---

### 7. ファイル管理ページのサンプルデータ
**ファイル**: `src\app\files\page_backup.tsx`, `src\app\files\page.tsx`
**該当箇所**: 複数行

**内容**:
```typescript
// page_backup.tsx
uploadedBy: "田中エンジニア"
uploadedBy: "佐藤作業員"
uploadedBy: "山田課長"
approvedBy: "田中部長"

// page.tsx
modifiedBy: "田中エンジニア"
modifiedBy: "佐藤"
modifiedBy: "田中太郎"
```

**削除方法**:
- `page_backup.tsx` はバックアップファイルなので**ファイルごと削除**を検討
- `page.tsx` のサンプルデータは実際のFirebaseデータ取得に変更

---

### 8. 協力会社ページのサンプルデータ
**ファイル**: `src\app\partners\page.tsx`
**行番号**: 260-545付近

**内容**:
```typescript
representativeName: "田中 太郎"
contacts: [
  { name: "田中 太郎", email: "tanaka@techno-supply.co.jp" },
  { name: "佐藤 花子", email: "sato@techno-supply.co.jp" }
]
```

**削除方法**:
- サンプルデータ配列を削除
- Firebase から実際の協力会社データを取得

---

### 9. カレンダーページのサンプル参加者
**ファイル**: `src\app\calendar\page.tsx`
**行番号**: 380, 397, 414

**内容**:
```typescript
attendees: ["田中部長", "佐藤作業員", "鈴木課長"]
attendees: ["山田技師"]
attendees: ["伊藤主任", "田中部長", "各課長"]
```

**削除方法**:
- サンプルイベントデータを削除
- Firebase から実際のカレンダーデータを取得

---

### 10. 不具合報告ページのサンプルデータ
**ファイル**: `src\app\defect-reports\page.tsx`
**行番号**: 128-145

**内容**:
```typescript
reporter: "田中作業員"
assignee: "佐藤品質管理"
reporter: "山田技師"
```

**削除方法**:
- サンプルデータ配列を削除
- Firebase から実際の不具合データを取得

---

### 11. 通知ページのハードコードされた送信者名
**ファイル**: `src\app\notifications\page.tsx`
**行番号**: 522

**内容**:
```typescript
notification.type === 'mention' ? '田中部長' : '自動通知'
```

**削除方法**:
- 実際の送信者名を使用（`notification.senderName`）
- またはデフォルト値を変更

---

## 🟢 優先度低（開発中は残してもOK）

### 12. テストファイルのサンプル名
**ファイル**:
- `src\chat-v2\__tests__\foundation.test.ts:356-358`
- `src\chat-v2_working_20251002\__tests__\foundation.test.ts:356-358`

**内容**:
```typescript
const result = validateUserName('田中 太郎');
expect(result.data).toBe('田中 太郎');
```

**削除方法**:
- テストは開発中に必要なので、**削除不要**
- ただし、テストケースの多様性向上のため、他の名前も追加を推奨

---

### 13. 日報履歴ページのサンプルデータ（バックアップファイル）
**ファイル**:
- `src\app\daily-reports\history\page.tsx.backup`
- `src\app\daily-reports\history\page.tsx`

**内容**:
```typescript
workerName: "田中太郎"
```

**削除方法**:
- `.backup` ファイルは**削除**
- 本ファイル（`page.tsx`）のサンプルデータは Firebase データ取得に変更

---

### 14. タスクページのバックアップファイル
**ファイル**: `src\app\tasks\backups.tsx`, `src\app\tasks\components\gantt\GanttChart.tsx`

**内容**:
大量のサンプル工程データ（田中、佐藤、山田などの名前）

**削除方法**:
- `backups.tsx` は**ファイルごと削除**
- `GanttChart.tsx` のサンプルデータは、デモ用として残すかFirebaseから取得に変更

---

## 📊 統計サマリー

| カテゴリ | 該当ファイル数 | 優先度 |
|---------|--------------|--------|
| ログイン・認証関連 | 3 | 🔴 高 |
| データ投入スクリプト | 2 | 🔴 高 |
| モックユーザーデータ | 5 | 🔴 高 |
| サンプルデータ（画面） | 8 | 🟡 中 |
| プレースホルダー | 6 | 🟡 中 |
| バックアップファイル | 4 | 🟢 低 |
| テストコード | 2 | 🟢 低 |

**合計**: 約30箇所のダミーデータが検出されました。

---

## 📋 削除作業チェックリスト

### 🔴 本番リリース前必須
- [ ] **ログイン: デモアカウント機能削除** (`src\app\login\page.tsx`)
  - [ ] `handleDemoLogin` 関数削除（行128-153）
  - [ ] デモボタンUI削除（行258-294）
- [ ] **チャット: 仮ユーザーデータ削除** (`src\lib\firebase\initChatData.ts`)
  - [ ] ファイル全体の使用箇所確認
  - [ ] 未使用であれば削除
- [ ] **スクリプト: サンプルデータ投入削除** (`src\scripts\seed-dashboard-data.ts`)
  - [ ] **ファイル全体を削除**
- [ ] **ダッシュボード: デバッグ用関数削除** (`src\app\page.tsx`)
  - [ ] `seedFirebaseData` 関数削除（行62-415）
  - [ ] `clearTaskData` 関数削除
  - [ ] window登録 useEffect 削除（行531-538）
- [ ] **認証: モックユーザーデータ削除** (`src\app\auth\page.tsx`)
  - [ ] 仮ユーザー3名削除（行111-159）
  - [ ] Firebase取得に変更

### 🟡 推奨削除
- [ ] **プレースホルダー名変更** (6ファイル)
  - [ ] login/page.tsx
  - [ ] auth/page.tsx
  - [ ] register/page.tsx
  - [ ] profile/page.tsx
- [ ] **ファイル管理: サンプルデータ削除** (`src\app\files\page.tsx`, `page_backup.tsx`)
  - [ ] `page_backup.tsx` 削除
  - [ ] サンプルデータをFirebase取得に変更
- [ ] **協力会社: サンプルデータ削除** (`src\app\partners\page.tsx`)
- [ ] **カレンダー: サンプル参加者削除** (`src\app\calendar\page.tsx`)
- [ ] **不具合報告: サンプルデータ削除** (`src\app\defect-reports\page.tsx`)
- [ ] **通知: ハードコード送信者名削除** (`src\app\notifications\page.tsx`)

### 🟢 任意削除（開発環境）
- [ ] **バックアップファイル削除**
  - [ ] `src\app\tasks\backups.tsx`
  - [ ] `src\app\files\page_backup.tsx`
  - [ ] `src\app\daily-reports\history\page.tsx.backup`
- [ ] **テストコード**: そのまま維持（削除不要）

---

## ⚠️ 重要な注意事項

### 削除前の確認事項
1. **バックアップ作成**: Git commit でバックアップを確保
2. **依存関係確認**: 削除対象関数の使用箇所を `Grep` で検索
3. **段階的削除**: 一度に全削除せず、カテゴリ毎に削除・テスト

### 削除後のテスト項目
- [ ] ログイン機能（通常ログインのみ）
- [ ] ダッシュボード表示
- [ ] 各ページの初期表示
- [ ] Firebase データ取得確認
- [ ] ビルドエラーチェック（`npm run build`）
- [ ] TypeScript型チェック（`npm run type-check`）

### Firebase データが空の場合の対応
多くのページで「データがありません」表示になる可能性があります。以下の対応を検討：

1. **初期データ投入機能**: 管理者用の初期セットアップ機能を実装
2. **空状態UI改善**: 「データを追加してください」などの誘導UI
3. **サンプルプロジェクト**: オンボーディング時のチュートリアルデータ

---

## 🎯 実装優先順位

### フェーズ1: セキュリティリスク除去（即時対応）
1. デモログイン機能削除
2. デバッグ用データ投入関数削除
3. パスワード `"demo123"` の完全削除

### フェーズ2: モックデータ除去（本番前）
1. 認証ページのモックユーザー削除
2. チャット初期化の仮ユーザー削除
3. seed-dashboard-data.ts 削除

### フェーズ3: UI改善（リリース前推奨）
1. プレースホルダー名の汎用化
2. 各ページのサンプルデータをFirebase取得に変更
3. 空状態UIの改善

### フェーズ4: クリーンアップ（余裕があれば）
1. バックアップファイル削除
2. 未使用コード削除
3. コメント整理

---

## 🚀 削除後の代替実装

### 初期データ投入の推奨方法

#### 方法1: 管理者用セットアップページ
```typescript
// src/app/admin/setup/page.tsx
export default function AdminSetup() {
  const handleInitialSetup = async () => {
    // 会社情報の初期設定
    // 最初の管理者ユーザー作成
    // 基本マスタデータ投入
  };

  return <Button onClick={handleInitialSetup}>初期セットアップ実行</Button>;
}
```

#### 方法2: オンボーディングフロー
```typescript
// src/app/onboarding/page.tsx
// ステップ1: 会社情報入力
// ステップ2: ユーザー作成
// ステップ3: サンプルプロジェクト作成（オプション）
```

#### 方法3: Cloud Functions での自動初期化
```typescript
// functions/src/onUserCreate.ts
// 新規ユーザー作成時に自動的に初期データを投入
```

---

## 📝 削除実施記録

| 日付 | 実施者 | 削除項目 | 確認方法 |
|------|--------|---------|---------|
| YYYY-MM-DD | 担当者名 | ログインのデモアカウント | 動作確認済み |
| YYYY-MM-DD | 担当者名 | seed-dashboard-data.ts | ビルド確認 |
| ... | ... | ... | ... |

---

## 🔍 検索に使用したキーワード

以下のキーワードで全ファイルを検索しました：
- `guest`, `ゲスト`
- `sample`, `サンプル`
- `dummy`, `ダミー`
- `mock`, `モック`
- `test user`, `テストユーザー`
- `demo`, `デモ`
- `seed`, `seedData`, `seedFirebase`
- `tanaka`, `田中`, `sato`, `佐藤`, `yamada`, `山田`, `watanabe`, `渡辺`
- `demo123`

合計検出: **約200箇所のマッチ**（重複含む）
実質的な削除対象: **約30箇所**

---

## まとめ

このプロジェクトには開発・デモ用のダミーデータが多数含まれています。本番リリース前に：

1. **セキュリティリスク（🔴）**: 必ず削除
2. **ユーザー体験（🟡）**: 削除推奨
3. **開発効率（🟢）**: 削除任意

特に、**パスワード "demo123"** と **デモログイン機能** は即座に削除してください。

