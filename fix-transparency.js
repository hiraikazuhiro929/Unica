const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 透明背景のパターンと置換ルール
const replacements = [
  // 透明度の高い背景を不透明にする
  { pattern: /bg-(\w+)-900\/10/g, replacement: 'bg-$1-900/50' },
  { pattern: /bg-(\w+)-900\/20/g, replacement: 'bg-$1-800/50' },
  { pattern: /bg-(\w+)-900\/30/g, replacement: 'bg-$1-900/50' },
  { pattern: /bg-(\w+)-800\/50/g, replacement: 'bg-$1-800' },
  { pattern: /bg-(\w+)-700\/50/g, replacement: 'bg-$1-700' },
  { pattern: /bg-(\w+)-600\/50/g, replacement: 'bg-$1-600' },
  
  // ホバー時の透明背景を修正
  { pattern: /hover:bg-(\w+)-900\/10/g, replacement: 'hover:bg-$1-800/50' },
  { pattern: /hover:bg-(\w+)-900\/20/g, replacement: 'hover:bg-$1-800/50' },
  { pattern: /hover:bg-(\w+)-900\/30/g, replacement: 'hover:bg-$1-800/50' },
  
  // backdrop-blurと組み合わされた透明背景
  { pattern: /bg-white\/80/g, replacement: 'bg-white' },
  { pattern: /bg-gray-800\/80/g, replacement: 'bg-gray-800' },
  { pattern: /bg-slate-800\/80/g, replacement: 'bg-slate-800' },
  
  // 一般的な透明パターン
  { pattern: /bg-gray-50\/50/g, replacement: 'bg-gray-50' },
  { pattern: /bg-slate-700\/50/g, replacement: 'bg-slate-700' },
];

// 対象ファイルを検索
const srcDir = 'C:/Users/N2312-1/本番開発.Unica(仮)/unica/src';
const pattern = `${srcDir}/**/*.{tsx,jsx,ts,js}`;

console.log('透明背景の修正を開始します...');

glob(pattern, (err, files) => {
  if (err) {
    console.error('ファイル検索エラー:', err);
    return;
  }
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let hasChanges = false;
      
      // 各置換ルールを適用
      replacements.forEach(({ pattern, replacement }) => {
        const newContent = modifiedContent.replace(pattern, replacement);
        if (newContent !== modifiedContent) {
          hasChanges = true;
          modifiedContent = newContent;
        }
      });
      
      if (hasChanges) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        console.log(`修正完了: ${path.relative(srcDir, filePath)}`);
        modifiedFiles++;
      }
      
      totalFiles++;
      
    } catch (error) {
      console.error(`ファイル処理エラー (${filePath}):`, error.message);
    }
  });
  
  console.log(`\n修正完了:`);
  console.log(`- 対象ファイル: ${totalFiles}件`);
  console.log(`- 修正ファイル: ${modifiedFiles}件`);
});