"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Clock,
  BarChart3,
  Grid3X3,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Package,
  Activity,
  Target,
  Zap,
  Bell,
  MoreVertical,
  Layers,
  ChevronDown,
  ChevronRight,
  Building2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

// 型とコンポーネントのインポート
import { Process } from "@/app/tasks/types";
import { getClientColor } from "@/app/tasks/constants";
import { useProcessManagement } from "@/app/tasks/hooks/useProcessManagement";
import { useKeyboardShortcuts } from "@/app/tasks/hooks/useKeyboardShortcuts";
import { ProcessRow } from "@/app/tasks/components/ProcessRow";
import { ProcessDetail } from "@/app/tasks/components/ProcessDetail";
import { GanttChart } from "@/app/tasks/components/gantt/GanttChart";
import { KanbanBoard } from "@/app/tasks/components/kanban/KanbanBoard";

const ProcessList = () => {
  const searchParams = useSearchParams();
  const fromOrderId = searchParams.get('fromOrder');
  const { trackAction } = useActivityTracking();
  
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Process["status"] | "all">("all");
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [activeView, setActiveView] = useState("list");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [companySortOrder, setCompanySortOrder] = useState<"custom" | "name" | "processCount" | "totalHours">("custom");
  
  // ガントチャート用のstate
  const [ganttViewType, setGanttViewType] = useState<"machine" | "person" | "project">("machine");
  const [showWeekends, setShowWeekends] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [ganttSearchQuery, setGanttSearchQuery] = useState("");
  const [ganttStatusFilter, setGanttStatusFilter] = useState<Process["status"] | "all">("all");
  const [ganttPriorityFilter, setGanttPriorityFilter] = useState<Process["priority"] | "all">("all");
  const [ganttZoomLevel, setGanttZoomLevel] = useState(40); // ピクセル/日
  
  // 看板用のstate
  const [kanbanGroupBy, setKanbanGroupBy] = useState<"status" | "priority" | "assignee">("status");
  const [kanbanSortBy, setKanbanSortBy] = useState<"dueDate" | "priority" | "progress">("dueDate");
  const [kanbanFilterPriority, setKanbanFilterPriority] = useState<Process["priority"] | "all">("all");
  const [kanbanFilterAssignee, setKanbanFilterAssignee] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(true);

  // カスタムフックを使用
  const {
    companies,
    isLoading: isProcessesLoading,
    error: processesError,
    generateLineNumber,
    createNewProcess,
    updateProcess,
    addProcess,
    deleteProcess,
    duplicateProcess,
    updateProgress,
    updateStatus,
    updateDate,
    reorderProcesses,
    reorderCompanies,
    toggleCompany,
    getStatistics,
  } = useProcessManagement();

  // キーボードショートカット
  useKeyboardShortcuts({
    onNewProcess: () => {
      setSelectedProcess(createNewProcess());
      setShowNewProcessModal(true);
    },
    onSearch: () => {
      const searchInput = document.querySelector('input[placeholder*="検索"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onClose: () => {
      if (showDetail || showNewProcessModal) {
        setShowDetail(false);
        setShowNewProcessModal(false);
      }
    },
    isModalOpen: showDetail || showNewProcessModal,
  });

  // フィルタリング
  const filteredCompanies = companies
    .map((company) => ({
      ...company,
      processes: company.processes.filter((process) => {
        const matchesSearch =
          searchQuery === "" ||
          process.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          process.managementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          process.fieldPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
          process.orderClient.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === "all" || process.status === filterStatus;

        return matchesSearch && matchesStatus;
      }),
    }))
    .filter((company) => company.processes.length > 0);

  const allProcesses = companies.flatMap((company) => company.processes);

  const stats = getStatistics();

  // 本日期限の工程
  const todayDeadlines = allProcesses
    .filter(p => {
      const today = new Date().toISOString().split('T')[0];
      return p.shipmentDate === today || p.dueDate?.split('T')[0] === today;
    })
    .slice(0, 5);

  // ステータス別カラー
  const getStatusColor = (status: Process["status"]) => {
    const colors = {
      planning: "bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      "data-work": "bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      processing: "bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      finishing: "bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
      completed: "bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
      delayed: "bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return colors[status];
  };

  const handleProcessUpdate = (updatedProcess: Process) => {
    updateProcess(updatedProcess);
    setSelectedProcess(updatedProcess);
  };

  const handleNewProcessSave = (newProcess: Process) => {
    addProcess(newProcess);
    setShowNewProcessModal(false);
  };

  const openDetail = (process: Process) => {
    setSelectedProcess(process);
    setShowDetail(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* シンプルなヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">工程管理</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-slate-400">
                  <span>総工程数: <span className="font-bold text-blue-600">{stats.total}</span></span>
                  <span>総工数: <span className="font-bold text-green-600">{stats.totalHours}H</span></span>
                  <span>平均進捗: <span className="font-bold text-purple-600">{stats.avgProgress.toFixed(1)}%</span></span>
                </div>
              </div>
            </div>
            
            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="工程を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左サイドパネル - 開閉可能 */}
          {showSidePanel && (
            <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {activeView === 'list' && 'フィルター'}
                  {activeView === 'gantt' && 'ガント設定'}
                  {activeView === 'kanban' && '看板設定'}
                </h3>
                <button
                  onClick={() => setShowSidePanel(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                </button>
              </div>
              
              {/* 工程リスト用フィルター */}
              {activeView === 'list' && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">ステータス</div>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'all' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setFilterStatus('all')}
                  >
                    すべて ({stats.total})
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'planning' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setFilterStatus('planning')}
                  >
                    計画 ({stats.byStatus.planning})
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'processing' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setFilterStatus('processing')}
                  >
                    加工 ({stats.byStatus.processing})
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'completed' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setFilterStatus('completed')}
                  >
                    完了 ({stats.byStatus.completed})
                  </button>
                  {stats.byStatus.delayed > 0 && (
                    <button 
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        filterStatus === 'delayed' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => setFilterStatus('delayed')}
                    >
                      遅延 ({stats.byStatus.delayed})
                    </button>
                  )}
                </div>
              )}
              
              {/* ガントチャート用設定 */}
              {activeView === 'gantt' && (
                <div className="space-y-4">
                  {/* 検索 */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">検索</div>
                    <input
                      type="text"
                      placeholder="プロジェクト名..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={ganttSearchQuery}
                      onChange={(e) => setGanttSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* 表示モード */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">表示モード</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttViewType === 'machine' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setGanttViewType('machine')}
                      >
                        機械別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttViewType === 'person' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setGanttViewType('person')}
                      >
                        担当者別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttViewType === 'project' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setGanttViewType('project')}
                      >
                        プロジェクト別
                      </button>
                    </div>
                  </div>

                  {/* ステータスフィルタ */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">ステータス</div>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={ganttStatusFilter}
                      onChange={(e) => setGanttStatusFilter(e.target.value as Process["status"] | "all")}
                    >
                      <option value="all">すべて</option>
                      <option value="planning">計画</option>
                      <option value="data-work">データ作業</option>
                      <option value="processing">加工中</option>
                      <option value="finishing">仕上げ</option>
                      <option value="completed">完了</option>
                      <option value="delayed">遅延</option>
                    </select>
                  </div>

                  {/* 優先度フィルタ */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">優先度</div>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={ganttPriorityFilter}
                      onChange={(e) => setGanttPriorityFilter(e.target.value as Process["priority"] | "all")}
                    >
                      <option value="all">すべて</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  

                  {/* ズーム */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">ズーム</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGanttZoomLevel(Math.max(20, ganttZoomLevel - 10))}
                        className="px-3 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        −
                      </button>
                      <span className="text-sm text-gray-600 dark:text-slate-400 flex-1 text-center">
                        {Math.round((ganttZoomLevel / 40) * 100)}%
                      </span>
                      <button
                        onClick={() => setGanttZoomLevel(Math.min(100, ganttZoomLevel + 10))}
                        className="px-3 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 表示オプション */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700" 
                        checked={showWeekends}
                        onChange={(e) => setShowWeekends(e.target.checked)}
                      />
                      <span>週末を表示</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700" 
                        checked={showMinimap}
                        onChange={(e) => setShowMinimap(e.target.checked)}
                      />
                      <span>ミニマップ表示</span>
                    </label>
                  </div>

                  {/* リセットボタン */}
                  <button
                    onClick={() => {
                      setGanttSearchQuery("");
                      setGanttStatusFilter("all");
                      setGanttPriorityFilter("all");
                    }}
                    className="w-full px-3 py-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    フィルタをリセット
                  </button>
                </div>
              )}
              
              {/* 看板用設定 */}
              {activeView === 'kanban' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">グループ化</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanGroupBy === 'status' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setKanbanGroupBy('status')}
                      >
                        ステータス別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanGroupBy === 'priority' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setKanbanGroupBy('priority')}
                      >
                        優先度別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanGroupBy === 'assignee' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setKanbanGroupBy('assignee')}
                      >
                        担当者別
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">ソート順</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanSortBy === 'dueDate' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setKanbanSortBy('dueDate')}
                      >
                        納期順
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanSortBy === 'priority' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setKanbanSortBy('priority')}
                      >
                        優先度順
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanSortBy === 'progress' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => setKanbanSortBy('progress')}
                      >
                        進捗順
                      </button>
                    </div>
                  </div>

                  {/* 優先度フィルタ */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">優先度フィルタ</div>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={kanbanFilterPriority}
                      onChange={(e) => setKanbanFilterPriority(e.target.value as Process["priority"] | "all")}
                    >
                      <option value="all">全優先度</option>
                      <option value="high">高優先度</option>
                      <option value="medium">中優先度</option>
                      <option value="low">低優先度</option>
                    </select>
                  </div>

                  {/* 担当者フィルタ */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">担当者フィルタ</div>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={kanbanFilterAssignee}
                      onChange={(e) => setKanbanFilterAssignee(e.target.value)}
                    >
                      <option value="all">全担当者</option>
                      {[...new Set(allProcesses.map(p => p.assignee).filter(Boolean))].map((assignee) => (
                        <option key={assignee} value={assignee}>
                          {assignee}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700" 
                        checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)}
                      />
                      <span>完了を表示</span>
                    </label>
                  </div>

                  {/* リセットボタン */}
                  <button
                    onClick={() => {
                      setKanbanFilterPriority("all");
                      setKanbanFilterAssignee("all");
                    }}
                    className="w-full px-3 py-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    フィルタをリセット
                  </button>
                </div>
              )}
            </div>
          )}

          {/* メインビューエリア */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* タブとアクションバー */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* サイドパネルが閉じられている場合の開くボタン */}
                  {!showSidePanel && (
                    <button
                      onClick={() => setShowSidePanel(true)}
                      className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <PanelLeft className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                    </button>
                  )}
                  
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setActiveView("list")}
                      className={`flex items-center gap-2 px-2 py-1 text-sm transition-colors border-b-2 ${
                        activeView === "list" 
                          ? 'text-blue-600 border-blue-600 font-medium' 
                          : 'text-gray-600 dark:text-slate-400 border-transparent hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      工程リスト
                    </button>
                    <button
                      onClick={() => setActiveView("gantt")}
                      className={`flex items-center gap-2 px-2 py-1 text-sm transition-colors border-b-2 ${
                        activeView === "gantt" 
                          ? 'text-blue-600 border-blue-600 font-medium' 
                          : 'text-gray-600 dark:text-slate-400 border-transparent hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      ガントチャート
                    </button>
                    <button
                      onClick={() => setActiveView("kanban")}
                      className={`flex items-center gap-2 px-2 py-1 text-sm transition-colors border-b-2 ${
                        activeView === "kanban" 
                          ? 'text-blue-600 border-blue-600 font-medium' 
                          : 'text-gray-600 dark:text-slate-400 border-transparent hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                      看板
                    </button>
                  </div>
                </div>

                {/* 新規工程ボタン */}
                <Button
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-4"
                  onClick={() => {
                    setSelectedProcess(createNewProcess());
                    setShowNewProcessModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新規工程
                </Button>
              </div>
            </div>

            {/* コンテンツエリア */}
            <div className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 ${activeView === 'gantt' ? '' : 'p-6'}`}>
              {isProcessesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-slate-400">工程データを読み込み中...</p>
                  </div>
                </div>
              ) : (
                <>
                  {processesError && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                        <span className="text-yellow-700 dark:text-yellow-400">Firebase接続エラー: サンプルデータを表示しています</span>
                      </div>
                    </div>
                  )}

                  {activeView === "list" && (
                    <>
                      {filteredCompanies.length === 0 ? (
                        <div className="text-center py-16">
                          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">
                            該当する工程が見つかりません
                          </p>
                          <p className="text-gray-400 dark:text-slate-500">
                            検索条件を変更するか、新しい工程を追加してください
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {filteredCompanies.map((company) => (
                            <div key={company.id} className="relative">
                              {/* 会社セクションヘッダー */}
                              <div className="flex items-center gap-4 mb-4 px-1">
                                <div className="flex items-center gap-2">
                                  <Building2
                                    className="w-5 h-5"
                                    style={{ color: getClientColor(company.name) }}
                                  />
                                  <span className="font-semibold text-gray-900 dark:text-white text-lg">{company.name}</span>
                                  <span className="text-sm text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                                    {company.processes.length}件
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">
                                      {company.processes.reduce(
                                        (sum, p) =>
                                          sum +
                                          (p.workDetails.setup +
                                            p.workDetails.machining +
                                            p.workDetails.finishing),
                                        0
                                      )}
                                      H
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="font-medium">
                                      {(
                                        company.processes.reduce(
                                          (sum, p) => sum + p.progress,
                                          0
                                        ) / company.processes.length
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-slate-600 to-transparent" />
                              </div>
                              
                              {/* 工程リスト */}
                              <div className="space-y-2">
                                {company.processes.map((process) => (
                                  <div key={process.id} className="bg-white dark:bg-slate-800/90 backdrop-blur rounded-lg border border-gray-200 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-1">
                                    <ProcessRow
                                      process={process}
                                      companyId={company.id}
                                      onProcessClick={openDetail}
                                      onDateChange={(processId, key, date) =>
                                        updateDate(company.id, processId, key, date)
                                      }
                                      onDuplicate={duplicateProcess}
                                      onDelete={deleteProcess}
                                      onReorder={reorderProcesses}
                                      onProgressChange={updateProgress}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeView === "gantt" && (
                    <GanttChart
                      processes={(showCompleted ? allProcesses : allProcesses.filter(p => p.status !== 'completed')).filter(p => p.processingPlanDate)}
                      viewType={ganttViewType}
                      showWeekends={showWeekends}
                      showMinimap={showMinimap}
                      searchQuery={ganttSearchQuery}
                      statusFilter={ganttStatusFilter}
                      priorityFilter={ganttPriorityFilter}
                      zoomLevel={ganttZoomLevel}
                      onProcessClick={openDetail}
                      onProcessUpdate={handleProcessUpdate}
                    />
                  )}

                  {activeView === "kanban" && (
                    <div className="bg-transparent">
                      <KanbanBoard
                        processes={(() => {
                          let filtered = showCompleted ? allProcesses : allProcesses.filter(p => p.status !== 'completed');
                          
                          // ソート処理
                          return filtered.sort((a, b) => {
                            switch (kanbanSortBy) {
                              case 'dueDate':
                                return new Date(a.dueDate || a.shipmentDate).getTime() - 
                                       new Date(b.dueDate || b.shipmentDate).getTime();
                              case 'priority':
                                const priorityOrder = { high: 0, medium: 1, low: 2 };
                                return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
                              case 'progress':
                                return b.progress - a.progress;
                              default:
                                return 0;
                            }
                          });
                        })()}
                        groupBy={kanbanGroupBy}
                        sortBy={kanbanSortBy}
                        filterPriority={kanbanFilterPriority}
                        filterAssignee={kanbanFilterAssignee}
                        showCompleted={showCompleted}
                        onProcessClick={openDetail}
                        onStatusChange={updateStatus}
                        onProgressChange={updateProgress}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 詳細モーダル */}
        {selectedProcess && showDetail && (
          <ProcessDetail
            process={selectedProcess}
            isOpen={showDetail}
            onClose={() => setShowDetail(false)}
            onSave={updateProcess}
            generateLineNumber={generateLineNumber}
            companies={companies}
          />
        )}

        {selectedProcess && showNewProcessModal && (
          <ProcessDetail
            process={selectedProcess}
            isOpen={showNewProcessModal}
            onClose={() => setShowNewProcessModal(false)}
            onSave={handleNewProcessSave}
            generateLineNumber={generateLineNumber}
            isNew={true}
            companies={companies}
          />
        )}
      </div>
    </div>
  );
};

export default ProcessList;