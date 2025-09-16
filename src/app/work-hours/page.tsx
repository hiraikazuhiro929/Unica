"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  BarChart3,
  RefreshCw,
  Activity,
  Users,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Zap,
  Timer,
  Database,
  Link2,
  FileText,
  ChevronDown,
  ChevronRight,
  MinusCircle,
  ChevronsDown,
  ChevronsUp,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { 
  WorkHours, 
  EnhancedWorkHours,
} from "@/app/tasks/types";
import type { Worker } from "@/lib/firebase/workers";
import type { Machine } from "@/lib/firebase/machines";
import { 
  getWorkers, 
  subscribeToWorkers, 
  createWorker, 
  updateWorker, 
  deleteWorker 
} from "@/lib/firebase/workers";
import { 
  getMachines, 
  subscribeToMachines, 
  createMachine, 
  updateMachine, 
  deleteMachine 
} from "@/lib/firebase/machines";
import {
  getWorkHoursList,
  subscribeToWorkHoursList,
  createWorkHours,
  updateWorkHours,
  deleteWorkHours
} from "@/lib/firebase/workHours";
import { WorkHoursDetailModal } from '@/app/work-hours/components/WorkHoursDetailModal';
import { WorkerModal } from '@/app/work-hours/components/WorkerModal';
import { MachineModal } from '@/app/work-hours/components/MachineModal';
import { ProcessTypeModal } from '@/app/work-hours/components/ProcessTypeModal';
import { getOrders } from "@/lib/firebase/orders";
import { getProcessesList } from "@/lib/firebase/processes";
import type { Order } from "@/app/tasks/types";
import type { Process } from "@/app/tasks/types";
import { exportWorkHours } from "@/lib/utils/exportUtils";
import { ProcessType, getProcessTypes, subscribeToProcessTypes, createProcessType, updateProcessType, deleteProcessType } from "@/lib/firebase/processTypes";

const WorkHoursManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [workHoursData, setWorkHoursData] = useState<EnhancedWorkHours[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedWorkHours, setSelectedWorkHours] = useState<EnhancedWorkHours | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<Process[]>([]);
  const [showCreateFromOptions, setShowCreateFromOptions] = useState(false);
  const [showOrderSelectionModal, setShowOrderSelectionModal] = useState(false);
  const [showProcessSelectionModal, setShowProcessSelectionModal] = useState(false);

  // マスタデータ - 作業者・機械・工程
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [isWorkerLoading, setIsWorkerLoading] = useState(true);
  const [isMachineLoading, setIsMachineLoading] = useState(true);
  const [isProcessTypeLoading, setIsProcessTypeLoading] = useState(true);
  const [showProcessTypeModal, setShowProcessTypeModal] = useState(false);
  const [selectedProcessType, setSelectedProcessType] = useState<ProcessType | null>(null);

  // 外側クリックで選択オプションを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCreateFromOptions) {
        setShowCreateFromOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateFromOptions]);

  // 受注案件から工数レコードを作成
  const createWorkHoursFromOrder = (order: Order) => {
    const newWorkHours: Partial<EnhancedWorkHours> = {
      projectName: order.projectName,
      managementNumber: order.managementNumber || `ORD-${order.id?.slice(-8)}`,
      clientName: order.clientName || '',
      orderAmount: order.totalAmount || 0,
      estimatedHours: order.estimatedDays ? order.estimatedDays * 8 : 40, // 1日8時間として計算
      actualHours: 0,
      progress: 0,
      status: 'planning' as const,
      description: order.description || `${order.projectName}の工数管理`,
      startDate: order.deliveryDate ? new Date(new Date(order.deliveryDate).getTime() - 30*24*60*60*1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // 納期の30日前
      endDate: order.deliveryDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30日後
      priority: order.priority || 'medium',
      workerId: 'current-user',
      workerName: '現在のユーザー',
      // 追加情報
      orderInfo: {
        orderId: order.id,
        originalOrder: order
      }
    };

    setSelectedWorkHours(newWorkHours as EnhancedWorkHours);
    setShowDetailModal(true);
    setShowOrderSelectionModal(false);
  };

  // 工程から工数レコードを作成
  const createWorkHoursFromProcess = (process: Process) => {
    const newWorkHours: Partial<EnhancedWorkHours> = {
      projectName: process.name,
      managementNumber: process.managementNumber || `PROC-${process.id?.slice(-8)}`,
      clientName: process.clientName || '',
      orderAmount: 0, // 工程では金額情報がない場合が多い
      estimatedHours: process.estimatedHours || 40,
      actualHours: process.actualHours || 0,
      progress: process.progress || 0,
      status: process.status || 'planning' as const,
      description: process.description || `${process.name}の工数管理`,
      startDate: process.startDate || new Date().toISOString().split('T')[0],
      endDate: process.endDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      priority: process.priority || 'medium',
      workerId: 'current-user',
      workerName: '現在のユーザー',
      // 追加情報
      processInfo: {
        processId: process.id,
        originalProcess: process
      }
    };

    setSelectedWorkHours(newWorkHours as EnhancedWorkHours);
    setShowDetailModal(true);
    setShowProcessSelectionModal(false);
  };

  // Load all data
  useEffect(() => {
    loadWorkHoursData();
    loadWorkersData();
    loadMachinesData();
    loadProcessTypesData();
    loadAvailableData();
    
    // Subscribe to real-time updates
    const unsubscribeWorkHours = subscribeToWorkHoursList({
      limit: 100,
      orderByField: 'updatedAt',
      orderDirection: 'desc'
    }, (data) => {
      setWorkHoursData(data);
    });

    const unsubscribeWorkers = subscribeToWorkers((data) => {
      setWorkers(data);
      setIsWorkerLoading(false);
    });

    const unsubscribeMachines = subscribeToMachines((data) => {
      setMachines(data);
      setIsMachineLoading(false);
    });
    
    const unsubscribeProcessTypes = subscribeToProcessTypes(
      (data) => {
        setProcessTypes(data);
        setIsProcessTypeLoading(false);
      },
      (error) => {
        console.error('Error in process types subscription:', error);
      }
    );

    return () => {
      unsubscribeWorkHours();
      unsubscribeWorkers();
      unsubscribeMachines();
      unsubscribeProcessTypes();
    };
  }, []);

  // 受注案件と工程を読み込み
  const loadAvailableData = async () => {
    try {
      // 受注案件を取得
      const { data: ordersData, error: ordersError } = await getOrders({
        limit: 50,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });
      if (ordersData && !ordersError) {
        setAvailableOrders(ordersData);
      }

      // 工程を取得
      const { data: processesData, error: processesError } = await getProcessesList({
        limit: 50,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });
      if (processesData && !processesError) {
        setAvailableProcesses(processesData);
      }
    } catch (error) {
      console.error('Failed to load available data:', error);
    }
  };

  const loadWorkHoursData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getWorkHoursList({
        limit: 100,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      });
      
      if (data) {
        setWorkHoursData(data);
      }
    } catch (error) {
      console.error('Error loading work hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkersData = async () => {
    try {
      const { data, success } = await getWorkers();
      if (success && data) {
        setWorkers(data);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setIsWorkerLoading(false);
    }
  };

  const loadMachinesData = async () => {
    try {
      const { data, success } = await getMachines();
      if (success && data) {
        setMachines(data);
      }
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setIsMachineLoading(false);
    }
  };
  
  const loadProcessTypesData = async () => {
    try {
      const { data, error } = await getProcessTypes();
      if (!error && data) {
        setProcessTypes(data);
      }
    } catch (error) {
      console.error('Error loading process types:', error);
    } finally {
      setIsProcessTypeLoading(false);
    }
  };

  // Filter data
  const filteredData = workHoursData.filter((wh) => {
    const matchesSearch = 
      wh.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.managementNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || wh.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // リアルタイム稼働状況
  const getCurrentStatus = () => {
    const now = new Date().getHours();
    const activeProjects = filteredData.filter(wh => wh.status === "in-progress");
    const todayUpdated = filteredData.filter(wh => {
      if (!wh.updatedAt) return false;
      const updateDate = new Date(wh.updatedAt);
      const today = new Date();
      return updateDate.toDateString() === today.toDateString();
    });

    return {
      isWorkingHours: now >= 8 && now <= 18,
      activeCount: activeProjects.length,
      todayUpdatedCount: todayUpdated.length
    };
  };

  const currentStatus = getCurrentStatus();

  // Calculate detailed statistics
  const calculateStatistics = () => {
    const totalProjects = filteredData.length;
    const totalPlannedHours = filteredData.reduce((sum, wh) => sum + (wh.plannedHours?.total || 0), 0);
    const totalActualHours = filteredData.reduce((sum, wh) => sum + (wh.actualHours?.total || 0), 0);
    const totalPlannedCost = filteredData.reduce((sum, wh) => sum + (wh.budget?.totalPlannedCost || 0), 0);
    const totalActualCost = filteredData.reduce((sum, wh) => sum + (wh.budget?.totalActualCost || 0), 0);
    
    // 着手済み案件（実工数が0より大きい）のみで効率計算
    const activeProjects = filteredData.filter(wh => (wh.actualHours?.total || 0) > 0);
    const averageEfficiency = activeProjects.length > 0 
      ? activeProjects.reduce((sum, wh) => {
          const efficiency = (wh.actualHours?.total || 0) / (wh.plannedHours?.total || 1);
          return sum + efficiency;
        }, 0) / activeProjects.length * 100
      : 0;

    const byStatus = {
      planning: filteredData.filter(wh => wh.status === "planning").length,
      inProgress: filteredData.filter(wh => wh.status === "in-progress").length,
      completed: filteredData.filter(wh => wh.status === "completed").length,
      delayed: filteredData.filter(wh => wh.status === "delayed").length,
    };

    const overBudget = filteredData.filter(wh => (wh.actualHours?.total || 0) > (wh.plannedHours?.total || 0)).length;

    // 作業者別統計（実際のデータから計算）
    const byWorker = workers.map(worker => {
      const workerData = filteredData.filter(wh => 
        wh.assignedWorkers?.some(aw => aw.workerId === worker.id)
      );
      const totalHours = workerData.reduce((sum, wh) => 
        sum + (wh.actualHours?.workerHours?.find(wh => wh.workerId === worker.id)?.hours || 0), 0
      );
      const plannedHours = workerData.reduce((sum, wh) => 
        sum + (wh.plannedHours?.workerHours?.find(wh => wh.workerId === worker.id)?.hours || 0), 0
      );
      const efficiency = plannedHours > 0 ? (totalHours / plannedHours) * 100 : 0;
      
      return {
        workerId: worker.id || '',
        workerName: worker.name,
        totalHours,
        efficiency: Math.min(efficiency, 200) // Cap at 200% for display
      };
    });

    // 機械別統計（実際のデータから計算）
    const byMachine = machines.map(machine => {
      const machineData = filteredData.filter(wh => 
        wh.usedMachines?.some(um => um.machineId === machine.id)
      );
      const totalHours = machineData.reduce((sum, wh) => 
        sum + (wh.actualHours?.machineHours?.find(mh => mh.machineId === machine.id)?.hours || 0), 0
      );
      
      return {
        machineId: machine.id || '',
        machineName: machine.name,
        utilizationRate: 0, // 稼働率は別途リアルタイム管理
        totalHours
      };
    });

    return {
      totalProjects,
      totalPlannedHours,
      totalActualHours,
      totalPlannedCost,
      totalActualCost,
      averageEfficiency,
      activeProjectCount: activeProjects.length,
      byStatus,
      overBudget,
      byWorker,
      byMachine,
      efficiency: averageEfficiency
    };
  };

  const statistics = calculateStatistics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case '完了': case 'completed': return 'bg-green-500';
      case '進行中': case 'in-progress': return 'bg-blue-500';
      case '計画中': case 'planning': return 'bg-yellow-500';
      case '遅延': case 'delayed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEfficiencyIcon = (planned: number, actual: number) => {
    if (actual === 0) return null;
    const efficiency = (actual / planned) * 100;
    if (efficiency <= 100) {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    } else if (efficiency <= 120) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const toggleRowExpansion = (workHoursId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(workHoursId)) {
      newExpanded.delete(workHoursId);
    } else {
      newExpanded.add(workHoursId);
    }
    setExpandedRows(newExpanded);
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
          setShowDetailModal(false);
          setSelectedWorkHours(null);
        }
      } else {
        // Create new
        const { id, error } = await createWorkHours(workHoursData as Omit<WorkHours, 'id' | 'createdAt' | 'updatedAt'>);
        if (error) {
          setError(error);
        } else {
          setShowDetailModal(false);
          setSelectedWorkHours(null);
        }
      }
      // Reload data to reflect changes
      loadWorkHoursData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete work hours
  const handleDeleteWorkHours = async (id: string) => {
    if (!confirm("この工数データを削除しますか？")) return;
    
    setIsSaving(true);
    try {
      const { error } = await deleteWorkHours(id);
      if (error) {
        alert(`削除に失敗しました: ${error}`);
      }
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Worker/Machine CRUD handlers
  const handleAddWorker = () => {
    setSelectedWorker(null);
    setShowWorkerModal(true);
  };
  
  const handleSaveWorker = async (workerData: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = selectedWorker 
      ? await updateWorker(selectedWorker.id!, workerData)
      : await createWorker(workerData);
    
    if (result.success) {
      setShowWorkerModal(false);
      setSelectedWorker(null);
    } else {
      alert(`作業者の保存に失敗しました: ${result.error}`);
    }
  };
  
  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowWorkerModal(true);
  };
  
  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('この作業者を削除しますか？')) return;
    
    const { success, error } = await deleteWorker(workerId);
    if (!success) {
      alert(`作業者の削除に失敗しました: ${error}`);
    }
  };
  
  const handleAddMachine = () => {
    setSelectedMachine(null);
    setShowMachineModal(true);
  };
  
  const handleSaveMachine = async (machineData: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = selectedMachine 
      ? await updateMachine(selectedMachine.id!, machineData)
      : await createMachine(machineData);
    
    if (result.success) {
      setShowMachineModal(false);
      setSelectedMachine(null);
    } else {
      alert(`機械の保存に失敗しました: ${result.error}`);
    }
  };
  
  const handleEditMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setShowMachineModal(true);
  };
  
  const handleDeleteMachine = async (machineId: string) => {
    if (!confirm('この機械を削除しますか？')) return;
    
    const { success, error } = await deleteMachine(machineId);
    if (!success) {
      alert(`機械の削除に失敗しました: ${error}`);
    }
  };
  
  // 工程タイプ操作関数
  const handleAddProcessType = () => {
    setSelectedProcessType(null);
    setShowProcessTypeModal(true);
  };
  
  const handleSaveProcessType = async (processTypeData: Omit<ProcessType, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = selectedProcessType 
      ? await updateProcessType(selectedProcessType.id!, processTypeData)
      : await createProcessType(processTypeData);
    
    if (!result.error) {
      setShowProcessTypeModal(false);
      setSelectedProcessType(null);
    } else {
      alert(`工程タイプの保存に失敗しました: ${result.error}`);
    }
  };
  
  const handleEditProcessType = (processType: ProcessType) => {
    setSelectedProcessType(processType);
    setShowProcessTypeModal(true);
  };
  
  const handleDeleteProcessType = async (processTypeId: string) => {
    if (!confirm('この工程タイプを削除しますか？')) return;
    
    const { error } = await deleteProcessType(processTypeId);
    if (error) {
      alert(`工程タイプの削除に失敗しました: ${error}`);
    }
  };
  
  // サンプルデータ作成
  const createSampleData = async () => {
    if (!confirm('サンプルデータを作成しますか？')) return;
    
    setIsLoading(true);
    try {
      // サンプル工数データ
      const sampleWorkHours = [
        {
          projectName: "精密部品A製造",
          client: "ABC製作所",
          managementNumber: "WH-2024-001",
          plannedHours: { setup: 2, machining: 8, finishing: 3, total: 13 },
          actualHours: { setup: 2.5, machining: 9, finishing: 2.8, total: 14.3 },
          budget: {
            estimatedAmount: 150000,
            setupRate: 3000,
            machiningRate: 4000,
            finishingRate: 3500,
            totalPlannedCost: 45500,
            totalActualCost: 49300,
          },
          status: "completed" as const,
          priority: "high" as const,
          tags: ["精密", "量産"],
          integrations: {
            dailyReportIds: ["dr001", "dr002"],
            lastSyncTime: new Date().toISOString(),
            syncedReportCount: 2,
          }
        },
        {
          projectName: "試作品B開発",
          client: "XYZ工業",
          managementNumber: "WH-2024-002",
          plannedHours: { setup: 4, machining: 12, finishing: 6, total: 22 },
          actualHours: { setup: 3.8, machining: 11.5, finishing: 5.2, total: 20.5 },
          budget: {
            estimatedAmount: 200000,
            setupRate: 3000,
            machiningRate: 4000,
            finishingRate: 3500,
            totalPlannedCost: 69000,
            totalActualCost: 62900,
          },
          status: "in-progress" as const,
          priority: "medium" as const,
          tags: ["試作", "開発"],
          integrations: {
            dailyReportIds: ["dr003"],
            lastSyncTime: new Date().toISOString(),
            syncedReportCount: 1,
          }
        },
        {
          projectName: "メンテナンス部品C",
          client: "DEF機械",
          managementNumber: "WH-2024-003",
          plannedHours: { setup: 1, machining: 4, finishing: 2, total: 7 },
          actualHours: { setup: 0, machining: 0, finishing: 0, total: 0 },
          budget: {
            estimatedAmount: 80000,
            setupRate: 3000,
            machiningRate: 4000,
            finishingRate: 3500,
            totalPlannedCost: 26000,
            totalActualCost: 0,
          },
          status: "planning" as const,
          priority: "low" as const,
          tags: ["メンテナンス"],
        }
      ];
      
      // サンプルデータを作成
      for (const sample of sampleWorkHours) {
        await createWorkHours(sample);
      }
      
      // データをリロード
      await loadWorkHoursData();
      
      alert('サンプルデータを作成しました！');
    } catch (error: any) {
      alert(`サンプルデータ作成に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isWorkerLoading || isMachineLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">工数データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー - リアルタイムステータス付き */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Clock className="w-8 h-8 text-blue-600" />
                  {currentStatus.isWorkingHours && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">工数管理センター</h1>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    リアルタイム稼働監視システム
                  </div>
                </div>
              </div>

              {/* リアルタイムインジケーター */}
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${currentStatus.isWorkingHours ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                  <span className="text-sm">
                    {currentStatus.isWorkingHours ? '稼働中' : '時間外'}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-slate-600" />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{currentStatus.activeCount}件進行中</span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-slate-600" />
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">本日{currentStatus.todayUpdatedCount}件更新</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* メインコンテンツ - 3列レイアウト */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左側：統計・ダッシュボード */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-3">
              {/* 全体効率メーター */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 border-blue-200 dark:border-blue-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">着手済み案件効率</h3>
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200 dark:text-slate-600"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - statistics.efficiency / 100)}`}
                          className={statistics.efficiency <= 100 ? "text-green-500" : statistics.efficiency <= 120 ? "text-yellow-500" : "text-red-500"}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {statistics.activeProjectCount > 0 ? statistics.efficiency.toFixed(1) : '-'}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">平均効率</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-slate-400">着手済み案件</div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {statistics.activeProjectCount}件 / {statistics.totalProjects}件
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-slate-400">計画中</div>
                        <div className="text-sm font-semibold text-yellow-600">{statistics.byStatus.planning}件</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-slate-400">進行中</div>
                        <div className="text-sm font-semibold text-blue-600">{statistics.byStatus.inProgress}件</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* アラート */}
              {statistics.overBudget > 0 && (
                <Card className="bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="text-sm font-semibold text-red-700 dark:text-red-400">
                          {statistics.overBudget}件の案件が工数超過
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-500">
                          早急な対応が必要です
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ステータス別内訳 */}
              <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold">ステータス別内訳</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-slate-300">進行中</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(statistics.byStatus.inProgress / statistics.totalProjects) * 100} className="w-20 h-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{statistics.byStatus.inProgress}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-slate-300">完了</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(statistics.byStatus.completed / statistics.totalProjects) * 100} className="w-20 h-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{statistics.byStatus.completed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* コスト状況 */}
              <Card className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">コスト状況</h3>
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-slate-300">予算</span>
                        <span className="font-medium">{formatCurrency(statistics.totalPlannedCost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-700 dark:text-slate-300">実績</span>
                        <span className={`font-medium ${statistics.totalActualCost > statistics.totalPlannedCost ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(statistics.totalActualCost)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-slate-300">差異</span>
                        <span className={`font-bold ${statistics.totalActualCost > statistics.totalPlannedCost ? 'text-red-600' : 'text-green-600'}`}>
                          {statistics.totalActualCost > statistics.totalPlannedCost ? '+' : ''}
                          {formatCurrency(statistics.totalActualCost - statistics.totalPlannedCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 中央：工数テーブル */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            {/* フィルター */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="工数データを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="planning">計画中</SelectItem>
                    <SelectItem value="in-progress">進行中</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                    <SelectItem value="delayed">遅延</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={() => setShowAnalyticsModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-800/50"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  分析
                </Button>

                {/* エクスポートボタン */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={filteredData.length === 0}
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden lg:inline">エクスポート</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-3 py-2 text-sm text-gray-600 dark:text-slate-400 border-b border-gray-200 dark:border-slate-600">
                      <div className="font-medium mb-1">エクスポート対象</div>
                      <div className="space-y-1 text-xs">
                        <div>ステータス: {filterStatus === 'all' ? 'すべて' : filterStatus === 'planning' ? '計画中' : filterStatus === 'in-progress' ? '進行中' : filterStatus === 'completed' ? '完了' : '遅延'}</div>
                        {searchQuery && <div>検索: "{searchQuery}"</div>}
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {filteredData.length}件の工数データ
                        </div>
                      </div>
                    </div>
                    <DropdownMenuItem 
                      onClick={() => {
                        exportWorkHours(filteredData, 'csv');
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      CSV形式でダウンロード
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        exportWorkHours(filteredData, 'excel');
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Excel形式でダウンロード
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="relative">
                  <Button
                    onClick={() => setShowCreateFromOptions(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    新規作成
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                  
                  {showCreateFromOptions && (
                    <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            const newWorkHours: Partial<EnhancedWorkHours> = {
                              projectName: '',
                              managementNumber: '',
                              clientName: '',
                              orderAmount: 0,
                              estimatedHours: 40,
                              actualHours: 0,
                              progress: 0,
                              status: 'planning' as const,
                              description: '',
                              startDate: new Date().toISOString().split('T')[0],
                              endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                              priority: 'medium',
                              workerId: 'current-user',
                              workerName: '現在のユーザー'
                            };
                            setSelectedWorkHours(newWorkHours as EnhancedWorkHours);
                            setShowDetailModal(true);
                            setShowCreateFromOptions(false);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          空の工数レコード作成
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            setShowCreateFromOptions(false);
                            setShowOrderSelectionModal(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          受注案件から作成（{availableOrders.length}件）
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            setShowCreateFromOptions(false);
                            setShowProcessSelectionModal(true);
                          }}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          工程から作成（{availableProcesses.length}件）
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 工数テーブル */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-white text-sm">案件</th>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-white text-sm">計画工数</th>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-white text-sm">実工数</th>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-white text-sm">効率</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-white text-sm">予算差異</th>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-white text-sm">ステータス</th>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-white text-sm">同期</th>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-white text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((wh) => {
                    const efficiency = wh.plannedHours?.total ? 
                      ((wh.actualHours?.total || 0) / wh.plannedHours.total) * 100 : 0;
                    const isOverBudget = (wh.actualHours?.total || 0) > (wh.plannedHours?.total || 0);
                    const costDiff = (wh.budget?.totalActualCost || 0) - (wh.budget?.totalPlannedCost || 0);
                    const dailyReportCount = wh.integrations?.dailyReportIds?.length || 0;
                    
                    return (
                      <React.Fragment key={wh.id}>
                        <tr 
                          className={`border-b border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-800/30 transition-colors ${
                            isOverBudget ? 'bg-red-50 dark:bg-red-800/20' : ''
                          }`}
                        >
                        <td 
                          className="p-3 cursor-pointer"
                          onClick={() => {
                            setSelectedWorkHours(wh);
                            setShowDetailModal(true);
                          }}
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              {wh.projectName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              {wh.client} • {wh.managementNumber}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatHours(wh.plannedHours?.total || 0)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ¥{((wh.budget?.totalPlannedCost || 0) / 1000).toFixed(0)}K
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            {formatHours(wh.actualHours?.total || 0)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ¥{((wh.budget?.totalActualCost || 0) / 1000).toFixed(0)}K
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-bold ${
                              efficiency <= 100 ? 'text-green-600' : 
                              efficiency <= 120 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {efficiency.toFixed(0)}%
                            </span>
                            {getEfficiencyIcon(wh.plannedHours?.total || 0, wh.actualHours?.total || 0)}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-sm font-medium ${costDiff > 0 ? 'text-red-600' : costDiff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            {costDiff > 0 ? '+' : ''}{formatCurrency(costDiff)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${getStatusColor(wh.status || 'planning')} text-white text-xs`}>
                            {wh.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {dailyReportCount > 0 ? (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                              <Database className="w-3 h-3 mr-1" />
                              {dailyReportCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">未同期</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(wh.id!)}
                              className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-800"
                              title={expandedRows.has(wh.id!) ? "工程別詳細を折りたたむ" : "工程別詳細を展開"}
                            >
                              {expandedRows.has(wh.id!) ? (
                                <ChevronsUp className="w-3 h-3" />
                              ) : (
                                <ChevronsDown className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedWorkHours(wh);
                                setShowDetailModal(true);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (wh.id) handleDeleteWorkHours(wh.id);
                              }}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* 展開された詳細行 */}
                      {expandedRows.has(wh.id!) && (
                        <>
                          {/* ヘッダー行 */}
                          <tr className="bg-blue-50 dark:bg-blue-800/30">
                            <td colSpan={8} className="px-3 py-2">
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Clock className="w-3 h-3 text-blue-500" />
                                工程別詳細
                              </h4>
                            </td>
                          </tr>
                          
                          {/* 段取り行 */}
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">段取り</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {(wh.plannedHours?.setup || 0).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm font-medium text-green-600">
                                {(wh.actualHours?.setup || 0).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-bold ${
                                (wh.plannedHours?.setup || 0) > 0 ? 
                                  ((wh.actualHours?.setup || 0) / (wh.plannedHours?.setup || 1) * 100) <= 100 ? 'text-green-600' : 
                                  ((wh.actualHours?.setup || 0) / (wh.plannedHours?.setup || 1) * 100) <= 120 ? 'text-yellow-600' : 'text-red-600'
                                : 'text-gray-500'
                              }`}>
                                {(wh.plannedHours?.setup || 0) > 0 ? 
                                  ((wh.actualHours?.setup || 0) / (wh.plannedHours?.setup || 1) * 100).toFixed(0) + '%'
                                  : '-'
                                }
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className={`text-sm font-medium ${
                                ((wh.actualHours?.setup || 0) - (wh.plannedHours?.setup || 0)) > 0 ? 'text-red-600' : 
                                ((wh.actualHours?.setup || 0) - (wh.plannedHours?.setup || 0)) < 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {((wh.actualHours?.setup || 0) - (wh.plannedHours?.setup || 0)) > 0 ? '+' : ''}
                                {((wh.actualHours?.setup || 0) - (wh.plannedHours?.setup || 0)).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">段取り</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </td>
                          </tr>

                          {/* 機械加工行 */}
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">機械加工</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {(wh.plannedHours?.machining || 0).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm font-medium text-green-600">
                                {(wh.actualHours?.machining || 0).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-bold ${
                                (wh.plannedHours?.machining || 0) > 0 ? 
                                  ((wh.actualHours?.machining || 0) / (wh.plannedHours?.machining || 1) * 100) <= 100 ? 'text-green-600' : 
                                  ((wh.actualHours?.machining || 0) / (wh.plannedHours?.machining || 1) * 100) <= 120 ? 'text-yellow-600' : 'text-red-600'
                                : 'text-gray-500'
                              }`}>
                                {(wh.plannedHours?.machining || 0) > 0 ? 
                                  ((wh.actualHours?.machining || 0) / (wh.plannedHours?.machining || 1) * 100).toFixed(0) + '%'
                                  : '-'
                                }
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className={`text-sm font-medium ${
                                ((wh.actualHours?.machining || 0) - (wh.plannedHours?.machining || 0)) > 0 ? 'text-red-600' : 
                                ((wh.actualHours?.machining || 0) - (wh.plannedHours?.machining || 0)) < 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {((wh.actualHours?.machining || 0) - (wh.plannedHours?.machining || 0)) > 0 ? '+' : ''}
                                {((wh.actualHours?.machining || 0) - (wh.plannedHours?.machining || 0)).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-orange-100 text-orange-800 text-xs">加工</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </td>
                          </tr>

                          {/* 仕上げ行 */}
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">仕上げ</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {(wh.plannedHours?.finishing || 0).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm font-medium text-green-600">
                                {(wh.actualHours?.finishing || 0).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-bold ${
                                (wh.plannedHours?.finishing || 0) > 0 ? 
                                  ((wh.actualHours?.finishing || 0) / (wh.plannedHours?.finishing || 1) * 100) <= 100 ? 'text-green-600' : 
                                  ((wh.actualHours?.finishing || 0) / (wh.plannedHours?.finishing || 1) * 100) <= 120 ? 'text-yellow-600' : 'text-red-600'
                                : 'text-gray-500'
                              }`}>
                                {(wh.plannedHours?.finishing || 0) > 0 ? 
                                  ((wh.actualHours?.finishing || 0) / (wh.plannedHours?.finishing || 1) * 100).toFixed(0) + '%'
                                  : '-'
                                }
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className={`text-sm font-medium ${
                                ((wh.actualHours?.finishing || 0) - (wh.plannedHours?.finishing || 0)) > 0 ? 'text-red-600' : 
                                ((wh.actualHours?.finishing || 0) - (wh.plannedHours?.finishing || 0)) < 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {((wh.actualHours?.finishing || 0) - (wh.plannedHours?.finishing || 0)) > 0 ? '+' : ''}
                                {((wh.actualHours?.finishing || 0) - (wh.plannedHours?.finishing || 0)).toFixed(1)}h
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-green-100 text-green-800 text-xs">仕上</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </td>
                          </tr>

                          {/* カスタム工程行 */}
                          {wh.customPlannedSteps?.map((step: any) => (
                            <tr key={step.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 bg-green-50/30 dark:bg-green-900/10">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{step.name}</span>
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">追加</Badge>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {(step.hours || 0).toFixed(1)}h
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-sm text-gray-400">
                                  日報連携
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-sm font-medium text-gray-400">-</div>
                              </td>
                              <td className="p-3 text-right">
                                <div className="text-sm font-medium text-gray-400">-</div>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">カスタム</Badge>
                              </td>
                              <td className="p-3 text-center">
                                <span className="text-xs text-gray-400">-</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="text-xs text-gray-400">-</span>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              
              {filteredData.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                  <p>検索条件に合う工数データが見つかりません</p>
                </div>
              )}
            </div>
          </div>

          {/* 右側：マスタ管理・詳細情報 */}
          <div className="w-80 bg-white dark:bg-gray-800 flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">マスタ管理</h3>
            </div>
            
            <Tabs defaultValue="workers" className="flex-1">
              <div className="px-4 pt-4 pb-2 overflow-x-auto">
                <TabsList className="inline-flex h-10 items-center justify-start bg-gray-100 dark:bg-slate-700 p-1 rounded-md border min-w-max">
                  <TabsTrigger
                    value="workers"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    作業者
                  </TabsTrigger>
                  <TabsTrigger
                    value="machines"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    機械
                  </TabsTrigger>
                  <TabsTrigger
                    value="processTypes"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    作業工程
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="workers" className="flex-1 px-4 pb-4 overflow-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">作業者一覧</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs"
                      onClick={handleAddWorker}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      追加
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {workers.map((worker) => {
                      const workerStats = statistics.byWorker.find(w => w.workerId === worker.id);

                      return (
                        <div key={worker.id} className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{worker.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {worker.employeeId && `ID: ${worker.employeeId} • `}¥{worker.hourlyRate.toLocaleString()}/h
                              </div>
                              {worker.department && (
                                <div className="text-xs text-gray-500 mt-1">
                                  部署: {worker.department}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                スキル: {worker.skills.join(', ')}
                              </div>
                              {workerStats && (
                                <div className="flex items-center justify-between mt-2 text-xs">
                                  <span className="text-gray-500">今週: {workerStats.totalHours.toFixed(1)}h</span>
                                  <span className="text-gray-500">効率: {workerStats.efficiency.toFixed(0)}%</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleEditWorker(worker)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                  onClick={() => worker.id && handleDeleteWorker(worker.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="machines" className="flex-1 px-4 pb-4 overflow-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">機械一覧</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs"
                      onClick={handleAddMachine}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      追加
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {machines.map((machine) => {
                      const machineStats = statistics.byMachine.find(m => m.machineId === machine.id);
                      

                      return (
                        <div key={machine.id} className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{machine.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {machine.machineId && `${machine.machineId} • `}{machine.type} • ¥{machine.hourlyRate.toLocaleString()}/h
                              </div>
                              {machine.manufacturer && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {machine.manufacturer}{machine.model && ` ${machine.model}`}
                                </div>
                              )}
                              {machine.location && (
                                <div className="text-xs text-gray-500 mt-1">
                                  設置場所: {machine.location}
                                </div>
                              )}
                              {machineStats && (
                                <div className="text-xs text-gray-500 mt-2">
                                  今週: {machineStats.totalHours.toFixed(1)}h
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleEditMachine(machine)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                  onClick={() => machine.id && handleDeleteMachine(machine.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="processTypes" className="flex-1 px-4 pb-4 overflow-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">工程一覧</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs"
                      onClick={handleAddProcessType}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      追加
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {processTypes.map((processType) => (
                      <div key={processType.id} className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{processType.nameJapanese}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {processType.name} • {
                                processType.category === 'setup' ? '段取り' :
                                processType.category === 'machining' ? '加工' :
                                processType.category === 'finishing' ? '仕上げ' :
                                processType.category === 'inspection' ? '検査' :
                                'その他'
                              }
                              {processType.hourlyRate && ` • ¥${processType.hourlyRate.toLocaleString()}/h`}
                            </div>
                            {processType.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                {processType.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={processType.isActive ? "default" : "secondary"} className="text-xs">
                                {processType.isActive ? '有効' : '無効'}
                              </Badge>
                              <span className="text-xs text-gray-500">表示順: {processType.order}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => handleEditProcessType(processType)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                onClick={() => processType.id && handleDeleteProcessType(processType.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <WorkHoursDetailModal
          workHours={selectedWorkHours}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedWorkHours(null);
          }}
          onSave={handleSaveWorkHours}
          workers={workers}
          machines={machines}
        />
      )}

      {/* Worker Modal */}
      {showWorkerModal && (
        <WorkerModal
          worker={selectedWorker}
          isOpen={showWorkerModal}
          onClose={() => {
            setShowWorkerModal(false);
            setSelectedWorker(null);
          }}
          onSave={handleSaveWorker}
          isLoading={isSaving}
        />
      )}

      {/* Machine Modal */}
      {showMachineModal && (
        <MachineModal
          machine={selectedMachine}
          isOpen={showMachineModal}
          onClose={() => {
            setShowMachineModal(false);
            setSelectedMachine(null);
          }}
          onSave={handleSaveMachine}
          isLoading={isSaving}
        />
      )}
      
      {/* Process Type Modal */}
      {showProcessTypeModal && (
        <ProcessTypeModal
          processType={selectedProcessType}
          isOpen={showProcessTypeModal}
          onClose={() => {
            setShowProcessTypeModal(false);
            setSelectedProcessType(null);
          }}
          onSave={handleSaveProcessType}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">工数分析</h2>
              <Button
                variant="ghost"
                onClick={() => setShowAnalyticsModal(false)}
              >
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 作業者別効率 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">作業者別効率</h3>
                <div className="space-y-3">
                  {statistics.byWorker.map((worker) => (
                    <div key={worker.workerId} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{worker.workerName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-slate-600 rounded-full">
                          <div 
                            className={`h-full rounded-full ${
                              worker.efficiency >= 100 ? 'bg-green-500' : 
                              worker.efficiency >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(worker.efficiency, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {worker.efficiency.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 機械稼働率 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">機械稼働率</h3>
                <div className="space-y-3">
                  {statistics.byMachine.map((machine) => (
                    <div key={machine.machineId} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{machine.machineName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-slate-600 rounded-full">
                          <div 
                            className={`h-full rounded-full ${
                              machine.utilizationRate >= 80 ? 'bg-green-500' : 
                              machine.utilizationRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${machine.utilizationRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {machine.utilizationRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">全体サマリー</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalProjects}</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">総プロジェクト</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{statistics.totalPlannedHours}h</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">計画工数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{statistics.totalActualHours}h</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">実績工数</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      statistics.efficiency <= 100 ? 'text-green-600' : 
                      statistics.efficiency <= 120 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {statistics.efficiency.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">全体効率</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 受注案件選択モーダル */}
      {showOrderSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                受注案件から工数レコードを作成
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {availableOrders.length > 0 ? (
                availableOrders.map((order) => (
                  <Card key={order.id} className="border hover:border-blue-300 transition-colors cursor-pointer">
                    <CardContent className="p-4" onClick={() => createWorkHoursFromOrder(order)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{order.projectName}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {order.managementNumber} | {order.clientName}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            納期: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('ja-JP') : '未設定'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ¥{order.totalAmount?.toLocaleString() || '未設定'}
                          </div>
                          <Badge variant="outline">{order.priority || 'medium'}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  利用可能な受注案件がありません
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
              <Button variant="outline" onClick={() => setShowOrderSelectionModal(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 工程選択モーダル */}
      {showProcessSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                工程から工数レコードを作成
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {availableProcesses.length > 0 ? (
                availableProcesses.map((process) => (
                  <Card key={process.id} className="border hover:border-blue-300 transition-colors cursor-pointer">
                    <CardContent className="p-4" onClick={() => createWorkHoursFromProcess(process)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{process.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {process.managementNumber} | {process.clientName || ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={process.progress || 0} className="w-24 h-2" />
                            <span className="text-sm text-gray-500">{process.progress || 0}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            予定: {process.estimatedHours || 0}h
                          </div>
                          <div className="text-sm text-gray-500">
                            実績: {process.actualHours || 0}h
                          </div>
                          <Badge variant="outline">{process.status || 'planning'}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  利用可能な工程がありません
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
              <Button variant="outline" onClick={() => setShowProcessSelectionModal(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkHoursManagement;