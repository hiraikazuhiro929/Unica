"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StickyNote,
  Pin,
  Archive,
  Trash2,
  MoreVertical,
  Palette,
  X,
  Image,
  Search,
  Loader2,
} from "lucide-react";

// Firebase関数とタイプのインポート
import { Note } from "@/lib/firebase/notes";
import { useNotes } from "./hooks/useNotes";

// カラーパレット
const NOTE_COLORS = [
  { name: "デフォルト", value: "bg-white", class: "bg-white border-gray-200" },
  { name: "黄色", value: "bg-yellow-50", class: "bg-yellow-50 border-yellow-200" },
  { name: "オレンジ", value: "bg-orange-50", class: "bg-orange-50 border-orange-200" },
  { name: "赤", value: "bg-red-50", class: "bg-red-50 border-red-200" },
  { name: "ピンク", value: "bg-pink-50", class: "bg-pink-50 border-pink-200" },
  { name: "紫", value: "bg-purple-50", class: "bg-purple-50 border-purple-200" },
  { name: "青", value: "bg-blue-50", class: "bg-blue-50 border-blue-200" },
  { name: "緑", value: "bg-green-50", class: "bg-green-50 border-green-200" },
  { name: "グレー", value: "bg-gray-50", class: "bg-gray-50 border-gray-200" },
];

const NotesPage = () => {
  // UI状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  
  // Google Keep風の入力状態
  const [isNewNoteExpanded, setIsNewNoteExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // フォーム状態（新規作成用）
  const [newNoteData, setNewNoteData] = useState({
    title: "",
    content: "",
    color: "bg-yellow-50",
    imageUrls: [] as string[],
    isPinned: false,
  });

  // 編集状態
  const [editingNoteData, setEditingNoteData] = useState<{
    title: string;
    content: string;
    color: string;
    imageUrls: string[];
    isPinned: boolean;
  } | null>(null);
  
  // Refs
  const newNoteInputRef = useRef<HTMLInputElement>(null);
  const newNoteContentRef = useRef<HTMLTextAreaElement>(null);
  const newNoteContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // その他の状態
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // モックユーザー（実際の実装では認証から取得）
  const currentUser = {
    id: "user123",
    name: "テストユーザー",
  };

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
  } = useNotes({
    userId: currentUser.id,
    userName: currentUser.name,
    enableRealtime: true,
    limit: 100,
  });

  // 新規メモフォームリセット（完全リセット）
  const resetNewNoteForm = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setNewNoteData({
      title: "",
      content: "",
      color: "bg-yellow-50",
      imageUrls: [],
      isPinned: false,
    });
    setIsNewNoteExpanded(false);
  };

  // 編集モードの開始
  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteData({
      title: note.title,
      content: note.content,
      color: note.color,
      imageUrls: note.imageUrls || [],
      isPinned: note.isPinned || false,
    });
  };

  // 編集モードの終了
  const stopEditingNote = () => {
    if (editAutoSaveTimeoutRef.current) {
      clearTimeout(editAutoSaveTimeoutRef.current);
    }
    setEditingNoteId(null);
    setEditingNoteData(null);
  };

  // 新規メモ作成（自動保存）
  const handleCreateNewNote = useCallback(async () => {
    if (!newNoteData.title.trim() && !newNoteData.content.trim() && newNoteData.imageUrls.length === 0) return;

    const noteData = {
      title: newNoteData.title || "無題のメモ",
      content: newNoteData.content,
      color: newNoteData.color,
      imageUrls: newNoteData.imageUrls,
      isPinned: newNoteData.isPinned,
    };

    const success = await createNewNote(noteData);
    
    if (success) {
      // フォームクリア（展開状態維持）
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      setNewNoteData({
        title: "",
        content: "",
        color: "bg-yellow-50",
        imageUrls: [],
        isPinned: false,
      });
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
      color: editingNoteData.color,
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
    }, 2000); // 2秒後に自動保存
  }, [newNoteData, handleCreateNewNote]);

  // メモ削除
  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm("このメモを削除しますか？")) {
      await deleteNoteById(noteId);
    }
  };

  // カラークラスを取得
  const getColorClass = (color: string) => {
    const colorConfig = NOTE_COLORS.find(c => c.value === color);
    return colorConfig?.class || "bg-white border-gray-200";
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen flex">
        {/* サイドバー */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* サイドバーヘッダー */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <StickyNote className="w-6 h-6 text-yellow-600" />
              <h2 className="text-lg font-medium text-gray-800">メモ</h2>
            </div>
          </div>

          {/* 検索 */}
          <div className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="メモを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                className="w-full justify-start gap-2 h-8"
              >
                <StickyNote className="w-4 h-4" />
                すべてのメモ
                <span className="ml-auto text-xs text-gray-500">
                  {stats.total - stats.archived}
                </span>
              </Button>
              
              <Button
                variant={showArchived ? "secondary" : "ghost"}
                onClick={() => {
                  setShowArchived(true);
                  setSelectedCategory("all");
                }}
                className="w-full justify-start gap-2 h-8"
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
            <div className="max-w-6xl mx-auto">
              {/* 新規メモ入力エリア */}
              {!showArchived && (
                <div 
                  ref={newNoteContainerRef}
                  className={`mb-6 max-w-2xl mx-auto transition-all duration-200 ${
                    isNewNoteExpanded ? 'bg-white' : 'bg-white/80 hover:bg-white'
                  } rounded-lg border-2 ${
                    isNewNoteExpanded ? 'border-yellow-400 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {!isNewNoteExpanded ? (
                    // 縮小状態：入力プレースホルダー
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
                    // 展開状態：フル入力フォーム
                    <div className="p-4 space-y-4">
                      {/* タイトル入力 */}
                      <Input
                        ref={newNoteInputRef}
                        placeholder="タイトル"
                        value={newNoteData.title}
                        onChange={(e) => {
                          setNewNoteData(prev => ({ ...prev, title: e.target.value }));
                          autoSaveNewNote();
                        }}
                        className="text-lg font-medium border-none shadow-none focus:ring-0 p-0 placeholder-gray-400"
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
                        className="min-h-20 resize-none border-none shadow-none focus:ring-0 p-0 placeholder-gray-400"
                      />
                      
                      {/* ツールバー */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          {/* 画像追加 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
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
                              <Button variant="ghost" size="sm" title="色を変更">
                                <Palette className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="grid grid-cols-3 gap-2 p-2">
                                {NOTE_COLORS.map((color) => (
                                  <div
                                    key={color.value}
                                    onClick={() => setNewNoteData(prev => ({ ...prev, color: color.value }))}
                                    className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                                      newNoteData.color === color.value ? 'ring-2 ring-blue-400' : ''
                                    } ${color.value === "bg-white" ? "bg-white border-gray-300" : color.value}`}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (newNoteData.title.trim() || newNoteData.content.trim() || newNoteData.imageUrls.length > 0) {
                                handleCreateNewNote();
                              } else {
                                resetNewNoteForm();
                              }
                            }}
                            className="h-8 text-xs"
                          >
                            閉じる
                          </Button>
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
              ) : notes.length === 0 ? (
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
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4">
                  {notes.map((note) => (
                    <Card
                      key={note.id}
                      data-note-id={note.id}
                      className={`${getColorClass(note.color)} break-inside-avoid hover:shadow-md transition-all duration-200 group border cursor-pointer relative`}
                      onClick={() => startEditingNote(note)}
                    >
                      <CardContent className="p-4">
                        {/* タイトル */}
                        {note.title && (
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {note.title}
                          </h3>
                        )}
                        
                        {/* コンテンツ */}
                        {note.content && (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                            {note.content}
                          </p>
                        )}

                        {/* 画像表示 */}
                        {note.imageUrls && note.imageUrls.length > 0 && (
                          <div className="mt-3 grid gap-2">
                            {note.imageUrls.map((url, index) => (
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
                          </div>
                        )}
                        
                        {/* 作成日時 */}
                        {note.createdAt && note.createdAt.seconds && (
                          <div className="text-xs text-gray-500 mb-2 mt-3">
                            {new Date(note.createdAt.seconds * 1000).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {note.updatedAt && note.updatedAt.seconds && note.updatedAt.seconds !== note.createdAt.seconds && (
                              <span className="ml-2">
                                （更新: {new Date(note.updatedAt.seconds * 1000).toLocaleDateString('ja-JP', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}）
                              </span>
                            )}
                          </div>
                        )}

                        {/* ツールバー（ホバーで表示） */}
                        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1">
                            {/* ピン留め */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: ピン留め機能実装
                              }}
                              className="h-8 w-8 p-0"
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
                              className="h-8 w-8 p-0"
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
                                className="h-8 w-8 p-0"
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
                                <span className="font-medium">削除</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
        onChange={() => {
          // TODO: 画像アップロード処理
        }}
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
        </div>
      )}
    </div>
  );
};

export default NotesPage;