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
  Megaphone,
  Plus,
  Search,
  Filter,
  Clock,
  Eye,
  Edit,
  Trash2,
  Pin,
  AlertTriangle,
  Info,
  CheckCircle,
  Bell,
  Users,
  Calendar,
  MoreHorizontal,
  MessageSquare,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Building2,
  Target,
  Wrench,
  HardHat,
  Zap,
  FileText,
} from "lucide-react";

// 型定義
interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: "low" | "normal" | "high" | "urgent";
  status: "draft" | "published" | "archived";
  author: string;
  department: string;
  publishedAt: Date | null;
  expiresAt: Date | null;
  targetAudience: string[];
  isSticky: boolean;
  readCount: number;
  totalTargets: number;
  tags: string[];
  attachments?: AttachmentFile[];
  createdAt: Date;
  updatedAt: Date;
}

interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: any;
  description: string;
}

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("published");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  // 製造業特化のお知らせカテゴリ
  const categories: AnnouncementCategory[] = [
    {
      id: "safety",
      name: "安全・労務",
      color: "text-red-600",
      bgColor: "bg-red-100 border-red-300",
      icon: HardHat,
      description: "安全規則・労働関連のお知らせ",
    },
    {
      id: "production",
      name: "生産・工程",
      color: "text-blue-600",
      bgColor: "bg-blue-100 border-blue-300",
      icon: Target,
      description: "生産計画・工程変更のお知らせ",
    },
    {
      id: "maintenance",
      name: "設備・保全",
      color: "text-orange-600",
      bgColor: "bg-orange-100 border-orange-300",
      icon: Wrench,
      description: "設備メンテナンス・修理のお知らせ",
    },
    {
      id: "quality",
      name: "品質管理",
      color: "text-green-600",
      bgColor: "bg-green-100 border-green-300",
      icon: CheckCircle,
      description: "品質方針・検査関連のお知らせ",
    },
    {
      id: "system",
      name: "システム",
      color: "text-purple-600",
      bgColor: "bg-purple-100 border-purple-300",
      icon: Zap,
      description: "システム更新・障害のお知らせ",
    },
    {
      id: "general",
      name: "一般・その他",
      color: "text-gray-600",
      bgColor: "bg-gray-100 border-gray-300",
      icon: Info,
      description: "一般的なお知らせ・イベント",
    },
  ];

  // サンプルデータ
  const sampleAnnouncements: Announcement[] = [
    {
      id: "1",
      title: "第1工場設備点検による生産停止のお知らせ",
      content: "来週月曜日（2月15日）午前9時から午後5時まで、第1工場の定期設備点検を実施いたします。この間、A製品ラインは生産停止となります。\n\n詳細スケジュール：\n- 09:00-12:00: NC旋盤点検\n- 13:00-17:00: プレス機点検\n\n各部署の対応をお願いいたします。",
      category: categories[2], // maintenance
      priority: "high",
      status: "published",
      author: "保全部長 山田太郎",
      department: "保全部",
      publishedAt: new Date(2025, 1, 10, 9, 0),
      expiresAt: new Date(2025, 1, 20, 17, 0),
      targetAudience: ["生産部", "品質管理部", "工場作業員"],
      isSticky: true,
      readCount: 45,
      totalTargets: 50,
      tags: ["設備点検", "生産停止", "第1工場"],
      createdAt: new Date(2025, 1, 9, 14, 30),
      updatedAt: new Date(2025, 1, 9, 14, 30),
    },
    {
      id: "2",
      title: "新しい安全規則の導入について",
      content: "労働安全衛生法の改正に伴い、以下の新しい安全規則を2月20日より導入いたします。\n\n主な変更点：\n1. 作業開始前の安全確認手順の見直し\n2. 保護具着用基準の更新\n3. 事故報告書の書式変更\n\n詳細は添付の資料をご確認ください。",
      category: categories[0], // safety
      priority: "urgent",
      status: "published",
      author: "総務部 安全管理者",
      department: "総務部",
      publishedAt: new Date(2025, 1, 8, 10, 0),
      expiresAt: new Date(2025, 2, 20, 17, 0),
      targetAudience: ["全社員"],
      isSticky: true,
      readCount: 78,
      totalTargets: 85,
      tags: ["安全規則", "法改正", "保護具"],
      attachments: [
        {
          id: "att1",
          name: "新安全規則詳細.pdf",
          size: 1024000,
          type: "application/pdf",
          url: "/files/safety-rules.pdf"
        }
      ],
      createdAt: new Date(2025, 1, 7, 16, 0),
      updatedAt: new Date(2025, 1, 8, 9, 30),
    },
    {
      id: "3",
      title: "品質管理システムアップデート完了",
      content: "品質管理システムのアップデートが完了いたしました。\n\n新機能：\n- 検査結果の自動グラフ化\n- 不良品トレーサビリティ強化\n- モバイル対応改善\n\nログイン後、新機能をご確認ください。",
      category: categories[4], // system
      priority: "normal",
      status: "published",
      author: "システム管理者",
      department: "情報システム部",
      publishedAt: new Date(2025, 1, 5, 8, 0),
      expiresAt: null,
      targetAudience: ["品質管理部", "検査担当者"],
      isSticky: false,
      readCount: 23,
      totalTargets: 25,
      tags: ["システム更新", "品質管理", "新機能"],
      createdAt: new Date(2025, 1, 4, 17, 0),
      updatedAt: new Date(2025, 1, 4, 17, 0),
    },
    {
      id: "4",
      title: "3月度生産計画の確定について",
      content: "3月度の生産計画が確定いたしました。\n\n主要製品の生産予定：\n- A製品: 1,200個\n- B製品: 800個\n- C製品: 600個\n\n詳細スケジュールは各課長にお伝えします。",
      category: categories[1], // production
      priority: "normal",
      status: "published",
      author: "生産管理部長",
      department: "生産管理部",
      publishedAt: new Date(2025, 1, 3, 14, 0),
      expiresAt: new Date(2025, 2, 28, 17, 0),
      targetAudience: ["生産部", "資材調達部"],
      isSticky: false,
      readCount: 34,
      totalTargets: 40,
      tags: ["生産計画", "3月", "製品別"],
      createdAt: new Date(2025, 1, 2, 10, 0),
      updatedAt: new Date(2025, 1, 3, 13, 45),
    },
    {
      id: "5",
      title: "ISO 9001年次内部監査の実施について",
      content: "ISO 9001の年次内部監査を以下の日程で実施いたします。\n\n実施日程：\n- 2月25日（火）：生産部\n- 2月26日（水）：品質管理部\n- 2月27日（木）：保全部\n\n各部署は必要書類の準備をお願いします。",
      category: categories[3], // quality
      priority: "high",
      status: "published",
      author: "品質管理部 監査責任者",
      department: "品質管理部",
      publishedAt: new Date(2025, 1, 1, 9, 0),
      expiresAt: new Date(2025, 1, 28, 17, 0),
      targetAudience: ["生産部", "品質管理部", "保全部"],
      isSticky: false,
      readCount: 28,
      totalTargets: 30,
      tags: ["ISO監査", "内部監査", "品質"],
      createdAt: new Date(2025, 0, 30, 15, 0),
      updatedAt: new Date(2025, 0, 31, 9, 0),
    },
  ];

  // 初期データの設定
  useEffect(() => {
    setAnnouncements(sampleAnnouncements);
    setFilteredAnnouncements(sampleAnnouncements.filter(a => a.status === "published"));
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = announcements.filter(ann => {
      // ステータスフィルター
      if (filterStatus !== "all" && ann.status !== filterStatus) return false;
      
      // カテゴリフィルター
      if (filterCategory !== "all" && ann.category.id !== filterCategory) return false;
      
      // 優先度フィルター
      if (filterPriority !== "all" && ann.priority !== filterPriority) return false;
      
      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ann.title.toLowerCase().includes(query) ||
          ann.content.toLowerCase().includes(query) ||
          ann.author.toLowerCase().includes(query) ||
          ann.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });

    // ソート: 固定表示、優先度、公開日時順
    filtered.sort((a, b) => {
      if (a.isSticky && !b.isSticky) return -1;
      if (!a.isSticky && b.isSticky) return 1;
      
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      const aDate = a.publishedAt || a.createdAt;
      const bDate = b.publishedAt || b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });

    setFilteredAnnouncements(filtered);
  }, [announcements, searchQuery, filterCategory, filterPriority, filterStatus]);

  // 新規お知らせ作成用の状態
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: "",
    content: "",
    category: categories[5], // general
    priority: "normal",
    status: "draft",
    department: "総務部",
    targetAudience: [],
    isSticky: false,
    tags: [],
  });

  // 優先度の色を取得
  const getPriorityColor = (priority: Announcement["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50";
      case "high":
        return "border-orange-500 bg-orange-50";
      case "normal":
        return "border-blue-500 bg-blue-50";
      case "low":
        return "border-gray-400 bg-gray-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  // 優先度のバッジを取得
  const getPriorityBadge = (priority: Announcement["priority"]) => {
    const configs = {
      urgent: { label: "緊急", className: "bg-red-100 text-red-800 border-red-300" },
      high: { label: "重要", className: "bg-orange-100 text-orange-800 border-orange-300" },
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

  // 既読率を取得
  const getReadPercentage = (announcement: Announcement) => {
    return Math.round((announcement.readCount / announcement.totalTargets) * 100);
  };

  // 展開/折りたたみ切り替え
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // ブックマーク切り替え
  const toggleBookmark = (id: string) => {
    const newBookmarked = new Set(bookmarkedItems);
    if (newBookmarked.has(id)) {
      newBookmarked.delete(id);
    } else {
      newBookmarked.add(id);
    }
    setBookmarkedItems(newBookmarked);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Megaphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">全体周知</h1>
                <p className="text-gray-600 mt-1">
                  社内の重要なお知らせと連絡事項を管理
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none border-none"
                >
                  リスト
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none border-none"
                >
                  グリッド
                </Button>
              </div>
              <Button
                onClick={() => {
                  setIsEditMode(true);
                  setSelectedAnnouncement(null);
                  setShowCreateDialog(true);
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                お知らせ作成
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* フィルターサイドバー */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="お知らせを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* ステータスフィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">ステータス</h3>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    <SelectItem value="published">公開中</SelectItem>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="archived">アーカイブ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* カテゴリフィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">カテゴリ</h3>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全カテゴリ</SelectItem>
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

              {/* 優先度フィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">優先度</h3>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全優先度</SelectItem>
                    <SelectItem value="urgent">緊急</SelectItem>
                    <SelectItem value="high">重要</SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 統計情報 */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">統計</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">総お知らせ数</span>
                    <span className="font-medium">{announcements.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">公開中</span>
                    <span className="font-medium">
                      {announcements.filter(a => a.status === "published").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">重要・緊急</span>
                    <span className="font-medium text-red-600">
                      {announcements.filter(a => a.priority === "high" || a.priority === "urgent").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {filteredAnnouncements.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      お知らせが見つかりません
                    </h3>
                    <p className="text-gray-500">
                      検索条件を変更するか、新しいお知らせを作成してください。
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-4"}>
                  {filteredAnnouncements.map(announcement => {
                    const Icon = announcement.category.icon;
                    const isExpanded = expandedItems.has(announcement.id);
                    const isBookmarked = bookmarkedItems.has(announcement.id);
                    const readPercentage = getReadPercentage(announcement);

                    return (
                      <Card
                        key={announcement.id}
                        className={`border-2 transition-all duration-200 hover:shadow-lg ${getPriorityColor(announcement.priority)} ${
                          announcement.isSticky ? "ring-2 ring-blue-200" : ""
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {announcement.isSticky && (
                                <Pin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              )}
                              <Icon className={`w-5 h-5 ${announcement.category.color} flex-shrink-0`} />
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2">
                                  {announcement.title}
                                </CardTitle>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className={announcement.category.bgColor}>
                                    {announcement.category.name}
                                  </Badge>
                                  {getPriorityBadge(announcement.priority)}
                                  {announcement.isSticky && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                      固定表示
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBookmark(announcement.id)}
                                className="p-1"
                              >
                                {isBookmarked ? (
                                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bookmark className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(announcement.id)}
                                className="p-1"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          {/* 基本情報 */}
                          <div className="mb-4">
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{announcement.author}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Building2 className="w-4 h-4" />
                                <span>{announcement.department}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {announcement.publishedAt?.toLocaleDateString("ja-JP")}
                                </span>
                              </div>
                            </div>
                            
                            {/* 既読率 */}
                            <div className="flex items-center space-x-3 text-sm">
                              <div className="flex items-center space-x-1">
                                <Eye className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">
                                  既読率: {readPercentage}% ({announcement.readCount}/{announcement.totalTargets})
                                </span>
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${readPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* 内容 */}
                          <div className="mb-4">
                            <p className={`text-gray-700 whitespace-pre-line ${
                              isExpanded ? "" : "line-clamp-3"
                            }`}>
                              {announcement.content}
                            </p>
                          </div>

                          {/* 対象者・タグ */}
                          {isExpanded && (
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">対象者</h4>
                                <div className="flex flex-wrap gap-1">
                                  {announcement.targetAudience.map((target, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {target}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              {announcement.tags.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">タグ</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {announcement.tags.map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {announcement.attachments && announcement.attachments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">添付ファイル</h4>
                                  <div className="space-y-1">
                                    {announcement.attachments.map((file) => (
                                      <div key={file.id} className="flex items-center space-x-2 text-sm">
                                        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                          <FileText className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-blue-600 hover:underline cursor-pointer">
                                          {file.name}
                                        </span>
                                        <span className="text-gray-500">
                                          ({Math.round(file.size / 1024)}KB)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* アクションボタン */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                コメント
                              </Button>
                              <Button variant="outline" size="sm">
                                <Share2 className="w-4 h-4 mr-1" />
                                共有
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4 mr-1" />
                                編集
                              </Button>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;