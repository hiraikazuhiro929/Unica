"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  Search,
  Edit,
  Trash2,
  Pin,
  PinOff,
  ExternalLink,
  Clock,
  Star,
  StarOff,
  BarChart3,
  FileText,
  Users,
  Calendar,
  MessageCircle,
  Settings,
  AlertTriangle,
  CheckCircle,
  Building2,
  Target,
  Wrench,
  Bell,
  Activity,
  TrendingUp,
  Archive,
  Eye,
} from "lucide-react";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: string;
  category: "navigation" | "creation" | "report" | "system" | "external";
  isPinned: boolean;
  isFavorite: boolean;
  lastUsed?: Date;
  useCount: number;
  color: string;
  shortcut?: string;
}

const ShortcutsPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<"all" | QuickAction["category"]>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    // ナビゲーション系
    {
      id: "1",
      title: "ダッシュボード",
      description: "全体の状況を一目で確認",
      icon: BarChart3,
      action: "/",
      category: "navigation",
      isPinned: true,
      isFavorite: true,
      lastUsed: new Date(Date.now() - 300000),
      useCount: 45,
      color: "bg-blue-500",
      shortcut: "Ctrl+H",
    },
    {
      id: "2",
      title: "工程管理",
      description: "工程リストと進捗管理",
      icon: Target,
      action: "/tasks",
      category: "navigation",
      isPinned: true,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 600000),
      useCount: 38,
      color: "bg-green-500",
      shortcut: "Ctrl+T",
    },
    {
      id: "3",
      title: "受注案件",
      description: "新規受注と案件管理",
      icon: Building2,
      action: "/orders",
      category: "navigation",
      isPinned: false,
      isFavorite: true,
      lastUsed: new Date(Date.now() - 1800000),
      useCount: 29,
      color: "bg-purple-500",
    },
    {
      id: "4",
      title: "チャット",
      description: "チーム間コミュニケーション",
      icon: MessageCircle,
      action: "/chat",
      category: "navigation",
      isPinned: true,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 900000),
      useCount: 67,
      color: "bg-indigo-500",
      shortcut: "Ctrl+M",
    },

    // 作成系
    {
      id: "5",
      title: "新規受注作成",
      description: "受注案件を新規登録",
      icon: Plus,
      action: "/orders?action=create",
      category: "creation",
      isPinned: false,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 3600000),
      useCount: 15,
      color: "bg-orange-500",
    },
    {
      id: "6",
      title: "日報作成",
      description: "本日の作業日報を作成",
      icon: FileText,
      action: "/daily-reports",
      category: "creation",
      isPinned: true,
      isFavorite: true,
      lastUsed: new Date(Date.now() - 7200000),
      useCount: 89,
      color: "bg-yellow-500",
      shortcut: "Ctrl+D",
    },
    {
      id: "7",
      title: "不具合報告",
      description: "品質問題を即座に報告",
      icon: AlertTriangle,
      action: "/defect-reports",
      category: "creation",
      isPinned: true,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 14400000),
      useCount: 12,
      color: "bg-red-500",
    },

    // レポート系
    {
      id: "8",
      title: "進捗レポート",
      description: "工程進捗の詳細レポート",
      icon: TrendingUp,
      action: "/reports/progress",
      category: "report",
      isPinned: false,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 86400000),
      useCount: 23,
      color: "bg-cyan-500",
    },
    {
      id: "9",
      title: "工数分析",
      description: "工数データの分析結果",
      icon: BarChart3,
      action: "/reports/hours",
      category: "report",
      isPinned: false,
      isFavorite: true,
      lastUsed: new Date(Date.now() - 172800000),
      useCount: 31,
      color: "bg-teal-500",
    },

    // システム系
    {
      id: "10",
      title: "通知センター",
      description: "未読通知を一括確認",
      icon: Bell,
      action: "/notifications",
      category: "system",
      isPinned: false,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 1800000),
      useCount: 56,
      color: "bg-pink-500",
    },
    {
      id: "11",
      title: "システム設定",
      description: "アプリケーション設定",
      icon: Settings,
      action: "/settings",
      category: "system",
      isPinned: false,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 604800000),
      useCount: 8,
      color: "bg-gray-500",
    },

    // 外部系
    {
      id: "12",
      title: "生産管理システム",
      description: "既存システムへのリンク",
      icon: ExternalLink,
      action: "https://production.company.com",
      category: "external",
      isPinned: false,
      isFavorite: false,
      lastUsed: new Date(Date.now() - 259200000),
      useCount: 19,
      color: "bg-slate-500",
    },
  ]);

  // フィルタリング
  const filteredActions = quickActions.filter(action => {
    const matchesSearch = action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || action.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ソート (ピン留め→お気に入り→使用回数順)
  const sortedActions = [...filteredActions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.useCount - a.useCount;
  });

  // アクション実行
  const executeAction = (action: QuickAction) => {
    // 使用回数と最終使用日を更新
    setQuickActions(actions => 
      actions.map(a => 
        a.id === action.id 
          ? { ...a, useCount: a.useCount + 1, lastUsed: new Date() }
          : a
      )
    );

    if (action.action.startsWith('http')) {
      // 外部リンク
      window.open(action.action, '_blank');
    } else {
      // 内部ナビゲーション
      router.push(action.action);
    }
  };

  // ピン留め切り替え
  const togglePin = (actionId: string) => {
    setQuickActions(actions =>
      actions.map(action =>
        action.id === actionId
          ? { ...action, isPinned: !action.isPinned }
          : action
      )
    );
  };

  // お気に入り切り替え
  const toggleFavorite = (actionId: string) => {
    setQuickActions(actions =>
      actions.map(action =>
        action.id === actionId
          ? { ...action, isFavorite: !action.isFavorite }
          : action
      )
    );
  };

  const categoryLabels = {
    navigation: "ナビゲーション",
    creation: "新規作成",
    report: "レポート",
    system: "システム",
    external: "外部リンク",
  };

  const pinnedActions = sortedActions.filter(action => action.isPinned);
  const favoriteActions = sortedActions.filter(action => action.isFavorite && !action.isPinned);
  const recentActions = sortedActions
    .filter(action => !action.isPinned && !action.isFavorite)
    .sort((a, b) => {
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">クイックアクセス</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  よく使う機能への素早いアクセス
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="アクションを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* カテゴリフィルター */}
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md text-sm"
              >
                <option value="all">全カテゴリ</option>
                <option value="navigation">ナビゲーション</option>
                <option value="creation">新規作成</option>
                <option value="report">レポート</option>
                <option value="system">システム</option>
                <option value="external">外部リンク</option>
              </select>

              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                追加
              </Button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto p-6 space-y-8 bg-gray-50 dark:bg-slate-900">
          {/* ピン留めアクション */}
          {pinnedActions.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Pin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">ピン留め</h2>
                <Badge variant="secondary" className="text-xs">
                  {pinnedActions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pinnedActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Card
                      key={action.id}
                      className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                      onClick={() => executeAction(action)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${action.color} text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(action.id);
                              }}
                            >
                              {action.isFavorite ? (
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="w-3 h-3 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(action.id);
                              }}
                            >
                              <PinOff className="w-3 h-3 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {action.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">
                            {action.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-2">
                            <span>{action.useCount}回使用</span>
                            {action.shortcut && (
                              <Badge variant="outline" className="text-xs">
                                {action.shortcut}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* お気に入りアクション */}
          {favoriteActions.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">お気に入り</h2>
                <Badge variant="secondary" className="text-xs">
                  {favoriteActions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Card
                      key={action.id}
                      className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                      onClick={() => executeAction(action)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${action.color} text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(action.id);
                              }}
                            >
                              <StarOff className="w-3 h-3 text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(action.id);
                              }}
                            >
                              <Pin className="w-3 h-3 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {action.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">
                            {action.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-2">
                            <span>{action.useCount}回使用</span>
                            {action.shortcut && (
                              <Badge variant="outline" className="text-xs">
                                {action.shortcut}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 最近使用したアクション */}
          {recentActions.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">最近使用</h2>
                <Badge variant="secondary" className="text-xs">
                  {recentActions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recentActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Card
                      key={action.id}
                      className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                      onClick={() => executeAction(action)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${action.color} text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(action.id);
                              }}
                            >
                              {action.isFavorite ? (
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="w-3 h-3 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(action.id);
                              }}
                            >
                              <Pin className="w-3 h-3 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {action.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">
                            {action.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-2">
                            <span>{action.useCount}回使用</span>
                            {action.lastUsed && (
                              <span>
                                {action.lastUsed.toLocaleDateString("ja-JP", { 
                                  month: "short", 
                                  day: "numeric" 
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsPage;