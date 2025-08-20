import React, { forwardRef } from 'react';
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
  Palette,
  Image,
  FolderOpen,
  Pin,
  CheckSquare,
  Bell,
  Tag,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import { 
  NewNoteFormData, 
  NOTE_COLORS, 
  CATEGORIES,
  CheckItem,
  Reminder
} from '../types/note';

interface NewNoteFormProps {
  isExpanded: boolean;
  newNoteData: NewNoteFormData;
  newTagInput: string;
  isUploading: boolean;
  selectedImageUrl: string | null;
  
  // 状態更新
  setIsExpanded: (expanded: boolean) => void;
  setNewNoteData: React.Dispatch<React.SetStateAction<NewNoteFormData>>;
  setNewTagInput: (input: string) => void;
  setSelectedImageUrl: (url: string | null) => void;
  
  // イベントハンドラー
  onAutoSave: () => void;
  onImageUpload: () => void;
  onImageDelete: (url: string) => void;
  onImageDrop: (e: React.DragEvent, noteId?: string) => void;
  onImageDragOver: (e: React.DragEvent, noteId: string) => void;
  onImageDragLeave: (e: React.DragEvent) => void;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
}

// カラークラス取得ヘルパー
const getColorClass = (colorValue: string) => {
  const color = NOTE_COLORS.find(c => c.value === colorValue);
  return color ? color.class : NOTE_COLORS[0].class;
};

const NewNoteForm = forwardRef<HTMLDivElement, NewNoteFormProps>(({
  isExpanded,
  newNoteData,
  newTagInput,
  isUploading,
  selectedImageUrl,
  setIsExpanded,
  setNewNoteData,
  setNewTagInput,
  setSelectedImageUrl,
  onAutoSave,
  onImageUpload,
  onImageDelete,
  onImageDrop,
  onImageDragOver,
  onImageDragLeave,
  fileInputRef,
}, ref) => {
  const newNoteInputRef = React.useRef<HTMLInputElement>(null);
  const newNoteContentRef = React.useRef<HTMLTextAreaElement>(null);

  return (
    <div 
      ref={ref}
      className={`mb-6 max-w-4xl mx-auto transition-all duration-200 ${
        isExpanded ? `${getColorClass(newNoteData.color)} shadow-lg` : 'bg-white/80 hover:bg-white hover:shadow-md'
      } rounded-lg border ${
        isExpanded ? 'border-gray-300' : 'border-gray-200 hover:border-gray-300'
      }`}
      onDragOver={(e) => onImageDragOver(e, 'new')}
      onDragLeave={onImageDragLeave}
      onDrop={(e) => onImageDrop(e, 'new')}
    >
      {!isExpanded ? (
        /* 縮小状態：入力プレースホルダー */
        <div
          className="p-4 cursor-text"
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => newNoteInputRef.current?.focus(), 100);
          }}
        >
          <div className="flex items-center gap-3">
            <StickyNote className="w-5 h-5 text-gray-400" />
            <span className="text-gray-500 text-lg">メモを入力...</span>
          </div>
        </div>
      ) : (
        /* 展開状態：フル入力フォーム */
        <div className="p-4 space-y-3">
          {/* タイトル入力 */}
          <Input
            ref={newNoteInputRef}
            placeholder="タイトル"
            value={newNoteData.title}
            onChange={(e) => {
              setNewNoteData(prev => ({ ...prev, title: e.target.value }));
              onAutoSave();
            }}
            className="text-base font-medium border-none shadow-none focus:ring-0 p-0 placeholder-gray-400"
          />

          {/* コンテンツ入力またはチェックリスト */}
          {newNoteData.isCheckList ? (
            <div className="space-y-2">
              {newNoteData.checkItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const updatedItems = [...newNoteData.checkItems];
                      updatedItems[index] = { ...item, checked: e.target.checked };
                      setNewNoteData(prev => ({ ...prev, checkItems: updatedItems }));
                      onAutoSave();
                    }}
                    className="w-4 h-4"
                  />
                  <Input
                    value={item.text}
                    onChange={(e) => {
                      const updatedItems = [...newNoteData.checkItems];
                      updatedItems[index] = { ...item, text: e.target.value };
                      setNewNoteData(prev => ({ ...prev, checkItems: updatedItems }));
                      onAutoSave();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const newId = Date.now().toString();
                        setNewNoteData(prev => ({
                          ...prev,
                          checkItems: [...prev.checkItems, { id: newId, text: '', checked: false }]
                        }));
                        onAutoSave();
                      }
                    }}
                    placeholder="チェックリストアイテム..."
                    className={`flex-1 text-sm border-none shadow-none focus:ring-0 p-0 placeholder-gray-400 ${item.checked ? 'line-through text-gray-500' : ''}`}
                  />
                  {newNoteData.checkItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewNoteData(prev => ({
                          ...prev,
                          checkItems: prev.checkItems.filter(i => i.id !== item.id)
                        }));
                        onAutoSave();
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newId = Date.now().toString();
                  setNewNoteData(prev => ({
                    ...prev,
                    checkItems: [...prev.checkItems, { id: newId, text: '', checked: false }]
                  }));
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                + アイテムを追加
              </Button>
            </div>
          ) : (
            <Textarea
              ref={newNoteContentRef}
              placeholder="メモを入力..."
              value={newNoteData.content}
              onChange={(e) => {
                setNewNoteData(prev => ({ ...prev, content: e.target.value }));
                onAutoSave();
              }}
              className="min-h-20 resize-none border-none shadow-none focus:ring-0 p-0 placeholder-gray-400 text-sm"
              rows={3}
            />
          )}

          {/* アップロードされた画像 */}
          {newNoteData.imageUrls.length > 0 && (
            <div className="space-y-2 max-w-full">
              {newNoteData.imageUrls.map((url, index) => (
                <div key={index} className="relative group overflow-hidden rounded">
                  <img
                    src={url}
                    alt={`画像 ${index + 1}`}
                    className="w-full max-h-64 object-cover rounded cursor-pointer hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageUrl(url);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onImageDelete(url)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* タグ表示 */}
          {newNoteData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {newNoteData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                >
                  #{tag}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      setNewNoteData(prev => ({
                        ...prev,
                        tags: prev.tags.filter(t => t !== tag)
                      }));
                      onAutoSave();
                    }}
                  />
                </span>
              ))}
            </div>
          )}

          {/* ラベル表示 */}
          {newNoteData.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {newNoteData.labels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {label}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      setNewNoteData(prev => ({
                        ...prev,
                        labels: prev.labels.filter(l => l !== label)
                      }));
                      onAutoSave();
                    }}
                  />
                </span>
              ))}
            </div>
          )}

          {/* リマインダー表示 */}
          {newNoteData.reminder && (
            <div className="flex items-center gap-2 text-orange-600">
              <Bell className="w-4 h-4" />
              <span className="text-sm">
                {new Date(newNoteData.reminder.date).toLocaleDateString('ja-JP')} {newNoteData.reminder.time}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewNoteData(prev => ({ ...prev, reminder: null }));
                  onAutoSave();
                }}
                className="h-5 w-5 p-0 hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* ツールバー */}
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
                <DropdownMenuContent>
                  <div className="grid grid-cols-5 gap-2 p-2">
                    {NOTE_COLORS.map((color) => (
                      <div
                        key={color.value}
                        onClick={() => {
                          setNewNoteData(prev => ({ ...prev, color: color.value }));
                        }}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 hover:scale-110 transition-transform ${
                          newNoteData.color === color.value ? 'ring-2 ring-blue-400' : ''
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
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200" title="カテゴリー">
                    <FolderOpen className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CATEGORIES.map((category) => (
                    <DropdownMenuItem
                      key={category.value}
                      onClick={() => {
                        setNewNoteData(prev => ({ ...prev, category: category.value }));
                      }}
                      className={newNoteData.category === category.value ? 'bg-gray-100' : ''}
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
                  setNewNoteData(prev => ({ ...prev, isPinned: !prev.isPinned }));
                }}
                className={`h-7 w-7 p-0 hover:bg-gray-200 ${newNoteData.isPinned ? 'text-blue-600' : ''}`}
                title="ピン留め"
              >
                <Pin className={`w-3 h-3 ${newNoteData.isPinned ? 'fill-current' : ''}`} />
              </Button>

              {/* チェックリスト */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewNoteData(prev => ({ 
                    ...prev, 
                    isCheckList: !prev.isCheckList,
                    checkItems: !prev.isCheckList ? [{ id: Date.now().toString(), text: '', checked: false }] : [],
                    content: !prev.isCheckList ? '' : prev.content
                  }));
                }}
                className={`h-7 w-7 p-0 hover:bg-gray-200 ${newNoteData.isCheckList ? 'text-blue-600' : ''}`}
                title="チェックリスト"
              >
                <CheckSquare className={`w-3 h-3 ${newNoteData.isCheckList ? 'fill-current' : ''}`} />
              </Button>

              {/* リマインダー */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 hover:bg-gray-200 ${newNoteData.reminder ? 'text-orange-600' : ''}`}
                    title="リマインダー"
                  >
                    <Bell className={`w-3 h-3 ${newNoteData.reminder ? 'fill-current' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="p-3 space-y-2">
                    <div className="text-sm font-medium">リマインダー設定</div>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={newNoteData.reminder?.date || ''}
                        onChange={(e) => {
                          setNewNoteData(prev => ({
                            ...prev,
                            reminder: {
                              date: e.target.value,
                              time: prev.reminder?.time || '09:00'
                            }
                          }));
                          onAutoSave();
                        }}
                        className="text-xs"
                      />
                      <Input
                        type="time"
                        value={newNoteData.reminder?.time || '09:00'}
                        onChange={(e) => {
                          setNewNoteData(prev => ({
                            ...prev,
                            reminder: {
                              date: prev.reminder?.date || new Date().toISOString().split('T')[0],
                              time: e.target.value
                            }
                          }));
                          onAutoSave();
                        }}
                        className="text-xs"
                      />
                      {newNoteData.reminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewNoteData(prev => ({ ...prev, reminder: null }));
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
                    className={`h-7 w-7 p-0 hover:bg-gray-200 ${newNoteData.labels.length > 0 ? 'text-green-600' : ''}`}
                    title="ラベル"
                  >
                    <Tag className={`w-3 h-3 ${newNoteData.labels.length > 0 ? 'fill-current' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="p-3 space-y-2">
                    <div className="text-sm font-medium">ラベル追加</div>
                    <Input
                      placeholder="ラベル名を入力..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const label = input.value.trim();
                          if (label && !newNoteData.labels.includes(label)) {
                            setNewNoteData(prev => ({
                              ...prev,
                              labels: [...prev.labels, label]
                            }));
                            onAutoSave();
                            input.value = '';
                          }
                        }
                      }}
                      className="text-xs"
                    />
                    {newNoteData.labels.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">現在のラベル:</div>
                        {newNoteData.labels.map((label, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded text-xs">
                            <span>{label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewNoteData(prev => ({
                                  ...prev,
                                  labels: prev.labels.filter(l => l !== label)
                                }));
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

            {/* タグ入力 */}
            <div className="flex gap-2">
              <Input
                placeholder="タグを追加... (Enterで追加)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const tag = newTagInput.trim();
                    if (tag && !newNoteData.tags.includes(tag)) {
                      setNewNoteData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                      setNewTagInput('');
                      onAutoSave();
                    }
                  }
                }}
                className="flex-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onImageUpload}
        className="hidden"
      />
    </div>
  );
});

NewNoteForm.displayName = 'NewNoteForm';

export default NewNoteForm;