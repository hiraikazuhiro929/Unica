"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  MoreVertical,
  Edit3,
  Trash2,
  Share2,
  Star,
  Flag,
  Target,
  Grid3X3,
  List,
  User,
  Building2,
  Tag,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  Settings,
  Palette,
} from "lucide-react";

// Firebase関数とタイプのインポート
import { PersonalTask, CompanyTask } from "@/lib/firebase/tasks";
import { useTasks } from "./hooks/useTasks";

// タスクカテゴリー設定
const TASK_CATEGORIES = [
  { value: "work", label: "仕事", icon: Building2, color: "bg-blue-100 text-blue-800" },
  { value: "personal", label: "個人", icon: User, color: "bg-green-100 text-green-800" },
  { value: "learning", label: "学習", icon: Target, color: "bg-purple-100 text-purple-800" },
  { value: "meeting", label: "会議", icon: Users, color: "bg-orange-100 text-orange-800" },
  { value: "reminder", label: "リマインダー", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
];

const COMPANY_CATEGORIES = [
  { value: "general", label: "一般", icon: Building2, color: "bg-gray-100 text-gray-800" },
  { value: "manufacturing", label: "製造", icon: Target, color: "bg-blue-100 text-blue-800" },
  { value: "quality", label: "品質", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  { value: "maintenance", label: "保守", icon: PlayCircle, color: "bg-orange-100 text-orange-800" },
  { value: "safety", label: "安全", icon: AlertTriangle, color: "bg-red-100 text-red-800" },
];

// 優先度設定
const PRIORITY_LEVELS = [
  { value: "low", label: "低", color: "bg-gray-100 text-gray-600", icon: Circle },
  { value: "medium", label: "中", color: "bg-blue-100 text-blue-600", icon: Circle },
  { value: "high", label: "高", color: "bg-orange-100 text-orange-600", icon: AlertTriangle },
  { value: "urgent", label: "緊急", color: "bg-red-100 text-red-600", icon: Flag },
];

// ステータス設定
const STATUS_CONFIG = {
  pending: { label: "未着手", color: "bg-gray-100 text-gray-600", icon: Circle },
  progress: { label: "進行中", color: "bg-blue-100 text-blue-600", icon: PlayCircle },
  completed: { label: "完了", color: "bg-green-100 text-green-600", icon: CheckCircle },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-600", icon: XCircle },
};

// 表示モード
type ViewMode = "todo" | "card" | "list";

const TaskPage = () => {
  // UI状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("todo");
  const [activeTab, setActiveTab] = useState<"personal" | "company">("personal");

  // URLクエリパラメータからタブを設定
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'company' || tab === 'personal') {
      setActiveTab(tab);
    }
  }, []);
  
  // モーダル状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | CompanyTask | null>(null);
  const [taskType, setTaskType] = useState<"personal" | "company">("personal");
  
  // フォーム状態
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "work" as any,
    priority: "medium" as any,
    status: "pending" as any,
    dueDate: "",
    assignee: "",
    assigneeId: "",
    relatedProcessId: "",
  });

  // モックユーザー（実際の実装では認証から取得）
  const currentUser = {
    id: "user-123",
    name: "テストユーザー",
  };

  // カスタムフック使用
  const {
    personalTasks,
    companyTasks,
    isLoading,
    error,
    stats,
    createPersonalTaskAction,
    updatePersonalTaskAction,
    deletePersonalTaskAction,
    createCompanyTaskAction,
    updateCompanyTaskAction,
    deleteCompanyTaskAction,
    toggleTaskStatus,
  } = useTasks({
    userId: currentUser.id,
    userName: currentUser.name,
    enableRealtime: true,
    limit: 100,
  });

  // 現在のタスクリストを取得
  const currentTasks = activeTab === "personal" ? personalTasks : companyTasks;
  const currentCategories = activeTab === "personal" ? TASK_CATEGORIES : COMPANY_CATEGORIES;

  // フィルタリングされたタスク
  const filteredTasks = useMemo(() => {
    return currentTasks.filter((task) => {
      const matchesSearch = searchQuery === "" || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
      const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;
      const matchesCategory = selectedCategory === "all" || task.category === selectedCategory;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [currentTasks, searchQuery, selectedStatus, selectedPriority, selectedCategory]);

  // 統計計算
  const currentStats = useMemo(() => {
    const taskStats = activeTab === "personal" ? stats.personal : stats.company;
    return taskStats;
  }, [stats, activeTab]);

  // フォームリセット
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: activeTab === "personal" ? "work" : "general",
      priority: "medium",
      status: "pending",
      dueDate: "",
      assignee: "",
      assigneeId: "",
      relatedProcessId: "",
    });
    setEditingTask(null);
  };

  // タスク作成
  const handleCreateTask = async () => {
    if (!formData.title.trim()) return;

    if (taskType === "personal" || activeTab === "personal") {
      const taskData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        ...(formData.dueDate && { dueDate: formData.dueDate }),
        ...(formData.relatedProcessId && { relatedProcessId: formData.relatedProcessId }),
      };

      const success = await createPersonalTaskAction(taskData);
      if (success) {
        setShowCreateModal(false);
        resetForm();
      }
    } else {
      const taskData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        assignee: formData.assignee || currentUser.name,
        assigneeId: formData.assigneeId || currentUser.id,
        ...(formData.dueDate && { dueDate: formData.dueDate }),
        ...(formData.relatedProcessId && { relatedProcessId: formData.relatedProcessId }),
      };

      const success = await createCompanyTaskAction(taskData);
      if (success) {
        setShowCreateModal(false);
        resetForm();
      }
    }
  };

  // タスク更新
  const handleUpdateTask = async () => {
    if (!editingTask) return;

    const updates = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      ...(formData.dueDate && { dueDate: formData.dueDate }),
    };

    if ("userId" in editingTask) {
      // 個人タスク
      const success = await updatePersonalTaskAction(editingTask.id, updates);
      if (success) {
        setEditingTask(null);
        resetForm();
      }
    } else {
      // 会社タスク
      const companyUpdates = {
        ...updates,
        assignee: formData.assignee,
        assigneeId: formData.assigneeId,
      };
      const success = await updateCompanyTaskAction(editingTask.id, companyUpdates);
      if (success) {
        setEditingTask(null);
        resetForm();
      }
    }
  };

  // タスク削除
  const handleDeleteTask = async (task: PersonalTask | CompanyTask) => {
    if (!window.confirm("このタスクを削除しますか？")) return;

    if ("userId" in task) {
      await deletePersonalTaskAction(task.id);
    } else {
      await deleteCompanyTaskAction(task.id);
    }
  };

  // タスク編集開始
  const startEditTask = (task: PersonalTask | CompanyTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate?.split('T')[0] || "",
      assignee: "assignee" in task ? task.assignee : "",
      assigneeId: "assigneeId" in task ? task.assigneeId : "",
      relatedProcessId: task.relatedProcessId || "",
    });
  };

  // ステータス更新
  const updateTaskStatus = async (task: PersonalTask | CompanyTask, newStatus: any) => {
    await toggleTaskStatus(task, newStatus);
  };

  // カテゴリー情報を取得
  const getCategoryInfo = (category: string) => {
    return currentCategories.find(c => c.value === category) || currentCategories[0];
  };

  // 優先度情報を取得
  const getPriorityInfo = (priority: string) => {
    return PRIORITY_LEVELS.find(p => p.value === priority) || PRIORITY_LEVELS[1];
  };

  // クイック追加の状態
  const [quickAddText, setQuickAddText] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // 右クリックメニューの状態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: PersonalTask | CompanyTask;
    show: boolean;
  } | null>(null);

  // 右クリックメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // 右クリックメニューを閉じる
      if (contextMenu?.show) {
        setContextMenu(null);
      }
      
      // クイック追加フォームを閉じる
      if (showQuickAdd && quickAddRef.current && !quickAddRef.current.contains(target as Node)) {
        setShowQuickAdd(false);
        setQuickAddText("");
        resetForm();
      }
    };
    
    if (contextMenu?.show || showQuickAdd) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('contextmenu', handleClickOutside);
      };
    }
  }, [contextMenu?.show, showQuickAdd]);

  // クイック追加機能
  const handleQuickAdd = async () => {
    if (!quickAddText.trim()) return;

    const taskData = {
      title: quickAddText.trim(),
      description: "",
      category: formData.category,
      priority: formData.priority,
      status: "pending" as any,
      ...(formData.dueDate && { dueDate: formData.dueDate }),
    };

    const success = activeTab === "personal" 
      ? await createPersonalTaskAction(taskData)
      : await createCompanyTaskAction({
          ...taskData,
          assignee: currentUser.name,
          assigneeId: currentUser.id,
        });

    if (success) {
      setQuickAddText("");
      setShowQuickAdd(false);
      resetForm();
    }
  };

  // 個人タスクのスタイル選択（LocalStorageから復元）
  const [personalTaskStyle, setPersonalTaskStyle] = useState<'memo' | 'sticky' | 'minimal' | 'bubble' | 'index'>('memo');
  
  // LocalStorageからスタイル設定を読み込み
  useEffect(() => {
    const savedStyle = localStorage.getItem('personalTaskStyle') as 'memo' | 'sticky' | 'minimal' | 'bubble' | 'index';
    if (savedStyle) {
      setPersonalTaskStyle(savedStyle);
    }
  }, []);

  // スタイル変更時にLocalStorageに保存
  const handleStyleChange = (style: 'memo' | 'sticky' | 'minimal' | 'bubble' | 'index') => {
    setPersonalTaskStyle(style);
    localStorage.setItem('personalTaskStyle', style);
  };

  // 共通の右クリックハンドラー
  const handleTaskContextMenu = (e: React.MouseEvent, task: PersonalTask | CompanyTask) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      task,
      show: true
    });
  };

  // 共通のダブルクリックハンドラー
  const handleTaskDoubleClick = (task: PersonalTask | CompanyTask) => {
    startEditTask(task);
  };

  // スタイル1: メモ帳風（現在のスタイル）
  const MemoStyleItem = ({ task }: { task: PersonalTask }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <div 
        className={`group py-3 border-b border-gray-200 last:border-b-0 hover:bg-yellow-50/30 transition-colors cursor-pointer ${
          task.status === 'completed' ? 'opacity-60' : ''
        }`}
        onContextMenu={(e) => handleTaskContextMenu(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        <div className="w-full pl-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateTaskStatus(task, 
                task.status === 'completed' ? 'pending' : 'completed'
              )}
              className="flex-shrink-0"
            >
              {task.status === 'completed' ? (
                <CheckSquare className="w-4 h-4 text-green-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>

            <span className={`font-handwriting text-base ${
              task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
            }`}>
              {task.title}
            </span>
            
            {/* 期限を控えめにタイトル右側に */}
            {task.dueDate && (
              <span className={`text-xs ml-4 ${
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric'
                })}
              </span>
            )}
            
            {/* 優先度アイコン */}
            {task.priority === 'urgent' && <span className="text-red-500">🔥</span>}
            {task.priority === 'high' && <span className="text-orange-500">⭐</span>}
          </div>
          
          {/* 説明を下段に */}
          {task.description && (
            <div className="text-sm text-gray-500 italic mt-1 pl-8">
              {task.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  // スタイル2: 付箋紙風
  const StickyStyleItem = ({ task }: { task: PersonalTask }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const stickyColors = ['bg-yellow-100', 'bg-blue-100', 'bg-green-100', 'bg-pink-100', 'bg-purple-100'];
    const colorIndex = task.id.length % stickyColors.length;

    return (
      <div 
        className={`group mb-3 p-3 rounded-lg shadow-sm transform hover:scale-[1.02] transition-all duration-200 cursor-pointer ${
          stickyColors[colorIndex]
        } ${task.status === 'completed' ? 'opacity-60 scale-95' : ''} ${isOverdue ? 'ring-2 ring-red-300' : ''}`}
        onContextMenu={(e) => handleTaskContextMenu(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => updateTaskStatus(task, 
              task.status === 'completed' ? 'pending' : 'completed'
            )}
            className="flex-shrink-0 mt-0.5"
          >
            {task.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-700" />
            ) : (
              <Circle className="w-5 h-5 text-gray-600 hover:text-gray-800" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-gray-800 ${
              task.status === 'completed' ? 'line-through text-gray-600' : ''
            }`}>
              {task.title}
              {/* 期限をタイトルのすぐ右に */}
              {task.dueDate && (
                <span className={`text-xs ml-4 ${
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                }`}>
                  {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </span>
              )}
            </h3>
            
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-2">
                {task.priority === 'urgent' && <span className="bg-red-200 px-2 py-0.5 rounded-full text-red-800">緊急</span>}
                {task.priority === 'high' && <span className="bg-orange-200 px-2 py-0.5 rounded-full text-orange-800">高</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // スタイル3: ミニマル・モダン
  const MinimalStyleItem = ({ task }: { task: PersonalTask }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <div 
        className={`group flex items-center py-4 hover:bg-gray-50/80 transition-colors cursor-pointer ${
          task.status === 'completed' ? 'opacity-60' : ''
        } ${isOverdue ? 'bg-red-50/30' : ''}`}
        onContextMenu={(e) => handleTaskContextMenu(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        
        <button
          onClick={() => updateTaskStatus(task, 
            task.status === 'completed' ? 'pending' : 'completed'
          )}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
            task.status === 'completed' 
              ? 'bg-green-500 border-green-500' 
              : task.priority === 'urgent' ? 'border-red-400 hover:border-red-500' :
                task.priority === 'high' ? 'border-orange-400 hover:border-orange-500' :
                task.priority === 'medium' ? 'border-blue-400 hover:border-blue-500' :
                'border-gray-300 hover:border-gray-400'
          }`}
        >
          {task.status === 'completed' && <CheckCircle className="w-4 h-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-gray-900 font-medium ${
            task.status === 'completed' ? 'line-through text-gray-500' : ''
          }`}>
            {task.title}
            {/* 期限をタイトルのすぐ右に */}
            {task.dueDate && (
              <span className={`text-xs ml-4 ${
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric'
                })}
              </span>
            )}
          </p>
          
          {task.description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {task.description}
            </p>
          )}
        </div>

      </div>
    );
  };

  // スタイル4: 吹き出し風
  const BubbleStyleItem = ({ task }: { task: PersonalTask }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <div 
        className="group mb-4 flex items-start gap-3 cursor-pointer"
        onContextMenu={(e) => handleTaskContextMenu(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        <button
          onClick={() => updateTaskStatus(task, 
            task.status === 'completed' ? 'pending' : 'completed'
          )}
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            task.status === 'completed' 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
        >
          {task.status === 'completed' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className={`flex-1 bg-white rounded-2xl px-4 py-3 shadow-sm border relative ${
          task.status === 'completed' ? 'opacity-60' : ''
        } ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
          
          {/* 吹き出しの角 */}
          <div className={`absolute left-0 top-4 w-0 h-0 border-t-4 border-b-4 border-r-8 transform -translate-x-2 ${
            isOverdue ? 'border-r-red-50 border-t-transparent border-b-transparent' : 
            'border-r-white border-t-transparent border-b-transparent'
          }`}></div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className={`font-medium text-gray-900 ${
                task.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}>
                {task.title}
                {/* 期限をタイトルのすぐ右に */}
                {task.dueDate && (
                  <span className={`text-xs ml-4 ${
                    isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                  }`}>
                    {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </h3>
              
              {task.description && (
                <p className="text-sm text-gray-600 mt-2">
                  {task.description}
                </p>
              )}
              
              <div className="flex items-center gap-3 mt-2">
                {task.priority === 'urgent' && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">緊急</span>}
                {task.priority === 'high' && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">高</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // スタイル5: インデックスカード風
  const IndexCardStyleItem = ({ task }: { task: PersonalTask }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <div 
        className={`group mb-3 bg-white rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          task.status === 'completed' ? 'opacity-60' : ''
        } ${isOverdue ? 'border-red-300 bg-red-50/20' : ''}`}
        onContextMenu={(e) => handleTaskContextMenu(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        
        {/* カードヘッダー */}
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateTaskStatus(task, 
                  task.status === 'completed' ? 'pending' : 'completed'
                )}
                className="flex-shrink-0"
              >
                {task.status === 'completed' ? (
                  <CheckSquare className="w-5 h-5 text-green-600" />
                ) : (
                  <Square className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                )}
              </button>
              
              <span className="text-xs font-mono text-blue-700">
                #{task.id.slice(-6).toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {task.priority === 'urgent' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
              {task.priority === 'high' && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
            </div>
          </div>
        </div>

        {/* カードボディ */}
        <div className="p-4">
          <h3 className={`font-semibold text-gray-900 mb-2 ${
            task.status === 'completed' ? 'line-through text-gray-500' : ''
          }`}>
            {task.title}
            {/* 期限をタイトルのすぐ右に */}
            {task.dueDate && (
              <span className={`text-xs ml-4 ${
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric'
                })}
              </span>
            )}
          </h3>
          
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded italic">
              "{task.description}"
            </p>
          )}
        </div>
      </div>
    );
  };

  // 現在のスタイルに応じてコンポーネントを選択
  const PersonalTaskItem = ({ task }: { task: PersonalTask }) => {
    switch (personalTaskStyle) {
      case 'sticky': return <StickyStyleItem task={task} />;
      case 'minimal': return <MinimalStyleItem task={task} />;
      case 'bubble': return <BubbleStyleItem task={task} />;
      case 'index': return <IndexCardStyleItem task={task} />;
      default: return <MemoStyleItem task={task} />;
    }
  };

  // 全体タスク用：テーブル風レイアウト
  const CompanyTaskItem = ({ task }: { task: CompanyTask }) => {
    const categoryInfo = getCategoryInfo(task.category);
    const priorityInfo = getPriorityInfo(task.priority);
    const statusInfo = STATUS_CONFIG[task.status];
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <tr 
        className={`group border-b border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer ${
          task.status === 'completed' ? 'opacity-60' : ''
        } ${isOverdue ? 'bg-red-50/20' : ''}`}
        onContextMenu={(e) => handleTaskContextMenu(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        {/* ステータスドット */}
        <td className="py-3 pl-2 pr-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            task.status === 'completed' ? 'bg-green-500' :
            task.status === 'progress' ? 'bg-blue-500' :
            task.status === 'cancelled' ? 'bg-red-500' :
            'bg-gray-300'
          }`}></div>
        </td>

        {/* タスク名 */}
        <td className="py-3 px-2">
          <div>
            <span className={`text-sm font-medium ${
              task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {task.title}
            </span>
            {task.description && (
              <span className="text-xs text-gray-500 ml-2">- {task.description}</span>
            )}
          </div>
        </td>

        {/* 担当者 */}
        <td className="py-3 px-2">
          <span className="text-xs text-gray-700">{task.assignee}</span>
        </td>

        {/* 期限 */}
        <td className="py-3 px-2">
          {task.dueDate && (
            <span className={`text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                month: 'numeric',
                day: 'numeric'
              })}
            </span>
          )}
        </td>

        {/* カテゴリー */}
        <td className="py-3 px-2">
          <div className="flex items-center gap-1">
            <categoryInfo.icon className="w-3 h-3" />
            <span className="text-xs text-gray-500">{categoryInfo.label}</span>
          </div>
        </td>

        {/* 優先度 */}
        <td className="py-3 px-2">
          {task.priority !== 'medium' && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${
              task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {priorityInfo.label}
            </span>
          )}
        </td>

        {/* ステータス */}
        <td className="py-3 px-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </td>
      </tr>
    );
  };

  // シンプルカード形式（軽量版）
  const SimpleCard = ({ task }: { task: PersonalTask | CompanyTask }) => {
    const categoryInfo = getCategoryInfo(task.category);
    const priorityInfo = getPriorityInfo(task.priority);
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <div className={`group p-4 bg-white rounded-lg border transition-all duration-200 hover:shadow-sm hover:border-gray-300 ${
        task.status === 'completed' ? 'opacity-60' : ''
      } ${isOverdue ? 'border-red-200 bg-red-50/10' : 'border-gray-200'}`}>
        {/* ヘッダー */}
        <div className="flex items-start gap-3 mb-2">
          <button
            onClick={() => updateTaskStatus(task, 
              task.status === 'completed' ? 'pending' : 'completed'
            )}
            className="flex-shrink-0 mt-0.5"
          >
            {task.status === 'completed' ? (
              <CheckSquare className="w-5 h-5 text-green-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-gray-900 leading-tight ${
              task.status === 'completed' ? 'line-through text-gray-500' : ''
            }`}>
              {task.title}
              {/* 期限をタイトルのすぐ右に */}
              {task.dueDate && (
                <span className={`text-xs ml-4 ${
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                }`}>
                  {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </span>
              )}
            </h3>
            
            {task.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* クイックアクション */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEditTask(task)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  編集
                </DropdownMenuItem>
                {activeTab === "personal" && (
                  <DropdownMenuItem onClick={() => {
                    setTaskType("company");
                    startEditTask(task);
                  }}>
                    <Share2 className="w-4 h-4 mr-2" />
                    共有タスクにする
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteTask(task)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* メタ情報（コンパクト） */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {/* カテゴリー */}
            <div className="flex items-center gap-1">
              <categoryInfo.icon className="w-3 h-3" />
              <span>{categoryInfo.label}</span>
            </div>
            
            {/* 優先度（高・緊急のみ表示） */}
            {(task.priority === 'high' || task.priority === 'urgent') && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 担当者（会社タスクのみ） */}
            {"assignee" in task && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{task.assignee}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckSquare className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">タスク管理</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>総タスク数: <span className="font-bold text-blue-600">{currentStats.total}</span></span>
                  <span>完了: <span className="font-bold text-green-600">{currentStats.completed}</span></span>
                  <span>進行中: <span className="font-bold text-orange-600">{currentStats.inProgress}</span></span>
                  {currentStats.overdue > 0 && (
                    <span>期限超過: <span className="font-bold text-red-600">{currentStats.overdue}</span></span>
                  )}
                </div>
              </div>
            </div>
            
            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="タスクを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden flex">
          {/* サイドバー */}
          <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* 新規作成ボタン（全体タスクのみ） */}
              {activeTab === "company" && (
                <Button
                  onClick={() => {
                    resetForm();
                    setTaskType(activeTab);
                    setShowCreateModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新しいタスク
                </Button>
              )}

              {/* フィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">ステータス</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedStatus("all")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedStatus === "all" ? "text-blue-600 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    すべて ({currentStats.total})
                  </button>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = currentTasks.filter(t => t.status === status).length;
                    return (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedStatus === status ? "text-blue-600 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.label}
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* カテゴリーフィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">カテゴリー</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedCategory === "all" ? "text-blue-600 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    すべて
                  </button>
                  {currentCategories.map((category) => {
                    const Icon = category.icon;
                    const count = currentTasks.filter(t => t.category === category.value).length;
                    return (
                      <button
                        key={category.value}
                        onClick={() => setSelectedCategory(category.value)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedCategory === category.value ? "text-blue-600 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {category.label}
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* タスクリスト */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-8">
              {/* タブとビューモード */}
              <div className="flex items-center justify-between mb-6">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "personal" | "company")}>
                  <TabsList>
                    <TabsTrigger value="personal" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      個人タスク
                    </TabsTrigger>
                    <TabsTrigger value="company" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      全体タスク
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  {/* 個人タスクのスタイル設定 */}
                  {activeTab === "personal" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          スタイル
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {[
                          { key: 'memo', label: '📝 メモ帳風', desc: 'シンプルな横線スタイル' },
                          { key: 'sticky', label: '🗒️ 付箋紙風', desc: 'カラフルな付箋デザイン' },
                          { key: 'minimal', label: '✨ ミニマル', desc: 'モダンなボーダースタイル' },
                          { key: 'bubble', label: '💬 吹き出し風', desc: 'チャットUI風デザイン' },
                          { key: 'index', label: '📋 カード風', desc: 'インデックスカードデザイン' }
                        ].map(style => (
                          <DropdownMenuItem
                            key={style.key}
                            onClick={() => handleStyleChange(style.key as any)}
                            className={`flex flex-col items-start gap-1 ${
                              personalTaskStyle === style.key ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <div className="font-medium">{style.label}</div>
                            <div className="text-xs text-gray-500">{style.desc}</div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* 表示モード切り替え */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "todo" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("todo")}
                      className="px-3"
                      title="TODOリスト表示"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "card" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("card")}
                      className="px-3"
                      title="カード表示"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="px-3"
                      title="リスト表示"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* タイトルエリア */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 ml-2">
                    {activeTab === "personal" ? "個人タスク" : "全体タスク"}
                  </h2>
                  <div className="text-sm text-gray-500">
                    {filteredTasks.length} 件のタスク
                  </div>
                </div>
              </div>

              {/* タスク表示 */}
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">タスクを読み込み中...</p>
                  </div>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-16">
                  <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    {searchQuery || selectedStatus !== "all" || selectedCategory !== "all"
                      ? "該当するタスクが見つかりません" 
                      : "まだタスクがありません"}
                  </p>
                  <p className="text-gray-400 mb-4">
                    {searchQuery || selectedStatus !== "all" || selectedCategory !== "all"
                      ? "フィルターを変更してみてください"
                      : activeTab === "personal" 
                        ? "上の入力欄からタスクを追加できます"
                        : "新しいタスクを作成して始めましょう"}
                  </p>
                  {(!searchQuery && selectedStatus === "all" && selectedCategory === "all" && activeTab === "company") && (
                    <Button
                      onClick={() => {
                        resetForm();
                        setTaskType(activeTab);
                        setShowCreateModal(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      最初のタスクを作成
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {activeTab === "personal" ? (
                    <div>
                      {/* インライン新規作成入力欄（詳細対応） */}
                      <div className="mb-6 ml-2">
                        {showQuickAdd ? (
                          <div 
                            ref={quickAddRef}
                            className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm"
                          >
                            <div className="space-y-3">
                              {/* タイトル */}
                              <div>
                                <input
                                  type="text"
                                  value={quickAddText}
                                  onChange={(e) => setQuickAddText(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && quickAddText.trim()) {
                                      handleQuickAdd();
                                    }
                                    if (e.key === 'Escape') {
                                      setShowQuickAdd(false);
                                      setQuickAddText("");
                                    }
                                  }}
                                  placeholder="タスクのタイトル..."
                                  className="w-full text-base border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-500 placeholder-gray-500"
                                  autoFocus
                                />
                              </div>
                              
                              {/* 詳細情報行 */}
                              <div className="flex items-center gap-3 text-sm">
                                {/* 優先度 */}
                                <select 
                                  value={formData.priority}
                                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                                >
                                  <option value="low">低</option>
                                  <option value="medium">中</option>
                                  <option value="high">高</option>
                                  <option value="urgent">緊急</option>
                                </select>
                                
                                {/* カテゴリー */}
                                <select 
                                  value={formData.category}
                                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                                >
                                  {TASK_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </option>
                                  ))}
                                </select>
                                
                                {/* 期日 */}
                                <input
                                  type="date"
                                  value={formData.dueDate}
                                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                                />
                                
                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    onClick={handleQuickAdd}
                                    disabled={!quickAddText.trim()}
                                    className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    追加
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowQuickAdd(false);
                                      setQuickAddText("");
                                      resetForm();
                                    }}
                                    className="px-2 py-1 text-gray-500 hover:text-gray-700"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowQuickAdd(true)}
                            className="w-full flex items-center gap-3 py-3 text-left text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border-b border-gray-200"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-base">新しいタスクを追加...</span>
                          </button>
                        )}
                      </div>
                      
                      {/* 個人：選択されたスタイルで表示 */}
                      <div className={`ml-2 ${personalTaskStyle === 'memo' || personalTaskStyle === 'minimal' ? 'space-y-0' : 'space-y-0'}`}>
                        {filteredTasks.map((task) => (
                          <PersonalTaskItem key={task.id} task={task as PersonalTask} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 全体：テーブルレイアウト */
                    <div className="ml-2 mr-2">
                      <table className="w-full table-auto">
                        <colgroup>
                          <col className="w-8" />
                          <col style={{width: "40%"}} />
                          <col style={{width: "12%"}} />
                          <col style={{width: "10%"}} />
                          <col style={{width: "14%"}} />
                          <col style={{width: "10%"}} />
                          <col style={{width: "14%"}} />
                        </colgroup>
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th></th>
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">タスク名</th>
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">担当者</th>
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">期限</th>
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">カテゴリー</th>
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">優先度</th>
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">ステータス</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTasks.map((task) => (
                            <CompanyTaskItem key={task.id} task={task as CompanyTask} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* カスタム右クリックメニュー */}
        {contextMenu?.show && (
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                startEditTask(contextMenu.task);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              編集
            </button>
            
            <button
              onClick={() => {
                updateTaskStatus(contextMenu.task, 
                  contextMenu.task.status === 'completed' ? 'pending' : 'completed'
                );
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              {contextMenu.task.status === 'completed' ? '未完了にする' : '完了にする'}
            </button>

            {/* 個人タスクの場合のみ共有オプション表示 */}
            {'userId' in contextMenu.task && (
              <button
                onClick={() => {
                  setTaskType("company");
                  startEditTask(contextMenu.task);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                共有タスクにする
              </button>
            )}

            <div className="border-t border-gray-200 my-1"></div>
            
            <button
              onClick={() => {
                handleDeleteTask(contextMenu.task);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          </div>
        )}

        {/* 作成・編集モーダル */}
        <Dialog 
          open={showCreateModal || !!editingTask} 
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false);
              setEditingTask(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base">
                {editingTask ? "タスクを編集" : "新しいタスク"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* タイトル */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  タスク名 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例: 資料作成、会議準備、メール返信..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-base"
                />
              </div>

              {/* 説明（オプショナル） */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  詳細説明（任意）
                </label>
                <Textarea
                  placeholder="詳しい内容や注意点があれば記入してください..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-16 resize-none text-sm"
                />
              </div>

              {/* 設定 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  タスク設定
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* カテゴリー */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">カテゴリー</label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {(taskType === "personal" || (editingTask && "userId" in editingTask) ? TASK_CATEGORIES : COMPANY_CATEGORIES).map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <category.icon className="w-3 h-3" />
                              {category.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 優先度 */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">優先度</label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex items-center gap-2">
                              <priority.icon className="w-3 h-3" />
                              {priority.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 期限 */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">期限（任意）</label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="h-9"
                    />
                  </div>

                  {/* ステータス（編集時のみ） */}
                  {editingTask && (
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">ステータス</label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <config.icon className="w-3 h-3" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>


              {/* タスクタイプ（新規作成時のみ、シンプル） */}
              {!editingTask && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">タスクタイプ:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="taskType"
                        value="personal"
                        checked={taskType === "personal"}
                        onChange={(e) => setTaskType(e.target.value as "personal" | "company")}
                        className="w-3 h-3"
                      />
                      <span>個人</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="taskType"
                        value="company"
                        checked={taskType === "company"}
                        onChange={(e) => setTaskType(e.target.value as "personal" | "company")}
                        className="w-3 h-3"
                      />
                      <span>全体</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 担当者（全体タスクのみ） */}
              {(taskType === "company" || (editingTask && "assignee" in editingTask)) && (
                <Input
                  placeholder="担当者名"
                  value={formData.assignee}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                  className="h-9"
                />
              )}

              {/* アクションボタン */}
              <div className="flex items-center gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTask(null);
                    resetForm();
                  }}
                  className="h-9"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={editingTask ? handleUpdateTask : handleCreateTask}
                  disabled={!formData.title.trim()}
                  className="h-9 bg-blue-600 hover:bg-blue-700"
                >
                  {editingTask ? "更新" : "作成"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TaskPage;