"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellRing,
  BellOff,
  MessageCircle,
  AtSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  Filter,
  Search,
  Check,
  Archive,
  Star,
  StarOff,
  Users,
  Calendar,
  Building2,
  Target,
  Wrench,
} from "lucide-react";

// 型定義
interface Notification {
  id: string;
  type: "mention" | "chat" | "system" | "alert" | "reminder" | "update" | "approval" | "deadline";
  title: string;
  message: string;
  sender?: string;
  department?: string;
  timestamp: Date;
  isRead: boolean;
  priority: "low" | "normal" | "high" | "urgent";
  category: string;
  relatedId?: string;
  actionRequired?: boolean;
}

const NotificationManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | Notification["type"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "read" | "unread">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | Notification["priority"]>("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // サンプル通知データ
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "alert",
      title: "設備異常検知",
      message: "機械A-001で温度異常が検知されました。至急確認してください。",
      sender: "システム",
      department: "生産管理",
      timestamp: new Date(Date.now() - 300000),
      isRead: false,
      priority: "urgent",
      category: "設備管理",
      actionRequired: true,
    },
    {
      id: "2",
      type: "mention",
      title: "工程進捗確認",
      message: "田中部長からメンション: 本日の進捗確認をお願いします。",
      sender: "田中部長",
      department: "生産部",
      timestamp: new Date(Date.now() - 900000),
      isRead: false,
      priority: "high",
      category: "工程管理",
      relatedId: "process-123",
    },
    {
      id: "3",
      type: "deadline",
      title: "納期リマインダー",
      message: "受注案件「精密部品製造」の納期まで残り2日です。",
      sender: "システム",
      timestamp: new Date(Date.now() - 1800000),
      isRead: true,
      priority: "high",
      category: "受注管理",
      relatedId: "order-456",
    },
    {
      id: "4",
      type: "chat",
      title: "チャットメッセージ",
      message: "品質管理チャンネルに新しいメッセージがあります。",
      sender: "佐藤課長",
      department: "品質管理部",
      timestamp: new Date(Date.now() - 3600000),
      isRead: true,
      priority: "normal",
      category: "コミュニケーション",
    },
    {
      id: "5",
      type: "system",
      title: "システムメンテナンス完了",
      message: "定期メンテナンスが完了しました。システムは正常に稼働しています。",
      sender: "システム管理者",
      timestamp: new Date(Date.now() - 7200000),
      isRead: true,
      priority: "low",
      category: "システム",
    },
    {
      id: "6",
      type: "approval",
      title: "承認待ち",
      message: "日報の承認待ちがあります。確認をお願いします。",
      sender: "山田主任",
      department: "総務部",
      timestamp: new Date(Date.now() - 10800000),
      isRead: false,
      priority: "normal",
      category: "日報管理",
      actionRequired: true,
    },
  ]);

  // アイコン取得
  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "mention": return <AtSign className="w-4 h-4" />;
      case "chat": return <MessageCircle className="w-4 h-4" />;
      case "system": return <Settings className="w-4 h-4" />;
      case "alert": return <AlertTriangle className="w-4 h-4" />;
      case "reminder": return <Clock className="w-4 h-4" />;
      case "update": return <Info className="w-4 h-4" />;
      case "approval": return <CheckCircle className="w-4 h-4" />;
      case "deadline": return <Calendar className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // 優先度の色取得
  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "normal": return "text-blue-600 bg-blue-50 border-blue-200";
      case "low": return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // フィルタリング
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.sender?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || notification.type === filterType;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "read" && notification.isRead) ||
                         (filterStatus === "unread" && !notification.isRead);
    const matchesPriority = filterPriority === "all" || notification.priority === filterPriority;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  // 通知の既読/未読切り替え
  const toggleRead = (notificationId: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: !notification.isRead }
        : notification
    ));
  };

  // 通知削除
  const deleteNotification = (notificationId: string) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  // 一括操作
  const bulkMarkAsRead = () => {
    setNotifications(notifications.map(notification =>
      selectedNotifications.includes(notification.id)
        ? { ...notification, isRead: true }
        : notification
    ));
    setSelectedNotifications([]);
  };

  const bulkDelete = () => {
    setNotifications(notifications.filter(n => !selectedNotifications.includes(n.id)));
    setSelectedNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Bell className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通知管理</h1>
                <p className="text-sm text-gray-600">
                  未読通知: <span className="font-bold text-red-600">{unreadCount}</span>件 / 
                  全体: <span className="font-bold text-blue-600">{notifications.length}</span>件
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="通知を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80"
                />
              </div>

              {/* フィルター */}
              <Select value={filterType} onValueChange={(value: string) => setFilterType(value as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="種類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="alert">アラート</SelectItem>
                  <SelectItem value="mention">メンション</SelectItem>
                  <SelectItem value="deadline">締切</SelectItem>
                  <SelectItem value="chat">チャット</SelectItem>
                  <SelectItem value="system">システム</SelectItem>
                  <SelectItem value="approval">承認</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(value: string) => setFilterStatus(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="unread">未読</SelectItem>
                  <SelectItem value="read">既読</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 一括操作ボタン */}
          {selectedNotifications.length > 0 && (
            <div className="mt-4 flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-blue-700">
                {selectedNotifications.length}件選択中
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={bulkMarkAsRead}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <Check className="w-4 h-4 mr-1" />
                既読にする
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={bulkDelete}
                className="text-red-600 border-red-300 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                削除
              </Button>
            </div>
          )}
        </div>

        {/* 通知リスト */}
        <div className="flex-1 overflow-auto">
          <div className="divide-y divide-gray-200">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">該当する通知が見つかりません</p>
                <p className="text-gray-400">検索条件を変更してください</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? "bg-blue-50 border-l-4 border-blue-500" : ""
                  }`}
                >
                  {/* チェックボックス */}
                  <input
                    type="checkbox"
                    className="mr-4 rounded border-gray-300"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNotifications([...selectedNotifications, notification.id]);
                      } else {
                        setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                      }
                    }}
                  />

                  {/* アイコン */}
                  <div className={`flex-shrink-0 p-2 rounded-full mr-4 ${getPriorityColor(notification.priority)}`}>
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* 通知内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold truncate ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
                        {notification.title}
                        {notification.actionRequired && (
                          <span className="ml-2 inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                            要対応
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{notification.timestamp.toLocaleString("ja-JP", { 
                          month: "short", 
                          day: "numeric", 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}</span>
                        <span className={`px-2 py-1 rounded ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm mb-1 ${!notification.isRead ? "text-gray-800" : "text-gray-500"}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {notification.sender && (
                        <span>送信者: {notification.sender}</span>
                      )}
                      {notification.department && (
                        <span>部門: {notification.department}</span>
                      )}
                      <span>カテゴリ: {notification.category}</span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRead(notification.id)}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      {notification.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManagement;