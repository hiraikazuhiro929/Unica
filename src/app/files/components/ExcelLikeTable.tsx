import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { evaluateFormulaSafely } from '@/lib/utils/secureFormulaEvaluator';
import {
  Plus,
  Minus,
  Copy,
  Scissors,
  FileDown,
  FileUp,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from "lucide-react";

interface CellData {
  value: any;
  formula?: string;
  type?: 'text' | 'number' | 'date' | 'formula';
  style?: {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    textColor?: string;
  };
}

interface ExcelLikeTableProps {
  initialData?: CellData[][];
  onDataChange?: (data: CellData[][]) => void;
}

const ExcelLikeTable: React.FC<ExcelLikeTableProps> = ({
  initialData = [],
  onDataChange
}) => {
  // 基本的なグリッドサイズ（動的に拡張可能）
  const [rows, setRows] = useState(50);
  const [cols, setCols] = useState(20);
  
  // セルデータ（二次元配列）
  const [cellData, setCellData] = useState<CellData[][]>(() => {
    if (initialData.length > 0) return initialData;
    return Array(rows).fill(null).map(() => 
      Array(cols).fill(null).map(() => ({ value: '' }))
    );
  });

  // 選択・編集状態
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // UI状態
  const [isDragging, setIsDragging] = useState(false);
  const [clipboard, setClipboard] = useState<CellData[][] | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{x: number, y: number, row: number, col: number} | null>(null);

  // Refs
  const tableRef = useRef<HTMLTableElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // 列名生成（A, B, C... AA, AB...）
  const getColumnName = (colIndex: number): string => {
    let name = '';
    let num = colIndex + 1;
    while (num > 0) {
      num--;
      name = String.fromCharCode(65 + (num % 26)) + name;
      num = Math.floor(num / 26);
    }
    return name;
  };

  // セル値の更新
  const updateCell = useCallback((row: number, col: number, newData: Partial<CellData>) => {
    setCellData(prev => {
      const newData2D = prev.map((rowData, r) =>
        rowData.map((cellData, c) =>
          r === row && c === col ? { ...cellData, ...newData } : cellData
        )
      );
      onDataChange?.(newData2D);
      return newData2D;
    });
  }, [onDataChange]);

  // セルクリック処理
  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    if (event.shiftKey && selectedCell) {
      // Shift+クリックで範囲選択
      setSelectedRange({
        startRow: Math.min(selectedCell.row, row),
        startCol: Math.min(selectedCell.col, col),
        endRow: Math.max(selectedCell.row, row),
        endCol: Math.max(selectedCell.col, col),
      });
    } else {
      setSelectedCell({ row, col });
      setSelectedRange(null);
      setEditingCell(null);
    }
  };

  // セルダブルクリック処理（編集開始）
  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
    setEditValue(cellData[row][col].formula || String(cellData[row][col].value || ''));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // 編集確定
  const handleEditConfirm = () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    let processedValue: any = editValue;
    let formula: string | undefined;

    // 数式判定（=で始まる場合）
    if (editValue.startsWith('=')) {
      formula = editValue;
      processedValue = evaluateFormula(editValue.substring(1), row, col);
    } else if (!isNaN(Number(editValue)) && editValue.trim() !== '') {
      processedValue = Number(editValue);
    }

    updateCell(row, col, {
      value: processedValue,
      formula: formula,
      type: formula ? 'formula' : (typeof processedValue === 'number' ? 'number' : 'text')
    });

    setEditingCell(null);
    setEditValue('');
  };

  // 簡単な数式評価（SUM, AVERAGE, COUNT など）
  const evaluateFormula = (formula: string, currentRow: number, currentCol: number): any => {
    try {
      // SUM(A1:A5) の処理
      if (formula.startsWith('SUM(')) {
        const rangeMatch = formula.match(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
        if (rangeMatch) {
          const [, startColStr, startRowStr, endColStr, endRowStr] = rangeMatch;
          const startCol = startColStr.charCodeAt(0) - 65;
          const startRow = parseInt(startRowStr) - 1;
          const endCol = endColStr.charCodeAt(0) - 65;
          const endRow = parseInt(endRowStr) - 1;
          
          let sum = 0;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const cellValue = cellData[r]?.[c]?.value;
              if (typeof cellValue === 'number') {
                sum += cellValue;
              }
            }
          }
          return sum;
        }
      }

      // AVERAGE(A1:A5) の処理
      if (formula.startsWith('AVERAGE(')) {
        const rangeMatch = formula.match(/AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
        if (rangeMatch) {
          const [, startColStr, startRowStr, endColStr, endRowStr] = rangeMatch;
          const startCol = startColStr.charCodeAt(0) - 65;
          const startRow = parseInt(startRowStr) - 1;
          const endCol = endColStr.charCodeAt(0) - 65;
          const endRow = parseInt(endRowStr) - 1;
          
          let sum = 0;
          let count = 0;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const cellValue = cellData[r]?.[c]?.value;
              if (typeof cellValue === 'number') {
                sum += cellValue;
                count++;
              }
            }
          }
          return count > 0 ? sum / count : 0;
        }
      }

      // TODAY() の処理
      if (formula === 'TODAY()') {
        return new Date().toISOString().split('T')[0];
      }

      // 安全な算術式の評価（math.jsを使用）
      if (/^[\d+\-*/().\s]+$/.test(formula)) {
        const result = evaluateFormulaSafely(formula);
        if (typeof result === 'string' && result.startsWith('#')) {
          return '#ERROR';
        }
        return result;
      }

      return `#ERROR: ${formula}`;
    } catch (error) {
      return `#ERROR`;
    }
  };

  // キーボード操作
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!selectedCell && !editingCell) return;

    if (editingCell) {
      if (event.key === 'Enter') {
        handleEditConfirm();
        event.preventDefault();
      } else if (event.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
        event.preventDefault();
      }
      return;
    }

    // 選択中のセル移動
    if (selectedCell) {
      let newRow = selectedCell.row;
      let newCol = selectedCell.col;

      switch (event.key) {
        case 'ArrowUp':
          newRow = Math.max(0, selectedCell.row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(rows - 1, selectedCell.row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, selectedCell.col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(cols - 1, selectedCell.col + 1);
          break;
        case 'Enter':
          newRow = Math.min(rows - 1, selectedCell.row + 1);
          break;
        case 'Tab':
          newCol = Math.min(cols - 1, selectedCell.col + 1);
          event.preventDefault();
          break;
        case 'Delete':
        case 'Backspace':
          updateCell(selectedCell.row, selectedCell.col, { value: '', formula: undefined });
          event.preventDefault();
          return;
        case 'F2':
          handleCellDoubleClick(selectedCell.row, selectedCell.col);
          event.preventDefault();
          return;
      }

      if (newRow !== selectedCell.row || newCol !== selectedCell.col) {
        setSelectedCell({ row: newRow, col: newCol });
        setSelectedRange(null);
        event.preventDefault();
      }

      // Ctrl+C (コピー)
      if (event.ctrlKey && event.key === 'c') {
        handleCopy();
        event.preventDefault();
      }

      // Ctrl+V (貼り付け)
      if (event.ctrlKey && event.key === 'v') {
        handlePaste();
        event.preventDefault();
      }
    }
  };

  // コピー処理
  const handleCopy = () => {
    if (selectedRange) {
      const copiedData: CellData[][] = [];
      for (let r = selectedRange.startRow; r <= selectedRange.endRow; r++) {
        const row: CellData[] = [];
        for (let c = selectedRange.startCol; c <= selectedRange.endCol; c++) {
          row.push({ ...cellData[r][c] });
        }
        copiedData.push(row);
      }
      setClipboard(copiedData);
    } else if (selectedCell) {
      setClipboard([[{ ...cellData[selectedCell.row][selectedCell.col] }]]);
    }
  };

  // 貼り付け処理
  const handlePaste = () => {
    if (!clipboard || !selectedCell) return;

    const startRow = selectedCell.row;
    const startCol = selectedCell.col;

    clipboard.forEach((row, r) => {
      row.forEach((cell, c) => {
        const targetRow = startRow + r;
        const targetCol = startCol + c;
        if (targetRow < rows && targetCol < cols) {
          updateCell(targetRow, targetCol, cell);
        }
      });
    });
  };

  // 行・列の追加・削除
  const insertRow = (index: number) => {
    const newRow = Array(cols).fill(null).map(() => ({ value: '' }));
    setCellData(prev => [
      ...prev.slice(0, index),
      newRow,
      ...prev.slice(index)
    ]);
    setRows(prev => prev + 1);
  };

  const deleteRow = (index: number) => {
    if (rows <= 1) return;
    setCellData(prev => prev.filter((_, i) => i !== index));
    setRows(prev => prev - 1);
  };

  const insertColumn = (index: number) => {
    setCellData(prev => prev.map(row => [
      ...row.slice(0, index),
      { value: '' },
      ...row.slice(index)
    ]));
    setCols(prev => prev + 1);
  };

  const deleteColumn = (index: number) => {
    if (cols <= 1) return;
    setCellData(prev => prev.map(row => row.filter((_, c) => c !== index)));
    setCols(prev => prev - 1);
  };

  // 右クリックメニュー
  const handleRightClick = (event: React.MouseEvent, row: number, col: number) => {
    event.preventDefault();
    setShowContextMenu({
      x: event.clientX,
      y: event.clientY,
      row,
      col
    });
  };

  const ContextMenu = () => {
    if (!showContextMenu) return null;

    return (
      <div
        className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
        style={{ left: showContextMenu.x, top: showContextMenu.y }}
      >
        <button
          onClick={() => {
            insertRow(showContextMenu.row);
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          上に行を挿入
        </button>
        <button
          onClick={() => {
            insertRow(showContextMenu.row + 1);
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          下に行を挿入
        </button>
        <button
          onClick={() => {
            insertColumn(showContextMenu.col);
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          左に列を挿入
        </button>
        <button
          onClick={() => {
            insertColumn(showContextMenu.col + 1);
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          右に列を挿入
        </button>
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        <button
          onClick={() => {
            deleteRow(showContextMenu.row);
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          行を削除
        </button>
        <button
          onClick={() => {
            deleteColumn(showContextMenu.col);
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          列を削除
        </button>
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        <button
          onClick={() => {
            handleCopy();
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Copy className="h-4 w-4" />
          コピー
        </button>
        <button
          onClick={() => {
            handlePaste();
            setShowContextMenu(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FileDown className="h-4 w-4" />
          貼り付け
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" onClick={() => setShowContextMenu(null)}>
      {/* ツールバー */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <Button size="sm" onClick={handleCopy} disabled={!selectedCell && !selectedRange}>
          <Copy className="h-4 w-4 mr-1" />
          コピー
        </Button>
        <Button size="sm" onClick={handlePaste} disabled={!clipboard}>
          <FileDown className="h-4 w-4 mr-1" />
          貼り付け
        </Button>
        <div className="border-l border-gray-300 h-6 mx-2" />
        <Button size="sm" onClick={() => selectedCell && insertRow(selectedCell.row)}>
          <Plus className="h-4 w-4 mr-1" />
          行追加
        </Button>
        <Button size="sm" onClick={() => selectedCell && insertColumn(selectedCell.col)}>
          <Plus className="h-4 w-4 mr-1" />
          列追加
        </Button>
        <div className="border-l border-gray-300 h-6 mx-2" />
        <span className="text-sm text-gray-600">
          {selectedCell ? `${getColumnName(selectedCell.col)}${selectedCell.row + 1}` : '選択なし'}
        </span>
        {cellData[selectedCell?.row || 0]?.[selectedCell?.col || 0]?.formula && (
          <span className="text-sm text-purple-600 font-mono ml-2">
            ={cellData[selectedCell.row][selectedCell.col].formula}
          </span>
        )}
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto" onKeyDown={handleKeyDown} tabIndex={0}>
        <table ref={tableRef} className="border-collapse w-full">
          <thead>
            <tr>
              <th className="w-12 h-8 border border-gray-300 bg-gray-100 dark:bg-gray-800 text-xs font-medium"></th>
              {Array(cols).fill(0).map((_, colIndex) => (
                <th
                  key={colIndex}
                  className="min-w-24 h-8 border border-gray-300 bg-gray-100 dark:bg-gray-800 text-xs font-medium px-2"
                >
                  {getColumnName(colIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array(rows).fill(0).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="w-12 h-8 border border-gray-300 bg-gray-100 dark:bg-gray-800 text-xs font-medium text-center">
                  {rowIndex + 1}
                </td>
                {Array(cols).fill(0).map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className={`min-w-24 h-8 border border-gray-300 cursor-cell relative ${
                      selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                        ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                        : selectedRange &&
                          rowIndex >= selectedRange.startRow &&
                          rowIndex <= selectedRange.endRow &&
                          colIndex >= selectedRange.startCol &&
                          colIndex <= selectedRange.endCol
                        ? 'bg-blue-50 dark:bg-blue-900/50'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleRightClick(e, rowIndex, colIndex)}
                  >
                    {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                      <Input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditConfirm}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditConfirm();
                            e.preventDefault();
                          } else if (e.key === 'Escape') {
                            setEditingCell(null);
                            setEditValue('');
                            e.preventDefault();
                          }
                        }}
                        className="w-full h-full border-none bg-white p-1 text-xs"
                        autoFocus
                      />
                    ) : (
                      <div className="px-2 py-1 text-xs truncate">
                        {String(cellData[rowIndex][colIndex].value || '')}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ContextMenu />
    </div>
  );
};

export default ExcelLikeTable;