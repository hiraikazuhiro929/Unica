"use client";
import React from 'react';
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
  Search,
  Database,
  Plus,
  Copy,
  Trash2,
  Filter,
  SortAsc,
  SortDesc,
  Star,
} from "lucide-react";
import { evaluateFormula } from '../utils/formulaEvaluator';

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'status' | 'multi-select' | 'rating' | 'date-range' | 'file' | 'formula' | 'url';
  options?: string[];
  formula?: string;
  maxRating?: number;
}

interface TableRow {
  id: string;
  data: { [key: string]: any };
}

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  parentId: string | null;
  path: string;
  children?: FileSystemNode[];
  tableColumns?: TableColumn[];
  tableData?: TableRow[];
  modifiedDate?: string;
}

interface CustomTableProps {
  editingTable: FileSystemNode | null;
  editingTableData: TableRow[];
  tableFilter: string;
  selectedRows: Set<string>;
  columnWidths: { [key: string]: number };
  tableSortBy: string | null;
  tableSortOrder: 'asc' | 'desc';
  columnFilters: { [key: string]: string };
  editingCell: { rowId: string; columnName: string } | null;
  isResizing: { columnName: string; startX: number; startWidth: number } | null;
  onClose: () => void;
  onTableFilterChange: (filter: string) => void;
  onSelectedRowsChange: (rows: Set<string>) => void;
  onColumnContextMenu: (data: { x: number; y: number; columnName: string }) => void;
  onSortChange: (column: string, order: 'asc' | 'desc') => void;
  onColumnFiltersChange: (filters: { [key: string]: string }) => void;
  onEditingCellChange: (cell: { rowId: string; columnName: string } | null) => void;
  onContextMenu: (data: { x: number; y: number; nodeId: string; type: string }) => void;
  onCellContextMenu: (data: { x: number; y: number; rowId: string; columnName: string }) => void;
  onResizeStart: (columnName: string) => void;
  onShowColumnEditor: () => void;
  addNewRow: () => void;
  duplicateRow: (rowId: string) => void;
  deleteRow: (rowId: string) => void;
  updateRowData: (rowId: string, columnName: string, value: any) => void;
  saveTableData: () => void;
  getFilteredAndSortedTableData: () => TableRow[];
}

const CustomTable: React.FC<CustomTableProps> = ({
  editingTable,
  editingTableData,
  tableFilter,
  selectedRows,
  columnWidths,
  tableSortBy,
  tableSortOrder,
  columnFilters,
  editingCell,
  isResizing,
  onClose,
  onTableFilterChange,
  onSelectedRowsChange,
  onColumnContextMenu,
  onSortChange,
  onColumnFiltersChange,
  onEditingCellChange,
  onContextMenu,
  onCellContextMenu,
  onResizeStart,
  onShowColumnEditor,
  addNewRow,
  duplicateRow,
  deleteRow,
  updateRowData,
  saveTableData,
  getFilteredAndSortedTableData,
}) => {
  if (!editingTable || !editingTable.tableColumns) return null;

  const filteredData = getFilteredAndSortedTableData();

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
      {/* ヘッダー - シンプルに */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{editingTable.name}</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              {filteredData.length} レコード
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </Button>
        </div>

        {/* 検索バー - データがある時だけ表示 */}
        {editingTableData.length > 5 && (
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="検索... (Ctrl+F)"
              value={tableFilter}
              onChange={(e) => onTableFilterChange(e.target.value)}
              className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onTableFilterChange('');
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
        )}
      </div>

      {/* バルクアクションバー */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {selectedRows.size}行を選択中
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedRows.forEach(rowId => duplicateRow(rowId));
                onSelectedRowsChange(new Set());
              }}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              <Copy className="w-4 h-4 inline mr-1" />
              複製
            </button>
            <button
              onClick={() => {
                if (confirm(`${selectedRows.size}行を削除してもよろしいですか？`)) {
                  const newData = editingTableData.filter(row => !selectedRows.has(row.id));
                  // This needs to be handled by parent component
                  onSelectedRowsChange(new Set());
                  saveTableData();
                }
              }}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              削除
            </button>
            <button
              onClick={() => onSelectedRowsChange(new Set())}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              選択解除
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {editingTableData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Database className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">データがありません</h3>
            <p className="text-sm mb-6">新しい行を追加してデータベースを開始しましょう</p>
            <Button
              onClick={addNewRow}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              最初の行を追加
            </Button>
          </div>
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-600">
              <th className="w-8 py-3">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectedRowsChange(new Set(filteredData.map(r => r.id)));
                    } else {
                      onSelectedRowsChange(new Set());
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              {editingTable.tableColumns.map(column => (
                <th
                  key={column.name}
                  className="text-left py-3 pr-6 relative group"
                  style={{width: columnWidths[column.name] || 'auto'}}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onColumnContextMenu({x: e.clientX, y: e.clientY, columnName: column.name});
                  }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      onClick={() => {
                        if (tableSortBy === column.name) {
                          onSortChange(column.name, tableSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          onSortChange(column.name, 'asc');
                        }
                      }}
                    >
                      {column.name}
                      {tableSortBy === column.name && (
                        tableSortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          const filterValue = prompt(`${column.name}でフィルター:`);
                          if (filterValue !== null) {
                            onColumnFiltersChange({...columnFilters, [column.name]: filterValue});
                          }
                        }}
                        title="フィルター"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {/* カラムリサイズハンドル */}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onResizeStart(column.name);
                    }}
                  />
                </th>
              ))}
              <th className="text-left py-3 w-12">
                <button
                  className="text-gray-400 hover:text-gray-600 text-sm"
                  onClick={onShowColumnEditor}
                  title="カラムを追加"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(row => (
              <tr
                key={row.id}
                className={`group border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                  selectedRows.has(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    nodeId: row.id,
                    type: 'file'
                  });
                }}>
                <td className="w-8 py-3">
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
                      onSelectedRowsChange(newSelected);
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                {editingTable.tableColumns!.map(column => (
                  <td
                    key={column.name}
                    className="py-3 pr-6"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onCellContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        rowId: row.id,
                        columnName: column.name
                      });
                    }}>
                    {editingCell?.rowId === row.id && editingCell?.columnName === column.name ? (
                      // 編集モード
                      column.type === 'select' || column.type === 'status' ? (
                        <Select
                          value={row.data[column.name] || ''}
                          onValueChange={(value) => {
                            updateRowData(row.id, column.name, value);
                            onEditingCellChange(null);
                            saveTableData();
                          }}
                        >
                          <SelectTrigger className="border-none p-0 h-auto bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {column.options?.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : column.type === 'multi-select' ? (
                        <div className="flex flex-wrap gap-1">
                          {column.options?.map(option => (
                            <button
                              key={option}
                              onClick={() => {
                                const current = row.data[column.name] || [];
                                const updated = current.includes(option)
                                  ? current.filter((t: string) => t !== option)
                                  : [...current, option];
                                updateRowData(row.id, column.name, updated);
                                saveTableData();
                              }}
                              className={`px-2 py-1 text-xs rounded border ${
                                (row.data[column.name] || []).includes(option)
                                  ? 'bg-blue-100 border-blue-300'
                                  : 'bg-gray-50 border-gray-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : column.type === 'date-range' ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={row.data[column.name]?.start || ''}
                            onChange={(e) => {
                              updateRowData(row.id, column.name, {
                                ...row.data[column.name],
                                start: e.target.value
                              });
                            }}
                            className="border-b px-1 py-1 text-sm"
                          />
                          <span>〜</span>
                          <input
                            type="date"
                            value={row.data[column.name]?.end || ''}
                            onChange={(e) => {
                              updateRowData(row.id, column.name, {
                                ...row.data[column.name],
                                end: e.target.value
                              });
                            }}
                            onBlur={() => {
                              onEditingCellChange(null);
                              saveTableData();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                onEditingCellChange(null);
                                saveTableData();
                              } else if (e.key === 'Escape') {
                                onEditingCellChange(null);
                              }
                            }}
                            className="border-b px-1 py-1 text-sm"
                          />
                        </div>
                      ) : column.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(row.data[column.name])}
                          onChange={(e) => {
                            updateRowData(row.id, column.name, e.target.checked);
                            onEditingCellChange(null);
                            saveTableData();
                          }}
                          className="w-4 h-4"
                        />
                      ) : (
                        <Input
                          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                          value={row.data[column.name] || ''}
                          onChange={(e) => {
                            const value = column.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                            updateRowData(row.id, column.name, value);
                          }}
                          onBlur={() => {
                            onEditingCellChange(null);
                            saveTableData();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              onEditingCellChange(null);
                              saveTableData();
                            } else if (e.key === 'Escape') {
                              onEditingCellChange(null);
                            }
                          }}
                          className="border-none p-0 focus:ring-0 focus:border-none bg-transparent"
                          autoFocus
                        />
                      )
                    ) : (
                      // 表示モード
                      <div
                        className="min-h-[20px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                        onClick={() => onEditingCellChange({rowId: row.id, columnName: column.name})}
                      >
                        {column.type === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(row.data[column.name])}
                            onChange={(e) => {
                              updateRowData(row.id, column.name, e.target.checked);
                              saveTableData();
                            }}
                            className="w-4 h-4 pointer-events-auto"
                          />
                        ) : column.type === 'status' ? (
                          <Badge
                            variant={row.data[column.name] === '完了' ? 'default' :
                                   row.data[column.name] === '進行中' ? 'secondary' : 'outline'}
                            className={
                              row.data[column.name] === '完了' ? 'bg-green-100 text-green-800 border-green-300' :
                              row.data[column.name] === '進行中' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              row.data[column.name] === '保留' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }
                          >
                            {row.data[column.name] || '未設定'}
                          </Badge>
                        ) : column.type === 'formula' ? (
                          <span className="font-mono text-blue-600">
                            {column.formula ? evaluateFormula(column.formula, row.data, editingTableData) : '数式未設定'}
                          </span>
                        ) : column.type === 'url' ? (
                          row.data[column.name] ? (
                            <a
                              href={row.data[column.name]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {row.data[column.name].length > 30
                                ? `${row.data[column.name].substring(0, 30)}...`
                                : row.data[column.name]
                              }
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">URL未設定</span>
                          )
                        ) : column.type === 'rating' ? (
                          <div className="flex gap-0.5">
                            {Array.from({length: column.maxRating || 5}, (_, i) => (
                              <button
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRowData(row.id, column.name, i + 1);
                                  saveTableData();
                                }}
                                className="text-lg hover:scale-110 transition-transform"
                              >
                                {(row.data[column.name] || 0) > i ?
                                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" /> :
                                  <Star className="w-5 h-5 text-gray-300" />
                                }
                              </button>
                            ))}
                          </div>
                        ) : column.type === 'multi-select' ? (
                          <div className="flex flex-wrap gap-1">
                            {(row.data[column.name] || []).map((tag: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : column.type === 'date-range' ? (
                          <span className="text-sm">
                            {row.data[column.name]?.start || ''}
                            {row.data[column.name]?.start && row.data[column.name]?.end && ' 〜 '}
                            {row.data[column.name]?.end || ''}
                          </span>
                        ) : column.type === 'file' ? (
                          <span className="text-sm text-gray-500">
                            {row.data[column.name] ? '📎 ファイル' : '未添付'}
                          </span>
                        ) : (
                          row.data[column.name] || (
                            <span className="text-gray-400 italic">空白</span>
                          )
                        )}
                      </div>
                    )}
                  </td>
                ))}
                <td className="py-3 w-12">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}

            {/* 新規行追加（Notionスタイル） */}
            <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
              <td className="w-8 py-3"></td>
              {editingTable.tableColumns!.map(column => (
                <td key={column.name} className="py-3 pr-6">
                  <div
                    className="min-h-[20px] cursor-pointer text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
                    onClick={addNewRow}
                  >
                    {column === editingTable.tableColumns![0] ? '新しい行を追加...' : ''}
                  </div>
                </td>
              ))}
              <td className="py-3 w-12"></td>
            </tr>
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default CustomTable;