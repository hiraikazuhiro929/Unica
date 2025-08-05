#!/usr/bin/env node
/**
 * 製造業務管理システム (Unica) - 互換性チェックスクリプト
 * 修正後にバグが発生しないよう、重要な依存関係と型定義をチェックします。
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

console.log('🔍 Unica システム互換性チェックを開始...\n');

// チェック結果を格納
const issues = [];
const warnings = [];

/**
 * ファイルの存在をチェック
 */
function checkFileExists(filePath, description) {
  const fullPath = path.join(srcDir, filePath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`❌ 必須ファイルが見つかりません: ${filePath} (${description})`);
    return false;
  }
  return true;
}

/**
 * ファイル内容をチェック
 */
function checkFileContent(filePath, patterns, description) {
  const fullPath = path.join(srcDir, filePath);
  if (!fs.existsSync(fullPath)) return;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  patterns.forEach(({ pattern, required, message }) => {
    const found = pattern.test(content);
    if (required && !found) {
      issues.push(`❌ ${filePath}: ${message}`);
    } else if (!required && found) {
      warnings.push(`⚠️ ${filePath}: ${message}`);
    }
  });
}

/**
 * 1. 重要ファイルの存在チェック
 */
console.log('1️⃣ 重要ファイルの存在チェック...');
const criticalFiles = [
  ['app/tasks/types.ts', '型定義ファイル'],
  ['lib/firebase/processes.ts', 'プロセス管理'],
  ['lib/firebase/workHours.ts', '工数管理'],
  ['lib/firebase/orders.ts', '受注管理'],
  ['lib/firebase/dailyReports.ts', '日報管理'],
  ['app/tasks/components/gantt/GanttChart.tsx', 'ガントチャート'],
  ['app/tasks/hooks/useProcessManagement.ts', 'プロセス管理フック'],
];

criticalFiles.forEach(([file, desc]) => {
  checkFileExists(file, desc);
});

/**
 * 2. 型定義の一貫性チェック
 */
console.log('2️⃣ 型定義の一貫性チェック...');
checkFileContent('app/tasks/types.ts', [
  {
    pattern: /interface WorkDetails[\s\S]*?useDynamicSteps:\s*boolean/,
    required: true,
    message: 'WorkDetails型にuseDynamicStepsフィールドが必要'
  },
  {
    pattern: /interface WorkDetails[\s\S]*?totalEstimatedHours:\s*number/,
    required: true,
    message: 'WorkDetails型にtotalEstimatedHoursフィールドが必要'
  },
  {
    pattern: /interface WorkDetails[\s\S]*?totalActualHours:\s*number/,
    required: true,
    message: 'WorkDetails型にtotalActualHoursフィールドが必要'
  },
  {
    pattern: /interface WorkTimeEntry[\s\S]*?isSyncedToProcess:\s*boolean/,
    required: true,
    message: 'WorkTimeEntry型にisSyncedToProcessフィールドが必要'
  }
]);

/**
 * 3. Firebase重複エクスポートチェック
 */
console.log('3️⃣ Firebase重複エクスポートチェック...');
checkFileContent('lib/firebase/processes.ts', [
  {
    pattern: /export const COLLECTIONS\s*=/,
    required: true,
    message: 'COLLECTIONSのエクスポートが必要'
  }
]);

checkFileContent('lib/firebase/workHours.ts', [
  {
    pattern: /export const WORK_HOURS_COLLECTIONS\s*=/,
    required: true,
    message: 'WORK_HOURS_COLLECTIONSのエクスポートが必要'
  },
  {
    pattern: /export const COLLECTIONS\s*=/,
    required: false,
    message: 'COLLECTIONSのエクスポートが重複しています（WORK_HOURS_COLLECTIONSを使用）'
  }
]);

/**
 * 4. 危険なクエリパターンのチェック
 */
console.log('4️⃣ Firebase複合インデックスエラーのチェック...');
checkFileContent('lib/firebase/processes.ts', [
  {
    pattern: /where\(['"][^'"]+['"],\s*['"][^'"]+['"],[\s\S]*?orderBy/,
    required: false,
    message: '複合インデックスが必要なクエリパターンが検出されました'
  }
]);

/**
 * 5. 重要なimportパスのチェック
 */
console.log('5️⃣ 重要なimportパスのチェック...');
checkFileContent('app/orders/page.tsx', [
  {
    pattern: /from\s+["']@\/app\/tasks\/components\/gantt\/ganttUtils["']/,
    required: true,
    message: 'getClientColorの正しいimportパスが必要'
  },
  {
    pattern: /from\s+["']@\/app\/tasks\/constants["']/,
    required: false,
    message: '間違ったimportパス（constantsファイルは存在しません）'
  }
]);

/**
 * 6. コンポーネントの必須propsチェック
 */
console.log('6️⃣ コンポーネントの必須propsチェック...');
checkFileContent('app/tasks/components/gantt/GanttBar.tsx', [
  {
    pattern: /onResizeStart\?\:\s*\([\s\S]*?MouseEvent/,
    required: true,
    message: 'GanttBarのonResizeStartにMouseEvent型が必要'
  }
]);

/**
 * 結果の表示
 */
console.log('\n📊 チェック結果:');
console.log('='.repeat(50));

if (issues.length === 0) {
  console.log('✅ 重大な問題は見つかりませんでした！');
} else {
  console.log(`❌ ${issues.length}件の重大な問題が見つかりました:`);
  issues.forEach(issue => console.log(`  ${issue}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️ ${warnings.length}件の警告があります:`);
  warnings.forEach(warning => console.log(`  ${warning}`));
}

console.log('\n💡 修正後は以下のコマンドでさらに詳細チェック:');
console.log('  npm run type-check  # TypeScript型チェック');
console.log('  npm run build      # ビルドチェック');
console.log('  npm run dev        # 開発サーバー起動テスト');

// 終了コード
process.exit(issues.length > 0 ? 1 : 0);