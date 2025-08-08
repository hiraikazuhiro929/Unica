"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import NotificationPanel, { type NotificationDisplay } from "./components/NotificationPanel";
import { Button } from "@/components/ui/button";
import EnhancedProcessCard from "./components/EnhancedProcessCard";

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
} from "lucide-react";

const MainDashboard = () => {
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

  // Current user ID (should be from authentication)
  const currentUserId = "user-123"; // TODO: Get from auth context

  // デバッグ用：サンプルデータをFirebaseに投入する関数（削除予定）
  const seedFirebaseData = async () => {
    console.log('Firebase にサンプルデータを投入中...');
    
    try {
      // Firebase functions をインポート
      const { createProcess } = await import('@/lib/firebase/processes');
      const { createCompanyTask, createPersonalTask } = await import('@/lib/firebase/tasks');
      const { createNotification } = await import('@/lib/firebase/notifications');
      const { createAnnouncement } = await import('@/lib/firebase/announcements');
      const { createCalendarEvent } = await import('@/lib/firebase/calendar');
      const { createNote } = await import('@/lib/firebase/notes');
      
      // 工程データを作成
      const sampleProcesses = [
        {
          orderId: 'M-001',
          orderClient: 'トヨタ自動車',
          lineNumber: 'L001',
          projectName: '自動車部品A製造',
          managementNumber: 'MGT-2024-001',
          progress: 75,
          quantity: 100,
          salesPerson: '山田太郎',
          assignee: '田中一郎',
          fieldPerson: '田中一郎',
          assignedMachines: ['NC旋盤-001'],
          workDetails: {
            setup: 6,
            machining: 12,
            finishing: 9,
            useDynamicSteps: false,
            totalEstimatedHours: 27,
            totalActualHours: 20.25
          },
          orderDate: '2024-03-01',
          arrivalDate: '2024-03-05',
          shipmentDate: '2024-03-31',
          dataWorkDate: '2024-03-03',
          processingPlanDate: '2024-03-15',
          remarks: '高精度加工要求',
          status: 'processing' as const,
          priority: 'high' as const,
          dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        },
        {
          orderId: 'M-002',
          orderClient: 'ソニー',
          lineNumber: 'L002',
          projectName: '精密機器B組立',
          managementNumber: 'MGT-2024-002',
          progress: 30,
          quantity: 50,
          salesPerson: '鈴木花子',
          assignee: '高橋三郎',
          fieldPerson: '高橋三郎',
          assignedMachines: ['マシニングセンタ-002'],
          workDetails: {
            setup: 4,
            machining: 8,
            finishing: 6,
            useDynamicSteps: false,
            totalEstimatedHours: 18,
            totalActualHours: 5.4
          },
          orderDate: '2024-03-15',
          arrivalDate: '2024-03-18',
          shipmentDate: '2024-04-15',
          dataWorkDate: '2024-03-16',
          processingPlanDate: '2024-03-20',
          remarks: '精密加工注意',
          status: 'processing' as const,
          priority: 'medium' as const,
          dueDate: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString()
        },
        {
          orderId: 'M-003',
          orderClient: 'パナソニック',
          lineNumber: 'L003',
          projectName: '電子部品筐体加工',
          managementNumber: 'MGT-2024-004',
          progress: 85,
          quantity: 300,
          salesPerson: '田中花子',
          assignee: '佐藤五郎',
          fieldPerson: '佐藤五郎',
          assignedMachines: ['プレス機-001'],
          workDetails: {
            setup: 2,
            machining: 4,
            finishing: 2,
            useDynamicSteps: false,
            totalEstimatedHours: 8,
            totalActualHours: 6.8
          },
          orderDate: '2024-02-20',
          arrivalDate: '2024-02-25',
          shipmentDate: '2024-03-20',
          dataWorkDate: '2024-02-22',
          processingPlanDate: '2024-02-28',
          remarks: '量産対応',
          status: 'finishing' as const,
          priority: 'medium' as const,
          dueDate: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const process of sampleProcesses) {
        const result = await createProcess(process);
        console.log(`工程 ${process.projectName} 作成:`, result.id ? '成功' : '失敗', result.error);
      }

      // タスクデータを作成
      const sampleTasks = [
        {
          title: '手順書更新',
          description: '新製品の製造手順書を更新する',
          status: 'completed' as const,
          priority: 'medium' as const,
          assignee: '田中一郎',
          assigneeId: 'user-123',
          createdBy: '管理者',
          createdById: 'admin-123',
          category: 'general' as const,
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          title: '設備点検',
          description: '月次設備点検の実施',
          status: 'progress' as const,
          priority: 'high' as const,
          assignee: '佐藤五郎',
          assigneeId: 'user-456',
          createdBy: '管理者',
          createdById: 'admin-123',
          category: 'maintenance' as const
        }
      ];

      for (const task of sampleTasks) {
        const result = await createCompanyTask(task);
        console.log(`タスク ${task.title} 作成:`, result.id ? '成功' : '失敗', result.error);
      }

      // 個人タスクデータを作成
      const personalTaskData = [
        {
          title: '資料準備',
          description: '明日の会議用資料を準備',
          status: 'pending' as const,
          priority: 'medium' as const,
          userId: 'user-123',
          category: 'work' as const
        },
        {
          title: 'メール返信',
          description: '顧客からの問い合わせに返信',
          status: 'progress' as const,
          priority: 'high' as const,
          userId: 'user-123',
          category: 'work' as const
        }
      ];

      for (const task of personalTaskData) {
        const result = await createPersonalTask(task);
        console.log(`個人タスク ${task.title} 作成:`, result.id ? '成功' : '失敗', result.error);
      }

      // 通知データを作成
      const notificationData = [
        {
          type: 'mention' as const,
          title: 'レビュー依頼',
          message: '製品Aの仕様書をレビューお願いします',
          priority: 'high' as const,
          recipientId: 'user-123',
          senderId: 'user-yamada',
          senderName: '山田太郎'
        },
        {
          type: 'system' as const,
          title: '工程完了',
          message: '工程A（製品X）が完了しました',
          priority: 'normal' as const,
          recipientId: 'user-123'
        }
      ];

      for (const notification of notificationData) {
        const result = await createNotification(notification);
        console.log(`通知 ${notification.title} 作成:`, result.id ? '成功' : '失敗', result.error);
      }

      // 全体連絡データを作成
      const announcementData = [
        {
          title: '来週の設備点検について',
          content: '来週月曜日から水曜日にかけて、第1工場の設備点検を実施します。',
          priority: 'urgent' as const,
          category: 'maintenance' as const,
          authorId: 'admin-123',
          authorName: '設備管理部',
          targetAudience: 'all' as const,
          isActive: true
        },
        {
          title: '新しい安全規則の徹底',
          content: '労働安全衛生法の改正に伴い、新しい安全規則を導入します。',
          priority: 'medium' as const,
          category: 'safety' as const,
          authorId: 'admin-123',
          authorName: '安全管理部',
          targetAudience: 'all' as const,
          isActive: true
        }
      ];

      for (const announcement of announcementData) {
        const result = await createAnnouncement(announcement);
        console.log(`全体連絡 ${announcement.title} 作成:`, result.id ? '成功' : '失敗', result.error);
        
        // 全体連絡に関連する通知を自動作成
        if (result.id) {
          const notificationResult = await createNotification({
            type: 'system',
            title: `新しい全体連絡: ${announcement.title}`,
            message: announcement.content.substring(0, 50) + '...',
            recipientId: 'all', // 全員への通知
            senderId: announcement.authorId,
            senderName: announcement.authorName,
            priority: announcement.priority === 'medium' ? 'normal' : announcement.priority as 'normal' | 'high' | 'urgent'
          });
          console.log(`関連通知作成:`, notificationResult.id ? '成功' : '失敗');
        }
      }

      // カレンダーイベントを作成
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const calendarEventData = [
        {
          title: '朝礼',
          description: '全体朝礼・安全確認',
          startTime: '09:00',
          endTime: '09:15',
          date: todayStr,
          location: '会議室A',
          type: 'meeting' as const,
          priority: 'medium' as const,
          color: 'bg-blue-500',
          createdBy: 'システム管理者',
          createdById: 'admin-123',
          isAllDay: false,
          isRecurring: true,
          recurringPattern: 'daily' as const,
          reminderMinutes: 10,
          isActive: true
        },
        {
          title: '品質管理MTG',
          description: '品質改善検討会',
          startTime: '10:30',
          endTime: '11:30',
          date: todayStr,
          location: 'オンライン',
          type: 'meeting' as const,
          priority: 'high' as const,
          color: 'bg-green-500',
          createdBy: '品質管理部',
          createdById: 'quality-123',
          isAllDay: false,
          isRecurring: false,
          reminderMinutes: 15,
          isActive: true
        },
        {
          title: '設備点検',
          description: 'NC旋盤-001 定期点検',
          startTime: '14:00',
          endTime: '15:00',
          date: todayStr,
          location: '第1工場',
          type: 'maintenance' as const,
          priority: 'high' as const,
          color: 'bg-orange-500',
          createdBy: '保全部',
          createdById: 'maintenance-123',
          isAllDay: false,
          isRecurring: false,
          reminderMinutes: 30,
          isActive: true
        },
        {
          title: '定例会議',
          description: '週次進捗確認会議',
          startTime: '16:30',
          endTime: '17:30',
          date: todayStr,
          location: '会議室B',
          type: 'meeting' as const,
          priority: 'medium' as const,
          color: 'bg-purple-500',
          createdBy: 'プロジェクト管理部',
          createdById: 'project-123',
          isAllDay: false,
          isRecurring: false,
          reminderMinutes: 15,
          isActive: true
        },
        {
          title: '安全パトロール',
          description: '工場内安全点検',
          startTime: '13:00',
          endTime: '14:00',
          date: tomorrowStr,
          location: '全工場',
          type: 'inspection' as const,
          priority: 'high' as const,
          color: 'bg-red-500',
          createdBy: '安全管理部',
          createdById: 'safety-123',
          isAllDay: false,
          isRecurring: false,
          reminderMinutes: 30,
          isActive: true
        }
      ];

      for (const eventData of calendarEventData) {
        const result = await createCalendarEvent(eventData);
        console.log(`カレンダーイベント ${eventData.title} 作成:`, result.id ? '成功' : '失敗', result.error);
      }

      // メモデータを作成
      const noteData = [
        {
          title: '今日のタスク',
          content: '・品質管理MTGの資料準備\n・設備点検スケジュール確認\n・新入社員研修計画',
          category: 'todo' as const,
          priority: 'high' as const,
          color: 'bg-yellow-100',
          createdBy: 'ユーザー',
          createdById: currentUserId,
          isPrivate: true,
          isArchived: false,
          isActive: true
        },
        {
          title: 'アイデアメモ',
          content: '製造効率向上のため、IoTセンサーを活用した自動品質チェックシステムを検討',
          category: 'idea' as const,
          priority: 'medium' as const,
          color: 'bg-blue-100',
          createdBy: 'ユーザー',
          createdById: currentUserId,
          isPrivate: true,
          isArchived: false,
          isActive: true
        },
        {
          title: '会議メモ - 品質管理MTG',
          content: '次回の点検スケジュール:\n- 来週火曜日 NC旋盤-001\n- 来週木曜日 マシニングセンタ-002',
          category: 'meeting' as const,
          priority: 'medium' as const,
          color: 'bg-green-100',
          createdBy: 'ユーザー',
          createdById: currentUserId,
          isPrivate: false,
          isArchived: false,
          isActive: true
        }
      ];

      for (const note of noteData) {
        const result = await createNote(note);
        console.log(`メモ ${note.title} 作成:`, result.id ? '成功' : '失敗', result.error);
      }

      console.log('✅ サンプルデータの投入が完了しました！');
      alert('サンプルデータをFirebaseに投入しました。ページを更新してください。');
      
    } catch (error) {
      console.error('サンプルデータ投入エラー:', error);
      alert('データ投入に失敗しました: ' + error);
    }
  };

  // 現在時刻の更新（1分間隔に変更して負荷軽減）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60秒間隔に変更
    return () => clearInterval(timer);
  }, []);

  // Firebase Data Subscriptions
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    console.log('Firebase接続を開始します...');

    // Subscribe to processes
    const processUnsubscribe = subscribeToProcessesList(
      {
        limit: 10,
        orderByField: 'updatedAt',
        orderDirection: 'desc'
      },
      (data) => {
        console.log('取得した工程データ:', data);
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
        console.log('取得した全体タスク:', data);
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
        console.log('取得した個人タスク:', data);
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
        console.log('取得した通知:', data);
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
        console.log('取得した全体連絡:', data);
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
        console.log('取得した今日の予定:', todayEvents);
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
        console.log('取得した今月の予定:', currentMonthEvents);
        setMonthEvents(currentMonthEvents);
      }
    };

    loadCalendarData();

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUserId]);

  // デバッグ用：Windowオブジェクトに関数を追加（削除予定）
  useEffect(() => {
    (window as any).seedFirebaseData = seedFirebaseData;
    console.log('🔧 デバッグ用関数を追加しました。');
    console.log('コンソールで window.seedFirebaseData() を実行してFirebaseにサンプルデータを投入できます。');
  }, []);

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
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case "progress":
        return <Clock className="w-3 h-3 text-blue-600" />;
      case "pending":
        return <FileText className="w-3 h-3 text-gray-500" />;
      default:
        return <FileText className="w-3 h-3 text-gray-500" />;
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
    <div className="min-h-screen bg-white">
      {/* サイドバーの幅を考慮してメインコンテンツを配置 */}
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* 上部ヘッダー - 現代的なデザイン */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左側 - ブランドとナビゲーション */}
            <div className="flex items-center space-x-4">
              <Home className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Unica Dashboard</h1>
                <p className="text-sm text-gray-600">製造管理システム</p>
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
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 custom-scrollbar">
          {/* エレガントな統計バー */}
          <div className="px-6 pt-6 pb-4">
            <div className="grid grid-cols-4 gap-6">
              {/* 受注管理 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-blue-200/30" 
                   onClick={() => router.push('/orders')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-2">受注</p>
                    <p className="text-3xl font-bold text-gray-800">{displayProcesses.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* 進行中タスク */}
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-green-200/30" 
                   onClick={() => router.push('/work-hours')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-2">工数</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {[...allTasks, ...displayPersonalTasks].filter(t => t.status === 'progress').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <PlayCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* 未読通知 */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-orange-200/30" 
                   onClick={() => router.push('/notifications')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600 mb-2">未読</p>
                    <p className="text-3xl font-bold text-gray-800">{unreadCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Bell className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* 日報管理 */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border border-purple-200/30" 
                   onClick={() => router.push('/daily-reports')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 mb-2">日報</p>
                    <p className="text-3xl font-bold text-gray-800">{todaySchedule.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <FileText className="w-6 h-6 text-purple-600" />
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
                <div className="bg-white/70 rounded-lg p-5 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      タスク管理
                    </h3>
                    <button 
                      onClick={() => router.push('/tasks')}
                      className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Target className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">個人タスク</p>
                      <p className="text-lg font-bold text-gray-800">
                        {displayPersonalTasks.filter(t => t.status === 'completed').length}/{displayPersonalTasks.length}
                      </p>
                    </div>
                    {displayPersonalTasks.length > 0 ? (
                      displayPersonalTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center p-4 hover:bg-white/60 rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/30 hover:border-white/50 interactive-scale"
                          onClick={() => router.push('/tasks')}
                        >
                          <div className="w-6 h-6 mr-4 flex-shrink-0">
                            {getStatusIcon(task.status)}
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-800">{task.title}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm bg-white/40 rounded-2xl border border-white/30">
                        個人タスクなし ({personalTasks.length})
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-sm font-semibold text-gray-700">全体タスク</p>
                      <p className="text-lg font-bold text-gray-800">
                        {allTasks.filter(t => t.status === 'completed').length}/{allTasks.length}
                      </p>
                    </div>
                    {allTasks.length > 0 ? (
                      allTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center p-4 hover:bg-white/60 rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/30 hover:border-white/50 interactive-scale"
                          onClick={() => router.push('/tasks')}
                        >
                          <div className="w-6 h-6 mr-4 flex-shrink-0">
                            {getStatusIcon(task.status)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{task.title}</div>
                            {task.person && (
                              <div className="text-xs text-gray-600 mt-1">担当: {task.person}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm bg-white/40 rounded-2xl border border-white/30">
                        全体タスクなし ({companyTasks.length})
                      </div>
                    )}
                  </div>
                </div>

                {/* 通知 */}
                <div className="bg-white/70 rounded-lg p-5 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Bell className="w-5 h-5 text-orange-600 mr-2" />
                      通知
                    </h3>
                    <button 
                      onClick={() => router.push('/notifications')}
                      className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {displayNotifications.slice(0, 3).map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start p-4 hover:bg-white/60 rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/30 hover:border-white/50 interactive-scale"
                        onClick={() => router.push('/notifications')}
                      >
                        <div className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{notification.message}</div>
                          <div className="text-xs text-gray-600 mt-1">
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
                    <h2 className="text-2xl font-bold text-gray-900">本日の工程</h2>
                    <button 
                      onClick={() => router.push('/tasks')}
                      className="text-sm bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 px-4 py-2 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-blue-200/50 hover:border-blue-300/50"
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
                            console.log(`Updating process ${processId} to status ${newStatus}`);
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
                          className="w-full mt-6 py-4 px-6 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 hover:from-blue-500/20 hover:to-purple-500/20 rounded-2xl border border-blue-200/50 hover:border-blue-300/50 transition-all duration-300 backdrop-blur-sm interactive-scale"
                        >
                          他 {processes.length - 3} 件の工程を表示 →
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="bg-white rounded-3xl p-8 modern-shadow-lg border border-gray-200/50">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center floating-animation">
                          <Clock className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-xl font-semibold mb-3 text-gray-700">工程データを読み込み中...</p>
                        <p className="text-sm mb-2">現在のデータ件数: {processes.length}</p>
                        <p className="text-xs text-gray-400">Firebase接続状態を確認してください</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 右サイド - カレンダー・予定・全体連絡 */}
              <div className="col-span-3 space-y-6">
                {/* カレンダー */}
                <div className="bg-white/70 rounded-lg p-5 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                      {monthNames[today.getMonth()]} {today.getFullYear()}
                    </h3>
                    <button 
                      onClick={() => router.push('/calendar')}
                      className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Clock className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 py-3 bg-gray-50 rounded-lg">
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
                              : "text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>


                {/* 全体連絡 */}
                <div className="bg-white/70 rounded-lg p-5 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <MessageCircle className="w-5 h-5 text-green-600 mr-2" />
                      全体連絡
                    </h3>
                    <button 
                      onClick={() => router.push('/announcements')}
                      className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Bell className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {displayAnnouncements.length > 0 ? (
                      displayAnnouncements.slice(0, 3).map((announcement) => {
                        const priorityGradient = announcement.priority === 'high' ? 'from-red-500 to-red-600' :
                                             announcement.priority === 'medium' ? 'from-orange-500 to-orange-600' :
                                             'from-blue-500 to-blue-600';
                        const priorityBg = announcement.priority === 'high' ? 'bg-red-50' :
                                             announcement.priority === 'medium' ? 'bg-orange-50' :
                                             'bg-blue-50';
                        return (
                          <div
                            key={announcement.id}
                            className={`relative ${priorityBg} hover:scale-[1.02] p-4 transition-all duration-300 cursor-pointer rounded-2xl border border-gray-200/50 modern-shadow overflow-hidden group`}
                            onClick={() => {
                              router.push('/announcements');
                            }}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${priorityGradient} rounded-l-2xl`}></div>
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 flex-1 pr-2 group-hover:text-gray-800">
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
                            <p className="text-sm text-gray-700 line-clamp-2 mb-2 leading-relaxed">
                              {announcement.content}
                            </p>
                            <div className="text-xs text-gray-500 font-medium">
                              {formatRelativeTime((announcements.find(a => a.id === announcement.id) as Announcement)?.createdAt)}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl border border-gray-200/50">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
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
            <div className="bg-white rounded-lg p-6 w-96 mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">クイックメモ</h3>
                <button
                  onClick={() => {
                    setShowQuickNoteModal(false);
                    setQuickNoteContent('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                placeholder="メモを入力してください..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowQuickNoteModal(false);
                    setQuickNoteContent('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
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
                      if (result.id) {
                        console.log('クイックメモ作成成功');
                      }
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
            console.log('通知が既読になりました:', id);
          }}
        />
      </div>
    </div>
  );
};

export default MainDashboard;
