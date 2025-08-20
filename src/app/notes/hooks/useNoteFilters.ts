import { useState, useMemo } from 'react';
import { Note } from '@/lib/firebase/notes';
import { FilterState } from '../types/note';

export interface UseNoteFiltersReturn {
  // フィルター状態
  searchQuery: string;
  selectedCategory: string;
  showArchived: boolean;
  
  // フィルター結果
  filteredNotes: Note[];
  displayNotes: Note[];
  
  // アクション
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowArchived: (show: boolean) => void;
  
  // 統計
  stats: {
    total: number;
    filtered: number;
    archived: number;
    pinned: number;
  };
}

export const useNoteFilters = (notes: Note[]): UseNoteFiltersReturn => {
  // フィルター状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

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

  // 統計情報
  const stats = useMemo(() => {
    const total = notes.length;
    const filtered = filteredNotes.length;
    const archived = notes.filter(note => note.isArchived).length;
    const pinned = notes.filter(note => note.isPinned).length;

    return {
      total,
      filtered,
      archived,
      pinned,
    };
  }, [notes, filteredNotes]);

  return {
    // フィルター状態
    searchQuery,
    selectedCategory,
    showArchived,
    
    // フィルター結果
    filteredNotes,
    displayNotes,
    
    // アクション
    setSearchQuery,
    setSelectedCategory,
    setShowArchived,
    
    // 統計
    stats,
  };
};