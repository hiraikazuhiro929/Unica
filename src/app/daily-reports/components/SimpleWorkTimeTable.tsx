"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkTimeEntry, WorkContentType } from "@/app/tasks/types";

interface SimpleWorkTimeTableProps {
  entries: WorkTimeEntry[];
  workContentTypes: WorkContentType[];
  availableProcesses: any[];
  availableMachines: any[];
  onEntriesChange: (entries: WorkTimeEntry[]) => void;
  disabled?: boolean;
}

export default function SimpleWorkTimeTable({
  entries,
  workContentTypes,
  availableProcesses,
  availableMachines,
  onEntriesChange,
  disabled = false
}: SimpleWorkTimeTableProps) {
  
  // 機械リストに「なし」を追加
  const machinesWithNone = [
    { id: 'none', name: 'なし', type: '機械なし', hourlyRate: 0 },
    ...availableMachines
  ];

  // 時間の差分を計算（分単位）
  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (end <= start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  };

  // 新しいエントリを追加
  const addEntry = () => {
    const newEntry: WorkTimeEntry = {
      id: Date.now().toString() + Math.random(),
      startTime: '',
      endTime: '',
      productionNumber: '',
      workContentId: '',
      workContentName: '',
      durationMinutes: 0,
      machineId: 'none',
      machineName: 'なし',
      processId: '',
      processName: '',
      managementNumber: '',
      operationType: '手動',
      isSyncedToProcess: false
    };
    onEntriesChange([...entries, newEntry]);
  };

  // エントリを削除
  const removeEntry = (entryId: string) => {
    onEntriesChange(entries.filter(e => e.id !== entryId));
  };

  // エントリを更新
  const updateEntry = (entryId: string, updates: Partial<WorkTimeEntry>) => {
    const updatedEntries = entries.map(entry =>
      entry.id === entryId ? { ...entry, ...updates } : entry
    );
    onEntriesChange(updatedEntries);
  };

  return (
    <Card className="shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
            作業時間記録
          </CardTitle>
          <Button
            onClick={addEntry}
            disabled={disabled}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 作業案件セクション */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">
            📋 案件作業 ({availableProcesses.length}件利用可能)
          </h4>
          
          {entries.filter(e => e.isSyncedToProcess === true).map((entry) => (
            <div key={entry.id} className="grid grid-cols-6 gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              {/* 時間 */}
              <div className="col-span-2 grid grid-cols-2 gap-1">
                <Input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => {
                    const duration = calculateDuration(e.target.value, entry.endTime);
                    updateEntry(entry.id, { startTime: e.target.value, durationMinutes: duration });
                  }}
                  disabled={disabled}
                  className="text-sm"
                />
                <Input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => {
                    const duration = calculateDuration(entry.startTime, e.target.value);
                    updateEntry(entry.id, { endTime: e.target.value, durationMinutes: duration });
                  }}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>

              {/* 案件選択 */}
              <Select
                value={entry.processId}
                onValueChange={(value) => {
                  const process = availableProcesses.find(p => p.id === value);
                  updateEntry(entry.id, {
                    processId: value,
                    processName: process?.projectName || '',
                    managementNumber: process?.managementNumber || '',
                    productionNumber: process?.managementNumber || '',
                    isSyncedToProcess: true
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="案件選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableProcesses.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                      {process.managementNumber} - {process.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 作業内容 */}
              <Select
                value={entry.workContentId}
                onValueChange={(value) => {
                  const content = workContentTypes.find(w => w.id === value);
                  updateEntry(entry.id, {
                    workContentId: value,
                    workContentName: content?.nameJapanese || ''
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="作業内容" />
                </SelectTrigger>
                <SelectContent>
                  {workContentTypes.map((content) => (
                    <SelectItem key={content.id} value={content.id}>
                      {content.nameJapanese}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 機械 */}
              <Select
                value={entry.machineId || 'none'}
                onValueChange={(value) => {
                  const machine = machinesWithNone.find(m => m.id === value);
                  updateEntry(entry.id, {
                    machineId: value,
                    machineName: machine?.name || ''
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {machinesWithNone.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 削除 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          {/* 案件作業追加ボタン */}
          <Button
            onClick={() => {
              const newEntry: WorkTimeEntry = {
                id: Date.now().toString() + Math.random(),
                startTime: '',
                endTime: '',
                productionNumber: '',
                workContentId: '',
                workContentName: '',
                durationMinutes: 0,
                machineId: 'none',
                machineName: 'なし',
                processId: '', // 初期値は空にして選択を促す
                processName: '',
                managementNumber: '',
                operationType: '手動',
                isSyncedToProcess: true // 案件作業として扱う
              };
              onEntriesChange([...entries, newEntry]);
            }}
            disabled={disabled || availableProcesses.length === 0}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            案件作業を追加
            {availableProcesses.length === 0 && ' (案件データなし)'}
          </Button>
        </div>

        {/* 一般作業セクション */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">⏰ 一般作業</h4>
          
          {entries.filter(e => e.isSyncedToProcess === false).map((entry) => (
            <div key={entry.id} className="grid grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded">
              {/* 時間 */}
              <div className="grid grid-cols-2 gap-1">
                <Input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => {
                    const duration = calculateDuration(e.target.value, entry.endTime);
                    updateEntry(entry.id, { startTime: e.target.value, durationMinutes: duration });
                  }}
                  disabled={disabled}
                  className="text-sm"
                />
                <Input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => {
                    const duration = calculateDuration(entry.startTime, e.target.value);
                    updateEntry(entry.id, { endTime: e.target.value, durationMinutes: duration });
                  }}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>

              {/* 作業内容（自由記入） */}
              <div className="col-span-2">
                <Input
                  type="text"
                  placeholder="朝礼、清掃、会議、資材整理等"
                  value={entry.workContentName}
                  onChange={(e) => {
                    updateEntry(entry.id, {
                      workContentId: 'free-input',
                      workContentName: e.target.value
                    });
                  }}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>

              {/* 削除 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          {/* 一般作業追加ボタン */}
          <Button
            onClick={() => {
              const newEntry: WorkTimeEntry = {
                id: Date.now().toString() + Math.random(),
                startTime: '',
                endTime: '',
                productionNumber: '',
                workContentId: 'free-input',
                workContentName: '',
                durationMinutes: 0,
                machineId: 'none',
                machineName: 'なし',
                processId: '',
                processName: '',
                managementNumber: '',
                operationType: '手動',
                isSyncedToProcess: false
              };
              onEntriesChange([...entries, newEntry]);
            }}
            disabled={disabled}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            一般作業を追加
          </Button>
        </div>

        {/* 合計時間表示 */}
        {entries.length > 0 && (
          <div className="pt-3 border-t border-gray-200 dark:border-slate-600">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
              合計: {Math.floor(entries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60)}時間
              {entries.reduce((sum, e) => sum + e.durationMinutes, 0) % 60}分
            </div>
          </div>
        )}

        {/* 空の状態 */}
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>作業時間が記録されていません</p>
            <p className="text-sm mt-1">上の「追加」ボタンまたは各セクションの追加ボタンをクリックしてください</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}