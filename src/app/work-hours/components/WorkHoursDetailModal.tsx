import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { 
  X, 
  Clock, 
  DollarSign, 
  Users, 
  Wrench, 
  FileText, 
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle
} from "lucide-react";
import type { EnhancedWorkHours } from '@/app/tasks/types';
import type { Worker } from '@/lib/firebase/workers';
import type { Machine } from '@/lib/firebase/machines';
import { ProcessType, getProcessTypes } from '@/lib/firebase/processTypes';
import { calculateTotalCharge } from "@/lib/utils/chargeCalculation";

interface WorkHoursDetailModalProps {
  workHours: EnhancedWorkHours | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EnhancedWorkHours>) => void;
  workers: Worker[];
  machines: Machine[];
}

export const WorkHoursDetailModal: React.FC<WorkHoursDetailModalProps> = ({
  workHours,
  isOpen,
  onClose,
  onSave,
  workers,
  machines,
}) => {
  const [formData, setFormData] = useState<Partial<EnhancedWorkHours>>({
    projectName: '',
    client: '',
    managementNumber: '',
    status: '計画中',
    priority: '中',
    plannedHours: {
      setup: 0,
      machining: 0,
      finishing: 0,
      total: 0
    },
    actualHours: {
      setup: 0,
      machining: 0,
      finishing: 0,
      total: 0
    },
    budget: {
      estimatedAmount: 0,
      setupRate: 1500 + (machines.find(m => m.type === '段取り台')?.hourlyRate || 500),
      machiningRate: 1500 + (machines.find(m => m.type === '加工機')?.hourlyRate || 2500),
      finishingRate: 1500 + (machines.find(m => m.type === '研磨機')?.hourlyRate || 800),
      totalPlannedCost: 0,
      totalActualCost: 0
    },
    plannedContent: '',
    tags: []
  });

  const [customPlannedSteps, setCustomPlannedSteps] = useState<Array<{
    id: string;
    name: string;
    hours: number;
    workerCharge: number;
    machineId: string;
    machineCharge: number;
    totalRate: number;
  }>>([]);

  const [customActualSteps, setCustomActualSteps] = useState<Array<{
    id: string;
    name: string;
    hours: number;
    workerCharge: number;
    machineId: string;
    machineCharge: number;
    totalRate: number;
  }>>([]);

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const baseWorkerCharge = 1500; // 基本作業者チャージ
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  
  // 工程マスタを取得
  useEffect(() => {
    const loadProcessTypes = async () => {
      const { data, error } = await getProcessTypes();
      if (!error && data) {
        setProcessTypes(data.filter(pt => pt.isActive));
      }
    };
    loadProcessTypes();
  }, []);
  
  // 工程テンプレートをprocessTypesから生成
  const processTemplates = processTypes.length > 0 
    ? processTypes.map(pt => pt.nameJapanese)
    : ['検査', '梱包', '組立', '溶接', '塗装', '乾燥', '調整', '品質チェック', '清掃', '運搬', 'その他'];

  // 時間入力をパースする関数
  const parseTimeInput = (input: string): number => {
    if (!input.trim()) return 0;
    
    // 数値のみの場合（2.5など）
    const numericValue = parseFloat(input);
    if (!isNaN(numericValue)) return numericValue;
    
    // 時間分形式のパース（2時間30分、2:30、2h30m など）
    const patterns = [
      /(\d+)時間(\d+)分/,  // 2時間30分
      /(\d+)時間/,         // 2時間
      /(\d+):(\d+)/,       // 2:30
      /(\d+)h(\d+)m/,      // 2h30m
      /(\d+)h/,            // 2h
      /(\d+)分/            // 30分
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        if (pattern === /(\d+)時間(\d+)分/ || pattern === /(\d+):(\d+)/ || pattern === /(\d+)h(\d+)m/) {
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          return hours + minutes / 60;
        } else if (pattern === /(\d+)時間/ || pattern === /(\d+)h/) {
          return parseInt(match[1]) || 0;
        } else if (pattern === /(\d+)分/) {
          return (parseInt(match[1]) || 0) / 60;
        }
      }
    }
    
    return 0;
  };

  const toggleStepExpansion = (stepName: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepName)) {
      newExpanded.delete(stepName);
    } else {
      newExpanded.add(stepName);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepDifference = (planned: number, actual: number) => {
    const diff = actual - planned;
    const percentage = planned > 0 ? ((actual / planned) * 100).toFixed(1) : '0';
    return { diff, percentage };
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (diff < 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <MinusCircle className="w-4 h-4 text-gray-400" />;
  };

  const efficiency = formData.plannedHours?.total && formData.actualHours?.total 
    ? (formData.plannedHours.total / formData.actualHours.total) * 100 
    : 0;

  const costDiff = (formData.budget?.totalActualCost || 0) - (formData.budget?.totalPlannedCost || 0);

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 100) return <TrendingUp className="w-4 h-4 text-green-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  useEffect(() => {
    if (workHours) {
      setFormData(workHours);
    } else {
      setFormData({
        projectName: '',
        client: '',
        managementNumber: '',
        status: '計画中',
        priority: '中',
        plannedHours: {
          setup: 0,
          machining: 0,
          finishing: 0,
          total: 0
        },
        actualHours: {
          setup: 0,
          machining: 0,
          finishing: 0,
          total: 0
        },
        budget: {
          estimatedAmount: 0,
          setupRate: 1500 + (machines.find(m => m.type === '段取り台')?.hourlyRate || 500),
          machiningRate: 1500 + (machines.find(m => m.type === '加工機')?.hourlyRate || 2500),
          finishingRate: 1500 + (machines.find(m => m.type === '研磨機')?.hourlyRate || 800),
          totalPlannedCost: 0,
          totalActualCost: 0
        },
        plannedContent: '',
        tags: []
      });
    }
  }, [workHours]);

  if (!isOpen) return null;

  const addCustomPlannedStep = () => {
    const newStep = {
      id: `custom-${Date.now()}`,
      name: '',
      hours: 0,
      workerCharge: baseWorkerCharge,
      machineId: '',
      machineCharge: 0,
      totalRate: baseWorkerCharge
    };
    setCustomPlannedSteps([...customPlannedSteps, newStep]);
  };

  const updateCustomPlannedStep = (id: string, field: string, value: any) => {
    setCustomPlannedSteps(customPlannedSteps.map(step => {
      if (step.id === id) {
        const updatedStep = { ...step, [field]: value };
        if (field === 'machineId') {
          const machine = value ? machines.find(m => m.id === value) : null;
          updatedStep.machineCharge = machine?.hourlyRate || 0;
          updatedStep.totalRate = updatedStep.workerCharge + updatedStep.machineCharge;
        }
        return updatedStep;
      }
      return step;
    }));
  };

  const removeCustomPlannedStep = (id: string) => {
    setCustomPlannedSteps(customPlannedSteps.filter(step => step.id !== id));
  };

  const handleSave = () => {
    // 基本工程の合計時間とコストを計算
    const basicPlannedTotal = (formData.plannedHours?.setup || 0) + 
                             (formData.plannedHours?.machining || 0) + 
                             (formData.plannedHours?.finishing || 0);
    
    // カスタム工程の合計時間とコストを計算
    const customPlannedTotal = customPlannedSteps.reduce((sum, step) => sum + step.hours, 0);
    const customPlannedCost = customPlannedSteps.reduce((sum, step) => sum + (step.hours * step.totalRate), 0);
    
    const plannedTotal = basicPlannedTotal + customPlannedTotal;
    
    const actualTotal = (formData.actualHours?.setup || 0) + 
                       (formData.actualHours?.machining || 0) + 
                       (formData.actualHours?.finishing || 0);

    const basicPlannedCost = (formData.plannedHours?.setup || 0) * (formData.budget?.setupRate || 0) +
                            (formData.plannedHours?.machining || 0) * (formData.budget?.machiningRate || 0) +
                            (formData.plannedHours?.finishing || 0) * (formData.budget?.finishingRate || 0);

    const totalPlannedCost = basicPlannedCost + customPlannedCost;

    const totalActualCost = (formData.actualHours?.setup || 0) * (formData.budget?.setupRate || 0) +
                           (formData.actualHours?.machining || 0) * (formData.budget?.machiningRate || 0) +
                           (formData.actualHours?.finishing || 0) * (formData.budget?.finishingRate || 0);

    const updatedFormData = {
      ...formData,
      plannedHours: {
        ...formData.plannedHours,
        total: plannedTotal
      },
      actualHours: {
        ...formData.actualHours,
        total: actualTotal
      },
      budget: {
        ...formData.budget,
        totalPlannedCost,
        totalActualCost
      },
      customPlannedSteps: customPlannedSteps
    };

    onSave(updatedFormData);
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-600 shadow-xl">
        {/* ヘッダー - 固定 */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {workHours ? '工数編集' : '工数新規作成'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* コンテンツ - スクロール可能 */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <TabsTrigger value="overview" className="text-sm">基本情報</TabsTrigger>
              <TabsTrigger value="breakdown" className="text-sm">工数・コスト</TabsTrigger>
              <TabsTrigger value="daily-reports" className="text-sm">日報連携</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 基本情報 */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    基本情報
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">プロジェクト名</Label>
                      <Input
                        value={formData.projectName || ''}
                        onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                        placeholder="プロジェクト名を入力..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">クライアント</Label>
                      <Input
                        value={formData.client || ''}
                        onChange={(e) => setFormData({...formData, client: e.target.value})}
                        placeholder="クライアント名を入力..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">管理番号</Label>
                      <Input
                        value={formData.managementNumber || ''}
                        onChange={(e) => setFormData({...formData, managementNumber: e.target.value})}
                        placeholder="管理番号を入力..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">ステータス</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({...formData, status: value as any})}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="計画中">計画中</SelectItem>
                          <SelectItem value="進行中">進行中</SelectItem>
                          <SelectItem value="完了">完了</SelectItem>
                          <SelectItem value="遅延">遅延</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">優先度</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({...formData, priority: value as any})}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="低">低</SelectItem>
                          <SelectItem value="中">中</SelectItem>
                          <SelectItem value="高">高</SelectItem>
                          <SelectItem value="緊急">緊急</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">計画内容</Label>
                      <Textarea
                        value={formData.plannedContent || ''}
                        onChange={(e) => setFormData({...formData, plannedContent: e.target.value})}
                        placeholder="計画内容を入力..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* 効率性指標 */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    効率性指標
                  </h3>
                  <Card className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-slate-400">工数効率</span>
                          {getEfficiencyIcon(efficiency)}
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {efficiency.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.min(efficiency, 150)} className="h-2" />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-slate-400">コスト効率</span>
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${costDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {((formData.budget?.totalActualCost || 0) / (formData.budget?.totalPlannedCost || 1) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">
                            差異: {formatCurrency(costDiff)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="mt-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    工程別工数
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-slate-600">
                  {/* 段取り */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-800 dark:text-slate-200 text-base">段取り</span>
                      <div className={`flex items-center gap-2 text-sm font-medium ${
                        (formData.actualHours?.setup || 0) - (formData.plannedHours?.setup || 0) > 0 ? 'text-red-600' : 
                        (formData.actualHours?.setup || 0) - (formData.plannedHours?.setup || 0) < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {getDifferenceIcon((formData.actualHours?.setup || 0) - (formData.plannedHours?.setup || 0))}
                        <span>
                          {((formData.actualHours?.setup || 0) - (formData.plannedHours?.setup || 0)) > 0 ? '+' : ''}
                          {((formData.actualHours?.setup || 0) - (formData.plannedHours?.setup || 0)).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">計画工数</Label>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={formData.plannedHours?.setup ? formData.plannedHours.setup.toString() : ''}
                            onChange={(e) => {
                              const value = parseTimeInput(e.target.value);
                              setFormData({
                                ...formData,
                                plannedHours: {
                                  ...formData.plannedHours,
                                  setup: value
                                }
                              });
                            }}
                            className="h-10 text-base"
                            placeholder="2時間30分 または 2.5"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">作業者</Label>
                              <Select
                                value={formData.setupWorker || 'none'}
                                onValueChange={(value) => setFormData({...formData, setupWorker: value === 'none' ? '' : value})}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">未選択</SelectItem>
                                  {workers.map((worker) => (
                                    <SelectItem key={worker.id} value={worker.id}>
                                      {worker.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">機械</Label>
                              <Select
                                value={formData.setupMachine || 'none'}
                                onValueChange={(value) => setFormData({...formData, setupMachine: value === 'none' ? '' : value})}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">なし</SelectItem>
                                  {machines.filter(m => m.status === 'available').map((machine) => (
                                    <SelectItem key={machine.id} value={machine.id}>
                                      {machine.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 block">
                          実績工数
                          <span className="text-xs text-gray-500 ml-2">（日報自動連携・手動修正可）</span>
                        </Label>
                        <Input
                          type="text"
                          value={formData.actualHours?.setup ? formData.actualHours.setup.toString() : ''}
                          onChange={(e) => {
                            const value = parseTimeInput(e.target.value);
                            setFormData({
                              ...formData,
                              actualHours: {
                                ...formData.actualHours,
                                setup: value
                              }
                            });
                          }}
                          className="h-10 text-base"
                          placeholder="日報から自動更新"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 機械加工 */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-800 dark:text-slate-200 text-base">機械加工</span>
                      <div className={`flex items-center gap-2 text-sm font-medium ${
                        (formData.actualHours?.machining || 0) - (formData.plannedHours?.machining || 0) > 0 ? 'text-red-600' : 
                        (formData.actualHours?.machining || 0) - (formData.plannedHours?.machining || 0) < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {getDifferenceIcon((formData.actualHours?.machining || 0) - (formData.plannedHours?.machining || 0))}
                        <span>
                          {((formData.actualHours?.machining || 0) - (formData.plannedHours?.machining || 0)) > 0 ? '+' : ''}
                          {((formData.actualHours?.machining || 0) - (formData.plannedHours?.machining || 0)).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">計画工数</Label>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={formData.plannedHours?.machining ? formData.plannedHours.machining.toString() : ''}
                            onChange={(e) => {
                              const value = parseTimeInput(e.target.value);
                              setFormData({
                                ...formData,
                                plannedHours: {
                                  ...formData.plannedHours,
                                  machining: value
                                }
                              });
                            }}
                            className="h-10 text-base"
                            placeholder="2時間30分 または 2.5"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">作業者</Label>
                              <Select
                                value={formData.machiningWorker || 'none'}
                                onValueChange={(value) => setFormData({...formData, machiningWorker: value === 'none' ? '' : value})}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">未選択</SelectItem>
                                  {workers.map((worker) => (
                                    <SelectItem key={worker.id} value={worker.id}>
                                      {worker.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">機械</Label>
                              <Select
                                value={formData.machiningMachine || 'none'}
                                onValueChange={(value) => setFormData({...formData, machiningMachine: value === 'none' ? '' : value})}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">なし</SelectItem>
                                  {machines.filter(m => m.status === 'available').map((machine) => (
                                    <SelectItem key={machine.id} value={machine.id}>
                                      {machine.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 block">
                          実績工数
                          <span className="text-xs text-gray-500 ml-2">（日報自動連携・手動修正可）</span>
                        </Label>
                        <Input
                          type="text"
                          value={formData.actualHours?.machining ? formData.actualHours.machining.toString() : ''}
                          onChange={(e) => {
                            const value = parseTimeInput(e.target.value);
                            setFormData({
                              ...formData,
                              actualHours: {
                                ...formData.actualHours,
                                machining: value
                              }
                            });
                          }}
                          className="h-10 text-base"
                          placeholder="日報から自動更新"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 仕上げ */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-800 dark:text-slate-200 text-base">仕上げ</span>
                      <div className={`flex items-center gap-2 text-sm font-medium ${
                        (formData.actualHours?.finishing || 0) - (formData.plannedHours?.finishing || 0) > 0 ? 'text-red-600' : 
                        (formData.actualHours?.finishing || 0) - (formData.plannedHours?.finishing || 0) < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {getDifferenceIcon((formData.actualHours?.finishing || 0) - (formData.plannedHours?.finishing || 0))}
                        <span>
                          {((formData.actualHours?.finishing || 0) - (formData.plannedHours?.finishing || 0)) > 0 ? '+' : ''}
                          {((formData.actualHours?.finishing || 0) - (formData.plannedHours?.finishing || 0)).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">計画工数</Label>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={formData.plannedHours?.finishing ? formData.plannedHours.finishing.toString() : ''}
                            onChange={(e) => {
                              const value = parseTimeInput(e.target.value);
                              setFormData({
                                ...formData,
                                plannedHours: {
                                  ...formData.plannedHours,
                                  finishing: value
                                }
                              });
                            }}
                            className="h-10 text-base"
                            placeholder="2時間30分 または 2.5"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">作業者</Label>
                              <Select
                                value={formData.finishingWorker || 'none'}
                                onValueChange={(value) => setFormData({...formData, finishingWorker: value === 'none' ? '' : value})}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">未選択</SelectItem>
                                  {workers.map((worker) => (
                                    <SelectItem key={worker.id} value={worker.id}>
                                      {worker.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">機械</Label>
                              <Select
                                value={formData.finishingMachine || 'none'}
                                onValueChange={(value) => setFormData({...formData, finishingMachine: value === 'none' ? '' : value})}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">なし</SelectItem>
                                  {machines.filter(m => m.status === 'available').map((machine) => (
                                    <SelectItem key={machine.id} value={machine.id}>
                                      {machine.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 block">
                          実績工数
                          <span className="text-xs text-gray-500 ml-2">（日報自動連携・手動修正可）</span>
                        </Label>
                        <Input
                          type="text"
                          value={formData.actualHours?.finishing ? formData.actualHours.finishing.toString() : ''}
                          onChange={(e) => {
                            const value = parseTimeInput(e.target.value);
                            setFormData({
                              ...formData,
                              actualHours: {
                                ...formData.actualHours,
                                finishing: value
                              }
                            });
                          }}
                          className="h-10 text-base"
                          placeholder="日報から自動更新"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* カスタム計画工程 */}
                {customPlannedSteps.map((step, index) => (
                  <div key={step.id} className="px-6 py-4 bg-green-50 dark:bg-green-900/50 border-t border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Select
                          value={step.name}
                          onValueChange={(value) => updateCustomPlannedStep(step.id, 'name', value)}
                        >
                          <SelectTrigger className="h-8 w-32 text-sm font-medium border-green-300 dark:border-green-600">
                            <SelectValue placeholder="工程選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {processTemplates.map((template) => (
                              <SelectItem key={template} value={template}>
                                {template}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">追加工程</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomPlannedStep(step.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-800/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">計画工数</Label>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={step.hours ? step.hours.toString() : ''}
                            onChange={(e) => {
                              const value = parseTimeInput(e.target.value);
                              updateCustomPlannedStep(step.id, 'hours', value);
                            }}
                            className="h-10 text-base"
                            placeholder="2時間30分 または 2.5"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">作業者</Label>
                              <Select
                                value={step.workerId || 'none'}
                                onValueChange={(value) => updateCustomPlannedStep(step.id, 'workerId', value === 'none' ? '' : value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">未選択</SelectItem>
                                  {workers.map((worker) => (
                                    <SelectItem key={worker.id} value={worker.id}>
                                      {worker.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">機械</Label>
                              <Select
                                value={step.machineId || 'none'}
                                onValueChange={(value) => {
                                  const actualValue = value === 'none' ? '' : value;
                                  const machine = actualValue ? machines.find(m => m.id === actualValue) : null;
                                  updateCustomPlannedStep(step.id, 'machineId', actualValue);
                                  updateCustomPlannedStep(step.id, 'machineCharge', machine?.hourlyRate || 0);
                                  updateCustomPlannedStep(step.id, 'totalRate', step.workerCharge + (machine?.hourlyRate || 0));
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">なし</SelectItem>
                                  {machines.filter(m => m.status === 'available').map((machine) => (
                                    <SelectItem key={machine.id} value={machine.id}>
                                      {machine.name} (+¥{machine.hourlyRate}/h)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            時間単価: ¥{step.totalRate}/h (作業者¥{step.workerCharge} + 機械¥{step.machineCharge})
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">実績工数（日報自動連携）</Label>
                        <div className="h-10 flex items-center px-3 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-base text-gray-500">
                          日報から自動更新
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          カスタム工程の実績は日報の作業内容から自動判定されます
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 計画工程追加ボタン */}
                <div className="px-6 py-4 border-t border-dashed border-green-300 dark:border-green-600">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomPlannedStep}
                    className="w-full border-dashed border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    計画工程を追加
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="daily-reports" className="mt-4 space-y-3">
              <Card className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/50">
                <CardHeader className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    日報連携設定
                  </h3>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">自動同期: 有効</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      日報データから実績工数を自動取得・更新します。
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      ※手動で実績を入力した場合は日報データが優先されます
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* フッター - 固定 */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            className="px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};