import React from 'react';
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
  Palette,
  Image,
  FolderOpen,
  Pin,
  CheckSquare,
  Bell,
  Tag,
  X,
  Loader2,
} from 'lucide-react';
import { Note } from '@/lib/firebase/notes';
import { 
  NOTE_COLORS, 
  CATEGORIES, 
  EditingNoteData, 
  ViewMode, 
  NoteSize,
  DropIndicator 
} from '../types/note';

interface NoteEditorProps {
  note: Note;
  index: number;
  editingNoteData: EditingNoteData;
  editTagInput: string;
  isUploading: boolean;
  isDraggedOver: boolean;
  isDragging: boolean;
  isDragMode: boolean;
  viewMode: ViewMode;
  noteSize: NoteSize;
  dropIndicator: DropIndicator | null;
  
  // 状態更新
  setEditingNoteData: React.Dispatch<React.SetStateAction<EditingNoteData | null>>;
  setEditTagInput: (input: string) => void;
  
  // イベントハンドラー
  onAutoSave: () => void;
  onImageUpload: () => void;
  onImageDelete: (url: string) => void;
  onImageClick: (url: string) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>;
  
  // ドラッグ&ドロップハンドラー
  onDragStart: (e: React.DragEvent, note: Note, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, index: number, isForNote: boolean) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number, isForNote: boolean) => void;
  
  // Refs
  editFileInputRef: React.RefObject<HTMLInputElement>;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  index,
  editingNoteData,
  editTagInput,
  isUploading,
  isDraggedOver,
  isDragging,
  isDragMode,
  viewMode,
  noteSize,
  dropIndicator,
  setEditingNoteData,
  setEditTagInput,
  onAutoSave,
  onImageUpload,
  onImageDelete,
  onImageClick,
  updateNote,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  editFileInputRef,
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

  return (
    <React.Fragment key={note.id}>
      {/* 挿入位置インジケーター（カードの上） */}
      {showDropIndicatorBefore && (
        <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mb-2 rounded-full shadow-lg" />
      )}
      
      <div
        data-note-id={note.id}
        draggable={false} // 編集中はドラッグ無効
        onDragOver={(e) => {
          if (!isDragMode) {
            onDragOver(e, index, false);
          }
        }}
        onDragLeave={(e) => {
          if (!isDragMode) {
            onDragLeave(e);
          }
        }}
        onDrop={(e) => {
          if (!isDragMode) {
            onDrop(e, index, false);
          }
        }}
        className={`${getColorClass(editingNoteData.color)} break-inside-avoid inline-block w-64 hover:shadow-lg transition-all duration-200 group border cursor-pointer relative rounded-lg overflow-hidden ${
          viewMode === 'list' ? 'mb-2 w-full' : ''
        } ${isDraggedOver && !isDragMode ? 'ring-2 ring-blue-400 bg-blue-50 shadow-xl' : ''}`}
      >
        <div className={getNoteCardPadding()}>
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* タイトル編集 */}
            <Input
              value={editingNoteData.title}
              onChange={(e) => {
                setEditingNoteData(prev => prev ? ({ ...prev, title: e.target.value }) : null);
                onAutoSave();
              }}
              placeholder="タイトル"
              className={`${textSizes.title} font-medium border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 w-full`}
            />
            
            {/* コンテンツ編集またはチェックリスト */}
            {editingNoteData.isCheckList ? (
              <div className="space-y-2">
                {editingNoteData.checkItems.map((item, itemIndex) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => {
                        const updatedItems = [...editingNoteData.checkItems];
                        updatedItems[itemIndex] = { ...item, checked: e.target.checked };
                        setEditingNoteData(prev => prev ? ({ ...prev, checkItems: updatedItems }) : null);
                        onAutoSave();
                      }}
                      className="w-4 h-4"
                    />
                    <Input
                      value={item.text}
                      onChange={(e) => {
                        const updatedItems = [...editingNoteData.checkItems];
                        updatedItems[itemIndex] = { ...item, text: e.target.value };
                        setEditingNoteData(prev => prev ? ({ ...prev, checkItems: updatedItems }) : null);
                        onAutoSave();
                      }}
                      className={`flex-1 ${textSizes.content} border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 ${item.checked ? 'line-through text-gray-500' : ''}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNoteData(prev => prev ? ({
                          ...prev,
                          checkItems: prev.checkItems.filter(i => i.id !== item.id)
                        }) : null);
                        onAutoSave();
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newId = Date.now().toString();
                    setEditingNoteData(prev => prev ? ({
                      ...prev,
                      checkItems: [...prev.checkItems, { id: newId, text: '', checked: false }]
                    }) : null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  + アイテムを追加
                </Button>
              </div>
            ) : (
              <Textarea
                value={editingNoteData.content}
                onChange={(e) => {
                  setEditingNoteData(prev => prev ? ({ ...prev, content: e.target.value }) : null);
                  onAutoSave();
                }}
                placeholder="メモを入力..."
                rows={4}
                className={`min-h-20 resize-none border-none shadow-none focus:ring-0 p-0 bg-transparent placeholder-gray-400 ${textSizes.content} w-full break-words`}
              />
            )}

            {/* タグ編集 */}
            {editingNoteData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {editingNoteData.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                  >
                    #{tag}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-500"
                      onClick={() => {
                        setEditingNoteData(prev => prev ? ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }) : null);
                        onAutoSave();
                      }}
                    />
                  </span>
                ))}
              </div>
            )}

            {/* 画像編集 */}
            {editingNoteData.imageUrls && editingNoteData.imageUrls.length > 0 && (
              <div className="space-y-2 max-w-full">
                {editingNoteData.imageUrls.map((url, imageIndex) => (
                  <div key={imageIndex} className="relative group overflow-hidden rounded">
                    <img
                      src={url}
                      alt=""
                      className="w-full max-h-48 object-cover rounded cursor-pointer hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick(url);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onImageDelete(url)}
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
                  onClick={onImageUpload}
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
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200" title="色を変更">
                      <Palette className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-5 gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                      {NOTE_COLORS.map((color) => (
                        <div
                          key={color.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNoteData(prev => prev ? ({ ...prev, color: color.value }) : null);
                            updateNote(note.id, { color: color.value });
                          }}
                          className={`w-6 h-6 rounded-full cursor-pointer border-2 hover:scale-110 transition-transform ${
                            editingNoteData.color === color.value ? 'ring-2 ring-blue-400' : ''
                          } ${color.value === "bg-white" ? "bg-white border-gray-300" : color.value}`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* カテゴリー選択 */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 hover:bg-gray-200" 
                      title="カテゴリー"
                    >
                      <FolderOpen className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    side="bottom"
                    align="start"
                  >
                    {CATEGORIES.map((category) => (
                      <DropdownMenuItem
                        key={category.value}
                        onMouseDown={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          
                          setEditingNoteData(prev => prev ? ({ ...prev, category: category.value }) : null);
                          await updateNote(note.id, { category: category.value });
                        }}
                        className={editingNoteData.category === category.value ? 'bg-gray-100' : ''}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ピン留め */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingNoteData(prev => prev ? ({ ...prev, isPinned: !prev.isPinned }) : null);
                    onAutoSave();
                  }}
                  className={`h-7 w-7 p-0 hover:bg-gray-200 ${editingNoteData.isPinned ? 'text-blue-600' : ''}`}
                  title="ピン留め"
                >
                  <Pin className={`w-3 h-3 ${editingNoteData.isPinned ? 'fill-current' : ''}`} />
                </Button>

                {/* チェックリスト */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingNoteData(prev => prev ? ({ 
                      ...prev, 
                      isCheckList: !prev.isCheckList,
                      checkItems: !prev.isCheckList ? [{ id: Date.now().toString(), text: '', checked: false }] : [],
                      content: !prev.isCheckList ? '' : prev.content
                    }) : null);
                    onAutoSave();
                  }}
                  className={`h-7 w-7 p-0 hover:bg-gray-200 ${editingNoteData.isCheckList ? 'text-blue-600' : ''}`}
                  title="チェックリスト"
                >
                  <CheckSquare className={`w-3 h-3 ${editingNoteData.isCheckList ? 'fill-current' : ''}`} />
                </Button>
                
                {/* リマインダー */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 hover:bg-gray-200 ${editingNoteData.reminder ? 'text-orange-600' : ''}`}
                      title="リマインダー"
                    >
                      <Bell className={`w-3 h-3 ${editingNoteData.reminder ? 'fill-current' : ''}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onFocusOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                  >
                    <div className="p-3 space-y-2" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                      <div className="text-sm font-medium">リマインダー設定</div>
                      <div className="space-y-2">
                        <Input
                          type="date"
                          value={editingNoteData.reminder?.date || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            setEditingNoteData(prev => prev ? ({
                              ...prev,
                              reminder: {
                                date: e.target.value,
                                time: prev.reminder?.time || '09:00'
                              }
                            }) : null);
                            onAutoSave();
                          }}
                          className="text-xs"
                        />
                        <Input
                          type="time"
                          value={editingNoteData.reminder?.time || '09:00'}
                          onChange={(e) => {
                            e.stopPropagation();
                            setEditingNoteData(prev => prev ? ({
                              ...prev,
                              reminder: {
                                date: prev.reminder?.date || new Date().toISOString().split('T')[0],
                                time: e.target.value
                              }
                            }) : null);
                            onAutoSave();
                          }}
                          className="text-xs"
                        />
                        {editingNoteData.reminder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNoteData(prev => prev ? ({ ...prev, reminder: null }) : null);
                              onAutoSave();
                            }}
                            className="w-full text-xs"
                          >
                            リマインダーを削除
                          </Button>
                        )}
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* ラベル */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 hover:bg-gray-200 ${editingNoteData.labels.length > 0 ? 'text-green-600' : ''}`}
                      title="ラベル"
                    >
                      <Tag className={`w-3 h-3 ${editingNoteData.labels.length > 0 ? 'fill-current' : ''}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-sm font-medium">ラベル追加</div>
                      <Input
                        placeholder="ラベル名を入力..."
                        onKeyPress={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const label = input.value.trim();
                            if (label && !editingNoteData.labels.includes(label)) {
                              setEditingNoteData(prev => prev ? ({
                                ...prev,
                                labels: [...prev.labels, label]
                              }) : null);
                              onAutoSave();
                              input.value = '';
                            }
                          }
                        }}
                        className="text-xs"
                      />
                      {editingNoteData.labels.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">現在のラベル:</div>
                          {editingNoteData.labels.map((label, labelIndex) => (
                            <div key={labelIndex} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded text-xs">
                              <span>{label}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingNoteData(prev => prev ? ({
                                    ...prev,
                                    labels: prev.labels.filter(l => l !== label)
                                  }) : null);
                                  onAutoSave();
                                }}
                                className="h-4 w-4 p-0 hover:bg-gray-200"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 挿入位置インジケーター（カードの下） */}
      {showDropIndicatorAfter && (
        <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-green-400 animate-pulse mt-2 rounded-full shadow-lg" />
      )}

      {/* ファイル入力 */}
      <input
        ref={editFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onImageUpload}
        className="hidden"
      />
    </React.Fragment>
  );
};

export default NoteEditor;