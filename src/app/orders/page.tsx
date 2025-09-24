"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Calendar,
  Package,
  Edit,
  Trash2,
  ArrowRight,
  FileText,
  BarChart3,
  Download,
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createOrder,
  updateOrder,
  deleteOrder,
  getOrders,
  subscribeToOrders,
  generateManagementNumber,
  type OrderItem
} from "@/lib/firebase/orders";
import { exportOrders } from "@/lib/utils/exportUtils";
import { exportIntegratedData, exportByPeriod } from "@/lib/utils/integratedExportUtils";
import { exportComprehensiveProjectData } from "@/lib/utils/comprehensiveExportUtils";

const OrderManagement = () => {
  
  // State management
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [, setError] = useState<string | null>(null);
  
  // UI state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Initialize data
  useEffect(() => {
    loadInitialData();
    
    // Set up real-time subscription
    const unsubscribe = subscribeToOrders(
      { limit: 100, orderByField: 'createdAt', orderDirection: 'desc' },
      (updatedOrders) => {
        setOrders(updatedOrders);
      }
    );

    return () => unsubscribe();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getOrders({ limit: 100, orderByField: 'createdAt', orderDirection: 'desc' });
      if (result.success) {
        setOrders(result.data);
      } else {
        setError(result.error || 'データの読み込みに失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'データの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new order template
  const createNewOrder = async (): Promise<OrderItem> => {
    const managementNumber = await generateManagementNumber();
    return {
      managementNumber,
      projectName: "",
      client: "",
      quantity: 1,
      unit: "個",
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: "",
      description: "",
      estimatedAmount: 0,
      status: 'planning',
      priority: 'medium',
      progress: 0,
    };
  };

  // Save order
  const handleSaveOrder = async (orderData: OrderItem) => {
    setIsSaving(true);
    try {
      let result;
      
      if (selectedOrder && selectedOrder.id) {
        // Update existing order
        result = await updateOrder(selectedOrder.id, orderData);
      } else {
        // Create new order
        result = await createOrder(orderData);
      }
      
      if (result.success) {
        // Track the action
        const action = selectedOrder?.id ? 'order_updated' : 'order_created';
        // Track the action if tracking is available
        console.log(`${action}: Order ${selectedOrder?.id || 'unknown'} - ${orderData.projectName}`);
        
        setShowNewOrderModal(false);
        setSelectedOrder(null);
        // Data will be updated via real-time subscription
      } else {
        alert(`保存に失敗しました: ${result.error}`);
      }
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete order
  const handleDeleteOrder = async (id: string) => {
    if (!confirm("この受注案件を削除しますか？")) return;

    const orderToDelete = orders.find(order => order.id === id);

    setIsSaving(true);
    try {
      const result = await deleteOrder(id);
      if (result.success) {
        // Log the deletion
        console.log(`order_deleted: Order ${id} - ${orderToDelete?.projectName}`);
      } else {
        alert(`削除に失敗しました: ${result.error}`);
      }
      // Data will be updated via real-time subscription
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Create process and work hours
  const handleCreateProcessAndWorkHours = async (order: OrderItem) => {
    if (!order.id) {
      alert('案件IDが見つかりません');
      return;
    }

    setIsSaving(true);
    try {
      // 重複チェック: 既存の工程・工数データの確認
      console.log(`🔍 重複チェック開始: ${order.managementNumber}`);

      // 管理番号から既存データを検索
      const { managementNumberManager } = await import('@/lib/utils/managementNumber');
      const existingRecord = await managementNumberManager.findByManagementNumberWithRepair(order.managementNumber);

      if (existingRecord?.relatedIds?.processId || existingRecord?.relatedIds?.workHoursId) {
        const existingData = [];
        if (existingRecord.relatedIds.processId) existingData.push('工程データ');
        if (existingRecord.relatedIds.workHoursId) existingData.push('工数データ');

        const confirmMessage = `⚠️ 既に作成済みのデータが存在します:
${existingData.join('、')}

続行すると重複データが作成される可能性があります。
それでも続行しますか？

既存データを確認したい場合は「キャンセル」を選択し、工程管理・工数管理画面で「${order.managementNumber}」を検索してください。`;

        if (!confirm(confirmMessage)) {
          setIsSaving(false);
          return;
        }
      }

      // 直接データベース検索による二重チェック
      const { getProcessesList } = await import('@/lib/firebase/processes');
      const { getWorkHoursList } = await import('@/lib/firebase/workHours');

      const [existingProcessesResult, existingWorkHoursResult] = await Promise.all([
        getProcessesList({
          limit: 1
        }),
        getWorkHoursList({
          limit: 1
        })
      ]);

      if (existingProcessesResult.data?.length > 0 || existingWorkHoursResult.data?.length > 0) {
        console.log('⚠️ データベースで既存データを発見');
        const existingData = [];
        if (existingProcessesResult.data?.length > 0) existingData.push(`工程データ(${existingProcessesResult.data.length}件)`);
        if (existingWorkHoursResult.data?.length > 0) existingData.push(`工数データ(${existingWorkHoursResult.data.length}件)`);

        alert(`❌ 重複データの作成を防止しました

既存データ:
${existingData.join('、')}

管理番号: ${order.managementNumber}

既存データを確認・編集するには、工程管理・工数管理画面で上記の管理番号を検索してください。`);

        setIsSaving(false);
        return;
      }

      console.log('✅ 重複チェック完了: 新規作成を継続');

      // 工程データの作成
      const processData = {
        orderId: order.id,
        orderClient: order.client,
        lineNumber: '001',
        projectName: order.projectName,
        managementNumber: order.managementNumber,
        progress: 0,
        quantity: order.quantity,
        salesPerson: '受注管理システム',
        assignee: '未割当',
        fieldPerson: '未割当',
        assignedMachines: [],
        workDetails: {
          setup: 0,
          machining: 0,
          finishing: 0,
          additionalSetup: 0,
          additionalMachining: 0,
          additionalFinishing: 0,
          useDynamicSteps: false,
          totalEstimatedHours: 0,
          totalActualHours: 0
        },
        orderDate: order.orderDate,
        arrivalDate: order.orderDate,
        shipmentDate: order.deliveryDate,
        dataWorkDate: new Date().toISOString().split('T')[0],
        processingPlanDate: order.deliveryDate,
        remarks: order.description || `${order.client}様からの受注案件`,
        status: 'planning' as const,
        priority: order.priority || 'medium' as const,
        dueDate: order.deliveryDate
      };

      // 総工数を計算
      processData.workDetails.totalEstimatedHours = 
        processData.workDetails.setup + 
        processData.workDetails.machining + 
        processData.workDetails.finishing;

      // Firebase functions をダイナミックインポート
      const { createProcess } = await import('@/lib/firebase/processes');
      const { createWorkHours } = await import('@/lib/firebase/workHours');

      // 工程作成
      const processResult = await createProcess(processData);
      if (!processResult.id || processResult.error) {
        throw new Error(processResult.error || '工程の作成に失敗しました');
      }

      // 工数データの作成
      const plannedHours = {
        setup: 0,
        machining: 0,
        finishing: 0,
        total: 0
      };

      const workHoursData = {
        orderId: order.id,
        processId: processResult.id,
        projectName: order.projectName,
        client: order.client,
        managementNumber: order.managementNumber,
        plannedHours,
        actualHours: {
          setup: 0,
          machining: 0,
          finishing: 0,
          total: 0
        },
        budget: {
          estimatedAmount: order.estimatedAmount || 0,
          setupRate: 3000,
          machiningRate: 4000,
          finishingRate: 3500,
          totalPlannedCost: 0,
          totalActualCost: 0
        },
        status: 'planning' as const
      };

      // 工数作成
      const workHoursResult = await createWorkHours(workHoursData);

      // 管理番号レコードに関連IDを登録（双方向同期）
      console.log('🔄 管理番号レコードに関連IDを同期中...');

      try {
        if (processResult.id) {
          await managementNumberManager.linkRelatedId(order.managementNumber, 'processId', processResult.id);
          console.log(`✅ 工程ID同期完了: ${processResult.id}`);
        }

        if (workHoursResult.id) {
          await managementNumberManager.linkRelatedId(order.managementNumber, 'workHoursId', workHoursResult.id);
          console.log(`✅ 工数ID同期完了: ${workHoursResult.id}`);
        }

        console.log('✅ 双方向同期完了');
      } catch (syncError) {
        console.error('同期エラー:', syncError);
        // 同期エラーは警告として表示するが、作成は成功として扱う
        console.warn('⚠️ 管理番号レコードの同期に失敗しましたが、データ作成は成功しました');
      }

      // 受注案件のステータス更新
      await updateOrder(order.id, {
        status: 'data-work',
        progress: 15
      });

      // 成功メッセージ
      alert(`✅ 「${order.projectName}」の工程・工数管理データを作成しました！

📋 工程ID: ${processResult.id}
⏱️ 工数管理ID: ${workHoursResult.id || 'エラー'}
🔗 管理番号: ${order.managementNumber}

工程管理・工数管理画面で詳細な工数を入力してください。`);

    } catch (error: any) {
      console.error('Process and work hours creation error:', error);
      alert(`❌ エラーが発生しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    // Tab filtering first
    const matchesTab = activeTab === 'active' ? order.status !== 'completed' : order.status === 'completed';

    const matchesSearch =
      order.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.managementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesClient = filterClient === 'all' || order.client === filterClient;

    return matchesTab && matchesSearch && matchesStatus && matchesClient;
  });

  // Get unique clients for filter
  const uniqueClients = [...new Set(orders.map(order => order.client))];

  // Calculate statistics
  const statistics = {
    totalOrders: filteredOrders.length,
    totalAmount: filteredOrders.reduce((sum, order) => sum + (order.estimatedAmount || 0), 0),
    urgentOrders: filteredOrders.filter(order => {
      const daysUntilDelivery = Math.ceil(
        (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDelivery <= 7;
    }).length,
    avgOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((sum, order) => sum + (order.estimatedAmount || 0), 0) / filteredOrders.length : 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'planning': return 'bg-yellow-500';
      case 'data-work': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'processing': return '進行中';
      case 'planning': return '計画中';
      case 'data-work': return 'データ作業中';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">受注案件管理</h1>
                  <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-4">
                    <span>総案件数: {statistics.totalOrders}件</span>
                    <span>稼働中: {orders.filter(o => o.status !== 'completed').length}件</span>
                    <span>総額: ¥{Math.round(statistics.totalAmount/10000)}万円</span>
                    {statistics.urgentOrders > 0 && (
                      <span className="text-red-600">緊急: {statistics.urgentOrders}件</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              稼働中案件 ({orders.filter(o => o.status !== 'completed').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              完了済み案件 ({orders.filter(o => o.status === 'completed').length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder="案件名、管理番号、顧客名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
              disabled={activeTab === 'completed'}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                {activeTab === 'active' ? (
                  <>
                    <SelectItem value="planning">計画中</SelectItem>
                    <SelectItem value="data-work">データ作業中</SelectItem>
                    <SelectItem value="processing">進行中</SelectItem>
                  </>
                ) : (
                  <SelectItem value="completed">完了</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="顧客で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての顧客</SelectItem>
                {uniqueClients.map(client => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* エクスポートボタン */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={filteredOrders.length === 0}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">エクスポート</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="px-3 py-2 text-sm text-gray-600 dark:text-slate-400 border-b border-gray-200 dark:border-slate-600">
                  <div className="font-medium mb-1">エクスポート対象</div>
                  <div className="space-y-1 text-xs">
                    <div>ステータス: {filterStatus === 'all' ? 'すべて' : filterStatus === 'planning' ? '計画中' : filterStatus === 'data-work' ? 'データ作業中' : filterStatus === 'processing' ? '進行中' : '完了'}</div>
                    <div>顧客: {filterClient === 'all' ? 'すべて' : filterClient}</div>
                    {searchQuery && <div>検索: "{searchQuery}"</div>}
                    <div className="font-medium text-blue-600 dark:text-blue-400">
                      {filteredOrders.length}件の受注案件
                    </div>
                  </div>
                </div>
                <DropdownMenuItem 
                  onClick={() => {
                    exportOrders(filteredOrders, 'csv');
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV形式でダウンロード
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    exportOrders(filteredOrders, 'excel');
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Excel形式でダウンロード
                </DropdownMenuItem>

                <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>

                <DropdownMenuItem
                  onClick={async () => {
                    const result = await exportIntegratedData('excel', {
                      includeCompleted: activeTab === 'completed' || activeTab === 'active',
                      includeActive: activeTab === 'active' || activeTab === 'completed'
                    });
                    if (result.success) {
                      alert(`✅ ${result.message}\n受注案件: ${result.counts?.orders}件\n工程管理: ${result.counts?.processes}件\n工数管理: ${result.counts?.workHours}件`);
                    } else {
                      alert(`❌ ${result.message}`);
                    }
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  統合エクスポート (案件+工程+工数)
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={async () => {
                    const result = await exportByPeriod('month', new Date(), 'excel');
                    if (result.success) {
                      alert(`✅ 今月分の統合データをエクスポートしました\n受注案件: ${result.counts?.orders}件\n工程管理: ${result.counts?.processes}件\n工数管理: ${result.counts?.workHours}件`);
                    } else {
                      alert(`❌ ${result.message}`);
                    }
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  今月分統合エクスポート
                </DropdownMenuItem>

                <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>

                <DropdownMenuItem
                  onClick={async () => {
                    const result = await exportComprehensiveProjectData('excel');
                    if (result.success) {
                      alert(`✅ 完了済み案件の包括的データをエクスポートしました\n案件数: ${result.projectCount}件\n\n含まれるデータ:\n・完了案件の受注〜納品履歴\n・関連工程の実績詳細\n・実作業時間・コスト\n・収益性分析（粗利・粗利率）`);
                    } else {
                      alert(`❌ ${result.message}`);
                    }
                  }}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  完了案件アーカイブデータ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  const newOrder = await createNewOrder();
                  setSelectedOrder(newOrder);
                  setShowNewOrderModal(true);
                }}
                disabled={isSaving}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">顧客</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">案件名</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">管理番号</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">数量</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">金額</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">納期</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">ステータス</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const daysUntilDelivery = Math.ceil(
                  (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <tr key={order.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="p-4">
                      <span className="text-gray-700 dark:text-slate-300">{order.client}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-900 dark:text-white">{order.projectName}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1 rounded">
                        {order.managementNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-700 dark:text-slate-300">{order.quantity} {order.unit}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900 dark:text-white">
                        {order.estimatedAmount ? `¥${order.estimatedAmount.toLocaleString()}` : "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          daysUntilDelivery <= 3 ? 'bg-red-500' :
                          daysUntilDelivery <= 7 ? 'bg-orange-500' : 'bg-green-500'
                        }`} />
                        <span className="text-gray-700 dark:text-slate-300">{order.deliveryDate}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${getStatusColor(order.status || 'planning')} text-white`}>
                        {getStatusText(order.status || 'planning')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowNewOrderModal(true);
                          }}
                          disabled={isSaving}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateProcessAndWorkHours(order)}
                          disabled={isSaving || order.status === 'completed'}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (order.id && window.confirm('この案件を削除しますか？')) {
                              handleDeleteOrder(order.id);
                            }
                          }}
                          disabled={isSaving}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
              <p>検索条件に合う案件が見つかりません</p>
            </div>
          )}
        </div>
      </div>

      {/* Order form modal */}
      {showNewOrderModal && selectedOrder && (
        <OrderFormModal
          order={selectedOrder}
          isOpen={showNewOrderModal}
          onClose={() => {
            setShowNewOrderModal(false);
            setSelectedOrder(null);
          }}
          onSave={handleSaveOrder}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

// Order form modal component
interface OrderFormModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: OrderItem) => void;
  isSaving: boolean;
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [formData, setFormData] = useState<OrderItem>(order);

  useEffect(() => {
    setFormData(order);
  }, [order]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {order.id ? "受注案件編集" : "新規受注案件"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">管理番号</label>
              <Input
                value={formData.managementNumber}
                onChange={(e) =>
                  setFormData({ ...formData, managementNumber: e.target.value })
                }
                required
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">案件名</label>
              <Input
                value={formData.projectName}
                onChange={(e) =>
                  setFormData({ ...formData, projectName: e.target.value })
                }
                required
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">顧客名</label>
            <Input
              value={formData.client}
              onChange={(e) =>
                setFormData({ ...formData, client: e.target.value })
              }
              required
              disabled={isSaving}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">数量</label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
                required
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">単位</label>
              <Input
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                required
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">見積金額</label>
              <Input
                type="number"
                value={formData.estimatedAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedAmount: Number(e.target.value),
                  })
                }
                placeholder="円"
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">受注日</label>
              <Input
                type="date"
                value={formData.orderDate}
                onChange={(e) =>
                  setFormData({ ...formData, orderDate: e.target.value })
                }
                required
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">納期</label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryDate: e.target.value })
                }
                required
                disabled={isSaving}
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">詳細・備考</label>
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderManagement;