import React, { forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  StickyNote,
  Archive,
  Search,
  Grid3X3,
  List,
  Minimize2,
  Maximize2,
  Bell,
} from 'lucide-react';
import { Note } from '@/lib/firebase/notes';
import { CATEGORIES, ViewMode, NoteSize } from '../types/note';

interface NoteSidebarProps {
  // データ
  notes: Note[];
  overdueReminders: Note[];
  
  // フィルター状態
  searchQuery: string;
  selectedCategory: string;
  showArchived: boolean;
  
  // UI状態
  viewMode: ViewMode;
  noteSize: NoteSize;
  
  // 統計
  stats: {
    total: number;
    filtered: number;
    archived: number;
    pinned: number;
  };
  
  // イベントハンドラー
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onShowArchivedChange: (show: boolean) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNoteSizeChange: (size: NoteSize) => void;
  onReminderComplete: (noteId: string) => void;
}

const NoteSidebar = forwardRef<HTMLDivElement, NoteSidebarProps>(({
  notes,
  overdueReminders,
  searchQuery,
  selectedCategory,
  showArchived,
  viewMode,
  noteSize,
  stats,
  onSearchChange,
  onCategoryChange,
  onShowArchivedChange,
  onViewModeChange,
  onNoteSizeChange,
  onReminderComplete,
}, ref) => {
  return (
    <div ref={ref} className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col relative z-10 pointer-events-auto">
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
              onShowArchivedChange(false);
              onCategoryChange("all");
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
                onShowArchivedChange(false);
                onCategoryChange(category.value);
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
              onShowArchivedChange(true);
              onCategoryChange("all");
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
  );
});

NoteSidebar.displayName = 'NoteSidebar';

export default NoteSidebar;