"use client";
import React, { useState, useEffect } from "react";
import { subscribeToAnnouncements } from "@/lib/firebase/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  Edit,
  Pin,
  Info,
  CheckCircle,
  Users,
  Calendar,
  MoreHorizontal,
  MessageSquare,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Target,
  Wrench,
  HardHat,
  Zap,
  FileText,
} from "lucide-react";


// ページ用の拡張型定義
interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

// ページ用の拡張Announcement型
interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: "normal" | "high" | "urgent";
  isActive: boolean;
  authorName: string;
  publishedAt: Date | null;
  expiresAt: Date | null;
  targetAudience: string[];
  isSticky: boolean;
  readCount: number;
  totalTargetCount: number;
  tags: string[];
  attachments?: AttachmentFile[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  // 製造業特化のお知らせカテゴリ（useMemoで固定）
  const categories = React.useMemo<AnnouncementCategory[]>(() => [
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
  ], []);



  // Firebaseからデータを取得（リアルタイムサブスクリプション）
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let lastDataStr = "";
    
    // Firebase subscription設定
    const setupSubscription = () => {
      unsubscribe = subscribeToAnnouncements(
        {
          isActive: true,
          limit: 50
        },
        (firebaseData) => {
          // データの変更を検出
          const currentDataStr = JSON.stringify(firebaseData.map(d => ({ id: d.id, updatedAt: d.updatedAt })));
          if (currentDataStr === lastDataStr) {
            return; // データが同じなら何もしない
          }
          lastDataStr = currentDataStr;
          
          // データを変換して設定
          const convertedData = firebaseData.map(fbData => {
            const categoryMap = {
              'safety': categories[0],
              'production': categories[1], 
              'maintenance': categories[2],
              'quality': categories[3],
              'system': categories[4],
              'general': categories[5],
              'schedule': categories[5],
              'policy': categories[5],
              'emergency': categories[0]
            } as const;
            
            return {
              id: fbData.id,
              title: fbData.title,
              content: fbData.content,
              category: categoryMap[fbData.category as keyof typeof categoryMap] || categories[5],
              priority: fbData.priority === 'medium' ? 'normal' : fbData.priority as 'normal' | 'high' | 'urgent',
              isActive: fbData.isActive,
              authorName: fbData.authorName,
              publishedAt: fbData.publishedAt ? new Date(fbData.publishedAt) : null,
              expiresAt: fbData.expiresAt ? new Date(fbData.expiresAt) : null,
              targetAudience: Array.isArray(fbData.targetDepartments) ? fbData.targetDepartments : ['全社員'],
              isSticky: fbData.priority === 'urgent',
              readCount: fbData.readCount,
              totalTargetCount: fbData.totalTargetCount,
              tags: [],
              attachments: fbData.attachments?.map(att => ({
                id: att.fileName,
                name: att.fileName,
                size: att.fileSize,
                type: 'application/pdf',
                url: att.fileUrl
              })),
              createdAt: fbData.createdAt instanceof Date ? fbData.createdAt : new Date(),
              updatedAt: fbData.updatedAt instanceof Date ? fbData.updatedAt : new Date()
            };
          });
          
          setAnnouncements(convertedData);
        }
      );
    };
    
    setupSubscription();
    
    // クリーンアップ
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [categories]); // categoriesを依存配列に追加

  // フィルタリング処理
  useEffect(() => {
    const filtered = announcements.filter(ann => {
      // アクティブなお知らせのみ表示
      if (!ann.isActive) return false;
      
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
          ann.authorName.toLowerCase().includes(query) ||
          ann.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });

    // ソート: 固定表示、優先度、公開日時順
    filtered.sort((a, b) => {
      if (a.isSticky && !b.isSticky) return -1;
      if (!a.isSticky && b.isSticky) return 1;
      
      const priorityOrder = { urgent: 3, high: 2, normal: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      const aDate = a.publishedAt || a.createdAt;
      const bDate = b.publishedAt || b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });

    setFilteredAnnouncements(filtered);
  }, [announcements, searchQuery, filterCategory, filterPriority]);


  // 既読率を取得
  const getReadPercentage = (announcement: Announcement) => {
    return Math.round((announcement.readCount / announcement.totalTargetCount) * 100);
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Megaphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">全体周知</h1>
                <p className="text-gray-600 dark:text-slate-400 mt-1">
                  社内の重要なお知らせと連絡事項を管理
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
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
                  // お知らせ作成機能は今後実装予定
                  alert("お知らせ作成機能は開発中です");
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 dark:from-orange-500 dark:to-red-500 dark:hover:from-orange-600 dark:hover:to-red-600 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                お知らせ作成
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* 左側サイドバー */}
          <div className="w-64 flex flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
            <div className="p-4">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="お知らせを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* カテゴリタブ */}
              <div className="space-y-1 mb-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-2">カテゴリ</h3>
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`w-full flex items-center gap-3 p-3 transition-all duration-200 text-left border-l-2 ${
                    filterCategory === "all"
                      ? "bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-500 dark:border-indigo-400"
                      : "text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-slate-700/50 border-transparent"
                  }`}
                >
                  <Megaphone className={`w-4 h-4 ${filterCategory === "all" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"}`} />
                  <span className="text-sm font-medium">すべて</span>
                  <span className={`ml-auto text-xs font-semibold ${
                    filterCategory === "all" ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-slate-400"
                  }`}>
                    {announcements.length}
                  </span>
                </button>
                
                {categories.map(category => {
                  const Icon = category.icon;
                  const count = announcements.filter(a => a.category.id === category.id).length;
                  const isActive = filterCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setFilterCategory(category.id)}
                      className={`w-full flex items-center gap-3 p-3 transition-all duration-200 text-left border-l-2 ${
                        isActive
                          ? "bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-500 dark:border-indigo-400"
                          : "text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-slate-700/50 border-transparent"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : category.color + " dark:" + category.color.replace('text-', 'text-slate-')}`} />
                      <span className="text-sm font-medium">{category.name}</span>
                      {count > 0 && (
                        <span className={`ml-auto text-xs font-semibold ${
                          isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-slate-400"
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 優先度フィルター */}
              <div className="space-y-1 mb-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-2">優先度</h3>
                {[
                  { value: "all", label: "すべて", count: announcements.length },
                  { value: "urgent", label: "緊急", count: announcements.filter(a => a.priority === "urgent").length },
                  { value: "high", label: "重要", count: announcements.filter(a => a.priority === "high").length },
                  { value: "normal", label: "普通", count: announcements.filter(a => a.priority === "normal").length },
                ].map(priority => {
                  const isActive = filterPriority === priority.value;
                  return (
                    <button
                      key={priority.value}
                      onClick={() => setFilterPriority(priority.value)}
                      className={`w-full flex items-center justify-between p-2 px-4 transition-all duration-200 text-left hover:bg-gray-50/50 dark:hover:bg-slate-700/50 ${
                        isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-sm font-medium">{priority.label}</span>
                      <span className={`text-xs font-semibold ${
                        isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-slate-400"
                      }`}>
                        {priority.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 統計情報 */}
              <div className="py-4 border-t border-gray-200 dark:border-slate-600">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">統計</h3>
                <div className="space-y-2">
                  <div className="flex justify-between px-2 py-1">
                    <span className="text-sm text-gray-600 dark:text-slate-400">公開中</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {announcements.filter(a => a.isActive).length}
                    </span>
                  </div>
                  <div className="flex justify-between px-2 py-1">
                    <span className="text-sm text-gray-600 dark:text-slate-400">重要・緊急</span>
                    <span className="text-sm font-semibold text-red-600">
                      {announcements.filter(a => a.priority === "high" || a.priority === "urgent").length}
                    </span>
                  </div>
                  <div className="flex justify-between px-2 py-1">
                    <span className="text-sm text-gray-600 dark:text-slate-400">固定表示</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {announcements.filter(a => a.isSticky).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
            <div className="p-6">
              {filteredAnnouncements.length === 0 ? (
                <div className="text-center py-16">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    お知らせが見つかりません
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    検索条件を変更するか、新しいお知らせを作成してください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAnnouncements.map(announcement => {
                    const Icon = announcement.category.icon;
                    const isExpanded = expandedItems.has(announcement.id);
                    const isBookmarked = bookmarkedItems.has(announcement.id);
                    const readPercentage = getReadPercentage(announcement);

                    return (
                      <div key={announcement.id}>
                        <div
                          className={`p-6 border-l-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border border-gray-200 dark:border-slate-700 rounded-lg ${
                            announcement.priority === "urgent" ? "border-l-red-500" :
                            announcement.priority === "high" ? "border-l-orange-500" :
                            announcement.priority === "normal" ? "border-l-blue-500" :
                            "border-l-gray-400"
                          } ${announcement.isSticky ? "bg-blue-50/30 dark:bg-blue-900/20" : "bg-white dark:bg-slate-800"}`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                announcement.priority === "urgent" ? "bg-red-100 dark:bg-red-900/30" :
                                announcement.priority === "high" ? "bg-orange-100 dark:bg-orange-900/30" :
                                announcement.priority === "normal" ? "bg-blue-100 dark:bg-blue-900/30" :
                                "bg-gray-100 dark:bg-slate-700"
                              }`}>
                                <Icon className={`w-5 h-5 ${announcement.category.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  {announcement.isSticky && (
                                    <Pin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  )}
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {announcement.title}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3 mb-3 text-sm text-gray-600 dark:text-slate-400">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    announcement.category.bgColor
                                  }`}>
                                    {announcement.category.name}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    announcement.priority === "urgent" ? "bg-red-100 text-red-700" :
                                    announcement.priority === "high" ? "bg-orange-100 text-orange-700" :
                                    announcement.priority === "normal" ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-700"
                                  }`}>
                                    {announcement.priority === "urgent" ? "緊急" :
                                     announcement.priority === "high" ? "重要" :
                                     announcement.priority === "normal" ? "普通" : "低"}
                                  </span>
                                  {announcement.isSticky && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                      固定表示
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{announcement.authorName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{announcement.publishedAt?.toLocaleDateString("ja-JP")}</span>
                                  </div>
                                </div>
                                <p className={`text-sm text-gray-700 dark:text-slate-300 leading-relaxed mb-3 ${
                                  isExpanded ? "whitespace-pre-line" : "line-clamp-2"
                                }`}>
                                  {announcement.content}
                                </p>
                                {/* 既読率バー */}
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600 dark:text-slate-400">
                                      既読率: {readPercentage}% ({announcement.readCount}/{announcement.totalTargetCount})
                                    </span>
                                  </div>
                                  <div className="flex-1 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 max-w-48">
                                    <div
                                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${readPercentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-6">
                              <button
                                onClick={() => toggleBookmark(announcement.id)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                              >
                                {isBookmarked ? (
                                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleExpanded(announcement.id)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* アクションボタン */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 rounded transition-colors">
                                <MessageSquare className="w-4 h-4" />
                                コメント
                              </button>
                              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/30 rounded transition-colors">
                                <Share2 className="w-4 h-4" />
                                共有
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/30 rounded transition-colors">
                                <Edit className="w-4 h-4" />
                                編集
                              </button>
                              <button className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 展開された詳細エリア */}
                        {isExpanded && (
                          <div className="border-l-4 border-l-gray-200 dark:border-l-slate-600 bg-gray-50/30 dark:bg-slate-800/50 px-6 py-4">
                            <div className="space-y-4">
                              {/* 対象者 */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">対象者</h4>
                                <div className="flex flex-wrap gap-2">
                                  {announcement.targetAudience.map((target, index) => (
                                    <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs rounded">
                                      {target}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              
                              {/* タグ */}
                              {announcement.tags.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">タグ</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {announcement.tags.map((tag, index) => (
                                      <span key={index} className="px-2 py-1 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 text-xs rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 添付ファイル */}
                              {announcement.attachments && announcement.attachments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">添付ファイル</h4>
                                  <div className="space-y-2">
                                    {announcement.attachments.map((file) => (
                                      <div key={file.id} className="flex items-center gap-3 text-sm hover:bg-blue-50/50 dark:hover:bg-blue-900/20 p-2 rounded transition-colors">
                                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                                          <FileText className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                          {file.name}
                                        </span>
                                        <span className="text-gray-500 dark:text-slate-400">
                                          ({Math.round(file.size / 1024)}KB)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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