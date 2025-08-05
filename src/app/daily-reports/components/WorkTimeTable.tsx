"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkTimeEntry, WorkContentType } from "@/app/tasks/types";

interface WorkTimeTableProps {
  entries: WorkTimeEntry[];
  workContentTypes: WorkContentType[];
  onEntriesChange: (entries: WorkTimeEntry[]) => void;
  onProcessProgressUpdate?: (processId: string, newProgress: number) => void;
  disabled?: boolean;
}

// 利用可能な工程の型定義
interface AvailableProcess {
  id: string;
  managementNumber: string;
  projectName: string;
  orderClient: string;
  status: string;
  progress: number;
}

export default function WorkTimeTable({ entries, workContentTypes, onEntriesChange, onProcessProgressUpdate }: WorkTimeTableProps) {
  const [newEntry, setNewEntry] = useState<Partial<WorkTimeEntry>>({
    startTime: "",
    endTime: "",
    productionNumber: "",
    workContentId: "",
    workContentName: "",
    durationMinutes: 0,
    isSyncedToProcess: false,
  });
  
  const [availableProcesses, setAvailableProcesses] = useState<AvailableProcess[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [showProcessSuggestions, setShowProcessSuggestions] = useState(false);
  const [linkedProcesses, setLinkedProcesses] = useState<{[entryId: string]: AvailableProcess}>({});
  const [progressUpdates, setProgressUpdates] = useState<{[processId: string]: number}>({});
  
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

  // 時間の差分を計算（分単位）
  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) return 0;
    
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  };

  // 工程進捗を更新
  const updateProcessProgress = async (processId: string, newProgress: number) => {
    setProgressUpdates(prev => ({
      ...prev,
      [processId]: newProgress
    }));

    if (onProcessProgressUpdate) {
      onProcessProgressUpdate(processId, newProgress);
    }

    // Firebase の工程データも更新
    try {
      const { updateProcess } = await import('@/lib/firebase/processes');
      await updateProcess(processId, { progress: newProgress });
    } catch (error) {
      console.error('工程進捗の更新に失敗しました:', error);
    }
  };

  // 作業時間から進捗を自動計算
  const calculateProgressFromWorkTime = (process: AvailableProcess, workMinutes: number): number => {
    // 標準作業時間に基づく計算（実際は工程の予定工数を使用）
    const standardWorkMinutes = 8 * 60; // 480分を基準
    const calculatedProgress = Math.min(100, Math.round((workMinutes / standardWorkMinutes) * 100));
    return Math.max(process.progress, calculatedProgress); // 既存進捗より下がらないようにする
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
    const workContent = (workContentTypes || []).find(wc => wc.id === workContentId);
    setNewEntry(prev => ({
      ...prev,
      workContentId,
      workContentName: workContent?.nameJapanese || "",
    }));
  };

  // 製番から工程を検索
  const searchProcessByProductionNumber = (productionNumber: string) => {
    return availableProcesses.filter(process => 
      process.managementNumber.toLowerCase().includes(productionNumber.toLowerCase()) ||
      process.projectName.toLowerCase().includes(productionNumber.toLowerCase())
    );
  };

  // 製番入力時の処理
  const handleProductionNumberChange = (value: string) => {
    setNewEntry(prev => ({ ...prev, productionNumber: value }));
    
    if (value.length > 1) {
      const matches = searchProcessByProductionNumber(value);
      setShowProcessSuggestions(matches.length > 0);
    } else {
      setShowProcessSuggestions(false);
    }
  };

  // 工程を選択
  const selectProcess = (process: AvailableProcess) => {
    setNewEntry(prev => ({
      ...prev,
      productionNumber: process.managementNumber,
      processId: process.id,
      processName: process.projectName,
      managementNumber: process.managementNumber,
    }));
    setShowProcessSuggestions(false);
  };

  // エントリを追加（工程連携機能付き）
  const addEntry = async () => {
    if (!newEntry.startTime || !newEntry.endTime || !newEntry.productionNumber || !newEntry.workContentId) {
      alert("すべての項目を入力してください");
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
      productionNumber: newEntry.productionNumber!,
      workContentId: newEntry.workContentId!,
      workContentName: newEntry.workContentName!,
      durationMinutes: newEntry.durationMinutes!,
      processId: newEntry.processId,
      processName: newEntry.processName,
      managementNumber: newEntry.managementNumber,
      isSyncedToProcess: false,
    };

    // 工程との自動連携を試行
    try {
      const { autoLinkWorkTimeToProcess } = await import('@/lib/firebase/processIntegration');
      const linkResult = await autoLinkWorkTimeToProcess(entry);
      
      if (linkResult.success) {
        // 連携成功した場合、更新されたエントリを使用
        onEntriesChange([...entries, linkResult.workTimeEntry]);
        alert(`工程「${linkResult.process.projectName}」と自動連携されました！`);
      } else {
        // 連携失敗した場合、通常のエントリとして追加
        onEntriesChange([...entries, entry]);
        console.warn('Process linking failed:', linkResult.error);
      }
    } catch (error) {
      // エラーの場合、通常のエントリとして追加
      onEntriesChange([...entries, entry]);
      console.error('Error linking to process:', error);
    }
    
    // フォームリセット
    setNewEntry({
      startTime: "",
      endTime: "",
      productionNumber: "",
      workContentId: "",
      workContentName: "",
      durationMinutes: 0,
      isSyncedToProcess: false,
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

  // 既存エントリの製番を更新
  const updateEntryProductionNumber = (id: string, value: string) => {
    const updatedEntries = entries.map(entry => 
      entry.id === id ? { ...entry, productionNumber: value } : entry
    );
    onEntriesChange(updatedEntries);
  };

  // 既存エントリの作業内容を更新
  const updateEntryWorkContent = (id: string, workContentId: string) => {
    const workContent = (workContentTypes || []).find(wc => wc.id === workContentId);
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

  // 時間をフォーマット
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return "0分";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}分`;
    if (mins === 0) return `${hours}時間`;
    return `${hours}時間${mins}分`;
  };

  // アクティブな作業内容タイプ（デフォルト値でundefinedエラー回避）
  const activeWorkContentTypes = (workContentTypes || []).filter(wc => wc.isActive);

  return (
    <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Clock className="w-5 h-5 text-indigo-600" />
          作業時間
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 既存エントリ一覧 */}
        {entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="bg-white/50 border border-gray-200 rounded-lg p-3 sm:p-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  {/* 開始時間 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">開始時間</Label>
                    <Input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) => updateEntryTime(entry.id, "startTime", e.target.value)}
                      className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400"
                    />
                  </div>
                  
                  {/* 終了時間 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">終了時間</Label>
                    <Input
                      type="time"
                      value={entry.endTime}
                      onChange={(e) => updateEntryTime(entry.id, "endTime", e.target.value)}
                      className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400"
                    />
                  </div>
                  
                  {/* 製番 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      製番
                      {entry.isSyncedToProcess && (
                        <Link className="w-3 h-3 text-green-500" title="工程と連携済み" />
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        value={entry.productionNumber}
                        onChange={(e) => updateEntryProductionNumber(entry.id, e.target.value)}
                        placeholder="製番"
                        className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400"
                      />
                      {entry.isSyncedToProcess && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    {entry.processName && (
                      <div className="text-xs text-gray-500">
                        連携先: {entry.processName}
                      </div>
                    )}
                  </div>
                  
                  {/* 作業内容 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">作業内容</Label>
                    <Select
                      value={entry.workContentId}
                      onValueChange={(value) => updateEntryWorkContent(entry.id, value)}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400">
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
                  
                  {/* 時間表示 */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">時間</Label>
                    <div className="h-9 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
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
                      className="h-9 w-full sm:w-9 px-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden ml-2">削除</span>
                    </Button>
                  </div>
                </div>

                {/* 工程進捗操作（工程と連携している場合のみ表示） */}
                {entry.isSyncedToProcess && entry.processId && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">工程進捗操作</span>
                      </div>
                      <div className="text-xs text-green-600">
                        連携中: {entry.processName}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {/* 現在の進捗表示 */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">現在の進捗:</span>
                        <span className="font-medium text-gray-800">
                          {progressUpdates[entry.processId] ?? 
                           linkedProcesses[entry.id]?.progress ?? 0}%
                        </span>
                      </div>
                      
                      {/* 進捗バー */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${progressUpdates[entry.processId] ?? 
                                      linkedProcesses[entry.id]?.progress ?? 0}%` 
                          }}
                        />
                      </div>
                      
                      {/* 進捗操作ボタン */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentProgress = progressUpdates[entry.processId] ?? 
                                                  linkedProcesses[entry.id]?.progress ?? 0;
                            const newProgress = Math.min(100, currentProgress + 10);
                            updateProcessProgress(entry.processId, newProgress);
                          }}
                          className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <ArrowUp className="w-3 h-3 mr-1" />
                          +10%
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentProgress = progressUpdates[entry.processId] ?? 
                                                  linkedProcesses[entry.id]?.progress ?? 0;
                            const newProgress = Math.max(0, currentProgress - 10);
                            updateProcessProgress(entry.processId, newProgress);
                          }}
                          className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <ArrowDown className="w-3 h-3 mr-1" />
                          -10%
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const linkedProcess = linkedProcesses[entry.id];
                            if (linkedProcess) {
                              const autoProgress = calculateProgressFromWorkTime(linkedProcess, entry.durationMinutes);
                              updateProcessProgress(entry.processId, autoProgress);
                            }
                          }}
                          className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Calculator className="w-3 h-3 mr-1" />
                          自動計算
                        </Button>
                      </div>
                      
                      {/* 進捗入力 */}
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="進捗%"
                          className="h-7 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt((e.target as HTMLInputElement).value);
                              if (!isNaN(value) && value >= 0 && value <= 100) {
                                updateProcessProgress(entry.processId, value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <span className="text-xs text-gray-600">Enter で更新</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 新規エントリ追加フォーム */}
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新しい作業時間を追加
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            {/* 開始時間 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">開始時間</Label>
              <Input
                type="time"
                value={newEntry.startTime}
                onChange={(e) => handleTimeChange("startTime", e.target.value)}
                className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400"
              />
            </div>
            
            {/* 終了時間 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">終了時間</Label>
              <Input
                type="time"
                value={newEntry.endTime}
                onChange={(e) => handleTimeChange("endTime", e.target.value)}
                className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400"
              />
            </div>
            
            {/* 製番 */}
            <div className="space-y-1 relative">
              <Label className="text-xs font-medium text-gray-600">製番</Label>
              <div className="relative">
                <Input
                  value={newEntry.productionNumber}
                  onChange={(e) => handleProductionNumberChange(e.target.value)}
                  placeholder="製番を入力（工程から検索）"
                  className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400"
                />
                {newEntry.processId && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              
              {/* 工程サジェスト */}
              {showProcessSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-32 overflow-y-auto">
                  {searchProcessByProductionNumber(newEntry.productionNumber || '').map((process) => (
                    <div
                      key={process.id}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                      onClick={() => selectProcess(process)}
                    >
                      <div className="font-medium text-gray-900">{process.managementNumber}</div>
                      <div className="text-xs text-gray-600">{process.projectName}</div>
                      <div className="text-xs text-gray-500">{process.orderClient}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 作業内容 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">作業内容</Label>
              <Select
                value={newEntry.workContentId}
                onValueChange={handleWorkContentChange}
              >
                <SelectTrigger className="h-9 text-sm bg-white border-gray-200 focus:border-indigo-400">
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
            
            {/* 時間表示 */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">時間</Label>
              <div className="h-9 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                {newEntry.durationMinutes! > 0 ? formatDuration(newEntry.durationMinutes!) : "0分"}
              </div>
            </div>
            
            {/* 追加ボタン */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-transparent">追加</Label>
              <Button
                onClick={addEntry}
                className="h-9 w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white border-0 shadow-sm"
                disabled={!newEntry.startTime || !newEntry.endTime || !newEntry.productionNumber || !newEntry.workContentId || newEntry.durationMinutes! <= 0}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">追加</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 合計表示 */}
        {entries.length > 0 && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 mb-1">合計作業時間</div>
            <div className="text-lg font-semibold text-blue-700">
              {formatDuration(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}