"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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

// Firebase型をimport
import { Announcement as FirebaseAnnouncement } from "@/lib/firebase/announcements";

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


  // Firebase型をページ型に変換する関数
  const convertFirebaseToPageAnnouncement = useCallback((fbAnnouncement: FirebaseAnnouncement): Announcement => {
    const categoryMap = {
      'safety': categories[0],
      'production': categories[1], 
      'maintenance': categories[2],
      'quality': categories[3],
      'system': categories[4],
      'general': categories[5]
    } as const;
    
    return {
      id: fbAnnouncement.id,
      title: fbAnnouncement.title,
      content: fbAnnouncement.content,
      category: categoryMap[fbAnnouncement.category as keyof typeof categoryMap] || categories[5],
      priority: fbAnnouncement.priority === 'medium' ? 'normal' : fbAnnouncement.priority as 'normal' | 'high' | 'urgent',
      isActive: fbAnnouncement.isActive,
      authorName: fbAnnouncement.authorName,
      publishedAt: fbAnnouncement.publishedAt ? new Date(fbAnnouncement.publishedAt) : null,
      expiresAt: fbAnnouncement.expiresAt ? new Date(fbAnnouncement.expiresAt) : null,
      targetAudience: Array.isArray(fbAnnouncement.targetDepartments) ? fbAnnouncement.targetDepartments : ['全社員'],
      isSticky: fbAnnouncement.priority === 'urgent',
      readCount: fbAnnouncement.readCount,
      totalTargetCount: fbAnnouncement.totalTargetCount,
      tags: [],
      attachments: fbAnnouncement.attachments?.map(att => ({
        id: att.fileName,
        name: att.fileName,
        size: att.fileSize,
        type: 'application/pdf',
        url: att.fileUrl
      })),
      createdAt: fbAnnouncement.createdAt instanceof Date ? fbAnnouncement.createdAt : new Date(),
      updatedAt: fbAnnouncement.updatedAt instanceof Date ? fbAnnouncement.updatedAt : new Date()
    };
  }, [categories]);

  // Firebaseからデータを取得
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = subscribeToAnnouncements(
      {
        isActive: true,
        limit: 50
      },
      (firebaseData) => {
        if (!isMounted) return;
        
        console.log('Received announcements from Firebase:', firebaseData);
        // Firebase型をページ型に変換
        const convertedData = firebaseData.map(convertFirebaseToPageAnnouncement);
        setAnnouncements(convertedData);
        setFilteredAnnouncements(convertedData.filter(a => a.isActive));
      }
    );
    
    // Fallback to sample data if no Firebase data
    const fallbackTimer = setTimeout(() => {
      if (!isMounted) return;
      setAnnouncements(prev => {
        if (prev.length === 0) {
          console.log('No Firebase data found, using sample data as fallback');
          const fallbackData = [
            {
              id: "1",
              title: "第1工場設備点検による生産停止のお知らせ",
              content: "来週月曜日（2月15日）午前9時から午後5時まで、第1工場の定期設備点検を実施いたします。この間、A製品ラインは生産停止となります。",
              category: categories[2],
              priority: "high" as const,
              isActive: true,
              authorName: "保全部長 山田太郎",
              publishedAt: new Date(2025, 1, 10, 9, 0),
              expiresAt: new Date(2025, 1, 20, 17, 0),
              targetAudience: ["生産部", "品質管理部", "工場作業員"],
              isSticky: true,
              readCount: 45,
              totalTargetCount: 50,
              tags: ["設備点検", "生産停止", "第1工場"],
              createdAt: new Date(2025, 1, 9, 14, 30),
              updatedAt: new Date(2025, 1, 9, 14, 30),
            }
          ];
          const activeData = fallbackData.filter(a => a.isActive);
          setFilteredAnnouncements(activeData);
          return fallbackData;
        }
        return prev;
      });
    }, 2000);
    
    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [convertFirebaseToPageAnnouncement]);

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
                  // お知らせ作成機能は今後実装予定
                  alert("お知らせ作成機能は開発中です");
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
          {/* 左側サイドバー */}
          <div className="w-64 flex flex-col">
            <div className="p-4">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="お知らせを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* カテゴリタブ */}
              <div className="space-y-1 mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 px-2">カテゴリ</h3>
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`w-full flex items-center gap-3 p-3 transition-all duration-200 text-left border-l-2 ${
                    filterCategory === "all"
                      ? "bg-indigo-50/50 text-indigo-600 border-indigo-500"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50/50 border-transparent"
                  }`}
                >
                  <Megaphone className={`w-4 h-4 ${filterCategory === "all" ? "text-indigo-600" : "text-gray-400"}`} />
                  <span className="text-sm font-medium">すべて</span>
                  <span className={`ml-auto text-xs font-semibold ${
                    filterCategory === "all" ? "text-indigo-700" : "text-gray-500"
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
                          ? "bg-indigo-50/50 text-indigo-600 border-indigo-500"
                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-50/50 border-transparent"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : category.color}`} />
                      <span className="text-sm font-medium">{category.name}</span>
                      {count > 0 && (
                        <span className={`ml-auto text-xs font-semibold ${
                          isActive ? "text-indigo-700" : "text-gray-500"
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
                <h3 className="text-sm font-semibold text-gray-900 mb-3 px-2">優先度</h3>
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
                      className={`w-full flex items-center justify-between p-2 px-4 transition-all duration-200 text-left hover:bg-gray-50/50 ${
                        isActive ? "text-indigo-600" : "text-gray-700"
                      }`}
                    >
                      <span className="text-sm font-medium">{priority.label}</span>
                      <span className={`text-xs font-semibold ${
                        isActive ? "text-indigo-600" : "text-gray-500"
                      }`}>
                        {priority.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 統計情報 */}
              <div className="py-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 px-2">統計</h3>
                <div className="space-y-2">
                  <div className="flex justify-between px-2 py-1">
                    <span className="text-sm text-gray-600">公開中</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {announcements.filter(a => a.isActive).length}
                    </span>
                  </div>
                  <div className="flex justify-between px-2 py-1">
                    <span className="text-sm text-gray-600">重要・緊急</span>
                    <span className="text-sm font-semibold text-red-600">
                      {announcements.filter(a => a.priority === "high" || a.priority === "urgent").length}
                    </span>
                  </div>
                  <div className="flex justify-between px-2 py-1">
                    <span className="text-sm text-gray-600">固定表示</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {announcements.filter(a => a.isSticky).length}
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
                <div className="text-center py-16">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    お知らせが見つかりません
                  </h3>
                  <p className="text-gray-600">
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
                          className={`p-6 border-l-4 hover:bg-gray-50/50 transition-all cursor-pointer ${
                            announcement.priority === "urgent" ? "border-l-red-500" :
                            announcement.priority === "high" ? "border-l-orange-500" :
                            announcement.priority === "normal" ? "border-l-blue-500" :
                            "border-l-gray-400"
                          } ${announcement.isSticky ? "bg-blue-50/30" : "bg-white/50"}`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                announcement.priority === "urgent" ? "bg-red-100" :
                                announcement.priority === "high" ? "bg-orange-100" :
                                announcement.priority === "normal" ? "bg-blue-100" :
                                "bg-gray-100"
                              }`}>
                                <Icon className={`w-5 h-5 ${announcement.category.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  {announcement.isSticky && (
                                    <Pin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  )}
                                  <h3 className="text-lg font-bold text-gray-900">
                                    {announcement.title}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
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
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{announcement.authorName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{announcement.publishedAt?.toLocaleDateString("ja-JP")}</span>
                                  </div>
                                </div>
                                <p className={`text-sm text-gray-700 leading-relaxed mb-3 ${
                                  isExpanded ? "whitespace-pre-line" : "line-clamp-2"
                                }`}>
                                  {announcement.content}
                                </p>
                                {/* 既読率バー */}
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">
                                      既読率: {readPercentage}% ({announcement.readCount}/{announcement.totalTargetCount})
                                    </span>
                                  </div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-48">
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
                                className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                {isBookmarked ? (
                                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleExpanded(announcement.id)}
                                className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
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
                              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded transition-colors">
                                <MessageSquare className="w-4 h-4" />
                                コメント
                              </button>
                              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50/50 rounded transition-colors">
                                <Share2 className="w-4 h-4" />
                                共有
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50/50 rounded transition-colors">
                                <Edit className="w-4 h-4" />
                                編集
                              </button>
                              <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 展開された詳細エリア */}
                        {isExpanded && (
                          <div className="border-l-4 border-l-gray-200 bg-gray-50/30 px-6 py-4">
                            <div className="space-y-4">
                              {/* 対象者 */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">対象者</h4>
                                <div className="flex flex-wrap gap-2">
                                  {announcement.targetAudience.map((target, index) => (
                                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {target}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              
                              {/* タグ */}
                              {announcement.tags.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">タグ</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {announcement.tags.map((tag, index) => (
                                      <span key={index} className="px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 添付ファイル */}
                              {announcement.attachments && announcement.attachments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">添付ファイル</h4>
                                  <div className="space-y-2">
                                    {announcement.attachments.map((file) => (
                                      <div key={file.id} className="flex items-center gap-3 text-sm hover:bg-blue-50/50 p-2 rounded transition-colors">
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