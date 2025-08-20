import { useState, useEffect, useCallback } from 'react';
import {
  Note,
  createNote,
  updateNote,
  deleteNote,
  subscribeToUserActiveNotes,
  getUserActiveNotes,
  getUserNotesByCategory,
  getUserNotesByPrivacy,
  createQuickNote,
} from '@/lib/firebase/notes';

export interface UseNotesOptions {
  userId: string;
  userName: string;
  enableRealtime?: boolean;
  limit?: number;
}

export interface UseNotesReturn {
  // データ
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  
  // 統計
  stats: {
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    archived: number;
    private: number;
    shared: number;
  };
  
  // アクション
  createNewNote: (noteData: Partial<Note>) => Promise<boolean>;
  updateExistingNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>;
  deleteNoteById: (noteId: string) => Promise<boolean>;
  toggleArchive: (noteId: string) => Promise<boolean>;
  togglePrivacy: (noteId: string) => Promise<boolean>;
  createQuickNoteHelper: (title: string, content: string, category?: Note['category']) => Promise<boolean>;
  
  // フィルタリング
  filterNotes: (filters: {
    category?: Note['category'] | 'all';
    priority?: Note['priority'] | 'all';
    isPrivate?: boolean;
    isArchived?: boolean;
    searchQuery?: string;
  }) => Note[];
  
  // リフレッシュ
  refreshNotes: () => Promise<void>;
}

export const useNotes = ({
  userId,
  userName,
  enableRealtime = true,
  limit = 100,
}: UseNotesOptions): UseNotesReturn => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // リアルタイム購読またはワンタイム取得
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (enableRealtime) {
      // リアルタイム購読
      const unsubscribe = subscribeToUserActiveNotes(
        userId,
        (data) => {
          // orderフィールドでソート、存在しない場合はcreatedAtでソート
          const sortedData = [...data].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            // orderが存在しない場合は作成日時でソート
            return b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0;
          });
          setNotes(sortedData);
          setIsLoading(false);
        },
        limit
      );

      return () => {
        unsubscribe();
      };
    } else {
      // ワンタイム取得
      const fetchNotes = async () => {
        try {
          const result = await getUserActiveNotes(userId, limit);
          if (result.error) {
            setError(result.error);
          } else {
            // orderフィールドでソート、存在しない場合はcreatedAtでソート
            const sortedData = [...result.data].sort((a, b) => {
              if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
              }
              return b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0;
            });
            setNotes(sortedData);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setIsLoading(false);
        }
      };

      fetchNotes();
    }
  }, [userId, enableRealtime, limit]);

  // 統計計算
  const stats = useCallback(() => {
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    let archived = 0;
    let privateNotes = 0;
    let shared = 0;

    notes.forEach(note => {
      // カテゴリー別
      byCategory[note.category] = (byCategory[note.category] || 0) + 1;
      
      // 優先度別
      byPriority[note.priority] = (byPriority[note.priority] || 0) + 1;
      
      // その他
      if (note.isArchived) archived++;
      if (note.isPrivate) privateNotes++;
      else shared++;
    });

    return {
      total: notes.length,
      byCategory,
      byPriority,
      archived,
      private: privateNotes,
      shared,
    };
  }, [notes]);

  // メモ作成
  const createNewNote = useCallback(async (noteData: Partial<Note>): Promise<boolean> => {
    try {
      const fullNoteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
        title: noteData.title || '無題のメモ',
        content: noteData.content || '',
        category: noteData.category || ('personal' as Note['category']),
        priority: noteData.priority || ('medium' as Note['priority']),
        color: noteData.color || 'bg-yellow-50',
        tags: noteData.tags || [],
        createdBy: userName,
        createdById: userId,
        isPrivate: noteData.isPrivate ?? true,
        isArchived: false,
        isActive: true,
        ...(noteData.relatedEntityType && { relatedEntityType: noteData.relatedEntityType }),
        ...(noteData.relatedEntityId && { relatedEntityId: noteData.relatedEntityId }),
        ...(noteData.reminderDate && { reminderDate: noteData.reminderDate }),
      };

      const result = await createNote(fullNoteData);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メモの作成に失敗しました');
      return false;
    }
  }, [userId, userName]);

  // メモ更新
  const updateExistingNote = useCallback(async (noteId: string, updates: Partial<Note>): Promise<boolean> => {
    try {
      const result = await updateNote(noteId, updates);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メモの更新に失敗しました');
      return false;
    }
  }, []);

  // メモ削除
  const deleteNoteById = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      const result = await deleteNote(noteId);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メモの削除に失敗しました');
      return false;
    }
  }, []);

  // アーカイブ切り替え
  const toggleArchive = useCallback(async (noteId: string): Promise<boolean> => {
    const note = notes.find(n => n.id === noteId);
    if (!note) {
      setError('メモが見つかりません');
      return false;
    }

    return updateExistingNote(noteId, { isArchived: !note.isArchived });
  }, [notes, updateExistingNote]);

  // プライバシー切り替え
  const togglePrivacy = useCallback(async (noteId: string): Promise<boolean> => {
    const note = notes.find(n => n.id === noteId);
    if (!note) {
      setError('メモが見つかりません');
      return false;
    }

    return updateExistingNote(noteId, { isPrivate: !note.isPrivate });
  }, [notes, updateExistingNote]);

  // クイックメモ作成
  const createQuickNoteHelper = useCallback(async (
    title: string, 
    content: string, 
    category: Note['category'] = 'personal'
  ): Promise<boolean> => {
    try {
      const result = await createQuickNote({
        title,
        content,
        userId,
        userName,
        category,
      });
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クイックメモの作成に失敗しました');
      return false;
    }
  }, [userId, userName]);

  // フィルタリング
  const filterNotes = useCallback((filters: {
    category?: Note['category'] | 'all';
    priority?: Note['priority'] | 'all';
    isPrivate?: boolean;
    isArchived?: boolean;
    searchQuery?: string;
  }): Note[] => {
    return notes.filter(note => {
      // カテゴリーフィルター
      if (filters.category && filters.category !== 'all' && note.category !== filters.category) {
        return false;
      }

      // 優先度フィルター
      if (filters.priority && filters.priority !== 'all' && note.priority !== filters.priority) {
        return false;
      }

      // プライベートフィルター
      if (filters.isPrivate !== undefined && note.isPrivate !== filters.isPrivate) {
        return false;
      }

      // アーカイブフィルター
      if (filters.isArchived !== undefined && note.isArchived !== filters.isArchived) {
        return false;
      }

      // 検索クエリフィルター
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(query);
        const matchesContent = note.content.toLowerCase().includes(query);
        const matchesTags = note.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        
        if (!matchesTitle && !matchesContent && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [notes]);

  // リフレッシュ
  const refreshNotes = useCallback(async (): Promise<void> => {
    if (!enableRealtime) {
      setIsLoading(true);
      try {
        const result = await getUserActiveNotes(userId, limit);
        if (result.error) {
          setError(result.error);
        } else {
          // orderフィールドでソート、存在しない場合はcreatedAtでソート
          const sortedData = [...result.data].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            return b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0;
          });
          setNotes(sortedData);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'メモの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    }
  }, [userId, limit, enableRealtime]);

  return {
    // データ
    notes,
    isLoading,
    error,
    
    // 統計
    stats: stats(),
    
    // アクション
    createNewNote,
    updateExistingNote,
    deleteNoteById,
    toggleArchive,
    togglePrivacy,
    createQuickNoteHelper,
    
    // フィルタリング
    filterNotes,
    
    // リフレッシュ
    refreshNotes,
  };
};