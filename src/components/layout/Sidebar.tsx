"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/app/chat/hooks/useChat";
import { getRoleDisplayName } from "@/lib/firebase/auth";
import {
  Home,
  ClipboardList,
  Target,
  Clock,
  FileText,
  Calendar,
  Users,
  Settings,
  Pin,
  PinOff,
  Plus,
  Search,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  User,
  Building2,
  FolderOpen,
  MessageCircle,
  Wrench,
  BookOpen,
  Zap,
  HelpCircle,
  Activity,
  Megaphone,
  ChevronUp,
  LogOut,
  ChevronRight,
  CheckSquare,
  StickyNote,
} from "lucide-react";

// 型定義
interface SubItem {
  label: string;
  icon: any;
  path: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  subItems: SubItem[];
}

const menuItems: MenuItem[] = [
  {
    id: "home",
    label: "ホーム",
    icon: Home,
    subItems: [
      { label: "ダッシュボード", icon: BarChart3, path: "/" },
      { label: "全体周知", icon: Megaphone, path: "/announcements" },
      { label: "通知管理", icon: Bell, path: "/notifications" },
    ],
  },
  {
    id: "project",
    label: "プロジェクト管理",
    icon: ClipboardList,
    subItems: [
      { label: "受注案件", icon: Building2, path: "/orders" },
      { label: "工程リスト", icon: Target, path: "/tasks" },
      { label: "工数管理", icon: Clock, path: "/work-hours" },
      { label: "顧客先管理", icon: Users, path: "/partners" },
    ],
  },
  {
    id: "reports",
    label: "日報・記録",
    icon: FileText,
    subItems: [
      { label: "日報作成", icon: Plus, path: "/daily-reports" },
      { label: "日報一覧", icon: Archive, path: "/daily-reports/history" },
      { label: "不具合報告", icon: AlertTriangle, path: "/defect-reports" },
    ],
  },
  {
    id: "documents",
    label: "ファイル・資料",
    icon: FolderOpen,
    subItems: [
      { label: "ファイル管理", icon: FolderOpen, path: "/files" },
      { label: "工具管理", icon: Wrench, path: "/tools" },
      { label: "図面管理", icon: FileText, path: "/drawings" },
      { label: "納品書", icon: BookOpen, path: "/delivery-notes" },
    ],
  },
  {
    id: "admin",
    label: "管理・設定",
    icon: Settings,
    subItems: [
      { label: "メンバー管理", icon: Users, path: "/company/members" },
      { label: "外部連携設定", icon: Zap, path: "/integrations" },
      { label: "操作履歴", icon: Activity, path: "/audit-logs" },
      { label: "ヘルプ", icon: HelpCircle, path: "/help" },
    ],
  },
];

export default function ModernSidebar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [pinned, setPinned] = useState<boolean>(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // チャットの未読数を取得
  const chatHook = user ? useChat(user) : null;
  useEffect(() => {
    if (chatHook && user) {
      const updateUnreadCount = () => {
        try {
          const count = chatHook.getUnreadCount();
          setUnreadChatCount(count);
        } catch (error) {
          console.warn('Failed to get unread count:', error);
        }
      };
      
      updateUnreadCount();
      const interval = setInterval(updateUnreadCount, 5000); // 5秒ごとに更新
      
      return () => clearInterval(interval);
    }
  }, [chatHook, user]);

  // ユーザーメニューの項目定義
  const userMenuItems = [
    { label: "プロフィール", icon: User, path: "/profile" },
    { label: "設定", icon: Settings, path: "/settings" },
    { label: "ログアウト", icon: LogOut, action: "logout", divider: true },
  ];

  const isExpanded = pinned || hoveredItem !== null;


  // アイテムの展開/折りたたみ
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // マウスリーブ時の遅延処理
  const handleMouseLeave = () => {
    if (!pinned) {
      timeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
      }, 300);
    }
  };

  // マウスエンター時の遅延キャンセル
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredItem("sidebar");
  };

  // サイドバー外クリックでピン解除
  useEffect(() => {
    if (!pinned) return;
    const handleClick = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        e.target instanceof Node &&
        !sidebarRef.current.contains(e.target)
      ) {
        setPinned(false);
        setHoveredItem(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pinned]);

  // ユーザーメニュー外クリックで閉じる
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        e.target instanceof Node &&
        !userMenuRef.current.contains(e.target)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserMenu]);

  return (
    <div
      ref={sidebarRef}
      className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out ${
        isExpanded ? "w-64" : "w-16"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-full bg-slate-800 dark:bg-slate-900 backdrop-blur-sm border-r border-slate-700 dark:border-slate-800 shadow-lg flex flex-col py-4 overflow-hidden transition-colors duration-300">
        {/* ロゴ */}
        <div className="mb-8 px-3">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-lg">U</span>
            </div>
            <div className={`ml-3 flex items-center justify-between flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <h1 className="text-white dark:text-white font-semibold text-lg whitespace-nowrap">Unica</h1>
              <button
                onClick={() => setPinned(!pinned)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-800 flex-shrink-0"
              >
                {pinned ? (
                  <PinOff className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                ) : (
                  <Pin className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* メニューアイテム */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = expandedItems.includes(item.id);
            
            return (
              <div key={item.id}>
                <button
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? "bg-slate-200 dark:bg-slate-700/50" 
                      : "hover:bg-slate-200 dark:hover:bg-slate-700/30"
                  }`}
                  onClick={() => toggleExpanded(item.id)}
                >
                  {/* アクティブ時の左側のアクセントバー */}
                  <div className={`
                    absolute left-0 top-2 bottom-2 w-1 bg-indigo-400 rounded-r-full
                    transition-all duration-300
                    ${isActive ? 'opacity-100' : 'opacity-0'}
                  `} />
                  
                  {/* アイコン */}
                  <Icon className={`
                    w-6 h-6 transition-all duration-300 flex-shrink-0
                    ${isActive 
                      ? 'text-indigo-400 dark:text-indigo-300' 
                      : 'text-slate-300 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white'
                    }
                  `} />
                  
                  <div className={`ml-3 flex items-center justify-between flex-1 transition-all duration-300 ${
                    isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
                  }`}>
                    <span className={`
                      font-medium whitespace-nowrap
                      ${isActive ? 'text-white dark:text-white' : 'text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white'}
                    `}>
                      {item.label}
                    </span>
                    <ChevronRight className={`
                      w-4 h-4 transition-all duration-300 flex-shrink-0
                      ${isActive 
                        ? 'rotate-90 text-indigo-600 dark:text-indigo-300' 
                        : 'text-slate-500 dark:text-slate-500'
                      }
                    `} />
                  </div>
                </button>
                
                {/* サブメニュー */}
                {isExpanded && isActive && (
                  <div className="ml-9 mt-1 space-y-0.5 opacity-0 animate-slideDown">
                    {item.subItems.map((subItem, index) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => router.push(subItem.path)}
                          className="w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group"
                        >
                          <SubIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-200 dark:group-hover:text-slate-200 transition-colors" />
                          <span className="ml-3 text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white transition-colors">
                            {subItem.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 下部のクイックアクセス */}
        <div className="px-2 space-y-1 border-t border-slate-300 dark:border-slate-700 pt-4">
          {/* クイックアクセス */}
          <button 
            className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group"
            onClick={() => router.push("/shortcuts")}
          >
            <Zap className="w-6 h-6 text-slate-300 dark:text-slate-400 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-all duration-300 flex-shrink-0" />
            <div className={`ml-3 flex items-center flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white font-medium whitespace-nowrap">
                クイックアクセス
              </span>
            </div>
          </button>
          
          {/* タスク管理 */}
          <button 
            className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group"
            onClick={() => router.push("/task")}
          >
            <CheckSquare className="w-6 h-6 text-slate-300 dark:text-slate-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-300 flex-shrink-0" />
            <div className={`ml-3 flex items-center flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white font-medium whitespace-nowrap">
                タスク管理
              </span>
            </div>
          </button>
          
          {/* メモ */}
          <button 
            className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group"
            onClick={() => router.push("/notes")}
          >
            <StickyNote className="w-6 h-6 text-slate-300 dark:text-slate-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-all duration-300 flex-shrink-0" />
            <div className={`ml-3 flex items-center flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white font-medium whitespace-nowrap">
                メモ
              </span>
            </div>
          </button>
          
          {/* カレンダー */}
          <button 
            className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group"
            onClick={() => router.push("/calendar")}
          >
            <Calendar className="w-6 h-6 text-slate-300 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300 flex-shrink-0" />
            <div className={`ml-3 flex items-center flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white font-medium whitespace-nowrap">
                カレンダー
              </span>
            </div>
          </button>
          
          {/* チャット */}
          <button 
            className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group relative"
            onClick={() => {
              router.push("/chat");
              setUnreadChatCount(0);
            }}
          >
            <MessageCircle className="w-6 h-6 text-slate-300 dark:text-slate-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-all duration-300 flex-shrink-0" />
            {unreadChatCount > 0 && (
              <div className="absolute left-8 top-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </div>
            )}
            <div className={`ml-3 flex items-center flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white font-medium whitespace-nowrap">
                チャット
              </span>
            </div>
          </button>
          
          {/* 検索 */}
          <button 
            className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 group"
            onClick={() => router.push("/search")}
          >
            <Search className="w-6 h-6 text-slate-300 dark:text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-all duration-300 flex-shrink-0" />
            <div className={`ml-3 flex items-center flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-slate-300 dark:text-slate-300 group-hover:text-white dark:group-hover:text-white font-medium whitespace-nowrap">
                検索
              </span>
            </div>
          </button>

        </div>
        
        {/* ユーザー設定 */}
        <div className="mt-2 relative" style={{ paddingLeft: '16px' }} ref={userMenuRef}>
          <div className="flex items-center py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className={`ml-3 flex items-center justify-between flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <div className="text-left">
                <div className="text-sm font-semibold text-white dark:text-white whitespace-nowrap">
                  {user?.name || 'ユーザー'}
                </div>
                <div className="text-xs text-slate-300 dark:text-slate-400 whitespace-nowrap">
                  {user?.role ? getRoleDisplayName(user.role) : ''} · {user?.department || ''}
                </div>
              </div>
              <ChevronUp className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 flex-shrink-0 ${
                showUserMenu ? 'rotate-180' : ''
              }`} />
            </div>
          </div>
          
          {/* ユーザーメニュードロップダウン */}
          {showUserMenu && isExpanded && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-300 dark:border-slate-600 py-2 opacity-0 animate-slideUp">
              {userMenuItems.map((item, index) => {
                const Icon = item.icon;
                const isDivider = item.divider;
                
                return (
                  <div key={index}>
                    {isDivider && <div className="border-t border-slate-300 dark:border-slate-600 my-2" />}
                    <button
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors ${
                        item.label === "ログアウト" ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-slate-700 dark:text-slate-300"
                      }`}
                      onClick={async () => {
                        console.log('🔘 User menu item clicked:', item.label, item.path || item.action);
                        setShowUserMenu(false);
                        if (item.action === "logout") {
                          try {
                            await logout();
                            router.push("/login");
                          } catch (error) {
                            console.error("Logout error:", error);
                          }
                        } else if (item.path) {
                          console.log('📍 Navigating to:', item.path);
                          router.push(item.path);
                        }
                      }}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}