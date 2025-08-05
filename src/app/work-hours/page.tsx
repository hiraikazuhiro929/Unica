"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Clock,
  Search,
  Filter,
  Plus,
  Users,
  Settings,
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
  Edit,
  Eye,
  ArrowRight,
  Trash2,
  Building2,
  FileText,
} from "lucide-react";

// Import types from existing types file
import type { 
  WorkHours, 
  EnhancedWorkHours,
  Worker, 
  Machine, 
  WorkHoursStatistics,
  SyncResult,
  WorkHoursAdjustment,
  WorkHoursApprovalWorkflow
} from "@/app/tasks/types";
import { getClientColor } from "@/app/tasks/constants";
import {
  getWorkHoursList,
  subscribeToWorkHoursList,
  updateWorkHours,
  createWorkHours,
  deleteWorkHours
} from "@/lib/firebase/workHours";
import { useDailyReportSync } from '@/app/work-hours/hooks/useDailyReportSync';
import { WorkHoursEditModal } from '@/app/work-hours/components/WorkHoursEditModal';
import { AnalyticsCharts } from '@/app/work-hours/components/AnalyticsCharts';

const WorkHoursManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProcessId = searchParams?.get('fromProcess') || null;
  const fromOrderId = searchParams?.get('orderId') || null;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<WorkHours["status"] | "all">("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWorkHours, setSelectedWorkHours] = useState<EnhancedWorkHours | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processInfo, setProcessInfo] = useState<any>(null);
  
  // Firebase integration
  const [workHoursData, setWorkHoursData] = useState<EnhancedWorkHours[]>([]);
  const { syncStats, isSyncing, syncError, triggerManualSync, resetSyncStats } = useDailyReportSync();

  // Sample data - in real implementation, this would come from Firebase
  const sampleWorkHoursData: EnhancedWorkHours[] = [
    {
      id: "wh-001",
      orderId: "1",
      processId: "proc-001",
      projectName: "A社製品カバー加工",
      client: "A株式会社",
      managementNumber: "ORD-2025-001",
      plannedHours: {
        setup: 4,
        machining: 12,
        finishing: 6,
        total: 22,
      },
      actualHours: {
        setup: 5.5,
        machining: 14,
        finishing: 6.5,
        total: 26,
      },
      budget: {
        estimatedAmount: 500000,
        setupRate: 3000,
        machiningRate: 4000,
        finishingRate: 3500,
        totalPlannedCost: 83000,
        totalActualCost: 93500,
      },
      status: "completed",
      createdAt: "2025-01-15T09:00:00Z",
      updatedAt: "2025-01-30T16:30:00Z",
      version: 2,
      locked: false,
      priority: "high",
      tags: ["urgent", "automotive"],
      integrations: {
        processId: "proc-001",
        dailyReportIds: ["dr-001", "dr-002"],
        adjustmentIds: []
      },
      lastSyncedAt: "2025-01-30T16:30:00Z",
      syncSource: "daily-report"
    },
    {
      id: "wh-002",
      orderId: "2",
      processId: "proc-002",
      projectName: "B社部品製作",
      client: "B工業株式会社",
      managementNumber: "ORD-2025-002",
      plannedHours: {
        setup: 3,
        machining: 16,
        finishing: 8,
        total: 27,
      },
      actualHours: {
        setup: 3,
        machining: 12,
        finishing: 6,
        total: 21,
      },
      budget: {
        estimatedAmount: 750000,
        setupRate: 3000,
        machiningRate: 4000,
        finishingRate: 3500,
        totalPlannedCost: 101000,
        totalActualCost: 85000,
      },
      status: "in-progress",
      createdAt: "2025-01-20T08:30:00Z",
      updatedAt: "2025-01-31T14:15:00Z",
      version: 1,
      locked: false,
      priority: "medium",
      tags: ["industrial"],
      integrations: {
        processId: "proc-002",
        dailyReportIds: ["dr-003"],
        adjustmentIds: []
      },
      lastSyncedAt: "2025-01-31T14:15:00Z",
      syncSource: "manual"
    },
    {
      id: "wh-003",
      orderId: "3",
      processId: "proc-003",
      projectName: "C社機械部品",
      client: "C製作所",
      managementNumber: "ORD-2025-003",
      plannedHours: {
        setup: 6,
        machining: 24,
        finishing: 10,
        total: 40,
      },
      actualHours: {
        setup: 0,
        machining: 0,
        finishing: 0,
        total: 0,
      },
      budget: {
        estimatedAmount: 1200000,
        setupRate: 3000,
        machiningRate: 4000,
        finishingRate: 3500,
        totalPlannedCost: 149000,
        totalActualCost: 0,
      },
      status: "planning",
      createdAt: "2025-01-25T10:00:00Z",
      updatedAt: "2025-01-25T10:00:00Z",
      version: 1,
      locked: false,
      priority: "low",
      tags: ["precision"],
      integrations: {
        processId: "proc-003",
        dailyReportIds: [],
        adjustmentIds: []
      },
      lastSyncedAt: "2025-01-25T10:00:00Z",
      syncSource: "manual"
    },
  ];

  // Load work hours data from Firebase
  useEffect(() => {
    loadWorkHoursData();
  }, []);

  // 工程情報からの工数作成処理
  useEffect(() => {
    if (fromProcessId && !processInfo) {
      fetchProcessInfo(fromProcessId);
    }
  }, [fromProcessId, processInfo]);

  // 受注IDがある場合の関連データ取得
  useEffect(() => {
    if (fromOrderId) {
      loadOrderRelatedData(fromOrderId);
    }
  }, [fromOrderId]);

  const fetchProcessInfo = async (processId: string) => {
    try {
      // Firebase から工程情報を取得
      const { getProcess } = await import('@/lib/firebase/processes');
      const processResult = await getProcess(processId);
      
      let processInfoToUse: any;
      
      if (processResult.data) {
        const processData = processResult.data;
        setProcessInfo(processData);
        processInfoToUse = processData;
        
        // 工程情報に基づく工数データが既に存在するかチェック
        const existingWorkHours = workHoursData.find(wh => wh.processId === processId);
        if (existingWorkHours) {
          setSelectedWorkHours(existingWorkHours);
          console.log(`工程「${processData.projectName}」の工数データが見つかりました`);
          return;
        }
      } else {
        console.warn('工程情報の取得に失敗しました:', processResult.error);
        // フォールバック：模擬データ
        const mockProcessInfo = {
          id: processId,
          projectName: "工程からの工数作成",
          client: "クライアント名",
          managementNumber: `PROC-2025-${processId.slice(-3)}`,
          orderId: fromOrderId,
          workDetails: {
            setup: 4,
            machining: 12,
            finishing: 6,
          },
          deliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
        setProcessInfo(mockProcessInfo);
        processInfoToUse = mockProcessInfo;
      }
      
      // 工程情報に基づく新規工数を自動作成
      const newWorkHours = {
        orderId: processInfoToUse.orderId || '',
        processId: processInfoToUse.id,
        projectName: processInfoToUse.projectName,
        client: processInfoToUse.client,
        managementNumber: processInfoToUse.managementNumber,
        plannedHours: {
          setup: processInfoToUse.workDetails?.setup || 4,
          machining: processInfoToUse.workDetails?.machining || 12,
          finishing: processInfoToUse.workDetails?.finishing || 6,
          total: (processInfoToUse.workDetails?.setup || 4) + (processInfoToUse.workDetails?.machining || 12) + (processInfoToUse.workDetails?.finishing || 6),
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
          totalPlannedCost: ((processInfoToUse.workDetails?.setup || 4) * 3000) + ((processInfoToUse.workDetails?.machining || 12) * 4000) + ((processInfoToUse.workDetails?.finishing || 6) * 3500),
          totalActualCost: 0,
        },
        status: "planning" as const,
        priority: "medium" as const,
        tags: [],
        integrations: {
          processId: processInfoToUse.id,
          dailyReportIds: [],
          adjustmentIds: []
        }
      };
      
      setSelectedWorkHours(newWorkHours as EnhancedWorkHours);
      setShowEditModal(true);
    } catch (error) {
      console.error('工程情報の取得に失敗しました:', error);
    }
  };

  const loadOrderRelatedData = async (orderId: string) => {
    try {
      // Firebase から受注情報を取得
      const { getOrder } = await import('@/lib/firebase/orders');
      const orderResult = await getOrder(orderId);
      
      if (orderResult.success && orderResult.data) {
        const orderData = orderResult.data;
        
        // 受注データに基づく工数情報がある場合の処理
        const relatedWorkHours = workHoursData.filter(wh => wh.orderId === orderId);
        
        if (relatedWorkHours.length > 0) {
          console.log(`受注案件「${orderData.projectName}」に関連する工数データが ${relatedWorkHours.length} 件見つかりました`);
          
          // 統計情報の表示用に受注情報を設定
          setProcessInfo({
            ...orderData,
            relatedWorkHours: relatedWorkHours,
            isOrderContext: true
          });
        }
      }
    } catch (error) {
      console.error('受注関連データの取得に失敗しました:', error);
    }
  };

  const loadWorkHoursData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await getWorkHoursList({ limit: 100 });
      if (error) {
        setError(error);
      } else {
        setWorkHoursData(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work hours data');
    } finally {
      setIsLoading(false);
    }
  };

  // Use Firebase data if available, otherwise use sample data
  const displayWorkHours = workHoursData.length > 0 ? workHoursData : sampleWorkHoursData;

  const [workers] = useState<Worker[]>([
    { id: "w1", name: "田中太郎", department: "加工部", hourlyRate: 3500, skills: ["旋盤", "フライス"] },
    { id: "w2", name: "佐藤花子", department: "仕上部", hourlyRate: 3200, skills: ["仕上げ", "検査"] },
    { id: "w3", name: "鈴木一郎", department: "加工部", hourlyRate: 4000, skills: ["NC加工", "設計"] },
  ]);

  const [machines] = useState<Machine[]>([
    { id: "m1", name: "NC旋盤-001", type: "NC旋盤", hourlyRate: 2000, status: "available" },
    { id: "m2", name: "マシニングセンタ-001", type: "マシニングセンタ", hourlyRate: 3000, status: "busy" },
    { id: "m3", name: "フライス盤-001", type: "フライス盤", hourlyRate: 1500, status: "available" },
  ]);

  // Real-time subscription to work hours changes
  useEffect(() => {
    const unsubscribe = subscribeToWorkHoursList(
      { limit: 100 },
      (data) => {
        setWorkHoursData(data);
      }
    );
    
    return unsubscribe;
  }, []);

  // Filter and search logic
  const filteredWorkHours = displayWorkHours.filter((wh) => {
    const matchesSearch = 
      wh.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.managementNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || wh.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const calculateStatistics = (): WorkHoursStatistics => {
    const totalProjects = displayWorkHours.length;
    const totalPlannedHours = displayWorkHours.reduce((sum, wh) => sum + wh.plannedHours.total, 0);
    const totalActualHours = displayWorkHours.reduce((sum, wh) => sum + wh.actualHours.total, 0);
    const totalPlannedCost = displayWorkHours.reduce((sum, wh) => sum + wh.budget.totalPlannedCost, 0);
    const totalActualCost = displayWorkHours.reduce((sum, wh) => sum + wh.budget.totalActualCost, 0);
    const averageEfficiency = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;

    const byStatus = {
      planning: displayWorkHours.filter(wh => wh.status === "planning").length,
      inProgress: displayWorkHours.filter(wh => wh.status === "in-progress").length,
      completed: displayWorkHours.filter(wh => wh.status === "completed").length,
      delayed: displayWorkHours.filter(wh => wh.status === "delayed").length,
    };

    return {
      totalProjects,
      totalPlannedHours,
      totalActualHours,
      totalPlannedCost,
      totalActualCost,
      averageEfficiency,
      byStatus,
      // Worker and machine utilization would be calculated from daily reports
      byWorker: workers.map(worker => ({
        workerId: worker.id,
        workerName: worker.name,
        totalHours: Math.random() * 40, // Mock data
        efficiency: 85 + Math.random() * 20
      })),
      byMachine: machines.map(machine => ({
        machineId: machine.id,
        machineName: machine.name,
        utilizationRate: 60 + Math.random() * 35,
        totalHours: Math.random() * 30
      }))
    };
  };

  const statistics = calculateStatistics();

  const getStatusBadge = (status: WorkHours["status"]) => {
    switch (status) {
      case "planning":
        return <Badge variant="secondary">計画中</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="border-blue-500 text-blue-600">進行中</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">完了</Badge>;
      case "delayed":
        return <Badge variant="destructive">遅延</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEfficiencyIndicator = (planned: number, actual: number) => {
    if (actual === 0) return null;
    const efficiency = (actual / planned) * 100;
    if (efficiency <= 100) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (efficiency <= 120) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };

  // Enhanced action handlers
  const handleSaveWorkHours = async (workHoursData: Partial<EnhancedWorkHours>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedWorkHours?.id) {
        // Update existing
        const { error } = await updateWorkHours(
          selectedWorkHours.id,
          workHoursData,
          {
            triggeredBy: 'user',
            source: 'manual',
            reason: 'Manual update from work hours management'
          }
        );
        if (error) {
          setError(error);
        } else {
          setShowEditModal(false);
          setSelectedWorkHours(null);
        }
      } else {
        // Create new
        const { id, error } = await createWorkHours(workHoursData as Omit<WorkHours, 'id' | 'createdAt' | 'updatedAt'>);
        if (error) {
          setError(error);
        } else {
          setShowEditModal(false);
          setSelectedWorkHours(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save work hours');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkHours = async (id: string) => {
    if (!confirm('この工数レコードを削除しますか？この操作は取り消せません。')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await deleteWorkHours(id, 'user');
      if (error) {
        setError(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete work hours');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncWithDailyReports = async () => {
    setShowSyncModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  工数管理
                  {fromProcessId && (
                    <span className="ml-3 text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded">
                      工程から作成中
                    </span>
                  )}
                  {fromOrderId && (
                    <span className="ml-3 text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      受注案件から参照中
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  計画と実績の工数を管理し、プロジェクトの効率性を追跡します
                </p>
                {processInfo && !processInfo.isOrderContext && (
                  <p className="text-blue-700 font-medium text-sm mt-1">
                    関連工程: {processInfo.managementNumber} - {processInfo.projectName}
                  </p>
                )}
                {processInfo && processInfo.isOrderContext && (
                  <div className="mt-2">
                    <p className="text-blue-700 font-medium text-sm">
                      受注案件: {processInfo.managementNumber} - {processInfo.projectName}
                    </p>
                    {processInfo.relatedWorkHours && processInfo.relatedWorkHours.length > 0 && (
                      <p className="text-green-600 font-medium text-sm">
                        関連工数データ: {processInfo.relatedWorkHours.length} 件
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="工数データを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-purple-500"
                />
              </div>
              {/* Filter */}
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as WorkHours["status"] | "all")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="planning">計画中</SelectItem>
                  <SelectItem value="in-progress">進行中</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                  <SelectItem value="delayed">遅延</SelectItem>
                </SelectContent>
              </Select>
              {/* Sync Status */}
              <div className="flex items-center gap-2">
                {syncStats.lastSyncTime && (
                  <span className="text-sm text-gray-600">
                    最終同期: {syncStats.lastSyncTime.toLocaleTimeString('ja-JP')}
                  </span>
                )}
                <Button
                  variant="outline"
                  className="border-green-300 text-green-600 hover:bg-green-50 font-medium px-4"
                  onClick={triggerManualSync}
                  disabled={isSyncing || isLoading}
                >
                  <Activity className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? '同期中...' : '日報同期'}
                </Button>
              </div>
              {/* Analytics Button */}
              <Button
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 font-medium px-4"
                onClick={() => setShowAnalyticsModal(true)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                分析
              </Button>
              {/* Add New Button */}
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6"
                onClick={() => {
                  setSelectedWorkHours(null);
                  setShowEditModal(true);
                }}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                新規作成
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">総プロジェクト</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {statistics.totalProjects}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">計画工数</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {statistics.totalPlannedHours}h
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">実績工数</p>
                    <p className="text-2xl font-bold text-green-600">
                      {statistics.totalActualHours}h
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">効率性</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {statistics.averageEfficiency.toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">コスト差異</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statistics.totalActualCost > 0 
                        ? `${((statistics.totalActualCost - statistics.totalPlannedCost) / statistics.totalPlannedCost * 100).toFixed(1)}%`
                        : "0%"
                      }
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-500 hover:text-red-700"
                onClick={() => setError(null)}
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">概要</TabsTrigger>
              <TabsTrigger value="details">詳細一覧</TabsTrigger>
              <TabsTrigger value="sync">同期管理</TabsTrigger>
              <TabsTrigger value="analytics">分析</TabsTrigger>
              <TabsTrigger value="workers">作業者</TabsTrigger>
              <TabsTrigger value="machines">機械</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Work Hours List */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">工数管理一覧</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredWorkHours.map((wh) => (
                        <div key={wh.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900">{wh.projectName}</h4>
                                {getStatusBadge(wh.status)}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">{wh.client}</span> • {wh.managementNumber}
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">計画:</span>
                                  <span className="ml-1 font-medium">{wh.plannedHours.total}h</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">実績:</span>
                                  <span className="ml-1 font-medium">{wh.actualHours.total}h</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-gray-500">効率:</span>
                                  <span className="ml-1 font-medium">
                                    {wh.actualHours.total > 0 
                                      ? `${((wh.actualHours.total / wh.plannedHours.total) * 100).toFixed(1)}%`
                                      : "N/A"
                                    }
                                  </span>
                                  {getEfficiencyIndicator(wh.plannedHours.total, wh.actualHours.total)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedWorkHours(wh);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                編集
                              </Button>
                              {wh.orderId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                  onClick={() => router.push(`/orders?highlight=${wh.orderId}`)}
                                >
                                  <Building2 className="w-3 h-3 mr-1" />
                                  受注
                                </Button>
                              )}
                              {wh.integrations?.processId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-green-300 text-green-600 hover:bg-green-50"
                                  onClick={() => router.push(`/tasks?highlight=${wh.integrations.processId}`)}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  工程詳細
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteWorkHours(wh.id)}
                                disabled={wh.locked || isLoading}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                削除
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">ステータス分布</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span>計画中</span>
                        </div>
                        <span className="font-semibold">{statistics.byStatus.planning}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>進行中</span>
                        </div>
                        <span className="font-semibold">{statistics.byStatus.inProgress}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>完了</span>
                        </div>
                        <span className="font-semibold">{statistics.byStatus.completed}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span>遅延</span>
                        </div>
                        <span className="font-semibold">{statistics.byStatus.delayed}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">詳細工数一覧</h3>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">プロジェクト</th>
                          <th className="text-left p-3">クライアント</th>
                          <th className="text-left p-3">段取り</th>
                          <th className="text-left p-3">機械加工</th>
                          <th className="text-left p-3">仕上げ</th>
                          <th className="text-left p-3">合計</th>
                          <th className="text-left p-3">ステータス</th>
                          <th className="text-left p-3">アクション</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkHours.map((wh) => (
                          <tr key={wh.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{wh.projectName}</div>
                                <div className="text-xs text-gray-500">{wh.managementNumber}</div>
                              </div>
                            </td>
                            <td className="p-3">{wh.client}</td>
                            <td className="p-3">
                              <div className="text-xs">
                                <div>計: {wh.plannedHours.setup}h</div>
                                <div>実: {wh.actualHours.setup}h</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-xs">
                                <div>計: {wh.plannedHours.machining}h</div>
                                <div>実: {wh.actualHours.machining}h</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-xs">
                                <div>計: {wh.plannedHours.finishing}h</div>
                                <div>実: {wh.actualHours.finishing}h</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-xs">
                                <div>計: {wh.plannedHours.total}h</div>
                                <div>実: {wh.actualHours.total}h</div>
                              </div>
                            </td>
                            <td className="p-3">{getStatusBadge(wh.status)}</td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedWorkHours(wh);
                                    setShowEditModal(true);
                                  }}
                                  disabled={wh.locked || isLoading}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                {wh.orderId && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                    onClick={() => router.push(`/orders?highlight=${wh.orderId}`)}
                                  >
                                    <Building2 className="w-3 h-3" />
                                  </Button>
                                )}
                                {wh.integrations?.processId && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-green-300 text-green-600 hover:bg-green-50"
                                    onClick={() => router.push(`/tasks?highlight=${wh.integrations.processId}`)}
                                  >
                                    <FileText className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteWorkHours(wh.id)}
                                  disabled={wh.locked || isLoading}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sync" className="mt-6">
              <SyncManagementTab 
                syncStats={syncStats}
                syncError={syncError}
                workHours={displayWorkHours}
                onRefresh={loadWorkHoursData}
                onResetStats={resetSyncStats}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <AnalyticsCharts 
                workHours={displayWorkHours}
                statistics={statistics}
                workers={workers}
                machines={machines}
              />
            </TabsContent>

            <TabsContent value="workers" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">作業者管理</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workers.map((worker) => (
                      <Card key={worker.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{worker.name}</h4>
                              <p className="text-sm text-gray-600">{worker.department}</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>時間単価:</span>
                              <span className="font-medium">¥{worker.hourlyRate.toLocaleString()}</span>
                            </div>
                            <div>
                              <span>スキル:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {worker.skills.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="machines" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">機械管理</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machines.map((machine) => (
                      <Card key={machine.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-full ${
                              machine.status === 'available' ? 'bg-green-100' :
                              machine.status === 'busy' ? 'bg-red-100' : 'bg-yellow-100'
                            }`}>
                              <Wrench className={`w-5 h-5 ${
                                machine.status === 'available' ? 'text-green-600' :
                                machine.status === 'busy' ? 'text-red-600' : 'text-yellow-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{machine.name}</h4>
                              <p className="text-sm text-gray-600">{machine.type}</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>稼働単価:</span>
                              <span className="font-medium">¥{machine.hourlyRate.toLocaleString()}/h</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>ステータス:</span>
                              <Badge variant={
                                machine.status === 'available' ? 'default' :
                                machine.status === 'busy' ? 'destructive' : 'secondary'
                              }>
                                {machine.status === 'available' ? '稼働可能' :
                                 machine.status === 'busy' ? '使用中' : 'メンテナンス'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        {/* Enhanced Edit Modal */}
        {showEditModal && (
          <WorkHoursEditModal
            workHours={selectedWorkHours}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedWorkHours(null);
            }}
            onSave={handleSaveWorkHours}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// ENHANCED COMPONENTS
// =============================================================================

// Sync Management Tab Component
const SyncManagementTab = ({ 
  syncStats, 
  syncError,
  workHours, 
  onRefresh,
  onResetStats 
}: { 
  syncStats: any;
  syncError: string | null;
  workHours: EnhancedWorkHours[]; 
  onRefresh: () => void;
  onResetStats: () => void;
}) => {
  
  return (
    <div className="space-y-6">
      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">同期済み件数</p>
                <p className="text-2xl font-bold text-blue-600">{syncStats.totalSynced}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">最終同期</p>
                <p className="text-sm font-bold text-green-600">
                  {syncStats.lastSyncTime 
                    ? syncStats.lastSyncTime.toLocaleString('ja-JP')
                    : '未同期'
                  }
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">保留中</p>
                <p className="text-2xl font-bold text-purple-600">{syncStats.pendingReports}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ステータス</p>
                <p className="text-sm font-bold text-blue-600">
                  {syncError ? 'エラー' : '正常'}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">同期情報</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetStats}
            >
              ステータスリセット
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">自動同期機能</h4>
              <p className="text-sm text-blue-700">
                日報データが更新されると、自動的に工数実績が更新されます。
              </p>
            </div>
            
            {syncError && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">同期エラー</h4>
                <p className="text-sm text-red-700">{syncError}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">同期対象プロセス</h4>
              <div className="grid grid-cols-1 gap-2">
                {workHours.filter(wh => wh.integrations?.dailyReportIds && wh.integrations.dailyReportIds.length > 0).map(wh => (
                  <div key={wh.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{wh.projectName}</span>
                    <Badge variant="outline" className="text-xs">
                      日報 {wh.integrations.dailyReportIds.length}件
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



const WorkHoursManagementWithSuspense = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">工数管理データを読み込み中...</p>
          </div>
        </div>
      </div>
    }>
      <WorkHoursManagement />
    </Suspense>
  );
};

export default WorkHoursManagementWithSuspense;