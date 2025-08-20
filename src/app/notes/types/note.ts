// Google Keep風カラーパレット
export const NOTE_COLORS = [
  { name: "デフォルト", value: "bg-white", class: "bg-white border-gray-200" },
  { name: "黄色", value: "bg-yellow-100", class: "bg-yellow-100 border-yellow-300" },
  { name: "オレンジ", value: "bg-orange-100", class: "bg-orange-100 border-orange-300" },
  { name: "赤", value: "bg-red-100", class: "bg-red-100 border-red-300" },
  { name: "ピンク", value: "bg-pink-100", class: "bg-pink-100 border-pink-300" },
  { name: "紫", value: "bg-purple-100", class: "bg-purple-100 border-purple-300" },
  { name: "青", value: "bg-blue-100", class: "bg-blue-100 border-blue-300" },
  { name: "青緑", value: "bg-teal-100", class: "bg-teal-100 border-teal-300" },
  { name: "緑", value: "bg-green-100", class: "bg-green-100 border-green-300" },
  { name: "グレー", value: "bg-gray-100", class: "bg-gray-100 border-gray-300" },
];

export const CATEGORIES = [
  { value: "personal", label: "個人", icon: "🏠" },
  { value: "work", label: "仕事", icon: "💼" },
  { value: "meeting", label: "ミーティング", icon: "🤝" },
  { value: "idea", label: "アイデア", icon: "💡" },
  { value: "todo", label: "TODO", icon: "✅" },
  { value: "reminder", label: "リマインダー", icon: "⏰" },
] as const;

// 表示モード
export type ViewMode = 'grid' | 'list';
export type NoteSize = 'small' | 'medium' | 'large';

// チェックリストアイテム
export interface CheckItem {
  id: string;
  text: string;
  checked: boolean;
}

// リマインダー
export interface Reminder {
  date: string;
  time: string;
}

// 新規メモフォーム用のデータ型
export interface NewNoteFormData {
  title: string;
  content: string;
  category: import('@/lib/firebase/notes').Note['category'];
  color: string;
  tags: string[];
  imageUrls: string[];
  isPinned: boolean;
  isCheckList: boolean;
  checkItems: CheckItem[];
  reminder: Reminder | null;
  labels: string[];
}

// 編集中メモフォーム用のデータ型
export interface EditingNoteData {
  title: string;
  content: string;
  category: import('@/lib/firebase/notes').Note['category'];
  color: string;
  tags: string[];
  imageUrls: string[];
  isPinned: boolean;
  isCheckList: boolean;
  checkItems: CheckItem[];
  reminder: Reminder | null;
  labels: string[];
}

// ドラッグ&ドロップ関連
export interface DropIndicator {
  index: number;
  position: 'before' | 'after';
}

// UI状態管理用の型
export interface NoteUIState {
  viewMode: ViewMode;
  noteSize: NoteSize;
  selectedImageUrl: string | null;
  isUploading: boolean;
}

// フィルター状態
export interface FilterState {
  searchQuery: string;
  selectedCategory: string;
  showArchived: boolean;
}

// エディター状態
export interface EditorState {
  isNewNoteExpanded: boolean;
  editingNoteId: string | null;
  newTagInput: string;
  editTagInput: string;
}

// ドラッグ&ドロップ状態
export interface DragDropState {
  draggedNote: import('@/lib/firebase/notes').Note | null;
  draggedOverNote: string | null;
  isDragMode: boolean;
  dropIndicator: DropIndicator | null;
}

// カテゴリー値の型推論
export type CategoryValue = typeof CATEGORIES[number]['value'];