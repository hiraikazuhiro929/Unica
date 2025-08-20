"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  StickyNote,
  Pin,
  Archive,
  Trash2,
  MoreVertical,
  Palette,
  X,
  AlertCircle,
  FileText,
  Filter,
  Calendar,
  Tag,
  Image,
  Upload,
  Loader2,
  ZoomIn,
  Grid3X3,
  List,
  Settings,
  Maximize2,
  Minimize2,
  Clock,
  CheckSquare,
  Bell,
  MapPin,
  FolderOpen,
  Brush,
} from "lucide-react";

// Firebase関数とタイプのインポート
import { Note, uploadImages, deleteImage } from "@/lib/firebase/notes";
import { useNotes } from "./hooks/useNotes";
import { storage } from "@/lib/firebase/config";

// Google Keep風カラーパレット
const NOTE_COLORS = [
  { name: "デフォルト", value: "bg-white", class: "bg-white border-gray-200" },
  { name: "黄色", value: "bg-yellow-100", class: "bg-yellow-100 border-yellow-300" },
  { name: "オレンジ", value: "bg-orange-100", class: "bg-orange-100 border-orange-300" },
  { name: "赤", value: "bg-red-100", class: "bg-red-100 border-red-300" },
  { name: "ピンク", value: "bg-pink-100", class: "bg-pink-100 border-pink-300" },
  { name: "紫", value: "bg-purple-100", class: "bg-purple-100 border-purple-300" },
  { name: "青", value: "bg-blue-100", class: "bg-blue-100 border-blue-300" },
  { name: "青緑", value: "bg-teal-100", class: "bg-teal-100 border-teal-300" },
  { name: "緑", value: "bg-green-100", class: "bg-green-100 border-green-300" },
  { name: "グレー", value: "bg-gray-100", class: "bg-gray-100 border-gray-300" },
];

const CATEGORIES = [
  { value: "personal", label: "個人", icon: "🏠" },
  { value: "work", label: "仕事", icon: "💼" },
  { value: "meeting", label: "ミーティング", icon: "🤝" },
  { value: "idea", label: "アイデア", icon: "💡" },
  { value: "todo", label: "TODO", icon: "✅" },
  { value: "reminder", label: "リマインダー", icon: "⏰" },
] as const;

// 表示モード
type ViewMode = 'grid' | 'list';
type NoteSize = 'small' | 'medium' | 'large';

const NotesPage = () => {
  // UI状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [noteSize, setNoteSize] = useState<NoteSize>('medium');
  
  // Google Keep風の入力状態
  const [isNewNoteExpanded, setIsNewNoteExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // ドラッグ状態（個別メモカード用）
  const [draggedOverNote, setDraggedOverNote] = useState<string | null>(null);
  
  // 改良されたメモの並び替え用状態
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [isDragMode, setIsDragMode] = useState(false); // ドラッグモード状態
  const [dropIndicator, setDropIndicator] = useState<{ index: number; position: 'before' | 'after' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // フォーム状態（新規作成用）
  const [newNoteData, setNewNoteData] = useState({
    title: "",
    content: "",
    category: "personal" as Note['category'],
    color: "bg-white",  // デフォルトを白に変更
    tags: [] as string[],
    imageUrls: [] as string[],
    isPinned: false,
    isCheckList: false,
    checkItems: [] as { id: string; text: string; checked: boolean }[],
    reminder: null as { date: string; time: string } | null,
    labels: [] as string[],
  });

  // 編集状態
  const [editingNoteData, setEditingNoteData] = useState<{
    title: string;
    content: string;
    category: Note['category'];
    color: string;
    tags: string[];
    imageUrls: string[];
    isPinned: boolean;
    isCheckList: boolean;
    checkItems: { id: string; text: string; checked: boolean }[];
    reminder: { date: string; time: string } | null;
    labels: string[];
  } | null>(null);
  
  // Refs
  const newNoteInputRef = useRef<HTMLInputElement>(null);
  const newNoteContentRef = useRef<HTMLTextAreaElement>(null);
  const newNoteContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // その他の状態
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [overdueReminders, setOverdueReminders] = useState<Note[]>([]);

  // モックユーザー（実際の実装では認証から取得）
  const currentUser = {
    id: "user123",
    name: "テストユーザー",
  };

  // Firebase Storage接続テスト（CORS問題のため無効化）
  useEffect(() => {
    console.log("Firebase Storage configuration:", {
      app: storage.app,
      bucket: storage.app.options.storageBucket,
      initialized: !!storage,
      note: "CORS問題のため、Base64方式を使用します"
    });

    console.log("✅ Base64画像処理方式を使用 - Firebase Storage CORSテストをスキップ");
  }, [currentUser.id]);

  // カスタムフック使用
  const {
    notes,
    isLoading,
    error,
    stats,
    createNewNote,
    updateExistingNote,
    deleteNoteById,
    toggleArchive,
    togglePrivacy,
    filterNotes,
  } = useNotes({
    userId: currentUser.id,
    userName: currentUser.name,
    enableRealtime: true,
    limit: 100,
  });

  // 画面外クリック処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // ドロップダウンメニュー関連の要素は完全に除外
      if (
        target.closest('[data-radix-dropdown-menu-content]') ||
        target.closest('[data-radix-dropdown-menu-item]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      
      // サイドバーなどその他の要素
      if (
        (sidebarRef.current && sidebarRef.current.contains(target)) ||
        target.closest('.react-select__menu')
      ) {
        return;
      }
      
      // 新規メモの展開状態をリセット
      if (isNewNoteExpanded && newNoteContainerRef.current && !newNoteContainerRef.current.contains(target)) {
        if (newNoteData.title.trim() || newNoteData.content.trim() || newNoteData.imageUrls.length > 0) {
          handleCreateNewNote();
        } else {
          setIsNewNoteExpanded(false);
          resetNewNoteForm();
        }
      }

      // 編集中のメモを終了
      if (editingNoteId && !document.querySelector(`[data-note-id="${editingNoteId}"]`)?.contains(target)) {
        if (editingNoteData && editingNoteId) {
          handleUpdateNote(editingNoteId);
        } else {
          stopEditingNote();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isNewNoteExpanded, editingNoteId, newNoteData, editingNoteData]);

  // フィルタリングされたメモ
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // アーカイブフィルター
      if (showArchived && !note.isArchived) return false;
      if (!showArchived && note.isArchived) return false;
      
      // カテゴリーフィルター
      if (selectedCategory !== 'all' && note.category !== selectedCategory) return false;
      
      // 検索クエリフィルター
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(query);
        const matchesContent = note.content.toLowerCase().includes(query);
        const matchesTags = note.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        const matchesLabels = ((note as any).labels || []).some((label: string) => label.toLowerCase().includes(query));
        
        if (!matchesTitle && !matchesContent && !matchesTags && !matchesLabels) {
          return false;
        }
      }
      
      return true;
    });
  }, [notes, searchQuery, selectedCategory, showArchived]);

  // フィルター結果をピン留め順でソート
  const displayNotes = useMemo(() => {
    const now = new Date();
    return [...filteredNotes].sort((a, b) => {
      // 期限切れリマインダーを最上位に
      const aReminder = (a as any).reminder;
      const bReminder = (b as any).reminder;
      const aOverdue = aReminder && new Date(`${aReminder.date}T${aReminder.time}`) <= now;
      const bOverdue = bReminder && new Date(`${bReminder.date}T${bReminder.time}`) <= now;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // ピン留めされたメモを上に
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // 作成日時で降順ソート
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredNotes]);

  // リマインダーチェック
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const overdue = notes.filter(note => {
        const reminder = (note as any).reminder;
        if (!reminder) return false;
        
        const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
        return reminderDateTime <= now && !note.isArchived;
      });
      
      setOverdueReminders(overdue);
      
      // ブラウザ通知
      if (overdue.length > 0 && 'Notification' in window) {
        overdue.forEach(note => {
          if (Notification.permission === 'granted') {
            new Notification(`リマインダー: ${note.title || '無題のメモ'}`, {
              body: note.content.substring(0, 100) || 'メモの内容がありません',
              icon: '/favicon.ico'
            });
          }
        });
      }
    };
    
    // 初回チェック
    checkReminders();
    
    // 1分ごとにチェック
    const interval = setInterval(checkReminders, 60000);
    
    return () => clearInterval(interval);
  }, [notes]);
  
  // 通知許可の要求
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 新規メモフォームリセット（完全リセット）
  const resetNewNoteForm = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setNewNoteData({
      title: "",
      content: "",
      category: "personal",
      color: "bg-white",  // デフォルトを白に変更
      tags: [],
      imageUrls: [],
      isPinned: false,
      isCheckList: false,
      checkItems: [],
      reminder: null,
      labels: [],
    });
    setIsNewNoteExpanded(false);
    setNewTagInput("");
  };

  // 新規メモフォームクリア（展開状態維持）
  const clearNewNoteForm = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setNewNoteData({
      title: "",
      content: "",
      category: "personal",
      color: "bg-yellow-100",
      tags: [],
      imageUrls: [],
      isPinned: false,
      isCheckList: false,
      checkItems: [],
      reminder: null,
      labels: [],
    });
    setNewTagInput("");
  };

  // 編集モードの開始
  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteData({
      title: note.title,
      content: note.content,
      category: note.category,
      color: note.color,
      tags: note.tags || [],
      imageUrls: note.imageUrls || [],
      isPinned: note.isPinned || false,
      isCheckList: (note as any).isCheckList || false,
      checkItems: (note as any).checkItems || [],
      reminder: (note as any).reminder || null,
      labels: (note as any).labels || [],
    });
    setEditTagInput("");
  };

  // 編集モードの終了
  const stopEditingNote = () => {
    if (editAutoSaveTimeoutRef.current) {
      clearTimeout(editAutoSaveTimeoutRef.current);
    }
    setEditingNoteId(null);
    setEditingNoteData(null);
    setEditTagInput("");
  };

  // 新規メモ作成（自動保存）
  const handleCreateNewNote = useCallback(async () => {
    const hasContent = newNoteData.title.trim() || newNoteData.content.trim() || newNoteData.imageUrls.length > 0;
    const hasCheckListItems = newNoteData.isCheckList && newNoteData.checkItems.some(item => item.text.trim());
    const hasReminder = newNoteData.reminder;
    const hasLabels = newNoteData.labels.length > 0;
    
    if (!hasContent && !hasCheckListItems && !hasReminder && !hasLabels) return;

    const noteData = {
      title: newNoteData.title || "無題のメモ",
      content: newNoteData.content,
      category: newNoteData.category,
      color: newNoteData.color,
      tags: newNoteData.tags,
      imageUrls: newNoteData.imageUrls,
      isPinned: newNoteData.isPinned,
      isCheckList: newNoteData.isCheckList,
      checkItems: newNoteData.checkItems.filter(item => item.text.trim()), // 空のアイテムを除外
      reminder: newNoteData.reminder,
      labels: newNoteData.labels,
    };

    const success = await createNewNote(noteData);
    
    if (success) {
      clearNewNoteForm();
      setTimeout(() => {
        newNoteInputRef.current?.focus();
      }, 100);
    }
  }, [newNoteData, createNewNote]);

  // メモ更新（自動保存）
  const handleUpdateNote = useCallback(async (noteId: string) => {
    if (!editingNoteData) return;

    const updates = {
      title: editingNoteData.title || "無題のメモ",
      content: editingNoteData.content,
      category: editingNoteData.category,
      color: editingNoteData.color,
      tags: editingNoteData.tags,
      imageUrls: editingNoteData.imageUrls,
      isPinned: editingNoteData.isPinned,
      isCheckList: editingNoteData.isCheckList,
      checkItems: editingNoteData.checkItems,
      reminder: editingNoteData.reminder,
      labels: editingNoteData.labels,
    };

    const success = await updateExistingNote(noteId, updates);
    
    if (success) {
      stopEditingNote();
    }
  }, [editingNoteData, updateExistingNote]);

  // 新規メモの自動保存（入力中のリアルタイム保存）
  const autoSaveNewNote = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      const hasContent = newNoteData.title.trim() || newNoteData.content.trim() || newNoteData.imageUrls.length > 0;
      const hasCheckListItems = newNoteData.isCheckList && newNoteData.checkItems.some(item => item.text.trim());
      const hasReminder = newNoteData.reminder;
      const hasLabels = newNoteData.labels.length > 0;
      
      if (hasContent || hasCheckListItems || hasReminder || hasLabels) {
        handleCreateNewNote();
      }
    }, 2000); // 2秒後に自動保存（チェックリストの入力時間を考慮）
  }, [newNoteData, handleCreateNewNote]);

  // 編集メモの自動保存
  const autoSaveEditNote = useCallback(() => {
    if (editAutoSaveTimeoutRef.current) {
      clearTimeout(editAutoSaveTimeoutRef.current);
    }
    
    if (editingNoteId) {
      editAutoSaveTimeoutRef.current = setTimeout(() => {
        handleUpdateNote(editingNoteId);
      }, 1000); // 1秒後に自動保存
    }
  }, [editingNoteId, handleUpdateNote]);

  // メモ削除
  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm("このメモを削除しますか？")) {
      await deleteNoteById(noteId);
      if (editingNoteId === noteId) {
        stopEditingNote();
      }
    }
  };

  // 画像アップロード用ドラッグ&ドロップ処理
  const handleImageDragOver = (e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // メモ並び替え中は画像ドロップを無効化
    if (isDragMode) return;
    setDraggedOverNote(noteId);
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverNote(null);
    }
  };

  const handleImageDrop = async (e: React.DragEvent, noteId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverNote(null);
    
    // メモ並び替え中は画像ドロップを無効化
    if (isDragMode) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert("画像ファイルをドロップしてください");
      return;
    }

    if (noteId && noteId !== 'new') {
      // 既存メモに画像を追加
      const note = filteredNotes.find(n => n.id === noteId);
      if (!note) return;

      setIsUploading(true);
      try {
        const { urls, errors } = await uploadImages(imageFiles, currentUser.id);
        
        if (errors.length > 0) {
          console.warn("Some images failed to upload:", errors);
          alert("一部の画像のアップロードに失敗しました: " + errors.join(", "));
        }
        
        if (urls.length > 0) {
          console.log("Updating note with new images:", urls);
          await updateExistingNote(noteId, {
            imageUrls: [...(note.imageUrls || []), ...urls]
          });
          console.log("Note updated successfully");
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        alert("画像アップロード中にエラーが発生しました");
      } finally {
        setIsUploading(false);
      }
    } else {
      // 新規メモエリアに画像をドロップ
      console.log("Adding images to new note area");
      setIsUploading(true);
      try {
        const { urls, errors } = await uploadImages(imageFiles, currentUser.id);
        
        if (errors.length > 0) {
          console.warn("Some images failed to upload:", errors);
          alert("一部の画像のアップロードに失敗しました: " + errors.join(", "));
        }
        
        if (urls.length > 0) {
          console.log("Adding images to new note data:", urls);
          const updatedData = {
            ...newNoteData,
            imageUrls: [...newNoteData.imageUrls, ...urls]
          };
          console.log("Updated newNoteData:", updatedData);
          setNewNoteData(updatedData);
          
          if (!isNewNoteExpanded) {
            console.log("Expanding new note area to show images");
            setIsNewNoteExpanded(true);
          }
          
          // 自動保存は行わず、ユーザーが明示的に保存するまで待つ
          console.log("Images added to new note area (no auto-save)");
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        alert("画像アップロード中にエラーが発生しました");
      } finally {
        setIsUploading(false);
      }
    }
  };

  // 画像アップロード処理
  const handleImageUpload = async (files: FileList | null, isEditing: boolean = false) => {
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }

    console.log("Starting image upload process", { fileCount: files.length, isEditing });
    setIsUploading(true);
    
    try {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
      
      console.log("Filtered image files:", { 
        original: fileArray.length, 
        imageFiles: imageFiles.length,
        fileTypes: fileArray.map(f => f.type)
      });
      
      if (imageFiles.length === 0) {
        console.warn("No valid image files found");
        alert("画像ファイルを選択してください");
        return;
      }
      
      console.log("Calling uploadImages function...");
      const { urls, errors } = await uploadImages(imageFiles, currentUser.id);
      
      console.log("Upload result:", { urls, errors });
      
      if (errors.length > 0) {
        console.warn("Some images failed to upload:", errors);
        alert("一部の画像のアップロードに失敗しました: " + errors.join(", "));
      }
      
      if (urls.length > 0) {
        console.log("Successfully uploaded images:", urls);
        if (isEditing && editingNoteData) {
          setEditingNoteData(prev => prev ? ({
            ...prev,
            imageUrls: [...prev.imageUrls, ...urls]
          }) : null);
          autoSaveEditNote();
        } else {
          setNewNoteData(prev => ({
            ...prev,
            imageUrls: [...prev.imageUrls, ...urls]
          }));
          autoSaveNewNote();
        }
        console.log("Updated note data with new images");
      } else {
        console.error("No images were successfully uploaded");
        alert("画像のアップロードに失敗しました");
      }
    } catch (error) {
      console.error("Error in handleImageUpload:", error);
      alert("画像アップロード中にエラーが発生しました: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
      console.log("Image upload process completed");
    }
  };

  // 画像削除処理
  const handleImageDelete = async (imageUrl: string, isEditing: boolean = false) => {
    try {
      await deleteImage(imageUrl);
      
      if (isEditing && editingNoteData) {
        setEditingNoteData(prev => prev ? ({
          ...prev,
          imageUrls: prev.imageUrls.filter(url => url !== imageUrl)
        }) : null);
        autoSaveEditNote();
      } else {
        setNewNoteData(prev => ({
          ...prev,
          imageUrls: prev.imageUrls.filter(url => url !== imageUrl)
        }));
        autoSaveNewNote();
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  // タグ追加
  const addTag = (tag: string, isEditing: boolean = false) => {
    if (!tag.trim()) return;
    
    if (isEditing && editingNoteData) {
      if (!editingNoteData.tags.includes(tag)) {
        setEditingNoteData(prev => prev ? ({
          ...prev,
          tags: [...prev.tags, tag]
        }) : null);
        autoSaveEditNote();
      }
      setEditTagInput("");
    } else {
      if (!newNoteData.tags.includes(tag)) {
        setNewNoteData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        autoSaveNewNote();
      }
      setNewTagInput("");
    }
  };

  // タグ削除
  const removeTag = (tag: string, isEditing: boolean = false) => {
    if (isEditing && editingNoteData) {
      setEditingNoteData(prev => prev ? ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }) : null);
      autoSaveEditNote();
    } else {
      setNewNoteData(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }));
      autoSaveNewNote();
    }
  };

  // カラークラスを取得
  const getColorClass = (color: string) => {
    const colorConfig = NOTE_COLORS.find(c => c.value === color);
    return colorConfig?.class || "bg-white border-gray-200";
  };

  // カテゴリーラベル取得
  const getCategoryLabel = (category: string) => {
    const categoryConfig = CATEGORIES.find(c => c.value === category);
    return categoryConfig ? `${categoryConfig.icon} ${categoryConfig.label}` : category;
  };

  // メモサイズのクラス取得（改良版）
  const getNoteContainerClass = () => {
    // ドラッグモード時は常にGridレイアウトを使用
    if (isDragMode) {
      const gridCols = noteSize === 'small' 
        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        : noteSize === 'large'
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
      
      const gap = noteSize === 'small' ? 'gap-3' : noteSize === 'large' ? 'gap-6' : 'gap-4';
      return `grid ${gridCols} ${gap} auto-rows-max transition-all duration-200 ease-in-out`;
    }
    
    // 通常時はColumnsレイアウト
    const baseClass = viewMode === 'grid' 
      ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4"
      : "max-w-3xl mx-auto space-y-2";
    
    if (noteSize === 'small') {
      return viewMode === 'grid' 
        ? "columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-3 space-y-3"
        : "max-w-2xl mx-auto space-y-1";
    } else if (noteSize === 'large') {
      return viewMode === 'grid'
        ? "columns-1 sm:columns-2 lg:columns-2 xl:columns-3 2xl:columns-4 gap-6 space-y-6"
        : "max-w-4xl mx-auto space-y-3";
    }
    
    return baseClass;
  };

  const getNoteCardPadding = () => {
    switch (noteSize) {
      case 'small': return 'p-2';
      case 'large': return 'p-4';
      default: return 'p-3';
    }
  };

  const getNoteTextSize = () => {
    switch (noteSize) {
      case 'small': return { title: 'text-sm', content: 'text-xs' };
      case 'large': return { title: 'text-lg', content: 'text-base' };
      default: return { title: 'text-base', content: 'text-sm' };
    }
  };

  // 改良されたメモの並び替え処理（メモ化）
  const handleNoteDragStart = useCallback((e: React.DragEvent, note: Note, index: number) => {
    setDraggedNote(note);
    setIsDragMode(true); // ドラッグモード開始
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', note.id);
    
    // ドラッグ中のスムーズなスタイル設定
    const target = e.currentTarget as HTMLElement;
    target.style.transition = 'all 0.2s ease-in-out';
    target.style.opacity = '0.8';
    target.style.transform = 'rotate(2deg) scale(1.02)';
    target.style.zIndex = '9999';
    target.style.pointerEvents = 'none'; // ドラッグ中は他の要素との干渉を防ぐ
    target.style.position = 'relative';
    target.style.boxShadow = '0 25px 30px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08)';
  }, []);

  const handleNoteDragEnd = useCallback((e: React.DragEvent) => {
    // スムーズなスタイルリセット
    const target = e.currentTarget as HTMLElement;
    target.style.transition = 'all 0.3s ease-out';
    target.style.opacity = '1';
    target.style.transform = 'none';
    target.style.zIndex = 'auto';
    target.style.pointerEvents = 'auto'; // pointer-eventsを復元
    target.style.position = 'static';
    target.style.boxShadow = '';
    
    // アニメーション完了後にtransitionをクリア
    setTimeout(() => {
      target.style.transition = '';
    }, 300);
    
    // 状態リセット
    setDraggedNote(null);
    setIsDragMode(false);
    setDropIndicator(null);
  }, []);

  // 座標ベースのドロップ位置計算
  const calculateDropPosition = (e: React.DragEvent, targetIndex: number): 'before' | 'after' => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    return e.clientY < midpoint ? 'before' : 'after';
  };

  const handleNoteDragOver = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedNote) return;
    
    const draggedIndex = displayNotes.findIndex(n => n.id === draggedNote.id);
    if (draggedIndex === -1) return;
    
    const position = calculateDropPosition(e, targetIndex);
    
    // 同じ位置へのドロップは無視
    if (draggedIndex === targetIndex || 
        (position === 'after' && draggedIndex === targetIndex + 1) ||
        (position === 'before' && draggedIndex === targetIndex - 1)) {
      setDropIndicator(null);
      return;
    }
    
    setDropIndicator({ index: targetIndex, position });
  }, [draggedNote, displayNotes]);

  const handleNoteDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedNote || !dropIndicator) return;

    const draggedIndex = displayNotes.findIndex(n => n.id === draggedNote.id);
    if (draggedIndex === -1) return;
    
    // 正確な挿入位置を計算
    let insertIndex = dropIndicator.index;
    if (dropIndicator.position === 'after') {
      insertIndex += 1;
    }
    
    // ドラッグされたアイテムが後ろにある場合、インデックスを調整
    if (draggedIndex < insertIndex) {
      insertIndex -= 1;
    }
    
    if (draggedIndex !== insertIndex) {
      // 新しい順序を作成
      const newNotes = [...displayNotes];
      const [movedNote] = newNotes.splice(draggedIndex, 1);
      newNotes.splice(insertIndex, 0, movedNote);
      
      // Firebaseでorderを非同期更新
      try {
        const updatePromises = newNotes.map((note, i) => 
          updateExistingNote(note.id, { order: i })
        );
        
        await Promise.all(updatePromises);
        console.log('Note order updated successfully');
      } catch (error) {
        console.error('Failed to update note order in Firebase:', error);
      }
    }
    
    // 状態リセット
    setDraggedNote(null);
    setIsDragMode(false);
    setDropIndicator(null);
  }, [draggedNote, dropIndicator, displayNotes, updateExistingNote]);

  // 改良されたメモカードのレンダリング関数
  const renderNoteCard = (note: Note, index: number) => {
    const isEditing = editingNoteId === note.id;
    const noteData = isEditing ? editingNoteData : null;
    const isDraggedOver = draggedOverNote === note.id;
    const isDragging = draggedNote?.id === note.id;
    const textSizes = getNoteTextSize();
    
    // ドロップインジケーターの表示判定
    const showDropIndicatorBefore = dropIndicator?.index === index && dropIndicator.position === 'before';
    const showDropIndicatorAfter = dropIndicator?.index === index && dropIndicator.position === 'after';
    
    return (
      <React.Fragment key={note.id}>
        {/* 挿入位置インジケーター（カードの上） */}
        {showDropIndicatorBefore && (
          <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mb-2 rounded-full shadow-lg" />
        )}
        
        <div
          data-note-id={note.id}
          draggable={!isEditing}
          onDragStart={(e) => handleNoteDragStart(e, note, index)}
          onDragEnd={handleNoteDragEnd}
          onDragOver={(e) => {
            if (draggedNote && draggedNote.id !== note.id) {
              handleNoteDragOver(e, index);
            } else if (!draggedNote) {
              handleImageDragOver(e, note.id);
            }
          }}
          onDragLeave={(e) => {
            if (!draggedNote) {
              handleImageDragLeave(e);
            }
          }}
          onDrop={(e) => {
            if (draggedNote && draggedNote.id !== note.id) {
              handleNoteDrop(e, index);
            } else if (!draggedNote) {
              handleImageDrop(e, note.id);
            }
          }}
          className={`${isEditing && editingNoteData ? getColorClass(editingNoteData.color) : getColorClass(note.color)} ${isDragMode ? 'cursor-grab active:cursor-grabbing' : 'break-inside-avoid'} inline-block w-64 hover:shadow-lg transition-all duration-200 group border cursor-pointer relative rounded-lg overflow-hidden ${
            viewMode === 'list' ? 'mb-2 w-full' : ''
          } ${isDraggedOver && !draggedNote ? 'ring-2 ring-blue-400 bg-blue-50 shadow-xl' : ''} ${
            isDragging ? 'opacity-60 shadow-2xl ring-2 ring-gray-300' : ''
          } ${isDragMode && !isDragging ? 'transition-transform hover:scale-105 hover:z-10' : ''}`}
          onClick={() => !isEditing && !isDragMode && startEditingNote(note)}
        >
        <div className={getNoteCardPadding()}>
          {/* 編集モード */}
          {isEditing && noteData ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              {/* タイトル編集 */}
              <Input
                value={noteData.title}
                onChange={(e) => {
                  setEditingNoteData(prev => prev ? ({ ...prev, title: e.target.value }) : null);
                  autoSaveEditNote();
                }}
                placeholder="タイトル"
                className={`${textSizes.title} font-medium border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 w-full`}
              />
              
              {/* コンテンツ編集またはチェックリスト */}
              {noteData.isCheckList ? (
                <div className="space-y-2">
                  {noteData.checkItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          const updatedItems = [...noteData.checkItems];
                          updatedItems[index] = { ...item, checked: e.target.checked };
                          setEditingNoteData(prev => prev ? ({ ...prev, checkItems: updatedItems }) : null);
                          autoSaveEditNote();
                        }}
                        className="w-4 h-4"
                      />
                      <Input
                        value={item.text}
                        onChange={(e) => {
                          const updatedItems = [...noteData.checkItems];
                          updatedItems[index] = { ...item, text: e.target.value };
                          setEditingNoteData(prev => prev ? ({ ...prev, checkItems: updatedItems }) : null);
                          autoSaveEditNote();
                        }}
                        className={`flex-1 ${textSizes.content} border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 ${item.checked ? 'line-through text-gray-500' : ''}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingNoteData(prev => prev ? ({
                            ...prev,
                            checkItems: prev.checkItems.filter(i => i.id !== item.id)
                          }) : null);
                          autoSaveEditNote();
                        }}
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newId = Date.now().toString();
                      setEditingNoteData(prev => prev ? ({
                        ...prev,
                        checkItems: [...prev.checkItems, { id: newId, text: '', checked: false }]
                      }) : null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    + アイテムを追加
                  </Button>
                </div>
              ) : (
                <Textarea
                  value={noteData.content}
                  onChange={(e) => {
                    setEditingNoteData(prev => prev ? ({ ...prev, content: e.target.value }) : null);
                    autoSaveEditNote();
                  }}
                  placeholder="メモを入力..."
                  rows={4}
                  className={`min-h-20 resize-none border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 ${textSizes.content} w-full break-words`}
                />
              )}

              {/* タグ編集 */}
              {noteData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {noteData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                    >
                      #{tag}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeTag(tag, true)}
                      />
                    </span>
                  ))}
                </div>
              )}

              {/* 画像編集 */}
              {noteData.imageUrls && noteData.imageUrls.length > 0 && (
                <div className="space-y-2 max-w-full">
                  {noteData.imageUrls.map((url, index) => (
                    <div key={index} className="relative group overflow-hidden rounded">
                      <img
                        src={url}
                        alt=""
                        className="w-full max-h-48 object-cover rounded cursor-pointer hover:opacity-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageUrl(url);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImageDelete(url, true)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 編集ツールバー */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  {/* 画像追加 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                    title="画像を追加"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                  </Button>

                  {/* カラー選択 */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200" title="色を変更">
                        <Palette className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                      <div className="grid grid-cols-5 gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                        {NOTE_COLORS.map((color) => (
                          <div
                            key={color.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('🎨 編集中メモのカラー変更:', color.value, 'メモID:', editingNoteId);
                              setEditingNoteData(prev => prev ? ({ ...prev, color: color.value }) : null);
                              if (editingNoteId) {
                                updateExistingNote(editingNoteId, { color: color.value });
                              }
                            }}
                            className={`w-6 h-6 rounded-full cursor-pointer border-2 hover:scale-110 transition-transform ${
                              noteData.color === color.value ? 'ring-2 ring-blue-400' : ''
                            } ${color.value === "bg-white" ? "bg-white border-gray-300" : color.value}`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* カテゴリー選択 */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-gray-200" 
                        title="カテゴリー"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <FolderOpen className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      side="bottom"
                      align="start"
                    >
                      {CATEGORIES.map((category) => (
                        <DropdownMenuItem
                          key={category.value}
                          onMouseDown={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            const newData = editingNoteData ? ({ ...editingNoteData, category: category.value }) : null;
                            if (newData && editingNoteId) {
                              setEditingNoteData(newData);
                              
                              // 直接Firebaseに保存
                              await updateExistingNote(editingNoteId, { category: category.value });
                            }
                          }}
                          className={noteData.category === category.value ? 'bg-gray-100' : ''}
                        >
                          <span className="mr-2">{category.icon}</span>
                          {category.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* ピン留め */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingNoteData(prev => prev ? ({ ...prev, isPinned: !prev.isPinned }) : null);
                      autoSaveEditNote();
                    }}
                    className={`h-7 w-7 p-0 hover:bg-gray-200 ${noteData.isPinned ? 'text-blue-600' : ''}`}
                    title="ピン留め"
                  >
                    <Pin className={`w-3 h-3 ${noteData.isPinned ? 'fill-current' : ''}`} />
                  </Button>

                  {/* チェックリスト */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingNoteData(prev => prev ? ({ 
                        ...prev, 
                        isCheckList: !prev.isCheckList,
                        checkItems: !prev.isCheckList ? [{ id: Date.now().toString(), text: '', checked: false }] : [],
                        content: !prev.isCheckList ? '' : prev.content // チェックリストに切り替え時はコンテンツをクリア
                      }) : null);
                      autoSaveEditNote();
                    }}
                    className={`h-7 w-7 p-0 hover:bg-gray-200 ${noteData.isCheckList ? 'text-blue-600' : ''}`}
                    title="チェックリスト"
                  >
                    <CheckSquare className={`w-3 h-3 ${noteData.isCheckList ? 'fill-current' : ''}`} />
                  </Button>
                  
                  {/* リマインダー */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 hover:bg-gray-200 ${noteData.reminder ? 'text-orange-600' : ''}`}
                        title="リマインダー"
                      >
                        <Bell className={`w-3 h-3 ${noteData.reminder ? 'fill-current' : ''}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onEscapeKeyDown={(e) => e.preventDefault()}
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onFocusOutside={(e) => e.preventDefault()}
                      onInteractOutside={(e) => e.preventDefault()}
                    >
                      <div className="p-3 space-y-2" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                        <div className="text-sm font-medium">リマインダー設定</div>
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={noteData.reminder?.date || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setEditingNoteData(prev => prev ? ({
                                ...prev,
                                reminder: {
                                  date: e.target.value,
                                  time: prev.reminder?.time || '09:00'
                                }
                              }) : null);
                              autoSaveEditNote();
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            className="text-xs"
                          />
                          <Input
                            type="time"
                            value={noteData.reminder?.time || '09:00'}
                            onChange={(e) => {
                              e.stopPropagation();
                              setEditingNoteData(prev => prev ? ({
                                ...prev,
                                reminder: {
                                  date: prev.reminder?.date || new Date().toISOString().split('T')[0],
                                  time: e.target.value
                                }
                              }) : null);
                              autoSaveEditNote();
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            className="text-xs"
                          />
                          {noteData.reminder && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNoteData(prev => prev ? ({ ...prev, reminder: null }) : null);
                                autoSaveEditNote();
                              }}
                              className="w-full text-xs"
                            >
                              リマインダーを削除
                            </Button>
                          )}
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* ラベル */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 hover:bg-gray-200 ${noteData.labels.length > 0 ? 'text-green-600' : ''}`}
                        title="ラベル"
                      >
                        <Tag className={`w-3 h-3 ${noteData.labels.length > 0 ? 'fill-current' : ''}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onEscapeKeyDown={(e) => e.preventDefault()}
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onFocusOutside={(e) => e.preventDefault()}
                      onInteractOutside={(e) => e.preventDefault()}
                    >
                      <div className="p-3 space-y-2" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                        <div className="text-sm font-medium">ラベル追加</div>
                        <Input
                          placeholder="ラベル名を入力..."
                          onKeyPress={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              const label = input.value.trim();
                              if (label && !noteData.labels.includes(label)) {
                                setEditingNoteData(prev => prev ? ({
                                  ...prev,
                                  labels: [...prev.labels, label]
                                }) : null);
                                autoSaveEditNote();
                                input.value = '';
                              }
                            }
                          }}
                          onFocus={(e) => e.stopPropagation()}
                          onBlur={(e) => e.stopPropagation()}
                          className="text-xs"
                        />
                        {noteData.labels.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">現在のラベル:</div>
                            {noteData.labels.map((label, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded text-xs">
                                <span>{label}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingNoteData(prev => prev ? ({
                                      ...prev,
                                      labels: prev.labels.filter(l => l !== label)
                                    }) : null);
                                    autoSaveEditNote();
                                  }}
                                  className="h-4 w-4 p-0 hover:bg-gray-200"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ) : (
            /* 表示モード */
            <>
              {/* ピン留めアイコン */}
              {note.isPinned && (
                <div className="absolute top-2 right-2">
                  <Pin className="w-4 h-4 text-blue-600 fill-current" />
                </div>
              )}

              {/* カテゴリー表示 */}
              {note.category && note.category !== 'personal' && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-gray-500">
                    {CATEGORIES.find(c => c.value === note.category)?.icon} {CATEGORIES.find(c => c.value === note.category)?.label}
                  </span>
                </div>
              )}

              {/* タイトル */}
              {note.title && (
                <h3 className={`font-medium text-gray-900 mb-2 line-clamp-3 ${textSizes.title} break-words`}>
                  {note.title}
                </h3>
              )}
              
              {/* コンテンツまたはチェックリスト */}
              {(note as any).isCheckList ? (
                <div className="mb-2 space-y-1">
                  {((note as any).checkItems || []).slice(0, 5).map((item: any, index: number) => (
                    <div key={item.id || index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          const updatedItems = [...((note as any).checkItems || [])];
                          updatedItems[index] = { ...item, checked: e.target.checked };
                          updateExistingNote(note.id, { checkItems: updatedItems });
                        }}
                        className="w-3 h-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className={`${textSizes.content} ${item.checked ? 'line-through text-gray-500' : 'text-gray-700'} break-words`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {((note as any).checkItems || []).length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{((note as any).checkItems || []).length - 5} 個のアイテム
                    </div>
                  )}
                </div>
              ) : (
                note.content && (
                  <p className={`text-gray-700 whitespace-pre-wrap line-clamp-6 mb-2 ${textSizes.content} break-words overflow-hidden`}>
                    {note.content}
                  </p>
                )
              )}

              {/* リマインダー表示 */}
              {(note as any).reminder && (
                <div className={`flex items-center gap-1 mb-2 ${
                  (() => {
                    const reminderDateTime = new Date(`${(note as any).reminder.date}T${(note as any).reminder.time}`);
                    const now = new Date();
                    return reminderDateTime <= now ? 'text-red-600 font-medium animate-pulse' : 'text-orange-600';
                  })()
                }`}>
                  <Bell className="w-3 h-3" />
                  <span className="text-xs">
                    {new Date((note as any).reminder.date).toLocaleDateString('ja-JP')} {(note as any).reminder.time}
                    {(() => {
                      const reminderDateTime = new Date(`${(note as any).reminder.date}T${(note as any).reminder.time}`);
                      const now = new Date();
                      if (reminderDateTime <= now) {
                        return ' (期限切れ)';
                      }
                      return '';
                    })()}
                  </span>
                </div>
              )}

              {/* ラベル表示 */}
              {(note as any).labels && (note as any).labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(note as any).labels.slice(0, 3).map((label: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {label}
                    </span>
                  ))}
                  {(note as any).labels.length > 3 && (
                    <span className="text-xs text-gray-500">+{(note as any).labels.length - 3}</span>
                  )}
                </div>
              )}

              {/* 画像表示 */}
              {note.imageUrls && note.imageUrls.length > 0 && (
                <div className="mb-2 space-y-2 max-w-full">
                  {note.imageUrls.slice(0, 2).map((url, index) => (
                    <div key={index} className="relative group/image">
                      <img
                        src={url}
                        alt=""
                        className="w-full max-h-48 object-cover rounded cursor-pointer hover:opacity-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageUrl(url);
                        }}
                      />
                      {/* 画像削除ボタン（ホバー時に表示） */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const noteToUpdate = filteredNotes.find(n => n.id === note.id);
                          if (noteToUpdate) {
                            updateExistingNote(note.id, {
                              imageUrls: noteToUpdate.imageUrls?.filter(u => u !== url) || []
                            });
                          }
                        }}
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 text-white opacity-0 group-hover/image:opacity-100 hover:bg-red-600 rounded-full transition-opacity"
                        title="画像を削除"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {note.imageUrls.length > 2 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{note.imageUrls.length - 2} 枚の画像
                    </div>
                  )}
                </div>
              )}

              {/* タグ */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{note.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* ツールバー（ホバーで表示） */}
              <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                <div className="flex items-center gap-1">
                  {/* ピン留め */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateExistingNote(note.id, { isPinned: !note.isPinned });
                    }}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                    title="ピン留め"
                  >
                    <Pin className={`w-4 h-4 ${note.isPinned ? 'text-blue-600 fill-current' : 'text-gray-500'}`} />
                  </Button>

                  {/* アーカイブ */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleArchive(note.id);
                    }}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                    title="アーカイブ"
                  >
                    <Archive className="w-4 h-4 text-gray-500" />
                  </Button>
                </div>
                
                {/* その他メニュー */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 p-0 hover:bg-gray-200"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </div>
      
        {/* 挿入位置インジケーター（カードの下） */}
        {showDropIndicatorAfter && (
          <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mt-2 rounded-full shadow-lg" />
        )}
        
        {/* 最後のカードの後のインジケーター */}
        {index === displayNotes.length - 1 && dropIndicator?.index === displayNotes.length && (
          <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mt-2 rounded-full shadow-lg" />
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StickyNote className="w-8 h-8 text-yellow-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">メモ</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>総メモ数: <span className="font-bold text-blue-600">{stats.total}</span></span>
                  <span>アクティブ: <span className="font-bold text-green-600">{stats.total - stats.archived}</span></span>
                  <span>アーカイブ: <span className="font-bold text-gray-600">{stats.archived}</span></span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="メモを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* サイドバー */}
          <div ref={sidebarRef} className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col relative z-10 pointer-events-auto">
          {/* サイドバーヘッダー */}
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900">フィルター</h2>
          </div>

          {/* フィルター */}
          <div className="flex-1 p-4">
            <div className="space-y-1">
              <Button
                variant={!showArchived && selectedCategory === "all" ? "secondary" : "ghost"}
                onClick={() => {
                  setShowArchived(false);
                  setSelectedCategory("all");
                }}
                className="w-full justify-start gap-2 h-8 text-sm"
              >
                <StickyNote className="w-4 h-4" />
                すべてのメモ
                <span className="ml-auto text-xs text-gray-500">
                  {notes.filter(note => !note.isArchived).length}
                </span>
              </Button>
              
              {CATEGORIES.map((category) => (
                <Button
                  key={category.value}
                  variant={!showArchived && selectedCategory === category.value ? "secondary" : "ghost"}
                  onClick={() => {
                    setShowArchived(false);
                    setSelectedCategory(category.value);
                  }}
                  className="w-full justify-start gap-2 h-8 text-sm"
                >
                  <span>{category.icon}</span>
                  {category.label}
                  <span className="ml-auto text-xs text-gray-500">
                    {notes.filter(note => note.category === category.value && !note.isArchived).length}
                  </span>
                </Button>
              ))}
              
              <Button
                variant={showArchived ? "secondary" : "ghost"}
                onClick={() => {
                  setShowArchived(true);
                  setSelectedCategory("all");
                }}
                className="w-full justify-start gap-2 h-8 text-sm"
              >
                <Archive className="w-4 h-4" />
                アーカイブ
                <span className="ml-auto text-xs text-gray-500">
                  {notes.filter(note => note.isArchived).length}
                </span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col">
          {/* 表示設定バー */}
          <div className="bg-white px-6 py-2">
            <div className="flex items-center justify-end gap-4">
              {/* 表示形式 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">表示:</span>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-7 w-7 p-0"
                    title="グリッド表示"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-7 w-7 p-0"
                    title="リスト表示"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* サイズ */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">サイズ:</span>
                <div className="flex gap-1">
                  <Button
                    variant={noteSize === 'small' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setNoteSize('small')}
                    className="h-7 w-7 p-0"
                    title="小"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={noteSize === 'medium' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setNoteSize('medium')}
                    className="h-7 w-7 p-0"
                    title="中"
                  >
                    <div className="w-4 h-4 border-2 border-current rounded" />
                  </Button>
                  <Button
                    variant={noteSize === 'large' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setNoteSize('large')}
                    className="h-7 w-7 p-0"
                    title="大"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="w-full">
              {/* 期限切れリマインダー通知 */}
              {overdueReminders.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <Bell className="w-5 h-5 animate-pulse" />
                    期限切れのリマインダー ({overdueReminders.length}件)
                  </div>
                  <div className="space-y-2">
                    {overdueReminders.slice(0, 3).map(note => {
                      const reminder = (note as any).reminder;
                      return (
                        <div key={note.id} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div>
                            <div className="font-medium text-sm">{note.title || '無題のメモ'}</div>
                            <div className="text-xs text-gray-600">
                              期限: {new Date(reminder.date).toLocaleDateString('ja-JP')} {reminder.time}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateExistingNote(note.id, { reminder: null });
                            }}
                            className="text-xs"
                          >
                            完了
                          </Button>
                        </div>
                      );
                    })}
                    {overdueReminders.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{overdueReminders.length - 3}件のリマインダー
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 新規メモ入力エリア */}
              {!showArchived && (
                <div 
                  ref={newNoteContainerRef}
                  className={`mb-6 max-w-4xl mx-auto transition-all duration-200 ${
                    isNewNoteExpanded ? `${getColorClass(newNoteData.color)} shadow-lg` : 'bg-white/80 hover:bg-white hover:shadow-md'
                  } rounded-lg border ${
                    isNewNoteExpanded ? 'border-gray-300' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {!isNewNoteExpanded ? (
                    /* 縮小状態：入力プレースホルダー */
                    <div
                      className="p-4 cursor-text"
                      onClick={() => {
                        setIsNewNoteExpanded(true);
                        setTimeout(() => newNoteInputRef.current?.focus(), 100);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <StickyNote className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-500 text-lg">メモを入力...</span>
                      </div>
                    </div>
                  ) : (
                    /* 展開状態：フル入力フォーム */
                    <div className="p-4 space-y-3">
                      {/* タイトル入力 */}
                      <Input
                        ref={newNoteInputRef}
                        placeholder="タイトル"
                        value={newNoteData.title}
                        onChange={(e) => {
                          setNewNoteData(prev => ({ ...prev, title: e.target.value }));
                          autoSaveNewNote();
                        }}
                        className="text-base font-medium border-none shadow-none focus:ring-0 p-0 placeholder-gray-400"
                      />

                      {/* コンテンツ入力またはチェックリスト */}
                      {newNoteData.isCheckList ? (
                        <div className="space-y-2">
                          {newNoteData.checkItems.map((item, index) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => {
                                  const updatedItems = [...newNoteData.checkItems];
                                  updatedItems[index] = { ...item, checked: e.target.checked };
                                  setNewNoteData(prev => ({ ...prev, checkItems: updatedItems }));
                                  autoSaveNewNote();
                                }}
                                className="w-4 h-4"
                              />
                              <Input
                                value={item.text}
                                onChange={(e) => {
                                  const updatedItems = [...newNoteData.checkItems];
                                  updatedItems[index] = { ...item, text: e.target.value };
                                  setNewNoteData(prev => ({ ...prev, checkItems: updatedItems }));
                                  autoSaveNewNote();
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const newId = Date.now().toString();
                                    setNewNoteData(prev => ({
                                      ...prev,
                                      checkItems: [...prev.checkItems, { id: newId, text: '', checked: false }]
                                    }));
                                    autoSaveNewNote();
                                  }
                                }}
                                placeholder="チェックリストアイテム..."
                                className={`flex-1 text-sm border-none shadow-none focus:ring-0 p-0 placeholder-gray-400 ${item.checked ? 'line-through text-gray-500' : ''}`}
                              />
                              {newNoteData.checkItems.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setNewNoteData(prev => ({
                                      ...prev,
                                      checkItems: prev.checkItems.filter(i => i.id !== item.id)
                                    }));
                                    autoSaveNewNote();
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-gray-200"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newId = Date.now().toString();
                              setNewNoteData(prev => ({
                                ...prev,
                                checkItems: [...prev.checkItems, { id: newId, text: '', checked: false }]
                              }));
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            + アイテムを追加
                          </Button>
                        </div>
                      ) : (
                        <Textarea
                          ref={newNoteContentRef}
                          placeholder="メモを入力..."
                          value={newNoteData.content}
                          onChange={(e) => {
                            setNewNoteData(prev => ({ ...prev, content: e.target.value }));
                            autoSaveNewNote();
                          }}
                          className="min-h-20 resize-none border-none shadow-none focus:ring-0 p-0 placeholder-gray-400 text-sm"
                          rows={3}
                        />
                      )}

                      {/* アップロードされた画像 */}
                      {newNoteData.imageUrls.length > 0 ? (
                        <div className="space-y-2 max-w-full">
                          {newNoteData.imageUrls.map((url, index) => {
                            console.log(`Rendering image ${index}:`, { 
                              urlLength: url.length, 
                              urlPreview: url.substring(0, 50) + '...', 
                              isBase64: url.startsWith('data:') 
                            });
                            return (
                              <div key={index} className="relative group overflow-hidden rounded">
                                <img
                                  src={url}
                                  alt={`画像 ${index + 1}`}
                                  className="w-full max-h-64 object-cover rounded cursor-pointer hover:opacity-90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageUrl(url);
                                  }}
                                  onLoad={() => console.log(`✅ Image ${index} loaded successfully`)}
                                  onError={(e) => console.error(`❌ Image ${index} failed to load:`, e)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleImageDelete(url)}
                                  className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 rounded-full"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {/* タグ入力 */}
                      {newNoteData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newNoteData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                            >
                              #{tag}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-red-500"
                                onClick={() => removeTag(tag)}
                              />
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* ツールバー */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          {/* 画像追加 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-8 w-8 p-0 hover:bg-gray-200"
                            title="画像を追加"
                          >
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Image className="w-4 h-4" />
                            )}
                          </Button>

                          {/* カラー選択 */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200" title="色を変更">
                                <Palette className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                              <div className="grid grid-cols-5 gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                                {NOTE_COLORS.map((color) => (
                                  <div
                                    key={color.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('🎨 新規メモのカラー変更:', color.value);
                                      setNewNoteData(prev => ({ ...prev, color: color.value }));
                                    }}
                                    className={`w-8 h-8 rounded-full cursor-pointer border-2 hover:scale-110 transition-transform ${
                                      newNoteData.color === color.value ? 'ring-2 ring-blue-400' : ''
                                    } ${color.value === "bg-white" ? "bg-white border-gray-300" : color.value}`}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* カテゴリー選択 */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200" title="カテゴリー">
                                <FolderOpen className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                              {CATEGORIES.map((category) => (
                                <DropdownMenuItem
                                  key={category.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewNoteData(prev => ({ ...prev, category: category.value }));
                                  }}
                                  className={newNoteData.category === category.value ? 'bg-gray-100' : ''}
                                >
                                  <span className="mr-2">{category.icon}</span>
                                  {category.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* ピン留め */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewNoteData(prev => ({ ...prev, isPinned: !prev.isPinned }));
                            }}
                            className={`h-8 w-8 p-0 hover:bg-gray-200 ${newNoteData.isPinned ? 'text-blue-600' : ''}`}
                            title="ピン留め"
                          >
                            <Pin className={`w-4 h-4 ${newNoteData.isPinned ? 'fill-current' : ''}`} />
                          </Button>

                          {/* チェックリスト */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewNoteData(prev => ({ 
                                ...prev, 
                                isCheckList: !prev.isCheckList,
                                checkItems: !prev.isCheckList ? [{ id: Date.now().toString(), text: '', checked: false }] : [],
                                content: !prev.isCheckList ? '' : prev.content // チェックリストに切り替え時はコンテンツをクリア
                              }));
                            }}
                            className={`h-8 w-8 p-0 hover:bg-gray-200 ${newNoteData.isCheckList ? 'text-blue-600' : ''}`}
                            title="チェックリスト"
                          >
                            <CheckSquare className={`w-4 h-4 ${newNoteData.isCheckList ? 'fill-current' : ''}`} />
                          </Button>

                          {/* リマインダー */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 hover:bg-gray-200 ${newNoteData.reminder ? 'text-orange-600' : ''}`}
                                title="リマインダー"
                              >
                                <Bell className={`w-4 h-4 ${newNoteData.reminder ? 'fill-current' : ''}`} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              onCloseAutoFocus={(e) => e.preventDefault()}
                              onEscapeKeyDown={(e) => e.preventDefault()}
                              onPointerDownOutside={(e) => e.preventDefault()}
                              onFocusOutside={(e) => e.preventDefault()}
                              onInteractOutside={(e) => e.preventDefault()}
                            >
                              <div className="p-3 space-y-2" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                <div className="text-sm font-medium">リマインダー設定</div>
                                <div className="space-y-2">
                                  <Input
                                    type="date"
                                    value={newNoteData.reminder?.date || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setNewNoteData(prev => ({
                                        ...prev,
                                        reminder: {
                                          date: e.target.value,
                                          time: prev.reminder?.time || '09:00'
                                        }
                                      }));
                                    }}
                                    onFocus={(e) => e.stopPropagation()}
                                    onBlur={(e) => e.stopPropagation()}
                                    className="text-xs"
                                  />
                                  <Input
                                    type="time"
                                    value={newNoteData.reminder?.time || '09:00'}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setNewNoteData(prev => ({
                                        ...prev,
                                        reminder: {
                                          date: prev.reminder?.date || new Date().toISOString().split('T')[0],
                                          time: e.target.value
                                        }
                                      }));
                                    }}
                                    onFocus={(e) => e.stopPropagation()}
                                    onBlur={(e) => e.stopPropagation()}
                                    className="text-xs"
                                  />
                                  {newNoteData.reminder && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewNoteData(prev => ({ ...prev, reminder: null }));
                                      }}
                                      className="w-full text-xs"
                                    >
                                      リマインダーを削除
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* ラベル */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 hover:bg-gray-200 ${newNoteData.labels.length > 0 ? 'text-green-600' : ''}`}
                                title="ラベル"
                              >
                                <Tag className={`w-4 h-4 ${newNoteData.labels.length > 0 ? 'fill-current' : ''}`} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              onCloseAutoFocus={(e) => e.preventDefault()}
                              onEscapeKeyDown={(e) => e.preventDefault()}
                              onPointerDownOutside={(e) => e.preventDefault()}
                              onFocusOutside={(e) => e.preventDefault()}
                              onInteractOutside={(e) => e.preventDefault()}
                            >
                              <div className="p-3 space-y-2" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                <div className="text-sm font-medium">ラベル追加</div>
                                <Input
                                  placeholder="ラベル名を入力..."
                                  onKeyPress={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                      const input = e.target as HTMLInputElement;
                                      const label = input.value.trim();
                                      if (label && !newNoteData.labels.includes(label)) {
                                        setNewNoteData(prev => ({
                                          ...prev,
                                          labels: [...prev.labels, label]
                                        }));
                                        input.value = '';
                                      }
                                    }
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                  onBlur={(e) => e.stopPropagation()}
                                  className="text-xs"
                                />
                                {newNoteData.labels.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-gray-500">現在のラベル:</div>
                                    {newNoteData.labels.map((label, index) => (
                                      <div key={index} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded text-xs">
                                        <span>{label}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNewNoteData(prev => ({
                                              ...prev,
                                              labels: prev.labels.filter(l => l !== label)
                                            }));
                                          }}
                                          className="h-4 w-4 p-0 hover:bg-gray-200"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* メモリスト */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="text-gray-600">メモを読み込み中...</div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-600">エラー: {error}</div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-16">
                  <StickyNote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    {searchQuery || showArchived
                      ? "該当するメモが見つかりません" 
                      : "まだメモがありません"}
                  </p>
                  <p className="text-gray-400">
                    {searchQuery || showArchived
                      ? "検索条件を変更してみてください"
                      : "上の入力欄からメモを作成できます"}
                  </p>
                </div>
              ) : (
                <div 
                  ref={containerRef}
                  className={`${getNoteContainerClass()} overflow-hidden`}
                  onDragOver={(e) => {
                    // コンテナ最後への挿入をサポート
                    if (draggedNote) {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const isAtBottom = e.clientY > rect.bottom - 50;
                      if (isAtBottom) {
                        setDropIndicator({ index: displayNotes.length, position: 'before' });
                      }
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedNote && dropIndicator?.index === displayNotes.length) {
                      handleNoteDrop(e, displayNotes.length - 1);
                    }
                  }}
                >
                  {displayNotes.map((note, index) => renderNoteCard(note, index))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleImageUpload(e.target.files)}
      />

      {/* 編集用ファイル入力 */}
      <input
        ref={editFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleImageUpload(e.target.files, true)}
      />

      {/* 画像拡大表示モーダル */}
      {selectedImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <img
            src={selectedImageUrl}
            alt=""
            className="max-w-full max-h-full rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedImageUrl(null)}
            className="absolute top-4 right-4 h-8 w-8 p-0 bg-white text-black hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      </div>
    </div>
  );
};

export default NotesPage;