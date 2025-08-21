"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Firebase imports
import { 
  getTodayEvents, 
  getMonthEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  initializeGoogleCalendarAuth,
  syncGoogleCalendarEvents,
  checkGoogleCalendarAuth,
  signInToGoogle,
  signOutFromGoogle
} from '@/lib/firebase/calendar';
import type { CalendarEvent as FirebaseCalendarEvent } from '@/lib/firebase/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Settings,
  Users,
  Clock,
  MapPin,
  Building2,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Calendar as CalendarViewIcon,
  List,
  Grid3X3,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  MoreHorizontal,
  Bell,
  Share2,
  Download,
  Upload,
  Zap,
  Target,
  FileText,
  Coffee,
  Truck,
  HardHat,
  Palette,
} from "lucide-react";

// 型定義
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category: EventCategory;
  priority: "low" | "normal" | "high" | "urgent";
  location?: string;
  attendees?: string[];
  isAllDay: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
  reminderMinutes?: number[];
  createdBy: string;
  department: string;
  status: "confirmed" | "tentative" | "cancelled";
  isShared: boolean;
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: any;
  description: string;
}

type ViewMode = "month" | "week" | "day";

const GoogleLikeCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  
  // Google連携の状態管理
  const [googleAuthStatus, setGoogleAuthStatus] = useState<{
    isAuthenticated: boolean;
    userEmail?: string;
    isLoading: boolean;
  }>({
    isAuthenticated: false,
    userEmail: undefined,
    isLoading: false
  });
  const [syncStatus, setSyncStatus] = useState<{
    isLoading: boolean;
    lastSync?: Date;
    syncedCount?: number;
  }>({
    isLoading: false
  });

  // セクションの開閉状態
  const [sectionCollapsed, setSectionCollapsed] = useState({
    miniCalendar: false,
    myCalendar: false,
    todayEvents: false
  });

  // 利用可能なアイコンのリスト
  const availableIcons = [
    { name: 'Target', icon: Target, label: '生産・目標' },
    { name: 'Wrench', icon: Wrench, label: 'メンテナンス' },
    { name: 'HardHat', icon: HardHat, label: '安全・研修' },
    { name: 'Users', icon: Users, label: '会議・打ち合わせ' },
    { name: 'Truck', icon: Truck, label: '配送・物流' },
    { name: 'CheckCircle', icon: CheckCircle, label: '品質・確認' },
    { name: 'Coffee', icon: Coffee, label: '休憩・イベント' },
    { name: 'FileText', icon: FileText, label: '文書・報告' },
    { name: 'Calendar', icon: CalendarIcon, label: 'スケジュール' },
    { name: 'Bell', icon: Bell, label: '通知・リマインダー' },
    { name: 'Building2', icon: Building2, label: '施設・建物' },
    { name: 'Clock', icon: Clock, label: '時間・期限' },
    { name: 'AlertTriangle', icon: AlertTriangle, label: '警告・注意' },
    { name: 'Zap', icon: Zap, label: '緊急・重要' },
    { name: 'Share2', icon: Share2, label: '共有・連携' }
  ];

  // カテゴリ編集用の状態
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 border-blue-300',
    iconName: 'FileText'
  });

  // 製造業特化のイベントカテゴリ（編集可能な状態管理）
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([
    {
      id: "production",
      name: "生産スケジュール",
      color: "text-blue-600",
      bgColor: "bg-blue-100 border-blue-300",
      icon: Target,
      description: "製品の生産計画と工程管理",
    },
    {
      id: "maintenance",
      name: "設備メンテナンス",
      color: "text-orange-600",
      bgColor: "bg-orange-100 border-orange-300",
      icon: Wrench,
      description: "機械・設備の保守点検",
    },
    {
      id: "safety",
      name: "安全・研修",
      color: "text-red-600",
      bgColor: "bg-red-100 border-red-300",
      icon: HardHat,
      description: "安全会議・研修・訓練",
    },
    {
      id: "meeting",
      name: "会議・打ち合わせ",
      color: "text-purple-600",
      bgColor: "bg-purple-100 border-purple-300",
      icon: Users,
      description: "各種会議・打ち合わせ",
    },
    {
      id: "delivery",
      name: "納期・出荷",
      color: "text-green-600",
      bgColor: "bg-green-100 border-green-300",
      icon: Truck,
      description: "製品納期・出荷予定",
    },
    {
      id: "quality",
      name: "品質管理",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 border-yellow-300",
      icon: CheckCircle,
      description: "品質検査・監査",
    },
    {
      id: "break",
      name: "休憩・イベント",
      color: "text-gray-600",
      bgColor: "bg-gray-100 border-gray-300",
      icon: Coffee,
      description: "休憩時間・社内イベント",
    },
  ]);

  // カテゴリ編集関数
  const handleAddCategory = () => {
    if (!newCategoryData.name.trim()) return;
    
    const selectedIcon = availableIcons.find(icon => icon.name === newCategoryData.iconName);
    
    const newCategory: EventCategory = {
      id: `custom_${Date.now()}`,
      name: newCategoryData.name,
      description: newCategoryData.description,
      color: newCategoryData.color,
      bgColor: newCategoryData.bgColor,
      icon: selectedIcon?.icon || FileText
    };
    
    setEventCategories(prev => [...prev, newCategory]);
    setNewCategoryData({
      name: '',
      description: '',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 border-blue-300',
      iconName: 'FileText'
    });
    setShowAddCategoryDialog(false);
  };

  const handleEditCategory = (category: EventCategory) => {
    setEditingCategory(category);
    // 既存カテゴリのアイコン名を取得
    const currentIconName = availableIcons.find(icon => icon.icon === category.icon)?.name || 'FileText';
    setNewCategoryData({
      name: category.name,
      description: category.description,
      color: category.color,
      bgColor: category.bgColor,
      iconName: currentIconName
    });
    setShowAddCategoryDialog(true);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategoryData.name.trim()) return;
    
    const selectedIcon = availableIcons.find(icon => icon.name === newCategoryData.iconName);
    
    setEventCategories(prev => prev.map(cat => 
      cat.id === editingCategory.id 
        ? {
            ...cat,
            name: newCategoryData.name,
            description: newCategoryData.description,
            color: newCategoryData.color,
            bgColor: newCategoryData.bgColor,
            icon: selectedIcon?.icon || cat.icon
          }
        : cat
    ));
    
    setEditingCategory(null);
    setNewCategoryData({
      name: '',
      description: '',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 border-blue-300',
      iconName: 'FileText'
    });
    setShowAddCategoryDialog(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('このカテゴリを削除しますか？')) {
      setEventCategories(prev => prev.filter(cat => cat.id !== categoryId));
      // 削除されたカテゴリを表示リストからも削除
      setVisibleCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  // サンプルイベントデータ
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: "1",
      title: "A製品ライン　生産開始",
      description: "A製品の量産を開始します。初期設定を確認してください。",
      start: new Date(2025, 1, 10, 8, 0),
      end: new Date(2025, 1, 10, 17, 0),
      category: eventCategories[0],
      priority: "high",
      location: "第1工場ライン3",
      attendees: ["田中部長", "佐藤作業員", "鈴木課長"],
      isAllDay: false,
      reminderMinutes: [30, 10],
      createdBy: "生産管理部",
      department: "生産部",
      status: "confirmed",
      isShared: true,
    },
    {
      id: "2",
      title: "NC旋盤定期メンテナンス",
      description: "NC旋盤の定期点検とオイル交換を実施",
      start: new Date(2025, 1, 12, 9, 0),
      end: new Date(2025, 1, 12, 12, 0),
      category: eventCategories[1],
      priority: "normal",
      location: "第2工場",
      attendees: ["山田技師"],
      isAllDay: false,
      reminderMinutes: [60],
      createdBy: "保全部",
      department: "保全部",
      status: "confirmed",
      isShared: true,
    },
    {
      id: "3",
      title: "月次安全会議",
      description: "先月の安全実績報告と今月の安全目標設定",
      start: new Date(2025, 1, 15, 14, 0),
      end: new Date(2025, 1, 15, 16, 0),
      category: eventCategories[2],
      priority: "high",
      location: "会議室A",
      attendees: ["伊藤主任", "田中部長", "各課長"],
      isAllDay: false,
      reminderMinutes: [30],
      createdBy: "総務部",
      department: "全社",
      status: "confirmed",
      isShared: true,
    },
    {
      id: "4",
      title: "B製品納期",
      description: "B製品の最終出荷予定日",
      start: new Date(2025, 1, 20, 0, 0),
      end: new Date(2025, 1, 20, 23, 59),
      category: eventCategories[4],
      priority: "urgent",
      location: "出荷センター",
      attendees: ["物流チーム"],
      isAllDay: true,
      reminderMinutes: [1440, 480], // 24時間前、8時間前
      createdBy: "営業部",
      department: "営業部",
      status: "confirmed",
      isShared: true,
    },
    {
      id: "5",
      title: "ISO品質監査",
      description: "ISO9001の年次内部監査",
      start: new Date(2025, 1, 25, 10, 0),
      end: new Date(2025, 1, 25, 17, 0),
      category: eventCategories[5],
      priority: "high",
      location: "各部署",
      attendees: ["監査チーム", "各部署代表"],
      isAllDay: false,
      reminderMinutes: [1440, 120], // 24時間前、2時間前
      createdBy: "品質管理部",
      department: "品質管理部",
      status: "confirmed",
      isShared: true,
    },
    {
      id: "6",
      title: "新年会",
      description: "全社新年会（懇親会）",
      start: new Date(2025, 1, 28, 18, 0),
      end: new Date(2025, 1, 28, 21, 0),
      category: eventCategories[6],
      priority: "normal",
      location: "ホテル◯◯",
      attendees: ["全社員"],
      isAllDay: false,
      reminderMinutes: [1440, 120],
      createdBy: "総務部",
      department: "全社",
      status: "confirmed",
      isShared: true,
    },
    {
      id: "7",
      title: "3日間研修プログラム",
      description: "新人研修（3日間連続）",
      start: new Date(2025, 1, 17, 9, 0),
      end: new Date(2025, 1, 19, 17, 0), // 3日間
      category: eventCategories[2],
      priority: "high",
      location: "研修室",
      attendees: ["新入社員"],
      isAllDay: false,
      reminderMinutes: [1440],
      createdBy: "人事部",
      department: "人事部",
      status: "confirmed",
      isShared: true,
    },
  ]);

  // 初期表示カテゴリの設定
  useEffect(() => {
    setVisibleCategories(eventCategories.map(cat => cat.id));
  }, []);

  // 新規イベント用のフォーム状態
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    description: "",
    start: new Date(),
    end: new Date(),
    category: eventCategories[0],
    priority: "normal",
    location: "",
    isAllDay: false,
    reminderMinutes: [30],
    department: "生産部",
    status: "confirmed",
    isShared: false,
  });

  // 日付操作関数
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        break;
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        break;
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 月表示のカレンダーグリッドを生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // 日付のイベントを取得
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      if (!visibleCategories.includes(event.category.id)) return false;
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const targetDate = new Date(date);
      
      // 日付を比較するため、時間を00:00:00に設定
      const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      const checkDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      
      // イベントの開始日から終了日の間に対象日が含まれるかチェック
      return checkDate >= eventStartDate && checkDate <= eventEndDate;
    });
  };

  // Google Calendar風の貫通イベント処理
  const getSpanningEventInfo = (event: CalendarEvent, dayIndex: number) => {
    const eventStartDate = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate());
    const eventEndDate = new Date(event.end.getFullYear(), event.end.getMonth(), event.end.getDate());
    const currentDay = calendarDays[dayIndex];
    const currentDate = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
    
    const isMultiDay = eventEndDate.getTime() > eventStartDate.getTime();
    if (!isMultiDay) {
      return { shouldShow: true, isSpanning: false };
    }
    
    // イベントが今日の日付に該当するかチェック
    if (currentDate < eventStartDate || currentDate > eventEndDate) {
      return { shouldShow: false, isSpanning: false };
    }
    
    // 現在の日から週末（または月末）まで何日続くかを計算
    const weekEnd = Math.floor(dayIndex / 7) * 7 + 6; // 現在の週の最後の日のインデックス
    const monthEnd = calendarDays.length - 1;
    const maxIndex = Math.min(weekEnd, monthEnd);
    
    let spanDays = 1;
    for (let i = dayIndex + 1; i <= maxIndex; i++) {
      const nextDay = calendarDays[i];
      const nextDate = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
      if (nextDate <= eventEndDate) {
        spanDays++;
      } else {
        break;
      }
    }
    
    return {
      shouldShow: currentDate.getTime() === eventStartDate.getTime(), // 開始日のみ表示
      isSpanning: true,
      spanDays,
      width: `${spanDays * 100}%`
    };
  };

  // 優先度の色を取得
  const getPriorityColor = (priority: CalendarEvent["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-red-500";
      case "high":
        return "border-l-4 border-orange-500";
      case "normal":
        return "border-l-4 border-blue-500";
      case "low":
        return "border-l-4 border-gray-400";
      default:
        return "";
    }
  };

  // イベント保存
  const handleSaveEvent = () => {
    if (!newEvent.title) return;

    const eventToSave: CalendarEvent = {
      id: isNewEvent ? Date.now().toString() : selectedEvent!.id,
      title: newEvent.title!,
      description: newEvent.description || "",
      start: newEvent.start!,
      end: newEvent.end!,
      category: newEvent.category!,
      priority: newEvent.priority!,
      location: newEvent.location || "",
      attendees: [],
      isAllDay: newEvent.isAllDay!,
      reminderMinutes: newEvent.reminderMinutes!,
      createdBy: "現在のユーザー",
      department: newEvent.department!,
      status: newEvent.status!,
      isShared: newEvent.isShared!,
    };

    if (isNewEvent) {
      setEvents([...events, eventToSave]);
    } else {
      setEvents(events.map(event => 
        event.id === eventToSave.id ? eventToSave : event
      ));
    }

    setShowEventDialog(false);
    setSelectedEvent(null);
    setIsNewEvent(false);
  };

  // イベント削除
  const handleDeleteEvent = () => {
    if (selectedEvent) {
      setEvents(events.filter(event => event.id !== selectedEvent.id));
      setShowEventDialog(false);
      setSelectedEvent(null);
    }
  };

  // 新規イベント作成
  const handleCreateEvent = (date?: Date) => {
    const startDate = date || selectedDate;
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    setNewEvent({
      title: "",
      description: "",
      start: startDate,
      end: endDate,
      category: eventCategories[0],
      priority: "normal",
      location: "",
      isAllDay: false,
      reminderMinutes: [30],
      department: "生産部",
      status: "confirmed",
      isShared: false,
    });
    setIsNewEvent(true);
    setShowEventDialog(true);
  };

  // イベント編集
  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setNewEvent(event);
    setIsNewEvent(false);
    setShowEventDialog(true);
  };

  // カテゴリの表示切り替え
  const toggleCategory = (categoryId: string) => {
    setVisibleCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Google連携関数
  const handleGoogleAuth = async () => {
    setGoogleAuthStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // まずGoogle API初期化
      const initResult = await initializeGoogleCalendarAuth();
      if (!initResult.success) {
        throw new Error(initResult.error || 'API initialization failed');
      }

      // サインイン実行
      const signInResult = await signInToGoogle();
      if (signInResult.success) {
        setGoogleAuthStatus({
          isAuthenticated: true,
          userEmail: signInResult.userEmail || 'unknown@example.com',
          isLoading: false
        });
        alert(`Google認証が完了しました: ${signInResult.userEmail}`);
      } else {
        throw new Error(signInResult.error || 'Sign-in failed');
      }
    } catch (error: any) {
      console.error('Google認証エラー:', error);
      setGoogleAuthStatus(prev => ({ ...prev, isLoading: false }));
      alert(`Google認証に失敗しました: ${error.message}`);
    }
  };

  const handleGoogleSync = async () => {
    setSyncStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await syncGoogleCalendarEvents();
      if (result.error) {
        throw new Error(result.error);
      }
      
      setSyncStatus({
        isLoading: false,
        lastSync: new Date(),
        syncedCount: result.synced
      });
      
      // イベントリストを更新
      // 実際の実装では、Firestoreからイベントを再取得してstateを更新
      alert(`Google Calendarから ${result.synced} 件のイベントを同期しました`);
    } catch (error: any) {
      console.error('Google同期エラー:', error);
      setSyncStatus(prev => ({ ...prev, isLoading: false }));
      alert(`同期に失敗しました: ${error.message}`);
    }
  };

  // 初回ロード時にGoogle認証状態をチェック
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        // Google API初期化を試行
        await initializeGoogleCalendarAuth();
        
        // 認証状態をチェック
        const authStatus = await checkGoogleCalendarAuth();
        setGoogleAuthStatus({
          isAuthenticated: authStatus.isAuthenticated,
          userEmail: authStatus.userEmail,
          isLoading: false
        });
      } catch (error) {
        console.log('Google API初期化失敗 (認証情報未設定の可能性):', error);
        setGoogleAuthStatus({
          isAuthenticated: false,
          userEmail: undefined,
          isLoading: false
        });
      }
    };
    
    checkGoogleAuth();
  }, []);

  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-300 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <CalendarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">カレンダー</h1>
                <p className="text-gray-600 mt-1">
                  製造スケジュールと重要な予定を管理
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={goToToday}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                今日
              </Button>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                  className="border-none rounded-none hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 py-2 text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                  {viewMode === "month" && 
                    currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })
                  }
                  {viewMode === "week" && 
                    `${currentDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} 週`
                  }
                  {viewMode === "day" && 
                    currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
                  }
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate("next")}
                  className="border-none rounded-none hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                  className="rounded-none border-none"
                >
                  日
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className="rounded-none border-none border-x"
                >
                  週
                </Button>
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className="rounded-none border-none"
                >
                  月
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIntegrationDialog(true)}
                className="ml-3 rounded-lg"
                title="外部カレンダー連携"
              >
                <Share2 className="w-4 h-4 mr-1" />
                連携
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* サイドバー */}
          <div className="w-80 bg-white border-r border-gray-300 flex flex-col">
            {/* 作成ボタン */}
            <div className="p-4 bg-white border-b border-gray-200">
              <Button
                onClick={() => handleCreateEvent()}
                variant="outline"
                className="w-full font-medium py-2.5 transition-colors flex items-center justify-center rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm">作成</span>
              </Button>
            </div>
            
            {/* ミニカレンダー */}
            <div className="border-t border-b border-gray-300 bg-white">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => setSectionCollapsed(prev => ({ ...prev, miniCalendar: !prev.miniCalendar }))}
              >
                <div className="text-sm font-semibold text-gray-700">
                  {currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
                </div>
                {sectionCollapsed.miniCalendar ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {!sectionCollapsed.miniCalendar && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-7 gap-1 text-xs text-center">
                    {["日", "月", "火", "水", "木", "金", "土"].map(day => (
                      <div key={day} className="py-1 text-gray-500 font-medium">
                        {day}
                      </div>
                    ))}
                    {calendarDays.slice(0, 42).map((day, index) => {
                      const isToday = day.toDateString() === today.toDateString();
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const hasEvents = getEventsForDate(day).length > 0;
                      
                      return (
                        <button
                          key={index}
                          className={`
                            py-1 text-xs transition-colors
                            ${isToday ? "bg-blue-600 text-white font-bold" : ""}
                            ${!isCurrentMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"}
                            ${hasEvents && !isToday ? "bg-blue-50 text-blue-700 font-medium" : ""}
                          `}
                          onClick={() => setSelectedDate(day)}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* カテゴリフィルター */}
            <div className="flex-1 overflow-y-auto border-b border-gray-200">
              <div className="bg-white">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <button
                    className="flex items-center flex-1"
                    onClick={() => setSectionCollapsed(prev => ({ ...prev, myCalendar: !prev.myCalendar }))}
                  >
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                      <Filter className="w-4 h-4 mr-2" />
                      マイカレンダー
                    </h3>
                  </button>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryData({
                          name: '',
                          description: '',
                          color: 'text-blue-600',
                          bgColor: 'bg-blue-100 border-blue-300',
                          iconName: 'FileText'
                        });
                        setShowAddCategoryDialog(true);
                      }}
                      title="新しいカテゴリを追加"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <button
                      onClick={() => setSectionCollapsed(prev => ({ ...prev, myCalendar: !prev.myCalendar }))}
                    >
                      {sectionCollapsed.myCalendar ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                {!sectionCollapsed.myCalendar && (
                  <div className="px-4 pb-4">
                    <div className="space-y-2">
                      {eventCategories.map(category => {
                        const Icon = category.icon;
                        const isVisible = visibleCategories.includes(category.id);
                        
                        return (
                          <div
                            key={category.id}
                            className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 transition-colors group"
                          >
                            <button
                              className="flex items-center space-x-2 flex-1"
                              onClick={() => toggleCategory(category.id)}
                            >
                              <Icon className={`w-4 h-4 ${category.color}`} />
                              <span className="text-sm text-gray-700">{category.name}</span>
                            </button>
                            <div className="flex items-center space-x-1">
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                onClick={() => handleEditCategory(category)}
                                title="編集"
                              >
                                <Edit className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                              </button>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                onClick={() => handleDeleteCategory(category.id)}
                                title="削除"
                              >
                                <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                              </button>
                              <button onClick={() => toggleCategory(category.id)} className="p-1">
                                {isVisible ? (
                                  <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 今日の予定 */}
              <div>
                <div className="bg-white">
                  <button
                    onClick={() => setSectionCollapsed(prev => ({ ...prev, todayEvents: !prev.todayEvents }))}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                  <h3 className="text-sm font-semibold text-gray-700">
                    今日の予定 ({getEventsForDate(today).length})
                  </h3>
                  {sectionCollapsed.todayEvents ? 
                    <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  }
                </button>
                  {!sectionCollapsed.todayEvents && (
                    <div className="px-4 pb-4">
                      <div className="space-y-2">
                        {getEventsForDate(today).map(event => {
                          const Icon = event.category.icon;
                          return (
                            <div
                              key={event.id}
                              className={`p-2 border-l-4 cursor-pointer hover:bg-gray-50 ${event.category.bgColor} ${getPriorityColor(event.priority)}`}
                              onClick={() => handleEditEvent(event)}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <Icon className={`w-3 h-3 ${event.category.color}`} />
                                <span className="text-xs font-medium text-gray-900 truncate">
                                  {event.title}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {event.isAllDay ? "終日" : 
                                  `${event.start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} - ${event.end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
                                }
                              </div>
                            </div>
                          );
                        })}
                        {getEventsForDate(today).length === 0 && (
                          <p className="text-xs text-gray-500">予定はありません</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* メインカレンダー表示 */}
          <div className="flex-1 overflow-auto">
            {viewMode === "month" && (
              <div className="p-0">
                <div className="bg-transparent">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 border-b border-gray-300 bg-gray-50">
                    {["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"].map((day, index) => (
                      <div key={day} className={`p-4 text-center font-semibold ${index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"}`}>
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* カレンダーグリッド - Google Calendar風貫通表示 */}
                  <div className="relative">
                    {/* 日付セルのグリッド */}
                    <div className="grid grid-cols-7">
                      {calendarDays.map((day, index) => {
                        const isToday = day.toDateString() === today.toDateString();
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        
                        return (
                          <div
                            key={index}
                            className={`min-h-[120px] p-2 border-r border-b border-gray-100 ${
                              !isCurrentMonth ? "bg-gray-50/50" : "hover:bg-gray-50/30"
                            } cursor-pointer transition-colors relative`}
                            onClick={() => handleCreateEvent(day)}
                          >
                            <div className={`text-sm mb-2 ${
                              isToday ? "w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold" :
                              !isCurrentMonth ? "text-gray-400" :
                              index % 7 === 0 ? "text-red-600" :
                              index % 7 === 6 ? "text-blue-600" : "text-gray-700"
                            }`}>
                              {day.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 貫通イベントバーの描画 */}
                    {calendarDays.map((day, dayIndex) => {
                      const dayEvents = getEventsForDate(day);
                      return dayEvents.map((event, eventIndex) => {
                        const spanInfo = getSpanningEventInfo(event, dayIndex);
                        
                        if (!spanInfo.shouldShow) return null;
                        
                        const Icon = event.category.icon;
                        const row = Math.floor(dayIndex / 7);
                        const col = dayIndex % 7;
                        
                        return (
                          <div
                            key={`${event.id}-${dayIndex}`}
                            className={`absolute text-xs px-2 py-1 rounded-md cursor-pointer transition-all hover:shadow-md ${event.category.bgColor} ${getPriorityColor(event.priority)}`}
                            style={{
                              top: `${row * 120 + 35 + eventIndex * 22}px`,
                              left: `${(col / 7) * 100}%`,
                              width: spanInfo.isSpanning ? spanInfo.width : `${(1/7) * 100}%`,
                              zIndex: 10,
                              height: '18px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                            title={`${event.title} ${event.description ? `- ${event.description}` : ''}`}
                          >
                            <div className="flex items-center space-x-1 h-full">
                              <Icon className={`w-3 h-3 ${event.category.color} flex-shrink-0`} />
                              <span className="font-medium truncate text-xs">
                                {spanInfo.isSpanning && (
                                  <span className="bg-white/30 px-1 rounded mr-1">
                                    {spanInfo.spanDays}日
                                  </span>
                                )}
                                {event.isAllDay ? event.title : 
                                  `${event.start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} ${event.title}`
                                }
                              </span>
                              {event.priority === "urgent" && (
                                <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 週表示と日表示は簡略化 */}
            {(viewMode === "week" || viewMode === "day") && (
              <div className="p-6">
                <div className="bg-gray-50/50 p-6">
                  <div className="text-center text-gray-500">
                    <CalendarViewIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">
                      {viewMode === "week" ? "週表示" : "日表示"}
                    </h3>
                    <p>この表示モードは開発中です。</p>
                    <p className="text-sm mt-2">月表示をご利用ください。</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* カテゴリ編集ダイアログ */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>カテゴリ管理</DialogTitle>
              <DialogDescription>
                カレンダーのカテゴリを追加、編集、削除できます
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {eventCategories.map(category => {
                  const Icon = category.icon;
                  return (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${category.color}`} />
                        <div>
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCategory(category.id)}
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* カテゴリ追加・編集ダイアログ */}
        <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'カテゴリを編集' : '新しいカテゴリを追加'}
              </DialogTitle>
              <DialogDescription>
                カテゴリの名前と説明を設定してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryName" className="text-right">
                  カテゴリ名
                </Label>
                <Input
                  id="categoryName"
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="カテゴリ名を入力"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="categoryDescription" className="text-right mt-2">
                  説明
                </Label>
                <Textarea
                  id="categoryDescription"
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  placeholder="カテゴリの説明（オプション）"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryColor" className="text-right">
                  カラー
                </Label>
                <Select
                  value={newCategoryData.color}
                  onValueChange={(value) => {
                    const colorMap: Record<string, string> = {
                      'text-blue-600': 'bg-blue-100 border-blue-300',
                      'text-green-600': 'bg-green-100 border-green-300',
                      'text-red-600': 'bg-red-100 border-red-300',
                      'text-yellow-600': 'bg-yellow-100 border-yellow-300',
                      'text-purple-600': 'bg-purple-100 border-purple-300',
                      'text-orange-600': 'bg-orange-100 border-orange-300',
                      'text-gray-600': 'bg-gray-100 border-gray-300'
                    };
                    setNewCategoryData(prev => ({ 
                      ...prev, 
                      color: value,
                      bgColor: colorMap[value] || 'bg-blue-100 border-blue-300'
                    }));
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="カラーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-blue-600">ブルー</SelectItem>
                    <SelectItem value="text-green-600">グリーン</SelectItem>
                    <SelectItem value="text-red-600">レッド</SelectItem>
                    <SelectItem value="text-yellow-600">イエロー</SelectItem>
                    <SelectItem value="text-purple-600">パープル</SelectItem>
                    <SelectItem value="text-orange-600">オレンジ</SelectItem>
                    <SelectItem value="text-gray-600">グレー</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryIcon" className="text-right">
                  アイコン
                </Label>
                <Select
                  value={newCategoryData.iconName}
                  onValueChange={(value) => setNewCategoryData(prev => ({ ...prev, iconName: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="アイコンを選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableIcons.map(iconOption => {
                      const IconComponent = iconOption.icon;
                      return (
                        <SelectItem key={iconOption.name} value={iconOption.name}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className={`w-4 h-4 ${newCategoryData.color}`} />
                            <span>{iconOption.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* プレビュー */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">プレビュー</Label>
                <div className="col-span-3">
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-md ${newCategoryData.bgColor}`}>
                    {(() => {
                      const selectedIconComponent = availableIcons.find(icon => icon.name === newCategoryData.iconName)?.icon || FileText;
                      const PreviewIcon = selectedIconComponent;
                      return <PreviewIcon className={`w-4 h-4 ${newCategoryData.color}`} />;
                    })()}
                    <span className="text-sm font-medium text-gray-900">
                      {newCategoryData.name || 'カテゴリ名'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={!newCategoryData.name.trim()}
              >
                {editingCategory ? '更新' : '追加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 外部連携ダイアログ */}
        <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>外部カレンダー連携</DialogTitle>
              <DialogDescription>
                GoogleカレンダーやOutlookと連携してスケジュールを同期
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                {/* Google Calendar連携セクション */}
                <div className={`p-4 border rounded-lg ${googleAuthStatus.isAuthenticated ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${googleAuthStatus.isAuthenticated ? 'bg-green-600' : 'bg-blue-600'}`}>
                        <CalendarIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">Google カレンダー</span>
                          {googleAuthStatus.isAuthenticated && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              連携済み
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {googleAuthStatus.isAuthenticated 
                            ? `連携中: ${googleAuthStatus.userEmail}` 
                            : 'Googleアカウントと連携してカレンダーを同期'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!googleAuthStatus.isAuthenticated ? (
                        <Button 
                          onClick={handleGoogleAuth}
                          disabled={googleAuthStatus.isLoading}
                        >
                          {googleAuthStatus.isLoading ? (
                            <>読み込み中...</>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              連携する
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleGoogleSync}
                          disabled={syncStatus.isLoading}
                          variant="outline"
                        >
                          {syncStatus.isLoading ? (
                            <>同期中...</>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4 mr-2" />
                              同期
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {googleAuthStatus.isAuthenticated && (
                    <div className="text-sm text-gray-600">
                      {syncStatus.lastSync && (
                        <p>最終同期: {syncStatus.lastSync.toLocaleString('ja-JP')}</p>
                      )}
                      {syncStatus.syncedCount !== undefined && (
                        <p>同期済みイベント: {syncStatus.syncedCount} 件</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Outlook連携（準備中） */}
                <div className="p-4 border rounded-lg opacity-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <CalendarIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Outlook カレンダー</span>
                        <p className="text-sm text-gray-500">Microsoft Outlookとの連携（準備中）</p>
                      </div>
                    </div>
                    <Button disabled>
                      準備中
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIntegrationDialog(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* イベント作成・編集ダイアログ */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isNewEvent ? "新しい予定を作成" : "予定を編集"}
              </DialogTitle>
              <DialogDescription>
                製造スケジュールや重要な予定を管理します
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  タイトル
                </Label>
                <Input
                  id="title"
                  value={newEvent.title || ""}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="col-span-3"
                  placeholder="予定のタイトルを入力"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right mt-2">
                  説明
                </Label>
                <Textarea
                  id="description"
                  value={newEvent.description || ""}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="col-span-3"
                  placeholder="詳細説明（オプション）"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  開始日時
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="startDate"
                    type="date"
                    value={newEvent.start ? newEvent.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      const oldStart = newEvent.start || new Date();
                      date.setHours(oldStart.getHours(), oldStart.getMinutes());
                      setNewEvent({...newEvent, start: date});
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={newEvent.start ? `${String(newEvent.start.getHours()).padStart(2, '0')}:${String(newEvent.start.getMinutes()).padStart(2, '0')}` : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = newEvent.start || new Date();
                      date.setHours(parseInt(hours), parseInt(minutes));
                      setNewEvent({...newEvent, start: date});
                    }}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  終了日時
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="endDate"
                    type="date"
                    value={newEvent.end ? newEvent.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      const oldEnd = newEvent.end || new Date();
                      date.setHours(oldEnd.getHours(), oldEnd.getMinutes());
                      setNewEvent({...newEvent, end: date});
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={newEvent.end ? `${String(newEvent.end.getHours()).padStart(2, '0')}:${String(newEvent.end.getMinutes()).padStart(2, '0')}` : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = newEvent.end || new Date();
                      date.setHours(parseInt(hours), parseInt(minutes));
                      setNewEvent({...newEvent, end: date});
                    }}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  カテゴリ
                </Label>
                <Select
                  value={newEvent.category?.id}
                  onValueChange={(value) => {
                    const category = eventCategories.find(cat => cat.id === value);
                    setNewEvent({...newEvent, category});
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCategories.map(category => {
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

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  優先度
                </Label>
                <Select
                  value={newEvent.priority}
                  onValueChange={(value: CalendarEvent["priority"]) => 
                    setNewEvent({...newEvent, priority: value})
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="優先度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">緊急</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  場所
                </Label>
                <Input
                  id="location"
                  value={newEvent.location || ""}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  className="col-span-3"
                  placeholder="開催場所（オプション）"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  担当部署
                </Label>
                <Select
                  value={newEvent.department}
                  onValueChange={(value) => setNewEvent({...newEvent, department: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="担当部署を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="生産部">生産部</SelectItem>
                    <SelectItem value="品質管理部">品質管理部</SelectItem>
                    <SelectItem value="保全部">保全部</SelectItem>
                    <SelectItem value="営業部">営業部</SelectItem>
                    <SelectItem value="総務部">総務部</SelectItem>
                    <SelectItem value="全社">全社</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              {!isNewEvent && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  className="mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveEvent} disabled={!newEvent.title}>
                {isNewEvent ? "作成" : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GoogleLikeCalendar;