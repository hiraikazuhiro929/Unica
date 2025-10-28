# 🚨 緊急: 任意コード実行脆弱性対策

## 危険度: CRITICAL (CVSS 9.8)

### 影響を受けるファイル
- `src/app/files/utils/formulaEvaluator.ts:129`
- `src/app/files/page.tsx:1599`
- `src/app/files/components/AdvancedExcelTable.tsx:135`
- `src/app/files/components/ExcelLikeTable.tsx:205`

### 現在の危険なコード
```typescript
// 🚨 DANGER: 任意コード実行可能
const func = new Function('"use strict"; return (' + processedFormula + ')');
return func();
```

### 攻撃例
ユーザーが数式フィールドに以下を入力すると、任意のJavaScriptが実行される：
```javascript
"1; alert('XSS'); fetch('/admin/secrets').then(r=>r.json()).then(console.log); 1"
```

## 緊急対策

### 1. 即座実行すべき対策
```typescript
// ❌ 危険: Function() コンストラクタ
const func = new Function('"use strict"; return (' + formula + ')');

// ✅ 安全: ホワイトリスト方式
const ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '.', ' '];
const ALLOWED_FUNCTIONS = ['SUM', 'AVG', 'MAX', 'MIN', 'COUNT'];

function safeEvaluate(formula: string) {
  // 1. 厳格な入力検証
  if (!/^[\d+\-*/().\s]+$/.test(formula)) {
    throw new Error('Invalid formula characters');
  }

  // 2. 最大長制限
  if (formula.length > 100) {
    throw new Error('Formula too long');
  }

  // 3. 安全な算術演算のみ
  try {
    return eval(formula); // 厳格な検証後のみ
  } catch {
    return 'Error';
  }
}
```

### 2. 根本的解決策
```typescript
// ✅ 推奨: 専用パーサー使用
import { evaluate } from 'mathjs';

function secureEvaluate(formula: string) {
  try {
    return evaluate(formula, {
      // 安全なコンテキストのみ許可
      numbers: 'BigNumber',
      precision: 64
    });
  } catch (error) {
    return 'Error';
  }
}
```

## 緊急パッチ

### Step 1: 緊急停止
以下の機能を即座に無効化してください：
- 数式エディター機能
- カスタムテーブルの計算機能
- Excelライクテーブルの数式実行

### Step 2: ユーザー通知
```
⚠️ セキュリティメンテナンス中
数式計算機能は一時的に無効化されています。
お急ぎの場合は、手動で計算を行ってください。
```

### Step 3: ログ監視
以下のパターンを即座にアラート：
```bash
# 悪意のある入力の検出
grep -i "eval\|function\|alert\|fetch\|import\|require" /var/log/app.log
```

## 実装優先順位

### P0 (即座): 機能無効化
- [ ] 数式エディター機能停止
- [ ] 管理者通知
- [ ] インシデント報告書作成

### P1 (24時間以内): 緊急パッチ
- [ ] 入力検証強化
- [ ] ホワイトリスト実装
- [ ] 監査ログ追加

### P2 (1週間以内): 根本対策
- [ ] 専用パーサーライブラリ導入
- [ ] 全面的なセキュリティテスト
- [ ] ペネトレーションテスト実施

## 連絡先
セキュリティインシデント発生時:
- エスカレーション: [管理者連絡先]
- 緊急対応チーム: [チーム連絡先]