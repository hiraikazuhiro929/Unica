"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  FileText,
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  File,
  Image,
  FileSpreadsheet,
  FileImage,
  Package,
  Wrench,
  Receipt,
  Calendar,
  Building2,
  User,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Scissors,
  Ruler,
  Settings,
  Activity,
  BarChart3,
} from "lucide-react";

// 型定義
interface FileItem {
  id: string;
  name: string;
  type: string;
  category: FileCategory;
  size: number;
  uploadDate: string;
  lastModified: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
  version?: string;
  status: "active" | "archived" | "draft";
  downloadCount: number;
  filePath: string;
}

interface FileCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  allowedTypes: string[];
}

// 工具管理の型定義（inventoryから移行）
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

// 図面管理の型定義
interface DrawingItem {
  id: string;
  drawingNumber: string;
  title: string;
  revision: string;
  drawingType: "assembly" | "part" | "section" | "detail";
  projectName: string;
  clientName: string;
  designedBy: string;
  approvedBy: string;
  drawingDate: string;
  approvalDate: string;
  scale: string;
  material?: string;
  dimensions: string;
  tolerance?: string;
  notes?: string;
  status: "draft" | "approved" | "revision" | "obsolete";
  filePath: string;
  fileSize: number;
  tags: string[];
}

// 納品書管理の型定義
interface DeliveryItem {
  id: string;
  deliveryNumber: string;
  orderNumber: string;
  clientName: string;
  clientAddress: string;
  deliveryDate: string;
  items: DeliveryProduct[];
  totalAmount: number;
  tax: number;
  finalAmount: number;
  deliveryMethod: string;
  trackingNumber?: string;
  status: "pending" | "shipped" | "delivered" | "completed";
  createdBy: string;
  createdDate: string;
  notes?: string;
  filePath: string;
}

interface DeliveryProduct {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

// ユーティリティ関数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'pdf': return FileImage;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return Image;
    case 'xlsx': case 'xls': case 'csv': return FileSpreadsheet;
    default: return FileText;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
    case "available":
    case "approved":
    case "delivered":
      return <Badge variant="default" className="bg-green-500">アクティブ</Badge>;
    case "draft":
    case "pending":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">下書き</Badge>;
    case "archived":
    case "retired":
    case "obsolete":
      return <Badge variant="secondary">アーカイブ</Badge>;
    case "in-use":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">使用中</Badge>;
    case "maintenance":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">メンテナンス</Badge>;
    case "repair":
      return <Badge variant="destructive">修理中</Badge>;
    case "revision":
      return <Badge variant="outline" className="border-orange-500 text-orange-600">改訂中</Badge>;
    case "shipped":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">発送済</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-green-500">完了</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const FileManagementSystem = () => {
  const [activeTab, setActiveTab] = useState("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // データ状態
  const [files, setFiles] = useState<FileItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);

  // ファイルカテゴリ定義
  const fileCategories: FileCategory[] = [
    {
      id: "documents",
      name: "ドキュメント",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100 border-blue-300",
      description: "仕様書、マニュアル、報告書など",
      allowedTypes: [".pdf", ".docx", ".txt", ".md"]
    },
    {
      id: "images",
      name: "画像",
      icon: Image,
      color: "text-green-600",
      bgColor: "bg-green-100 border-green-300",
      description: "写真、イラスト、スクリーンショットなど",
      allowedTypes: [".jpg", ".jpeg", ".png", ".gif", ".bmp"]
    },
    {
      id: "spreadsheets",
      name: "表計算",
      icon: FileSpreadsheet,
      color: "text-purple-600",
      bgColor: "bg-purple-100 border-purple-300",
      description: "Excel、CSV、データファイルなど",
      allowedTypes: [".xlsx", ".xls", ".csv"]
    },
    {
      id: "archives",
      name: "アーカイブ",
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100 border-orange-300",
      description: "圧縮ファイル、バックアップなど",
      allowedTypes: [".zip", ".rar", ".7z", ".tar"]
    }
  ];

  // 工具カテゴリ定義（inventoryから移植）
  const inventoryCategories: InventoryCategory[] = [
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

  // サンプルデータ
  const sampleFiles: FileItem[] = [
    {
      id: "1",
      name: "製品仕様書_Ver2.1.pdf",
      type: "pdf",
      category: fileCategories[0],
      size: 2048576, // 2MB in bytes
      uploadDate: "2024-01-15",
      lastModified: "2024-01-20",
      uploadedBy: "田中エンジニア",
      description: "新製品の詳細仕様書",
      tags: ["仕様書", "製品", "重要"],
      version: "2.1",
      status: "active",
      downloadCount: 25,
      filePath: "/files/specs/product_spec_v2.1.pdf"
    },
    {
      id: "2",
      name: "工程写真_2024-01.jpg",
      type: "jpg",
      category: fileCategories[1],
      size: 1536000, // 1.5MB
      uploadDate: "2024-01-10",
      lastModified: "2024-01-10",
      uploadedBy: "佐藤作業員",
      description: "1月の製造工程記録写真",
      tags: ["工程", "記録", "写真"],
      status: "active",
      downloadCount: 12,
      filePath: "/files/photos/process_2024-01.jpg"
    },
    {
      id: "3",
      name: "生産実績_2024Q1.xlsx",
      type: "xlsx",
      category: fileCategories[2],
      size: 512000, // 500KB
      uploadDate: "2024-03-31",
      lastModified: "2024-04-02",
      uploadedBy: "山田課長",
      description: "2024年第1四半期の生産実績データ",
      tags: ["生産", "実績", "Q1", "データ"],
      status: "active",
      downloadCount: 8,
      filePath: "/files/reports/production_2024Q1.xlsx"
    }
  ];

  // サンプル工具データ（inventoryから移植）
  const sampleInventory: InventoryItem[] = [
    {
      id: "1",
      name: "超硬エンドミル 10mm",
      category: inventoryCategories[0],
      type: "エンドミル",
      brand: "OSG",
      model: "EX-EEDL",
      serialNumber: "EM-001",
      purchaseDate: "2023-03-15",
      purchasePrice: 8500,
      currentValue: 6800,
      condition: "good",
      status: "available",
      location: "工具庫A-1-3",
      usageHours: 120,
      specifications: {
        "径": "10mm",
        "刃長": "30mm",
        "全長": "100mm",
        "材質": "超硬",
        "コーティング": "TiAlN"
      },
      notes: "アルミ加工用",
      tags: ["アルミ", "精密", "高速"],
      maintenanceHistory: []
    }
  ];

  // サンプル図面データ
  const sampleDrawings: DrawingItem[] = [
    {
      id: "1",
      drawingNumber: "DWG-2024-001",
      title: "ベースプレート組立図",
      revision: "Rev.A",
      drawingType: "assembly",
      projectName: "プロジェクトAlpha",
      clientName: "ABC製造株式会社",
      designedBy: "鈴木設計",
      approvedBy: "田中部長",
      drawingDate: "2024-01-15",
      approvalDate: "2024-01-20",
      scale: "1:1",
      material: "SS400",
      dimensions: "200x150x50mm",
      tolerance: "±0.1mm",
      notes: "溶接後機械加工",
      status: "approved",
      filePath: "/drawings/DWG-2024-001_RevA.dwg",
      fileSize: 1024000,
      tags: ["組立", "ベース", "溶接"]
    }
  ];

  // サンプル納品書データ
  const sampleDeliveries: DeliveryItem[] = [
    {
      id: "1",
      deliveryNumber: "DEL-2024-001",
      orderNumber: "ORD-2024-0025",
      clientName: "XYZ工業株式会社",
      clientAddress: "東京都千代田区xxx-xxx",
      deliveryDate: "2024-02-15",
      items: [
        {
          id: "1",
          productName: "精密部品A",
          quantity: 50,
          unitPrice: 1200,
          totalPrice: 60000,
          specifications: "材質:アルミA5052"
        }
      ],
      totalAmount: 60000,
      tax: 6000,
      finalAmount: 66000,
      deliveryMethod: "宅配便",
      trackingNumber: "123456789",
      status: "delivered",
      createdBy: "佐藤営業",
      createdDate: "2024-02-10",
      notes: "急ぎ対応",
      filePath: "/deliveries/DEL-2024-001.pdf"
    }
  ];

  // 初期化
  useEffect(() => {
    setFiles(sampleFiles);
    setInventory(sampleInventory);
    setDrawings(sampleDrawings);
    setDeliveries(sampleDeliveries);
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">統合ファイル管理</h1>
                <p className="text-gray-600 dark:text-slate-300 mt-1">
                  ファイル・工具・図面・納品書の統合管理システム
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
              
              {/* アップロードボタン */}
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6"
              >
                <Upload className="w-4 h-4 mr-2" />
                アップロード
              </Button>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="files" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>ファイル管理</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>工具管理</span>
              </TabsTrigger>
              <TabsTrigger value="drawings" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>図面管理</span>
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>納品書管理</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* ファイル管理タブ */}
            <TabsContent value="files" className="p-6">
              <FileManagementTab 
                files={files}
                categories={fileCategories}
                searchQuery={searchQuery}
                onFileUpload={() => setShowUploadModal(true)}
              />
            </TabsContent>

            {/* 工具管理タブ */}
            <TabsContent value="inventory" className="p-6">
              <InventoryManagementTab 
                inventory={inventory}
                categories={inventoryCategories}
                searchQuery={searchQuery}
              />
            </TabsContent>

            {/* 図面管理タブ */}
            <TabsContent value="drawings" className="p-6">
              <DrawingManagementTab 
                drawings={drawings}
                searchQuery={searchQuery}
              />
            </TabsContent>

            {/* 納品書管理タブ */}
            <TabsContent value="deliveries" className="p-6">
              <DeliveryManagementTab 
                deliveries={deliveries}
                searchQuery={searchQuery}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* ファイルアップロードモーダル */}
        {showUploadModal && (
          <FileUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={(file) => {
              // ファイルアップロード処理
              const newFile: FileItem = {
                id: Date.now().toString(),
                name: file.name,
                type: file.name.split('.').pop() || 'unknown',
                category: fileCategories[0], // デフォルトカテゴリ
                size: file.size,
                uploadDate: new Date().toISOString().split('T')[0],
                lastModified: new Date().toISOString().split('T')[0],
                uploadedBy: "現在のユーザー", // 実際の実装では認証ユーザーを使用
                description: "",
                tags: [],
                status: "active",
                downloadCount: 0,
                filePath: `/uploads/${file.name}`
              };
              setFiles([...files, newFile]);
              setShowUploadModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

// ファイル管理タブコンポーネント
interface FileManagementTabProps {
  files: FileItem[];
  categories: FileCategory[];
  searchQuery: string;
  onFileUpload: () => void;
}

const FileManagementTab: React.FC<FileManagementTabProps> = ({ 
  files, 
  categories, 
  searchQuery, 
  onFileUpload 
}) => {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // フィルタリング
  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || file.category.id === categoryFilter;
    const matchesStatus = statusFilter === "all" || file.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* フィルター */}
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
            <SelectItem value="active">アクティブ</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="archived">アーカイブ</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {filteredFiles.length} / {files.length} 件表示
        </div>
      </div>

      {/* ファイル一覧テーブル */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">ファイル名</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">カテゴリ</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">サイズ</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">更新日</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">アップロード者</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">ステータス</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">アクション</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map(file => {
              const FileIcon = getFileIcon(file.type);
              return (
                <tr key={file.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{file.name}</div>
                        {file.description && (
                          <div className="text-sm text-gray-500 dark:text-slate-400">{file.description}</div>
                        )}
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {file.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={file.category.bgColor}>
                      {file.category.name}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                    {file.lastModified}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                    {file.uploadedBy}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(file.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
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
    </div>
  );
};

// 工具管理タブコンポーネント
interface InventoryManagementTabProps {
  inventory: InventoryItem[];
  categories: InventoryCategory[];
  searchQuery: string;
}

const InventoryManagementTab: React.FC<InventoryManagementTabProps> = ({ 
  inventory, 
  categories, 
  searchQuery 
}) => {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // フィルタリング
  const filteredInventory = inventory.filter(item => {
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

  return (
    <div className="space-y-6">
      {/* フィルター */}
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
        
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {filteredInventory.length} / {inventory.length} 件表示
        </div>
      </div>

      {/* 工具一覧テーブル */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/20 overflow-hidden">
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
            {filteredInventory.map(item => {
              const Icon = item.category.icon;
              return (
                <tr key={item.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${item.category.color}`} />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                        {item.serialNumber && (
                          <div className="text-sm text-gray-500">S/N: {item.serialNumber}</div>
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
                      <div className="font-medium">{item.brand}</div>
                      <div className="text-gray-600 dark:text-slate-300">{item.model}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                    {item.location}
                  </td>
                  <td className="p-4 text-sm font-medium">
                    ¥{item.currentValue.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
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
    </div>
  );
};

// 図面管理タブコンポーネント
interface DrawingManagementTabProps {
  drawings: DrawingItem[];
  searchQuery: string;
}

const DrawingManagementTab: React.FC<DrawingManagementTabProps> = ({ 
  drawings, 
  searchQuery 
}) => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // フィルタリング
  const filteredDrawings = drawings.filter(drawing => {
    const matchesSearch = 
      drawing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drawing.drawingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drawing.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drawing.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || drawing.drawingType === typeFilter;
    const matchesStatus = statusFilter === "all" || drawing.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="flex items-center space-x-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="図面種類で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての種類</SelectItem>
            <SelectItem value="assembly">組立図</SelectItem>
            <SelectItem value="part">部品図</SelectItem>
            <SelectItem value="section">断面図</SelectItem>
            <SelectItem value="detail">詳細図</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="ステータスで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのステータス</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="approved">承認済</SelectItem>
            <SelectItem value="revision">改訂中</SelectItem>
            <SelectItem value="obsolete">廃版</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {filteredDrawings.length} / {drawings.length} 件表示
        </div>
      </div>

      {/* 図面一覧テーブル */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">図面番号</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">図面名</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">改訂版</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">種類</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">プロジェクト</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">ステータス</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">アクション</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrawings.map(drawing => (
              <tr key={drawing.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{drawing.drawingNumber}</div>
                      <div className="text-sm text-gray-500">縮尺: {drawing.scale}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{drawing.title}</div>
                    <div className="text-sm text-gray-500">{drawing.clientName}</div>
                  </div>
                </td>
                <td className="p-4 text-sm font-medium">
                  {drawing.revision}
                </td>
                <td className="p-4">
                  <Badge variant="outline">
                    {drawing.drawingType === 'assembly' ? '組立図' :
                     drawing.drawingType === 'part' ? '部品図' :
                     drawing.drawingType === 'section' ? '断面図' : '詳細図'}
                  </Badge>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {drawing.projectName}
                </td>
                <td className="p-4">
                  {getStatusBadge(drawing.status)}
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 納品書管理タブコンポーネント
interface DeliveryManagementTabProps {
  deliveries: DeliveryItem[];
  searchQuery: string;
}

const DeliveryManagementTab: React.FC<DeliveryManagementTabProps> = ({ 
  deliveries, 
  searchQuery 
}) => {
  const [statusFilter, setStatusFilter] = useState("all");

  // フィルタリング
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.deliveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="ステータスで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのステータス</SelectItem>
            <SelectItem value="pending">未発送</SelectItem>
            <SelectItem value="shipped">発送済</SelectItem>
            <SelectItem value="delivered">配達完了</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {filteredDeliveries.length} / {deliveries.length} 件表示
        </div>
      </div>

      {/* 納品書一覧テーブル */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">納品書番号</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">注文番号</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">顧客名</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">納品日</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">金額</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">ステータス</th>
              <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">アクション</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map(delivery => (
              <tr key={delivery.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <Receipt className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{delivery.deliveryNumber}</div>
                      {delivery.trackingNumber && (
                        <div className="text-sm text-gray-500">追跡: {delivery.trackingNumber}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm font-medium">
                  {delivery.orderNumber}
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{delivery.clientName}</div>
                    <div className="text-sm text-gray-500">
                      {delivery.clientAddress.substring(0, 20)}...
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {delivery.deliveryDate}
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div className="font-medium">¥{delivery.finalAmount.toLocaleString()}</div>
                    <div className="text-gray-500">税込</div>
                  </div>
                </td>
                <td className="p-4">
                  {getStatusBadge(delivery.status)}
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ファイルアップロードモーダル
interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">ファイルアップロード</h2>
          <Button variant="outline" onClick={onClose}>
            ×
          </Button>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">ファイルをドラッグ＆ドロップ</p>
              <p className="text-gray-400 text-sm mb-4">または</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif,.xlsx,.xls,.csv,.zip,.rar,.7z"
                />
                <Button type="button" variant="outline">
                  ファイルを選択
                </Button>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            アップロード
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FileManagementSystem;