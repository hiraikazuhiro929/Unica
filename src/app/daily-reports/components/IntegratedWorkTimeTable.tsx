"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkTimeEntry, WorkContentType } from "@/app/tasks/types";
import { ProcessType } from "@/lib/firebase/processTypes";
import TimelineWorkTable from "./TimelineWorkTable";

interface IntegratedWorkTimeTableProps {
  entries: WorkTimeEntry[];
  workContentTypes: WorkContentType[];
  processTypes: ProcessType[];
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
  processTypes,
  onEntriesChange,
  onProcessProgressUpdate,
  disabled = false
}: IntegratedWorkTimeTableProps) {
  const [workFrames, setWorkFrames] = useState<any[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<AvailableProcess[]>([]);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [localWorkContentTypes, setLocalWorkContentTypes] = useState<WorkContentType[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [newEntry, setNewEntry] = useState({
    startTime: "",
    endTime: "",
    workContentId: "",
    workContentName: "",
    processTypeId: "",
    processTypeName: "",
    durationMinutes: 0,
    machineId: "",
    machineName: "",
    operationType: '手動' as '自動' | '手動'
  });
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [newWorkContentName, setNewWorkContentName] = useState("");
  const [showNewWorkContentForm, setShowNewWorkContentForm] = useState(false);

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

  // ローカル作業内容タイプの初期化
  useEffect(() => {
    
    // カスタム作業内容のみを保持し、デフォルトデータは除外
    setLocalWorkContentTypes(prev => 
      prev.filter(wc => wc.id.startsWith('custom-'))
    );
  }, [workContentTypes]);

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

  // 新しい作業内容を追加
  const addNewWorkContent = () => {
    if (!newWorkContentName.trim()) return;
    
    const newWorkContent: WorkContentType = {
      id: `custom-${Date.now()}`,
      name: newWorkContentName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      nameJapanese: newWorkContentName,
      isActive: true,
      order: localWorkContentTypes.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setLocalWorkContentTypes(prev => [...prev, newWorkContent]);
    setNewWorkContentName('');
    setShowNewWorkContentForm(false);
    
    // 新しく作成した作業内容を自動選択
    setNewEntry(prev => ({
      ...prev,
      workContentId: newWorkContent.id,
      workContentName: newWorkContent.nameJapanese,
    }));
  };

  // カスタム作業内容を削除
  const deleteCustomWorkContent = (workContentId: string) => {
    if (!workContentId.startsWith('custom-')) return;
    
    // 使用中のエントリがあるかチェック
    const isUsed = entries.some(entry => entry.workContentId === workContentId);
    if (isUsed) {
      alert('この作業内容は使用中のため削除できません');
      return;
    }
    
    setLocalWorkContentTypes(prev => prev.filter(wc => wc.id !== workContentId));
  };

  // 作業内容が変更された時
  const handleWorkContentChange = (workContentId: string) => {
    if (workContentId === 'add-new') {
      setShowNewWorkContentForm(true);
      return;
    }

    if (workContentId === 'delete-mode') {
      // 削除できる作業内容を表示
      const customWorkContents = localWorkContentTypes.filter(wc => wc.id.startsWith('custom-'));
      if (customWorkContents.length === 0) {
        alert('削除できるカスタム作業内容がありません');
        return;
      }
      
      // 削除する作業内容を選択
      const selected = prompt(`削除する作業内容の番号を入力してください:\n${customWorkContents.map((wc, i) => `${i+1}. ${wc.nameJapanese}`).join('\n')}`);
      
      if (selected) {
        const index = parseInt(selected) - 1;
        if (index >= 0 && index < customWorkContents.length) {
          const workContentToDelete = customWorkContents[index];
          if (confirm(`「${workContentToDelete.nameJapanese}」を削除しますか？`)) {
            deleteCustomWorkContent(workContentToDelete.id);
          }
        }
      }
      return;
    }
    
    const workContent = [...localWorkContentTypes, ...workContentTypes].find(wc => wc.id === workContentId);
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
      operationType: newEntry.operationType || '手動',
    };

    onEntriesChange([...entries, entry]);
    
    // フォームリセット
    setNewEntry({
      startTime: "",
      endTime: "",
      workContentId: "",
      workContentName: "",
      processTypeId: "",
      processTypeName: "",
      durationMinutes: 0,
      machineId: "",
      machineName: "",
      operationType: '手動',
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
    if (workContentId === 'add-new') {
      setShowNewWorkContentForm(true);
      return;
    }

    if (workContentId === 'delete-mode') {
      // 削除できる作業内容を表示
      const customWorkContents = localWorkContentTypes.filter(wc => wc.id.startsWith('custom-'));
      if (customWorkContents.length === 0) {
        alert('削除できるカスタム作業内容がありません');
        return;
      }
      
      // 削除する作業内容を選択
      const options = customWorkContents.map(wc => `${wc.nameJapanese} (${wc.id})`).join('\n');
      const selected = prompt(`削除する作業内容の番号を入力してください:\n${customWorkContents.map((wc, i) => `${i+1}. ${wc.nameJapanese}`).join('\n')}`);
      
      if (selected) {
        const index = parseInt(selected) - 1;
        if (index >= 0 && index < customWorkContents.length) {
          const workContentToDelete = customWorkContents[index];
          if (confirm(`「${workContentToDelete.nameJapanese}」を削除しますか？`)) {
            deleteCustomWorkContent(workContentToDelete.id);
          }
        }
      }
      return;
    }
    
    const workContent = [...localWorkContentTypes, ...workContentTypes].find(wc => wc.id === workContentId);
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

  // アクティブな作業内容タイプ（Firebaseデータ + ローカルカスタム分）
  const activeWorkContentTypes = [
    ...(workContentTypes || []).filter(wc => wc.isActive), // Firebaseのデータ
    ...localWorkContentTypes.filter(wc => wc.isActive && wc.id.startsWith('custom-')) // カスタム追加分のみ
  ].sort((a, b) => (a.order || 0) - (b.order || 0));


  // 選択中の工程情報
  const selectedProcess = availableProcesses.find(p => p.id === selectedProcessId);

  // 作業枠モードのデータ変換
  const handleWorkFramesChange = (frames: any[]) => {
    setWorkFrames(frames);
    // 作業枠のデータを通常のエントリー形式に変換
    const allEntries = frames.flatMap(frame => frame.entries);
    onEntriesChange(allEntries);
  };

  return (
    <Card className="shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
          <Clock className="w-5 h-5 text-blue-600" />
          作業時間管理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* タイムライン形式の作業時間記録 */}
        <TimelineWorkTable
          entries={entries}
          workContentTypes={workContentTypes}
          processTypes={processTypes}
          availableProcesses={availableProcesses}
          availableMachines={availableMachines}
          onEntriesChange={onEntriesChange}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}