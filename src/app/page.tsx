"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import NotificationPanel, { type NotificationDisplay } from "./components/NotificationPanel";
import { Button } from "@/components/ui/button";
import EnhancedProcessCard from "./components/EnhancedProcessCard";
import { useAuth } from "@/contexts/AuthContext";

// Firebase imports
import { subscribeToProcessesList } from "@/lib/firebase/processes";
import { subscribeToCompanyTasks, subscribeToPersonalTasks } from "@/lib/firebase/tasks";
import { subscribeToNotifications } from "@/lib/firebase/notifications";
import { subscribeToAnnouncements } from "@/lib/firebase/announcements";
import { getTodayEvents, getMonthEvents } from '@/lib/firebase/calendar';
import { createQuickNote } from '@/lib/firebase/notes';

// Types
import type { Process } from "@/app/tasks/types";
import type { CompanyTask, PersonalTask } from "@/lib/firebase/tasks";
import type { Notification } from "@/lib/firebase/notifications";
import type { Announcement } from "@/lib/firebase/announcements";
import type { CalendarEvent } from '@/lib/firebase/calendar';
import {
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  Bell,
  MessageCircle,
  AtSign,
  Zap,
  Target,
  X,
  PlayCircle,
  Home,
  Save,
  Square,
  CheckSquare,
} from "lucide-react";

const MainDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  // Firebase State
  const [processes, setProcesses] = useState<Process[]>([]);
  const [companyTasks, setCompanyTasks] = useState<CompanyTask[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState('');

  // Current user ID from authentication
  const currentUserId = user?.uid || "";


  // (削除済み: seedFirebaseData関数とclearTaskData関数)

  // 現在時刻の更新（1分間隔に変更して負荷軽減）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60秒間隔に変更
    return () => clearInterval(timer);
  }, []);

  // Firebase Data Subscriptions
  useEffect(() => {
    if (!user?.uid) return; // ユーザー認証を待つ

    const unsubscribes: (() => void)[] = [];

    // Subscribe to processes
    const processUnsubscribe = subscribeToProcessesList(
      {
        limit: 10,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      },
      (data) => {
        setProcesses(data);
      }
    );
    unsubscribes.push(processUnsubscribe);

    // Subscribe to company tasks
    const companyTasksUnsubscribe = subscribeToCompanyTasks(
      {
        limit: 10
      },
      (data) => {
        setCompanyTasks(data);
      }
    );
    unsubscribes.push(companyTasksUnsubscribe);

    // Subscribe to personal tasks
    const personalTasksUnsubscribe = subscribeToPersonalTasks(
      {
        userId: currentUserId,
        limit: 10
      },
      (data) => {
        setPersonalTasks(data);
      }
    );
    unsubscribes.push(personalTasksUnsubscribe);

    // Subscribe to notifications
    const notificationsUnsubscribe = subscribeToNotifications(
      {
        recipientId: currentUserId,
        limit: 20
      },
      (data) => {
        setNotifications(data);
      }
    );
    unsubscribes.push(notificationsUnsubscribe);

    // Subscribe to announcements
    const announcementsUnsubscribe = subscribeToAnnouncements(
      {
        isActive: true,
        limit: 10
      },
      (data) => {
        setAnnouncements(data);
      }
    );
    unsubscribes.push(announcementsUnsubscribe);


    // Load calendar events
    const loadCalendarData = async () => {
      // Get today's events
      const { data: todayEvents, error: todayError } = await getTodayEvents();
      if (todayError) {
        console.warn('今日の予定取得エラー:', todayError);
      } else {
        setCalendarEvents(todayEvents);
      }

      // Get current month events for calendar display
      const now = new Date();
      const { data: currentMonthEvents, error: monthError } = await getMonthEvents(
        now.getFullYear(),
        now.getMonth()
      );
      if (monthError) {
        console.warn('今月の予定取得エラー:', monthError);
      } else {
        setMonthEvents(currentMonthEvents);
      }
    };

    loadCalendarData();

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid]);

  // (削除済み: デバッグ用関数Window登録)

  // データ変換関数
  const transformProcessToDisplay = (process: Process) => ({
    id: process.id,
    name: process.projectName || process.orderId || 'Unknown',
    code: process.orderId || process.managementNumber,
    person: process.assignee,
    progress: calculateProgress(process),
    deadline: formatDeadline(process.dueDate),
    status: mapProcessStatus(process.status),
  });

  const calculateProgress = (process: Process): number => {
    // 基本的な進捗計算（既存のWorkDetailsを使用）
    if (!process.workDetails) return 0;

    if (process.workDetails.useDynamicSteps && process.workDetails.customSteps) {
      const completedSteps = process.workDetails.customSteps.filter(step => step.isCompleted).length;
      return Math.round((completedSteps / process.workDetails.customSteps.length) * 100);
    }

    // 従来の固定ステップでの計算
    const total = process.workDetails.setup + process.workDetails.machining + process.workDetails.finishing;
    const actual = process.workDetails.totalActualHours;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((actual / total) * 100));
  };

  const formatDeadline = (dueDate?: string): string => {
    if (!dueDate) return "--:--";
    const date = new Date(dueDate);
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const mapProcessStatus = (status: string): string => {
    switch (status) {
      case 'completed': return 'completed';
      case 'processing': return 'progress';
      case 'data-work': return 'progress';
      case 'finishing': return 'progress';
      case 'planning': return 'pending';
      case 'delayed': return 'almost';
      default: return 'pending';
    }
  };

  // Helper function - defined first
  const mapTaskStatus = (status: string): 'completed' | 'progress' | 'pending' => {
    switch (status) {
      case 'completed': return 'completed';
      case 'progress':
      case 'inProgress': return 'progress';
      case 'pending':
      case 'cancelled':
      default: return 'pending';
    }
  };

  // Helper functions - 関数を先に定義
  const mapNotificationType = (type: string): 'mention' | 'chat' | 'system' => {
    switch (type) {
      case 'mention': return 'mention';
      case 'chat': return 'chat';
      case 'system':
      case 'alert':
      case 'reminder':
      case 'task':
      case 'process':
      default:
        return 'system';
    }
  };

  // Firebase から取得した今日の予定データ
  const todaySchedule = calendarEvents.map(event => ({
    id: event.id,
    time: event.startTime,
    endTime: event.endTime,
    title: event.title,
    location: event.location || '',
    color: event.color,
  }));


  // 全体連絡データの変換
  const displayAnnouncements = announcements.map(announcement => ({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    priority: announcement.priority === 'urgent' ? 'high' : announcement.priority,
  }));

  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp || !timestamp.seconds) return "--";

    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return `${diffDays}日前`;
  };

  // 通知データの変換
  const displayNotifications: NotificationDisplay[] = notifications.map((notification, index) => ({
    id: parseInt(notification.id) || index + 1,
    type: mapNotificationType(notification.type),
    user: notification.senderName || "システム",
    message: notification.message,
    time: formatRelativeTime(notification.createdAt),
    unread: !notification.isRead,
    originalId: notification.id, // Firebase IDを保持
  }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckSquare className="w-4 h-4 text-green-600" />;
      case "progress":
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <Square className="w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />;
      default:
        return <Square className="w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />;
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "mention":
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case "chat":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "system":
        return <Zap className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };


  // 現在時刻から次の予定を判定
  const getNextSchedule = () => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    for (const schedule of todaySchedule) {
      const [hour, minute] = schedule.time.split(":").map(Number);
      const scheduleTime = hour * 60 + minute;
      if (scheduleTime > now) {
        return schedule;
      }
    }
    return null;
  };

  const nextSchedule = getNextSchedule();

  // カレンダー用の日付計算
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  // カレンダーの予定がある日（Firebase から取得）
  const scheduledDays = Array.from(
    new Set(
      monthEvents.map(event => {
        const eventDate = new Date(event.date);
        return eventDate.getDate();
      })
    )
  );

  // 表示用データの変換
  const displayProcesses = processes.map(transformProcessToDisplay);

  // タスクデータの変換
  const allTasks = companyTasks.map(task => ({
    id: task.id,
    title: task.title,
    person: task.assignee,
    status: mapTaskStatus(task.status),
  }));

  const displayPersonalTasks = personalTasks.map(task => ({
    id: task.id,
    title: task.title,
    status: mapTaskStatus(task.status),
  }));

  const unreadCount = displayNotifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* サイドバーの幅を考慮してメインコンテンツを配置 */}
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* 上部ヘッダー - 現代的なデザイン */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左側 - ブランドとナビゲーション */}
            <div className="flex items-center space-x-4">
              <Home className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unica Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">製造管理システム</p>
              </div>
            </div>

            {/* 右側 - 通知とアクション */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2"
                >
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 p-0 flex items-center justify-center text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/40 dark:to-slate-700/40 custom-scrollbar">
          {/* エレガントな統計バー */}
          <div className="px-6 pt-6 pb-4">
            <div className="grid grid-cols-4 gap-6">
              {/* 受注管理 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-blue-200/30 dark:border-blue-700/30"
                   onClick={() => router.push('/orders')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-2">受注</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{displayProcesses.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 dark:bg-blue-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              {/* 進行中タスク */}
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-green-200/30 dark:border-green-700/30"
                   onClick={() => router.push('/work-hours')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-2">工数</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                      {[...allTasks, ...displayPersonalTasks].filter(t => t.status === 'progress').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 dark:bg-green-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <PlayCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              {/* 未読通知 */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-800/30 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-orange-200/30 dark:border-orange-700/30"
                   onClick={() => router.push('/notifications')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600 mb-2">未読</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{unreadCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500/20 dark:bg-orange-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>

              {/* 日報管理 */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-purple-200/30 dark:border-purple-700/30"
                   onClick={() => router.push('/daily-reports')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 mb-2">日報</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{todaySchedule.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 dark:bg-purple-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メインレイアウト: 左サイド - センター - 右サイド */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-12 gap-6 min-h-[600px]">
              {/* 左サイド - タスク管理 */}
              <div className="col-span-3 space-y-6">
                {/* タスク管理セクション */}
                <div className="bg-white/70 dark:bg-slate-800/90 rounded-lg p-5 backdrop-blur-sm shadow-sm dark:shadow-slate-900/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                      タスク管理
                    </h3>
                    <button
                      onClick={() => router.push('/task')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                      <Target className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">個人タスク</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {displayPersonalTasks.filter(t => t.status === 'completed').length}/{displayPersonalTasks.length}
                      </p>
                    </div>
                    {displayPersonalTasks.length > 0 ? (
                      displayPersonalTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center p-4 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/30 dark:border-slate-600 hover:border-white/50 dark:hover:border-slate-500 interactive-scale"
                          onClick={() => router.push('/task?tab=personal')}
                        >
                          <div className="w-6 h-6 mr-4 flex-shrink-0">
                            {getStatusIcon(task.status)}
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{task.title}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm bg-white/40 dark:bg-slate-700/40 rounded-2xl border border-white/30 dark:border-slate-600">
                        個人タスクなし ({personalTasks.length})
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">全体タスク</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {allTasks.filter(t => t.status === 'completed').length}/{allTasks.length}
                      </p>
                    </div>
                    {allTasks.length > 0 ? (
                      allTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center p-4 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/30 dark:border-slate-600 hover:border-white/50 dark:hover:border-slate-500 interactive-scale"
                          onClick={() => router.push('/task?tab=company')}
                        >
                          <div className="w-6 h-6 mr-4 flex-shrink-0">
                            {getStatusIcon(task.status)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{task.title}</div>
                            {task.person && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">担当: {task.person}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm bg-white/40 dark:bg-slate-700/40 rounded-2xl border border-white/30 dark:border-slate-600">
                        全体タスクなし ({companyTasks.length})
                      </div>
                    )}
                  </div>
                </div>

                {/* 通知 */}
                <div className="bg-white/70 dark:bg-slate-800/90 rounded-lg p-5 backdrop-blur-sm shadow-sm dark:shadow-slate-900/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                      <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
                      通知
                    </h3>
                    <button
                      onClick={() => router.push('/notifications')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {displayNotifications.slice(0, 3).map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start p-4 hover:bg-white/60 dark:hover:bg-gray-800 rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/30 dark:border-gray-700 hover:border-white/50 dark:border-gray-600 interactive-scale"
                        onClick={() => router.push('/notifications')}
                      >
                        <div className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{notification.message}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {notification.user} • {notification.time}
                          </div>
                        </div>
                        {notification.unread && (
                          <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex-shrink-0 mt-2 pulse-glow"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* センターメイン - 工程管理 */}
              <div className="col-span-6">
                {/* 背景画像付き時刻エリア - おしゃれなデザイン */}
                <div
                  className="relative h-52 rounded-3xl mb-8 overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center shadow-xl"
                  style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/50 to-indigo-900/60 backdrop-blur-[1px]"></div>
                  <div className="relative text-center text-white z-10">
                    <div className="text-6xl font-extralight mb-3 tracking-wider drop-shadow-2xl">
                      {currentTime.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-2xl opacity-95 mb-4 font-light">
                      {currentTime.toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      })}
                    </div>
                    {nextSchedule && (
                      <div className="mt-6 inline-flex items-center text-sm bg-white/25 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
                        <Clock className="w-4 h-4 mr-2" />
                        次: {nextSchedule.time} {nextSchedule.title}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>


                {/* 工程カードリスト */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">本日の工程</h2>
                    <button
                      onClick={() => router.push('/tasks')}
                      className="text-sm bg-blue-500/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30 dark:hover:bg-blue-400/30 px-4 py-2 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-blue-200/50 dark:border-blue-600/50 hover:border-blue-300/50 dark:hover:border-blue-500/50"
                    >
                      詳細管理
                    </button>
                  </div>

                  {processes.length > 0 ? (
                    <>
                      {processes.slice(0, 3).map((process) => (
                        <EnhancedProcessCard
                          key={process.id}
                          process={process}
                          onStatusUpdate={async (processId, newStatus) => {
                            // Handle status update - you might want to call a Firebase update function here
                            // Example: await updateProcessStatus(processId, newStatus);
                          }}
                          onViewDetails={(processId) => {
                            router.push(`/tasks?processId=${processId}`);
                          }}
                          onEdit={(processId) => {
                            router.push(`/tasks?edit=${processId}`);
                          }}
                        />
                      ))}

                      {processes.length > 3 && (
                        <button
                          onClick={() => router.push('/tasks')}
                          className="w-full mt-6 py-4 px-6 text-sm font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-300 backdrop-blur-sm interactive-scale"
                        >
                          他 {processes.length - 3} 件の工程を表示 →
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 modern-shadow-lg border border-gray-200/50 dark:border-slate-600/50">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center floating-animation">
                          <Clock className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                        </div>
                        <p className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300">工程データを読み込み中...</p>
                        <p className="text-sm mb-2">現在のデータ件数: {processes.length}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Firebase接続状態を確認してください</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 右サイド - カレンダー・予定・全体連絡 */}
              <div className="col-span-3 space-y-6">
                {/* カレンダー */}
                <div className="bg-white/70 dark:bg-slate-800/90 rounded-lg p-5 backdrop-blur-sm shadow-sm dark:shadow-slate-900/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                      {monthNames[today.getMonth()]} {today.getFullYear()}
                    </h3>
                    <button
                      onClick={() => router.push('/calendar')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                      <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {[...Array(startingDayOfWeek)].map((_, i) => (
                      <div key={`empty-${i}`} className="h-10"></div>
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const isToday = day === today.getDate();
                      const hasSchedule = scheduledDays.includes(day);
                      return (
                        <div
                          key={day}
                          className={`h-10 flex items-center justify-center text-sm rounded-xl cursor-pointer transition-all duration-200 font-medium interactive-scale ${
                            isToday
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                              : hasSchedule
                              ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 hover:from-blue-200 hover:to-blue-300 shadow-sm"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600/50 hover:shadow-sm"
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>


                {/* 全体連絡 */}
                <div className="bg-white/70 dark:bg-slate-800/90 rounded-lg p-5 backdrop-blur-sm shadow-sm dark:shadow-slate-900/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                      <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                      全体連絡
                    </h3>
                    <button
                      onClick={() => router.push('/announcements')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                      <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {displayAnnouncements.length > 0 ? (
                      displayAnnouncements.slice(0, 3).map((announcement) => {
                        const priorityGradient = announcement.priority === 'high' ? 'from-red-500 to-red-600' :
                                             announcement.priority === 'medium' ? 'from-orange-500 to-orange-600' :
                                             'from-blue-500 to-blue-600';
                        const priorityBg = announcement.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20' :
                                             announcement.priority === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20' :
                                             'bg-blue-50 dark:bg-blue-900/20';
                        return (
                          <div
                            key={announcement.id}
                            className={`relative ${priorityBg} hover:scale-[1.02] p-4 transition-all duration-300 cursor-pointer rounded-2xl border border-gray-200/50 dark:border-slate-600/50 modern-shadow overflow-hidden group`}
                            onClick={() => {
                              router.push('/announcements');
                            }}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${priorityGradient} rounded-l-2xl`}></div>
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 pr-2 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                                {announcement.title}
                              </h4>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border-2 ${
                                announcement.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                                announcement.priority === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                                {announcement.priority === 'high' ? '重要' :
                                 announcement.priority === 'medium' ? '通常' : '参考'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2 leading-relaxed">
                              {announcement.content}
                            </p>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {formatRelativeTime((announcements.find(a => a.id === announcement.id) as Announcement)?.createdAt)}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-slate-700/50 rounded-2xl border border-gray-200/50 dark:border-slate-600/50">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                        全体連絡なし ({announcements.length}件)
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* クイックメモモーダル */}
        {showQuickNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">クイックメモ</h3>
                <button
                  onClick={() => {
                    setShowQuickNoteModal(false);
                    setQuickNoteContent('');
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                placeholder="メモを入力してください..."
                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowQuickNoteModal(false);
                    setQuickNoteContent('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={async () => {
                    if (quickNoteContent.trim()) {
                      const result = await createQuickNote({
                        title: '新しいメモ',
                        content: quickNoteContent,
                        userId: currentUserId,
                        userName: 'ユーザー'
                      });
                      setShowQuickNoteModal(false);
                      setQuickNoteContent('');
                    }
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 通知パネル（オーバーレイ） */}
        <NotificationPanel
          notifications={displayNotifications}
          show={showNotifications}
          onClose={() => setShowNotifications(false)}
          onNotificationRead={(id) => {
            // 通知が既読になったときの処理（Firebaseのリアルタイム更新で自動的に反映される）
          }}
        />
      </div>
    </div>
  );
};

export default MainDashboard;
