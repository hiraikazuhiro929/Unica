import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Copy,
  Filter,
  SortAsc,
  SortDesc,
  Star,
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
} from "lucide-react";

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'status' | 'formula' | 'url' | 'rating' | 'multi_select' | 'date_range' | 'file' | 'email' | 'phone';
  options?: string[];
  formula?: string;
  maxRating?: number;
  width?: number;
}

interface TableRow {
  id: string;
  data: { [key: string]: any };
}

interface EnhancedNotionTableProps {
  initialColumns?: TableColumn[];
  initialData?: TableRow[];
  onDataChange?: (columns: TableColumn[], data: TableRow[]) => void;
}

const EnhancedNotionTable: React.FC<EnhancedNotionTableProps> = ({
  initialColumns = [
    { name: 'タイトル', type: 'text' },
    { name: 'ステータス', type: 'select', options: ['未着手', '進行中', '完了', 'レビュー'] },
    { name: '優先度', type: 'rating', maxRating: 5 },
    { name: 'タグ', type: 'multi_select', options: ['重要', '急ぎ', 'レビュー', 'バグ', '機能'] },
    { name: '期日', type: 'date' },
    { name: 'URL', type: 'url' },
    { name: 'メール', type: 'email' },
    { name: '完了', type: 'checkbox' }
  ],
  initialData = [],
  onDataChange
}) => {
  // State
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [data, setData] = useState<TableRow[]>(() => {
    if (initialData.length > 0) return initialData;
    // サンプルデータ
    return [
      {
        id: 'row-1',
        data: {
          'タイトル': 'NotionライクなUI改善',
          'ステータス': '進行中',
          '優先度': 4,
          'タグ': ['重要', '機能'],
          '期日': '2024-12-31',
          'URL': 'https://github.com/example',
          'メール': 'test@example.com',
          '完了': false
        }
      },
      {
        id: 'row-2',
        data: {
          'タイトル': 'Excel機能の追加',
          'ステータス': '完了',
          '優先度': 5,
          'タグ': ['重要'],
          '期日': '2024-11-30',
          'URL': '',
          'メール': 'dev@example.com',
          '完了': true
        }
      }
    ];
  });

  const [editingCell, setEditingCell] = useState<{rowId: string, columnName: string} | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [sortBy, setSortBy] = useState<{column: string, order: 'asc' | 'desc'} | null>(null);
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<TableColumn['type']>('text');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, rowId?: string, columnName?: string} | null>(null);

  // Excel-like keyboard navigation
  const [selectedCell, setSelectedCell] = useState<{rowId: string, columnName: string} | null>(null);

  // フィルタリングされたデータ
  const filteredData = data.filter(row => {
    return Object.entries(columnFilters).every(([column, filter]) => {
      if (!filter) return true;
      const value = String(row.data[column] || '').toLowerCase();
      return value.includes(filter.toLowerCase());
    });
  });

  // ソートされたデータ
  const sortedData = sortBy 
    ? [...filteredData].sort((a, b) => {
        const aVal = a.data[sortBy.column] || '';
        const bVal = b.data[sortBy.column] || '';
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortBy.order === 'asc' ? comparison : -comparison;
      })
    : filteredData;

  // セル値の更新
  const updateCellValue = useCallback((rowId: string, columnName: string, value: any) => {
    setData(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, data: { ...row.data, [columnName]: value } }
        : row
    ));
  }, []);

  // Excel風のキーボードナビゲーション
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    const currentRowIndex = sortedData.findIndex(row => row.id === selectedCell.rowId);
    const currentColumnIndex = columns.findIndex(col => col.name === selectedCell.columnName);

    let newRowIndex = currentRowIndex;
    let newColumnIndex = currentColumnIndex;

    switch (e.key) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, currentRowIndex - 1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(sortedData.length - 1, currentRowIndex + 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        newColumnIndex = Math.max(0, currentColumnIndex - 1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        newColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1);
        e.preventDefault();
        break;
      case 'Enter':
        setEditingCell({ rowId: selectedCell.rowId, columnName: selectedCell.columnName });
        e.preventDefault();
        break;
      case 'Delete':
      case 'Backspace':
        updateCellValue(selectedCell.rowId, selectedCell.columnName, '');
        e.preventDefault();
        break;
      case 'Escape':
        setEditingCell(null);
        e.preventDefault();
        break;
    }

    if (newRowIndex !== currentRowIndex || newColumnIndex !== currentColumnIndex) {
      if (sortedData[newRowIndex] && columns[newColumnIndex]) {
        setSelectedCell({
          rowId: sortedData[newRowIndex].id,
          columnName: columns[newColumnIndex].name
        });
      }
    }
  };

  // セルレンダリング
  const renderCell = (row: TableRow, column: TableColumn) => {
    const value = row.data[column.name];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnName === column.name;
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.columnName === column.name;

    if (isEditing) {
      // 編集モード
      switch (column.type) {
        case 'select':
        case 'status':
          return (
            <Select
              value={value || ''}
              onValueChange={(newValue) => {
                updateCellValue(row.id, column.name, newValue);
                setEditingCell(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'checkbox':
          return (
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => {
                updateCellValue(row.id, column.name, e.target.checked);
                setEditingCell(null);
              }}
              className="w-4 h-4"
              autoFocus
            />
          );

        case 'rating':
          const maxRating = column.maxRating || 5;
          return (
            <div className="flex items-center gap-1">
              {Array.from({ length: maxRating }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 cursor-pointer ${
                    i < (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                  onClick={() => {
                    updateCellValue(row.id, column.name, i + 1);
                    setEditingCell(null);
                  }}
                />
              ))}
            </div>
          );

        default:
          return (
            <Input
              type={column.type === 'number' ? 'number' : 
                   column.type === 'date' ? 'date' :
                   column.type === 'email' ? 'email' :
                   column.type === 'url' ? 'url' : 'text'}
              value={value || ''}
              onChange={(e) => updateCellValue(row.id, column.name, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingCell(null);
                  e.preventDefault();
                }
              }}
              className="w-full"
              autoFocus
            />
          );
      }
    }

    // 表示モード
    const cellContent = (() => {
      switch (column.type) {
        case 'checkbox':
          return (
            <div className={`flex items-center justify-center w-5 h-5 rounded border-2 ${
              value ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
            }`}>
              {value && <Check className="h-3 w-3" />}
            </div>
          );

        case 'rating':
          const maxRating = column.maxRating || 5;
          return (
            <div className="flex items-center gap-1">
              {Array.from({ length: maxRating }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          );

        case 'multi_select':
          if (Array.isArray(value)) {
            return (
              <div className="flex flex-wrap gap-1">
                {value.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            );
          }
          break;

        case 'url':
          return value ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
              <Link className="h-3 w-3" />
              {String(value).length > 30 ? `${String(value).substring(0, 30)}...` : value}
            </a>
          ) : null;

        case 'email':
          return value ? (
            <a href={`mailto:${value}`} className="text-blue-600 hover:underline flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {value}
            </a>
          ) : null;

        case 'phone':
          return value ? (
            <a href={`tel:${value}`} className="text-blue-600 hover:underline flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {value}
            </a>
          ) : null;

        case 'date':
          return value ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {value}
            </div>
          ) : null;

        default:
          return value || '';
      }
    })();

    return (
      <div 
        className={`min-h-[32px] px-3 py-2 cursor-cell ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => setSelectedCell({ rowId: row.id, columnName: column.name })}
        onDoubleClick={() => setEditingCell({ rowId: row.id, columnName: column.name })}
      >
        {cellContent}
      </div>
    );
  };

  // 行追加
  const addRow = () => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      data: {}
    };
    setData([...data, newRow]);
  };

  // 行削除
  const deleteSelectedRows = () => {
    setData(data.filter(row => !selectedRows.has(row.id)));
    setSelectedRows(new Set());
  };

  // 列追加
  const addColumn = () => {
    if (!newColumnName.trim()) return;
    
    const newColumn: TableColumn = {
      name: newColumnName.trim(),
      type: newColumnType,
      ...(newColumnType === 'select' || newColumnType === 'multi_select' 
          ? { options: ['オプション1', 'オプション2', 'オプション3'] }
          : {}),
      ...(newColumnType === 'rating' ? { maxRating: 5 } : {})
    };
    
    setColumns([...columns, newColumn]);
    setNewColumnName('');
    setShowColumnEditor(false);
  };

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* ツールバー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            新しい行
          </Button>
          {selectedRows.size > 0 && (
            <Button size="sm" variant="destructive" onClick={deleteSelectedRows}>
              <Trash2 className="h-4 w-4 mr-1" />
              選択した行を削除 ({selectedRows.size})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowColumnEditor(true)}>
            <Plus className="h-4 w-4 mr-1" />
            列を追加
          </Button>
          <span className="text-sm text-gray-500">
            {sortedData.length}行
          </span>
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="w-12 p-3">
                <input
                  type="checkbox"
                  checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(sortedData.map(row => row.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column.name}
                  className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group"
                  onClick={() => {
                    setSortBy(prev => ({
                      column: column.name,
                      order: prev?.column === column.name && prev.order === 'asc' ? 'desc' : 'asc'
                    }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {sortBy?.column === column.name && (
                        sortBy.order === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const filterValue = prompt(`${column.name}でフィルター:`);
                          if (filterValue !== null) {
                            setColumnFilters({...columnFilters, [column.name]: filterValue});
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="フィルター"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 ${
                  selectedRows.has(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <td className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedRows);
                      if (e.target.checked) {
                        newSelected.add(row.id);
                      } else {
                        newSelected.delete(row.id);
                      }
                      setSelectedRows(newSelected);
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                {columns.map((column) => (
                  <td key={column.name} className="border-gray-100 dark:border-gray-800">
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 列追加モーダル */}
      {showColumnEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">新しい列を追加</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">列名</label>
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="列名を入力"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">データ型</label>
                <Select value={newColumnType} onValueChange={(value: any) => setNewColumnType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">テキスト</SelectItem>
                    <SelectItem value="number">数値</SelectItem>
                    <SelectItem value="date">日付</SelectItem>
                    <SelectItem value="select">選択</SelectItem>
                    <SelectItem value="multi_select">複数選択</SelectItem>
                    <SelectItem value="checkbox">チェックボックス</SelectItem>
                    <SelectItem value="rating">評価</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="email">メール</SelectItem>
                    <SelectItem value="phone">電話番号</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={addColumn} disabled={!newColumnName.trim()}>
                  追加
                </Button>
                <Button variant="outline" onClick={() => setShowColumnEditor(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedNotionTable;