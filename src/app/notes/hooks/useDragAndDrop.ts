import { useState, useRef, useCallback } from 'react';
import { Note } from '@/lib/firebase/notes';
import { DropIndicator, DragDropState } from '../types/note';
import { uploadImages, deleteImage } from '@/lib/firebase/notes';

export interface UseDragAndDropProps {
  updateExistingNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>;
  displayNotes: Note[];
}

export interface UseDragAndDropReturn {
  // 状態
  draggedNote: Note | null;
  draggedOverNote: string | null;
  isDragMode: boolean;
  dropIndicator: DropIndicator | null;
  isUploading: boolean;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
  editFileInputRef: React.RefObject<HTMLInputElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  
  // セッター
  setDraggedNote: (note: Note | null) => void;
  setDraggedOverNote: (noteId: string | null) => void;
  setIsDragMode: (isDrag: boolean) => void;
  setDropIndicator: (indicator: DropIndicator | null) => void;
  setIsUploading: (uploading: boolean) => void;
  
  // ドラッグ&ドロップハンドラー（メモ並び替え）
  handleNoteDragStart: (e: React.DragEvent, note: Note, index: number) => void;
  handleNoteDragEnd: (e: React.DragEvent) => void;
  handleNoteDragOver: (e: React.DragEvent, targetIndex: number) => void;
  handleNoteDrop: (e: React.DragEvent, dropIndex: number) => void;
  
  // 画像ドラッグ&ドロップハンドラー
  handleImageDragOver: (e: React.DragEvent, noteId: string) => void;
  handleImageDragLeave: (e: React.DragEvent) => void;
  handleImageDrop: (e: React.DragEvent, noteId?: string) => Promise<void>;
  
  // その他のユーティリティ
  calculateDropPosition: (e: React.DragEvent, targetIndex: number) => 'before' | 'after';
}

export const useDragAndDrop = ({
  updateExistingNote,
  displayNotes,
}: UseDragAndDropProps): UseDragAndDropReturn => {
  
  // 状態
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [draggedOverNote, setDraggedOverNote] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 座標ベースのドロップ位置計算
  const calculateDropPosition = (e: React.DragEvent, targetIndex: number): 'before' | 'after' => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    return e.clientY < midpoint ? 'before' : 'after';
  };

  // メモの並び替え処理
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
      const note = displayNotes.find(n => n.id === noteId);
      if (!note) return;

      setIsUploading(true);

      try {
        // Base64変換とFirebase Storageアップロード
        const imageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            // Base64変換
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            
            // データURLスキーマを保持してそのまま返す（Base64画像として扱う）
            return base64;
          })
        );

        // 既存の画像URLと新しい画像URLを結合
        const updatedImageUrls = [...(note.imageUrls || []), ...imageUrls];
        
        await updateExistingNote(note.id, {
          imageUrls: updatedImageUrls
        });

        console.log("画像が正常にアップロードされました");
      } catch (error) {
        console.error("画像アップロードエラー:", error);
        alert("画像のアップロードに失敗しました");
      } finally {
        setIsUploading(false);
      }
    }
    // 新規メモ作成時の画像ドロップは親コンポーネントで処理
  };

  return {
    // 状態
    draggedNote,
    draggedOverNote,
    isDragMode,
    dropIndicator,
    isUploading,
    
    // Refs
    fileInputRef,
    editFileInputRef,
    containerRef,
    
    // セッター
    setDraggedNote,
    setDraggedOverNote,
    setIsDragMode,
    setDropIndicator,
    setIsUploading,
    
    // ドラッグ&ドロップハンドラー（メモ並び替え）
    handleNoteDragStart,
    handleNoteDragEnd,
    handleNoteDragOver,
    handleNoteDrop,
    
    // 画像ドラッグ&ドロップハンドラー
    handleImageDragOver,
    handleImageDragLeave,
    handleImageDrop,
    
    // その他のユーティリティ
    calculateDropPosition,
  };
};