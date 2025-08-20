import { useState, useEffect } from 'react';
import { ViewMode, NoteSize, NoteUIState } from '../types/note';
import { Note } from '@/lib/firebase/notes';

export interface UseNoteUIReturn {
  // UI状態
  viewMode: ViewMode;
  noteSize: NoteSize;
  selectedImageUrl: string | null;
  isUploading: boolean;
  
  // リマインダー関連
  overdueReminders: Note[];
  
  // アクション
  setViewMode: (mode: ViewMode) => void;
  setNoteSize: (size: NoteSize) => void;
  setSelectedImageUrl: (url: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
  
  // ブラウザ通知関連
  requestNotificationPermission: () => void;
  showNotification: (title: string, body: string) => void;
}

export const useNoteUI = (notes: Note[]): UseNoteUIReturn => {
  // UI状態
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [noteSize, setNoteSize] = useState<NoteSize>('medium');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [overdueReminders, setOverdueReminders] = useState<Note[]>([]);

  // 通知許可の要求
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // ブラウザ通知表示
  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  };

  // 通知許可の初回要求
  useEffect(() => {
    requestNotificationPermission();
  }, []);

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
      if (overdue.length > 0) {
        overdue.forEach(note => {
          showNotification(
            `リマインダー: ${note.title || '無題のメモ'}`,
            note.content.substring(0, 100) || 'メモの内容がありません'
          );
        });
      }
    };
    
    // 初回チェック
    checkReminders();
    
    // 1分ごとにチェック
    const interval = setInterval(checkReminders, 60000);
    
    return () => clearInterval(interval);
  }, [notes]);

  return {
    // UI状態
    viewMode,
    noteSize,
    selectedImageUrl,
    isUploading,
    overdueReminders,
    
    // アクション
    setViewMode,
    setNoteSize,
    setSelectedImageUrl,
    setIsUploading,
    
    // 通知関連
    requestNotificationPermission,
    showNotification,
  };
};