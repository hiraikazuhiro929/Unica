"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  const [ganttPeriod, setGanttPeriod] = useState<"week" | "month" | "quarter">("month");
  const [showWeekends, setShowWeekends] = useState(true);
  
  // 看板用のstate
  const [kanbanGroupBy, setKanbanGroupBy] = useState<"status" | "priority" | "assignee">("status");
  const [kanbanSortBy, setKanbanSortBy] = useState<"dueDate" | "priority" | "progress">("dueDate");
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
      planning: "bg-blue-50 text-blue-600 border-blue-200",
      "data-work": "bg-purple-50 text-purple-600 border-purple-200",
      processing: "bg-amber-50 text-amber-600 border-amber-200",
      finishing: "bg-green-50 text-green-600 border-green-200",
      completed: "bg-gray-50 text-gray-600 border-gray-200",
      delayed: "bg-red-50 text-red-600 border-red-200",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="ml-16 h-screen flex flex-col">
        {/* シンプルなヘッダー */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">工程管理</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>総工程数: <span className="font-bold text-blue-600">{stats.total}</span></span>
                  <span>総工数: <span className="font-bold text-green-600">{stats.totalHours}H</span></span>
                  <span>平均進捗: <span className="font-bold text-purple-600">{stats.avgProgress.toFixed(1)}%</span></span>
                </div>
              </div>
            </div>
            
            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="工程を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左サイドパネル - 開閉可能 */}
          {showSidePanel && (
            <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {activeView === 'list' && 'フィルター'}
                  {activeView === 'gantt' && 'ガント設定'}
                  {activeView === 'kanban' && '看板設定'}
                </h3>
                <button
                  onClick={() => setShowSidePanel(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              
              {/* 工程リスト用フィルター */}
              {activeView === 'list' && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 mb-2">ステータス</div>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'all' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setFilterStatus('all')}
                  >
                    すべて ({stats.total})
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'planning' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setFilterStatus('planning')}
                  >
                    計画 ({stats.byStatus.planning})
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'processing' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setFilterStatus('processing')}
                  >
                    加工 ({stats.byStatus.processing})
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === 'completed' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setFilterStatus('completed')}
                  >
                    完了 ({stats.byStatus.completed})
                  </button>
                  {stats.byStatus.delayed > 0 && (
                    <button 
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        filterStatus === 'delayed' ? 'text-red-600 bg-red-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
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
                  <div>
                    <div className="text-xs text-gray-500 mb-2">表示モード</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttViewType === 'machine' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setGanttViewType('machine')}
                      >
                        機械別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttViewType === 'person' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setGanttViewType('person')}
                      >
                        担当者別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttViewType === 'project' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setGanttViewType('project')}
                      >
                        プロジェクト別
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-2">表示期間</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttPeriod === 'week' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setGanttPeriod('week')}
                      >
                        今週
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttPeriod === 'month' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setGanttPeriod('month')}
                      >
                        今月
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          ganttPeriod === 'quarter' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setGanttPeriod('quarter')}
                      >
                        3ヶ月
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={showWeekends}
                        onChange={(e) => setShowWeekends(e.target.checked)}
                      />
                      <span>週末を表示</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* 看板用設定 */}
              {activeView === 'kanban' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-2">グループ化</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanGroupBy === 'status' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setKanbanGroupBy('status')}
                      >
                        ステータス別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanGroupBy === 'priority' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setKanbanGroupBy('priority')}
                      >
                        優先度別
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanGroupBy === 'assignee' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setKanbanGroupBy('assignee')}
                      >
                        担当者別
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-2">ソート順</div>
                    <div className="space-y-1">
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanSortBy === 'dueDate' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setKanbanSortBy('dueDate')}
                      >
                        納期順
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanSortBy === 'priority' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setKanbanSortBy('priority')}
                      >
                        優先度順
                      </button>
                      <button 
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          kanbanSortBy === 'progress' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setKanbanSortBy('progress')}
                      >
                        進捗順
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)}
                      />
                      <span>完了を表示</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* メインビューエリア */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* タブとアクションバー */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* サイドパネルが閉じられている場合の開くボタン */}
                  {!showSidePanel && (
                    <button
                      onClick={() => setShowSidePanel(true)}
                      className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <PanelLeft className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setActiveView("list")}
                      className={`flex items-center gap-2 px-2 py-1 text-sm transition-colors border-b-2 ${
                        activeView === "list" 
                          ? 'text-blue-600 border-blue-600 font-medium' 
                          : 'text-gray-600 border-transparent hover:text-gray-800'
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
                          : 'text-gray-600 border-transparent hover:text-gray-800'
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
                          : 'text-gray-600 border-transparent hover:text-gray-800'
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
            <div className="flex-1 overflow-y-auto p-6">
              {isProcessesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">工程データを読み込み中...</p>
                  </div>
                </div>
              ) : (
                <>
                  {processesError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                        <span className="text-yellow-700">Firebase接続エラー: サンプルデータを表示しています</span>
                      </div>
                    </div>
                  )}

                  {activeView === "list" && (
                    <>
                      {filteredCompanies.length === 0 ? (
                        <div className="text-center py-16">
                          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-xl text-gray-500 mb-2">
                            該当する工程が見つかりません
                          </p>
                          <p className="text-gray-400">
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
                                  <span className="font-semibold text-gray-900 text-lg">{company.name}</span>
                                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {company.processes.length}件
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
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
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                              </div>
                              
                              {/* 工程リスト */}
                              <div className="space-y-2">
                                {company.processes.map((process) => (
                                  <div key={process.id} className="bg-white/90 backdrop-blur rounded-lg border border-gray-200/60 hover:border-blue-300 hover:shadow-lg transition-all duration-200 p-1">
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
                      processes={showCompleted ? allProcesses : allProcesses.filter(p => p.status !== 'completed')}
                      viewType={ganttViewType}
                      showWeekends={showWeekends}
                      period={ganttPeriod}
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