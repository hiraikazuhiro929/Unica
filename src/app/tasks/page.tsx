"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Building2,
  Clock,
  BarChart3,
  Grid3X3,
  AlertCircle,
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
  const [filterStatus, setFilterStatus] = useState<Process["status"] | "all">(
    "all"
  );
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [ganttViewType] = useState<
    "machine" | "person" | "project"
  >("machine");
  const [orderInfo, setOrderInfo] = useState<any>(null);

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
    toggleCompany,
    getStatistics,
  } = useProcessManagement();

  // 受注情報からの工程作成処理
  useEffect(() => {
    if (fromOrderId && !orderInfo) {
      // 受注情報を取得
      fetchOrderInfo(fromOrderId);
    }
  }, [fromOrderId, orderInfo]);

  // URLパラメータで指定された工程を表示
  useEffect(() => {
    const processId = searchParams.get('processId');
    if (processId && companies.length > 0) {
      // 作成された工程を探して詳細表示
      const foundProcess = companies
        .flatMap(company => company.processes)
        .find(process => process.id === processId);
      
      if (foundProcess) {
        setSelectedProcess(foundProcess);
        setShowDetail(true);
      }
    }
  }, [searchParams, companies]);

  const fetchOrderInfo = async (orderId: string) => {
    try {
      // Firebase から受注情報を取得
      const { getOrder } = await import('@/lib/firebase/orders');
      const orderResult = await getOrder(orderId);
      
      if (orderResult.success && orderResult.data) {
        const orderData = orderResult.data;
        setOrderInfo(orderData);
        
        // 受注情報メッセージを表示
        if (orderData.projectName && orderData.managementNumber) {
          // 既に作成済みの場合はメッセージだけ表示
          console.log(`受注案件「${orderData.projectName}」(${orderData.managementNumber})から工程が作成されました。`);
        }
      } else {
        console.warn('受注情報の取得に失敗しました:', orderResult.error);
        // フォールバック：模擬データ
        const mockOrderInfo = {
          id: orderId,
          projectName: "受注案件からの工程作成",
          client: "クライアント名",
          managementNumber: `ORD-2025-${orderId.padStart(3, '0')}`,
          deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedAmount: 500000,
          description: "受注管理から移行された案件"
        };
        setOrderInfo(mockOrderInfo);
      }
    } catch (error) {
      console.error('受注情報の取得に失敗しました:', error);
    }
  };

  // キーボードショートカット
  useKeyboardShortcuts({
    onNewProcess: () => {
      setSelectedProcess(createNewProcess());
      setShowNewProcessModal(true);
    },
    onSearch: () => {
      const searchInput = document.querySelector(
        'input[placeholder*="検索"]'
      ) as HTMLInputElement;
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

  // イベントハンドラー
  const openDetail = (process: Process) => {
    setSelectedProcess(process);
    setShowDetail(true);
  };

  const handleProcessUpdate = (updatedProcess: Process) => {
    updateProcess(updatedProcess);
    setSelectedProcess(updatedProcess);
  };

  const handleNewProcessSave = (newProcess: Process) => {
    addProcess(newProcess);
    setShowNewProcessModal(false);
  };

  // フィルタリング
  const filteredCompanies = companies
    .map((company) => ({
      ...company,
      processes: company.processes.filter((process) => {
        const matchesSearch =
          process.projectName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          process.managementNumber
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          process.fieldPerson
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          process.orderClient.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === "all" || process.status === filterStatus;

        return matchesSearch && matchesStatus;
      }),
    }))
    .filter((company) => company.processes.length > 0);

  // 全プロセスを取得
  const allProcesses = companies.flatMap((company) => company.processes);
  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  工程管理システム
                  {fromOrderId && (
                    <span className="ml-3 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      受注案件から作成中
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  {orderInfo && (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 font-medium">
                        {orderInfo.managementNumber} - {orderInfo.projectName}
                      </span>
                      {orderInfo.client && (
                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs">
                          {orderInfo.client}
                        </span>
                      )}
                      {orderInfo.deliveryDate && (
                        <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                          納期: {orderInfo.deliveryDate}
                        </span>
                      )}
                    </div>
                  )}
                  <span>
                    総工程数:{" "}
                    <span className="font-bold text-blue-600">
                      {stats.total}
                    </span>
                  </span>
                  <span>
                    総工数:{" "}
                    <span className="font-bold text-green-600">
                      {stats.totalHours}H
                    </span>
                  </span>
                  <span>
                    平均進捗:{" "}
                    <span className="font-bold text-purple-600">
                      {stats.avgProgress.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="工程を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              {/* フィルター */}
              <Select
                value={filterStatus}
                onValueChange={(value: string) =>
                  setFilterStatus(value as Process["status"] | "all")
                }
              >
                <SelectTrigger className="w-40 border-2 border-gray-300">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて ({stats.total})</SelectItem>
                  <SelectItem value="planning">
                    計画 ({stats.byStatus.planning})
                  </SelectItem>
                  <SelectItem value="data-work">
                    データ ({stats.byStatus["data-work"]})
                  </SelectItem>
                  <SelectItem value="processing">
                    加工 ({stats.byStatus.processing})
                  </SelectItem>
                  <SelectItem value="finishing">
                    仕上 ({stats.byStatus.finishing})
                  </SelectItem>
                  <SelectItem value="completed">
                    完了 ({stats.byStatus.completed})
                  </SelectItem>
                  <SelectItem value="delayed">
                    遅延 ({stats.byStatus.delayed})
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 新規追加ボタン */}
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6"
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

        {/* タブナビゲーション */}
        <div className="bg-white border-b border-gray-200 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                工程リスト
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                ガントチャート
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                看板
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* 工程リスト */}
            <TabsContent value="list" className="m-0 p-6">
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
                <div className="space-y-5">
                  {filteredCompanies.map((company) => (
                    <Card
                      key={company.id}
                      className="bg-white border-gray-200 shadow-lg overflow-hidden rounded-xl p-0"
                    >
                      <CardHeader
                        className="py-5 px-4 cursor-pointer bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors border-b flex items-center"
                        onClick={() => toggleCompany(company.id)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Building2
                              className="w-5 h-5"
                              style={{ color: getClientColor(company.name) }}
                            />
                            <span className="font-medium text-gray-800">
                              {company.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
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
                              <span>
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
                        </div>
                      </CardHeader>

                      {company.isExpanded && (
                        <CardContent className="px-4 pt-0 pb-4">
                          <div className="space-y-2">
                            {company.processes.map((process) => (
                              <ProcessRow
                                key={process.id}
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
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              </>
              )}
            </TabsContent>

            {/* ガントチャート */}
            <TabsContent value="gantt" className="m-0 p-6">
              {isProcessesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">工程データを読み込み中...</p>
                  </div>
                </div>
              ) : activeTab === "gantt" ? (
              <GanttChart
                processes={allProcesses}
                viewType={ganttViewType}
                onProcessClick={openDetail}
                onProcessUpdate={handleProcessUpdate}
              />
              ) : null}
            </TabsContent>

            {/* 看板 */}
            <TabsContent value="kanban" className="m-0 p-6">
              {isProcessesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">工程データを読み込み中...</p>
                  </div>
                </div>
              ) : activeTab === "kanban" ? (
              <KanbanBoard
                processes={allProcesses}
                onProcessClick={openDetail}
                onStatusChange={updateStatus}
                onProgressChange={updateProgress}
              />
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        {/* 詳細モーダル */}
        {selectedProcess && showDetail && (
          <ProcessDetail
            process={selectedProcess}
            isOpen={showDetail}
            onClose={() => setShowDetail(false)}
            onSave={handleProcessUpdate}
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
