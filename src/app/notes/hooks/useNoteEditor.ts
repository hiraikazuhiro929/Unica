import { useState, useRef, useCallback } from 'react';
import { Note } from '@/lib/firebase/notes';
import { NewNoteFormData, EditingNoteData, EditorState } from '../types/note';

export interface UseNoteEditorProps {
  createNewNote: (noteData: Partial<Note>) => Promise<boolean>;
  updateExistingNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>;
  deleteNoteById: (noteId: string) => Promise<boolean>;
}

export interface UseNoteEditorReturn {
  // 新規作成状態
  newNoteData: NewNoteFormData;
  isNewNoteExpanded: boolean;
  newTagInput: string;
  
  // 編集状態
  editingNoteId: string | null;
  editingNoteData: EditingNoteData | null;
  editTagInput: string;
  
  // Refs
  newNoteInputRef: React.RefObject<HTMLInputElement>;
  newNoteContentRef: React.RefObject<HTMLTextAreaElement>;
  newNoteContainerRef: React.RefObject<HTMLDivElement>;
  autoSaveTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  editAutoSaveTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  
  // 新規作成アクション
  setNewNoteData: React.Dispatch<React.SetStateAction<NewNoteFormData>>;
  setIsNewNoteExpanded: (expanded: boolean) => void;
  setNewTagInput: (input: string) => void;
  resetNewNoteForm: () => void;
  clearNewNoteForm: () => void;
  handleCreateNewNote: () => Promise<void>;
  autoSaveNewNote: () => void;
  
  // 編集アクション
  setEditingNoteData: React.Dispatch<React.SetStateAction<EditingNoteData | null>>;
  setEditTagInput: (input: string) => void;
  startEditingNote: (note: Note) => void;
  stopEditingNote: () => void;
  handleUpdateNote: (noteId: string) => Promise<void>;
  autoSaveEditNote: () => void;
  
  // その他のアクション
  handleDeleteNote: (noteId: string) => Promise<void>;
}

export const useNoteEditor = ({
  createNewNote,
  updateExistingNote,
  deleteNoteById,
}: UseNoteEditorProps): UseNoteEditorReturn => {
  
  // 新規作成状態
  const [newNoteData, setNewNoteData] = useState<NewNoteFormData>({
    title: "",
    content: "",
    category: "personal",
    color: "bg-white",
    tags: [],
    imageUrls: [],
    isPinned: false,
    isCheckList: false,
    checkItems: [],
    reminder: null,
    labels: [],
  });
  
  const [isNewNoteExpanded, setIsNewNoteExpanded] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  
  // 編集状態
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteData, setEditingNoteData] = useState<EditingNoteData | null>(null);
  const [editTagInput, setEditTagInput] = useState("");
  
  // Refs
  const newNoteInputRef = useRef<HTMLInputElement>(null);
  const newNoteContentRef = useRef<HTMLTextAreaElement>(null);
  const newNoteContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 新規メモフォームリセット（完全リセット）
  const resetNewNoteForm = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setNewNoteData({
      title: "",
      content: "",
      category: "personal",
      color: "bg-white",
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

  return {
    // 新規作成状態
    newNoteData,
    isNewNoteExpanded,
    newTagInput,
    
    // 編集状態
    editingNoteId,
    editingNoteData,
    editTagInput,
    
    // Refs
    newNoteInputRef,
    newNoteContentRef,
    newNoteContainerRef,
    autoSaveTimeoutRef,
    editAutoSaveTimeoutRef,
    
    // 新規作成アクション
    setNewNoteData,
    setIsNewNoteExpanded,
    setNewTagInput,
    resetNewNoteForm,
    clearNewNoteForm,
    handleCreateNewNote,
    autoSaveNewNote,
    
    // 編集アクション
    setEditingNoteData,
    setEditTagInput,
    startEditingNote,
    stopEditingNote,
    handleUpdateNote,
    autoSaveEditNote,
    
    // その他のアクション
    handleDeleteNote,
  };
};