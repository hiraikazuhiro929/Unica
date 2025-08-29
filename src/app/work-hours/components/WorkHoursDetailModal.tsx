import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2
} from "lucide-react";
import type { EnhancedWorkHours } from '@/app/tasks/types';
import type { Worker } from '@/lib/firebase/workers';
import type { Machine } from '@/lib/firebase/machines';

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

  const baseWorkerCharge = 1500; // 基本作業者チャージ

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

  const efficiency = formData.plannedHours?.total && formData.actualHours?.total
    ? (formData.actualHours.total / formData.plannedHours.total) * 100
    : 0;

  const costDiff = (formData.budget?.totalActualCost || 0) - (formData.budget?.totalPlannedCost || 0);

  const getEfficiencyIcon = (eff: number) => {
    if (eff <= 100) return <TrendingDown className="w-4 h-4 text-green-500" />;
    if (eff <= 120) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <TrendingUp className="w-4 h-4 text-red-500" />;
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-600 shadow-xl">
        <div className="p-6 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {workHours ? '工数編集' : '工数新規作成'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                工数データの管理・編集
              </p>
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
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">基本情報</TabsTrigger>
              <TabsTrigger value="breakdown">工数・コスト</TabsTrigger>
              <TabsTrigger value="daily-reports">日報連携</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 基本情報 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">基本情報</h3>
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">効率性指標</h3>
                  <div className="space-y-3">
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
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="mt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  工数・コスト詳細
                </h3>
                <div className="space-y-3">
                  {/* 段取り */}
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-slate-200">段取り</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">({formatCurrency(formData.budget?.setupRate || 0)}/h)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">計画工数</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.plannedHours?.setup || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            plannedHours: {
                              ...formData.plannedHours,
                              setup: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-600 dark:text-green-400">実績工数</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.actualHours?.setup || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            actualHours: {
                              ...formData.actualHours,
                              setup: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-purple-600 dark:text-purple-400">機械選択・チャージ</Label>
                        <Select
                          value={formData.assignedMachine?.setupMachine || ''}
                          onValueChange={(value) => {
                            const machine = value === "none" ? null : machines.find(m => m.id === value);
                            setFormData({
                              ...formData,
                              assignedMachine: {
                                ...formData.assignedMachine,
                                setupMachine: value === "none" ? "" : value
                              },
                              budget: {
                                ...formData.budget,
                                setupRate: baseWorkerCharge + (machine?.hourlyRate || 0)
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="機械を選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">機械なし (作業者のみ ¥{baseWorkerCharge}/h)</SelectItem>
                            {machines.filter(m => m.status === 'available' && (m.type === '段取り台' || m.type === 'クレーン')).map((machine) => (
                              <SelectItem key={machine.id} value={machine.id}>
                                {machine.name} (作業者¥{baseWorkerCharge} + 機械¥{machine.hourlyRate} = ¥{baseWorkerCharge + machine.hourlyRate}/h)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* 機械加工 */}
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-slate-200">機械加工</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">({formatCurrency(formData.budget?.machiningRate || 0)}/h)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">計画工数</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.plannedHours?.machining || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            plannedHours: {
                              ...formData.plannedHours,
                              machining: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-600 dark:text-green-400">実績工数</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.actualHours?.machining || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            actualHours: {
                              ...formData.actualHours,
                              machining: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-purple-600 dark:text-purple-400">使用機械・チャージ</Label>
                        <Select
                          value={formData.assignedMachine?.machiningMachine || ''}
                          onValueChange={(value) => {
                            const machine = machines.find(m => m.id === value);
                            setFormData({
                              ...formData,
                              assignedMachine: {
                                ...formData.assignedMachine,
                                machiningMachine: value
                              },
                              budget: {
                                ...formData.budget,
                                machiningRate: baseWorkerCharge + (machine?.hourlyRate || 0)
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="機械を選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            {machines.filter(m => m.status === 'available' && (m.type === '加工機' || m.type === '旋盤' || m.type === 'マシニング')).map((machine) => (
                              <SelectItem key={machine.id} value={machine.id}>
                                {machine.name} (作業者¥{baseWorkerCharge} + 機械¥{machine.hourlyRate} = ¥{baseWorkerCharge + machine.hourlyRate}/h)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* 仕上げ */}
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-slate-200">仕上げ</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">({formatCurrency(formData.budget?.finishingRate || 0)}/h)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">計画工数</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.plannedHours?.finishing || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            plannedHours: {
                              ...formData.plannedHours,
                              finishing: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-600 dark:text-green-400">実績工数</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.actualHours?.finishing || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            actualHours: {
                              ...formData.actualHours,
                              finishing: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-purple-600 dark:text-purple-400">機械選択・チャージ</Label>
                        <Select
                          value={formData.assignedMachine?.finishingMachine || ''}
                          onValueChange={(value) => {
                            const machine = value === "none" ? null : machines.find(m => m.id === value);
                            setFormData({
                              ...formData,
                              assignedMachine: {
                                ...formData.assignedMachine,
                                finishingMachine: value === "none" ? "" : value
                              },
                              budget: {
                                ...formData.budget,
                                finishingRate: baseWorkerCharge + (machine?.hourlyRate || 0)
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="機械を選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">機械なし (作業者のみ ¥{baseWorkerCharge}/h)</SelectItem>
                            {machines.filter(m => m.status === 'available' && (m.type === '研磨機' || m.type === '仕上げ機')).map((machine) => (
                              <SelectItem key={machine.id} value={machine.id}>
                                {machine.name} (作業者¥{baseWorkerCharge} + 機械¥{machine.hourlyRate} = ¥{baseWorkerCharge + machine.hourlyRate}/h)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* カスタム工程追加 */}
                  <div className="border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-green-800 dark:text-green-300">追加工程 (計画)</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomPlannedStep}
                        className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-100"
                      >
                        <Plus className="w-4 h-4" />
                        工程追加
                      </Button>
                    </div>
                    
                    {customPlannedSteps.length > 0 && (
                      <div className="space-y-3">
                        {customPlannedSteps.map((step) => (
                          <div key={step.id} className="grid grid-cols-5 gap-3 p-3 bg-white dark:bg-slate-700 rounded border">
                            <div>
                              <Label className="text-xs">工程名</Label>
                              <Input
                                value={step.name}
                                onChange={(e) => updateCustomPlannedStep(step.id, 'name', e.target.value)}
                                placeholder="検査、梱包等"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">時間</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={step.hours}
                                onChange={(e) => updateCustomPlannedStep(step.id, 'hours', parseFloat(e.target.value) || 0)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">機械選択</Label>
                              <Select
                                value={step.machineId}
                                onValueChange={(value) => updateCustomPlannedStep(step.id, 'machineId', value === "none" ? "" : value)}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="機械選択..." />
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
                            <div className="text-center">
                              <Label className="text-xs">合計単価</Label>
                              <div className="text-sm font-medium mt-1">¥{step.totalRate}/h</div>
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCustomPlannedStep(step.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 合計・効率性表示 */}
                  <div className="border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-blue-600 dark:text-blue-400 font-medium text-sm mb-2">計画合計</div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">基本工程: {formatHours(
                            (formData.plannedHours?.setup || 0) + 
                            (formData.plannedHours?.machining || 0) + 
                            (formData.plannedHours?.finishing || 0)
                          )}</div>
                          <div className="text-xs text-gray-500">追加工程: {formatHours(
                            customPlannedSteps.reduce((sum, step) => sum + step.hours, 0)
                          )}</div>
                          <div className="flex items-center justify-between border-t pt-1">
                            <span className="font-bold">{formatHours(
                              (formData.plannedHours?.setup || 0) + 
                              (formData.plannedHours?.machining || 0) + 
                              (formData.plannedHours?.finishing || 0) +
                              customPlannedSteps.reduce((sum, step) => sum + step.hours, 0)
                            )}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(
                                (formData.plannedHours?.setup || 0) * (formData.budget?.setupRate || 0) +
                                (formData.plannedHours?.machining || 0) * (formData.budget?.machiningRate || 0) +
                                (formData.plannedHours?.finishing || 0) * (formData.budget?.finishingRate || 0) +
                                customPlannedSteps.reduce((sum, step) => sum + (step.hours * step.totalRate), 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-green-600 dark:text-green-400 font-medium text-sm mb-2">実績合計</div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{formatHours(
                            (formData.actualHours?.setup || 0) + 
                            (formData.actualHours?.machining || 0) + 
                            (formData.actualHours?.finishing || 0)
                          )}</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(
                              (formData.actualHours?.setup || 0) * (formData.budget?.setupRate || 0) +
                              (formData.actualHours?.machining || 0) * (formData.budget?.machiningRate || 0) +
                              (formData.actualHours?.finishing || 0) * (formData.budget?.finishingRate || 0)
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">※実績は日報連携で自動更新</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="daily-reports" className="mt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  日報連携設定
                </h3>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-300">自動同期</span>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    日報データから実績工数を自動取得・更新します。手動で実績を入力した場合は日報データが優先されます。
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};