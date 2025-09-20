"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import * as ExcelJS from 'exceljs';

interface ExcelCellData {
  value: string | number | boolean | Date | null;
  displayValue: string;
  style?: {
    font?: any;
    fill?: any;
    border?: any;
    alignment?: any;
  };
}

interface ExcelSheetData {
  name: string;
  data: ExcelCellData[][];
  columnWidths: number[];
  rowHeights: number[];
  mergedCells: string[];
}

interface FileSystemNode {
  id: string;
  name: string;
  dataUrl?: string;
}

interface ExcelViewerSimplifiedProps {
  file: FileSystemNode;
  onClose: () => void;
}

const ExcelViewerSimplified: React.FC<ExcelViewerSimplifiedProps> = ({ file, onClose }) => {
  const [sheets, setSheets] = useState<ExcelSheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file.dataUrl) {
      loadExcelFile();
    }
  }, [file.dataUrl]);

  const loadExcelFile = async () => {
    if (!file.dataUrl) return;

    setLoading(true);
    setError(null);

    try {
      // DataURLからArrayBufferに変換
      const base64 = file.dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = bytes.buffer;

      // ExcelJSでワークブックを読み込み
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const processedSheets: ExcelSheetData[] = [];

      workbook.worksheets.forEach(worksheet => {
        const sheetData = processWorksheet(worksheet);
        processedSheets.push(sheetData);
      });

      setSheets(processedSheets);
      setActiveSheetIndex(0);
    } catch (err) {
      console.error('Excelファイル読み込みエラー:', err);
      setError('Excelファイルの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const processWorksheet = (worksheet: any): ExcelSheetData => {
    const maxRow = Math.min(worksheet.rowCount || 100, 100);
    const maxCol = Math.min(worksheet.columnCount || 26, 26);

    const data: ExcelCellData[][] = [];
    const columnWidths: number[] = [];
    const rowHeights: number[] = [];

    // 列幅を取得
    for (let colIndex = 1; colIndex <= maxCol; colIndex++) {
      const column = worksheet.getColumn(colIndex);
      columnWidths.push(column.width ? column.width * 7 : 90);
    }

    // 行データを処理
    for (let rowIndex = 1; rowIndex <= maxRow; rowIndex++) {
      const row: ExcelCellData[] = [];
      const excelRow = worksheet.getRow(rowIndex);

      // 行高さを取得
      rowHeights.push(excelRow.height ? excelRow.height * 1.33 : 24);

      for (let colIndex = 1; colIndex <= maxCol; colIndex++) {
        const cell = excelRow.getCell(colIndex);
        const cellData = processCellData(cell);
        row.push(cellData);
      }
      data.push(row);
    }

    // セル結合情報を取得
    const mergedCells: string[] = [];
    if (worksheet.model?.merges) {
      worksheet.model.merges.forEach((merge: string) => {
        mergedCells.push(merge);
      });
    }

    return {
      name: worksheet.name,
      data,
      columnWidths,
      rowHeights,
      mergedCells
    };
  };

  const processCellData = (cell: any): ExcelCellData => {
    let displayValue = '';
    let rawValue: any = null;

    try {
      // セル値の安全な取得
      if (cell && cell.value !== null && cell.value !== undefined) {
        rawValue = cell.value;

        // 表示値を決定
        if (typeof cell.value === 'object' && cell.value !== null) {
          if (cell.value.result !== undefined) {
            // 数式の結果
            displayValue = String(cell.value.result);
          } else if (cell.value.richText && Array.isArray(cell.value.richText)) {
            // リッチテキスト
            displayValue = cell.value.richText.map((rt: any) => rt?.text || '').join('');
          } else {
            displayValue = String(cell.value);
          }
        } else {
          displayValue = String(cell.value);
        }

        // 日付の場合の特別処理
        if (cell.value instanceof Date) {
          displayValue = cell.value.toLocaleDateString('ja-JP');
        } else if (typeof cell.value === 'number' && cell.type === 'date') {
          // Excelの日付シリアル値
          const excelDate = new Date((cell.value - 25569) * 86400 * 1000);
          displayValue = excelDate.toLocaleDateString('ja-JP');
        } else if (typeof cell.value === 'number') {
          // 数値の場合は適切にフォーマット
          displayValue = cell.value.toLocaleString();
        }
      }
    } catch (error) {
      // エラーが発生した場合は空文字列
      displayValue = '';
    }

    return {
      value: rawValue,
      displayValue,
      style: {
        font: cell.font,
        fill: cell.fill,
        border: cell.border,
        alignment: cell.alignment
      }
    };
  };

  const getCellStyle = (cellData: ExcelCellData, rowIndex: number, colIndex: number): React.CSSProperties => {
    const defaultStyle: React.CSSProperties = {
      height: sheets[activeSheetIndex]?.rowHeights[rowIndex] || 24,
      width: sheets[activeSheetIndex]?.columnWidths[colIndex] || 90,
      fontSize: '11pt',
      fontFamily: '游ゴシック, "Yu Gothic", Calibri, sans-serif',
      padding: '2px 6px',
      textAlign: 'left',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      border: '1px solid #d4d4d4',
      backgroundColor: '#ffffff',
      color: '#000000'
    };

    if (!cellData.style) return defaultStyle;

    const style = { ...defaultStyle };

    // フォントスタイル
    if (cellData.style.font) {
      const font = cellData.style.font;
      if (font.size) style.fontSize = `${font.size}pt`;
      if (font.bold) style.fontWeight = 'bold';
      if (font.italic) style.fontStyle = 'italic';
      if (font.underline) style.textDecoration = 'underline';
      if (font.color?.argb) {
        const argb = font.color.argb.toString().padStart(8, '0');
        style.color = `#${argb.slice(2)}`;
      }
    }

    // 配置
    if (cellData.style.alignment) {
      const alignment = cellData.style.alignment;
      if (alignment.horizontal) {
        style.textAlign = alignment.horizontal as any;
      }
      if (alignment.vertical) {
        style.verticalAlign = alignment.vertical as any;
      }
    }

    // 背景色
    if (cellData.style.fill?.type === 'pattern' && cellData.style.fill.fgColor?.argb) {
      const argb = cellData.style.fill.fgColor.argb.toString().padStart(8, '0');
      style.backgroundColor = `#${argb.slice(2)}`;
    }

    // 境界線
    if (cellData.style.border) {
      const border = cellData.style.border;
      const getBorderStyle = (borderInfo: any) => {
        if (!borderInfo?.style) return undefined;
        const color = borderInfo.color?.argb ?
          `#${borderInfo.color.argb.toString().padStart(8, '0').slice(2)}` : '#000000';
        const width = borderInfo.style === 'thick' ? '2px' : '1px';
        return `${width} solid ${color}`;
      };

      if (border.top) style.borderTop = getBorderStyle(border.top);
      if (border.bottom) style.borderBottom = getBorderStyle(border.bottom);
      if (border.left) style.borderLeft = getBorderStyle(border.left);
      if (border.right) style.borderRight = getBorderStyle(border.right);
    }

    return style;
  };

  const getColumnName = (colIndex: number): string => {
    let name = '';
    let num = colIndex;
    while (num >= 0) {
      name = String.fromCharCode(65 + (num % 26)) + name;
      num = Math.floor(num / 26) - 1;
    }
    return name;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">Excelファイルを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8">
          <div className="text-center text-red-500">
            <p className="text-lg mb-4">{error}</p>
            <Button onClick={onClose}>閉じる</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentSheet = sheets[activeSheetIndex];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[85vw] h-[80vh] max-w-6xl flex flex-col border border-gray-300 dark:border-gray-600">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{file.name}</h3>
            {currentSheet && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({currentSheet.name})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))} disabled={zoom <= 50}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-mono min-w-[3rem] text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 10))} disabled={zoom >= 200}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* シートタブ */}
        {sheets.length > 1 && (
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-1 pt-2 overflow-x-auto scrollbar-thin">
              {sheets.map((sheet, index) => (
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
          {currentSheet && (
            <div className="relative" style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left'
            }}>
              <table style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                width: 'max-content'
              }}>
                {/* 列ヘッダー */}
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-12 h-6 bg-gray-100 border border-gray-300 text-xs"></th>
                    {currentSheet.columnWidths.map((width, colIndex) => (
                      <th
                        key={colIndex}
                        className="h-6 bg-gray-100 border border-gray-300 text-xs font-medium text-center"
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        {getColumnName(colIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentSheet.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td
                        className="w-12 bg-gray-100 border border-gray-300 text-xs font-medium text-center"
                        style={{ height: `${currentSheet.rowHeights[rowIndex]}px` }}
                      >
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, colIndex) => (
                        <td
                          key={colIndex}
                          style={getCellStyle(cell, rowIndex, colIndex)}
                          title={cell.displayValue}
                        >
                          {cell.displayValue}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelViewerSimplified;