import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calculator,
  Building2,
  FileText,
} from "lucide-react";
import type { EnhancedWorkHours, WorkHours } from '@/app/tasks/types';

interface WorkHoursEditModalProps {
  workHours: EnhancedWorkHours | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EnhancedWorkHours>) => void;
  isLoading: boolean;
}

export const WorkHoursEditModal: React.FC<WorkHoursEditModalProps> = ({
  workHours,
  isOpen,
  onClose,
  onSave,
  isLoading,
}) => {
  const [formData, setFormData] = useState<Partial<EnhancedWorkHours>>({
    projectName: '',
    client: '',
    managementNumber: '',
    plannedHours: {
      setup: 0,
      machining: 0,
      finishing: 0,
      total: 0,
    },
    actualHours: {
      setup: 0,
      machining: 0,
      finishing: 0,
      total: 0,
    },
    budget: {
      estimatedAmount: 0,
      setupRate: 3000,
      machiningRate: 4000,
      finishingRate: 3500,
      totalPlannedCost: 0,
      totalActualCost: 0,
    },
    status: 'planning',
    priority: 'medium',
    tags: [],
  });

  useEffect(() => {
    if (workHours) {
      setFormData(workHours);
    } else {
      // 新規作成時のデフォルト値
      setFormData({
        projectName: '',
        client: '',
        managementNumber: generateManagementNumber(),
        plannedHours: {
          setup: 0,
          machining: 0,
          finishing: 0,
          total: 0,
        },
        actualHours: {
          setup: 0,
          machining: 0,
          finishing: 0,
          total: 0,
        },
        budget: {
          estimatedAmount: 0,
          setupRate: 3000,
          machiningRate: 4000,
          finishingRate: 3500,
          totalPlannedCost: 0,
          totalActualCost: 0,
        },
        status: 'planning',
        priority: 'medium',
        tags: [],
      });
    }
  }, [workHours]);

  const generateManagementNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `WH-${year}${month}-${random}`;
  };

  const calculateTotals = () => {
    // 計画工数の合計
    const plannedTotal = 
      (Number(formData.plannedHours?.setup) || 0) +
      (Number(formData.plannedHours?.machining) || 0) +
      (Number(formData.plannedHours?.finishing) || 0);

    // 実績工数の合計
    const actualTotal = 
      (Number(formData.actualHours?.setup) || 0) +
      (Number(formData.actualHours?.machining) || 0) +
      (Number(formData.actualHours?.finishing) || 0);

    // コスト計算
    const totalPlannedCost = 
      (Number(formData.plannedHours?.setup) || 0) * (Number(formData.budget?.setupRate) || 0) +
      (Number(formData.plannedHours?.machining) || 0) * (Number(formData.budget?.machiningRate) || 0) +
      (Number(formData.plannedHours?.finishing) || 0) * (Number(formData.budget?.finishingRate) || 0);

    const totalActualCost = 
      (Number(formData.actualHours?.setup) || 0) * (Number(formData.budget?.setupRate) || 0) +
      (Number(formData.actualHours?.machining) || 0) * (Number(formData.budget?.machiningRate) || 0) +
      (Number(formData.actualHours?.finishing) || 0) * (Number(formData.budget?.finishingRate) || 0);

    setFormData(prev => ({
      ...prev,
      plannedHours: {
        ...prev.plannedHours!,
        total: plannedTotal,
      },
      actualHours: {
        ...prev.actualHours!,
        total: actualTotal,
      },
      budget: {
        ...prev.budget!,
        totalPlannedCost,
        totalActualCost,
      },
    }));
  };

  const handleSave = () => {
    calculateTotals();
    onSave(formData);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency <= 100) return 'text-green-600';
    if (efficiency <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  const efficiency = formData.plannedHours?.total && formData.actualHours?.total
    ? (formData.actualHours.total / formData.plannedHours.total) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {workHours ? '工数データ編集' : '新規工数データ作成'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="hours">工数詳細</TabsTrigger>
              <TabsTrigger value="budget">予算・コスト</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectName">プロジェクト名</Label>
                  <Input
                    id="projectName"
                    value={formData.projectName || ''}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client">クライアント</Label>
                  <Input
                    id="client"
                    value={formData.client || ''}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="managementNumber">管理番号</Label>
                  <Input
                    id="managementNumber"
                    value={formData.managementNumber || ''}
                    onChange={(e) => setFormData({ ...formData, managementNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">ステータス</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as WorkHours['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">計画中</SelectItem>
                      <SelectItem value="in-progress">進行中</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                      <SelectItem value="delayed">遅延</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">優先度</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as WorkHours['priority'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="優先度を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>タグ</Label>
                  <Input
                    placeholder="カンマ区切りでタグを入力"
                    value={(formData.tags || []).join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                    })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    計画工数
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="plannedSetup">段取り</Label>
                      <Input
                        id="plannedSetup"
                        type="number"
                        value={formData.plannedHours?.setup || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            plannedHours: {
                              ...formData.plannedHours!,
                              setup: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="plannedMachining">機械加工</Label>
                      <Input
                        id="plannedMachining"
                        type="number"
                        value={formData.plannedHours?.machining || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            plannedHours: {
                              ...formData.plannedHours!,
                              machining: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="plannedFinishing">仕上げ</Label>
                      <Input
                        id="plannedFinishing"
                        type="number"
                        value={formData.plannedHours?.finishing || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            plannedHours: {
                              ...formData.plannedHours!,
                              finishing: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                      />
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">合計</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formData.plannedHours?.total || 0}時間
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    実績工数
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="actualSetup">段取り</Label>
                      <Input
                        id="actualSetup"
                        type="number"
                        value={formData.actualHours?.setup || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            actualHours: {
                              ...formData.actualHours!,
                              setup: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="actualMachining">機械加工</Label>
                      <Input
                        id="actualMachining"
                        type="number"
                        value={formData.actualHours?.machining || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            actualHours: {
                              ...formData.actualHours!,
                              machining: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="actualFinishing">仕上げ</Label>
                      <Input
                        id="actualFinishing"
                        type="number"
                        value={formData.actualHours?.finishing || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            actualHours: {
                              ...formData.actualHours!,
                              finishing: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                      />
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">合計</span>
                        <span className="text-lg font-bold text-green-600">
                          {formData.actualHours?.total || 0}時間
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 効率性指標 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">効率性</span>
                  <span className={`text-lg font-bold ${getEfficiencyColor(efficiency)}`}>
                    {efficiency.toFixed(1)}%
                  </span>
                </div>
                <Progress value={Math.min(efficiency, 150)} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="budget" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="estimatedAmount">見積金額</Label>
                  <Input
                    id="estimatedAmount"
                    type="number"
                    value={formData.budget?.estimatedAmount || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      budget: {
                        ...formData.budget!,
                        estimatedAmount: Number(e.target.value),
                      },
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>時間単価</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-20">段取り:</span>
                      <Input
                        type="number"
                        value={formData.budget?.setupRate || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            budget: {
                              ...formData.budget!,
                              setupRate: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm">円/時</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-20">機械加工:</span>
                      <Input
                        type="number"
                        value={formData.budget?.machiningRate || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            budget: {
                              ...formData.budget!,
                              machiningRate: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm">円/時</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-20">仕上げ:</span>
                      <Input
                        type="number"
                        value={formData.budget?.finishingRate || 0}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            budget: {
                              ...formData.budget!,
                              finishingRate: Number(e.target.value),
                            },
                          });
                          calculateTotals();
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm">円/時</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">計画原価</span>
                    <DollarSign className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{(formData.budget?.totalPlannedCost || 0).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">実績原価</span>
                    <DollarSign className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{(formData.budget?.totalActualCost || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">コスト差異</span>
                  <span className={`text-lg font-bold ${
                    (formData.budget?.totalActualCost || 0) <= (formData.budget?.totalPlannedCost || 0)
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.budget?.totalPlannedCost && formData.budget?.totalActualCost
                      ? `${(((formData.budget.totalActualCost - formData.budget.totalPlannedCost) / formData.budget.totalPlannedCost) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
};