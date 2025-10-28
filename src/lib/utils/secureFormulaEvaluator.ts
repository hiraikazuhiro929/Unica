import { evaluate, parse, MathJsStatic } from 'mathjs';

/**
 * 安全な数式評価器
 * Function()コンストラクタを使用せず、任意コード実行を防ぐ
 */

// 許可された関数・演算子のホワイトリスト
const ALLOWED_FUNCTIONS = [
  'add', 'subtract', 'multiply', 'divide', 'mod',
  'abs', 'ceil', 'floor', 'round', 'sqrt', 'pow',
  'min', 'max', 'sum', 'mean', 'median',
  'sin', 'cos', 'tan', 'log', 'log10',
  'pi', 'e'
];

const ALLOWED_OPERATORS = [
  '+', '-', '*', '/', '%', '^',
  '(', ')', '.', ' ', ',',
  '>', '<', '>=', '<=', '==', '!=',
  '&', '|', '!', '?', ':'
];

// 危険なパターンを検出する正規表現
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /function\s*\(/i,
  /new\s+function/i,
  /constructor/i,
  /prototype/i,
  /__proto__/i,
  /import\s*\(/i,
  /require\s*\(/i,
  /process/i,
  /global/i,
  /window/i,
  /document/i,
  /console/i,
  /alert/i,
  /confirm/i,
  /prompt/i,
  /\$\{/,  // テンプレートリテラル
  /`/,     // バッククォート
];

/**
 * 入力文字列が安全かチェック
 */
function isFormulaSecure(formula: string): boolean {
  // 空文字列チェック
  if (!formula || typeof formula !== 'string') {
    return false;
  }

  // 危険なパターンの検出
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(formula)) {
      console.warn(`Dangerous pattern detected: ${pattern}`);
      return false;
    }
  }

  // 許可された文字のみかチェック
  const allowedChars = /^[a-zA-Z0-9+\-*/().,\s><=!&|?:]+$/;
  if (!allowedChars.test(formula)) {
    console.warn(`Invalid characters in formula: ${formula}`);
    return false;
  }

  return true;
}

/**
 * 数式をパースして許可された関数のみかチェック
 */
function validateFormulaSyntax(formula: string): boolean {
  try {
    const parsed = parse(formula);

    // AST（抽象構文木）を検査
    const validateNode = (node: any): boolean => {
      if (!node) return true;

      // 関数呼び出しの検証
      if (node.type === 'FunctionNode') {
        if (!ALLOWED_FUNCTIONS.includes(node.fn.name)) {
          console.warn(`Forbidden function: ${node.fn.name}`);
          return false;
        }
      }

      // アクセサ（プロパティアクセス）を禁止
      if (node.type === 'AccessorNode' || node.type === 'IndexNode') {
        console.warn(`Property access forbidden: ${node.type}`);
        return false;
      }

      // 子ノードの検証
      if (node.args) {
        return node.args.every(validateNode);
      }

      if (node.content) {
        return validateNode(node.content);
      }

      return true;
    };

    return validateNode(parsed);
  } catch (error) {
    console.warn(`Formula syntax error: ${error}`);
    return false;
  }
}

/**
 * 安全な数式評価
 */
export function evaluateFormulaSafely(formula: string): number | string {
  try {
    // 入力検証
    if (!isFormulaSecure(formula)) {
      return '#SECURITY_ERROR';
    }

    // 構文検証
    if (!validateFormulaSyntax(formula)) {
      return '#SYNTAX_ERROR';
    }

    // 数式を正規化（スペース除去など）
    const normalizedFormula = formula.trim().replace(/\s+/g, ' ');

    // math.jsで安全に評価
    const result = evaluate(normalizedFormula);

    // 結果の検証
    if (typeof result === 'number') {
      // 無限大やNaNをチェック
      if (!isFinite(result)) {
        return '#MATH_ERROR';
      }
      return result;
    } else if (typeof result === 'string') {
      return result;
    } else if (typeof result === 'boolean') {
      return result ? 1 : 0;
    } else {
      return '#TYPE_ERROR';
    }

  } catch (error) {
    console.warn(`Formula evaluation error: ${error}`);
    return '#EVAL_ERROR';
  }
}

/**
 * Excel風の条件式評価（IF関数）
 */
export function evaluateConditionalFormula(formula: string): string | number {
  try {
    // IF関数のパターンマッチング
    const ifMatch = formula.match(/^IF\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)$/i);

    if (ifMatch) {
      const [, condition, trueValue, falseValue] = ifMatch;

      // 条件を安全に評価
      const conditionResult = evaluateFormulaSafely(condition);

      if (typeof conditionResult === 'string' && conditionResult.startsWith('#')) {
        return conditionResult; // エラーを返す
      }

      // 真偽値を判定
      const isTrue = Boolean(conditionResult) && conditionResult !== 0;

      // 値を安全に評価
      const resultValue = isTrue ? trueValue : falseValue;

      // 文字列リテラルの処理
      if ((resultValue.startsWith('"') && resultValue.endsWith('"')) ||
          (resultValue.startsWith("'") && resultValue.endsWith("'"))) {
        return resultValue.slice(1, -1); // クォートを削除
      }

      // 数値として評価
      const numericResult = evaluateFormulaSafely(resultValue);
      return numericResult;
    }

    // 通常の数式として評価
    return evaluateFormulaSafely(formula);

  } catch (error) {
    console.warn(`Conditional formula error: ${error}`);
    return '#CONDITIONAL_ERROR';
  }
}

/**
 * セルリファレンス付きの数式評価（簡易版）
 */
export function evaluateFormulaWithCells(
  formula: string,
  getCellValue: (cellRef: string) => number | string = () => 0
): number | string {
  try {
    // セルリファレンス（A1, B2など）を値に置換
    let processedFormula = formula.replace(/\b[A-Z]+\d+\b/g, (cellRef) => {
      const value = getCellValue(cellRef);
      return typeof value === 'number' ? value.toString() : '0';
    });

    // SUM関数の簡易実装
    processedFormula = processedFormula.replace(/SUM\s*\(\s*([^)]+)\s*\)/gi, (match, range) => {
      // 範囲指定（A1:A10など）の処理は省略し、単純な加算に変換
      const values = range.split(/[,:;]/).map((ref: string) => {
        const cellValue = getCellValue(ref.trim());
        return typeof cellValue === 'number' ? cellValue : 0;
      });
      return values.reduce((sum: number, val: number) => sum + val, 0).toString();
    });

    return evaluateFormulaSafely(processedFormula);

  } catch (error) {
    console.warn(`Cell formula error: ${error}`);
    return '#CELL_ERROR';
  }
}

/**
 * 数式が有効かどうかをチェック（バリデーションのみ）
 */
export function isValidFormula(formula: string): boolean {
  if (!formula || typeof formula !== 'string') {
    return false;
  }

  return isFormulaSecure(formula) && validateFormulaSyntax(formula);
}