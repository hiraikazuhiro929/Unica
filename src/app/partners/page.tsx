"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
// テーブルコンポーネントは手動で実装
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  Filter,
  Star,
  StarOff,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  UserPlus,
  MessageSquare,
  Share2,
  Download,
  Upload,
  Briefcase,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  History,
  Package,
  Truck,
  Handshake,
  ChevronRight,
  ExternalLink,
  Settings,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// 型定義
interface Partner {
  id: string;
  name: string;
  nameKana: string;
  type: PartnerType;
  category: PartnerCategory;
  status: "active" | "inactive" | "potential" | "suspended";
  priority: "low" | "normal" | "high" | "vip";
  isStarred: boolean;
  contactInfo: ContactInfo;
  address: Address;
  businessInfo: BusinessInfo;
  financialInfo: FinancialInfo;
  orders: Order[];
  contacts: Contact[];
  notes: Note[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
}

interface ContactInfo {
  phone: string;
  fax?: string;
  email: string;
  website?: string;
}

interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
}

interface BusinessInfo {
  industry: string;
  employeeCount?: number;
  annualRevenue?: number;
  established?: Date;
  representativeName: string;
  representativeTitle: string;
}

interface FinancialInfo {
  paymentTerms: string;
  creditLimit?: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: Date;
  deliveryDate?: Date;
  status: "draft" | "confirmed" | "production" | "shipped" | "completed" | "cancelled";
  totalAmount: number;
  products: string[];
}

interface Contact {
  id: string;
  name: string;
  title: string;
  department?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

interface Note {
  id: string;
  content: string;
  category: "general" | "meeting" | "call" | "email" | "other";
  author: string;
  createdAt: Date;
}

type PartnerType = "customer" | "supplier" | "both";
type PartnerCategory = "automotive" | "electronics" | "machinery" | "medical" | "aerospace" | "other";

const PartnersPage = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // パートナーカテゴリ
  const categories = [
    { id: "automotive", name: "自動車", icon: Package },
    { id: "electronics", name: "電子機器", icon: Target },
    { id: "machinery", name: "機械", icon: Settings },
    { id: "medical", name: "医療機器", icon: Award },
    { id: "aerospace", name: "航空宇宙", icon: Briefcase },
    { id: "other", name: "その他", icon: Building2 },
  ];

  // サンプルデータ
  const samplePartners: Partner[] = [
    {
      id: "1",
      name: "株式会社テクノサプライ",
      nameKana: "カブシキガイシャテクノサプライ",
      type: "supplier",
      category: "machinery",
      status: "active",
      priority: "high",
      isStarred: true,
      contactInfo: {
        phone: "03-1234-5678",
        fax: "03-1234-5679",
        email: "info@techno-supply.co.jp",
        website: "https://www.techno-supply.co.jp",
      },
      address: {
        postalCode: "100-0001",
        prefecture: "東京都",
        city: "千代田区",
        address1: "丸の内1-1-1",
        address2: "テクノビル10F",
      },
      businessInfo: {
        industry: "産業機械製造",
        employeeCount: 150,
        annualRevenue: 5000000000, // 50億円
        established: new Date(1995, 3, 1),
        representativeName: "田中 太郎",
        representativeTitle: "代表取締役社長",
      },
      financialInfo: {
        paymentTerms: "月末締め翌月末払い",
        creditLimit: 100000000, // 1億円
        totalRevenue: 250000000, // 2.5億円
        totalOrders: 45,
        averageOrderValue: 5555556,
        lastOrderDate: new Date(2025, 1, 5),
      },
      orders: [
        {
          id: "ord1",
          orderNumber: "PO-2025-001",
          orderDate: new Date(2025, 1, 5),
          deliveryDate: new Date(2025, 1, 20),
          status: "production",
          totalAmount: 12500000,
          products: ["NC旋盤刃物", "ドリル", "エンドミル"],
        },
        {
          id: "ord2",
          orderNumber: "PO-2025-002",
          orderDate: new Date(2025, 0, 28),
          deliveryDate: new Date(2025, 1, 15),
          status: "completed",
          totalAmount: 8750000,
          products: ["フライスカッター", "タップ"],
        },
      ],
      contacts: [
        {
          id: "cont1",
          name: "田中 太郎",
          title: "代表取締役社長",
          phone: "03-1234-5678",
          email: "tanaka@techno-supply.co.jp",
          isPrimary: true,
        },
        {
          id: "cont2",
          name: "佐藤 花子",
          title: "営業部長",
          department: "営業部",
          phone: "03-1234-5680",
          email: "sato@techno-supply.co.jp",
          isPrimary: false,
        },
      ],
      notes: [
        {
          id: "note1",
          content: "来月の展示会に参加予定。新製品の紹介があるとのこと。",
          category: "meeting",
          author: "営業担当 山田",
          createdAt: new Date(2025, 1, 8),
        },
        {
          id: "note2",
          content: "支払い条件の変更要求あり。検討中。",
          category: "call",
          author: "経理担当 鈴木",
          createdAt: new Date(2025, 1, 3),
        },
      ],
      tags: ["重要取引先", "工具メーカー", "長期契約"],
      createdAt: new Date(2020, 3, 15),
      updatedAt: new Date(2025, 1, 8),
      lastContactDate: new Date(2025, 1, 8),
      nextFollowUpDate: new Date(2025, 1, 20),
    },
    {
      id: "2",
      name: "オートパーツ株式会社",
      nameKana: "オートパーツカブシキガイシャ",
      type: "customer",
      category: "automotive",
      status: "active",
      priority: "vip",
      isStarred: true,
      contactInfo: {
        phone: "052-987-6543",
        email: "order@autoparts.co.jp",
        website: "https://www.autoparts.co.jp",
      },
      address: {
        postalCode: "460-0008",
        prefecture: "愛知県",
        city: "名古屋市中区",
        address1: "栄3-15-33",
      },
      businessInfo: {
        industry: "自動車部品製造",
        employeeCount: 800,
        annualRevenue: 25000000000, // 250億円
        established: new Date(1970, 8, 1),
        representativeName: "伊藤 次郎",
        representativeTitle: "代表取締役",
      },
      financialInfo: {
        paymentTerms: "月末締め翌々月10日払い",
        creditLimit: 500000000, // 5億円
        totalRevenue: 850000000, // 8.5億円
        totalOrders: 120,
        averageOrderValue: 7083333,
        lastOrderDate: new Date(2025, 1, 10),
      },
      orders: [
        {
          id: "ord3",
          orderNumber: "SO-2025-001",
          orderDate: new Date(2025, 1, 10),
          deliveryDate: new Date(2025, 2, 5),
          status: "confirmed",
          totalAmount: 35000000,
          products: ["ブレーキパッド", "エンジンマウント", "サスペンション部品"],
        },
      ],
      contacts: [
        {
          id: "cont3",
          name: "伊藤 次郎",
          title: "代表取締役",
          phone: "052-987-6543",
          email: "ito@autoparts.co.jp",
          isPrimary: true,
        },
        {
          id: "cont4",
          name: "加藤 三郎",
          title: "調達部長",
          department: "調達部",
          phone: "052-987-6545",
          email: "kato@autoparts.co.jp",
          isPrimary: false,
        },
      ],
      notes: [
        {
          id: "note3",
          content: "来期の年間契約更新の協議を開始。価格交渉が必要。",
          category: "meeting",
          author: "営業部長 高橋",
          createdAt: new Date(2025, 1, 7),
        },
      ],
      tags: ["VIP顧客", "年間契約", "自動車業界"],
      createdAt: new Date(2018, 5, 10),
      updatedAt: new Date(2025, 1, 10),
      lastContactDate: new Date(2025, 1, 10),
      nextFollowUpDate: new Date(2025, 1, 25),
    },
    {
      id: "3",
      name: "メディカル・デバイス・ジャパン",
      nameKana: "メディカルデバイスジャパン",
      type: "customer",
      category: "medical",
      status: "active",
      priority: "high",
      isStarred: false,
      contactInfo: {
        phone: "06-5555-7777",
        email: "contact@medical-device.jp",
        website: "https://www.medical-device.jp",
      },
      address: {
        postalCode: "530-0001",
        prefecture: "大阪府",
        city: "大阪市北区",
        address1: "梅田2-2-2",
        address2: "メディカルタワー15F",
      },
      businessInfo: {
        industry: "医療機器製造",
        employeeCount: 300,
        annualRevenue: 8000000000, // 80億円
        established: new Date(2005, 1, 15),
        representativeName: "中村 美咲",
        representativeTitle: "代表取締役CEO",
      },
      financialInfo: {
        paymentTerms: "月末締め翌月25日払い",
        creditLimit: 200000000, // 2億円
        totalRevenue: 180000000, // 1.8億円
        totalOrders: 28,
        averageOrderValue: 6428571,
        lastOrderDate: new Date(2025, 0, 25),
      },
      orders: [
        {
          id: "ord4",
          orderNumber: "SO-2025-002",
          orderDate: new Date(2025, 0, 25),
          deliveryDate: new Date(2025, 1, 28),
          status: "production",
          totalAmount: 15800000,
          products: ["精密加工部品", "医療器具ケーシング"],
        },
      ],
      contacts: [
        {
          id: "cont5",
          name: "中村 美咲",
          title: "代表取締役CEO",
          phone: "06-5555-7777",
          email: "nakamura@medical-device.jp",
          isPrimary: true,
        },
      ],
      notes: [
        {
          id: "note4",
          content: "新製品開発の精密加工パートナーとして検討中。品質要求が非常に厳しい。",
          category: "meeting",
          author: "技術営業 松本",
          createdAt: new Date(2025, 0, 20),
        },
      ],
      tags: ["医療業界", "精密加工", "高品質要求"],
      createdAt: new Date(2022, 10, 5),
      updatedAt: new Date(2025, 1, 8),
      lastContactDate: new Date(2025, 1, 8),
      nextFollowUpDate: new Date(2025, 1, 18),
    },
    {
      id: "4",
      name: "グローバル・エレクトロニクス",
      nameKana: "グローバルエレクトロニクス",
      type: "both",
      category: "electronics",
      status: "potential",
      priority: "normal",
      isStarred: false,
      contactInfo: {
        phone: "045-333-8888",
        email: "info@global-electronics.com",
        website: "https://www.global-electronics.com",
      },
      address: {
        postalCode: "220-0012",
        prefecture: "神奈川県",
        city: "横浜市西区",
        address1: "みなとみらい3-3-3",
      },
      businessInfo: {
        industry: "電子部品製造",
        employeeCount: 2000,
        annualRevenue: 50000000000, // 500億円
        established: new Date(1985, 6, 20),
        representativeName: "Johnson Smith",
        representativeTitle: "CEO",
      },
      financialInfo: {
        paymentTerms: "30日後払い",
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
      },
      orders: [],
      contacts: [
        {
          id: "cont6",
          name: "Johnson Smith",
          title: "CEO",
          phone: "045-333-8888",
          email: "j.smith@global-electronics.com",
          isPrimary: true,
        },
        {
          id: "cont7",
          name: "田中 一郎",
          title: "日本法人代表",
          department: "日本支社",
          phone: "045-333-8889",
          email: "tanaka@global-electronics.com",
          isPrimary: false,
        },
      ],
      notes: [
        {
          id: "note5",
          content: "初回商談。IoT関連の製造委託を検討中。大型案件の可能性あり。",
          category: "meeting",
          author: "営業部 渡辺",
          createdAt: new Date(2025, 1, 5),
        },
      ],
      tags: ["新規見込み", "大手企業", "IoT関連"],
      createdAt: new Date(2025, 1, 1),
      updatedAt: new Date(2025, 1, 5),
      lastContactDate: new Date(2025, 1, 5),
      nextFollowUpDate: new Date(2025, 1, 15),
    },
  ];

  // 初期データの設定
  useEffect(() => {
    setPartners(samplePartners);
    setFilteredPartners(samplePartners);
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = partners.filter(partner => {
      // タイプフィルター
      if (filterType !== "all" && partner.type !== filterType) return false;
      
      // ステータスフィルター
      if (filterStatus !== "all" && partner.status !== filterStatus) return false;
      
      // カテゴリフィルター
      if (filterCategory !== "all" && partner.category !== filterCategory) return false;
      
      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          partner.name.toLowerCase().includes(query) ||
          partner.nameKana.toLowerCase().includes(query) ||
          partner.contactInfo.email.toLowerCase().includes(query) ||
          partner.tags.some(tag => tag.toLowerCase().includes(query)) ||
          partner.businessInfo.industry.toLowerCase().includes(query)
        );
      }
      
      return true;
    });

    // ソート処理
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case "name":
          result = a.name.localeCompare(b.name, "ja");
          break;
        case "revenue":
          result = b.financialInfo.totalRevenue - a.financialInfo.totalRevenue;
          break;
        case "orders":
          result = b.financialInfo.totalOrders - a.financialInfo.totalOrders;
          break;
        case "lastContact":
          const aDate = a.lastContactDate || new Date(0);
          const bDate = b.lastContactDate || new Date(0);
          result = bDate.getTime() - aDate.getTime();
          break;
        case "priority":
          const priorityOrder = { vip: 4, high: 3, normal: 2, low: 1 };
          result = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case "type":
          result = a.type.localeCompare(b.type);
          break;
        case "status":
          result = a.status.localeCompare(b.status);
          break;
        case "category":
          result = a.category.localeCompare(b.category);
          break;
        default:
          return 0;
      }
      return sortOrder === "asc" ? result : -result;
    });

    setFilteredPartners(filtered);
  }, [partners, searchQuery, filterType, filterStatus, filterCategory, sortBy, sortOrder]);

  // 優先度の色を取得
  const getPriorityColor = (priority: Partner["priority"]) => {
    switch (priority) {
      case "vip":
        return "border-purple-500 bg-purple-50";
      case "high":
        return "border-red-500 bg-red-50";
      case "normal":
        return "border-blue-500 bg-blue-50";
      case "low":
        return "border-gray-400 bg-gray-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  // 優先度のバッジを取得
  const getPriorityBadge = (priority: Partner["priority"]) => {
    const configs = {
      vip: { label: "VIP", className: "bg-purple-100 text-purple-800 border-purple-300" },
      high: { label: "重要", className: "bg-red-100 text-red-800 border-red-300" },
      normal: { label: "普通", className: "bg-blue-100 text-blue-800 border-blue-300" },
      low: { label: "低", className: "bg-gray-100 text-gray-800 border-gray-300" },
    };
    
    const config = configs[priority];
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // ステータスのバッジを取得
  const getStatusBadge = (status: Partner["status"]) => {
    const configs = {
      active: { label: "アクティブ", className: "bg-green-100 text-green-800 border-green-300" },
      inactive: { label: "非アクティブ", className: "bg-gray-100 text-gray-800 border-gray-300" },
      potential: { label: "見込み", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      suspended: { label: "停止中", className: "bg-red-100 text-red-800 border-red-300" },
    };
    
    const config = configs[status];
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // タイプのバッジを取得
  const getTypeBadge = (type: PartnerType) => {
    const configs = {
      customer: { label: "顧客", className: "bg-blue-100 text-blue-800 border-blue-300" },
      supplier: { label: "仕入先", className: "bg-orange-100 text-orange-800 border-orange-300" },
      both: { label: "顧客・仕入先", className: "bg-purple-100 text-purple-800 border-purple-300" },
    };
    
    const config = configs[type];
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // スター切り替え
  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPartners(prev => prev.map(partner => 
      partner.id === id ? { ...partner, isStarred: !partner.isStarred } : partner
    ));
  };

  // カラムでソート
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // パートナー削除
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("この取引先を削除してもよろしいですか？")) {
      setPartners(prev => prev.filter(partner => partner.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">顧客先管理</h1>
                <p className="text-gray-600 mt-1">
                  取引先の情報と取引履歴を管理
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                取引先追加
              </Button>
            </div>
          </div>
        </div>

        {/* 検索・フィルターツールバー */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="取引先を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="取引タイプ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="customer">顧客</SelectItem>
                  <SelectItem value="supplier">仕入先</SelectItem>
                  <SelectItem value="both">顧客・仕入先</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="potential">見込み</SelectItem>
                  <SelectItem value="inactive">非アクティブ</SelectItem>
                  <SelectItem value="suspended">停止中</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="業界" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全業界</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredPartners.length} / {partners.length} 件表示
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* メインテーブル */}
          <div className="flex-1 overflow-auto bg-white">
            {filteredPartners.length === 0 ? (
              <div className="flex items-center justify-center h-full p-12">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    取引先が見つかりません
                  </h3>
                  <p className="text-gray-500">
                    検索条件を変更するか、新しい取引先を追加してください。
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full table-auto border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="w-8 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Star className="w-4 h-4" />
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 min-w-[200px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>会社名</span>
                          {sortBy === "name" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>タイプ</span>
                          {sortBy === "type" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>ステータス</span>
                          {sortBy === "status" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("priority")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>優先度</span>
                          {sortBy === "priority" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">業界</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">連絡先</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">住所</th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("revenue")}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>総売上</span>
                          {sortBy === "revenue" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("orders")}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>注文数</span>
                          {sortBy === "orders" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("lastContact")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>最終連絡</span>
                          {sortBy === "lastContact" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPartners.map(partner => (
                      <tr 
                        key={partner.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => {
                          setSelectedPartner(partner);
                          setShowDetailDialog(true);
                        }}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleStar(partner.id, e)}
                            className="p-1"
                          >
                            {partner.isStarred ? (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            ) : (
                              <StarOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-medium">
                          <div>
                            <div className="font-semibold text-gray-900">{partner.name}</div>
                            <div className="text-sm text-gray-500">{partner.nameKana}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getTypeBadge(partner.type)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(partner.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getPriorityBadge(partner.priority)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm">{partner.businessInfo.industry}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{partner.contactInfo.phone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="truncate max-w-[150px]">{partner.contactInfo.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div>{partner.address.prefecture} {partner.address.city}</div>
                            <div className="text-gray-500 truncate max-w-[120px]">{partner.address.address1}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(partner.financialInfo.totalRevenue)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="font-semibold">
                            {partner.financialInfo.totalOrders}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {partner.lastContactDate 
                              ? partner.lastContactDate.toLocaleDateString("ja-JP")
                              : "-"
                            }
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPartner(partner);
                                  setShowDetailDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                詳細表示
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Edit className="w-4 h-4 mr-2" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                連絡
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={(e) => handleDelete(partner.id, e)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 詳細ダイアログ */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedPartner && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl">
                          {selectedPartner.name}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedPartner.businessInfo.industry} • {selectedPartner.businessInfo.representativeName}
                        </DialogDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTypeBadge(selectedPartner.type)}
                      {getStatusBadge(selectedPartner.status)}
                      {getPriorityBadge(selectedPartner.priority)}
                    </div>
                  </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">概要</TabsTrigger>
                    <TabsTrigger value="contacts">連絡先</TabsTrigger>
                    <TabsTrigger value="orders">取引履歴</TabsTrigger>
                    <TabsTrigger value="notes">メモ</TabsTrigger>
                    <TabsTrigger value="financials">財務</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">基本情報</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">会社名</label>
                            <p className="text-sm text-gray-900">{selectedPartner.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">フリガナ</label>
                            <p className="text-sm text-gray-900">{selectedPartner.nameKana}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">業界</label>
                            <p className="text-sm text-gray-900">{selectedPartner.businessInfo.industry}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">従業員数</label>
                            <p className="text-sm text-gray-900">
                              {selectedPartner.businessInfo.employeeCount ? 
                                `${selectedPartner.businessInfo.employeeCount.toLocaleString()}名` : 
                                "未設定"
                              }
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">連絡先</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{selectedPartner.contactInfo.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{selectedPartner.contactInfo.email}</span>
                          </div>
                          {selectedPartner.contactInfo.website && (
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4 text-gray-500" />
                              <a 
                                href={selectedPartner.contactInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {selectedPartner.contactInfo.website}
                                <ExternalLink className="w-3 h-3 inline ml-1" />
                              </a>
                            </div>
                          )}
                          <div className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                            <div className="text-sm">
                              <div>〒{selectedPartner.address.postalCode}</div>
                              <div>
                                {selectedPartner.address.prefecture} {selectedPartner.address.city}
                              </div>
                              <div>{selectedPartner.address.address1}</div>
                              {selectedPartner.address.address2 && (
                                <div>{selectedPartner.address.address2}</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedPartner.tags.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">タグ</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedPartner.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="contacts" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">担当者一覧</h3>
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        担当者追加
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {selectedPartner.contacts.map(contact => (
                        <Card key={contact.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">{contact.name}</h4>
                                  {contact.isPrimary && (
                                    <Badge variant="secondary" className="text-xs">
                                      主担当
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{contact.title}</p>
                                {contact.department && (
                                  <p className="text-sm text-gray-500">{contact.department}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-sm">
                                  {contact.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{contact.phone}</span>
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="flex items-center space-x-1">
                                      <Mail className="w-3 h-3" />
                                      <span>{contact.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="orders" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">取引履歴</h3>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        新規注文
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {selectedPartner.orders.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">取引履歴がありません</p>
                          </CardContent>
                        </Card>
                      ) : (
                        selectedPartner.orders.map(order => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">{order.orderNumber}</h4>
                                  <p className="text-sm text-gray-600">
                                    {order.orderDate.toLocaleDateString("ja-JP")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-lg">
                                    {formatCurrency(order.totalAmount)}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      order.status === "completed" ? "bg-green-100 text-green-800" :
                                      order.status === "production" ? "bg-blue-100 text-blue-800" :
                                      order.status === "confirmed" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-gray-100 text-gray-800"
                                    }
                                  >
                                    {order.status === "completed" ? "完了" :
                                     order.status === "production" ? "生産中" :
                                     order.status === "confirmed" ? "確定" :
                                     order.status === "shipped" ? "出荷済み" :
                                     order.status === "cancelled" ? "キャンセル" : "下書き"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                <div className="mb-2">
                                  <span className="font-medium">製品: </span>
                                  {order.products.join(", ")}
                                </div>
                                {order.deliveryDate && (
                                  <div className="flex items-center space-x-1">
                                    <Truck className="w-3 h-3" />
                                    <span>納期: {order.deliveryDate.toLocaleDateString("ja-JP")}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">メモ・連絡履歴</h3>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        メモ追加
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {selectedPartner.notes.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">メモがありません</p>
                          </CardContent>
                        </Card>
                      ) : (
                        selectedPartner.notes.map(note => (
                          <Card key={note.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {note.category === "meeting" ? "会議" :
                                     note.category === "call" ? "電話" :
                                     note.category === "email" ? "メール" : "その他"}
                                  </Badge>
                                  <span className="text-sm text-gray-600">{note.author}</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {note.createdAt.toLocaleDateString("ja-JP")}
                                </span>
                              </div>
                              <p className="text-sm text-gray-900 whitespace-pre-line">
                                {note.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="financials" className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">取引実績</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">総売上</span>
                            <span className="font-semibold text-lg">
                              {formatCurrency(selectedPartner.financialInfo.totalRevenue)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">総注文数</span>
                            <span className="font-semibold">
                              {selectedPartner.financialInfo.totalOrders}件
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">平均注文額</span>
                            <span className="font-semibold">
                              {formatCurrency(selectedPartner.financialInfo.averageOrderValue)}
                            </span>
                          </div>
                          {selectedPartner.financialInfo.lastOrderDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">最終注文日</span>
                              <span className="font-semibold">
                                {selectedPartner.financialInfo.lastOrderDate.toLocaleDateString("ja-JP")}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">支払い条件</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <span className="text-sm text-gray-600">支払い条件</span>
                            <p className="font-medium">
                              {selectedPartner.financialInfo.paymentTerms}
                            </p>
                          </div>
                          {selectedPartner.financialInfo.creditLimit && (
                            <div>
                              <span className="text-sm text-gray-600">与信限度額</span>
                              <p className="font-medium">
                                {formatCurrency(selectedPartner.financialInfo.creditLimit)}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    閉じる
                  </Button>
                  <Button>
                    <Edit className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PartnersPage;