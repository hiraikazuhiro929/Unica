"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Wrench,
  DollarSign,
  Target,
  Activity,
  Clock,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  LineChart,
} from "lucide-react";

import type {
  EnhancedWorkHours,
  WorkHoursStatistics,
  WorkHoursAnalytics,
  Worker,
  Machine,
} from "@/app/tasks/types";

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

interface AnalyticsTimeframe {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

interface EfficiencyTrend {
  date: string;
  efficiency: number;
  plannedHours: number;
  actualHours: number;
}

interface CostBreakdown {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercentage: number;
}

interface ProjectPerformance {
  id: string;
  projectName: string;
  client: string;
  efficiency: number;
  costVariance: number;
  riskLevel: "low" | "medium" | "high";
  status: string;
  completionProgress: number;
}

// =============================================================================
// MAIN ANALYTICS COMPONENT
// =============================================================================

interface WorkHoursAnalyticsProps {
  workHours: EnhancedWorkHours[];
  statistics: WorkHoursStatistics;
  workers: Worker[];
  machines: Machine[];
  onExport?: (format: "csv" | "excel" | "pdf") => void;
  onRefresh?: () => void;
}

export const WorkHoursAnalytics: React.FC<WorkHoursAnalyticsProps> = ({
  workHours,
  statistics,
  workers,
  machines,
  onExport,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState("last30days");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate timeframe options
  const timeframes: AnalyticsTimeframe[] = useMemo(() => {
    const now = new Date();
    return [
      {
        label: "過去7日間",
        value: "last7days",
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: now,
      },
      {
        label: "過去30日間",
        value: "last30days",
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now,
      },
      {
        label: "過去90日間",
        value: "last90days",
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: now,
      },
      {
        label: "今年",
        value: "thisYear",
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now,
      },
    ];
  }, []);

  // Filter work hours based on selected criteria
  const filteredWorkHours = useMemo(() => {
    const timeframe = timeframes.find(t => t.value === selectedTimeframe);
    if (!timeframe) return workHours;

    return workHours.filter(wh => {
      const createdDate = new Date(wh.createdAt);
      const withinTimeframe = createdDate >= timeframe.startDate && createdDate <= timeframe.endDate;
      const matchesClient = filterClient === "all" || wh.client === filterClient;
      const matchesStatus = filterStatus === "all" || wh.status === filterStatus;

      return withinTimeframe && matchesClient && matchesStatus;
    });
  }, [workHours, selectedTimeframe, filterClient, filterStatus, timeframes]);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    return calculateAnalytics(filteredWorkHours, workers, machines);
  }, [filteredWorkHours, workers, machines]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get unique clients for filter
  const clients = useMemo(() => {
    return [...new Set(workHours.map(wh => wh.client))];
  }, [workHours]);

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">工数分析ダッシュボード</h2>
          <p className="text-gray-600 mt-1">
            工数データの詳細分析と業績トレンドを表示します
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="期間選択" />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((timeframe) => (
                <SelectItem key={timeframe.value} value={timeframe.value}>
                  {timeframe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Client Filter */}
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="クライアント" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export Button */}
          <Button
            variant="outline"
            onClick={() => onExport?.("excel")}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            エクスポート
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="総プロジェクト"
          value={filteredWorkHours.length}
          icon={<Target className="w-8 h-8 text-blue-500" />}
          trend={{ value: 12, isPositive: true }}
          color="blue"
        />
        
        <MetricCard
          title="平均効率性"
          value={`${analyticsData.overallEfficiency.toFixed(1)}%`}
          icon={<TrendingUp className="w-8 h-8 text-green-500" />}
          trend={{ value: 5.2, isPositive: true }}
          color="green"
        />
        
        <MetricCard
          title="コスト差異"
          value={`${analyticsData.costVariancePercentage.toFixed(1)}%`}
          icon={<DollarSign className="w-8 h-8 text-red-500" />}
          trend={{ value: -2.1, isPositive: false }}
          color="red"
        />
        
        <MetricCard
          title="完了率"
          value={`${analyticsData.completionRate.toFixed(1)}%`}
          icon={<CheckCircle2 className="w-8 h-8 text-purple-500" />}
          trend={{ value: 8.7, isPositive: true }}
          color="purple"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="efficiency">効率性</TabsTrigger>
          <TabsTrigger value="costs">コスト</TabsTrigger>
          <TabsTrigger value="productivity">生産性</TabsTrigger>
          <TabsTrigger value="projects">プロジェクト</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab analyticsData={analyticsData} workHours={filteredWorkHours} />
        </TabsContent>

        <TabsContent value="efficiency" className="mt-6">
          <EfficiencyTab analyticsData={analyticsData} workHours={filteredWorkHours} />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <CostsTab analyticsData={analyticsData} workHours={filteredWorkHours} />
        </TabsContent>

        <TabsContent value="productivity" className="mt-6">
          <ProductivityTab 
            workers={workers} 
            machines={machines} 
            statistics={statistics}
            analyticsData={analyticsData}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectsTab workHours={filteredWorkHours} analyticsData={analyticsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// =============================================================================
// METRIC CARD COMPONENT
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "blue" | "green" | "red" | "purple" | "yellow";
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, color }) => {
  const colorClasses = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    red: "border-l-red-500",
    purple: "border-l-purple-500",
    yellow: "border-l-yellow-500",
  };

  return (
    <Card className={`border-l-4 ${colorClasses[color]} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span
                  className={`text-xs ${
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              </div>
            )}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// TAB COMPONENTS
// =============================================================================

const OverviewTab: React.FC<{ analyticsData: any; workHours: EnhancedWorkHours[] }> = ({
  analyticsData,
  workHours,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">ステータス分布</h3>
        </CardHeader>
        <CardContent>
          <StatusDistributionChart workHours={workHours} />
        </CardContent>
      </Card>

      {/* Efficiency Trend */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">効率性トレンド</h3>
        </CardHeader>
        <CardContent>
          <EfficiencyTrendChart data={analyticsData.efficiencyTrend} />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-lg font-semibold">最近のアクティビティ</h3>
        </CardHeader>
        <CardContent>
          <RecentActivityList workHours={workHours.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
};

const EfficiencyTab: React.FC<{ analyticsData: any; workHours: EnhancedWorkHours[] }> = ({
  analyticsData,
  workHours,
}) => {
  return (
    <div className="space-y-6">
      {/* Efficiency by Category */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">カテゴリ別効率性</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.efficiencyByCategory.map((category: any) => (
              <div key={category.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{category.name}</span>
                  <Badge
                    variant={category.efficiency >= 90 ? "default" : category.efficiency >= 75 ? "secondary" : "destructive"}
                  >
                    {category.efficiency.toFixed(1)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      category.efficiency >= 90 ? "bg-green-500" :
                      category.efficiency >= 75 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(category.efficiency, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">効率性上位プロジェクト</h3>
          </CardHeader>
          <CardContent>
            <PerformanceList projects={analyticsData.topPerformers} isTopPerformers={true} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">改善要プロジェクト</h3>
          </CardHeader>
          <CardContent>
            <PerformanceList projects={analyticsData.bottomPerformers} isTopPerformers={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const CostsTab: React.FC<{ analyticsData: any; workHours: EnhancedWorkHours[] }> = ({
  analyticsData,
  workHours,
}) => {
  return (
    <div className="space-y-6">
      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">コスト内訳</h3>
          </CardHeader>
          <CardContent>
            <CostBreakdownChart data={analyticsData.costBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">予算 vs 実績</h3>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart data={analyticsData.budgetComparison} />
          </CardContent>
        </Card>
      </div>

      {/* Cost Variance Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">コスト差異分析</h3>
        </CardHeader>
        <CardContent>
          <CostVarianceTable workHours={workHours} />
        </CardContent>
      </Card>
    </div>
  );
};

const ProductivityTab: React.FC<{
  workers: Worker[];
  machines: Machine[];
  statistics: WorkHoursStatistics;
  analyticsData: any;
}> = ({ workers, machines, statistics, analyticsData }) => {
  return (
    <div className="space-y-6">
      {/* Worker Productivity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">作業者生産性</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.byWorker.map((worker) => (
              <div key={worker.workerId} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium">{worker.workerName}</div>
                    <div className="text-sm text-gray-500">{worker.totalHours.toFixed(1)}h</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">効率性</span>
                    <Badge
                      variant={worker.efficiency >= 90 ? "default" : worker.efficiency >= 75 ? "secondary" : "destructive"}
                    >
                      {worker.efficiency.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        worker.efficiency >= 90 ? "bg-green-500" :
                        worker.efficiency >= 75 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(worker.efficiency, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Machine Utilization */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">機械稼働率</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.byMachine.map((machine) => (
              <div key={machine.machineId} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  <div>
                    <div className="font-medium">{machine.machineName}</div>
                    <div className="text-sm text-gray-500">{machine.totalHours.toFixed(1)}h</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">稼働率</span>
                    <Badge
                      variant={machine.utilizationRate >= 80 ? "default" : machine.utilizationRate >= 60 ? "secondary" : "destructive"}
                    >
                      {machine.utilizationRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        machine.utilizationRate >= 80 ? "bg-green-500" :
                        machine.utilizationRate >= 60 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(machine.utilizationRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProjectsTab: React.FC<{ workHours: EnhancedWorkHours[]; analyticsData: any }> = ({
  workHours,
  analyticsData,
}) => {
  const [sortBy, setSortBy] = useState<"efficiency" | "cost" | "progress">("efficiency");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedProjects = useMemo(() => {
    const projects = workHours.map(wh => ({
      ...wh,
      efficiency: wh.plannedHours.total > 0 ? (wh.actualHours.total / wh.plannedHours.total) * 100 : 0,
      costVariance: wh.budget.totalPlannedCost > 0 
        ? ((wh.budget.totalActualCost - wh.budget.totalPlannedCost) / wh.budget.totalPlannedCost) * 100 
        : 0,
    }));

    return projects.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "efficiency":
          comparison = a.efficiency - b.efficiency;
          break;
        case "cost":
          comparison = a.costVariance - b.costVariance;
          break;
        case "progress":
          comparison = a.actualHours.total - b.actualHours.total;
          break;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [workHours, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">並び替え:</span>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efficiency">効率性</SelectItem>
            <SelectItem value="cost">コスト差異</SelectItem>
            <SelectItem value="progress">進捗</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "desc" ? "降順" : "昇順"}
        </Button>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">プロジェクト一覧</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">プロジェクト</th>
                  <th className="text-left p-3">クライアント</th>
                  <th className="text-left p-3">ステータス</th>
                  <th className="text-left p-3">効率性</th>
                  <th className="text-left p-3">コスト差異</th>
                  <th className="text-left p-3">進捗</th>
                  <th className="text-left p-3">リスク</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{project.projectName}</div>
                      <div className="text-xs text-gray-500">{project.managementNumber}</div>
                    </td>
                    <td className="p-3">{project.client}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          project.status === "completed" ? "default" :
                          project.status === "in-progress" ? "secondary" :
                          project.status === "delayed" ? "destructive" : "outline"
                        }
                      >
                        {getStatusLabel(project.status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          project.efficiency <= 100 ? "text-green-600" :
                          project.efficiency <= 120 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {project.efficiency.toFixed(1)}%
                        </span>
                        {project.efficiency <= 100 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : project.efficiency <= 120 ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`font-medium ${
                        project.costVariance <= 0 ? "text-green-600" :
                        project.costVariance <= 10 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {project.costVariance >= 0 ? "+" : ""}{project.costVariance.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              project.plannedHours.total > 0 
                                ? (project.actualHours.total / project.plannedHours.total) * 100 
                                : 0,
                              100
                            )}%`
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          project.efficiency <= 100 && project.costVariance <= 0 ? "default" :
                          project.efficiency <= 120 && project.costVariance <= 10 ? "secondary" : "destructive"
                        }
                      >
                        {project.efficiency <= 100 && project.costVariance <= 0 ? "低" :
                         project.efficiency <= 120 && project.costVariance <= 10 ? "中" : "高"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const calculateAnalytics = (workHours: EnhancedWorkHours[], workers: Worker[], machines: Machine[]) => {
  // Calculate overall metrics
  const totalPlannedHours = workHours.reduce((sum, wh) => sum + wh.plannedHours.total, 0);
  const totalActualHours = workHours.reduce((sum, wh) => sum + wh.actualHours.total, 0);
  const totalPlannedCost = workHours.reduce((sum, wh) => sum + wh.budget.totalPlannedCost, 0);
  const totalActualCost = workHours.reduce((sum, wh) => sum + wh.budget.totalActualCost, 0);

  const overallEfficiency = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;
  const costVariancePercentage = totalPlannedCost > 0 
    ? ((totalActualCost - totalPlannedCost) / totalPlannedCost) * 100 
    : 0;
  const completionRate = workHours.length > 0 
    ? (workHours.filter(wh => wh.status === "completed").length / workHours.length) * 100 
    : 0;

  // Calculate efficiency by category
  const efficiencyByCategory = [
    {
      name: "段取り",
      planned: workHours.reduce((sum, wh) => sum + wh.plannedHours.setup, 0),
      actual: workHours.reduce((sum, wh) => sum + wh.actualHours.setup, 0),
    },
    {
      name: "機械加工",
      planned: workHours.reduce((sum, wh) => sum + wh.plannedHours.machining, 0),
      actual: workHours.reduce((sum, wh) => sum + wh.actualHours.machining, 0),
    },
    {
      name: "仕上げ",
      planned: workHours.reduce((sum, wh) => sum + wh.plannedHours.finishing, 0),
      actual: workHours.reduce((sum, wh) => sum + wh.actualHours.finishing, 0),
    },
  ].map(category => ({
    ...category,
    efficiency: category.planned > 0 ? (category.actual / category.planned) * 100 : 0,
  }));

  // Identify top and bottom performers
  const projectPerformances = workHours.map(wh => ({
    id: wh.id,
    projectName: wh.projectName,
    client: wh.client,
    efficiency: wh.plannedHours.total > 0 ? (wh.actualHours.total / wh.plannedHours.total) * 100 : 0,
    costVariance: wh.budget.totalPlannedCost > 0 
      ? ((wh.budget.totalActualCost - wh.budget.totalPlannedCost) / wh.budget.totalPlannedCost) * 100 
      : 0,
  }));

  const topPerformers = projectPerformances
    .sort((a, b) => a.efficiency - b.efficiency)
    .slice(0, 5);

  const bottomPerformers = projectPerformances
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 5);

  return {
    overallEfficiency,
    costVariancePercentage,
    completionRate,
    efficiencyByCategory,
    topPerformers,
    bottomPerformers,
    costBreakdown: [],
    budgetComparison: [],
    efficiencyTrend: [],
  };
};

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    planning: "計画中",
    "in-progress": "進行中",
    completed: "完了",
    delayed: "遅延",
  };
  return statusLabels[status] || status;
};

// =============================================================================
// CHART COMPONENTS (Placeholder implementations)
// =============================================================================

const StatusDistributionChart: React.FC<{ workHours: EnhancedWorkHours[] }> = ({ workHours }) => {
  const statusCounts = workHours.reduce((acc, wh) => {
    acc[wh.status] = (acc[wh.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {Object.entries(statusCounts).map(([status, count]) => (
        <div key={status} className="flex items-center justify-between">
          <span className="text-sm font-medium">{getStatusLabel(status)}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${(count / workHours.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{count}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const EfficiencyTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="flex items-center justify-center h-48 text-gray-500">
      <div className="text-center">
        <LineChart className="w-12 h-12 mx-auto mb-2" />
        <p>効率性トレンドチャート</p>
        <p className="text-xs">実装予定</p>
      </div>
    </div>
  );
};

const CostBreakdownChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="flex items-center justify-center h-48 text-gray-500">
      <div className="text-center">
        <PieChart className="w-12 h-12 mx-auto mb-2" />
        <p>コスト内訳チャート</p>
        <p className="text-xs">実装予定</p>
      </div>
    </div>
  );
};

const BudgetVsActualChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="flex items-center justify-center h-48 text-gray-500">
      <div className="text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-2" />
        <p>予算対実績チャート</p>
        <p className="text-xs">実装予定</p>
      </div>
    </div>
  );
};

const CostVarianceTable: React.FC<{ workHours: EnhancedWorkHours[] }> = ({ workHours }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">プロジェクト</th>
            <th className="text-left p-3">予定コスト</th>
            <th className="text-left p-3">実績コスト</th>
            <th className="text-left p-3">差異</th>
            <th className="text-left p-3">差異率</th>
          </tr>
        </thead>
        <tbody>
          {workHours.slice(0, 10).map((wh) => {
            const variance = wh.budget.totalActualCost - wh.budget.totalPlannedCost;
            const variancePercentage = wh.budget.totalPlannedCost > 0 
              ? (variance / wh.budget.totalPlannedCost) * 100 
              : 0;

            return (
              <tr key={wh.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{wh.projectName}</td>
                <td className="p-3">¥{wh.budget.totalPlannedCost.toLocaleString()}</td>
                <td className="p-3">¥{wh.budget.totalActualCost.toLocaleString()}</td>
                <td className="p-3">
                  <span className={variance >= 0 ? "text-red-600" : "text-green-600"}>
                    {variance >= 0 ? "+" : ""}¥{variance.toLocaleString()}
                  </span>
                </td>
                <td className="p-3">
                  <span className={variancePercentage >= 0 ? "text-red-600" : "text-green-600"}>
                    {variancePercentage >= 0 ? "+" : ""}{variancePercentage.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PerformanceList: React.FC<{ projects: any[]; isTopPerformers: boolean }> = ({
  projects,
  isTopPerformers,
}) => {
  return (
    <div className="space-y-3">
      {projects.map((project, index) => (
        <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              isTopPerformers ? "bg-green-500" : "bg-red-500"
            }`}>
              {index + 1}
            </div>
            <div>
              <div className="font-medium text-sm">{project.projectName}</div>
              <div className="text-xs text-gray-500">{project.client}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium text-sm ${
              project.efficiency <= 100 ? "text-green-600" :
              project.efficiency <= 120 ? "text-yellow-600" : "text-red-600"
            }`}>
              {project.efficiency.toFixed(1)}%
            </div>
            <div className={`text-xs ${
              project.costVariance <= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {project.costVariance >= 0 ? "+" : ""}{project.costVariance.toFixed(1)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const RecentActivityList: React.FC<{ workHours: EnhancedWorkHours[] }> = ({ workHours }) => {
  return (
    <div className="space-y-3">
      {workHours.map((wh) => (
        <div key={wh.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium text-sm">{wh.projectName}</div>
              <div className="text-xs text-gray-500">
                {wh.client} • 最終更新: {new Date(wh.updatedAt).toLocaleDateString('ja-JP')}
              </div>
            </div>
          </div>
          <Badge
            variant={
              wh.status === "completed" ? "default" :
              wh.status === "in-progress" ? "secondary" :
              wh.status === "delayed" ? "destructive" : "outline"
            }
          >
            {getStatusLabel(wh.status)}
          </Badge>
        </div>
      ))}
    </div>
  );
};

export default WorkHoursAnalytics;