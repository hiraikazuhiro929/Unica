// 計算式評価関数
import { evaluateFormulaSafely, evaluateConditionalFormula, isValidFormula } from '@/lib/utils/secureFormulaEvaluator';

export interface TableRow {
  id: string;
  data: { [key: string]: any };
}

export const evaluateFormula = (formula: string, rowData: { [key: string]: any }, allData: TableRow[]): any => {
  try {
    // IF(条件, 真値, 偽値) - 条件分岐
    const ifMatch = formula.match(/IF\(([^,]+),([^,]+),([^)]+)\)/i);
    if (ifMatch) {
      const [, condition, trueValue, falseValue] = ifMatch;
      // 条件評価（簡易版：列名と値の比較）
      const conditionMatch = condition.match(/(.+?)\s*([><=!]+)\s*(.+)/);
      if (conditionMatch) {
        const [, leftSide, operator, rightSide] = conditionMatch;
        const leftValue = rowData[leftSide.trim()] || leftSide.trim();
        const rightValue = rowData[rightSide.trim()] || rightSide.trim();

        let result = false;
        switch (operator) {
          case '>': result = leftValue > rightValue; break;
          case '<': result = leftValue < rightValue; break;
          case '>=': result = leftValue >= rightValue; break;
          case '<=': result = leftValue <= rightValue; break;
          case '==': case '=': result = leftValue == rightValue; break;
          case '!=': result = leftValue != rightValue; break;
        }

        const returnValue = result ? trueValue.trim() : falseValue.trim();
        // 返り値が数値か文字列かを判定
        const numValue = parseFloat(returnValue);
        return isNaN(numValue) ? returnValue.replace(/^["']|["']$/g, '') : numValue;
      }
    }

    // TODAY() - 今日の日付
    if (formula.includes('TODAY()')) {
      const today = new Date().toISOString().split('T')[0];
      formula = formula.replace(/TODAY\(\)/g, `"${today}"`);
    }

    // DATEDIFF(日付1, 日付2) - 日数差
    const dateDiffMatch = formula.match(/DATEDIFF\(([^,]+),([^)]+)\)/i);
    if (dateDiffMatch) {
      const [, date1Field, date2Field] = dateDiffMatch;
      const date1 = rowData[date1Field.trim()] || date1Field.trim().replace(/^["']|["']$/g, '');
      const date2 = rowData[date2Field.trim()] || date2Field.trim().replace(/^["']|["']$/g, '');

      const d1 = new Date(date1);
      const d2 = new Date(date2);

      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }
      return 0;
    }

    // CONCAT(文字列1, 文字列2, ...) - 文字列結合
    const concatMatch = formula.match(/CONCAT\(([^)]+)\)/i);
    if (concatMatch) {
      const parts = concatMatch[1].split(',').map(part => {
        const trimmed = part.trim();
        const columnValue = rowData[trimmed];
        if (columnValue !== undefined) return columnValue;
        return trimmed.replace(/^["']|["']$/g, '');
      });
      return parts.join('');
    }

    // SUM(カラム名) - 合計
    const sumMatch = formula.match(/SUM\(([^)]+)\)/i);
    if (sumMatch) {
      const columnName = sumMatch[1].trim();
      const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
      return values.reduce((sum, val) => sum + val, 0);
    }

    // AVG(カラム名) - 平均
    const avgMatch = formula.match(/AVG\(([^)]+)\)/i);
    if (avgMatch) {
      const columnName = avgMatch[1].trim();
      const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    // COUNT(カラム名) - 空でない値の数
    const countMatch = formula.match(/COUNT\(([^)]+)\)/i);
    if (countMatch) {
      const columnName = countMatch[1].trim();
      return allData.filter(row => row.data[columnName] !== null && row.data[columnName] !== undefined && row.data[columnName] !== '').length;
    }

    // MAX(カラム名) - 最大値
    const maxMatch = formula.match(/MAX\(([^)]+)\)/i);
    if (maxMatch) {
      const columnName = maxMatch[1].trim();
      const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
      return values.length > 0 ? Math.max(...values) : 0;
    }

    // MIN(カラム名) - 最小値
    const minMatch = formula.match(/MIN\(([^)]+)\)/i);
    if (minMatch) {
      const columnName = minMatch[1].trim();
      const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
      return values.length > 0 ? Math.min(...values) : 0;
    }

    // 単純な四則演算処理
    let processedFormula = formula;

    // カラム名を値に置換
    if (rowData) {
      Object.keys(rowData).forEach(key => {
        const value = rowData[key];
        if (value !== undefined && value !== null) {
          // カラム名の完全一致で置換
          const regex = new RegExp(`\\b${key}\\b`, 'g');
          processedFormula = processedFormula.replace(regex, value.toString());
        }
      });
    }

    // 安全な計算実行（math.jsを使用）
    if (/^[\d+\-*/().\s]+$/.test(processedFormula)) {
      const result = evaluateFormulaSafely(processedFormula);
      // エラーの場合は適切なメッセージを返す
      if (typeof result === 'string' && result.startsWith('#')) {
        return '計算エラー';
      }
      return result;
    }

    return '計算エラー';
  } catch (error) {
    return 'エラー';
  }
};