"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { evaluateFormula, type TableRow as FormulaTableRow } from '../utils/formulaEvaluator';
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
  Edit,
  Download,
  Upload,
  Settings,
  Save,
  X,
  Search,
  Filter,
} from "lucide-react";

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'status' | 'formula' | 'url' | 'rating' | 'multi-select' | 'date-range' | 'file';
  options?: string[];
  formula?: string;
  maxRating?: number;
  width?: number;
}

interface TableRow {
  id: string;
  data: { [key: string]: any };
}

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  tableColumns?: TableColumn[];
  tableData?: TableRow[];
}

interface CustomTableEditorProps {
  editingTable: FileSystemNode | null;
  editingTableData: TableRow[];
  selectedRows: Set<string>;
  searchQuery: string;
  onSave: () => void;
  onCancel: () => void;
  onDataChange: (data: TableRow[]) => void;
  onSelectionChange: (selection: Set<string>) => void;
  onSearchChange: (query: string) => void;
}

const CustomTableEditor: React.FC<CustomTableEditorProps> = ({
  editingTable,
  editingTableData,
  selectedRows,
  searchQuery,
  onSave,
  onCancel,
  onDataChange,
  onSelectionChange,
  onSearchChange,
}) => {
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<TableColumn['type']>('text');

  if (!editingTable) return null;

  // フィルタリング・ソート関数
  const getFilteredAndSortedTableData = () => {
    if (!editingTable || !editingTable.tableColumns) return [];

    let filtered = editingTableData;

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row.data).some(value =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  };

  // カラム追加
  const addColumn = () => {
    const trimmedName = newColumnName.trim();
    if (!trimmedName || !editingTable) return;

    const existingColumns = editingTable.tableColumns || [];
    if (existingColumns.some(col => col.name === trimmedName)) {
      alert('同じ名前のカラムが既に存在します');
      return;
    }

    const newColumn: TableColumn = {
      name: trimmedName,
      type: newColumnType,
      width: 150,
    };

    // 新しいカラムをテーブルに追加
    editingTable.tableColumns = [...existingColumns, newColumn];

    // 既存の全行に新しいカラムの空の値を追加
    const updatedData = editingTableData.map(row => ({
      ...row,
      data: { ...row.data, [trimmedName]: '' }
    }));

    onDataChange(updatedData);
    setNewColumnName('');
    setNewColumnType('text');
  };

  // 行追加
  const addRow = () => {
    if (!editingTable?.tableColumns) return;

    const newRowData: { [key: string]: any } = {};
    editingTable.tableColumns.forEach(col => {
      newRowData[col.name] = col.type === 'checkbox' ? false : '';
    });

    const newRow: TableRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      data: newRowData
    };

    onDataChange([...editingTableData, newRow]);
  };

  // 行削除
  const deleteSelectedRows = () => {
    const updatedData = editingTableData.filter(row => !selectedRows.has(row.id));
    onDataChange(updatedData);
    onSelectionChange(new Set());
  };

  // セル値変更
  const updateCellValue = (rowId: string, columnName: string, value: any) => {
    const updatedData = editingTableData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          data: { ...row.data, [columnName]: value }
        };
      }
      return row;
    });
    onDataChange(updatedData);
  };

  // セル表示コンポーネント
  const renderCell = (row: TableRow, column: TableColumn) => {
    const value = row.data[column.name];

    if (column.type === 'formula') {
      const calculatedValue = evaluateFormula(column.formula || '', row.data, editingTableData);
      return (
        <div className="p-2 bg-blue-50 text-blue-800 border border-blue-200 rounded text-sm">
          {String(calculatedValue)}
        </div>
      );
    }

    if (column.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => updateCellValue(row.id, column.name, e.target.checked)}
          className="w-4 h-4"
        />
      );
    }

    if (column.type === 'select' && column.options) {
      return (
        <Select
          value={value || ''}
          onValueChange={(newValue) => updateCellValue(row.id, column.name, newValue)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {column.options.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
        value={value || ''}
        onChange={(e) => updateCellValue(row.id, column.name, e.target.value)}
        className="w-full border-0 focus:ring-1"
      />
    );
  };

  const filteredData = getFilteredAndSortedTableData();

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 p-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingTable.name}
          </h2>
          <Badge variant="secondary">
            {filteredData.length}行
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="w-4 h-4 mr-1" />
            保存
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" />
            閉じる
          </Button>
        </div>
      </div>

      {/* ツールバー */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={addRow}>
            <Plus className="w-4 h-4 mr-1" />
            行追加
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={deleteSelectedRows}
            disabled={selectedRows.size === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            削除 ({selectedRows.size})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* カラム追加フォーム */}
      <div className="mb-4 p-3 border border-gray-200 rounded bg-gray-50">
        <div className="flex items-center gap-2">
          <Input
            placeholder="カラム名"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            className="w-48"
          />
          <Select value={newColumnType} onValueChange={(value: TableColumn['type']) => setNewColumnType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">テキスト</SelectItem>
              <SelectItem value="number">数値</SelectItem>
              <SelectItem value="date">日付</SelectItem>
              <SelectItem value="checkbox">チェック</SelectItem>
              <SelectItem value="select">選択</SelectItem>
              <SelectItem value="formula">計算式</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addColumn} disabled={!newColumnName.trim()}>
            追加
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <div className="border border-gray-200 rounded overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
            <tr>
              <th className="w-12 p-2 border-r border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange(new Set(filteredData.map(r => r.id)));
                    } else {
                      onSelectionChange(new Set());
                    }
                  }}
                />
              </th>
              {editingTable.tableColumns?.map(column => (
                <th key={column.name} className="p-2 text-left border-r border-gray-200 font-medium">
                  <div className="flex items-center gap-1">
                    {column.name}
                    <Badge variant="outline" className="text-xs">
                      {column.type}
                    </Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr key={row.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                <td className="w-12 p-2 border-r border-gray-200 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={(e) => {
                      const newSelection = new Set(selectedRows);
                      if (e.target.checked) {
                        newSelection.add(row.id);
                      } else {
                        newSelection.delete(row.id);
                      }
                      onSelectionChange(newSelection);
                    }}
                  />
                </td>
                {editingTable.tableColumns?.map(column => (
                  <td key={column.name} className="p-1 border-r border-gray-200" style={{width: column.width || 150}}>
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomTableEditor;