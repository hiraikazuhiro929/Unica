import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  DollarSign,
  Clock,
  User,
  Wrench,
} from "lucide-react";
import type { EnhancedWorkHours, WorkHoursStatistics, Worker, Machine } from '@/app/tasks/types';

interface AnalyticsChartsProps {
  workHours: EnhancedWorkHours[];
  statistics: WorkHoursStatistics;
  workers: Worker[];
  machines: Machine[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  workHours,
  statistics,
  workers,
  machines,
}) => {
  // 効率性分析データの準備
  const efficiencyData = workHours.map(wh => ({
    ...wh,
    efficiency: wh.plannedHours.total > 0 
      ? (wh.actualHours.total / wh.plannedHours.total) * 100 
      : 0,
    costVariance: wh.budget.totalPlannedCost > 0
      ? ((wh.budget.totalActualCost - wh.budget.totalPlannedCost) / wh.budget.totalPlannedCost) * 100
      : 0,
  })).sort((a, b) => b.efficiency - a.efficiency);

  // 月別集計データ（サンプル）
  const monthlyData = [
    { month: '1月', planned: 180, actual: 165, cost: 850000 },
    { month: '2月', planned: 210, actual: 225, cost: 1100000 },
    { month: '3月', planned: 195, actual: 190, cost: 980000 },
    { month: '4月', planned: 220, actual: 235, cost: 1200000 },
    { month: '5月', planned: 185, actual: 175, cost: 920000 },
    { month: '6月', planned: 240, actual: 245, cost: 1300000 },
  ];

  // トレンド分析
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Target className="w-4 h-4 text-gray-500" />;
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency <= 100) return 'text-green-600';
    if (efficiency <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadgeColor = (efficiency: number) => {
    if (efficiency <= 100) return 'bg-green-100 text-green-800';
    if (efficiency <= 120) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* KPI概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均効率性</p>
                <p className={`text-2xl font-bold ${getEfficiencyColor(statistics.averageEfficiency)}`}>
                  {statistics.averageEfficiency.toFixed(1)}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <Progress value={Math.min(statistics.averageEfficiency, 150)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">完了率</p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.totalProjects > 0 
                    ? ((statistics.byStatus.completed / statistics.totalProjects) * 100).toFixed(1)
                    : 0
                  }%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {statistics.byStatus.completed} / {statistics.totalProjects} プロジェクト
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">予算達成率</p>
                <p className={`text-2xl font-bold ${
                  statistics.totalActualCost <= statistics.totalPlannedCost 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {statistics.totalPlannedCost > 0
                    ? ((1 - (statistics.totalActualCost - statistics.totalPlannedCost) / statistics.totalPlannedCost) * 100).toFixed(1)
                    : 100
                  }%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">工数精度</p>
                <p className="text-2xl font-bold text-purple-600">
                  {statistics.totalPlannedHours > 0
                    ? (100 - Math.abs((statistics.totalActualHours - statistics.totalPlannedHours) / statistics.totalPlannedHours * 100)).toFixed(1)
                    : 100
                  }%
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 効率性ランキング */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">プロジェクト効率性ランキング</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {efficiencyData.slice(0, 8).map((project, index) => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{project.projectName}</div>
                      <div className="text-xs text-gray-500">{project.client}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getEfficiencyBadgeColor(project.efficiency)}>
                      {project.efficiency.toFixed(1)}%
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {project.actualHours.total}h / {project.plannedHours.total}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">コスト分析</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">総予算</p>
                  <p className="text-xl font-bold text-blue-600">
                    ¥{statistics.totalPlannedCost.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">実績コスト</p>
                  <p className="text-xl font-bold text-green-600">
                    ¥{statistics.totalActualCost.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">プロジェクト別コスト差異</h4>
                {efficiencyData.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm truncate">{project.projectName}</span>
                    <span className={`text-sm font-medium ${
                      project.costVariance <= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {project.costVariance > 0 ? '+' : ''}{project.costVariance.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 月別トレンド */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">月別工数トレンド</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4">
              {monthlyData.map((month, index) => {
                const efficiency = (month.actual / month.planned) * 100;
                const prevEfficiency = index > 0 ? (monthlyData[index - 1].actual / monthlyData[index - 1].planned) * 100 : efficiency;
                
                return (
                  <div key={month.month} className="text-center">
                    <div className="mb-2">
                      <p className="text-sm font-medium">{month.month}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 bg-gray-100 rounded relative">
                        <div 
                          className="bg-blue-500 rounded-b absolute bottom-0 left-0 right-0"
                          style={{ height: `${(month.planned / 250) * 100}%` }}
                        />
                        <div 
                          className="bg-green-500 rounded-b absolute bottom-0 left-1/2 right-0"
                          style={{ height: `${(month.actual / 250) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded"></div>
                          <span>{month.planned}h</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded"></div>
                          <span>{month.actual}h</span>
                        </div>
                        <div className="flex items-center justify-center">
                          {getTrendIcon(efficiency, prevEfficiency)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm">計画工数</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm">実績工数</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* リソース稼働状況 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">作業者パフォーマンス</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.byWorker.map((worker) => (
                <div key={worker.workerId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{worker.workerName}</div>
                      <div className="text-sm text-gray-500">{worker.totalHours.toFixed(1)}時間</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={worker.efficiency} className="h-2" />
                    </div>
                    <span className="text-sm font-medium w-12">
                      {worker.efficiency.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">機械稼働状況</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.byMachine.map((machine) => (
                <div key={machine.machineId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      machine.utilizationRate > 80 ? 'bg-green-100' :
                      machine.utilizationRate > 60 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <Wrench className={`w-4 h-4 ${
                        machine.utilizationRate > 80 ? 'text-green-600' :
                        machine.utilizationRate > 60 ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium">{machine.machineName}</div>
                      <div className="text-sm text-gray-500">{machine.totalHours.toFixed(1)}時間</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={machine.utilizationRate} className="h-2" />
                    </div>
                    <span className="text-sm font-medium w-12">
                      {machine.utilizationRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};