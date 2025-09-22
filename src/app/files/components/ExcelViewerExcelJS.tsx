"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download, Grid3x3 } from "lucide-react";
import * as ExcelJS from 'exceljs';

interface ExcelCellData {
  value: any;
  displayText: string;
  formula?: string;
  type: string;
  style: {
    font?: {
      name?: string;
      size?: number;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: any;
    };
    fill?: {
      type?: string;
      pattern?: string;
      fgColor?: any;
      bgColor?: any;
    };
    border?: {
      top?: any;
      bottom?: any;
      left?: any;
      right?: any;
    };
    alignment?: {
      horizontal?: string;
      vertical?: string;
      wrapText?: boolean;
    };
    numFmt?: string;
  };
}

interface ExcelWorksheetData {
  name: string;
  cells: ExcelCellData[][];
  columnWidths: number[];
  rowHeights: number[];
  mergedCells: Array<{
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    range: string;
  }>;
  actualRows: number;
  actualCols: number;
}

interface FileSystemNode {
  id: string;
  name: string;
  dataUrl?: string;
}

interface ExcelViewerExcelJSProps {
  file: FileSystemNode;
  onClose: () => void;
}

const ExcelViewerExcelJS: React.FC<ExcelViewerExcelJSProps> = ({ file, onClose }) => {
  const [worksheets, setWorksheets] = useState<ExcelWorksheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showGridlines, setShowGridlines] = useState<boolean>(true);

  useEffect(() => {
    if (file.dataUrl) {
      loadExcelFile();
    } else {
      setError('ファイルデータが見つかりません');
      setLoading(false);
    }
  }, [file.dataUrl]);

  const loadExcelFile = async () => {
    if (!file.dataUrl) return;

    setLoading(true);
    setError(null);

    try {
      // DataURLからArrayBufferに変換
      const base64Data = file.dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // ExcelJSでワークブックを読み込み
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);


      const processedWorksheets: ExcelWorksheetData[] = [];

      workbook.worksheets.forEach((worksheet, index) => {
        const worksheetData = processWorksheet(worksheet, false);
        processedWorksheets.push(worksheetData);
      });

      setWorksheets(processedWorksheets);
      setActiveSheetIndex(0);
    } catch (err) {
      console.error('Excelファイル読み込みエラー:', err);
      setError(`Excelファイルの読み込みに失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processWorksheet = (worksheet: any, showDebug: boolean = false): ExcelWorksheetData => {
    // 実際のデータ範囲を取得（複数の方法で試す）
    let actualRows = 0;
    let actualCols = 0;

    // 方法1: actualRowCount/actualColumnCount
    actualRows = worksheet.actualRowCount || 0;
    actualCols = worksheet.actualColumnCount || 0;

    // 方法2: rowCount/columnCount
    if (actualRows === 0) {
      actualRows = worksheet.rowCount || 0;
    }
    if (actualCols === 0) {
      actualCols = worksheet.columnCount || 0;
    }

    // 方法3: 最後の行/列を直接探す
    if (worksheet.lastRow) {
      actualRows = Math.max(actualRows, worksheet.lastRow.number);
    }
    if (worksheet.lastColumn) {
      actualCols = Math.max(actualCols, worksheet.lastColumn.number);
    }

    // デフォルト値
    actualRows = actualRows || 100;
    actualCols = actualCols || 26;

    // 最後の行が見切れる問題を防ぐため、1行追加
    actualRows += 1;

    console.log(`ワークシート: ${worksheet.name}, 実際の行数: ${actualRows}, 実際の列数: ${actualCols}`);

    // 最大範囲を制限（パフォーマンス考慮）
    const maxRows = Math.min(actualRows, 500);
    const maxCols = Math.min(actualCols, 50);

    // 列幅を取得
    const columnWidths: number[] = [];
    for (let colIndex = 1; colIndex <= maxCols; colIndex++) {
      const column = worksheet.getColumn(colIndex);
      const width = column.width ? Math.max(column.width * 7, 60) : 90; // 最小幅60px
      columnWidths.push(width);
    }

    // 行高さを取得
    const rowHeights: number[] = [];
    for (let rowIndex = 1; rowIndex <= maxRows; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const height = row.height ? Math.max(row.height * 1.33, 20) : 24; // 最小高さ20px
      rowHeights.push(height);
    }

    // セル結合情報を取得
    const mergedCells: Array<{
      startRow: number;
      endRow: number;
      startCol: number;
      endCol: number;
      range: string;
    }> = [];

    if (worksheet.model?.merges) {
      worksheet.model.merges.forEach((merge: string) => {
        try {
          // "A1:B2" 形式をパース
          const [startCell, endCell] = merge.split(':');
          if (startCell && endCell) {
            const startMatch = startCell.match(/([A-Z]+)(\d+)/);
            const endMatch = endCell.match(/([A-Z]+)(\d+)/);

            if (startMatch && endMatch) {
              const startCol = columnNameToIndex(startMatch[1]);
              const startRow = parseInt(startMatch[2]) - 1;
              const endCol = columnNameToIndex(endMatch[1]);
              const endRow = parseInt(endMatch[2]) - 1;

              mergedCells.push({
                startRow,
                endRow,
                startCol,
                endCol,
                range: merge
              });
            }
          }
        } catch (error) {
          // セル結合パースエラーは無視
        }
      });
    }

    // セルデータを処理
    const cells: ExcelCellData[][] = [];

    for (let rowIndex = 1; rowIndex <= maxRows; rowIndex++) {
      const row: ExcelCellData[] = [];
      const excelRow = worksheet.getRow(rowIndex);

      for (let colIndex = 1; colIndex <= maxCols; colIndex++) {
        const cell = excelRow.getCell(colIndex);
        const cellData = processCellData(cell, rowIndex - 1, colIndex - 1);
        row.push(cellData);
      }
      cells.push(row);
    }

    console.log(`実際に処理した行数: ${cells.length}, 列数: ${cells[0]?.length || 0}`);


    return {
      name: worksheet.name,
      cells,
      columnWidths,
      rowHeights,
      mergedCells,
      actualRows: maxRows,
      actualCols: maxCols
    };
  };

  const processCellData = (cell: any, rowIndex: number, colIndex: number): ExcelCellData => {
    let displayText = '';
    let cellValue: any = null;
    let cellType = 'string';
    let formula: string | undefined;

    try {
      // セル値の取得
      if (cell && cell.value !== null && cell.value !== undefined) {
        cellValue = cell.value;
        cellType = cell.type || 'string';


        // _value（生の値）を使用して正しい時間を取得
        if (cell._value !== undefined && typeof cell._value === 'number' && cell._value < 1) {
          const totalMinutes = Math.round(cell._value * 24 * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          displayText = `${hours}:${minutes.toString().padStart(2, '0')}`;
          cellValue = cell._value; // 生の値を保持
        }

        // 数式の処理
        if (cell.formula) {
          formula = cell.formula;
        }

        // 表示テキストの決定
        if (typeof cell.value === 'object' && cell.value !== null) {
          if (cell.value.result !== undefined) {
            // 数式の結果
            displayText = String(cell.value.result);
          } else if (cell.value.richText && Array.isArray(cell.value.richText)) {
            // リッチテキスト
            displayText = cell.value.richText.map((rt: any) => rt?.text || '').join('');
          } else if (cell.value.formula) {
            // 数式オブジェクト
            displayText = String(cell.value.result || cell.value.formula);
          } else {
            // その他のオブジェクト
            displayText = String(cell.value);
          }
        } else {
          displayText = String(cell.value);
        }

        // 文字列の時間フォーマット処理（例：「7:00:00」→「7:00」）
        if (typeof cell.value === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(cell.value)) {
          // HH:MM:SS 形式の場合、HH:MM に変換
          const timeParts = cell.value.split(':');
          if (timeParts.length === 3) {
            displayText = `${timeParts[0]}:${timeParts[1]}`;
          }
        }

        // 時間・日付の特別処理
        if (typeof cell.value === 'number' && cell.value < 1 && cell.value > 0) {
          // 1未満の数値は時間として扱う（例: 0.29167 = 7:00）
          const totalMinutes = Math.round(cell.value * 24 * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          displayText = `${hours}:${minutes.toString().padStart(2, '0')}`;
        } else if (cell.value instanceof Date) {
          // Dateオブジェクトの場合
          const year = cell.value.getFullYear();
          if (year === 1899 || year === 1900) {
            // 1899年や1900年は時間データの可能性が高い
            const hours = cell.value.getHours();
            const minutes = cell.value.getMinutes();
            displayText = `${hours}:${minutes.toString().padStart(2, '0')}`;
          } else {
            // 通常の日付
            displayText = cell.value.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        } else if (cellType === 'date' && typeof cell.value === 'number') {
          // 日付型の数値
          if (cell.value < 1) {
            // 時間のみ
            const totalMinutes = Math.round(cell.value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            displayText = `${hours}:${minutes.toString().padStart(2, '0')}`;
          } else if (cell.value > 25569) {
            // 日付シリアル値
            const excelDate = new Date((cell.value - 25569) * 86400 * 1000);
            if (!isNaN(excelDate.getTime())) {
              displayText = excelDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
            }
          } else {
            displayText = cell.text || String(cell.value);
          }
        } else if (cellType === 'number' && typeof cell.value === 'number') {
          // 通常の数値
          if (Number.isInteger(cell.value)) {
            displayText = cell.value.toLocaleString();
          } else {
            displayText = cell.value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            });
          }
        }

        // ExcelJS の text プロパティを最優先（Excelの表示フォーマット通り）
        if (cell.text && cell.text.trim()) {
          displayText = cell.text;
        }

        // Dateオブジェクトが時間文字列っぽい場合の強制変換（タイムゾーン補正）
        if (cell.value instanceof Date && cell.value.getFullYear() === 1899) {
          // UTC時間を取得（タイムゾーンの影響を排除）
          const utcHours = cell.value.getUTCHours();
          const utcMinutes = cell.value.getUTCMinutes();

          // 7:00 となるべき時間を計算
          // 16:00 GMT+09 は UTC で 7:00
          displayText = `${utcHours}:${utcMinutes.toString().padStart(2, '0')}`;
        }
      }
    } catch (error) {
      // エラーは無視
    }

    // スタイル情報の取得
    const style: ExcelCellData['style'] = {
      font: {},
      fill: {},
      border: {},
      alignment: {}
    };

    try {
      // フォント情報
      if (cell.font && Object.keys(cell.font).length > 0) {
        style.font = {
          name: cell.font.name,
          size: cell.font.size,
          bold: cell.font.bold,
          italic: cell.font.italic,
          underline: cell.font.underline,
          color: cell.font.color
        };
      }

      // 背景色情報
      if (cell.fill && Object.keys(cell.fill).length > 0) {
        style.fill = {
          type: cell.fill.type,
          pattern: cell.fill.pattern,
          fgColor: cell.fill.fgColor,
          bgColor: cell.fill.bgColor
        };
      }

      // 罫線情報（より詳細に）
      if (cell.border && Object.keys(cell.border).length > 0) {
        const border = cell.border;
        style.border = {};

        // 各方向の罫線を個別に確認（条件を緩める）
        if (border.top) {
          style.border.top = {
            style: border.top.style || 'thin',
            color: border.top.color || { argb: 'FF000000' }
          };
        }
        if (border.bottom) {
          style.border.bottom = {
            style: border.bottom.style || 'thin',
            color: border.bottom.color || { argb: 'FF000000' }
          };
        }
        if (border.left) {
          style.border.left = {
            style: border.left.style || 'thin',
            color: border.left.color || { argb: 'FF000000' }
          };
        }
        if (border.right) {
          style.border.right = {
            style: border.right.style || 'thin',
            color: border.right.color || { argb: 'FF000000' }
          };
        }

        // 対角線も取得
        if (border.diagonal) {
          style.border.diagonal = border.diagonal;
        }
      }

      // 配置情報
      if (cell.alignment && Object.keys(cell.alignment).length > 0) {
        style.alignment = {
          horizontal: cell.alignment.horizontal,
          vertical: cell.alignment.vertical,
          wrapText: cell.alignment.wrapText
        };
      }

      // 数値フォーマット
      if (cell.numFmt) {
        style.numFmt = cell.numFmt;
      }
    } catch (styleError) {
      // スタイルエラーは無視
    }

    return {
      value: cellValue,
      displayText,
      formula,
      type: cellType,
      style
    };
  };

  // 列名（A, B, C...）をインデックス（0, 1, 2...）に変換
  const columnNameToIndex = (columnName: string): number => {
    let result = 0;
    for (let i = 0; i < columnName.length; i++) {
      result = result * 26 + (columnName.charCodeAt(i) - 64);
    }
    return result - 1;
  };

  // インデックスを列名に変換
  const indexToColumnName = (index: number): string => {
    let name = '';
    let num = index;
    while (num >= 0) {
      name = String.fromCharCode(65 + (num % 26)) + name;
      num = Math.floor(num / 26) - 1;
    }
    return name;
  };

  // ファイルダウンロード機能
  const handleDownload = () => {
    if (!file.dataUrl) {
      // ダミーファイルの場合
      const dummyContent = `ファイル名: ${file.name}\nファイルタイプ: Excel\nサイズ: 不明`;
      const blob = new Blob([dummyContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 実際のファイルがある場合
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 色調調整関数（Excelのtint値に対応）
  const applyTint = (color: string, tint: number): string => {
    if (!color.startsWith('#') || tint === 0) return color;

    try {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      let newR, newG, newB;

      if (tint < 0) {
        // 暗くする
        const factor = 1 + tint;
        newR = Math.round(r * factor);
        newG = Math.round(g * factor);
        newB = Math.round(b * factor);
      } else {
        // 明るくする
        newR = Math.round(r + (255 - r) * tint);
        newG = Math.round(g + (255 - g) * tint);
        newB = Math.round(b + (255 - b) * tint);
      }

      newR = Math.max(0, Math.min(255, newR));
      newG = Math.max(0, Math.min(255, newG));
      newB = Math.max(0, Math.min(255, newB));

      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return color; // エラーの場合は元の色を返す
    }
  };

  // 罫線スタイルを生成する関数
  const getBorderStyle = (borderInfo: any) => {
    if (!borderInfo) return undefined;

    // デフォルトスタイル
    let borderStyle = '1px solid';

    // スタイルの詳細マッピング
    if (borderInfo.style) {
      switch (borderInfo.style) {
        case 'thick':
          borderStyle = '2px solid';
          break;
        case 'medium':
          borderStyle = '1.5px solid';
          break;
        case 'thin':
        case 'hair':
          borderStyle = '1px solid';
          break;
        case 'dotted':
          borderStyle = '1px dotted';
          break;
        case 'dashed':
        case 'dashDot':
        case 'dashDotDot':
        case 'mediumDashed':
        case 'mediumDashDot':
        case 'mediumDashDotDot':
          borderStyle = '1px dashed';
          break;
        case 'double':
          borderStyle = '3px double';
          break;
        default:
          borderStyle = '1px solid';
      }
    }

    // 色の処理
    let color = '#000000';
    if (borderInfo.color) {
      if (typeof borderInfo.color === 'string') {
        color = borderInfo.color.startsWith('#') ? borderInfo.color : `#${borderInfo.color}`;
      } else if (borderInfo.color.argb) {
        const argb = borderInfo.color.argb.toString().padStart(8, '0');
        color = `#${argb.slice(2)}`;
      } else if (borderInfo.color.rgb) {
        const rgb = borderInfo.color.rgb.toString();
        color = rgb.startsWith('#') ? rgb : `#${rgb}`;
      } else if (borderInfo.color.theme !== undefined) {
        // 罫線色のテーマカラー
        const themeColors = [
          '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#E15759',
          '#70AD47', '#FFC000', '#5B9BD5', '#FF6600', '#0563C1', '#954F72'
        ];

        const themeIndex = borderInfo.color.theme;
        if (themeIndex >= 0 && themeIndex < themeColors.length) {
          color = themeColors[themeIndex];

          // tint（色調調整）の適用
          if (borderInfo.color.tint !== undefined && borderInfo.color.tint !== 0) {
            color = applyTint(color, borderInfo.color.tint);
          }
        }
      }
    }

    return `${borderStyle} ${color}`;
  };

  // セルのCSSスタイルを生成（隣接セルの罫線も考慮）
  const getCellStyle = (cellData: ExcelCellData, rowIndex: number, colIndex: number): React.CSSProperties => {
    const currentSheet = worksheets[activeSheetIndex];
    if (!currentSheet) return {};

    const baseStyle: React.CSSProperties = {
      width: `${currentSheet.columnWidths[colIndex] || 90}px`,
      minWidth: `${currentSheet.columnWidths[colIndex] || 90}px`,
      height: `${currentSheet.rowHeights[rowIndex] || 24}px`,
      fontSize: '11pt',
      fontFamily: '游ゴシック, "Yu Gothic", Calibri, sans-serif',
      padding: '2px 6px',
      textAlign: 'left',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      boxSizing: 'border-box',
      backgroundColor: '#ffffff',
      color: '#000000'
    };

    const style = { ...baseStyle };

    // フォントスタイルの適用
    if (cellData.style.font) {
      const font = cellData.style.font;
      if (font.name) style.fontFamily = `${font.name}, Calibri, sans-serif`;
      if (font.size) style.fontSize = `${font.size}pt`;
      if (font.bold) style.fontWeight = 'bold';
      if (font.italic) style.fontStyle = 'italic';

      // 下線の詳細処理
      if (font.underline) {
        let underlineStyle = 'underline';
        if (typeof font.underline === 'object') {
          // ExcelJSの下線オブジェクトの場合
          if (font.underline.style === 'double') {
            underlineStyle = 'underline';
            // CSS3では double underline は限定的なサポート
          } else if (font.underline.style === 'single') {
            underlineStyle = 'underline';
          }
        } else if (font.underline === true || font.underline === 'single') {
          underlineStyle = 'underline';
        } else if (font.underline === 'double') {
          underlineStyle = 'underline';
        }
        style.textDecoration = underlineStyle;
      }

      // 取り消し線
      if (font.strike) {
        style.textDecoration = style.textDecoration ?
          `${style.textDecoration} line-through` : 'line-through';
      }

      // フォント色
      if (font.color) {
        if (typeof font.color === 'string') {
          style.color = font.color.startsWith('#') ? font.color : `#${font.color}`;
        } else if (font.color.argb) {
          const argb = font.color.argb.toString().padStart(8, '0');
          style.color = `#${argb.slice(2)}`;
        } else if (font.color.rgb) {
          const rgb = font.color.rgb.toString();
          style.color = rgb.startsWith('#') ? rgb : `#${rgb}`;
        } else if (font.color.theme !== undefined) {
          // Excelテーマカラー（Office 2007以降の正確な順番）
          const themeColors = [
            '#FFFFFF', // 0: Light 1 (白)
            '#000000', // 1: Dark 1 (黒)
            '#E7E6E6', // 2: Light 2 (薄いグレー)
            '#44546A', // 3: Dark 2 (濃いグレー)
            '#4472C4', // 4: Accent 1 (青)
            '#E15759', // 5: Accent 2 (赤)
            '#70AD47', // 6: Accent 3 (緑)
            '#FFC000', // 7: Accent 4 (黄)
            '#5B9BD5', // 8: Accent 5 (薄い青)
            '#FF6600', // 9: Accent 6 (オレンジ)
            '#0563C1', // 10: Hyperlink (青)
            '#954F72'  // 11: Followed Hyperlink (紫)
          ];

          const themeIndex = font.color.theme;
          if (themeIndex >= 0 && themeIndex < themeColors.length) {
            style.color = themeColors[themeIndex];

            // tint（色調調整）の適用
            if (font.color.tint !== undefined && font.color.tint !== 0) {
              style.color = applyTint(style.color, font.color.tint);
            }
          } else {
            style.color = '#000000'; // デフォルト黒
          }
        }
      }
    }

    // 配置の適用
    if (cellData.style.alignment) {
      const alignment = cellData.style.alignment;
      if (alignment.horizontal) {
        style.textAlign = alignment.horizontal as any;
      }
      if (alignment.vertical) {
        style.verticalAlign = alignment.vertical as any;
      }
      if (alignment.wrapText) {
        style.whiteSpace = 'pre-wrap';
        style.wordBreak = 'break-word';
      }
    }

    // 背景色の適用
    if (cellData.style.fill?.fgColor) {
      const fill = cellData.style.fill;
      if (fill.type === 'pattern' && fill.pattern === 'solid') {
        if (fill.fgColor.argb) {
          const argb = fill.fgColor.argb.toString().padStart(8, '0');
          style.backgroundColor = `#${argb.slice(2)}`;
        } else if (fill.fgColor.rgb) {
          const rgb = fill.fgColor.rgb.toString();
          style.backgroundColor = rgb.startsWith('#') ? rgb : `#${rgb}`;
        } else if (fill.fgColor.theme !== undefined) {
          // 背景色のテーマカラー
          const themeColors = [
            '#FFFFFF', // 0: Light 1 (白)
            '#000000', // 1: Dark 1 (黒)
            '#E7E6E6', // 2: Light 2 (薄いグレー)
            '#44546A', // 3: Dark 2 (濃いグレー)
            '#4472C4', // 4: Accent 1 (青)
            '#E15759', // 5: Accent 2 (赤)
            '#70AD47', // 6: Accent 3 (緑)
            '#FFC000', // 7: Accent 4 (黄)
            '#5B9BD5', // 8: Accent 5 (薄い青)
            '#FF6600', // 9: Accent 6 (オレンジ)
            '#0563C1', // 10: Hyperlink (青)
            '#954F72'  // 11: Followed Hyperlink (紫)
          ];

          const themeIndex = fill.fgColor.theme;
          if (themeIndex >= 0 && themeIndex < themeColors.length) {
            style.backgroundColor = themeColors[themeIndex];

            // tint（色調調整）の適用
            if (fill.fgColor.tint !== undefined && fill.fgColor.tint !== 0) {
              style.backgroundColor = applyTint(style.backgroundColor, fill.fgColor.tint);
            }
          } else {
            style.backgroundColor = '#FFFFFF'; // デフォルト白
          }
        }
      }
    }

    // 罫線の適用（改善版）
    if (cellData.style.border && Object.keys(cellData.style.border).length > 0) {
      const border = cellData.style.border;

      // 各方向の罫線を適用
      if (border.top) {
        const topBorder = getBorderStyle(border.top);
        if (topBorder) style.borderTop = topBorder;
      }
      if (border.bottom) {
        const bottomBorder = getBorderStyle(border.bottom);
        if (bottomBorder) style.borderBottom = bottomBorder;
      }
      if (border.left) {
        const leftBorder = getBorderStyle(border.left);
        if (leftBorder) style.borderLeft = leftBorder;
      }
      if (border.right) {
        const rightBorder = getBorderStyle(border.right);
        if (rightBorder) style.borderRight = rightBorder;
      }
    }

    // 隣接セルの罫線もチェック（罫線がない場合のみ）
    if (currentSheet) {
      // 下のセルの上罫線をチェック（現在のセルに下罫線がない場合のみ）
      if (!style.borderBottom) {
        const bottomCell = currentSheet.cells[rowIndex + 1]?.[colIndex];
        if (bottomCell?.style.border?.top) {
          const topBorder = bottomCell.style.border.top;
          if (topBorder && (topBorder.style || topBorder.color)) {
            style.borderBottom = getBorderStyle(topBorder);
          }
        }
      }

      // 右のセルの左罫線をチェック（現在のセルに右罫線がない場合のみ）
      if (!style.borderRight) {
        const rightCell = currentSheet.cells[rowIndex]?.[colIndex + 1];
        if (rightCell?.style.border?.left) {
          const leftBorder = rightCell.style.border.left;
          if (leftBorder && (leftBorder.style || leftBorder.color)) {
            style.borderRight = getBorderStyle(leftBorder);
          }
        }
      }
    }

    // 数値の場合は右寄せ
    if (cellData.type === 'number' && !cellData.style.alignment?.horizontal) {
      style.textAlign = 'right';
    }

    // 最後にグリッド線を適用（罫線がない部分のみ）
    if (showGridlines) {
      // 各辺ごとに、罫線が設定されていなければグリッド線を適用
      style.borderTop = style.borderTop || '1px solid #e0e0e0';
      style.borderRight = style.borderRight || '1px solid #e0e0e0';
      style.borderBottom = style.borderBottom || '1px solid #e0e0e0';
      style.borderLeft = style.borderLeft || '1px solid #e0e0e0';
    }

    return style;
  };

  // セル結合の確認
  const getMergeInfo = (rowIndex: number, colIndex: number) => {
    const currentSheet = worksheets[activeSheetIndex];
    if (!currentSheet) return null;

    return currentSheet.mergedCells.find(merge =>
      rowIndex >= merge.startRow && rowIndex <= merge.endRow &&
      colIndex >= merge.startCol && colIndex <= merge.endCol
    );
  };

  const isMergeStart = (rowIndex: number, colIndex: number) => {
    const merge = getMergeInfo(rowIndex, colIndex);
    return merge && merge.startRow === rowIndex && merge.startCol === colIndex;
  };

  const isMergeHidden = (rowIndex: number, colIndex: number) => {
    const merge = getMergeInfo(rowIndex, colIndex);
    return merge && !(merge.startRow === rowIndex && merge.startCol === colIndex);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Excelファイルを読み込み中...</h3>
            <p className="text-sm text-gray-500">ExcelJSでファイルを解析しています</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <X className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">エラーが発生しました</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={onClose}>閉じる</Button>
          </div>
        </div>
      </div>
    );
  }

  if (worksheets.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <p className="text-gray-500 mb-4">読み込めるワークシートが見つかりません</p>
            <Button onClick={onClose}>閉じる</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentSheet = worksheets[activeSheetIndex];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[95vw] h-[90vh] flex flex-col border border-gray-300 dark:border-gray-600">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{file.name}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({currentSheet.name} - {currentSheet.actualRows}行 x {currentSheet.actualCols}列)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              ダウンロード
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGridlines(!showGridlines)}
              className={showGridlines ? 'bg-blue-100' : ''}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))} disabled={zoom <= 50}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-mono min-w-[3rem] text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 10))} disabled={zoom >= 200}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* シートタブ */}
        {worksheets.length > 1 && (
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-1 pt-2 overflow-x-auto scrollbar-thin">
              {worksheets.map((sheet, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSheetIndex(index)}
                  className={`px-3 py-2 text-sm border-t border-l border-r rounded-t transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeSheetIndex === index
                      ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white border-b-transparent -mb-px'
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* テーブル */}
        <div className="flex-1 overflow-auto">
          <div
            className="relative min-w-max"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left'
            }}
          >
            <table style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed'
            }}>
              {/* 列ヘッダー */}
              <thead className="sticky top-0 z-10">
                <tr>
                  <th
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 text-xs font-medium text-center"
                    style={{ width: '40px', minWidth: '40px' }}
                  >
                  </th>
                  {currentSheet.columnWidths.map((width, colIndex) => (
                    <th
                      key={colIndex}
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 text-xs font-medium text-center px-1"
                      style={{
                        width: `${width}px`,
                        minWidth: `${width}px`,
                        height: '24px'
                      }}
                    >
                      {indexToColumnName(colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentSheet.cells.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 text-xs font-medium text-center px-1"
                      style={{
                        width: '40px',
                        minWidth: '40px',
                        height: `${currentSheet.rowHeights[rowIndex]}px`
                      }}
                    >
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => {
                      // セル結合で隠されているセルはスキップ
                      if (isMergeHidden(rowIndex, colIndex)) {
                        return null;
                      }

                      const mergeInfo = getMergeInfo(rowIndex, colIndex);
                      const colSpan = mergeInfo ? mergeInfo.endCol - mergeInfo.startCol + 1 : 1;
                      const rowSpan = mergeInfo ? mergeInfo.endRow - mergeInfo.startRow + 1 : 1;

                      const cellStyle = getCellStyle(cell, rowIndex, colIndex);

                      // セル結合の場合は幅と高さを調整
                      if (mergeInfo && isMergeStart(rowIndex, colIndex)) {
                        let totalWidth = 0;
                        let totalHeight = 0;

                        for (let c = mergeInfo.startCol; c <= mergeInfo.endCol; c++) {
                          totalWidth += currentSheet.columnWidths[c] || 90;
                        }
                        for (let r = mergeInfo.startRow; r <= mergeInfo.endRow; r++) {
                          totalHeight += currentSheet.rowHeights[r] || 24;
                        }

                        cellStyle.width = `${totalWidth}px`;
                        cellStyle.minWidth = `${totalWidth}px`;
                        cellStyle.height = `${totalHeight}px`;
                      }

                      return (
                        <td
                          key={colIndex}
                          style={cellStyle}
                          colSpan={colSpan}
                          rowSpan={rowSpan}
                          title={cell.formula ? `=${cell.formula}` : cell.displayText}
                        >
                          <div className="truncate">
                            {cell.displayText}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ステータスバー */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>
              ExcelJS v{require('exceljs/package.json').version} で読み込み
            </span>
            <span>
              範囲: {currentSheet.actualRows}行 x {currentSheet.actualCols}列
              {currentSheet.mergedCells.length > 0 && ` (結合セル: ${currentSheet.mergedCells.length})`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelViewerExcelJS;