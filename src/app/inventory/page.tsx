"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Package,
  Plus,
  Search,
  Filter,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Ruler,
  Scissors,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  Building2,
  User,
  MapPin,
  RefreshCcw,
  Download,
  Upload,
  FileText,
  QrCode,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportInventory } from "@/lib/utils/exportUtils";
import { useInventory } from './hooks/useInventory';

// 型定義
interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  condition: "excellent" | "good" | "fair" | "poor" | "broken";
  status: "available" | "in-use" | "maintenance" | "repair" | "retired";
  location: string;
  assignedTo?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceHistory: MaintenanceRecord[];
  usageHours?: number;
  specifications: { [key: string]: string };
  notes?: string;
  tags: string[];
  qrCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
}

interface MaintenanceRecord {
  id: string;
  date: string;
  type: "inspection" | "repair" | "replacement" | "calibration";
  description: string;
  cost: number;
  technician: string;
  nextDueDate?: string;
}

interface InventoryStatistics {
  totalItems: number;
  totalValue: number;
  availableItems: number;
  inUseItems: number;
  maintenanceItems: number;
  repairItems: number;
  averageAge: number;
  maintenanceDueItems: number;
}

const InventoryManagement = () => {
  const {
    items,
    categories: firebaseCategories,
    statistics,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refreshData,
  } = useInventory();

  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // カテゴリのアイコンマッピング
  const iconMapping: { [key: string]: any } = {
    "Scissors": Scissors,
    "Ruler": Ruler,
    "Wrench": Wrench,
    "Settings": Settings,
    "Package": Package,
  };

  // カテゴリ定義（Firebaseデータとフォールバック）
  const categories: InventoryCategory[] = firebaseCategories.length > 0 
    ? firebaseCategories.map(cat => ({
        ...cat,
        icon: iconMapping[cat.iconName] || Package,
      }))
    : [
        {
          id: "cutting-tools",
          name: "切削工具",
          icon: Scissors,
          color: "text-blue-600",
          bgColor: "bg-blue-100 border-blue-300",
          description: "エンドミル、ドリル、バイトなど",
        },
        {
          id: "measuring-tools",
          name: "測定器具",
          icon: Ruler,
          color: "text-green-600",
          bgColor: "bg-green-100 border-green-300",
          description: "ノギス、マイクロメータ、ゲージなど",
        },
        {
          id: "jigs-fixtures",
          name: "治具・取付具",
          icon: Wrench,
          color: "text-purple-600",
          bgColor: "bg-purple-100 border-purple-300",
          description: "バイス、治具、取付具など",
        },
        {
          id: "hand-tools",
          name: "作業工具",
          icon: Wrench,
          color: "text-orange-600",
          bgColor: "bg-orange-100 border-orange-300",
          description: "レンチ、ドライバー、ハンマーなど",
        },
        {
          id: "machines",
          name: "機械・設備",
          icon: Settings,
          color: "text-red-600",
          bgColor: "bg-red-100 border-red-300",
          description: "工作機械、測定機器など",
        },
        {
          id: "consumables",
          name: "消耗品",
          icon: Package,
          color: "text-gray-600 dark:text-slate-400",
          bgColor: "bg-gray-100 border-gray-300",
          description: "研磨剤、潤滑油、安全用品など",
        },
      ];

  // エラー表示
  useEffect(() => {
    if (error) {
      console.error('Inventory error:', error);
    }
  }, [error]);

  // フィルタリング
  useEffect(() => {
    let filtered = items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === "all" || item.category.id === categoryFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    setFilteredItems(filtered);
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // 統計はFirebaseフックから取得するため削除

  // ステータス・コンディションのバッジ
  const getStatusBadge = (status: InventoryItem["status"]) => {
    switch (status) {
      case "available":
        return <Badge variant="default" className="bg-green-500">利用可能</Badge>;
      case "in-use":
        return <Badge variant="outline" className="border-blue-500 text-blue-600">使用中</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">メンテナンス</Badge>;
      case "repair":
        return <Badge variant="destructive">修理中</Badge>;
      case "retired":
        return <Badge variant="secondary">廃棄</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConditionColor = (condition: InventoryItem["condition"]) => {
    switch (condition) {
      case "excellent": return "text-green-600";
      case "good": return "text-blue-600";
      case "fair": return "text-yellow-600";
      case "poor": return "text-orange-600";
      case "broken": return "text-red-600";
      default: return "text-gray-600 dark:text-slate-400";
    }
  };

  const getConditionText = (condition: InventoryItem["condition"]) => {
    switch (condition) {
      case "excellent": return "優良";
      case "good": return "良好";
      case "fair": return "普通";
      case "poor": return "劣化";
      case "broken": return "故障";
      default: return condition;
    }
  };

  // QRコード生成（模擬）
  const generateQRCode = (item: InventoryItem) => {
    return `QR-${item.id}`;
  };

  // 新規アイテム作成
  const createNewItem = (): InventoryItem => {
    return {
      id: Date.now().toString(),
      name: "",
      category: categories[0],
      type: "",
      brand: "",
      model: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      currentValue: 0,
      condition: "excellent",
      status: "available",
      location: "",
      specifications: {},
      notes: "",
      tags: [],
      maintenanceHistory: [],
    };
  };

  // アイテム保存
  const handleSaveItem = async (itemData: InventoryItem) => {
    try {
      if (selectedItem && selectedItem.id) {
        // 更新
        await updateItem(selectedItem.id, itemData);
      } else {
        // 新規作成 - IDとFirebase固有フィールドを除去
        const { id, createdAt, updatedAt, createdBy, ...createData } = itemData;
        await createItem({
          ...createData,
          categoryId: itemData.category.id,
        } as any);
      }
      setShowAddModal(false);
      setSelectedItem(null);
      await refreshData();
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('保存に失敗しました: ' + (error as Error).message);
    }
  };

  // アイテム削除
  const handleDeleteItem = async (id: string) => {
    if (confirm("この工具を削除しますか？")) {
      try {
        await deleteItem(id);
        await refreshData();
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert('削除に失敗しました: ' + (error as Error).message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">工具管理</h1>
                <p className="text-gray-600 dark:text-slate-300 mt-1">
                  切削工具・測定器具・治具の在庫管理とメンテナンス追跡
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="工具を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 dark:border-slate-600 focus:border-orange-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              
              {/* 表示モード切り替え */}
              <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none border-none"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none border-none"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>

              {/* 新規追加ボタン */}
              <Button
                onClick={() => {
                  setSelectedItem(createNewItem());
                  setShowAddModal(true);
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規登録
              </Button>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">総アイテム数</p>
                    <p className="text-2xl font-bold text-blue-600">{statistics.totalItems}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">総資産価値</p>
                    <p className="text-2xl font-bold text-green-600">
                      ¥{(statistics.totalValue / 10000).toFixed(0)}万
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">利用可能</p>
                    <p className="text-2xl font-bold text-purple-600">{statistics.availableItems}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">使用中</p>
                    <p className="text-2xl font-bold text-yellow-600">{statistics.inUseItems}</p>
                  </div>
                  <Activity className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">メンテナンス予定</p>
                    <p className="text-2xl font-bold text-red-600">{statistics.maintenanceDueItems}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">30日以内</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-gray-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">平均使用年数</p>
                    <p className="text-2xl font-bold text-gray-600 dark:text-slate-400">{statistics.averageAge.toFixed(1)}年</p>
                  </div>
                  <Clock className="w-8 h-8 text-gray-500 dark:text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center space-x-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="カテゴリで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリ</SelectItem>
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${category.color}`} />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="available">利用可能</SelectItem>
                <SelectItem value="in-use">使用中</SelectItem>
                <SelectItem value="maintenance">メンテナンス</SelectItem>
                <SelectItem value="repair">修理中</SelectItem>
                <SelectItem value="retired">廃棄</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />
            
            {/* エクスポートボタン */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                  disabled={filteredItems.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="px-3 py-2 text-sm text-gray-600 dark:text-slate-300 border-b border-gray-200 dark:border-slate-600">
                  エクスポート対象
                </div>
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
                  <div>• フィルター適用後の工具データ: {filteredItems.length}件</div>
                  <div>• カテゴリ: {categoryFilter === 'all' ? 'すべて' : categories.find(c => c.id === categoryFilter)?.name || categoryFilter}</div>
                  <div>• ステータス: {statusFilter === 'all' ? 'すべて' : 
                    statusFilter === 'available' ? '利用可能' :
                    statusFilter === 'in-use' ? '使用中' :
                    statusFilter === 'maintenance' ? 'メンテナンス' :
                    statusFilter === 'repair' ? '修理中' :
                    statusFilter === 'retired' ? '廃棄' : statusFilter}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => exportInventory(filteredItems, 'csv', categoryFilter, statusFilter)}
                  disabled={filteredItems.length === 0}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV形式でエクスポート
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => exportInventory(filteredItems, 'excel', categoryFilter, statusFilter)}
                  disabled={filteredItems.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel形式でエクスポート
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="text-sm text-gray-600 dark:text-slate-300">
              {filteredItems.length} / {items.length} 件表示
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-16">
              <RefreshCcw className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-spin" />
              <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">データを読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <p className="text-xl text-red-500 mb-2">データの読み込みに失敗しました</p>
              <p className="text-gray-400 dark:text-slate-500 mb-4">{error}</p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCcw className="w-4 h-4 mr-2" />
                再試行
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">該当する工具が見つかりません</p>
              <p className="text-gray-400 dark:text-slate-500">検索条件を変更するか、新しい工具を登録してください</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => {
                const Icon = item.category.icon;
                const isMaintenanceDue = item.nextMaintenanceDate && 
                  new Date(item.nextMaintenanceDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-5 h-5 ${item.category.color}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-slate-300">{item.brand} {item.model}</p>
                          </div>
                        </div>
                        {isMaintenanceDue && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(item.status)}
                          <span className={`text-sm font-medium ${getConditionColor(item.condition)}`}>
                            {getConditionText(item.condition)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span>現在価値:</span>
                            <span className="font-medium">¥{item.currentValue.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>保管場所:</span>
                            <span className="truncate max-w-[120px]">{item.location}</span>
                          </div>
                          {item.assignedTo && (
                            <div className="flex items-center justify-between">
                              <span>使用者:</span>
                              <span className="truncate max-w-[120px]">{item.assignedTo}</span>
                            </div>
                          )}
                        </div>

                        {/* タグ */}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* アクションボタン */}
                        <div className="flex items-center space-x-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDetailModal(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            詳細
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowAddModal(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* リスト表示 */
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">名称</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">カテゴリ</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">ブランド・型番</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">ステータス</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">保管場所</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">現在価値</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const Icon = item.category.icon;
                    return (
                      <tr key={item.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <Icon className={`w-4 h-4 ${item.category.color}`} />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                              {item.serialNumber && (
                                <div className="text-sm text-gray-500 dark:text-slate-400">S/N: {item.serialNumber}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={item.category.bgColor}>
                            {item.category.name}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">{item.brand}</div>
                            <div className="text-gray-600 dark:text-slate-300">{item.model}</div>
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(item.status)}</td>
                        <td className="p-4 text-sm text-gray-600 dark:text-slate-300">{item.location}</td>
                        <td className="p-4 text-sm font-medium">¥{item.currentValue.toLocaleString()}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setShowDetailModal(true);
                              }}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setShowAddModal(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 工具登録・編集モーダル */}
        {showAddModal && selectedItem && (
          <ItemFormModal
            item={selectedItem}
            categories={categories}
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setSelectedItem(null);
            }}
            onSave={handleSaveItem}
          />
        )}

        {/* 詳細表示モーダル */}
        {showDetailModal && selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// 工具登録・編集モーダル
interface ItemFormModalProps {
  item: InventoryItem;
  categories: InventoryCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  item,
  categories,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<InventoryItem>(item);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {item.id ? "工具編集" : "新規工具登録"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>カテゴリ *</Label>
              <Select
                value={formData.category.id}
                onValueChange={(value) => {
                  const category = categories.find(c => c.id === value);
                  if (category) setFormData({...formData, category});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => {
                    const Icon = category.icon;
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${category.color}`} />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>ブランド</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
              />
            </div>
            <div>
              <Label>型番</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
              />
            </div>
            <div>
              <Label>シリアル番号</Label>
              <Input
                value={formData.serialNumber || ""}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>購入日</Label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
              />
            </div>
            <div>
              <Label>保管場所 *</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>購入価格</Label>
              <Input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label>現在価値</Label>
              <Input
                type="number"
                value={formData.currentValue}
                onChange={(e) => setFormData({...formData, currentValue: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label>使用時間</Label>
              <Input
                type="number"
                value={formData.usageHours || ""}
                onChange={(e) => setFormData({...formData, usageHours: Number(e.target.value)})}
                placeholder="時間"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>ステータス</Label>
              <Select
                value={formData.status}
                onValueChange={(value: InventoryItem["status"]) => 
                  setFormData({...formData, status: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">利用可能</SelectItem>
                  <SelectItem value="in-use">使用中</SelectItem>
                  <SelectItem value="maintenance">メンテナンス</SelectItem>
                  <SelectItem value="repair">修理中</SelectItem>
                  <SelectItem value="retired">廃棄</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>状態</Label>
              <Select
                value={formData.condition}
                onValueChange={(value: InventoryItem["condition"]) => 
                  setFormData({...formData, condition: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">優良</SelectItem>
                  <SelectItem value="good">良好</SelectItem>
                  <SelectItem value="fair">普通</SelectItem>
                  <SelectItem value="poor">劣化</SelectItem>
                  <SelectItem value="broken">故障</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>使用者</Label>
              <Input
                value={formData.assignedTo || ""}
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>備考</Label>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
              保存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 詳細表示モーダル
interface ItemDetailModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const Icon = item.category.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className={`w-6 h-6 ${item.category.color}`} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.name}</h2>
          </div>
          <Button variant="outline" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-slate-600 pb-2">基本情報</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">カテゴリ:</span>
                <Badge variant="outline" className={item.category.bgColor}>
                  {item.category.name}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">ブランド:</span>
                <span>{item.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">型番:</span>
                <span>{item.model}</span>
              </div>
              {item.serialNumber && (
                <div className="flex justify-between">
                  <span className="font-medium">シリアル番号:</span>
                  <span>{item.serialNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">購入日:</span>
                <span>{item.purchaseDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">保管場所:</span>
                <span>{item.location}</span>
              </div>
            </div>
          </div>

          {/* ステータス・価値 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-slate-600 pb-2">ステータス・価値</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">ステータス:</span>
                <span>{/* getStatusBadge would be called here */}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">購入価格:</span>
                <span>¥{item.purchasePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">現在価値:</span>
                <span>¥{item.currentValue.toLocaleString()}</span>
              </div>
              {item.usageHours && (
                <div className="flex justify-between">
                  <span className="font-medium">使用時間:</span>
                  <span>{item.usageHours}時間</span>
                </div>
              )}
              {item.assignedTo && (
                <div className="flex justify-between">
                  <span className="font-medium">使用者:</span>
                  <span>{item.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 仕様 */}
        {Object.keys(item.specifications).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-slate-600 pb-2 mb-4">仕様</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(item.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タグ */}
        {item.tags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-slate-600 pb-2 mb-4">タグ</h3>
            <div className="flex flex-wrap gap-2">
              {item.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* メンテナンス履歴 */}
        {item.maintenanceHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-slate-600 pb-2 mb-4">メンテナンス履歴</h3>
            <div className="space-y-3">
              {item.maintenanceHistory.map(record => (
                <div key={record.id} className="bg-gray-50 dark:bg-slate-700 p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{record.date}</span>
                    <Badge variant="outline">
                      {record.type === 'inspection' ? '点検' :
                       record.type === 'repair' ? '修理' :
                       record.type === 'replacement' ? '交換' : '校正'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">{record.description}</p>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                    <span>担当: {record.technician}</span>
                    <span>費用: ¥{record.cost.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 備考 */}
        {item.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-slate-600 pb-2 mb-4">備考</h3>
            <p className="text-sm text-gray-700 dark:text-slate-300">{item.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;