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
import { Plus, Trash2 } from "lucide-react";

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date';
}

interface TableCreatorProps {
  show: boolean;
  newTableName: string;
  newTableColumns: TableColumn[];
  onTableNameChange: (name: string) => void;
  onTableColumnsChange: (columns: TableColumn[]) => void;
  onClose: () => void;
  onCreateDatabase: () => void;
}

const TableCreator: React.FC<TableCreatorProps> = ({
  show,
  newTableName,
  newTableColumns,
  onTableNameChange,
  onTableColumnsChange,
  onClose,
  onCreateDatabase,
}) => {
  if (!show) return null;

  const handleColumnUpdate = (index: number, field: 'name' | 'type', value: string) => {
    const updated = [...newTableColumns];
    if (field === 'name') {
      updated[index].name = value;
    } else {
      updated[index].type = value as 'text' | 'number' | 'date';
    }
    onTableColumnsChange(updated);
  };

  const handleRemoveColumn = (index: number) => {
    const updated = newTableColumns.filter((_, i) => i !== index);
    onTableColumnsChange(updated);
  };

  const handleAddColumn = () => {
    onTableColumnsChange([...newTableColumns, { name: "", type: "text" }]);
  };

  const handleCancel = () => {
    onClose();
    onTableNameChange("");
    onTableColumnsChange([
      { name: "名前", type: "text" },
      { name: "種類", type: "text" },
      { name: "数量", type: "number" }
    ]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 max-w-md">
        <h3 className="text-lg font-semibold mb-4">新規データベース作成</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">テーブル名</label>
          <Input
            type="text"
            value={newTableName}
            onChange={(e) => onTableNameChange(e.target.value)}
            placeholder="例：在庫管理"
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">列の設定</label>
          <div className="space-y-2">
            {newTableColumns.map((column, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={column.name}
                  onChange={(e) => handleColumnUpdate(index, 'name', e.target.value)}
                  placeholder="列名"
                  className="flex-1"
                />
                <Select
                  value={column.type}
                  onValueChange={(value: 'text' | 'number' | 'date') =>
                    handleColumnUpdate(index, 'type', value)
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">テキスト</SelectItem>
                    <SelectItem value="number">数値</SelectItem>
                    <SelectItem value="date">日付</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveColumn(index)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              className="w-full"
            >
              <Plus className="w-3 h-3 mr-1" />
              列を追加
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button onClick={onCreateDatabase}>
            作成
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TableCreator;