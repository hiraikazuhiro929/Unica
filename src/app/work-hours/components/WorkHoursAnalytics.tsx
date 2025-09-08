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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">工数分析ダッシュボード</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
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
    blue: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
    green: "border-l-green-500 bg-green-50/50 dark:bg-green-900/10",
    red: "border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
    purple: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10",
    yellow: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10",
  };

  const textColorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    purple: "text-purple-600 dark:text-purple-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  };

  return (
    <Card className={`border-l-4 ${colorClasses[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold ${textColorClasses[color]}`}>{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span
                  className={`text-xs ${
                    trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              </div>
            )}
          </div>
          <div className="ml-3">
            {icon}
          </div>
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
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
        <CardHeader>
          <h3 className="text-lg font-semibold">ステータス分布</h3>
        </CardHeader>
        <CardContent>
          <StatusDistributionChart workHours={workHours} />
        </CardContent>
      </Card>

      {/* Efficiency Trend */}
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
        <CardHeader>
          <h3 className="text-lg font-semibold">効率性トレンド</h3>
        </CardHeader>
        <CardContent>
          <EfficiencyTrendChart data={analyticsData.efficiencyTrend} />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="lg:col-span-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
        <CardHeader>
          <h3 className="text-lg font-semibold">カテゴリ別効率性</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.efficiencyByCategory.map((category: any) => (
              <div key={category.name} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{category.name}</span>
                  <Badge
                    variant={category.efficiency >= 90 ? "default" : category.efficiency >= 75 ? "secondary" : "destructive"}
                  >
                    {category.efficiency.toFixed(1)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
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
        <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <CardHeader>
            <h3 className="text-lg font-semibold">効率性上位プロジェクト</h3>
          </CardHeader>
          <CardContent>
            <PerformanceList projects={analyticsData.topPerformers} isTopPerformers={true} />
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
        <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <CardHeader>
            <h3 className="text-lg font-semibold">コスト内訳</h3>
          </CardHeader>
          <CardContent>
            <CostBreakdownChart data={analyticsData.costBreakdown} />
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <CardHeader>
            <h3 className="text-lg font-semibold">予算 vs 実績</h3>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart data={analyticsData.budgetComparison} />
          </CardContent>
        </Card>
      </div>

      {/* Cost Variance Analysis */}
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
        <CardHeader>
          <h3 className="text-lg font-semibold">作業者生産性</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.byWorker.map((worker) => (
              <div key={worker.workerId} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{worker.workerName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{worker.totalHours.toFixed(1)}h</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">効率性</span>
                    <Badge
                      variant={worker.efficiency >= 90 ? "default" : worker.efficiency >= 75 ? "secondary" : "destructive"}
                    >
                      {worker.efficiency.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
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
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
      <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
                  <tr key={project.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700/50">
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
  // 効率性データの計算
  const efficiencyData = data.slice(-7).map((item, index) => {
    const estimatedHours = item.estimatedHours || 8;
    const actualHours = item.hours || estimatedHours;
    const efficiency = estimatedHours > 0 ? (estimatedHours / actualHours) * 100 : 100;
    
    return {
      date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      }),
      efficiency: Math.min(Math.max(efficiency, 20), 200), // 20-200%の範囲に制限
      actualHours,
      estimatedHours,
    };
  });

  const maxEfficiency = Math.max(...efficiencyData.map(d => d.efficiency));
  const minEfficiency = Math.min(...efficiencyData.map(d => d.efficiency));

  return (
    <div className="h-48 p-4">
      <div className="h-full relative">
        {/* Y軸ラベル */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
          <span>{Math.ceil(maxEfficiency)}%</span>
          <span>100%</span>
          <span>{Math.floor(minEfficiency)}%</span>
        </div>
        
        {/* チャートエリア */}
        <div className="ml-8 h-full flex items-end justify-between">
          {efficiencyData.map((point, index) => {
            const height = ((point.efficiency - minEfficiency) / (maxEfficiency - minEfficiency)) * 140;
            const isGood = point.efficiency >= 90 && point.efficiency <= 110;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 mx-1">
                <div className="relative h-36 flex items-end mb-2">
                  <div
                    className={`w-2 rounded-t transition-all duration-300 ${
                      isGood ? 'bg-green-500' : point.efficiency > 110 ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ height: `${height}px` }}
                    title={`効率性: ${point.efficiency.toFixed(1)}%\n予定: ${point.estimatedHours}h\n実績: ${point.actualHours}h`}
                  />
                  {/* 100%ライン */}
                  {index === 0 && (
                    <div 
                      className="absolute left-0 right-0 border-t border-dashed border-gray-300"
                      style={{ 
                        bottom: `${((100 - minEfficiency) / (maxEfficiency - minEfficiency)) * 140}px` 
                      }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500 transform -rotate-45 origin-center">
                  {point.date}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* 凡例 */}
        <div className="absolute bottom-0 right-0 flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-600">最適(90-110%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-gray-600">高効率(110%+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-gray-600">要改善(90%未満)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CostBreakdownChart: React.FC<{ data: any[] }> = ({ data }) => {
  // コストデータの集計
  const costBreakdown = data.reduce((acc, item) => {
    const category = item.category || '一般作業';
    const hours = item.hours || 0;
    const hourlyRate = item.hourlyRate || 3000; // デフォルト時給
    const cost = hours * hourlyRate;
    
    acc[category] = (acc[category] || 0) + cost;
    return acc;
  }, {} as Record<string, number>);

  const totalCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);
  
  // 上位5カテゴリーを取得
  const sortedCategories = Object.entries(costBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500'
  ];

  const borderColors = [
    'border-blue-500',
    'border-green-500',
    'border-yellow-500', 
    'border-purple-500',
    'border-pink-500'
  ];

  return (
    <div className="h-48 p-4 flex items-center">
      {totalCost === 0 ? (
        <div className="flex items-center justify-center w-full text-gray-500">
          <div className="text-center">
            <PieChart className="w-12 h-12 mx-auto mb-2" />
            <p>コストデータなし</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center w-full">
          {/* 円グラフ部分（簡易版） */}
          <div className="relative w-32 h-32 mr-6">
            <div className="w-32 h-32 rounded-full border-4 border-gray-200 relative overflow-hidden">
              {sortedCategories.map(([category, cost], index) => {
                const percentage = (cost / totalCost) * 100;
                const rotation = sortedCategories.slice(0, index).reduce((sum, [,prevCost]) => 
                  sum + (prevCost / totalCost) * 360, 0
                );
                
                return (
                  <div
                    key={category}
                    className={`absolute inset-0 ${colors[index]} opacity-80`}
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${
                        50 + 50 * Math.cos((rotation + percentage * 3.6) * Math.PI / 180)
                      }% ${
                        50 + 50 * Math.sin((rotation + percentage * 3.6) * Math.PI / 180)
                      }%, 50% 50%)`
                    }}
                  />
                );
              })}
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-semibold">総額</div>
                  <div className="text-sm">¥{Math.round(totalCost / 1000)}K</div>
                </div>
              </div>
            </div>
          </div>

          {/* 凡例 */}
          <div className="flex-1 space-y-2">
            {sortedCategories.map(([category, cost], index) => {
              const percentage = (cost / totalCost) * 100;
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <div className={`w-3 h-3 rounded-full ${colors[index]}`} />
                    <span className="text-sm text-gray-700 truncate">{category}</span>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-sm font-medium">¥{cost.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
            
            {/* その他の合計 */}
            {sortedCategories.length < Object.keys(costBreakdown).length && (
              <div className="flex items-center justify-between border-t pt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-700">その他</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ¥{(totalCost - sortedCategories.reduce((sum, [,cost]) => sum + cost, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BudgetVsActualChart: React.FC<{ data: any[] }> = ({ data }) => {
  // プロジェクト別の予算対実績データを集計
  const projectData = data.reduce((acc, item) => {
    const projectName = item.relatedOrderTitle || 'その他';
    const hours = item.hours || 0;
    const estimatedHours = item.estimatedHours || hours;
    const hourlyRate = item.hourlyRate || 3000;
    
    if (!acc[projectName]) {
      acc[projectName] = { 
        budget: 0, 
        actual: 0, 
        budgetHours: 0, 
        actualHours: 0 
      };
    }
    
    acc[projectName].budget += estimatedHours * hourlyRate;
    acc[projectName].actual += hours * hourlyRate;
    acc[projectName].budgetHours += estimatedHours;
    acc[projectName].actualHours += hours;
    
    return acc;
  }, {} as Record<string, { budget: number; actual: number; budgetHours: number; actualHours: number }>);

  // 上位5プロジェクトを取得
  const sortedProjects = Object.entries(projectData)
    .sort(([,a], [,b]) => (b.budget + b.actual) - (a.budget + a.actual))
    .slice(0, 5);

  if (sortedProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-2" />
          <p>プロジェクトデータなし</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...sortedProjects.flatMap(([,data]) => [data.budget, data.actual]));

  return (
    <div className="h-48 p-4">
      <div className="h-full flex items-end justify-between space-x-4">
        {sortedProjects.map(([projectName, projectData]) => {
          const budgetHeight = (projectData.budget / maxValue) * 140;
          const actualHeight = (projectData.actual / maxValue) * 140;
          const variance = ((projectData.actual - projectData.budget) / projectData.budget) * 100;
          const isOverBudget = variance > 10;
          const isUnderBudget = variance < -10;
          
          return (
            <div key={projectName} className="flex flex-col items-center flex-1 min-w-0">
              {/* バーチャート */}
              <div className="flex items-end space-x-1 mb-2 h-36">
                {/* 予算バー */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-6 bg-blue-200 border border-blue-300 rounded-t"
                    style={{ height: `${budgetHeight}px` }}
                    title={`予算: ¥${projectData.budget.toLocaleString()} (${projectData.budgetHours}h)`}
                  />
                  <span className="text-xs text-blue-600 mt-1">予算</span>
                </div>
                
                {/* 実績バー */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 rounded-t border ${
                      isOverBudget ? 'bg-red-400 border-red-500' :
                      isUnderBudget ? 'bg-green-400 border-green-500' :
                      'bg-blue-400 border-blue-500'
                    }`}
                    style={{ height: `${actualHeight}px` }}
                    title={`実績: ¥${projectData.actual.toLocaleString()} (${projectData.actualHours}h)`}
                  />
                  <span className={`text-xs mt-1 ${
                    isOverBudget ? 'text-red-600' :
                    isUnderBudget ? 'text-green-600' :
                    'text-blue-600'
                  }`}>実績</span>
                </div>
              </div>
              
              {/* プロジェクト名 */}
              <div className="text-center">
                <div className="text-xs text-gray-700 truncate max-w-20" title={projectName}>
                  {projectName.length > 8 ? projectName.substring(0, 8) + '...' : projectName}
                </div>
                
                {/* 差異表示 */}
                <div className={`text-xs font-medium mt-1 ${
                  isOverBudget ? 'text-red-600' :
                  isUnderBudget ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Y軸ラベル */}
      <div className="absolute left-0 top-4 h-36 flex flex-col justify-between text-xs text-gray-400">
        <span>¥{Math.round(maxValue / 1000)}K</span>
        <span>¥{Math.round(maxValue / 2000)}K</span>
        <span>¥0</span>
      </div>
      
      {/* 凡例 */}
      <div className="flex justify-center mt-4 space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-200 border border-blue-300" />
          <span>予算</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-400 border border-blue-500" />
          <span>実績(適正)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-400 border border-red-500" />
          <span>予算超過</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-400 border border-green-500" />
          <span>予算内</span>
        </div>
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
              <tr key={wh.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700/50">
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
        <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
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