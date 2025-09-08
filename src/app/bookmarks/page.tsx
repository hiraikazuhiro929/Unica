"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bookmark,
  Plus,
  Search,
  ExternalLink,
  Edit3,
  Trash2,
  MoreVertical,
  Star,
  Globe,
  FileText,
  Calendar,
  User,
  Filter,
  Grid3X3,
  List,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: 'website' | 'document' | 'task' | 'calendar' | 'other';
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  userId: string;
}

const BOOKMARK_CATEGORIES = [
  { value: 'website', label: 'ウェブサイト', icon: Globe, color: 'bg-blue-100 text-blue-800' },
  { value: 'document', label: 'ドキュメント', icon: FileText, color: 'bg-green-100 text-green-800' },
  { value: 'task', label: 'タスク', icon: User, color: 'bg-purple-100 text-purple-800' },
  { value: 'calendar', label: 'カレンダー', icon: Calendar, color: 'bg-orange-100 text-orange-800' },
  { value: 'other', label: 'その他', icon: Bookmark, color: 'bg-gray-100 text-gray-800' },
];

export default function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    category: "website" as BookmarkItem['category'],
    tags: [] as string[],
    tagInput: "",
  });

  // 初期データ（実際の実装ではFirebaseから読み込み）
  useEffect(() => {
    if (!user?.uid) return;
    
    // モックデータ
    const mockBookmarks: BookmarkItem[] = [
      {
        id: '1',
        title: 'Google Drive - 製造管理文書',
        url: 'https://drive.google.com/drive/folders/manufacturing',
        description: '製造に関する重要な文書類を保管',
        category: 'document',
        tags: ['製造', '文書管理', '重要'],
        isFavorite: true,
        createdAt: new Date('2024-01-15'),
        userId: user.uid,
      },
      {
        id: '2',
        title: 'プロジェクト管理ツール',
        url: 'https://asana.com/project/123',
        description: '現在進行中のプロジェクトタスク管理',
        category: 'task',
        tags: ['プロジェクト', 'タスク管理'],
        isFavorite: false,
        createdAt: new Date('2024-01-10'),
        userId: user.uid,
      },
      {
        id: '3',
        title: '会社カレンダー',
        url: 'https://calendar.google.com/calendar/u/0/r',
        description: '全社イベントと会議スケジュール',
        category: 'calendar',
        tags: ['スケジュール', '会議'],
        isFavorite: true,
        createdAt: new Date('2024-01-08'),
        userId: user.uid,
      },
      {
        id: '4',
        title: '技術文書サイト',
        url: 'https://docs.company.com',
        description: 'API仕様書とマニュアル',
        category: 'website',
        tags: ['技術', 'API', 'マニュアル'],
        isFavorite: false,
        createdAt: new Date('2024-01-05'),
        userId: user.uid,
      }
    ];
    
    setBookmarks(mockBookmarks);
  }, [user?.uid]);

  // フィルタリングされたブックマーク
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch = searchQuery === "" || 
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || bookmark.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || bookmark.isFavorite;
    
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  // フォームリセット
  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      description: "",
      category: "website",
      tags: [],
      tagInput: "",
    });
    setEditingBookmark(null);
  };

  // ブックマーク作成
  const handleCreateBookmark = () => {
    if (!formData.title.trim() || !formData.url.trim() || !user?.uid) return;

    const newBookmark: BookmarkItem = {
      id: Date.now().toString(),
      title: formData.title,
      url: formData.url,
      description: formData.description,
      category: formData.category,
      tags: formData.tags,
      isFavorite: false,
      createdAt: new Date(),
      userId: user.uid,
    };

    setBookmarks(prev => [newBookmark, ...prev]);
    setShowCreateModal(false);
    resetForm();
  };

  // ブックマーク更新
  const handleUpdateBookmark = () => {
    if (!editingBookmark || !formData.title.trim() || !formData.url.trim()) return;

    setBookmarks(prev => prev.map(bookmark =>
      bookmark.id === editingBookmark.id
        ? {
            ...bookmark,
            title: formData.title,
            url: formData.url,
            description: formData.description,
            category: formData.category,
            tags: formData.tags,
          }
        : bookmark
    ));

    setEditingBookmark(null);
    resetForm();
  };

  // ブックマーク削除
  const handleDeleteBookmark = (id: string) => {
    if (!window.confirm("このブックマークを削除しますか？")) return;
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  };

  // お気に入り切り替え
  const toggleFavorite = (id: string) => {
    setBookmarks(prev => prev.map(bookmark =>
      bookmark.id === id
        ? { ...bookmark, isFavorite: !bookmark.isFavorite }
        : bookmark
    ));
  };

  // 編集開始
  const startEditBookmark = (bookmark: BookmarkItem) => {
    setEditingBookmark(bookmark);
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || "",
      category: bookmark.category,
      tags: bookmark.tags,
      tagInput: "",
    });
  };

  // タグ追加
  const addTag = () => {
    const tag = formData.tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagInput: "",
      }));
    }
  };

  // タグ削除
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  // カテゴリー情報取得
  const getCategoryInfo = (category: string) => {
    return BOOKMARK_CATEGORIES.find(cat => cat.value === category) || BOOKMARK_CATEGORIES[0];
  };

  if (!user?.uid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-300">ログインが必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Bookmark className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ブックマーク</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-slate-300">
                  <span>総数: <span className="font-bold text-purple-600">{bookmarks.length}</span></span>
                  <span>お気に入り: <span className="font-bold text-pink-600">{bookmarks.filter(b => b.isFavorite).length}</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ブックマークを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規追加
              </Button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex overflow-hidden">
          {/* サイドバー */}
          <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4">
            <div className="space-y-6">
              {/* 表示設定 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">表示設定</h3>
                <div className="space-y-2">
                  <Button
                    variant={showFavoritesOnly ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className="w-full justify-start"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    お気に入りのみ
                  </Button>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="flex-1"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="flex-1"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* カテゴリーフィルター */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">カテゴリー</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedCategory === "all" ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    すべて ({bookmarks.length})
                  </button>
                  
                  {BOOKMARK_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const count = bookmarks.filter(b => b.category === category.value).length;
                    return (
                      <button
                        key={category.value}
                        onClick={() => setSelectedCategory(category.value)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                          selectedCategory === category.value ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {category.label}
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-slate-600 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ブックマークリスト */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredBookmarks.length === 0 ? (
              <div className="text-center py-16">
                <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">
                  {searchQuery || selectedCategory !== "all" || showFavoritesOnly
                    ? "該当するブックマークが見つかりません"
                    : "まだブックマークがありません"}
                </p>
                <p className="text-gray-400 mb-4">
                  {searchQuery || selectedCategory !== "all" || showFavoritesOnly
                    ? "フィルターを変更してみてください"
                    : "よく使うサイトやドキュメントをブックマークしましょう"}
                </p>
                {!searchQuery && selectedCategory === "all" && !showFavoritesOnly && (
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowCreateModal(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    最初のブックマークを追加
                  </Button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredBookmarks.map((bookmark) => {
                  const categoryInfo = getCategoryInfo(bookmark.category);
                  const Icon = categoryInfo.icon;

                  return (
                    <Card key={bookmark.id} className="group hover:shadow-md transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                              <Icon className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg text-gray-900 dark:text-white line-clamp-1">
                                {bookmark.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${categoryInfo.color} text-xs`}>
                                  {categoryInfo.label}
                                </Badge>
                                {bookmark.isFavorite && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                )}
                              </div>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(bookmark.url, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                開く
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleFavorite(bookmark.id)}>
                                <Star className="w-4 h-4 mr-2" />
                                {bookmark.isFavorite ? 'お気に入り解除' : 'お気に入り追加'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => startEditBookmark(bookmark)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteBookmark(bookmark.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {bookmark.description && (
                          <p className="text-sm text-gray-600 dark:text-slate-300 mb-3 line-clamp-2">
                            {bookmark.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {bookmark.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {bookmark.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{bookmark.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => window.open(bookmark.url, '_blank')}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            開く
                          </Button>
                        </div>
                        
                        <div className="text-xs text-gray-400 mt-2">
                          {bookmark.createdAt.toLocaleDateString('ja-JP')}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 作成・編集モーダル */}
        <Dialog 
          open={showCreateModal || !!editingBookmark} 
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false);
              setEditingBookmark(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBookmark ? "ブックマークを編集" : "新しいブックマーク"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* タイトル */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="ブックマークのタイトル"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* URL */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  URL <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  説明（任意）
                </label>
                <Input
                  placeholder="ブックマークの説明"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* カテゴリー */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  カテゴリー
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BOOKMARK_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: category.value as any }))}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                          formData.category === category.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* タグ */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  タグ
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="タグを入力"
                    value={formData.tagInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    追加
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBookmark(null);
                    resetForm();
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={editingBookmark ? handleUpdateBookmark : handleCreateBookmark}
                  disabled={!formData.title.trim() || !formData.url.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {editingBookmark ? "更新" : "作成"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}