"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  ClipboardList,
  Target,
  Clock,
  FileText,
  QrCode,
  Calendar,
  Users,
  Settings,
  Pin,
  PinOff,
  Plus,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Archive,
  BarChart3,
  Bell,
  User,
  Building2,
  Package,
  Truck,
  FolderOpen,
  MessageCircle,
  Shield,
  Wrench,
  BookOpen,
  Star,
  Zap,
  HelpCircle,
  Activity,
  Megaphone,
  Keyboard,
  ChevronUp,
  LogOut,
} from "lucide-react";

// 型定義
interface SubItem {
  label: string;
  icon: any;
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
      { label: "ダッシュボード", icon: BarChart3 },
      { label: "全体周知", icon: Megaphone },
      { label: "通知管理", icon: Bell },
    ],
  },
  {
    id: "project",
    label: "プロジェクト管理",
    icon: ClipboardList,
    subItems: [
      { label: "受注案件", icon: Building2 },
      { label: "工程リスト", icon: Target },
      { label: "工数管理", icon: Clock },
      { label: "顧客先管理", icon: Users },
    ],
  },
  {
    id: "reports",
    label: "日報・記録",
    icon: FileText,
    subItems: [
      { label: "日報作成", icon: Plus },
      { label: "日報一覧", icon: Archive },
      { label: "不具合報告", icon: AlertTriangle },
    ],
  },
  {
    id: "documents",
    label: "ファイル・資料",
    icon: FolderOpen,
    subItems: [
      { label: "ファイル管理", icon: FolderOpen },
      { label: "工具管理", icon: Wrench },
      { label: "図面管理", icon: FileText },
      { label: "納品書", icon: BookOpen },
    ],
  },
  {
    id: "admin",
    label: "管理・設定",
    icon: Settings,
    subItems: [
      { label: "外部連携設定", icon: Zap },
      { label: "操作履歴", icon: Activity },
      { label: "ヘルプ", icon: HelpCircle },
    ],
  },
];

export default function PerplexitySidebar() {
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [pinned, setPinned] = useState<boolean>(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(5);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ユーザーメニューの項目定義
  const userMenuItems = [
    { label: "プロフィール", icon: User, path: "/profile" },
    { label: "設定", icon: Settings, path: "/settings" },
    { label: "ログアウト", icon: LogOut, path: "/logout", divider: true },
  ];

  const isExpanded = pinned || hoveredItem !== null;

  // マウスリーブ時の遅延処理
  const handleMouseLeave = () => {
    if (!pinned) {
      timeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
        setExpandedItem(null);
      }, 100);
    }
  };

  // マウスエンター時の遅延キャンセル
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
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
        setExpandedItem(null);
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
      className="fixed top-0 left-0 h-full z-50 flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 左側の細いバー（アイコンのみ） */}
      <div className="w-16 h-full bg-slate-800 backdrop-blur-sm border-r border-slate-700 shadow-lg flex flex-col items-center py-4">
        {/* ロゴ */}
        <div className="w-12 h-12 bg-indigo-600 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md mb-6 border border-indigo-500">
          <span className="text-white font-bold text-xl">U</span>
        </div>

        {/* メニューアイテム */}
        <nav className="flex flex-col items-center space-y-3 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = expandedItem === item.id;
            return (
              <button
                key={item.id}
                className={`
                  w-13 h-10 rounded-md flex items-center justify-center
                  transition-all duration-200 border
                  ${
                    isActive
                      ? "bg-slate-600 shadow-md border-slate-500 text-white"
                      : "bg-slate-700 hover:bg-slate-600 border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white"
                  }
                `}
                onMouseEnter={() => {
                  setHoveredItem(item.id);
                  setExpandedItem(item.id);
                }}
                onClick={() => {
                  if (expandedItem === item.id) {
                    setPinned(!pinned);
                  } else {
                    setExpandedItem(item.id);
                    setPinned(true);
                  }
                }}
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          })}
        </nav>

        {/* クイックアクセスボタン */}
        <button 
          className="w-12 h-12 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 flex items-center justify-center transition-all duration-200 text-slate-300 hover:text-white mb-2"
          onClick={() => router.push("/shortcuts")}
        >
          <Zap className="w-6 h-6" />
        </button>

        {/* カレンダーボタン */}
        <button 
          className="w-12 h-12 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 flex items-center justify-center transition-all duration-200 text-slate-300 hover:text-white mb-2"
          onClick={() => router.push("/calendar")}
        >
          <Calendar className="w-6 h-6" />
        </button>
        
        {/* チャットボタン */}
        <button 
          className="w-12 h-12 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 flex items-center justify-center transition-all duration-200 text-slate-300 hover:text-white mb-2 relative"
          onClick={() => {
            router.push("/chat");
            setUnreadChatCount(0); // チャットページを開いたら未読数をリセット
          }}
        >
          <MessageCircle className="w-6 h-6" />
          {unreadChatCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </div>
          )}
        </button>

        {/* 検索ボタン */}
        <button 
          className="w-12 h-12 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 flex items-center justify-center transition-all duration-200 text-slate-300 hover:text-white mb-4"
          onClick={() => router.push("/search")}
        >
          <Search className="w-6 h-6" />
        </button>
        
        {/* ユーザー設定パネル (Discord風) */}
        <div className="relative" ref={userMenuRef}>
          <button 
            className="w-14 h-14 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 p-1 cursor-pointer group transition-all duration-200"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="flex items-center justify-center w-full h-full">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                U
              </div>
            </div>
          </button>
          
          {/* ユーザーメニュードロップダウン */}
          {showUserMenu && (
            <div className="absolute bottom-full left-16 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
              {/* ユーザー情報ヘッダー */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    U
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">管理者</div>
                    <div className="text-sm text-gray-500">admin@unica.com</div>
                  </div>
                </div>
              </div>
              
              {/* メニュー項目 */}
              <div className="py-2">
                {userMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isDivider = item.divider;
                  
                  return (
                    <div key={index}>
                      {isDivider && <div className="border-t border-gray-100 my-2" />}
                      <button
                        className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                          item.label === "ログアウト" ? "text-red-600 hover:bg-red-50" : "text-gray-700"
                        }`}
                        onClick={() => {
                          setShowUserMenu(false);
                          if (item.path === "/logout") {
                            // ログアウト処理
                            console.log("ログアウト実行");
                          } else {
                            router.push(item.path);
                          }
                        }}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右側の展開パネル */}
      <div
        className={`
        h-full bg-slate-700 backdrop-blur-sm border-r border-slate-600 shadow-lg
        transition-all duration-300 ease-out overflow-hidden
        ${isExpanded ? "w-64 opacity-100" : "w-0 opacity-0"}
      `}
      >
        {expandedItem && (
          <div className="p-6 h-full flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {(() => {
                  const currentItem = menuItems.find(
                    (item) => item.id === expandedItem
                  );
                  if (currentItem) {
                    const Icon = currentItem.icon;
                    return (
                      <>
                        <Icon className="w-7 h-7 text-slate-200" />
                        <h2 className="text-xl font-semibold text-white">
                          {currentItem.label}
                        </h2>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
              <button
                onClick={() => setPinned(!pinned)}
                className={`
                  w-9 h-9 rounded-lg flex items-center justify-center
                  transition-all duration-200 border
                  ${
                    pinned
                      ? "bg-slate-600 border-slate-500 text-white"
                      : "bg-slate-800 hover:bg-slate-600 border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white"
                  }
                `}
              >
                {pinned ? (
                  <PinOff className="w-5 h-5" />
                ) : (
                  <Pin className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* サブメニュー */}
            <div className="flex-1 space-y-2">
              {(() => {
                const currentItem = menuItems.find(
                  (item) => item.id === expandedItem
                );
                if (currentItem && currentItem.subItems) {
                  return currentItem.subItems.map((subItem, index) => {
                    const SubIcon = subItem.icon;
                    return (
                      <button
                        key={index}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 transition-all duration-200 group"
                        onClick={() => {
                          // ホーム
                          if (subItem.label === "ダッシュボード") router.push("/");
                          if (subItem.label === "全体周知") router.push("/announcements");
                          if (subItem.label === "通知管理") router.push("/notifications");
                          
                          // プロジェクト管理
                          if (subItem.label === "受注案件") router.push("/orders");
                          if (subItem.label === "工程リスト") router.push("/tasks");
                          if (subItem.label === "工数管理") router.push("/work-hours");
                          if (subItem.label === "顧客先管理") router.push("/partners");
                          
                          // 日報・記録
                          if (subItem.label === "日報作成") router.push("/daily-reports");
                          if (subItem.label === "日報一覧") router.push("/daily-reports/history");
                          if (subItem.label === "不具合報告") router.push("/defect-reports");
                          
                          // ファイル・資料
                          if (subItem.label === "ファイル管理") router.push("/files");
                          if (subItem.label === "工具管理") router.push("/tools");
                          if (subItem.label === "図面管理") router.push("/drawings");
                          if (subItem.label === "納品書") router.push("/delivery-notes");
                          
                          // 管理・設定
                          if (subItem.label === "外部連携設定") router.push("/integrations");
                          if (subItem.label === "操作履歴") router.push("/audit-logs");
                          if (subItem.label === "ヘルプ") router.push("/help");
                        }}
                      >
                        <SubIcon className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                        <span className="text-slate-200 group-hover:text-white font-medium transition-colors">
                          {subItem.label}
                        </span>
                      </button>
                    );
                  });
                }
                return null;
              })()}
            </div>

            {/* フッター */}
            <div className="mt-6 pt-6 border-t border-slate-600">
              <div className="text-sm text-slate-400 text-center">
                ManufacturingHub v1.0
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
