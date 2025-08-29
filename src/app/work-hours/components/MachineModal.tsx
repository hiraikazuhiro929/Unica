import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Wrench } from "lucide-react";
import type { Machine } from "@/lib/firebase/machines";

interface MachineModalProps {
  machine: Machine | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
}

export const MachineModal: React.FC<MachineModalProps> = ({
  machine,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    hourlyRate: 5000,
  });

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name,
        type: machine.type,
        hourlyRate: machine.hourlyRate,
      });
    } else {
      setFormData({
        name: '',
        type: '',
        hourlyRate: 5000,
      });
    }
  }, [machine]);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.type.trim()) return;
    onSave(formData);
  };


  const machineTypes = [
    'マシニングセンタ',
    'NC旋盤',
    'フライス盤',
    '研削盤',
    'ボール盤',
    '溶接機',
    'プレス機',
    'レーザーカッター',
    '3Dプリンター',
    'その他'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md border border-gray-200 dark:border-slate-600 shadow-xl">
        <div className="p-6 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {machine ? '機械編集' : '新規機械登録'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">機械名 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: CNC-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">機械タイプ *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="機械タイプを選択" />
              </SelectTrigger>
              <SelectContent>
                {machineTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">時間コスト (円/時)</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
              min="0"
              step="500"
            />
          </div>


          {machine && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  登録情報
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-slate-400">
                <div>
                  <div>作成日</div>
                  <div>{machine.createdAt ? new Date(machine.createdAt).toLocaleDateString('ja-JP') : '不明'}</div>
                </div>
                <div>
                  <div>更新日</div>
                  <div>{machine.updatedAt ? new Date(machine.updatedAt).toLocaleDateString('ja-JP') : '不明'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-slate-600 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !formData.name.trim() || !formData.type.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                保存中...
              </span>
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};