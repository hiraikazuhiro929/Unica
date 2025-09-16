import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { ProcessType } from '@/lib/firebase/processTypes';

interface ProcessTypeModalProps {
  processType: ProcessType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ProcessType, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ProcessTypeModal: React.FC<ProcessTypeModalProps> = ({
  processType,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Omit<ProcessType, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    nameJapanese: '',
    category: 'other',
    isActive: true,
    order: 1,
    hourlyRate: undefined,
    description: '',
  });

  useEffect(() => {
    if (processType) {
      setFormData({
        name: processType.name,
        nameJapanese: processType.nameJapanese,
        category: processType.category || 'other',
        isActive: processType.isActive,
        order: processType.order,
        hourlyRate: processType.hourlyRate,
        description: processType.description || '',
      });
    } else {
      setFormData({
        name: '',
        nameJapanese: '',
        category: 'other',
        isActive: true,
        order: 1,
        hourlyRate: undefined,
        description: '',
      });
    }
  }, [processType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameJapanese.trim()) {
      alert('工程名（日本語）を入力してください');
      return;
    }
    
    // 英語名が空の場合は日本語名をローマ字化（簡易的）
    if (!formData.name.trim()) {
      formData.name = formData.nameJapanese.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {processType ? '工程タイプ編集' : '工程タイプ追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label className="text-sm font-medium">工程名（日本語） *</Label>
            <Input
              type="text"
              value={formData.nameJapanese}
              onChange={(e) => setFormData({ ...formData, nameJapanese: e.target.value })}
              placeholder="例: 検査"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">工程名（英語）</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: inspection"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              空欄の場合は自動生成されます
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium">カテゴリー</Label>
            <Select
              value={formData.category}
              onValueChange={(value: ProcessType['category']) => 
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="setup">段取り</SelectItem>
                <SelectItem value="machining">加工</SelectItem>
                <SelectItem value="finishing">仕上げ</SelectItem>
                <SelectItem value="inspection">検査</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">標準時間単価（円/時間）</Label>
            <Input
              type="number"
              value={formData.hourlyRate || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                hourlyRate: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="例: 3000"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">表示順</Label>
            <Input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ 
                ...formData, 
                order: parseInt(e.target.value) || 1 
              })}
              min="1"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">説明</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="工程の説明を入力"
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">有効</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {processType ? '更新' : '追加'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};