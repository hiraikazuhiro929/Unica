import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { evaluateFormulaSafely, evaluateConditionalFormula } from '@/lib/utils/secureFormulaEvaluator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Copy,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Link,
  Mail,
  Phone,
  Check,
  X,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  FileUp,
  FileDown,
  Calculator,
  Type,
  Hash,
  ToggleLeft,
  Tag,
  Paperclip,
  Palette,
  ChevronDown,
  ChevronRight,
  Split,
  Merge,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

// 型定義
interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'time' | 'datetime' | 'select' | 'multi_select' | 
        'checkbox' | 'url' | 'email' | 'phone' | 'file' | 'formula' | 'rich_text' | 'currency';
  options?: string[];
  formula?: string;
  width?: number;
  format?: string; // 数値・日付の表示形式
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  style?: {
    backgroundColor?: string;
    textColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
  };
}

interface TableRow {
  id: string;
  data: { [key: string]: any };
  style?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

interface CellRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface AdvancedExcelTableProps {
  initialColumns?: TableColumn[];
  initialData?: TableRow[];
  onDataChange?: (columns: TableColumn[], data: TableRow[]) => void;
  readOnly?: boolean;
  maxRows?: number;
  maxCols?: number;
}

// Excel関数の実装
class ExcelFormula {
  static evaluate(formula: string, data: TableRow[], currentRowIndex: number, columns: TableColumn[]): any {
    try {
      // 数式の前処理（セル参照をデータに変換）
      let processedFormula = formula.replace(/^=/, '');
      
      // 基本的な Excel 関数の実装
      if (processedFormula.includes('SUM(')) {
        return this.handleSUM(processedFormula, data, columns);
      }
      if (processedFormula.includes('AVERAGE(')) {
        return this.handleAVERAGE(processedFormula, data, columns);
      }
      if (processedFormula.includes('COUNT(')) {
        return this.handleCOUNT(processedFormula, data, columns);
      }
      if (processedFormula.includes('IF(')) {
        return this.handleIF(processedFormula, data, currentRowIndex, columns);
      }
      if (processedFormula.includes('CONCATENATE(')) {
        return this.handleCONCATENATE(processedFormula, data, currentRowIndex, columns);
      }
      
      // 安全な算術式の評価（math.jsを使用）
      const result = evaluateFormulaSafely(processedFormula);
      if (typeof result === 'string' && result.startsWith('#')) {
        return '#ERROR';
      }
      return result;
    } catch (error) {
      return '#ERROR';
    }
  }

  static handleSUM(formula: string, data: TableRow[], columns: TableColumn[]): number {
    const match = formula.match(/SUM\(([^)]+)\)/);
    if (!match) return 0;
    
    const columnName = match[1].replace(/"/g, '');
    const column = columns.find(col => col.name === columnName);
    if (!column || column.type !== 'number') return 0;
    
    return data.reduce((sum, row) => {
      const value = parseFloat(row.data[columnName]) || 0;
      return sum + value;
    }, 0);
  }

  static handleAVERAGE(formula: string, data: TableRow[], columns: TableColumn[]): number {
    const sum = this.handleSUM(formula.replace('AVERAGE', 'SUM'), data, columns);
    return data.length > 0 ? sum / data.length : 0;
  }

  static handleCOUNT(formula: string, data: TableRow[], columns: TableColumn[]): number {
    const match = formula.match(/COUNT\(([^)]+)\)/);
    if (!match) return 0;
    
    const columnName = match[1].replace(/"/g, '');
    return data.filter(row => row.data[columnName] != null && row.data[columnName] !== '').length;
  }

  static handleIF(formula: string, data: TableRow[], currentRowIndex: number, columns: TableColumn[]): any {
    // 簡単なIF文の実装（条件, true値, false値）
    const match = formula.match(/IF\(([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return '#ERROR';
    
    const [, condition, trueValue, falseValue] = match;
    // 安全な条件評価（math.jsを使用）
    const result = evaluateFormulaSafely(condition);
    if (typeof result === 'string' && result.startsWith('#')) {
      return '#ERROR';
    }
    return result ? trueValue.replace(/"/g, '') : falseValue.replace(/"/g, '');
  }

  static handleCONCATENATE(formula: string, data: TableRow[], currentRowIndex: number, columns: TableColumn[]): string {
    const match = formula.match(/CONCATENATE\(([^)]+)\)/);
    if (!match) return '';
    
    const args = match[1].split(',').map(arg => arg.trim().replace(/"/g, ''));
    return args.join('');
  }
}

// メインコンポーネント
const AdvancedExcelTable: React.FC<AdvancedExcelTableProps> = ({
  initialColumns = [
    { name: 'A', type: 'text' },
    { name: 'B', type: 'number' },
    { name: 'C', type: 'formula', formula: '=SUM("B")' }
  ],
  initialData = [],
  onDataChange,
  readOnly = false,
  maxRows = 1000,
  maxCols = 26
}) => {
  // State管理
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [data, setData] = useState<TableRow[]>(initialData);
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, colIndex: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, rowIndex?: number, colIndex?: number} | null>(null);
  const [filter, setFilter] = useState<{[key: string]: string}>({});
  const [sortConfig, setSortConfig] = useState<{column: string, direction: 'asc' | 'desc'} | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState<number | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [columnWidths, setColumnWidths] = useState<{[key: number]: number}>({});
  
  const tableRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // データ変更の通知
  useEffect(() => {
    if (onDataChange) {
      onDataChange(columns, data);
    }
  }, [columns, data, onDataChange]);

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // フィルター適用
    Object.entries(filter).forEach(([columnName, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(row => 
          String(row.data[columnName] || '').toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });
    
    // ソート適用
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a.data[sortConfig.column];
        const bVal = b.data[sortConfig.column];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [data, filter, sortConfig]);

  // セル値の取得
  const getCellValue = useCallback((row: TableRow, column: TableColumn, rowIndex: number) => {
    if (column.type === 'formula' && column.formula) {
      return ExcelFormula.evaluate(column.formula, data, rowIndex, columns);
    }
    return row.data[column.name];
  }, [data, columns]);

  // セル値の更新
  const updateCellValue = useCallback((rowIndex: number, columnName: string, value: any) => {
    setData(prevData => {
      const newData = [...prevData];
      if (!newData[rowIndex]) {
        newData[rowIndex] = { id: `row-${Date.now()}`, data: {} };
      }
      newData[rowIndex] = {
        ...newData[rowIndex],
        data: { ...newData[rowIndex].data, [columnName]: value }
      };
      return newData;
    });
  }, []);

  // 新しい行を追加
  const addRow = useCallback(() => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      data: {}
    };
    setData(prevData => [...prevData, newRow]);
  }, []);

  // 新しい列を追加
  const addColumn = useCallback((type: TableColumn['type'] = 'text') => {
    const newColumn: TableColumn = {
      name: `列${columns.length + 1}`,
      type,
      width: 120
    };
    setColumns(prevColumns => [...prevColumns, newColumn]);
  }, [columns.length]);

  // 行を削除
  const deleteRow = useCallback((rowIndex: number) => {
    setData(prevData => prevData.filter((_, index) => index !== rowIndex));
  }, []);

  // 列を削除
  const deleteColumn = useCallback((colIndex: number) => {
    const columnName = columns[colIndex].name;
    setColumns(prevColumns => prevColumns.filter((_, index) => index !== colIndex));
    setData(prevData => prevData.map(row => ({
      ...row,
      data: Object.fromEntries(
        Object.entries(row.data).filter(([key]) => key !== columnName)
      )
    })));
  }, [columns]);

  // 行を複製
  const duplicateRow = useCallback((rowIndex: number) => {
    const sourceRow = data[rowIndex];
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      data: { ...sourceRow.data }
    };
    setData(prevData => [
      ...prevData.slice(0, rowIndex + 1),
      newRow,
      ...prevData.slice(rowIndex + 1)
    ]);
  }, [data]);

  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (editingCell) return;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setSelectedRange({
            startRow: rowIndex - 1,
            endRow: rowIndex - 1,
            startCol: colIndex,
            endCol: colIndex
          });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < filteredData.length - 1) {
          setSelectedRange({
            startRow: rowIndex + 1,
            endRow: rowIndex + 1,
            startCol: colIndex,
            endCol: colIndex
          });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setSelectedRange({
            startRow: rowIndex,
            endRow: rowIndex,
            startCol: colIndex - 1,
            endCol: colIndex - 1
          });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < columns.length - 1) {
          setSelectedRange({
            startRow: rowIndex,
            endRow: rowIndex,
            startCol: colIndex + 1,
            endCol: colIndex + 1
          });
        }
        break;
      case 'Enter':
        e.preventDefault();
        setEditingCell({ rowIndex, colIndex });
        break;
      case 'Delete':
        e.preventDefault();
        updateCellValue(rowIndex, columns[colIndex].name, '');
        break;
    }
  }, [editingCell, filteredData.length, columns, updateCellValue]);

  // セルレンダラー
  const renderCell = useCallback((row: TableRow, column: TableColumn, rowIndex: number, colIndex: number) => {
    const value = getCellValue(row, column, rowIndex);
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;
    const isSelected = selectedRange && 
      rowIndex >= selectedRange.startRow && rowIndex <= selectedRange.endRow &&
      colIndex >= selectedRange.startCol && colIndex <= selectedRange.endCol;

    if (isEditing) {
      return (
        <Input
          ref={editInputRef}
          value={value || ''}
          onChange={(e) => updateCellValue(rowIndex, column.name, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingCell(null);
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
          className="w-full h-8 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      );
    }

    let displayValue = value;
    
    // データ型に応じた表示処理
    switch (column.type) {
      case 'checkbox':
        return (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => updateCellValue(rowIndex, column.name, e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4"
            />
          </div>
        );
      case 'multi_select':
        const tags = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        );
      case 'url':
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {value}
          </a>
        ) : null;
      case 'email':
        return value ? (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        ) : null;
      case 'currency':
        displayValue = typeof value === 'number' ? `¥${value.toLocaleString()}` : value;
        break;
      case 'number':
        displayValue = typeof value === 'number' ? value.toLocaleString() : value;
        break;
      case 'date':
        if (value) {
          displayValue = new Date(value).toLocaleDateString('ja-JP');
        }
        break;
    }

    return (
      <div
        className={`w-full h-8 px-2 py-1 text-sm flex items-center cursor-cell ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
        }`}
        onClick={() => {
          setSelectedRange({
            startRow: rowIndex,
            endRow: rowIndex,
            startCol: colIndex,
            endCol: colIndex
          });
        }}
        onDoubleClick={() => {
          if (!readOnly) {
            setEditingCell({ rowIndex, colIndex });
          }
        }}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
        tabIndex={0}
      >
        {displayValue}
      </div>
    );
  }, [getCellValue, editingCell, selectedRange, updateCellValue, readOnly, handleKeyDown]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
      {/* ツールバー */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-slate-700">
        <Button size="sm" onClick={addRow} disabled={readOnly}>
          <Plus className="w-4 h-4 mr-1" />
          行追加
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={readOnly}>
              <Plus className="w-4 h-4 mr-1" />
              列追加
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addColumn('text')}>
              <Type className="w-4 h-4 mr-2" />
              テキスト
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addColumn('number')}>
              <Hash className="w-4 h-4 mr-2" />
              数値
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addColumn('date')}>
              <Calendar className="w-4 h-4 mr-2" />
              日付
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addColumn('select')}>
              <ChevronDown className="w-4 h-4 mr-2" />
              選択
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addColumn('checkbox')}>
              <Check className="w-4 h-4 mr-2" />
              チェックボックス
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addColumn('formula')}>
              <Calculator className="w-4 h-4 mr-2" />
              数式
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedRange && (
          <>
            <Button size="sm" variant="outline" onClick={() => {
              if (selectedRange.startRow === selectedRange.endRow) {
                duplicateRow(selectedRange.startRow);
              }
            }} disabled={readOnly}>
              <Copy className="w-4 h-4 mr-1" />
              行複製
            </Button>
            
            <Button size="sm" variant="destructive" onClick={() => {
              if (selectedRange.startRow === selectedRange.endRow) {
                deleteRow(selectedRange.startRow);
              }
            }} disabled={readOnly}>
              <Trash2 className="w-4 h-4 mr-1" />
              行削除
            </Button>
          </>
        )}
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto" ref={tableRef}>
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="w-12 h-8 border border-gray-300 dark:border-slate-600 text-xs font-medium text-center">
                #
              </th>
              {columns.map((column, colIndex) => (
                <th
                  key={colIndex}
                  className="h-8 border border-gray-300 dark:border-slate-600 text-xs font-medium text-left px-2 bg-gray-50 dark:bg-slate-800 relative"
                  style={{ width: columnWidths[colIndex] || column.width || 120 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{column.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSortConfig({column: column.name, direction: 'asc'})}>
                          <SortAsc className="w-4 h-4 mr-2" />
                          昇順ソート
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({column: column.name, direction: 'desc'})}>
                          <SortDesc className="w-4 h-4 mr-2" />
                          降順ソート
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteColumn(colIndex)} disabled={readOnly}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          列削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="w-12 h-8 border border-gray-300 dark:border-slate-600 text-xs text-center bg-gray-50 dark:bg-slate-800 font-medium">
                  {rowIndex + 1}
                </td>
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="h-8 border border-gray-300 dark:border-slate-600 p-0"
                    style={{ width: columnWidths[colIndex] || column.width || 120 }}
                  >
                    {renderCell(row, column, rowIndex, colIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 空の行が少ない場合の追加行 */}
      {filteredData.length < 20 && (
        <div className="p-2 text-center">
          <Button variant="ghost" size="sm" onClick={addRow} disabled={readOnly}>
            <Plus className="w-4 h-4 mr-1" />
            行を追加
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdvancedExcelTable;