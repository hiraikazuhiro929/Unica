"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Hash,
  Plus,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Users,
  Settings,
  Volume2,
  VolumeX,
  Search,
  Bell,
  BellOff,
  Phone,
  Video,
  Pin,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  MessageSquare,
  AlertTriangle,
  Clock,
  Building2,
  Wrench,
  CheckCircle,
  UserPlus,
  Calendar,
  FileText,
  Image,
  Zap,
} from "lucide-react";

// 型定義
interface Channel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
  category?: string;
  description?: string;
  unreadCount?: number;
  isPrivate?: boolean;
  members?: string[];
}

interface Message {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    status: "online" | "away" | "busy" | "offline";
  };
  timestamp: Date;
  edited?: Date;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: string;
  type: "message" | "system" | "announcement";
  priority?: "low" | "normal" | "high" | "urgent";
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "document" | "video" | "audio";
  size: number;
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface User {
  id: string;
  name: string;
  role: string;
  status: "online" | "away" | "busy" | "offline";
  avatar?: string;
  department: string;
}

const DiscordLikeChat = () => {
  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserList, setShowUserList] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // サンプルチャンネルデータ（製造業特化）
  const channels: Channel[] = [
    {
      id: "general",
      name: "全体連絡",
      type: "announcement",
      category: "全社",
      description: "全社員向けの重要なお知らせ",
      unreadCount: 2,
    },
    {
      id: "production",
      name: "生産チーム",
      type: "text",
      category: "部門",
      description: "生産部門での連絡・調整",
      unreadCount: 5,
    },
    {
      id: "quality",
      name: "品質管理",
      type: "text",
      category: "部門",
      description: "品質に関する情報共有",
    },
    {
      id: "maintenance",
      name: "設備保全",
      type: "text",
      category: "部門",
      description: "設備メンテナンス情報",
      unreadCount: 1,
    },
    {
      id: "emergency",
      name: "緊急連絡",
      type: "announcement",
      category: "重要",
      description: "緊急時の連絡用",
      unreadCount: 0,
    },
    {
      id: "projects",
      name: "プロジェクト管理",
      type: "text",
      category: "業務",
      description: "プロジェクトの進捗共有",
    },
    {
      id: "safety",
      name: "安全管理",
      type: "text",
      category: "重要",
      description: "安全に関する情報共有",
    },
    {
      id: "random",
      name: "雑談",
      type: "text",
      category: "その他",
      description: "自由な雑談スペース",
    },
  ];

  // サンプルメッセージデータ
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "おはようございます！本日の生産計画について確認をお願いします。",
      author: {
        id: "user1",
        name: "田中部長",
        role: "生産部長",
        status: "online",
      },
      timestamp: new Date(Date.now() - 3600000),
      type: "message",
      priority: "high",
    },
    {
      id: "2",
      content: "A製品の加工が完了しました。品質チェックをお願いします。",
      author: {
        id: "user2",
        name: "佐藤作業員",
        role: "加工担当",
        status: "online",
      },
      timestamp: new Date(Date.now() - 1800000),
      type: "message",
      reactions: [
        { emoji: "👍", count: 2, users: ["user1", "user3"] },
        { emoji: "✅", count: 1, users: ["user4"] },
      ],
    },
    {
      id: "3",
      content: "設備メンテナンス完了のお知らせ",
      author: {
        id: "system",
        name: "システム",
        role: "システム",
        status: "online",
      },
      timestamp: new Date(Date.now() - 900000),
      type: "system",
    },
    {
      id: "4",
      content: "明日の安全会議の資料を共有します。",
      author: {
        id: "user3",
        name: "鈴木課長",
        role: "品質管理課長",
        status: "away",
      },
      timestamp: new Date(Date.now() - 300000),
      type: "message",
      attachments: [
        {
          id: "att1",
          name: "安全会議資料.pdf",
          url: "#",
          type: "document",
          size: 2048000,
        },
      ],
    },
  ]);

  // サンプルユーザーデータ
  const users: User[] = [
    {
      id: "user1",
      name: "田中部長",
      role: "生産部長",
      status: "online",
      department: "生産部",
    },
    {
      id: "user2",
      name: "佐藤作業員",
      role: "加工担当",
      status: "online",
      department: "生産部",
    },
    {
      id: "user3",
      name: "鈴木課長",
      role: "品質管理課長",
      status: "away",
      department: "品質管理部",
    },
    {
      id: "user4",
      name: "山田技師",
      role: "設備保全",
      status: "busy",
      department: "保全部",
    },
    {
      id: "user5",
      name: "伊藤主任",
      role: "安全管理",
      status: "offline",
      department: "総務部",
    },
  ];

  // オンラインユーザー数を計算
  const onlineUsers = users.filter(user => user.status === "online").length;

  const currentChannel = channels.find((ch) => ch.id === selectedChannel);

  // メッセージ送信
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageInput,
      author: {
        id: "current-user",
        name: "あなた",
        role: "ユーザー",
        status: "online",
      },
      timestamp: new Date(),
      type: "message",
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  // ファイル添付
  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  // リアクション追加
  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions?.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1, users: [...r.users, "current-user"] }
                : r
            ),
          };
        } else {
          return {
            ...msg,
            reactions: [
              ...(msg.reactions || []),
              { emoji, count: 1, users: ["current-user"] }
            ],
          };
        }
      }
      return msg;
    }));
  };

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getChannelIcon = (channel: Channel) => {
    switch (channel.type) {
      case "announcement":
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case "voice":
        return <Volume2 className="w-4 h-4 text-green-500" />;
      default:
        return <Hash className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority?: Message["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-red-500 bg-red-50";
      case "high":
        return "border-l-4 border-orange-500 bg-orange-50";
      case "normal":
        return "";
      case "low":
        return "border-l-4 border-gray-300";
      default:
        return "";
    }
  };

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen bg-white flex ml-16">
      {/* チャンネルサイドバー */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* サーバーヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">Unica製造チーム</h2>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{onlineUsers}人がオンライン</p>
        </div>

        {/* チャンネルリスト */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(
            channels.reduce((acc, channel) => {
              const category = channel.category || "その他";
              if (!acc[category]) acc[category] = [];
              acc[category].push(channel);
              return acc;
            }, {} as Record<string, Channel[]>)
          ).map(([category, categoryChannels]) => (
            <div key={category} className="mb-4">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span>{category}</span>
                <Plus className="w-3 h-3 hover:text-gray-700 cursor-pointer" />
              </div>
              {categoryChannels.map((channel) => (
                <button
                  key={channel.id}
                  className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-gray-100 transition-colors ${
                    selectedChannel === channel.id ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700"
                  }`}
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  {getChannelIcon(channel)}
                  <span className="flex-1 truncate">{channel.name}</span>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 min-w-0">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* チャットヘッダー */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentChannel && getChannelIcon(currentChannel)}
            <div>
              <h3 className="font-semibold text-gray-900">
                {currentChannel?.name}
              </h3>
              <p className="text-sm text-gray-600">
                {currentChannel?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Search className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowUserList(!showUserList)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex space-x-3 group hover:bg-gray-50 p-2 rounded ${getPriorityColor(message.priority)}`}
            >
              {/* アバター */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {message.author.name.charAt(0)}
                </div>
              </div>
              
              {/* メッセージ内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {message.author.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {message.author.role}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleString("ja-JP")}
                  </span>
                  {message.edited && (
                    <span className="text-xs text-gray-400">(編集済み)</span>
                  )}
                </div>
                
                <div className="text-gray-800 break-words">
                  {message.content}
                </div>

                {/* 添付ファイル */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 p-2 bg-gray-100 rounded border"
                      >
                        <FileText className="w-4 h-4 text-blue-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                            {attachment.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* リアクション */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <button
                        key={index}
                        className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                        onClick={() => handleAddReaction(message.id, reaction.emoji)}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-xs font-medium">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* メッセージアクション */}
              <div className="opacity-0 group-hover:opacity-100 flex items-start space-x-1 transition-opacity">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Smile className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Reply className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* メッセージ入力エリア */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder={`#${currentChannel?.name}にメッセージを送信...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="pr-20 min-h-[44px] resize-none"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleFileAttach}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => {
              // ファイル処理ロジック
              console.log("Files selected:", e.target.files);
            }}
          />
        </div>
      </div>

      {/* ユーザーリスト */}
      {showUserList && (
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              メンバー ({users.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {Object.entries(
              users.reduce((acc, user) => {
                if (!acc[user.status]) acc[user.status] = [];
                acc[user.status].push(user);
                return acc;
              }, {} as Record<string, User[]>)
            ).map(([status, statusUsers]) => (
              <div key={status} className="mb-4">
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {status === "online" ? "オンライン" : 
                   status === "away" ? "離席中" :
                   status === "busy" ? "取り込み中" : "オフライン"}
                  ({statusUsers.length})
                </div>
                {statusUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                          user.status
                        )}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.department}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscordLikeChat;