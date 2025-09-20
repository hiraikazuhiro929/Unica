"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  Database,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  parentId: string | null;
  path: string;
  children?: FileSystemNode[];
  tableColumns?: any[];
  tableData?: any[];
}

interface SidebarProps {
  fileSystem: FileSystemNode[];
  selectedPath: string[];
  expandedFolders: Set<string>;
  selectedNode: FileSystemNode | null;
  editingNodeId: string | null;
  editingNodeName: string;
  onPathChange: (path: string[]) => void;
  onNodeSelect: (node: FileSystemNode | null) => void;
  onFolderToggle: (folderId: string) => void;
  onEdit: (nodeId: string, currentName: string) => void;
  onEditNameChange: (name: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onDelete: (nodeId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onCreateDatabase: (parentId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  fileSystem,
  selectedPath,
  expandedFolders,
  selectedNode,
  editingNodeId,
  editingNodeName,
  onPathChange,
  onNodeSelect,
  onFolderToggle,
  onEdit,
  onEditNameChange,
  onEditConfirm,
  onEditCancel,
  onDelete,
  onCreateFolder,
  onCreateDatabase,
}) => {
  const renderTreeNode = (node: FileSystemNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isEditing = editingNodeId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer rounded transition-colors ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              onFolderToggle(node.id);
            }
            onNodeSelect(node);
          }}
        >
          {/* 展開/折りたたみ矢印 */}
          {node.type === 'folder' && hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onFolderToggle(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          )}

          {/* アイコン */}
          <div className="w-4 h-4 flex items-center justify-center">
            {node.type === 'folder' ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )
            ) : node.type === 'database' ? (
              <Database className="w-4 h-4 text-purple-500" />
            ) : null}
          </div>

          {/* ノード名 */}
          <div className="flex-1 flex items-center gap-2">
            {isEditing ? (
              <input
                type="text"
                value={editingNodeName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onEditConfirm();
                  } else if (e.key === 'Escape') {
                    onEditCancel();
                  }
                }}
                onBlur={onEditCancel}
                className="flex-1 px-1 text-sm border border-blue-500 rounded"
                autoFocus
              />
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {node.name}
                </span>
                {node.type === 'database' && (
                  <Badge variant="secondary" className="text-xs">
                    {node.tableData?.length || 0}行
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* アクションボタン */}
          {!isEditing && isSelected && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {node.type === 'folder' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0"
                    onClick={() => onCreateFolder(node.id)}
                    title="フォルダ作成"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0"
                    onClick={() => onCreateDatabase(node.id)}
                    title="データベース作成"
                  >
                    <Database className="w-3 h-3" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={() => onEdit(node.id, node.name)}
                title="名前変更"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 text-red-500 hover:text-red-700"
                onClick={() => onDelete(node.id)}
                title="削除"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* 子ノード */}
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ファイル管理</h2>
      </div>

      <div className="p-2">
        {fileSystem.map(node => renderTreeNode(node))}
      </div>
    </div>
  );
};

export default Sidebar;