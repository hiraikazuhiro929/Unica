"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NotificationPanel from "./components/NotificationPanel";
import MiniCalendar from "./components/MiniCalendar";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  Calendar,
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  MessageCircle,
  AtSign,
  Users,
  Zap,
  Activity,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  X,
  PlayCircle,
  Pause,
  ArrowRight,
  Home,
  RefreshCw,
  Eye,
} from "lucide-react";

const MainDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState({
    isConnected: true,
    lastSync: new Date(Date.now() - 300000), // 5分前
    provider: 'google' as const
  });
  const [announcementSyncStatus, setAnnouncementSyncStatus] = useState({
    isConnected: true,
    lastSync: new Date(Date.now() - 180000), // 3分前
    newCount: 2
  });
  const [taskSyncStatus, setTaskSyncStatus] = useState({
    isConnected: true,
    lastSync: new Date(Date.now() - 120000), // 2分前
    pendingUpdates: 1
  });

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // サンプルデータ
  const processes = [
    {
      id: 1,
      name: "製品A",
      code: "M-001",
      person: "田中",
      progress: 75,
      deadline: "16:00",
      status: "progress",
    },
    {
      id: 2,
      name: "製品B",
      code: "M-002",
      person: "佐藤",
      progress: 40,
      deadline: "18:00",
      status: "progress",
    },
    {
      id: 3,
      name: "製品C",
      code: "M-003",
      person: "鈴木",
      progress: 90,
      deadline: "15:00",
      status: "almost",
    },
  ];

  const allTasks = [
    { id: 1, title: "手順書作成", status: "completed", type: "company" },
    {
      id: 2,
      title: "ファイル整理",
      status: "progress",
      type: "company",
      person: "田中",
    },
    { id: 3, title: "新人研修資料", status: "pending", type: "company" },
  ];

  const personalTasks = [
    { id: 1, title: "資料準備", status: "pending" },
    { id: 2, title: "メール返信", status: "progress" },
  ];

  // 今日の予定データ（カレンダーと連動）
  const todaySchedule = [
    {
      id: 1,
      time: "09:00",
      endTime: "10:00",
      title: "朝礼",
      location: "会議室A",
      color: "bg-blue-500",
    },
    {
      id: 2,
      time: "10:30",
      endTime: "11:30",
      title: "品質管理MTG",
      location: "オンライン",
      color: "bg-green-500",
    },
    {
      id: 3,
      time: "14:00",
      endTime: "14:30",
      title: "設備点検",
      location: "第1工場",
      color: "bg-orange-500",
    },
    {
      id: 4,
      time: "16:30",
      endTime: "17:30",
      title: "定例会議",
      location: "会議室B",
      color: "bg-purple-500",
    },
  ];

  // 通知データ（チャット・メンション中心）
  const notifications = [
    {
      id: 1,
      type: "mention" as const,
      user: "山田",
      message: "レビューお願いします",
      time: "2分前",
      unread: true,
    },
    {
      id: 2,
      type: "chat" as const,
      user: "鈴木",
      message: "了解しました",
      time: "5分前",
      unread: true,
    },
    {
      id: 3,
      type: "system" as const,
      user: "システム",
      message: "工程Aが完了",
      time: "10分前",
      unread: false,
    },
    {
      id: 4,
      type: "mention" as const,
      user: "佐藤",
      message: "確認してください",
      time: "15分前",
      unread: false,
    },
  ];

  const announcements = [
    {
      id: 1,
      title: "来週の設備点検について",
      content: "来週月曜日から水曜日にかけて、第1工場の設備点検を実施します。",
      priority: "high",
    },
    {
      id: 2,
      title: "新しい安全規則の徹底",
      content: "労働安全衛生法の改正に伴い、新しい安全規則を導入します。",
      priority: "medium",
    },
    {
      id: 3,
      title: "7月の納期スケジュール確認",
      content:
        "7月の納期スケジュールが確定しました。各担当者は確認をお願いします。",
      priority: "normal",
    },
    {
      id: 4,
      title: "夏季休暇の調整",
      content: "夏季休暇の希望調査を開始します。今月末までに提出してください。",
      priority: "normal",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case "progress":
        return <Clock className="w-3 h-3 text-blue-600" />;
      case "pending":
        return <FileText className="w-3 h-3 text-gray-500" />;
      default:
        return <FileText className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
            完了
          </span>
        );
      case "progress":
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            進行中
          </span>
        );
      case "pending":
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            未着手
          </span>
        );
      case "almost":
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            完了間近
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            未着手
          </span>
        );
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
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-300 bg-red-50";
      case "medium":
        return "border-yellow-300 bg-yellow-50";
      default:
        return "border-blue-300 bg-blue-50";
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
  const monthSchedule = [
    { day: 3, schedules: [{ color: "bg-blue-500", title: "会議" }] },
    {
      day: 5,
      schedules: [
        { color: "bg-green-500", title: "作業" },
        { color: "bg-red-500", title: "締切" },
      ],
    },
    // …必要な分だけ追加
  ];

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

  // カレンダーの予定がある日（サンプル）
  const scheduledDays = [10, 15, 18, 25]; // 今月の予定がある日

  const unreadCount = notifications.filter((n) => n.unread).length;

  // カレンダー同期処理
  const handleCalendarSync = async () => {
    try {
      // 実際の同期処理をここに実装
      console.log('カレンダーを同期中...');
      
      // シミュレーション: 外部カレンダーから予定を取得
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 同期状態を更新
      setCalendarSyncStatus(prev => ({
        ...prev,
        lastSync: new Date()
      }));
      
      console.log('カレンダー同期完了');
    } catch (error) {
      console.error('カレンダー同期エラー:', error);
    }
  };

  // 全体連絡同期処理
  const handleAnnouncementSync = async () => {
    try {
      console.log('全体連絡を同期中...');
      
      // シミュレーション: 外部システムから連絡事項を取得
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 同期状態を更新
      setAnnouncementSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        newCount: 0 // 新着をリセット
      }));
      
      console.log('全体連絡同期完了');
    } catch (error) {
      console.error('全体連絡同期エラー:', error);
    }
  };

  // タスク同期処理
  const handleTaskSync = async () => {
    try {
      console.log('タスクを同期中...');
      
      // シミュレーション: 外部システムとタスクを同期
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // 同期状態を更新
      setTaskSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        pendingUpdates: 0 // 保留中の更新をリセット
      }));
      
      console.log('タスク同期完了');
    } catch (error) {
      console.error('タスク同期エラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* サイドバーの幅を考慮してメインコンテンツを配置 */}
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* 上部ヘッダー - 現代的なデザイン */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左側 - ブランドとナビゲーション */}
            <div className="flex items-center space-x-4">
              <Home className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
                <p className="text-sm text-gray-600">製造管理システム</p>
              </div>
            </div>

            {/* 中央 - 時計と次の予定 */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 tracking-wider">
                  {currentTime.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {currentTime.toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })}
                </div>
              </div>
              {nextSchedule && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-600 font-medium mb-1">次の予定</p>
                  <p className="text-sm text-blue-900 font-semibold">
                    {nextSchedule.time} {nextSchedule.title}
                  </p>
                  <p className="text-xs text-blue-600">{nextSchedule.location}</p>
                </div>
              )}
            </div>

            {/* 右側 - 通知とアクション */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規追加
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
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
        <div className="flex-1 p-6 overflow-auto bg-gray-50">
          {/* 上部統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* 今日の工程 */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">今日の工程</p>
                    <p className="text-2xl font-bold text-gray-900">{processes.length}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  完了率 {Math.round(processes.reduce((sum, p) => sum + p.progress, 0) / processes.length)}%
                </div>
              </CardContent>
            </Card>

            {/* 進行中タスク */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">進行中</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {[...allTasks, ...personalTasks].filter(t => t.status === 'progress').length}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PlayCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  タスク管理
                </div>
              </CardContent>
            </Card>

            {/* 未読通知 */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">未読通知</p>
                    <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Bell className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  新着メッセージ
                </div>
              </CardContent>
            </Card>

            {/* 今日の予定 */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">今日の予定</p>
                    <p className="text-2xl font-bold text-gray-900">{todaySchedule.length}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  スケジュール管理
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-12 gap-6 min-h-[600px]">
            {/* 左側 - 工程・タスク管理 (8列) */}
            <div className="col-span-8">
              <Card className="bg-white border-0 shadow-sm h-full overflow-hidden">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-600" />
                      本日の工程・タスク
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {taskSyncStatus.pendingUpdates > 0 && (
                        <Badge className="bg-orange-500 text-white text-xs">
                          {taskSyncStatus.pendingUpdates}件更新保留中
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTaskSync}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="w-3 h-3 text-gray-600" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        新規追加
                      </Button>
                    </div>
                  </div>
                  
                  {/* 同期状態表示 */}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>
                      最終同期: {taskSyncStatus.lastSync ? 
                        taskSyncStatus.lastSync.toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : '未同期'
                      }
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        taskSyncStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span>
                        {taskSyncStatus.isConnected ? '接続中' : '未接続'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 py-4 overflow-y-auto h-[calc(100%-5rem)]">
                  <div className="space-y-6">
                    {/* 工程セクション */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center">
                          <Target className="w-4 h-4 mr-2 text-blue-600" />
                          工程管理
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {processes.length}件
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {processes.map((process) => (
                          <div
                            key={process.id}
                            className="group p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Target className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{process.name}</h4>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <span>{process.code}</span>
                                    <span>•</span>
                                    <span>{process.person}</span>
                                    <span>•</span>
                                    <span>締切: {process.deadline}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(process.status)}
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    process.progress >= 80
                                      ? "bg-green-500"
                                      : process.progress >= 50
                                      ? "bg-blue-500"
                                      : "bg-yellow-500"
                                  }`}
                                  style={{ width: `${process.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">
                                {process.progress}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 全体タスクセクション */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center">
                          <Users className="w-4 h-4 mr-2 text-green-600" />
                          全体タスク
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {allTasks.length}件
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {allTasks.map((task) => (
                          <div
                            key={task.id}
                            className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                {getStatusIcon(task.status)}
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">
                                  {task.title}
                                </span>
                                {task.person && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    担当: {task.person}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(task.status)}
                              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 個人タスクセクション */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center">
                          <Activity className="w-4 h-4 mr-2 text-purple-600" />
                          個人タスク
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {personalTasks.length}件
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {personalTasks.map((task) => (
                          <div
                            key={task.id}
                            className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                {getStatusIcon(task.status)}
                              </div>
                              <span className="font-medium text-gray-900">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(task.status)}
                              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右側 - カレンダーと情報 (4列) */}
            <div className="col-span-4 space-y-6">
              {/* カレンダー + 本日の予定 */}
              <Card className="bg-white border-0 shadow-sm h-[420px] overflow-hidden">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    カレンダー & 予定
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 py-4 h-[calc(100%-5rem)]">
                  <MiniCalendar
                    scheduledDays={scheduledDays}
                    todaySchedule={todaySchedule}
                    currentTime={currentTime}
                    monthSchedule={monthSchedule}
                    onSync={handleCalendarSync}
                    syncStatus={calendarSyncStatus}
                  />
                </CardContent>
              </Card>

              {/* 全体連絡 */}
              <Card className="bg-white border-0 shadow-sm h-[480px] overflow-hidden">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                      全体連絡
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {announcementSyncStatus.newCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                          {announcementSyncStatus.newCount}新着
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {announcements.length}件
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAnnouncementSync}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="w-3 h-3 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 同期状態表示 */}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>
                      最終更新: {announcementSyncStatus.lastSync ? 
                        announcementSyncStatus.lastSync.toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : '未同期'
                      }
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        announcementSyncStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span>
                        {announcementSyncStatus.isConnected ? '接続中' : '未接続'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 py-4 h-[calc(100%-7rem)] overflow-y-auto">
                  <div className="space-y-4 overflow-y-auto h-full">
                    {announcements.map((announcement, index) => {
                      const isNew = index < announcementSyncStatus.newCount;
                      const timeAgo = index === 0 ? '30分前' : index === 1 ? '2時間前' : '1日前';
                      return (
                        <div
                          key={announcement.id}
                          className={`group p-5 border rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer ${
                            isNew 
                              ? 'bg-blue-50 border-blue-200 shadow-sm' 
                              : 'bg-white border-gray-200'
                          }`}
                          onClick={() => {
                            // 全体連絡詳細ページへナビゲーション
                            console.log('全体連絡詳細:', announcement.id);
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1">
                              {isNew && (
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mt-1 flex-shrink-0"></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base leading-6 mb-1">
                                  {announcement.title}
                                </h4>
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-xs text-gray-500">{timeAgo}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-600">総務部</span>
                                  {announcement.priority === 'high' && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="flex items-center text-xs text-red-600">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        緊急
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {isNew && (
                                <Badge className="bg-blue-500 text-white text-xs">
                                  NEW
                                </Badge>
                              )}
                              <Badge 
                                variant={announcement.priority === 'high' ? 'destructive' : 
                                       announcement.priority === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {announcement.priority === 'high' ? '重要' : 
                                 announcement.priority === 'medium' ? '通常' : '参考'}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 leading-5 mb-4">
                            {announcement.content}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                <span>全員対象</span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Eye className="w-3 h-3" />
                                <span>45人が既読</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('既読マーク:', announcement.id);
                                }}
                              >
                                既読にする
                              </Button>
                              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* 新しい連絡を追加ボタン */}
                    <div className="pt-2 border-t border-gray-100">
                      <Button
                        variant="outline"
                        className="w-full h-12 text-gray-600 border-dashed border-2 hover:border-blue-300 hover:text-blue-600"
                        onClick={() => {
                          console.log('新しい全体連絡を作成');
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        新しい連絡を作成
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* 通知パネル（オーバーレイ） */}
        <NotificationPanel
          notifications={notifications}
          show={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      </div>
    </div>
  );
};

export default MainDashboard;
