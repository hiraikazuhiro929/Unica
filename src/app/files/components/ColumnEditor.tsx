"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'status' | 'multi-select' | 'rating' | 'date-range' | 'file' | 'formula' | 'url';
  options?: string[];
  formula?: string;
  maxRating?: number;
}

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  tableColumns?: TableColumn[];
}

interface ColumnEditorProps {
  show: boolean;
  editingTable: FileSystemNode | null;
  newColumnName: string;
  newColumnType: string;
  newColumnFormula: string;
  newColumnMaxRating: number;
  onClose: () => void;
  onNewColumnNameChange: (name: string) => void;
  onNewColumnTypeChange: (type: any) => void;
  onNewColumnFormulaChange: (formula: string) => void;
  onNewColumnOptionsChange: (options: string[]) => void;
  onNewColumnMaxRatingChange: (rating: number) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnName: string) => void;
}

const ColumnEditor: React.FC<ColumnEditorProps> = ({
  show,
  editingTable,
  newColumnName,
  newColumnType,
  newColumnFormula,
  newColumnMaxRating,
  onClose,
  onNewColumnNameChange,
  onNewColumnTypeChange,
  onNewColumnFormulaChange,
  onNewColumnOptionsChange,
  onNewColumnMaxRatingChange,
  onAddColumn,
  onRemoveColumn,
}) => {
  if (!show || !editingTable) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-96 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">カラムを管理</h3>
          <button
            onClick={() => {
              onClose();
              onNewColumnNameChange("");
              onNewColumnTypeChange('text');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 mb-3">
            <Input
              type="text"
              value={newColumnName}
              onChange={(e) => onNewColumnNameChange(e.target.value)}
              placeholder="新しいカラム名..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newColumnName.trim()) {
                  onAddColumn();
                }
              }}
            />
            <Select
              value={newColumnType}
              onValueChange={onNewColumnTypeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">文字</SelectItem>
                <SelectItem value="number">数値</SelectItem>
                <SelectItem value="date">日付</SelectItem>
                <SelectItem value="select">選択肢</SelectItem>
                <SelectItem value="checkbox">チェックボックス</SelectItem>
                <SelectItem value="status">ステータス</SelectItem>
                <SelectItem value="formula">計算式</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="rating">評価</SelectItem>
                <SelectItem value="multi-select">複数選択</SelectItem>
                <SelectItem value="date-range">日付範囲</SelectItem>
                <SelectItem value="file">ファイル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 計算式入力（計算式タイプの場合） */}
          {newColumnType === 'formula' && (
            <div className="mb-3">
              <Input
                type="text"
                value={newColumnFormula}
                onChange={(e) => onNewColumnFormulaChange(e.target.value)}
                placeholder="例：SUM(数量), IF(価格>1000, '高額', '通常'), DATEDIFF(終了日, 開始日)"
                className="w-full text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                使用可能: SUM, AVG, COUNT, MAX, MIN, IF(条件,真,偽), TODAY(), DATEDIFF(日付1,日付2), CONCAT(文字列...), 基本演算(+,-,*,/)
              </p>
            </div>
          )}

          {/* 選択肢入力（select, status, multi-selectタイプの場合） */}
          {(newColumnType === 'select' || newColumnType === 'status' || newColumnType === 'multi-select') && (
            <div className="mb-3">
              <Input
                type="text"
                placeholder="選択肢をカンマ区切りで入力（例: 低,中,高）"
                onChange={(e) => onNewColumnOptionsChange(e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt))}
                className="w-full text-sm"
              />
            </div>
          )}

          {/* 評価の最大値設定（ratingタイプの場合） */}
          {newColumnType === 'rating' && (
            <div className="mb-3">
              <label className="text-xs text-gray-500">最大評価値</label>
              <Input
                type="number"
                value={newColumnMaxRating}
                onChange={(e) => onNewColumnMaxRatingChange(parseInt(e.target.value) || 5)}
                min="1"
                max="10"
                className="w-full text-sm"
              />
            </div>
          )}

          <Button
            onClick={onAddColumn}
            disabled={!newColumnName.trim() || (newColumnType === 'formula' && !newColumnFormula.trim())}
            className="w-full"
            variant="outline"
          >
            カラムを追加
          </Button>
        </div>

        {editingTable.tableColumns && editingTable.tableColumns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">既存のカラム</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {editingTable.tableColumns.map(column => (
                <div key={column.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                  <div>
                    <span className="font-medium">{column.name}</span>
                    <span className="text-xs ml-2 text-gray-500">
                      ({column.type === 'text' ? '文字' : column.type === 'number' ? '数値' : '日付'})
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveColumn(column.name)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnEditor;