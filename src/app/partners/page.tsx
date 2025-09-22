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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { exportPartners } from "@/lib/utils/exportUtils";
import { usePartners } from './hooks/usePartners';
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
  RefreshCcw,
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
  const {
    partners,
    statistics,
    loading,
    error,
    createPartner,
    updatePartner,
    deletePartner,
    refreshData,
  } = usePartners();

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

  // 新規取引先フォームの状態
  const [newPartner, setNewPartner] = useState({
    name: "",
    nameKana: "",
    type: "customer" as PartnerType,
    status: "active" as Partner["status"],
    priority: "normal" as Partner["priority"],
    phone: "",
    email: "",
    postalCode: "",
    prefecture: "",
    city: "",
    address1: "",
    address2: "",
    industry: "",
  });

  // 担当者リスト
  const [contacts, setContacts] = useState([
    { name: "", title: "", phone: "", email: "" }
  ]);

  // パートナーカテゴリ
  const categories = [
    { id: "automotive", name: "自動車", icon: Package },
    { id: "electronics", name: "電子機器", icon: Target },
    { id: "machinery", name: "機械", icon: Settings },
    { id: "medical", name: "医療機器", icon: Award },
    { id: "aerospace", name: "航空宇宙", icon: Briefcase },
    { id: "other", name: "その他", icon: Building2 },
  ];

  // エラー表示
  useEffect(() => {
    if (error) {
      console.error('Partners error:', error);
    }
  }, [error]);

  // 旧サンプルデータ削除
  /* const samplePartners: Partner[] = [
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
  ]; */

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
        return "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/30";
      case "high":
        return "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30";
      case "normal":
        return "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30";
      case "low":
        return "border-gray-400 dark:border-slate-500 bg-gray-50 dark:bg-slate-700/30";
      default:
        return "border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30";
    }
  };

  // 優先度のバッジを取得
  const getPriorityBadge = (priority: Partner["priority"]) => {
    const configs = {
      vip: { label: "VIP", className: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700" },
      high: { label: "重要", className: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700" },
      normal: { label: "普通", className: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
      low: { label: "低", className: "bg-gray-100 dark:bg-slate-700/30 text-gray-800 dark:text-slate-300 border-gray-300 dark:border-slate-600" },
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
      active: { label: "アクティブ", className: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700" },
      inactive: { label: "非アクティブ", className: "bg-gray-100 dark:bg-slate-700/30 text-gray-800 dark:text-slate-300 border-gray-300 dark:border-slate-600" },
      potential: { label: "見込み", className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700" },
      suspended: { label: "停止中", className: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700" },
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
      customer: { label: "顧客", className: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
      supplier: { label: "仕入先", className: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700" },
      both: { label: "顧客・仕入先", className: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700" },
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
  const toggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const partner = partners.find(p => p.id === id);
    if (partner) {
      try {
        await updatePartner(id, { isStarred: !partner.isStarred });
        await refreshData();
      } catch (error) {
        console.error('Failed to toggle star:', error);
      }
    }
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
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("この取引先を削除してもよろしいですか？")) {
      try {
        await deletePartner(id);
        await refreshData();
      } catch (error) {
        console.error('Failed to delete partner:', error);
        alert('削除に失敗しました: ' + (error as Error).message);
      }
    }
  };

  // 担当者の追加
  const addContact = () => {
    setContacts([...contacts, { name: "", title: "", phone: "", email: "" }]);
  };

  // 担当者の削除
  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  // 担当者の更新
  const updateContact = (index: number, field: string, value: string) => {
    const updatedContacts = [...contacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setContacts(updatedContacts);
  };

  // 新規取引先の保存
  const handleSaveNewPartner = async () => {
    if (!newPartner.name || !newPartner.email) {
      alert("会社名とメールアドレスは必須です。");
      return;
    }

    // 担当者の最低1名チェック
    const validContacts = contacts.filter(c => c.name && c.email);
    if (validContacts.length === 0) {
      alert("担当者を最低1名入力してください。");
      return;
    }

    try {
      const partnerData = {
        name: newPartner.name,
        nameKana: newPartner.nameKana,
        type: newPartner.type,
        category: "other" as PartnerCategory, // デフォルト値
        status: newPartner.status,
        priority: newPartner.priority,
        isStarred: false,
        contactInfo: {
          phone: newPartner.phone,
          email: newPartner.email,
        },
        address: {
          postalCode: newPartner.postalCode,
          prefecture: newPartner.prefecture,
          city: newPartner.city,
          address1: newPartner.address1,
          ...(newPartner.address2 && { address2: newPartner.address2 }),
        },
        businessInfo: {
          industry: newPartner.industry,
          representativeName: validContacts[0].name, // 最初の担当者を代表者とする
          representativeTitle: validContacts[0].title || "担当者",
        },
        financialInfo: {
          paymentTerms: "月末締め翌月末払い", // デフォルト値
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
        },
        orders: [],
        contacts: validContacts.map((contact, index) => ({
          id: `contact-${index}`,
          name: contact.name,
          title: contact.title || "担当者",
          phone: contact.phone,
          email: contact.email,
          isPrimary: index === 0,
        })),
        notes: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createPartner(partnerData);
      await refreshData();

      // フォームをリセット
      setNewPartner({
        name: "",
        nameKana: "",
        type: "customer",
        status: "active",
        priority: "normal",
        phone: "",
        email: "",
        postalCode: "",
        prefecture: "",
        city: "",
        address1: "",
        address2: "",
        industry: "",
      });
      setContacts([{ name: "", title: "", phone: "", email: "" }]);

      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create partner:', error);
      alert('取引先の作成に失敗しました: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">顧客先管理</h1>
                <p className="text-gray-600 dark:text-slate-300 mt-1">
                  取引先の情報と取引履歴を管理
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 検索・フィルターツールバー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
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
            
            <div className="flex items-center space-x-3">
              {/* エクスポートボタン */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    disabled={filteredPartners.length === 0}
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
                    <div>• フィルター適用後の取引先データ: {filteredPartners.length}件</div>
                    <div>• タイプ: {filterType === 'all' ? 'すべて' : 
                      filterType === 'customer' ? '顧客' :
                      filterType === 'supplier' ? '仕入先' :
                      filterType === 'both' ? '顧客・仕入先' : filterType}</div>
                    <div>• ステータス: {filterStatus === 'all' ? 'すべて' : 
                      filterStatus === 'active' ? 'アクティブ' :
                      filterStatus === 'potential' ? '見込み' :
                      filterStatus === 'inactive' ? '非アクティブ' :
                      filterStatus === 'suspended' ? '停止中' : filterStatus}</div>
                    <div>• 業界: {filterCategory === 'all' ? 'すべて' : categories.find(c => c.id === filterCategory)?.name || filterCategory}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => exportPartners(filteredPartners, 'csv', filterType)}
                    disabled={filteredPartners.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV形式でエクスポート
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportPartners(filteredPartners, 'excel', filterType)}
                    disabled={filteredPartners.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel形式でエクスポート
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 !text-white font-medium px-4"
              >
                <Plus className="w-4 h-4 mr-2 text-white" />
                取引先追加
              </Button>
              <div className="text-sm text-gray-600 dark:text-slate-300">
                {filteredPartners.length} / {partners.length} 件表示
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* メインテーブル */}
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
            {loading ? (
              <div className="flex items-center justify-center h-full p-12">
                <div className="text-center">
                  <RefreshCcw className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600 animate-spin" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    データを読み込み中...
                  </h3>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full p-12">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
                  <h3 className="text-lg font-semibold text-red-700 mb-2">
                    データの読み込みに失敗しました
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 mb-4">{error}</p>
                  <Button onClick={refreshData} variant="outline">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    再試行
                  </Button>
                </div>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="flex items-center justify-center h-full p-12">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    取引先が見つかりません
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400">
                    検索条件を変更するか、新しい取引先を追加してください。
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full table-auto border-collapse">
                  <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
                    <tr className="border-b border-gray-200 dark:border-slate-600">
                      <th className="w-8 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                        <Star className="w-4 h-4" />
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 min-w-[200px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider"
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
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider"
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
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider"
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
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider"
                        onClick={() => handleSort("priority")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>優先度</span>
                          {sortBy === "priority" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">業界</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">連絡先</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">住所</th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider"
                        onClick={() => handleSort("lastContact")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>最終連絡</span>
                          {sortBy === "lastContact" && (
                            sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                    {filteredPartners.map(partner => (
                      <tr 
                        key={partner.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors duration-150"
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
                            <div className="font-semibold text-gray-900 dark:text-white">{partner.name}</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">{partner.nameKana}</div>
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
                          <div className="text-sm text-gray-900 dark:text-slate-200">{partner.businessInfo.industry}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                              <span className="text-gray-900 dark:text-slate-200">{partner.contactInfo.phone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                              <span className="truncate max-w-[150px] text-gray-900 dark:text-slate-200">{partner.contactInfo.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900 dark:text-slate-200">{partner.address.prefecture} {partner.address.city}</div>
                            <div className="text-gray-500 dark:text-slate-400 truncate max-w-[120px]">{partner.address.address1}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-900 dark:text-slate-200">
                              {partner.lastContactDate
                                ? partner.lastContactDate.toLocaleDateString("ja-JP")
                                : "-"
                              }
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await updatePartner(partner.id, { lastContactDate: new Date() });
                                  await refreshData();
                                } catch (error) {
                                  console.error('Failed to update contact date:', error);
                                }
                              }}
                              className="px-2 py-1 text-xs"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              連絡済
                            </Button>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-600">
            {selectedPartner && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <DialogTitle className="text-2xl font-bold dark:text-white mb-2">
                        {selectedPartner.name}
                      </DialogTitle>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(selectedPartner.type)}
                        {getStatusBadge(selectedPartner.status)}
                        {getPriorityBadge(selectedPartner.priority)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await updatePartner(selectedPartner.id, { lastContactDate: new Date() });
                          await refreshData();
                        } catch (error) {
                          console.error('Failed to update contact date:', error);
                        }
                      }}
                      className="text-sm"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      連絡記録
                    </Button>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold dark:text-white border-b border-gray-200 dark:border-slate-600 pb-2">基本情報</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-slate-400">フリガナ</span>
                          <p className="font-medium dark:text-white">{selectedPartner.nameKana}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-slate-400">業種</span>
                          <p className="font-medium dark:text-white">{selectedPartner.businessInfo.industry}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-slate-400">最終連絡日</span>
                          <p className="font-medium dark:text-white">
                            {selectedPartner.lastContactDate
                              ? selectedPartner.lastContactDate.toLocaleDateString("ja-JP")
                              : "記録なし"
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold dark:text-white border-b border-gray-200 dark:border-slate-600 pb-2">連絡先</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                          <span className="dark:text-slate-200">{selectedPartner.contactInfo.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                          <span className="dark:text-slate-200">{selectedPartner.contactInfo.email}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 dark:text-slate-400 mt-0.5" />
                          <div className="text-sm dark:text-slate-200">
                            <div>〒{selectedPartner.address.postalCode}</div>
                            <div>{selectedPartner.address.prefecture} {selectedPartner.address.city}</div>
                            <div>{selectedPartner.address.address1}</div>
                            {selectedPartner.address.address2 && <div>{selectedPartner.address.address2}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 担当者一覧 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:text-white border-b border-gray-200 dark:border-slate-600 pb-2">担当者</h3>
                    <div className="grid gap-3">
                      {selectedPartner.contacts.map(contact => (
                        <div key={contact.id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium dark:text-white">{contact.name}</h4>
                                {contact.isPrimary && (
                                  <Badge variant="secondary" className="text-xs">メイン</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-slate-300">{contact.title}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                {contact.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                                    <span className="dark:text-slate-200">{contact.phone}</span>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                                    <span className="dark:text-slate-200">{contact.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

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

        {/* 新規取引先作成ダイアログ */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">新規取引先追加</DialogTitle>
              <DialogDescription className="dark:text-slate-300">
                新しい取引先の情報を入力してください。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold dark:text-white">基本情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="dark:text-slate-200">会社名 *</Label>
                    <Input
                      id="name"
                      value={newPartner.name}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="株式会社○○"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nameKana" className="dark:text-slate-200">フリガナ</Label>
                    <Input
                      id="nameKana"
                      value={newPartner.nameKana}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, nameKana: e.target.value }))}
                      placeholder="カブシキガイシャ○○"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type" className="dark:text-slate-200">取引タイプ</Label>
                    <Select value={newPartner.type} onValueChange={(value) => setNewPartner(prev => ({ ...prev, type: value as PartnerType }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">顧客</SelectItem>
                        <SelectItem value="supplier">仕入先</SelectItem>
                        <SelectItem value="both">顧客・仕入先</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority" className="dark:text-slate-200">優先度</Label>
                    <Select value={newPartner.priority} onValueChange={(value) => setNewPartner(prev => ({ ...prev, priority: value as Partner["priority"] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="normal">普通</SelectItem>
                        <SelectItem value="high">重要</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="industry" className="dark:text-slate-200">業種</Label>
                  <Input
                    id="industry"
                    value={newPartner.industry}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="製造業"
                  />
                </div>
              </div>

              {/* 会社連絡先情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold dark:text-white">会社連絡先</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="dark:text-slate-200">代表電話番号</Label>
                    <Input
                      id="phone"
                      value={newPartner.phone}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="03-1234-5678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="dark:text-slate-200">代表メールアドレス *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newPartner.email}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* 住所情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold dark:text-white">住所</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="postalCode" className="dark:text-slate-200">郵便番号</Label>
                    <Input
                      id="postalCode"
                      value={newPartner.postalCode}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prefecture" className="dark:text-slate-200">都道府県</Label>
                    <Input
                      id="prefecture"
                      value={newPartner.prefecture}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, prefecture: e.target.value }))}
                      placeholder="東京都"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="dark:text-slate-200">市区町村</Label>
                    <Input
                      id="city"
                      value={newPartner.city}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="千代田区"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address1" className="dark:text-slate-200">住所1</Label>
                    <Input
                      id="address1"
                      value={newPartner.address1}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, address1: e.target.value }))}
                      placeholder="丸の内1-1-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address2" className="dark:text-slate-200">住所2（建物名等）</Label>
                    <Input
                      id="address2"
                      value={newPartner.address2}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, address2: e.target.value }))}
                      placeholder="○○ビル10F"
                    />
                  </div>
                </div>
              </div>

              {/* 担当者情報 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold dark:text-white">担当者 *</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    担当者追加
                  </Button>
                </div>
                {contacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium dark:text-white">担当者 {index + 1}</span>
                      {contacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          削除
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="dark:text-slate-200">氏名 *</Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => updateContact(index, "name", e.target.value)}
                          placeholder="山田 太郎"
                        />
                      </div>
                      <div>
                        <Label className="dark:text-slate-200">役職</Label>
                        <Input
                          value={contact.title}
                          onChange={(e) => updateContact(index, "title", e.target.value)}
                          placeholder="営業部長"
                        />
                      </div>
                      <div>
                        <Label className="dark:text-slate-200">電話番号</Label>
                        <Input
                          value={contact.phone}
                          onChange={(e) => updateContact(index, "phone", e.target.value)}
                          placeholder="03-1234-5678"
                        />
                      </div>
                      <div>
                        <Label className="dark:text-slate-200">メールアドレス *</Label>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(index, "email", e.target.value)}
                          placeholder="yamada@example.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveNewPartner} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                取引先を追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PartnersPage;