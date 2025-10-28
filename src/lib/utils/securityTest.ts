import { evaluateFormulaSafely, evaluateConditionalFormula, isValidFormula } from './secureFormulaEvaluator';

/**
 * セキュリティテスト：任意コード実行を試みる悪意のある数式
 */

// 危険な入力例 - これらは全てブロックされるべき
const DANGEROUS_INPUTS = [
  'Function("return process")()',
  'constructor.constructor("return process")()',
  'eval("process.exit()")',
  'new Function("alert", "confirm")("hi")',
  '${process}',
  '`${process}`',
  'console.log("hacked")',
  'import("fs")',
  'require("child_process")',
  'process.env',
  'global.process',
  'window.location',
  'document.cookie',
  '__proto__.constructor',
  'prototype.constructor',
];

// 正常な入力例 - これらは通るべき
const VALID_INPUTS = [
  '2 + 3 * 4',
  'sqrt(16)',
  'max(1, 2, 3)',
  'sin(pi / 2)',
  '10 > 5',
  'abs(-5)',
  'round(3.14159, 2)',
  'pow(2, 3)',
];

/**
 * セキュリティテストの実行
 */
export function runSecurityTests(): { passed: number; failed: number; results: any[] } {
  const results: any[] = [];
  let passed = 0;
  let failed = 0;

  console.log('🔒 セキュリティテスト開始');
  console.log('=========================');

  // 危険な入力のテスト
  console.log('\n🚨 危険な入力のテスト:');
  DANGEROUS_INPUTS.forEach((input, index) => {
    try {
      const isValid = isValidFormula(input);
      const result = isValid ? evaluateFormulaSafely(input) : '#BLOCKED';

      // 危険な入力がブロックされているかチェック
      const blocked = !isValid || (typeof result === 'string' && result.startsWith('#'));

      if (blocked) {
        console.log(`✅ Test ${index + 1}: "${input}" -> BLOCKED (${result})`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1}: "${input}" -> NOT BLOCKED (${result})`);
        failed++;
      }

      results.push({
        type: 'dangerous',
        input,
        blocked,
        result,
        expected: 'BLOCKED'
      });
    } catch (error) {
      console.log(`✅ Test ${index + 1}: "${input}" -> EXCEPTION BLOCKED`);
      passed++;
      results.push({
        type: 'dangerous',
        input,
        blocked: true,
        result: 'EXCEPTION',
        expected: 'BLOCKED'
      });
    }
  });

  // 正常な入力のテスト
  console.log('\n✅ 正常な入力のテスト:');
  VALID_INPUTS.forEach((input, index) => {
    try {
      const isValid = isValidFormula(input);
      const result = isValid ? evaluateFormulaSafely(input) : '#INVALID';

      // 正常な入力が処理されているかチェック
      const processed = isValid && !(typeof result === 'string' && result.startsWith('#'));

      if (processed) {
        console.log(`✅ Test ${index + 1}: "${input}" -> ${result}`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1}: "${input}" -> BLOCKED (${result})`);
        failed++;
      }

      results.push({
        type: 'valid',
        input,
        processed,
        result,
        expected: 'PROCESSED'
      });
    } catch (error) {
      console.log(`❌ Test ${index + 1}: "${input}" -> EXCEPTION (${error})`);
      failed++;
      results.push({
        type: 'valid',
        input,
        processed: false,
        result: error,
        expected: 'PROCESSED'
      });
    }
  });

  console.log('\n=========================');
  console.log(`📊 結果: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}

/**
 * コマンドライン実行用
 */
if (require.main === module) {
  runSecurityTests();
}