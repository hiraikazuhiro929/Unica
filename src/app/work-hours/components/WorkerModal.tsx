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
import { X, Users, User } from "lucide-react";
import type { Worker } from "@/lib/firebase/workers";

interface WorkerModalProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
}

export const WorkerModal: React.FC<WorkerModalProps> = ({
  worker,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    hourlyRate: 3000,
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name,
        hourlyRate: worker.hourlyRate,
        skills: worker.skills || [],
      });
    } else {
      setFormData({
        name: '',
        hourlyRate: 3000,
        skills: [],
      });
    }
  }, [worker]);

  const handleSave = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md border border-gray-200 dark:border-slate-600 shadow-xl">
        <div className="p-6 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {worker ? '作業者編集' : '新規作業者登録'}
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
            <Label htmlFor="name">作業者名 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="作業者名を入力"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">時給 (円)</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
              min="0"
              step="100"
            />
          </div>


          <div className="space-y-2">
            <Label>スキル</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="スキルを入力"
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              />
              <Button
                type="button"
                onClick={addSkill}
                variant="outline"
                className="px-3"
              >
                追加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800/50"
                  onClick={() => removeSkill(skill)}
                >
                  {skill} ×
                </Badge>
              ))}
            </div>
          </div>

          {worker && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  登録情報
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                作成日: {worker.createdAt ? new Date(worker.createdAt).toLocaleDateString('ja-JP') : '不明'}
              </div>
              {worker.updatedAt && (
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  更新日: {new Date(worker.updatedAt).toLocaleDateString('ja-JP')}
                </div>
              )}
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
            disabled={isLoading || !formData.name.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
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