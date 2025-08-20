import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Note } from '@/lib/firebase/notes';
import { 
  Pin, 
  Bell, 
  Tag, 
  X,
  CheckSquare
} from 'lucide-react';
import { NOTE_COLORS, CATEGORIES, ViewMode, NoteSize, DropIndicator } from '../types/note';

interface NoteCardProps {
  note: Note;
  index: number;
  isEditing: boolean;
  isDraggedOver: boolean;
  isDragging: boolean;
  isDragMode: boolean;
  viewMode: ViewMode;
  noteSize: NoteSize;
  dropIndicator: DropIndicator | null;
  
  // イベントハンドラー
  onEdit: (note: Note) => void;
  onImageClick: (url: string) => void;
  onImageDelete: (noteId: string, url: string) => void;
  onChecklistToggle: (noteId: string, itemIndex: number, checked: boolean) => void;
  
  // ドラッグ&ドロップハンドラー
  onDragStart: (e: React.DragEvent, note: Note, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, index: number, isForNote: boolean) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number, isForNote: boolean) => void;
  
  // その他
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  index,
  isEditing,
  isDraggedOver,
  isDragging,
  isDragMode,
  viewMode,
  noteSize,
  dropIndicator,
  onEdit,
  onImageClick,
  onImageDelete,
  onChecklistToggle,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  updateNote,
}) => {
  // ノートサイズに基づくテキストサイズ
  const getTextSizes = () => {
    switch (noteSize) {
      case 'small': return { title: 'text-sm', content: 'text-xs' };
      case 'large': return { title: 'text-lg', content: 'text-base' };
      default: return { title: 'text-base', content: 'text-sm' };
    }
  };

  // カラークラス取得
  const getColorClass = (colorValue: string) => {
    const color = NOTE_COLORS.find(c => c.value === colorValue);
    return color ? color.class : NOTE_COLORS[0].class;
  };

  // パディング取得
  const getNoteCardPadding = () => {
    switch (noteSize) {
      case 'small': return 'p-3';
      case 'large': return 'p-5';
      default: return 'p-4';
    }
  };

  const textSizes = getTextSizes();

  // ドロップインジケーターの表示判定
  const showDropIndicatorBefore = dropIndicator?.index === index && dropIndicator.position === 'before';
  const showDropIndicatorAfter = dropIndicator?.index === index && dropIndicator.position === 'after';

  // 編集モード中はNoteEditorコンポーネントに委譲
  if (isEditing) {
    return null; // NoteEditorコンポーネントで処理
  }

  return (
    <React.Fragment key={note.id}>
      {/* 挿入位置インジケーター（カードの上） */}
      {showDropIndicatorBefore && (
        <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mb-2 rounded-full shadow-lg" />
      )}
      
      <div
        data-note-id={note.id}
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, note, index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (isDragMode) {
            onDragOver(e, index, true);
          } else {
            onDragOver(e, index, false);
          }
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          if (isDragMode) {
            onDrop(e, index, true);
          } else {
            onDrop(e, index, false);
          }
        }}
        className={`${getColorClass(note.color)} ${isDragMode ? 'cursor-grab active:cursor-grabbing' : 'break-inside-avoid'} inline-block w-64 hover:shadow-lg transition-all duration-200 group border cursor-pointer relative rounded-lg overflow-hidden ${
          viewMode === 'list' ? 'mb-2 w-full' : ''
        } ${isDraggedOver && !isDragMode ? 'ring-2 ring-blue-400 bg-blue-50 shadow-xl' : ''} ${
          isDragging ? 'opacity-60 shadow-2xl ring-2 ring-gray-300' : ''
        } ${isDragMode && !isDragging ? 'transition-transform hover:scale-105 hover:z-10' : ''}`}
        onClick={() => !isDragMode && onEdit(note)}
      >
        <div className={getNoteCardPadding()}>
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
              {((note as any).checkItems || []).slice(0, 5).map((item: any, itemIndex: number) => (
                <div key={item.id || itemIndex} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => onChecklistToggle(note.id, itemIndex, e.target.checked)}
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
              {(note as any).labels.slice(0, 3).map((label: string, labelIndex: number) => (
                <span
                  key={labelIndex}
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
              {note.imageUrls.slice(0, 2).map((url, imageIndex) => (
                <div key={imageIndex} className="relative group/image">
                  <img
                    src={url}
                    alt=""
                    className="w-full max-h-48 object-cover rounded cursor-pointer hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick(url);
                    }}
                  />
                  {/* 画像削除ボタン（ホバー時に表示） */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageDelete(note.id, url);
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

          {/* タグ表示 */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.tags.map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* フッター情報 */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div>
              {new Date(note.createdAt).toLocaleDateString('ja-JP')}
            </div>
            {note.isArchived && (
              <span className="text-xs text-gray-400">アーカイブ済み</span>
            )}
          </div>
        </div>
      </div>

      {/* 挿入位置インジケーター（カードの下） */}
      {showDropIndicatorAfter && (
        <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mt-2 rounded-full shadow-lg" />
      )}
    </React.Fragment>
  );
};

export default NoteCard;