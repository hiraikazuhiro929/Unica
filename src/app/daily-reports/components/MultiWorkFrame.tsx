"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Copy, Wrench, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkTimeEntry, WorkContentType } from "@/app/tasks/types";
import { Badge } from "@/components/ui/badge";

interface WorkFrame {
  id: string;
  processId: string;
  processName: string;
  managementNumber: string;
  entries: WorkTimeEntry[];
}

interface MultiWorkFrameProps {
  workFrames: WorkFrame[];
  workContentTypes: WorkContentType[];
  availableProcesses: any[];
  availableMachines: any[];
  onFramesChange: (frames: WorkFrame[]) => void;
  disabled?: boolean;
}

export default function MultiWorkFrame({
  workFrames,
  workContentTypes,
  availableProcesses,
  availableMachines,
  onFramesChange,
  disabled = false
}: MultiWorkFrameProps) {
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());

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

  // 新しい作業枠を追加（最初から1行の入力状態）
  const addWorkFrame = () => {
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

    const newFrame: WorkFrame = {
      id: Date.now().toString(),
      processId: '',
      processName: '',
      managementNumber: '',
      entries: [newEntry] // 最初から1行追加
    };
    onFramesChange([...workFrames, newFrame]);
    setExpandedFrames(new Set([...expandedFrames, newFrame.id]));
  };

  // 作業枠を削除
  const removeWorkFrame = (frameId: string) => {
    onFramesChange(workFrames.filter(f => f.id !== frameId));
  };

  // 作業枠を複製
  const duplicateWorkFrame = (frame: WorkFrame) => {
    const newFrame: WorkFrame = {
      ...frame,
      id: Date.now().toString(),
      entries: frame.entries.map(e => ({ ...e, id: Date.now().toString() + Math.random() }))
    };
    onFramesChange([...workFrames, newFrame]);
  };

  // 作業枠の工程を変更
  const updateFrameProcess = (frameId: string, processId: string) => {
    let processName = '';
    let managementNumber = '';
    
    if (processId === 'general-work') {
      processName = '一般作業';
      managementNumber = 'GENERAL';
    } else if (processId === 'free-work') {
      processName = '自由記入作業';
      managementNumber = 'FREE';
    } else {
      const process = availableProcesses.find(p => p.id === processId);
      processName = process?.projectName || '';
      managementNumber = process?.managementNumber || '';
    }
    
    const updatedFrames = workFrames.map(frame => 
      frame.id === frameId 
        ? { 
            ...frame, 
            processId, 
            processName,
            managementNumber,
            // エントリーの工程情報も更新
            entries: frame.entries.map(entry => ({
              ...entry,
              processId,
              processName,
              managementNumber,
              productionNumber: managementNumber
            }))
          }
        : frame
    );
    onFramesChange(updatedFrames);
  };

  // エントリーを追加
  const addEntry = (frameId: string) => {
    const frame = workFrames.find(f => f.id === frameId);
    if (!frame) return;

    const newEntry: WorkTimeEntry = {
      id: Date.now().toString() + Math.random(),
      startTime: '',
      endTime: '',
      productionNumber: frame.managementNumber,
      workContentId: '',
      workContentName: '',
      durationMinutes: 0,
      machineId: 'none',
      machineName: 'なし',
      processId: frame.processId,
      processName: frame.processName,
      managementNumber: frame.managementNumber,
      operationType: '手動', // デフォルトは手動
      isSyncedToProcess: false
    };

    const updatedFrames = workFrames.map(f =>
      f.id === frameId
        ? { ...f, entries: [...f.entries, newEntry] }
        : f
    );
    onFramesChange(updatedFrames);
  };

  // エントリーを削除
  const removeEntry = (frameId: string, entryId: string) => {
    const updatedFrames = workFrames.map(frame =>
      frame.id === frameId
        ? { ...frame, entries: frame.entries.filter(e => e.id !== entryId) }
        : frame
    );
    onFramesChange(updatedFrames);
  };

  // エントリーを更新
  const updateEntry = (frameId: string, entryId: string, updates: Partial<WorkTimeEntry>) => {
    const updatedFrames = workFrames.map(frame =>
      frame.id === frameId
        ? {
            ...frame,
            entries: frame.entries.map(entry =>
              entry.id === entryId
                ? { ...entry, ...updates }
                : entry
            )
          }
        : frame
    );
    onFramesChange(updatedFrames);
  };

  // 自動/手動の切り替え
  const toggleOperationType = (frameId: string, entryId: string) => {
    const frame = workFrames.find(f => f.id === frameId);
    const entry = frame?.entries.find(e => e.id === entryId);
    if (!entry) return;

    const newType = (entry.operationType === '自動' ? '手動' : '自動') as '手動' | '自動';
    updateEntry(frameId, entryId, { operationType: newType });
  };

  // 時間の重複をチェック
  const checkTimeOverlap = (): { frameId: string; times: string }[] => {
    const overlaps: { frameId: string; times: string }[] = [];
    const allEntries = workFrames.flatMap(f => f.entries.map(e => ({ ...e, frameId: f.id })));
    
    for (let i = 0; i < allEntries.length; i++) {
      for (let j = i + 1; j < allEntries.length; j++) {
        const e1 = allEntries[i];
        const e2 = allEntries[j];
        
        if (e1.startTime && e1.endTime && e2.startTime && e2.endTime) {
          const start1 = e1.startTime;
          const end1 = e1.endTime;
          const start2 = e2.startTime;
          const end2 = e2.endTime;
          
          if ((start1 < end2 && end1 > start2)) {
            overlaps.push({
              frameId: e1.frameId,
              times: `${start1}-${end1} と ${start2}-${end2}`
            });
          }
        }
      }
    }
    
    return overlaps;
  };

  const overlaps = checkTimeOverlap();

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          作業枠管理
        </h3>
        <Button
          onClick={addWorkFrame}
          disabled={disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          新しい作業枠を追加
        </Button>
      </div>

      {/* 時間重複の警告 */}
      {overlaps.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ 作業時間が重複しています（多台持ち作業として記録されます）
          </p>
        </div>
      )}

      {/* 作業枠一覧 */}
      {workFrames.map((frame, index) => (
        <Card key={frame.id} className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                作業枠 #{index + 1}
                {frame.processName && (
                  <Badge variant="outline">{frame.managementNumber}</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateWorkFrame(frame)}
                  disabled={disabled}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWorkFrame(frame.id)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 工程選択 */}
            <div>
              <Label className="text-sm">案件選択</Label>
              <Select
                value={frame.processId}
                onValueChange={(value) => updateFrameProcess(frame.id, value)}
                disabled={disabled}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="案件を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free-work">📝 自由記入作業（朝礼・清掃・雑務等）</SelectItem>
                  <SelectItem value="general-work">一般作業（朝礼・会議・引き継ぎ等）</SelectItem>
                  {availableProcesses.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                      {process.managementNumber} - {process.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 作業エントリー */}
            {(
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">作業時間</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addEntry(frame.id)}
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    追加
                  </Button>
                </div>

                {frame.entries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-6 gap-2 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded">
                    {/* 時間 */}
                    <div className="col-span-2 grid grid-cols-2 gap-1">
                      <Input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => {
                          const duration = calculateDuration(e.target.value, entry.endTime);
                          updateEntry(frame.id, entry.id, {
                            startTime: e.target.value,
                            durationMinutes: duration
                          });
                        }}
                        disabled={disabled}
                        className="text-sm bg-white dark:bg-slate-800"
                      />
                      <Input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => {
                          const duration = calculateDuration(entry.startTime, e.target.value);
                          updateEntry(frame.id, entry.id, {
                            endTime: e.target.value,
                            durationMinutes: duration
                          });
                        }}
                        disabled={disabled}
                        className="text-sm bg-white dark:bg-slate-800"
                      />
                    </div>

                    {/* 作業内容 */}
                    {frame.processId === 'free-work' ? (
                      <Input
                        type="text"
                        placeholder="朝礼、清掃、会議等"
                        value={entry.workContentName}
                        onChange={(e) => {
                          updateEntry(frame.id, entry.id, {
                            workContentId: 'free-input',
                            workContentName: e.target.value
                          });
                        }}
                        disabled={disabled}
                        className="text-sm bg-white dark:bg-slate-800"
                      />
                    ) : (
                      <Select
                        value={entry.workContentId}
                        onValueChange={(value) => {
                          const content = workContentTypes.find(w => w.id === value);
                          updateEntry(frame.id, entry.id, {
                            workContentId: value,
                            workContentName: content?.nameJapanese || ''
                          });
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger className="text-sm bg-white dark:bg-slate-800">
                          <SelectValue placeholder="作業" />
                        </SelectTrigger>
                        <SelectContent>
                          {workContentTypes.map((content) => (
                            <SelectItem key={content.id} value={content.id}>
                              {content.nameJapanese}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* 機械 */}
                    <Select
                      value={entry.machineId || 'none'}
                      onValueChange={(value) => {
                        const machine = machinesWithNone.find(m => m.id === value);
                        updateEntry(frame.id, entry.id, {
                          machineId: value,
                          machineName: machine?.name || ''
                        });
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger className="text-sm bg-white dark:bg-slate-800">
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

                    {/* 自動/手動トグル */}
                    <Button
                      variant={entry.operationType === '自動' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleOperationType(frame.id, entry.id)}
                      disabled={disabled}
                      className={`${
                        entry.operationType === '自動' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : ''
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

                    {/* 削除 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(frame.id, entry.id)}
                      disabled={disabled}
                      className="text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {/* 合計時間表示 */}
                {frame.entries.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
                    合計: {Math.floor(frame.entries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60)}時間
                    {frame.entries.reduce((sum, e) => sum + e.durationMinutes, 0) % 60}分
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* 空の状態 */}
      {workFrames.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>作業枠がありません</p>
          <p className="text-sm mt-1">「新しい作業枠を追加」をクリックして開始してください</p>
        </div>
      )}
    </div>
  );
}