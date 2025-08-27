"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkTimeEntry, WorkContentType } from "@/app/tasks/types";

interface IntegratedWorkTimeTableProps {
  entries: WorkTimeEntry[];
  workContentTypes: WorkContentType[];
  onEntriesChange: (entries: WorkTimeEntry[]) => void;
  onProcessProgressUpdate?: (processId: string, newProgress: number) => void;
  disabled?: boolean;
}

// 工程の型定義
interface AvailableProcess {
  id: string;
  managementNumber: string;
  projectName: string;
  orderClient: string;
  status: string;
  progress: number;
}

// 機械の型定義
interface Machine {
  id: string;
  name: string;
  type: string;
  hourlyRate?: number;
}

export default function IntegratedWorkTimeTable({ 
  entries, 
  workContentTypes, 
  onEntriesChange, 
  onProcessProgressUpdate,
  disabled = false 
}: IntegratedWorkTimeTableProps) {
  const [newEntry, setNewEntry] = useState<Partial<WorkTimeEntry>>({
    startTime: "",
    endTime: "",
    workContentId: "",
    workContentName: "",
    durationMinutes: 0,
    machineId: "",
    machineName: "",
  });
  
  const [availableProcesses, setAvailableProcesses] = useState<AvailableProcess[]>([]);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);

  // 利用可能な工程を読み込み
  useEffect(() => {
    const loadAvailableProcesses = async () => {
      setIsLoadingProcesses(true);
      try {
        const { getAvailableProcesses } = await import('@/lib/firebase/processIntegration');
        const result = await getAvailableProcesses();
        if (result.success) {
          setAvailableProcesses(result.data);
        }
      } catch (error) {
        console.error('Error loading available processes:', error);
      } finally {
        setIsLoadingProcesses(false);
      }
    };
    
    loadAvailableProcesses();
  }, []);

  // 利用可能な機械を読み込み
  useEffect(() => {
    const loadAvailableMachines = async () => {
      setIsLoadingMachines(true);
      try {
        // 機械マスタから取得（仮実装）
        const machines: Machine[] = [
          { id: 'nc-001', name: 'NC-001', type: 'NC旋盤', hourlyRate: 2000 },
          { id: 'nc-002', name: 'NC-002', type: 'NC旋盤', hourlyRate: 2000 },
          { id: 'mill-001', name: 'ミル-001', type: 'フライス盤', hourlyRate: 1800 },
          { id: 'grind-001', name: '研磨機-001', type: '研磨機', hourlyRate: 1500 },
          { id: 'drill-001', name: 'ボール盤-001', type: 'ボール盤', hourlyRate: 1200 },
        ];
        setAvailableMachines(machines);
      } catch (error) {
        console.error('Error loading available machines:', error);
      } finally {
        setIsLoadingMachines(false);
      }
    };
    
    loadAvailableMachines();
  }, []);

  // 時間の差分を計算（分単位）
  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) return 0;
    
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  };

  // 新しいエントリの時間が変更された時
  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    const updatedEntry = { ...newEntry, [field]: value };
    
    if (updatedEntry.startTime && updatedEntry.endTime) {
      updatedEntry.durationMinutes = calculateDuration(updatedEntry.startTime, updatedEntry.endTime);
    }
    
    setNewEntry(updatedEntry);
  };

  // 作業内容が変更された時
  const handleWorkContentChange = (workContentId: string) => {
    const workContent = workContentTypes.find(wc => wc.id === workContentId);
    setNewEntry(prev => ({
      ...prev,
      workContentId,
      workContentName: workContent?.nameJapanese || "",
    }));
  };

  // 機械が変更された時
  const handleMachineChange = (machineId: string) => {
    if (machineId === "none") {
      setNewEntry(prev => ({
        ...prev,
        machineId: "",
        machineName: "",
      }));
    } else {
      const machine = availableMachines.find(m => m.id === machineId);
      setNewEntry(prev => ({
        ...prev,
        machineId: machineId,
        machineName: machine?.name || "",
      }));
    }
  };

  // 工程が選択された時
  const handleProcessSelect = (processId: string) => {
    setSelectedProcessId(processId);
    const selectedProcess = availableProcesses.find(p => p.id === processId);
    if (selectedProcess) {
      // 既存の進捗を引き継ぐ
      setProcessProgress(selectedProcess.progress || 0);
    }
  };

  // 進捗が変更された時
  const handleProgressChange = (progress: number) => {
    const validProgress = Math.max(0, Math.min(100, progress));
    setProcessProgress(validProgress);
    
    if (selectedProcessId && onProcessProgressUpdate) {
      onProcessProgressUpdate(selectedProcessId, validProgress);
    }
  };

  // エントリを追加
  const addEntry = () => {
    if (!newEntry.startTime || !newEntry.endTime || !newEntry.workContentId) {
      alert("開始時間、終了時間、作業内容を入力してください");
      return;
    }

    if (newEntry.durationMinutes! <= 0) {
      alert("終了時間は開始時間より後の時間を入力してください");
      return;
    }

    const entry: WorkTimeEntry = {
      id: Date.now().toString(),
      startTime: newEntry.startTime!,
      endTime: newEntry.endTime!,
      productionNumber: selectedProcessId || "", // 工程IDを製番として使用
      workContentId: newEntry.workContentId!,
      workContentName: newEntry.workContentName!,
      durationMinutes: newEntry.durationMinutes!,
      machineId: newEntry.machineId || "",
      machineName: newEntry.machineName || "",
      processId: selectedProcessId || "",
      processName: selectedProcess?.projectName || "",
      managementNumber: selectedProcess?.managementNumber || "",
      isSyncedToProcess: !!selectedProcessId,
      syncedAt: selectedProcessId ? new Date().toISOString() : "",
    };

    onEntriesChange([...entries, entry]);
    
    // フォームリセット
    setNewEntry({
      startTime: "",
      endTime: "",
      workContentId: "",
      workContentName: "",
      durationMinutes: 0,
      machineId: "",
      machineName: "",
    });
  };

  // エントリを削除
  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter(entry => entry.id !== id));
  };

  // 既存エントリの時間を更新
  const updateEntryTime = (id: string, field: "startTime" | "endTime", value: string) => {
    const updatedEntries = entries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        if (updatedEntry.startTime && updatedEntry.endTime) {
          updatedEntry.durationMinutes = calculateDuration(updatedEntry.startTime, updatedEntry.endTime);
        }
        return updatedEntry;
      }
      return entry;
    });
    onEntriesChange(updatedEntries);
  };

  // 既存エントリの作業内容を更新
  const updateEntryWorkContent = (id: string, workContentId: string) => {
    const workContent = workContentTypes.find(wc => wc.id === workContentId);
    const updatedEntries = entries.map(entry => 
      entry.id === id 
        ? { 
            ...entry, 
            workContentId, 
            workContentName: workContent?.nameJapanese || "" 
          } 
        : entry
    );
    onEntriesChange(updatedEntries);
  };

  // 既存エントリの機械を更新
  const updateEntryMachine = (id: string, machineId: string) => {
    const updatedEntries = entries.map(entry => {
      if (entry.id === id) {
        if (machineId === "none") {
          return { 
            ...entry, 
            machineId: "",
            machineName: ""
          };
        } else {
          const machine = availableMachines.find(m => m.id === machineId);
          return { 
            ...entry, 
            machineId: machineId,
            machineName: machine?.name || ""
          };
        }
      }
      return entry;
    });
    onEntriesChange(updatedEntries);
  };

  // 時間をフォーマット（分単位で表示）
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return "0分";
    return `${minutes}分`;
  };

  // アクティブな作業内容タイプ（重複除去）
  const activeWorkContentTypes = (workContentTypes || [])
    .filter(wc => wc.isActive)
    .filter((wc, index, self) => self.findIndex(item => item.id === wc.id) === index);

  // 選択中の工程情報
  const selectedProcess = availableProcesses.find(p => p.id === selectedProcessId);

  return (
    <Card className="shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
          <Clock className="w-5 h-5 text-blue-600" />
          作業時間管理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 工程選択と進捗 */}
        <div className="p-4 bg-blue-50 dark:bg-slate-700/50 border border-blue-200 dark:border-slate-600 rounded-lg">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-gray-700 dark:text-slate-300">工程選択</Label>
              <Select 
                value={selectedProcessId} 
                onValueChange={handleProcessSelect}
                disabled={disabled || isLoadingProcesses}
              >
                <SelectTrigger className="bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-blue-400 dark:focus:border-blue-400 text-gray-900 dark:text-white">
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
              {selectedProcess && (
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  選択中: {selectedProcess.projectName}
                </div>
              )}
            </div>
            
            {selectedProcessId && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                  <BarChart3 className="w-4 h-4" />
                  進捗
                </Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={processProgress.toString()}
                    onValueChange={(value) => handleProgressChange(Number(value))}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-20 bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-blue-400 dark:focus:border-blue-400 text-gray-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {Array.from({ length: 21 }, (_, i) => i * 5).map((progress) => (
                        <SelectItem key={progress} value={progress.toString()}>
                          {progress}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-2.5 w-40">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, processProgress))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 既存エントリ一覧 */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800 dark:text-white">作業実績</h3>
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 sm:p-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  {/* 開始時間 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">開始時間</Label>
                    <Input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) => updateEntryTime(entry.id, "startTime", e.target.value)}
                      disabled={disabled}
                      className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-blue-400 dark:focus:border-blue-400 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  {/* 終了時間 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">終了時間</Label>
                    <Input
                      type="time"
                      value={entry.endTime}
                      onChange={(e) => updateEntryTime(entry.id, "endTime", e.target.value)}
                      disabled={disabled}
                      className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-blue-400 dark:focus:border-blue-400 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  {/* 作業内容 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">作業内容</Label>
                    <Select
                      value={entry.workContentId}
                      onValueChange={(value) => updateEntryWorkContent(entry.id, value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWorkContentTypes.map((workContent) => (
                          <SelectItem key={workContent.id} value={workContent.id}>
                            {workContent.nameJapanese}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 使用機械 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">使用機械</Label>
                    <Select
                      value={entry.machineId || "none"}
                      onValueChange={(value) => updateEntryMachine(entry.id, value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 text-gray-900 dark:text-white">
                        <SelectValue placeholder="未選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {availableMachines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            <div className="flex flex-col">
                              <span>{machine.name}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">{machine.type}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 時間表示 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">時間</Label>
                    <div className="h-9 flex items-center px-3 bg-gray-50 dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-md text-sm text-gray-700 dark:text-slate-300">
                      {formatDuration(entry.durationMinutes)}
                    </div>
                  </div>
                  
                  {/* 削除ボタン */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-transparent">削除</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      disabled={disabled}
                      className="h-9 w-full sm:w-9 px-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden ml-2">削除</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 新規エントリ追加フォーム */}
        <div className="bg-blue-50 dark:bg-slate-700/50 border border-blue-200 dark:border-slate-600 rounded-lg p-3 sm:p-4">
          <h3 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新しい作業時間を追加
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            {/* 開始時間 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">開始時間</Label>
              <Input
                type="time"
                value={newEntry.startTime}
                onChange={(e) => handleTimeChange("startTime", e.target.value)}
                disabled={disabled}
                className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* 終了時間 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">終了時間</Label>
              <Input
                type="time"
                value={newEntry.endTime}
                onChange={(e) => handleTimeChange("endTime", e.target.value)}
                disabled={disabled}
                className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* 作業内容 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">作業内容</Label>
              <Select
                value={newEntry.workContentId}
                onValueChange={handleWorkContentChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 text-gray-900 dark:text-white">
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {activeWorkContentTypes.map((workContent) => (
                    <SelectItem key={workContent.id} value={workContent.id}>
                      {workContent.nameJapanese}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 使用機械 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">使用機械</Label>
              <Select
                value={newEntry.machineId || "none"}
                onValueChange={handleMachineChange}
                disabled={disabled || isLoadingMachines}
              >
                <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 text-gray-900 dark:text-white">
                  <SelectValue placeholder="未選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未選択</SelectItem>
                  {availableMachines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      <div className="flex flex-col">
                        <span>{machine.name}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">{machine.type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 時間表示 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600 dark:text-slate-400">時間</Label>
              <div className="h-9 flex items-center px-3 bg-gray-50 dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-md text-sm text-gray-700 dark:text-slate-300">
                {newEntry.durationMinutes! > 0 ? formatDuration(newEntry.durationMinutes!) : "0分"}
              </div>
            </div>
            
            {/* 追加ボタン */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-transparent">追加</Label>
              <Button
                onClick={addEntry}
                disabled={disabled || !newEntry.startTime || !newEntry.endTime || !newEntry.workContentId || newEntry.durationMinutes! <= 0}
                className="h-9 w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border-0"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">追加</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 合計表示 */}
        {entries.length > 0 && (
          <div className="bg-blue-50/50 dark:bg-slate-700/30 border border-blue-200 dark:border-slate-600 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">合計作業時間</div>
            <div className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {formatDuration(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0))}
            </div>
          </div>
        )}

        {/* 工程未選択時のメッセージ */}
        {!selectedProcessId && (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>工程を選択して作業実績を入力してください</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}