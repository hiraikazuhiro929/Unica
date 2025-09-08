"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3,
  Trash2,
  Plus,
  Eye,
  Download,
  Upload,
  RefreshCw,
  MessageSquare,
  Bell,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  entityType: 'order' | 'task' | 'report' | 'user' | 'system' | 'notification' | 'bookmark';
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'success';
  ipAddress?: string;
  userAgent?: string;
}

const ACTIVITY_TYPES = [
  { value: 'all', label: 'すべて', icon: Activity, color: 'bg-gray-100 text-gray-800' },
  { value: 'order', label: '受注', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  { value: 'task', label: 'タスク', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'report', label: '日報', icon: Calendar, color: 'bg-purple-100 text-purple-800' },
  { value: 'user', label: 'ユーザー', icon: User, color: 'bg-orange-100 text-orange-800' },
  { value: 'system', label: 'システム', icon: Settings, color: 'bg-red-100 text-red-800' },
  { value: 'notification', label: '通知', icon: Bell, color: 'bg-yellow-100 text-yellow-800' },
];

const SEVERITY_CONFIG = {
  info: { label: '情報', color: 'bg-blue-100 text-blue-800', icon: Clock },
  warning: { label: '警告', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  error: { label: 'エラー', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  success: { label: '成功', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

const ACTION_ICONS = {
  created: Plus,
  updated: Edit3,
  deleted: Trash2,
  viewed: Eye,
  downloaded: Download,
  uploaded: Upload,
  login: Shield,
  logout: Shield,
  error: AlertCircle,
  notification: Bell,
  sync: RefreshCw,
  comment: MessageSquare,
};

export default function ActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // 初期データ（実際の実装ではFirebaseから読み込み）
  useEffect(() => {
    if (!user?.uid) return;
    
    // モックデータ
    const now = new Date();
    const mockActivities: ActivityLog[] = [
      {
        id: '1',
        timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30分前
        userId: user.uid,
        userName: user.displayName || user.name || 'ユーザー',
        action: 'created',
        entityType: 'order',
        entityId: 'order-123',
        entityName: '新規受注案件A',
        description: '新規受注案件を作成しました',
        severity: 'success',
        metadata: { amount: 1500000 },
      },
      {
        id: '2',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2時間前
        userId: 'other-user',
        userName: '田中太郎',
        action: 'updated',
        entityType: 'task',
        entityId: 'task-456',
        entityName: '製造工程タスク',
        description: 'タスクのステータスを「進行中」に更新',
        severity: 'info',
        metadata: { oldStatus: 'pending', newStatus: 'progress' },
      },
      {
        id: '3',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4), // 4時間前
        userId: user.uid,
        userName: user.displayName || user.name || 'ユーザー',
        action: 'viewed',
        entityType: 'report',
        entityId: 'report-789',
        entityName: '日報 - 2024/01/15',
        description: '日報を閲覧しました',
        severity: 'info',
      },
      {
        id: '4',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6), // 6時間前
        userId: 'system',
        userName: 'システム',
        action: 'sync',
        entityType: 'system',
        description: 'データベースの定期同期を実行',
        severity: 'success',
        metadata: { syncedTables: ['orders', 'tasks', 'reports'] },
      },
      {
        id: '5',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8), // 8時間前
        userId: 'other-user-2',
        userName: '佐藤花子',
        action: 'error',
        entityType: 'order',
        entityId: 'order-error',
        entityName: 'エラー受注',
        description: 'ファイルアップロード時にエラーが発生',
        severity: 'error',
        metadata: { error: 'File size exceeds limit' },
      },
      {
        id: '6',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 12), // 12時間前
        userId: user.uid,
        userName: user.displayName || user.name || 'ユーザー',
        action: 'login',
        entityType: 'user',
        description: 'システムにログインしました',
        severity: 'info',
        ipAddress: '192.168.1.100',
      },
      {
        id: '7',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1日前
        userId: 'other-user',
        userName: '田中太郎',
        action: 'downloaded',
        entityType: 'report',
        entityId: 'export-001',
        entityName: '受注データエクスポート',
        description: 'CSV形式で受注データをダウンロード',
        severity: 'info',
        metadata: { format: 'csv', recordCount: 150 },
      },
      {
        id: '8',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 36), // 1.5日前
        userId: 'system',
        userName: 'システム',
        action: 'notification',
        entityType: 'notification',
        description: '期限迫るタスクの通知を送信',
        severity: 'warning',
        metadata: { notificationCount: 5, targetUsers: 3 },
      }
    ];
    
    setActivities(mockActivities);
  }, [user?.uid]);

  // フィルタリングされたアクティビティ
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = searchQuery === "" || 
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === "all" || activity.entityType === selectedType;
    const matchesSeverity = selectedSeverity === "all" || activity.severity === selectedSeverity;
    const matchesUser = activeTab === "all" || activity.userId === user?.uid;
    
    // 日付範囲フィルター
    const now = new Date();
    let matchesDate = true;
    if (dateRange === 'today') {
      matchesDate = activity.timestamp.toDateString() === now.toDateString();
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = activity.timestamp >= weekAgo;
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = activity.timestamp >= monthAgo;
    }
    
    return matchesSearch && matchesType && matchesSeverity && matchesUser && matchesDate;
  });

  // アクション名の日本語化
  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      created: '作成',
      updated: '更新',
      deleted: '削除',
      viewed: '閲覧',
      downloaded: 'ダウンロード',
      uploaded: 'アップロード',
      login: 'ログイン',
      logout: 'ログアウト',
      error: 'エラー',
      notification: '通知送信',
      sync: '同期',
      comment: 'コメント',
    };
    return actionMap[action] || action;
  };

  // アクションアイコンを取得
  const getActionIcon = (action: string) => {
    const IconComponent = ACTION_ICONS[action as keyof typeof ACTION_ICONS] || Activity;
    return IconComponent;
  };

  // 相対時間表示
  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return timestamp.toLocaleDateString('ja-JP');
  };

  if (!user?.uid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-300">ログインが必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">アクティビティログ</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-slate-300">
                  <span>総数: <span className="font-bold text-blue-600">{activities.length}</span></span>
                  <span>表示中: <span className="font-bold text-cyan-600">{filteredActivities.length}</span></span>
                  <span>エラー: <span className="font-bold text-red-600">{activities.filter(a => a.severity === 'error').length}</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="アクティビティを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              {/* 日付範囲 */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { key: 'today', label: '今日' },
                  { key: 'week', label: '1週間' },
                  { key: 'month', label: '1ヶ月' },
                  { key: 'all', label: 'すべて' },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={dateRange === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDateRange(key as any)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex overflow-hidden">
          {/* サイドバー */}
          <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4">
            <div className="space-y-6">
              {/* タイプフィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">タイプ</h3>
                <div className="space-y-1">
                  {ACTIVITY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const count = type.value === 'all' 
                      ? activities.length 
                      : activities.filter(a => a.entityType === type.value).length;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedType === type.value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-slate-600 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 重要度フィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">重要度</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedSeverity("all")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedSeverity === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    すべて ({activities.length})
                  </button>
                  
                  {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
                    const Icon = config.icon;
                    const count = activities.filter(a => a.severity === severity).length;
                    return (
                      <button
                        key={severity}
                        onClick={() => setSelectedSeverity(severity)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedSeverity === severity ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-slate-600 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* アクティビティリスト */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* タブ */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'my')} className="mb-6">
                <TabsList>
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    全体のアクティビティ
                  </TabsTrigger>
                  <TabsTrigger value="my" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    自分のアクティビティ
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* アクティビティ表示 */}
              {filteredActivities.length === 0 ? (
                <div className="text-center py-16">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    {searchQuery || selectedType !== "all" || selectedSeverity !== "all"
                      ? "該当するアクティビティが見つかりません"
                      : "まだアクティビティがありません"}
                  </p>
                  <p className="text-gray-400">
                    {searchQuery || selectedType !== "all" || selectedSeverity !== "all"
                      ? "フィルターを変更してみてください"
                      : "システムの利用が開始されるとここにアクティビティが表示されます"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => {
                    const ActionIcon = getActionIcon(activity.action);
                    const severityConfig = SEVERITY_CONFIG[activity.severity];
                    const SeverityIcon = severityConfig.icon;
                    
                    return (
                      <Card key={activity.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* アクションアイコン */}
                            <div className={`p-2 rounded-lg ${
                              activity.severity === 'error' ? 'bg-red-100' :
                              activity.severity === 'warning' ? 'bg-yellow-100' :
                              activity.severity === 'success' ? 'bg-green-100' :
                              'bg-blue-100'
                            }`}>
                              <ActionIcon className={`w-5 h-5 ${
                                activity.severity === 'error' ? 'text-red-600' :
                                activity.severity === 'warning' ? 'text-yellow-600' :
                                activity.severity === 'success' ? 'text-green-600' :
                                'text-blue-600'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                    {activity.description}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-slate-400">
                                      {activity.userName}
                                    </span>
                                    {activity.entityName && (
                                      <>
                                        <span className="text-xs text-gray-400">→</span>
                                        <span className="text-xs text-gray-600 dark:text-slate-300">
                                          {activity.entityName}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge className={`${severityConfig.color} text-xs`}>
                                    <SeverityIcon className="w-3 h-3 mr-1" />
                                    {severityConfig.label}
                                  </Badge>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {getRelativeTime(activity.timestamp)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {activity.timestamp.toLocaleString('ja-JP')}
                                </span>
                                
                                <span className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {getActionLabel(activity.action)}
                                  </Badge>
                                </span>
                                
                                {activity.ipAddress && (
                                  <span className="flex items-center gap-1">
                                    <span>IP: {activity.ipAddress}</span>
                                  </span>
                                )}
                              </div>
                              
                              {/* メタデータ表示 */}
                              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                <div className="mt-3 p-2 bg-gray-50 dark:bg-slate-700 rounded text-xs">
                                  <strong className="text-gray-700 dark:text-slate-300">詳細:</strong>
                                  <div className="mt-1 space-y-1">
                                    {Object.entries(activity.metadata).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-gray-600 dark:text-slate-400">{key}:</span>
                                        <span className="text-gray-800 dark:text-slate-200">
                                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
}