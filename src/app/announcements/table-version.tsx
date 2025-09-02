"use client";
import React, { useState, useEffect } from "react";
import { subscribeToAnnouncements } from "@/lib/firebase/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Megaphone, Plus, Search, Eye, Edit, Pin, Info, CheckCircle, Users, Calendar,
  MessageSquare, Share2, ChevronDown, ChevronUp, Target, Wrench, HardHat, Zap
} from "lucide-react";

interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

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
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const categories = React.useMemo<AnnouncementCategory[]>(() => [
    { id: "safety", name: "安全・労務", color: "text-red-600", bgColor: "bg-red-100 border-red-300", icon: HardHat, description: "安全規則・労働関連のお知らせ" },
    { id: "production", name: "生産・工程", color: "text-blue-600", bgColor: "bg-blue-100 border-blue-300", icon: Target, description: "生産計画・工程変更のお知らせ" },
    { id: "maintenance", name: "設備・保全", color: "text-orange-600", bgColor: "bg-orange-100 border-orange-300", icon: Wrench, description: "設備メンテナンス・修理のお知らせ" },
    { id: "quality", name: "品質管理", color: "text-green-600", bgColor: "bg-green-100 border-green-300", icon: CheckCircle, description: "品質方針・検査関連のお知らせ" },
    { id: "system", name: "システム", color: "text-purple-600", bgColor: "bg-purple-100 border-purple-300", icon: Zap, description: "システム更新・障害のお知らせ" },
    { id: "general", name: "一般・その他", color: "text-gray-600", bgColor: "bg-gray-100 border-gray-300", icon: Info, description: "一般的なお知らせ・イベント" },
  ], []);

  // Firebaseからデータを取得
  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements(
      { isActive: true, limit: 50 },
      (firebaseData) => {
        const convertedData = firebaseData.map(fbData => {
          const categoryMap = {
            'safety': categories[0], 'production': categories[1], 'maintenance': categories[2],
            'quality': categories[3], 'system': categories[4], 'general': categories[5],
            'schedule': categories[5], 'policy': categories[5], 'emergency': categories[0]
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
            createdAt: fbData.createdAt instanceof Date ? fbData.createdAt : new Date(),
            updatedAt: fbData.updatedAt instanceof Date ? fbData.updatedAt : new Date()
          };
        });
        setAnnouncements(convertedData);
      }
    );
    return () => unsubscribe && unsubscribe();
  }, [categories]);

  // フィルタリング処理
  useEffect(() => {
    const filtered = announcements.filter(ann => {
      if (!ann.isActive) return false;
      if (filterCategory !== "all" && ann.category.id !== filterCategory) return false;
      if (filterPriority !== "all" && ann.priority !== filterPriority) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return ann.title.toLowerCase().includes(query) || ann.content.toLowerCase().includes(query) || ann.authorName.toLowerCase().includes(query);
      }
      return true;
    });

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

  const getReadPercentage = (announcement: Announcement) => {
    return Math.round((announcement.readCount / announcement.totalTargetCount) * 100);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Megaphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">全体周知</h1>
                <p className="text-gray-600 dark:text-slate-400 mt-1">社内の重要なお知らせと連絡事項を管理</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* 左側サイドバー */}
          <div className="w-64 flex flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
            <div className="p-4">
              <Button
                onClick={() => alert("お知らせ作成機能は開発中です")}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium mb-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                お知らせ作成
              </Button>
              
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="お知らせを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* カテゴリフィルター */}
              <div className="space-y-1 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">カテゴリ</h3>
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`w-full text-left px-2 py-1 text-sm rounded ${
                    filterCategory === "all" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                  }`}
                >
                  すべて ({announcements.length})
                </button>
                {categories.map(category => {
                  const count = announcements.filter(a => a.category.id === category.id).length;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setFilterCategory(category.id)}
                      className={`w-full text-left px-2 py-1 text-sm rounded ${
                        filterCategory === category.id ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                    >
                      {category.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* テーブルエリア */}
          <div className="flex-1 bg-white dark:bg-slate-800">
            <div className="overflow-auto h-full">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      お知らせ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      優先度
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      投稿者
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      既読率
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredAnnouncements.map(announcement => {
                    const Icon = announcement.category.icon;
                    const readPercentage = getReadPercentage(announcement);
                    const isExpanded = expandedItems.has(announcement.id);

                    return (
                      <React.Fragment key={announcement.id}>
                        <tr 
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                            announcement.isSticky ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-1 h-16 rounded-full ${
                                announcement.priority === "urgent" ? "bg-red-500" :
                                announcement.priority === "high" ? "bg-orange-500" :
                                "bg-blue-500"
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {announcement.isSticky && <Pin className="w-3 h-3 text-blue-500" />}
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                    {announcement.title}
                                  </h3>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                                  {announcement.content}
                                </p>
                                <div className="text-xs text-gray-400 mt-1">
                                  {announcement.publishedAt?.toLocaleDateString("ja-JP")}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${announcement.category.color}`} />
                              <span className="text-sm text-gray-600 dark:text-slate-400">
                                {announcement.category.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              announcement.priority === "urgent" ? "bg-red-100 text-red-800" :
                              announcement.priority === "high" ? "bg-orange-100 text-orange-800" :
                              "bg-blue-100 text-blue-800"
                            }`}>
                              {announcement.priority === "urgent" ? "緊急" :
                               announcement.priority === "high" ? "重要" : "普通"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                            {announcement.authorName}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 max-w-16">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${readPercentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                {readPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  if (commentingId === announcement.id) {
                                    setCommentingId(null);
                                  } else {
                                    setCommentingId(announcement.id);
                                  }
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500 hover:text-blue-600"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/announcements#${announcement.id}`;
                                  navigator.clipboard.writeText(url);
                                  alert("リンクをコピーしました");
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500 hover:text-green-600"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(announcement.id);
                                  alert(`お知らせ「${announcement.title}」の編集機能は開発中です`);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500 hover:text-orange-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleExpanded(announcement.id)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* コメント行 */}
                        {commentingId === announcement.id && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 bg-blue-50 dark:bg-blue-900/10">
                              <div className="flex gap-2">
                                <Input
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="コメントを入力..."
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => {
                                    alert(`コメント: "${commentText}" を投稿しました（機能は開発中）`);
                                    setCommentingId(null);
                                    setCommentText("");
                                  }}
                                  size="sm"
                                >
                                  送信
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* 展開詳細行 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-slate-700/30">
                              <div className="ml-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">対象者</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {announcement.targetAudience.map((target, index) => (
                                        <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 text-xs rounded">
                                          {target}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">詳細</h4>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-line">
                                      {announcement.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;