"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, Wrench, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkTimeEntry, WorkContentType } from "@/app/tasks/types";

interface TimelineWorkTableProps {
  entries: WorkTimeEntry[];
  workContentTypes: WorkContentType[];
  availableProcesses: any[];
  availableMachines: any[];
  onEntriesChange: (entries: WorkTimeEntry[]) => void;
  disabled?: boolean;
}

export default function TimelineWorkTable({
  entries,
  workContentTypes,
  availableProcesses,
  availableMachines,
  onEntriesChange,
  disabled = false
}: TimelineWorkTableProps) {
  
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

  // 工程でグループ化し、その中で開始時間でソートされたエントリ
  const sortedEntries = [...entries].sort((a, b) => {
    // 工程作業と一般作業を分離
    if (a.isSyncedToProcess !== b.isSyncedToProcess) {
      return a.isSyncedToProcess ? -1 : 1; // 工程作業を先に表示
    }
    
    // 工程作業の場合は工程IDでグループ化
    if (a.isSyncedToProcess && b.isSyncedToProcess) {
      if (a.processId !== b.processId) {
        return (a.processId || '').localeCompare(b.processId || '');
      }
    }
    
    // 同じグループ内では開始時間でソート
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  // 工程作業を追加
  const addProjectEntry = () => {
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
      isSyncedToProcess: true,
      progress: 0
    };
    onEntriesChange([...entries, newEntry]);
  };

  // 同じ工程に作業を追加
  const addWorkToSameProcess = (processId: string) => {
    const existingProcess = entries.find(e => e.processId === processId && e.isSyncedToProcess);
    if (!existingProcess) return;

    const newEntry: WorkTimeEntry = {
      id: Date.now().toString() + Math.random(),
      startTime: '',
      endTime: '',
      productionNumber: existingProcess.productionNumber,
      workContentId: '',
      workContentName: '',
      durationMinutes: 0,
      machineId: 'none',
      machineName: 'なし',
      processId: existingProcess.processId,
      processName: existingProcess.processName,
      managementNumber: existingProcess.managementNumber,
      operationType: '手動',
      isSyncedToProcess: true,
      progress: 0
    };
    onEntriesChange([...entries, newEntry]);
  };

  // 一般作業を追加
  const addGeneralEntry = () => {
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
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
            <Clock className="w-5 h-5 text-blue-600" />
            作業時間記録
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={addProjectEntry}
              disabled={disabled || availableProcesses.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              工程追加
            </Button>
            <Button
              onClick={addGeneralEntry}
              disabled={disabled}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              一般追加
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 工程選択が未完了のエントリを先に表示 */}
        {sortedEntries
          .filter(e => e.isSyncedToProcess && !e.processId)
          .map((entry, index) => (
            <Card key={entry.id} className="border-2 border-orange-200 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/20">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚧</span>
                    <div>
                      <CardTitle className="text-base text-orange-800">新規工程作業</CardTitle>
                      <p className="text-sm text-orange-600 mt-1">工程を選択してください</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(entry.id)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-md border border-orange-200 dark:border-orange-600">
                  <div className="grid grid-cols-12 gap-3">
                    {/* 工程選択 */}
                    <div className="col-span-6">
                      <Select
                        value={entry.processId || ''}
                        onValueChange={(value) => {
                          const process = availableProcesses.find(p => p.id === value);
                          updateEntry(entry.id, {
                            processId: value,
                            processName: process?.projectName || '',
                            managementNumber: process?.managementNumber || '',
                            productionNumber: process?.managementNumber || ''
                          });
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="工程を選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProcesses.map((process) => (
                            <SelectItem key={process.id} value={process.id}>
                              {process.managementNumber} - {process.projectName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 flex items-center text-sm text-gray-500">
                      工程を選択すると詳細設定が表示されます
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* 案件ごとにグループ化 */}
        {Object.entries(
          sortedEntries
            .filter(e => e.isSyncedToProcess && e.processId)
            .reduce((groups, entry) => {
              const key = entry.processId!;
              if (!groups[key]) groups[key] = [];
              groups[key].push(entry);
              return groups;
            }, {} as Record<string, WorkTimeEntry[]>)
        ).map(([processId, processEntries]) => (
          <Card key={processId} className="border-2 border-gray-200 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/30">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔧</span>
                  <div>
                    <CardTitle className="text-base text-gray-800 dark:text-gray-200">
                      {processEntries[0].managementNumber} - {processEntries[0].processName}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">工程 • {processEntries.length}件の作業</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* 案件全体の進捗スライダー */}
                  <div className="flex items-center gap-2 min-w-32">
                    <span className="text-xs text-gray-700 dark:text-gray-300">進捗:</span>
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={Math.round(processEntries.reduce((sum, entry) => sum + (entry.progress || 0), 0) / processEntries.length) || 0}
                        onChange={(e) => {
                          const progress = parseInt(e.target.value);
                          // 該当工程の全作業の進捗を同じ値に更新
                          processEntries.forEach(entry => {
                            updateEntry(entry.id, { progress });
                          });
                        }}
                        disabled={disabled}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${Math.round(processEntries.reduce((sum, entry) => sum + (entry.progress || 0), 0) / processEntries.length) || 0}%, #e5e7eb ${Math.round(processEntries.reduce((sum, entry) => sum + (entry.progress || 0), 0) / processEntries.length) || 0}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 min-w-8">
                      {Math.round(processEntries.reduce((sum, entry) => sum + (entry.progress || 0), 0) / processEntries.length) || 0}%
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addWorkToSameProcess(processId)}
                    disabled={disabled}
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    作業追加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {processEntries.map((entry, entryIndex) => (
                <div key={entry.id} className="p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-gray-600">
                  {/* ヘッダー部分 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      工程 #{String(entryIndex + 1).padStart(2, '0')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 入力フィールド */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* 時間入力 */}
                    <div className="col-span-3 grid grid-cols-2 gap-1">
                      <Input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => {
                          const duration = calculateDuration(e.target.value, entry.endTime);
                          updateEntry(entry.id, { startTime: e.target.value, durationMinutes: duration });
                        }}
                        disabled={disabled}
                        className="text-sm"
                        placeholder="開始"
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
                        placeholder="終了"
                      />
                    </div>

                    {/* 作業内容 */}
                    <div className="col-span-3">
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
                    </div>

                    {/* 機械選択 */}
                    <div className="col-span-4">
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
                          <SelectValue placeholder="機械選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {machinesWithNone.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 自動/手動トグル */}
                    <div className="col-span-2">
                      <Button
                        variant={entry.operationType === '自動' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const newType = entry.operationType === '自動' ? '手動' : '自動';
                          updateEntry(entry.id, { operationType: newType });
                        }}
                        disabled={disabled}
                        className={`w-full text-xs ${
                          entry.operationType === '自動' 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {entry.operationType === '自動' ? (
                          <>
                            <Cpu className="w-3 h-3 mr-1" />
                            自動
                          </>
                        ) : (
                          <>
                            <Wrench className="w-3 h-3 mr-1" />
                            手動
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 時間表示 */}
                  {entry.durationMinutes > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
                      所要時間: {Math.floor(entry.durationMinutes / 60)}時間{entry.durationMinutes % 60}分
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* 一般作業（個別表示） */}
        {sortedEntries
          .filter(e => !e.isSyncedToProcess)
          .map((entry, entryIndex) => (
            <div key={entry.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/30">
              {/* ヘッダー部分 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    #{String(entryIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium">⏰ 一般</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEntry(entry.id)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 入力フィールド */}
              <div className="grid grid-cols-12 gap-3">
                {/* 時間入力 */}
                <div className="col-span-3 grid grid-cols-2 gap-1">
                  <Input
                    type="time"
                    value={entry.startTime}
                    onChange={(e) => {
                      const duration = calculateDuration(e.target.value, entry.endTime);
                      updateEntry(entry.id, { startTime: e.target.value, durationMinutes: duration });
                    }}
                    disabled={disabled}
                    className="text-sm"
                    placeholder="開始"
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
                    placeholder="終了"
                  />
                </div>

                {/* 作業内容入力 */}
                <div className="col-span-9">
                  <Input
                    type="text"
                    placeholder="朝礼、清掃、会議、資材整理、移動等"
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
              </div>

              {/* 時間表示 */}
              {entry.durationMinutes > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
                  所要時間: {Math.floor(entry.durationMinutes / 60)}時間{entry.durationMinutes % 60}分
                </div>
              )}
            </div>
          ))}

        {/* 合計時間表示 */}
        {entries.length > 0 && (
          <div className="pt-3 border-t border-gray-200 dark:border-slate-600">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                工程: {entries.filter(e => e.isSyncedToProcess).length}件 / 
                一般: {entries.filter(e => !e.isSyncedToProcess).length}件
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                合計: {Math.floor(entries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60)}時間
                {entries.reduce((sum, e) => sum + e.durationMinutes, 0) % 60}分
              </span>
            </div>
          </div>
        )}

        {/* 空の状態 */}
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>作業時間が記録されていません</p>
            <p className="text-sm mt-1">「工程追加」または「一般追加」をクリックして記録を開始してください</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}