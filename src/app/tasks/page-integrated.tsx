"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

// 型とコンポーネントのインポート
import { Process } from "@/app/tasks/types";
import { useProcessManagement } from "@/app/tasks/hooks/useProcessManagement";
import { useKeyboardShortcuts } from "@/app/tasks/hooks/useKeyboardShortcuts";
import { ProcessDetail } from "@/app/tasks/components/ProcessDetail";
import { GanttChart } from "@/app/tasks/components/gantt/GanttChart";
import { KanbanBoard } from "@/app/tasks/components/kanban/KanbanBoard";

const ProcessListIntegrated = () => {
  const searchParams = useSearchParams();
  const fromOrderId = searchParams.get('fromOrder');
  
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Process["status"] | "all">("all");
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [activeView, setActiveView] = useState("grid");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(true);

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
  const filteredProcesses = companies
    .flatMap(company => 
      company.processes.map(process => ({ ...process, companyName: company.name }))
    )
    .filter(process => {
      const matchesSearch = searchQuery === "" || 
        process.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.managementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.fieldPerson.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || process.status === filterStatus;
      const matchesCompany = !selectedCompany || process.companyName === selectedCompany;
      
      return matchesSearch && matchesStatus && matchesCompany;
    });

  const stats = getStatistics();

  // リアルタイム進行中の工程
  const activeProcesses = filteredProcesses
    .filter(p => p.status === 'processing' || p.status === 'data-work')
    .slice(0, 5);

  // 本日期限の工程
  const todayDeadlines = filteredProcesses
    .filter(p => {
      const today = new Date().toISOString().split('T')[0];
      return p.deliveryDate === today;
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

  // プロセスカードコンポーネント
  const ProcessCard = ({ process }: { process: Process & { companyName: string } }) => (
    <div 
      className="group bg-white rounded-xl p-5 hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-300 hover:-translate-y-1"
      onClick={() => {
        setSelectedProcess(process);
        setShowDetail(true);
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 font-mono">{process.managementNumber}</span>
            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getStatusColor(process.status)}`}>
              {process.status === 'data-work' ? 'データ' : 
               process.status === 'planning' ? '計画' :
               process.status === 'processing' ? '加工' :
               process.status === 'finishing' ? '仕上' :
               process.status === 'completed' ? '完了' : '遅延'}
            </Badge>
          </div>
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">{process.projectName}</h3>
          <p className="text-sm text-gray-500">{process.companyName}</p>
        </div>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">進捗状況</span>
          <span className="text-sm font-bold text-gray-900">{process.progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600"
            style={{ width: `${process.progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Users className="w-3.5 h-3.5" />
            <span>{process.fieldPerson}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">
              {process.workDetails.setup + process.workDetails.machining + process.workDetails.finishing}H
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <span className={process.deliveryDate === new Date().toISOString().split('T')[0] ? 'text-red-600 font-bold' : 'text-gray-600'}>
            {process.deliveryDate}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="ml-16 h-screen flex flex-col">
        {/* 統合ヘッダー - より薄く、フローティング感を演出 */}
        <div className="bg-white/70 backdrop-blur-xl border-b border-gray-200/30 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">工程管理</h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    全{stats.total}件 • 総工数{stats.totalHours}H
                  </p>
                </div>
              </div>
              
              {/* 統合されたスタッツバー */}
              <div className="flex items-center gap-6 px-6 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Activity className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">進行中</p>
                    <p className="text-lg font-bold text-gray-900">{stats.byStatus.processing}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <Target className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">完了</p>
                    <p className="text-lg font-bold text-gray-900">{stats.byStatus.completed}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">平均進捗</p>
                    <p className="text-lg font-bold text-gray-900">{stats.avgProgress.toFixed(0)}%</p>
                  </div>
                </div>
                {stats.byStatus.delayed > 0 && (
                  <>
                    <div className="w-px h-8 bg-gray-300" />
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-red-100 rounded-lg animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">遅延</p>
                        <p className="text-lg font-bold text-red-600">{stats.byStatus.delayed}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-10 w-72 bg-white/80 border-gray-200 focus:bg-white focus:border-blue-400 transition-all"
                />
              </div>
              
              {/* ビュー切り替え */}
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setActiveView("grid")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeView === "grid" 
                      ? "bg-blue-500 text-white shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveView("gantt")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeView === "gantt" 
                      ? "bg-blue-500 text-white shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveView("kanban")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeView === "kanban" 
                      ? "bg-blue-500 text-white shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>
              
              {/* 新規作成 */}
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
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
        </div>

        {/* メインコンテンツエリア - サイドパネル統合 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左サイドパネル - フローティングカード風 */}
          {showSidePanel && (
            <div className="w-80 p-4 overflow-y-auto bg-transparent">
              <div className="space-y-4">
                {/* アクティブタスク */}
                <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      アクティブタスク
                    </h3>
                    <Badge className="bg-amber-100 text-amber-700 border-0">
                      {activeProcesses.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {activeProcesses.length > 0 ? (
                      activeProcesses.map(process => (
                        <div 
                          key={process.id}
                          className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200/50 hover:shadow-md cursor-pointer transition-all"
                          onClick={() => {
                            setSelectedProcess(process);
                            setShowDetail(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 line-clamp-1">
                              {process.projectName}
                            </span>
                            <span className="text-xs font-bold text-amber-600">{process.progress}%</span>
                          </div>
                          <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                              style={{ width: `${process.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                            <span>{process.fieldPerson}</span>
                            <span>{process.companyName}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        アクティブなタスクはありません
                      </p>
                    )}
                  </div>
                </div>

                {/* 今日の期限 */}
                {todayDeadlines.length > 0 && (
                  <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-red-200/50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-red-500 animate-pulse" />
                        本日期限
                      </h3>
                      <Badge className="bg-red-100 text-red-700 border-0">
                        {todayDeadlines.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {todayDeadlines.map(process => (
                        <div 
                          key={process.id}
                          className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200/50 hover:shadow-md cursor-pointer transition-all"
                          onClick={() => {
                            setSelectedProcess(process);
                            setShowDetail(true);
                          }}
                        >
                          <p className="text-sm font-medium text-red-900 line-clamp-1">
                            {process.projectName}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-xs text-red-700">
                            <span>{process.managementNumber}</span>
                            <span className="font-semibold">{process.companyName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* クイックフィルター */}
                <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    フィルター
                  </h3>
                  
                  {/* ステータスフィルター */}
                  <div className="space-y-2 mb-4">
                    {[
                      { value: 'all', label: 'すべて', color: 'gray' },
                      { value: 'planning', label: '計画', color: 'blue' },
                      { value: 'processing', label: '加工中', color: 'amber' },
                      { value: 'completed', label: '完了', color: 'green' },
                      { value: 'delayed', label: '遅延', color: 'red' }
                    ].map(item => (
                      <button
                        key={item.value}
                        onClick={() => setFilterStatus(item.value as any)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                          filterStatus === item.value 
                            ? `bg-${item.color}-100 text-${item.color}-700 font-semibold shadow-sm` 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{item.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.value === 'all' ? stats.total : stats.byStatus[item.value] || 0}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 会社フィルター */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">会社別</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedCompany(null)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                          !selectedCompany ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        すべての会社
                      </button>
                      {companies.map(company => (
                        <button
                          key={company.id}
                          onClick={() => setSelectedCompany(company.name)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                            selectedCompany === company.name 
                              ? 'bg-blue-100 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="line-clamp-1">{company.name}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {company.processes.length}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* メインビューエリア */}
          <div className="flex-1 overflow-y-auto p-6 bg-transparent">
            {isProcessesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">読み込み中...</p>
                </div>
              </div>
            ) : (
              <>
                {processesError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800">データ取得エラー: サンプルデータを表示</span>
                  </div>
                )}

                {activeView === "grid" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {filteredProcesses.length > 0 ? (
                      filteredProcesses.map(process => (
                        <ProcessCard key={process.id} process={process} />
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-20">
                        <Package className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-xl text-gray-500 mb-2">該当する工程がありません</p>
                        <p className="text-gray-400">フィルター条件を変更してください</p>
                      </div>
                    )}
                  </div>
                )}

                {activeView === "gantt" && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <GanttChart
                      processes={filteredProcesses}
                      viewType="machine"
                      onProcessClick={(process) => {
                        setSelectedProcess(process);
                        setShowDetail(true);
                      }}
                      onProcessUpdate={updateProcess}
                    />
                  </div>
                )}

                {activeView === "kanban" && (
                  <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-6">
                    <KanbanBoard
                      processes={filteredProcesses}
                      onProcessClick={(process) => {
                        setSelectedProcess(process);
                        setShowDetail(true);
                      }}
                      onStatusChange={updateStatus}
                      onProgressChange={updateProgress}
                    />
                  </div>
                )}
              </>
            )}
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
            onSave={addProcess}
            generateLineNumber={generateLineNumber}
            isNew={true}
            companies={companies}
          />
        )}
      </div>
    </div>
  );
};

export default ProcessListIntegrated;