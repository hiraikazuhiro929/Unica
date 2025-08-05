"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Building2,
  Calendar,
  Hash,
  Package,
  Edit,
  Trash2,
  ArrowRight,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  Eye,
  Settings,
  FileText,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { getClientColor } from "@/app/tasks/components/gantt/ganttUtils";
import { 
  createOrder, 
  updateOrder, 
  deleteOrder, 
  getOrders,
  subscribeToOrders,
  calculateOrderStatistics,
  generateManagementNumber,
  type OrderItem
} from "@/lib/firebase/orders";
import { runFirebaseIntegrationTest } from "@/lib/firebase/testConnection";

const OrderManagement = () => {
  const router = useRouter();
  
  // State management
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [relatedData, setRelatedData] = useState<{[key: string]: any}>({});

  // Initialize data
  useEffect(() => {
    loadInitialData();
    
    // Set up real-time subscription
    const unsubscribe = subscribeToOrders(
      { limit: 100, orderByField: 'createdAt', orderDirection: 'desc' },
      (updatedOrders) => {
        setOrders(updatedOrders);
        // 受注データが更新されたら関連データも更新
        loadRelatedData(updatedOrders);
      }
    );

    return () => unsubscribe();
  }, []);

  // 関連工程・工数データの取得
  const loadRelatedData = async (ordersList: OrderItem[]) => {
    const relatedInfo: {[key: string]: any} = {};
    
    for (const order of ordersList) {
      // 模擬的な関連データ取得
      const mockRelatedData = {
        processes: [
          {
            id: `proc-${order.id}-1`,
            name: '段取り・データ作成',
            status: 'completed',
            progress: 100,
            estimatedHours: 4,
            actualHours: 5
          },
          {
            id: `proc-${order.id}-2`,
            name: '機械加工',
            status: 'processing',
            progress: 65,
            estimatedHours: 12,
            actualHours: 8
          },
          {
            id: `proc-${order.id}-3`,
            name: '仕上げ・検査',
            status: 'planning',
            progress: 0,
            estimatedHours: 6,
            actualHours: 0
          }
        ],
        workHours: {
          totalPlanned: 22,
          totalActual: 13,
          efficiency: 59.1
        }
      };
      
      relatedInfo[order.id || ''] = mockRelatedData;
    }
    
    setRelatedData(relatedInfo);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getOrders({ limit: 100, orderByField: 'createdAt', orderDirection: 'desc' });
      if (result.success) {
        setOrders(result.data);
        // 初期データ読み込み時も関連データを取得
        loadRelatedData(result.data);
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
    
    setIsSaving(true);
    try {
      const result = await deleteOrder(id);
      if (!result.success) {
        alert(`削除に失敗しました: ${result.error}`);
      }
      // Data will be updated via real-time subscription
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Firebase connection test
  const runSystemTests = async () => {
    setIsSaving(true);
    try {
      console.log('🔥 Firebase統合テストを実行中...');
      const testResults = await runFirebaseIntegrationTest();
      
      const message = testResults.overall 
        ? `Firebase統合テスト完了！\n\n✅ 接続テスト: 成功\n✅ コレクションテスト: 成功\n\n🎉 すべてのFirebaseサービスが正常に動作しています！`
        : `Firebase統合テスト完了\n\n❌ 接続テスト: ${testResults.connection.success ? '成功' : '失敗'}\n❌ コレクションテスト: ${testResults.collections.success ? '成功' : '失敗'}\n\n⚠️ Firebase接続に問題があります。`;
      
      alert(message);
    } catch (error: any) {
      console.error('Firebase test error:', error);
      alert('Firebaseテストの実行中にエラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // Process and work hours creation without navigation
  const createProcessAndWorkHours = async (order: OrderItem) => {
    try {
      setIsSaving(true);
      
      // Import required functions  
      const { createProcess: createProcessInFirebase } = await import('@/lib/firebase/processes');
      const { createWorkHours } = await import('@/lib/firebase/workHours');
      
      // Create process template from order data with better defaults
      const processTemplate = {
        orderId: order.id || '',
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
          setup: Math.max(2, Math.ceil(order.quantity * 0.5)), // 数量に応じた段取り時間
          machining: Math.max(4, Math.ceil(order.quantity * 2)), // 数量に応じた加工時間
          finishing: Math.max(2, Math.ceil(order.quantity * 0.8)), // 数量に応じた仕上げ時間
          additionalSetup: 0,
          additionalMachining: 0,
          additionalFinishing: 0,
          useDynamicSteps: false,
          totalEstimatedHours: Math.max(2, Math.ceil(order.quantity * 0.5)) + Math.max(4, Math.ceil(order.quantity * 2)) + Math.max(2, Math.ceil(order.quantity * 0.8)),
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

      // Create process in Firebase
      const processResult = await createProcessInFirebase(processTemplate);
      
      if (!processResult.id) {
        throw new Error(processResult.error || '工程の作成に失敗しました');
      }

      // Create work hours template
      const plannedHours = {
        setup: processTemplate.workDetails.setup,
        machining: processTemplate.workDetails.machining,
        finishing: processTemplate.workDetails.finishing,
        total: processTemplate.workDetails.setup + processTemplate.workDetails.machining + processTemplate.workDetails.finishing
      };

      const workHoursTemplate = {
        orderId: order.id || '',
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
          totalPlannedCost: (plannedHours.setup * 3000) + (plannedHours.machining * 4000) + (plannedHours.finishing * 3500),
          totalActualCost: 0
        },
        status: 'planning' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create work hours record
      const workHoursResult = await createWorkHours(workHoursTemplate);

      if (workHoursResult.error) {
        console.warn('工数データの作成に失敗:', workHoursResult.error);
      }

      // Update order status to indicate process creation
      if (order.id) {
        await updateOrder(order.id, {
          status: 'data-work',
          progress: 15 // Initial progress after process creation
        });
      }

      // Update the order in the local state to reflect changes
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? { ...o, status: 'data-work', progress: 15 }
            : o
        )
      );

      // Show success notification with links
      const successMessage = `✅ 「${order.projectName}」の工程と工数管理データを作成しました！

📋 工程ID: ${processResult.id}
⏱️ 工数管理ID: ${workHoursResult.id || 'エラー'}
📊 計画工数: ${plannedHours.total}時間

各画面で詳細を編集できます。`;

      alert(successMessage);
      
      // Refresh related data to show the newly created items
      loadRelatedData([...orders]);
      
    } catch (error: any) {
      console.error('Process and work hours creation error:', error);
      alert(`❌ エラーが発生しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate statistics
  const getOrderStatistics = () => {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.estimatedAmount || 0), 0);
    const urgentOrders = orders.filter(order => {
      const daysUntilDelivery = Math.ceil(
        (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDelivery <= 7;
    }).length;
    const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

    return { totalOrders, totalAmount, urgentOrders, avgOrderValue };
  };

  // Filter and group orders
  const filteredAndGroupedOrders = () => {
    const filtered = orders.filter((order) => {
      const matchesSearch =
        order.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.managementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.client.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Group by client
    const grouped = filtered.reduce((acc, order) => {
      const client = order.client;
      if (!acc[client]) {
        acc[client] = [];
      }
      acc[client].push(order);
      return acc;
    }, {} as Record<string, OrderItem[]>);

    return Object.entries(grouped).map(([client, orders]) => ({
      client,
      orders,
      isExpanded: true,
    }));
  };

  const statistics = getOrderStatistics();
  const groupedOrders = filteredAndGroupedOrders();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">受注案件管理</h1>
                <p className="text-gray-600 mt-1">
                  すべての受注案件を一元管理し、工程・工数管理への橋渡しを行います
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="案件を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
              
              {/* Test button */}
              <Button
                variant="outline"
                size="sm"
                onClick={runSystemTests}
                disabled={isSaving}
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                テスト実行
              </Button>
              
              {/* New order button */}
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6"
                onClick={async () => {
                  const newOrder = await createNewOrder();
                  setSelectedOrder(newOrder);
                  setShowNewOrderModal(true);
                }}
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 mr-2" />
                新規受注
              </Button>
            </div>
          </div>

          {/* Statistics cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">総案件数</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {statistics.totalOrders}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">総金額</p>
                    <p className="text-2xl font-bold text-green-600">
                      ¥{statistics.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">緊急案件</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statistics.urgentOrders}
                    </p>
                    <p className="text-xs text-gray-500">納期1週間以内</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">平均案件単価</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ¥{Math.round(statistics.avgOrderValue).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {groupedOrders.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 mb-2">
                該当する受注案件が見つかりません
              </p>
              <p className="text-gray-400">
                検索条件を変更するか、新しい案件を追加してください
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedOrders.map((group) => (
                <Card
                  key={group.client}
                  className="bg-white border-gray-200 shadow-lg overflow-hidden rounded-xl"
                >
                  <CardHeader className="py-4 px-6 bg-gradient-to-r from-gray-50 to-white border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2
                          className="w-5 h-5"
                          style={{ color: getClientColor(group.client) }}
                        />
                        <span className="font-medium text-gray-800 text-lg">
                          {group.client}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{group.orders.length}件</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            ¥{group.orders
                              .reduce((sum, o) => sum + (o.estimatedAmount || 0), 0)
                              .toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-6 pt-0 pb-4">
                    <div className="space-y-2">
                      {group.orders.map((order) => {
                        const orderRelatedData = relatedData[order.id || ''];
                        return (
                          <div
                            key={order.id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-6 flex-1">
                                {/* Management number */}
                                <div className="flex items-center space-x-2 min-w-[120px]">
                                  <Hash className="w-4 h-4 text-gray-500" />
                                  <span className="font-mono text-sm text-gray-600">
                                    {order.managementNumber}
                                  </span>
                                </div>

                                {/* Project name */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                                    {order.projectName}
                                  </h3>
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center space-x-2 min-w-[80px]">
                                  <Package className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm text-gray-700">
                                    {order.quantity} {order.unit}
                                  </span>
                                </div>

                                {/* Amount */}
                                <div className="flex items-center space-x-2 min-w-[100px]">
                                  <DollarSign className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm text-gray-700">
                                    {order.estimatedAmount
                                      ? `¥${order.estimatedAmount.toLocaleString()}`
                                      : "-"}
                                  </span>
                                </div>
                              </div>

                              {/* Delivery date badge */}
                              <div className="flex items-center space-x-2 min-w-[120px]">
                                {(() => {
                                  const daysUntilDelivery = Math.ceil(
                                    (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                                  );
                                  if (daysUntilDelivery <= 3) {
                                    return <Badge variant="destructive" className="text-xs">緊急</Badge>;
                                  } else if (daysUntilDelivery <= 7) {
                                    return <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">注意</Badge>;
                                  } else {
                                    return <Badge variant="secondary" className="text-xs">余裕</Badge>;
                                  }
                                })()}
                                <Calendar className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-700">
                                  {order.deliveryDate}
                                </span>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-600 hover:bg-blue-50 h-8 px-3"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowNewOrderModal(true);
                                  }}
                                  disabled={isSaving}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  編集
                                </Button>
                                {order.status === 'data-work' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100 h-8 px-3"
                                    disabled
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    作成済み
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white h-8 px-3"
                                    onClick={() => createProcessAndWorkHours(order)}
                                    disabled={isSaving}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    工程・工数作成
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-600 hover:bg-red-50 h-8 px-3"
                                  onClick={() => order.id && handleDeleteOrder(order.id)}
                                  disabled={isSaving}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                </Button>
                              </div>
                            </div>

                            {/* Related processes and work hours info */}
                            {(orderRelatedData || order.status === 'data-work') && (
                              <div className="border-t pt-3 mt-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-6">
                                    {/* Creation status */}
                                    {order.status === 'data-work' && (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-green-600 font-medium">工程・工数作成済み</span>
                                      </div>
                                    )}

                                    {/* Process status */}
                                    {orderRelatedData && (
                                      <>
                                        <div className="flex items-center space-x-2">
                                          <FileText className="w-4 h-4 text-green-600" />
                                          <span className="text-xs text-gray-500">工程進捗:</span>
                                          <div className="flex space-x-1">
                                            {orderRelatedData.processes.map((process: any, index: number) => (
                                              <div
                                                key={index}
                                                className={`w-2 h-2 rounded-full ${
                                                  process.status === 'completed' ? 'bg-green-500' :
                                                  process.status === 'processing' ? 'bg-blue-500' : 'bg-gray-300'
                                                }`}
                                                title={`${process.name}: ${process.progress}%`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs text-gray-600">
                                            {Math.round(orderRelatedData.processes.reduce((sum: number, p: any) => sum + p.progress, 0) / orderRelatedData.processes.length)}%
                                          </span>
                                        </div>

                                        {/* Work hours efficiency */}
                                        <div className="flex items-center space-x-2">
                                          <Clock className="w-4 h-4 text-purple-600" />
                                          <span className="text-xs text-gray-500">工数効率:</span>
                                          <span className={`text-xs font-medium ${
                                            orderRelatedData.workHours.efficiency <= 100 ? 'text-green-600' :
                                            orderRelatedData.workHours.efficiency <= 120 ? 'text-yellow-600' : 'text-red-600'
                                          }`}>
                                            {orderRelatedData.workHours.efficiency.toFixed(1)}%
                                          </span>
                                          <span className="text-xs text-gray-600">
                                            ({orderRelatedData.workHours.totalActual}h / {orderRelatedData.workHours.totalPlanned}h)
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {/* Quick navigation buttons */}
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-green-600 hover:bg-green-50"
                                      onClick={() => router.push(`/tasks?fromOrder=${order.id}`)}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      工程管理
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50"
                                      onClick={() => router.push(`/work-hours?orderId=${order.id}`)}
                                    >
                                      <BarChart3 className="w-3 h-3 mr-1" />
                                      工数管理
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {order.id ? "受注案件編集" : "新規受注案件"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">管理番号</label>
              <Input
                value={formData.managementNumber}
                onChange={(e) =>
                  setFormData({ ...formData, managementNumber: e.target.value })
                }
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">工事名</label>
              <Input
                value={formData.projectName}
                onChange={(e) =>
                  setFormData({ ...formData, projectName: e.target.value })
                }
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">受注先</label>
            <Input
              value={formData.client}
              onChange={(e) =>
                setFormData({ ...formData, client: e.target.value })
              }
              required
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">数量</label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">単位</label>
              <Input
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">見積金額</label>
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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">受注日</label>
              <Input
                type="date"
                value={formData.orderDate}
                onChange={(e) =>
                  setFormData({ ...formData, orderDate: e.target.value })
                }
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">納期</label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryDate: e.target.value })
                }
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">詳細・備考</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
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