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
  
  // フォーム状態（新規作成用）
  const [newNoteData, setNewNoteData] = useState({
    title: "",
    content: "",
    category: "personal" as Note['category'],
    color: "bg-yellow-100",
    tags: [] as string[],
    imageUrls: [] as string[],
    isPinned: false,
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
  } | null>(null);
  
  // Refs
  const newNoteInputRef = useRef<HTMLInputElement>(null);
  const newNoteContentRef = useRef<HTMLTextAreaElement>(null);
  const newNoteContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // その他の状態
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");

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
      // 新規メモの展開状態をリセット
      if (isNewNoteExpanded && newNoteContainerRef.current && !newNoteContainerRef.current.contains(event.target as Node)) {
        if (newNoteData.title.trim() || newNoteData.content.trim() || newNoteData.imageUrls.length > 0) {
          handleCreateNewNote();
        } else {
          resetNewNoteForm();
        }
      }

      // 編集中のメモを終了
      if (editingNoteId && !document.querySelector(`[data-note-id="${editingNoteId}"]`)?.contains(event.target as Node)) {
        if (editingNoteData && editingNoteId) {
          handleUpdateNote(editingNoteId);
        } else {
          stopEditingNote();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNewNoteExpanded, editingNoteId, newNoteData, editingNoteData]);

  // フィルタリングされたメモ
  const filteredNotes = useMemo(() => {
    const baseFilters = {
      searchQuery: searchQuery || undefined,
      isArchived: showArchived,
      category: selectedCategory !== "all" ? (selectedCategory as Note['category']) : undefined,
    };
    
    return filterNotes(baseFilters);
  }, [notes, searchQuery, selectedCategory, showArchived, filterNotes]);

  // 新規メモフォームリセット（完全リセット）
  const resetNewNoteForm = () => {
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
    if (!newNoteData.title.trim() && !newNoteData.content.trim() && newNoteData.imageUrls.length === 0) return;

    const noteData = {
      title: newNoteData.title || "無題のメモ",
      content: newNoteData.content,
      category: newNoteData.category,
      color: newNoteData.color,
      tags: newNoteData.tags,
      imageUrls: newNoteData.imageUrls,
      isPinned: newNoteData.isPinned,
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
      if (newNoteData.title.trim() || newNoteData.content.trim() || newNoteData.imageUrls.length > 0) {
        handleCreateNewNote();
      }
    }, 1000); // 1秒後に自動保存
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

  // ドラッグ&ドロップ処理（個別メモカード用）

  const handleNoteDragOver = (e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverNote(noteId);
  };

  const handleNoteDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 現在の要素から離れた場合のみリセット
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverNote(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, noteId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverNote(null);

    console.log("Drop event triggered", { noteId, filesCount: e.dataTransfer.files.length });

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    console.log("Dropped files:", { 
      totalFiles: files.length,
      imageFiles: imageFiles.length,
      fileTypes: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
    });
    
    if (imageFiles.length === 0) {
      console.warn("No image files in dropped files");
      alert("画像ファイルをドロップしてください");
      return;
    }

    if (noteId && noteId !== 'new') {
      // 既存メモに画像を追加
      const note = filteredNotes.find(n => n.id === noteId);
      if (!note) return;

      console.log("Adding images to existing note:", noteId);
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

  // メモサイズのクラス取得
  const getNoteContainerClass = () => {
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

  // メモカードのレンダリング関数
  const renderNoteCard = (note: Note) => {
    const isEditing = editingNoteId === note.id;
    const noteData = isEditing ? editingNoteData : null;
    const isDraggedOver = draggedOverNote === note.id;
    const textSizes = getNoteTextSize();
    
    return (
      <div
        key={note.id}
        data-note-id={note.id}
        className={`${getColorClass(note.color)} break-inside-avoid hover:shadow-lg transition-all duration-200 group border cursor-pointer relative rounded-lg overflow-hidden ${
          viewMode === 'list' ? 'mb-2' : ''
        } ${isDraggedOver ? 'ring-2 ring-blue-400 bg-blue-50 shadow-xl' : ''}`}
        onClick={() => !isEditing && startEditingNote(note)}
        onDragOver={(e) => handleNoteDragOver(e, note.id)}
        onDragLeave={handleNoteDragLeave}
        onDrop={(e) => handleDrop(e, note.id)}
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
                className={`${textSizes.title} font-medium border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400`}
              />
              
              {/* コンテンツ編集 */}
              <Textarea
                value={noteData.content}
                onChange={(e) => {
                  setEditingNoteData(prev => prev ? ({ ...prev, content: e.target.value }) : null);
                  autoSaveEditNote();
                }}
                placeholder="メモを入力..."
                className={`min-h-20 resize-none border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 ${textSizes.content}`}
              />

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
                <div className="grid gap-2">
                  {noteData.imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="w-full rounded cursor-pointer hover:opacity-90"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200" title="色を変更">
                        <Palette className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div className="grid grid-cols-5 gap-2 p-2">
                        {NOTE_COLORS.map((color) => (
                          <div
                            key={color.value}
                            onClick={() => {
                              setEditingNoteData(prev => prev ? ({ ...prev, color: color.value }) : null);
                              autoSaveEditNote();
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

                  {/* タグ追加 */}
                  <div className="flex gap-1">
                    <Input
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(editTagInput, true);
                        }
                      }}
                      placeholder="タグ追加..."
                      className="text-xs h-7 w-20 bg-transparent border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 表示モード */
            <>
              {/* タイトル */}
              {note.title && (
                <h3 className={`font-medium text-gray-900 mb-2 line-clamp-3 ${textSizes.title}`}>
                  {note.title}
                </h3>
              )}
              
              {/* コンテンツ */}
              {note.content && (
                <p className={`text-gray-700 whitespace-pre-wrap line-clamp-6 mb-2 ${textSizes.content}`}>
                  {note.content}
                </p>
              )}

              {/* 画像表示 */}
              {note.imageUrls && note.imageUrls.length > 0 && (
                <div className="mb-2 grid gap-1">
                  {note.imageUrls.slice(0, 3).map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt=""
                      className="w-full rounded cursor-pointer hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageUrl(url);
                      }}
                    />
                  ))}
                  {note.imageUrls.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{note.imageUrls.length - 3} 枚の画像
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
                      // TODO: ピン留め機能実装
                    }}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                    title="ピン留め"
                  >
                    <Pin className="w-4 h-4 text-gray-500" />
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
              {/* Firebase Storage テストボタン */}
              <Button
                variant="outline"
                onClick={() => {
                  console.log("🔥 Manual Firebase Storage test triggered");
                  alert("テストボタンがクリックされました！コンソールを確認してください。");
                  
                  const runImageTest = async () => {
                    try {
                      console.log("🔥 Starting image test...");
                      
                      // 1x1 ピクセルの透明PNGを作成
                      const canvas = document.createElement('canvas');
                      canvas.width = 10;
                      canvas.height = 10;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
                        ctx.fillRect(0, 0, 10, 10);
                        console.log("🔥 Canvas created");
                      }
                      
                      canvas.toBlob(async (blob) => {
                        console.log("🔥 Blob created:", blob);
                        if (blob) {
                          const testFile = new File([blob], 'test_image.png', { type: 'image/png' });
                          console.log("🔥 Created test image file:", testFile);
                          
                          console.log("🔥 Calling uploadImages function...");
                          const { urls, errors } = await uploadImages([testFile], currentUser.id);
                          
                          console.log("🔥 Upload result:", { urls, errors });
                          
                          if (urls.length > 0) {
                            alert("✅ 画像アップロードテスト成功！\nURL: " + urls[0]);
                            console.log("✅ Image upload test successful:", urls);
                          } else {
                            alert("❌ 画像アップロードテスト失敗\nエラー: " + errors.join(", "));
                            console.error("❌ Image upload test failed:", errors);
                          }
                        } else {
                          console.error("❌ Blob creation failed");
                          alert("❌ Blob作成に失敗しました");
                        }
                      }, 'image/png');
                    } catch (error) {
                      console.error("❌ Test image creation failed:", error);
                      alert("❌ テスト画像の作成に失敗しました: " + error.message);
                    }
                  };
                  
                  runImageTest();
                }}
                className="text-sm"
              >
                🔥 画像テスト
              </Button>

              {/* 直接画像追加テストボタン */}
              <Button
                variant="outline"
                onClick={() => {
                  console.log("🔥 Direct image add test clicked");
                  console.log("🔥 Current newNoteData:", newNoteData);
                  
                  // 直接Base64画像を追加してテスト
                  const testBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                  
                  setNewNoteData(prev => {
                    const updated = {
                      ...prev,
                      imageUrls: [...prev.imageUrls, testBase64]
                    };
                    console.log("🔥 Updated newNoteData with test image:", updated);
                    return updated;
                  });
                  
                  setIsNewNoteExpanded(true);
                  alert("テスト画像を新規メモに直接追加しました！");
                }}
                className="text-sm"
              >
                直接画像追加
              </Button>

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
          <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* サイドバーヘッダー */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">フィルター</h2>
              
              {/* 表示設定 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-2">表示形式</div>
                    <div className="flex gap-1 mb-3">
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
                    <div className="text-xs text-gray-500 mb-2">サイズ</div>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                  {stats.total - stats.archived}
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
                    {stats.byCategory[category.value] || 0}
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
                  {stats.archived}
                </span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="w-full">

              {/* 新規メモ入力エリア */}
              {!showArchived && (
                <div 
                  ref={newNoteContainerRef}
                  className={`mb-6 max-w-4xl mx-auto transition-all duration-200 ${
                    isNewNoteExpanded ? 'bg-white shadow-lg' : 'bg-white/80 hover:bg-white hover:shadow-md'
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

                      {/* コンテンツ入力 */}
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

                      {/* アップロードされた画像 */}
                      {newNoteData.imageUrls.length > 0 ? (
                        <div className="grid gap-2">
                          <div className="text-xs text-green-600 mb-1">
                            画像 {newNoteData.imageUrls.length}枚 (Base64形式)
                          </div>
                          {newNoteData.imageUrls.map((url, index) => {
                            console.log(`Rendering image ${index}:`, { 
                              urlLength: url.length, 
                              urlPreview: url.substring(0, 50) + '...', 
                              isBase64: url.startsWith('data:') 
                            });
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`画像 ${index + 1}`}
                                  className="w-full rounded cursor-pointer hover:opacity-90"
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
                      ) : (
                        <div className="text-xs text-gray-400">
                          画像がありません（{newNoteData.imageUrls.length}枚）
                        </div>
                      )}

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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200" title="色を変更">
                                <Palette className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="grid grid-cols-5 gap-2 p-2">
                                {NOTE_COLORS.map((color) => (
                                  <div
                                    key={color.value}
                                    onClick={() => {
                                      setNewNoteData(prev => ({ ...prev, color: color.value }));
                                      autoSaveNewNote();
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

                          {/* タグ追加 */}
                          <div className="flex gap-1">
                            <Input
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addTag(newTagInput);
                                }
                              }}
                              placeholder="タグ追加..."
                              className="text-xs h-8 w-24"
                            />
                          </div>
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
                <div className={getNoteContainerClass()}>
                  {filteredNotes.map(renderNoteCard)}
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