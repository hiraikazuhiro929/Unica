"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Search,
  Check,
  Trash2,
  AlertTriangle,
  MessageCircle,
  Clock,
  Settings,
  RefreshCw,
} from "lucide-react";

// Firebase imports
import { 
  subscribeToNotifications, 
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteReadNotifications,
  getNotificationStatistics,
  manualCleanupNotifications
} from '@/lib/firebase/notifications';
import type { Notification } from '@/lib/firebase/notifications';

// サンプルデータ用の型定義
type SampleNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: string;
};

// Union型でFirebaseとサンプルデータを統一的に扱う
type DisplayNotification = Notification | SampleNotification;

// 時間フォーマット用のユーティリティ
const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return '不明';
  
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 30) return `${days}日前`;
  return date.toLocaleDateString();
};

// ヘルパー関数
const getNotificationTime = (notification: DisplayNotification): string => {
  if ('time' in notification) {
    return notification.time;
  }
  return formatTimeAgo(notification.createdAt);
};

const isFirebaseNotification = (notification: DisplayNotification): notification is Notification => {
  return 'createdAt' in notification;
};

const NotificationManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [activeTab, setActiveTab] = useState<"inbox" | "mentions" | "alerts" | "system">("inbox");
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "details" | "history">("overview");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [priorityFilters, setPriorityFilters] = useState<{
    urgent: boolean;
    high: boolean;
    normal: boolean;
  }>({ urgent: true, high: true, normal: true });
  
  // デフォルトユーザーID（実際のアプリでは認証から取得）
  const currentUserId = 'user-123'; // TODO: Get from auth context

  // Firebaseからリアルタイム通知を取得
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      { recipientId: currentUserId, limit: 100 },
      (data) => {
        setNotifications(data);
        setLoading(false);
      }
    );

    // 統計データも取得
    getNotificationStatistics(currentUserId).then(({ data }) => {
      setStatistics(data);
    });

    return unsubscribe;
  }, [currentUserId]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // 統計データを再取得
      const { data } = await getNotificationStatistics(currentUserId);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // サンプルデータは削除済み - Firebaseデータのみ使用
  
  // Firebaseから取得した通知データのみ使用
  const displayNotifications: DisplayNotification[] = notifications;

  const tabs = [
    { 
      id: "inbox", 
      label: "受信箱", 
      count: displayNotifications.filter(n => !n.isRead).length,
      subItems: [
        { id: "today", label: "今日", count: displayNotifications.filter(n => !n.isRead && getNotificationTime(n).includes("分前")).length },
        { id: "urgent", label: "緊急", count: displayNotifications.filter(n => n.priority === "urgent").length },
      ]
    },
    { 
      id: "mentions", 
      label: "メンション", 
      count: displayNotifications.filter(n => n.type === "mention" && !n.isRead).length,
      subItems: [
        { id: "unread", label: "未読", count: displayNotifications.filter(n => n.type === "mention" && !n.isRead).length },
        { id: "all", label: "すべて", count: displayNotifications.filter(n => n.type === "mention").length },
      ]
    },
    { 
      id: "alerts", 
      label: "アラート", 
      count: displayNotifications.filter(n => n.type === "alert" && !n.isRead).length,
      subItems: [
        { id: "equipment", label: "設備", count: displayNotifications.filter(n => n.type === "alert").length },
        { id: "inventory", label: "在庫", count: displayNotifications.filter(n => n.type === "system" && n.title.includes("在庫")).length },
      ]
    },
    { 
      id: "system", 
      label: "システム", 
      count: displayNotifications.filter(n => (n.type === "system" || n.type === "reminder") && !n.isRead).length,
      subItems: [
        { id: "maintenance", label: "メンテ", count: displayNotifications.filter(n => n.title.includes("メンテ")).length },
        { id: "reminders", label: "リマインダー", count: displayNotifications.filter(n => n.type === "reminder").length },
      ]
    },
    { 
      id: "chat", 
      label: "チャット", 
      count: displayNotifications.filter(n => n.type === "chat" && !n.isRead).length,
    },
    { 
      id: "task", 
      label: "タスク", 
      count: displayNotifications.filter(n => n.type === "task" && !n.isRead).length,
    },
    { 
      id: "process", 
      label: "工程", 
      count: displayNotifications.filter(n => n.type === "process" && !n.isRead).length,
    }
  ];

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case "alert": return <AlertTriangle className="w-4 h-4" />;
      case "mention": return <MessageCircle className="w-4 h-4" />;
      case "reminder": return <Clock className="w-4 h-4" />;
      case "chat": return <MessageCircle className="w-4 h-4" />;
      case "task": return <Check className="w-4 h-4" />;
      case "process": return <Settings className="w-4 h-4" />;
      case "system":
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
      case "high": return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30";
      default: return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30";
    }
  };

  // 通知操作ハンドラー
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // リアルタイム更新なので手動更新は不要
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(currentUserId);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteReadNotifications = async () => {
    try {
      await deleteReadNotifications(currentUserId);
    } catch (error) {
      console.error('Failed to delete read notifications:', error);
    }
  };

  const handleCleanupOldNotifications = async () => {
    try {
      setLoading(true);
      const { error, deletedCount } = await manualCleanupNotifications(currentUserId, {
        retentionLimit: 50, // 50件まで保持
        deleteOnlyRead: true,
        olderThanDays: 30 // 30日より古い既読通知を削除
      });
      
      if (error) {
        console.error('Failed to cleanup old notifications:', error);
        alert('古い通知の削除に失敗しました');
      } else {
        alert(`${deletedCount}件の古い通知を削除しました`);
      }
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      alert('古い通知の削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = displayNotifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "unread" && !notification.isRead);
    const matchesTab = activeTab === "inbox" ? !notification.isRead :
                      activeTab === "mentions" ? notification.type === "mention" :
                      activeTab === "alerts" ? notification.type === "alert" :
                      activeTab === "system" ? (notification.type === "system" || notification.type === "reminder") :
                      activeTab === "chat" ? notification.type === "chat" :
                      activeTab === "task" ? notification.type === "task" :
                      activeTab === "process" ? notification.type === "process" :
                      true;
    const matchesPriority = priorityFilters[notification.priority as keyof typeof priorityFilters];
    return matchesSearch && matchesFilter && matchesTab && matchesPriority;
  });

  const unreadCount = displayNotifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* サイドバーの幅を考慮してメインコンテンツを配置 */}
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* 上部ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">通知管理</h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : 'すべての通知が確認済みです'}
                </p>
              </div>
            </div>
            
            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="通知を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-96 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-600 dark:text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>読み込み中...</span>
                </div>
              </div>
            )}
            <div className="flex gap-6 h-full">
              {/* 左側 - タブナビゲーション */}
              <div className="w-48 flex-shrink-0">
                <div className="py-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">通知カテゴリ</h3>
                  <div className="space-y-1">
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <div key={tab.id}>
                          <button
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center justify-between p-3 transition-all duration-200 text-left border-l-2 ${
                              isActive
                                ? "bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-500 dark:border-indigo-400"
                                : "text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-slate-700/50 border-transparent"
                            }`}
                          >
                            <span className={`text-sm font-medium ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-slate-300"}`}>
                              {tab.label}
                            </span>
                            {tab.count > 0 && (
                              <span className={`px-2 py-0.5 text-xs font-semibold ${
                                isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-slate-400"
                              }`}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                          {/* サブ項目 */}
                          {isActive && tab.subItems && (
                            <div className="ml-6 mt-1 space-y-1">
                              {tab.subItems.map((subItem) => (
                                <button
                                  key={subItem.id}
                                  className="w-full flex items-center justify-between p-2 text-left hover:bg-indigo-50/50 dark:hover:bg-slate-700 transition-colors">
                                >
                                  <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                                    {subItem.label}
                                  </span>
                                  {subItem.count > 0 && (
                                    <span className="text-xs text-indigo-500/70 dark:text-indigo-400/70">
                                      {subItem.count}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 中央 - 通知リスト */}
              <div className="flex-1">
                {/* リスト制御バー */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={filter === "unread" ? "default" : "ghost"}
                      onClick={() => setFilter(filter === "unread" ? "all" : "unread")}
                      size="sm"
                      className={`h-7 text-xs ${filter === "unread" ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white" : "text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"}`}
                    >
                      {filter === "unread" ? "全て" : "未読のみ"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {filteredNotifications.length}件
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleRefresh}
                      size="sm"
                      disabled={loading}
                      className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id}>
                      <div
                        onClick={() => setSelectedNotification(selectedNotification === notification.id ? null : notification.id)}
                        className={`p-4 border-l-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-all cursor-pointer ${
                          notification.isRead 
                            ? "border-l-gray-200 dark:border-l-slate-600 bg-white/50 dark:bg-slate-800/50" 
                            : "border-l-indigo-400 dark:border-l-indigo-500 bg-white dark:bg-slate-800"
                        } ${selectedNotification === notification.id ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)} flex-shrink-0`}>
                              {getIcon(notification.type as Notification['type'])}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-base font-semibold ${
                                  notification.isRead ? "text-gray-700 dark:text-slate-300" : "text-gray-900 dark:text-white"
                                }`}>
                                  {notification.title}
                                </h3>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                )}
                              </div>
                              <p className={`text-sm mb-2 leading-relaxed ${
                                notification.isRead ? "text-gray-600 dark:text-slate-400" : "text-gray-700 dark:text-slate-300"
                              }`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                                <span>{getNotificationTime(notification)}</span>
                                <span className="w-1 h-1 bg-gray-300 dark:bg-slate-600 rounded-full"></span>
                                <span>{notification.type === 'alert' ? 'アラート' :
                                       notification.type === 'mention' ? 'メンション' :
                                       notification.type === 'system' ? 'システム' : 
                                       notification.type === 'chat' ? 'チャット' :
                                       notification.type === 'task' ? 'タスク' :
                                       notification.type === 'process' ? '工程' : 'リマインダー'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <button 
                              onClick={(e) => {e.stopPropagation(); handleMarkAsRead(notification.id)}}
                              className={`p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors ${
                                notification.isRead 
                                  ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' 
                                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
                              }`}
                              title={notification.isRead ? '既読' : '既読にする'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {e.stopPropagation(); handleDeleteNotification(notification.id)}}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-red-600 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 展開された詳細エリア */}
                      {selectedNotification === notification.id && (
                        <div className="border-l-4 border-l-indigo-200 dark:border-l-indigo-700 bg-gray-50/30 dark:bg-slate-800/30 px-4 py-3">
                          {/* 詳細タブ */}
                          <div className="flex gap-4 mb-4 border-b border-gray-200 dark:border-slate-700">
                            {[
                              { id: "overview", label: "概要" },
                              { id: "details", label: "詳細" },
                              { id: "history", label: "履歴" }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setDetailTab(tab.id as any)}
                                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                  detailTab === tab.id
                                    ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400"
                                    : "text-gray-500 dark:text-slate-400 border-transparent hover:text-gray-700 dark:hover:text-slate-300"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* タブコンテンツ */}
                          <div className="text-sm">
                            {detailTab === "overview" && (
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">優先度</div>
                                  <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                    notification.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                    notification.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {notification.priority === 'urgent' ? '緊急' :
                                     notification.priority === 'high' ? '重要' : '通常'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">送信者</div>
                                  <div className="text-gray-700 dark:text-slate-300 font-medium">
                                    {notification.type === 'system' ? 'システム' :
                                     notification.type === 'alert' ? '設備監視' :
                                     notification.type === 'mention' ? '田中部長' : '自動通知'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">受信時刻</div>
                                  <div className="text-gray-700 dark:text-slate-300 font-medium">14:23</div>
                                </div>
                              </div>
                            )}
                            {detailTab === "details" && (
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">完全なメッセージ</div>
                                  <div className="text-gray-700 dark:text-slate-300">{notification.message}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">関連する場所</div>
                                  <div className="text-gray-700 dark:text-slate-300">第1工場 - A棟 - 製造ライン3</div>
                                </div>
                              </div>
                            )}
                            {detailTab === "history" && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  <span>14:23 - 通知送信</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                  <Bell className="w-3 h-3" />
                                  <span>14:25 - 閲覧</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-16">
                      <Bell className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {activeTab === "inbox" ? "未読通知がありません" :
                         activeTab === "mentions" ? "メンション通知がありません" :
                         activeTab === "alerts" ? "アラート通知がありません" :
                         "システム通知がありません"}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-300">
                        {searchQuery ? "検索条件に一致する通知がありません" : 
                         activeTab === "inbox" ? "すべての通知を確認済みです" :
                         "この種類の通知はありません"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 右側 - 統計とクイック操作 */}
              <div className="w-80 flex-shrink-0 space-y-8">
                {/* 通知統計 */}
                <div className="py-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">通知統計</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2 py-1">
                      <span className="text-sm text-gray-600 dark:text-slate-300">総通知数</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{statistics?.total || displayNotifications.length}</span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-1">
                      <span className="text-sm text-gray-600 dark:text-slate-300">未読通知</span>
                      <span className="text-lg font-semibold text-red-600">{statistics?.unread || unreadCount}</span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-1">
                      <span className="text-sm text-gray-600 dark:text-slate-300">既読通知</span>
                      <span className="text-lg font-semibold text-green-600">{(statistics?.total || displayNotifications.length) - (statistics?.unread || unreadCount)}</span>
                    </div>
                    <div className="px-2 py-2">
                      <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full">
                        <div 
                          className="h-1.5 bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${((statistics?.total || displayNotifications.length) - (statistics?.unread || unreadCount)) / (statistics?.total || displayNotifications.length) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-2">
                        {Math.round(((statistics?.total || displayNotifications.length) - (statistics?.unread || unreadCount)) / (statistics?.total || displayNotifications.length) * 100)}% 確認済み
                      </p>
                    </div>
                  </div>
                </div>

                {/* 通知タイプ別統計 */}
                <div className="py-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">タイプ別統計</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm text-gray-700 dark:text-slate-300">設備異常</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {statistics?.byType?.alert || displayNotifications.filter(n => n.type === "alert").length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-gray-700 dark:text-slate-300">メンション</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {statistics?.byType?.mention || displayNotifications.filter(n => n.type === "mention").length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-gray-700 dark:text-slate-300">システム</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {statistics?.byType?.system || displayNotifications.filter(n => n.type === "system").length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm text-gray-700 dark:text-slate-300">リマインダー</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {statistics?.byType?.reminder || displayNotifications.filter(n => n.type === "reminder").length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* クイック操作 */}
                <div className="py-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">クイック操作</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      すべて既読にする
                    </button>
                    <button 
                      onClick={handleDeleteReadNotifications}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-red-700 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      既読通知を削除
                    </button>
                    <button 
                      onClick={handleCleanupOldNotifications}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      古い通知を整理
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <Settings className="w-4 h-4" />
                      通知設定
                    </button>
                  </div>
                </div>

                {/* 優先度フィルター */}
                <div className="py-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">優先度フィルター</h3>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 w-4 h-4" 
                          checked={priorityFilters.urgent}
                          onChange={(e) => setPriorityFilters(prev => ({ ...prev, urgent: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700 dark:text-slate-300">緊急</span>
                      </div>
                      <span className="text-xs text-red-600 font-semibold">
                        {statistics?.byPriority?.urgent || displayNotifications.filter(n => n.priority === "urgent").length}
                      </span>
                    </label>
                    <label className="flex items-center justify-between px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 w-4 h-4" 
                          checked={priorityFilters.high}
                          onChange={(e) => setPriorityFilters(prev => ({ ...prev, high: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700 dark:text-slate-300">高</span>
                      </div>
                      <span className="text-xs text-orange-600 font-semibold">
                        {statistics?.byPriority?.high || displayNotifications.filter(n => n.priority === "high").length}
                      </span>
                    </label>
                    <label className="flex items-center justify-between px-2 py-2 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 w-4 h-4" 
                          checked={priorityFilters.normal}
                          onChange={(e) => setPriorityFilters(prev => ({ ...prev, normal: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700 dark:text-slate-300">通常</span>
                      </div>
                      <span className="text-xs text-blue-600 font-semibold">
                        {statistics?.byPriority?.normal || displayNotifications.filter(n => n.priority === "normal").length}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManagement;