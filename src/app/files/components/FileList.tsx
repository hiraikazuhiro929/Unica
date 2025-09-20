"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Database,
  Edit,
  Trash2,
  Eye,
  Copy,
  Scissors,
  SortAsc,
  SortDesc,
} from "lucide-react";

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  parentId: string | null;
  path: string;
  children?: FileSystemNode[];
  fileData?: any;
  size?: number;
  modifiedDate?: string;
  modifiedBy?: string;
  fileType?: string;
  created?: string;
  accessed?: string;
}

interface FileListProps {
  items: FileSystemNode[];
  selectedItems: Set<string>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  clipboard: any;
  draggedNode: FileSystemNode | null;
  dropTarget: string | null;
  dragOverPosition: string | null;
  onItemClick: (item: FileSystemNode, event: React.MouseEvent) => void;
  onItemDoubleClick: (item: FileSystemNode) => void;
  onSortChange: (field: string) => void;
  onDragStart: (e: React.DragEvent, item: FileSystemNode) => void;
  onDragOver: (e: React.DragEvent, item: FileSystemNode) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetItem: FileSystemNode) => void;
}

const FileList: React.FC<FileListProps> = ({
  items,
  selectedItems,
  sortBy,
  sortOrder,
  clipboard,
  draggedNode,
  dropTarget,
  dragOverPosition,
  onItemClick,
  onItemDoubleClick,
  onSortChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const getFileIcon = (item: FileSystemNode) => {
    if (item.type === 'folder') {
      return Folder;
    } else if (item.type === 'database') {
      return Database;
    } else {
      const ext = item.fileType?.toLowerCase();
      switch (ext) {
        case 'txt': case 'md': case 'log':
          return FileText;
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'bmp': case 'webp':
          return Image;
        case 'xlsx': case 'xls': case 'csv':
          return FileSpreadsheet;
        default:
          return File;
      }
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
          <tr>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">
              <button
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                onClick={() => onSortChange('name')}
              >
                名前
                {sortBy === 'name' && (
                  sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">
              <button
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                onClick={() => onSortChange('size')}
              >
                サイズ
                {sortBy === 'size' && (
                  sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">
              <button
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                onClick={() => onSortChange('modified')}
              >
                更新日時
                {sortBy === 'modified' && (
                  sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">更新者</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const Icon = getFileIcon(item);
            const isSelected = selectedItems.has(item.id);
            const isBeingCut = clipboard?.operation === 'cut' && clipboard.items.some((i: FileSystemNode) => i.id === item.id);

            return (
              <tr
                key={item.id}
                className={`
                  border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  ${isBeingCut ? 'opacity-50' : ''}
                  ${draggedNode?.id === item.id ? 'opacity-50' : ''}
                  ${dropTarget === item.id && dragOverPosition === 'inside' ? 'bg-blue-100 dark:bg-blue-800/50' : ''}
                `}
                onClick={(e) => onItemClick(item, e)}
                onDoubleClick={() => onItemDoubleClick(item)}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onDragOver={(e) => onDragOver(e, item)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, item)}
              >
                <td className="p-4 flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${item.type === 'folder' ? 'text-blue-500' : item.type === 'database' ? 'text-purple-500' : 'text-gray-500'}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </span>
                  {item.type === 'database' && (
                    <Badge variant="secondary" className="text-xs">
                      データベース
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                  {formatFileSize(item.size)}
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(item.modifiedDate)}
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                  {item.modifiedBy || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;