"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  // 製造業特化のイベントカテゴリ
  const eventCategories: EventCategory[] = [
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
  ];

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
      
      const eventStart = new Date(event.start).toDateString();
      const eventEnd = new Date(event.end).toDateString();
      const targetDate = date.toDateString();
      
      return eventStart === targetDate || 
             (event.isAllDay && (eventStart <= targetDate && eventEnd >= targetDate));
    });
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

  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
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
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                今日
              </Button>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                  className="border-none"
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
                  className="border-none"
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
                onClick={() => handleCreateEvent()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                予定を作成
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* サイドバー */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* ミニカレンダー */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-3">
                {currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
              </div>
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
                        py-1 text-xs rounded transition-colors
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

            {/* カテゴリフィルター */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  カテゴリ
                </h3>
                <div className="space-y-2">
                  {eventCategories.map(category => {
                    const Icon = category.icon;
                    const isVisible = visibleCategories.includes(category.id);
                    
                    return (
                      <button
                        key={category.id}
                        className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <Icon className={`w-4 h-4 ${category.color}`} />
                          <span className="text-sm text-gray-700">{category.name}</span>
                        </div>
                        {isVisible ? (
                          <Eye className="w-4 h-4 text-gray-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 今日の予定 */}
              <div className="p-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  今日の予定 ({getEventsForDate(today).length})
                </h3>
                <div className="space-y-2">
                  {getEventsForDate(today).map(event => {
                    const Icon = event.category.icon;
                    return (
                      <div
                        key={event.id}
                        className={`p-2 rounded border-l-3 cursor-pointer hover:bg-gray-50 ${event.category.bgColor} ${getPriorityColor(event.priority)}`}
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
            </div>
          </div>

          {/* メインカレンダー表示 */}
          <div className="flex-1 overflow-auto">
            {viewMode === "month" && (
              <div className="p-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"].map((day, index) => (
                      <div key={day} className={`p-4 text-center font-semibold ${index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"}`}>
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* カレンダーグリッド */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDate(day);
                      const isToday = day.toDateString() === today.toDateString();
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      
                      return (
                        <div
                          key={index}
                          className={`min-h-[120px] p-2 border-r border-b border-gray-100 ${
                            !isCurrentMonth ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                          } cursor-pointer transition-colors`}
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
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => {
                              const Icon = event.category.icon;
                              return (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${event.category.bgColor} ${getPriorityColor(event.priority)}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditEvent(event);
                                  }}
                                >
                                  <div className="flex items-center space-x-1">
                                    <Icon className={`w-2 h-2 ${event.category.color}`} />
                                    <span className="truncate font-medium">
                                      {event.isAllDay ? event.title : 
                                        `${event.start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} ${event.title}`
                                      }
                                    </span>
                                    {event.priority === "urgent" && (
                                      <Zap className="w-2 h-2 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{dayEvents.length - 3} 件
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 週表示と日表示は簡略化 */}
            {(viewMode === "week" || viewMode === "day") && (
              <div className="p-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                      <CalendarViewIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">
                        {viewMode === "week" ? "週表示" : "日表示"}
                      </h3>
                      <p>この表示モードは開発中です。</p>
                      <p className="text-sm mt-2">月表示をご利用ください。</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

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