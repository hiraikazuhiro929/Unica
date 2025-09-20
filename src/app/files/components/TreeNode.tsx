"use client";
import React from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  parentId: string | null;
  path: string;
  children?: FileSystemNode[];
}

interface TreeNodeProps {
  node: FileSystemNode;
  depth?: number;
  expandedFolders: Set<string>;
  selectedItems: Set<string>;
  draggedNode: FileSystemNode | null;
  dropTarget: string | null;
  dragOverPosition: string | null;
  editingNodeId: string | null;
  editingName: string;
  isCreatingFolder: boolean;
  getFileIcon: (node: FileSystemNode) => React.ComponentType<any>;
  onDragStart: (e: React.DragEvent, node: FileSystemNode) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, node?: FileSystemNode) => void;
  onDrop: (e: React.DragEvent, node?: FileSystemNode) => void;
  onNodeClick: (node: FileSystemNode, e: React.MouseEvent) => void;
  onDoubleClick: (node: FileSystemNode) => void;
  onRightClick: (e: React.MouseEvent, nodeId: string) => void;
  onToggleFolder: (nodeId: string) => void;
  onEditingNameChange: (name: string) => void;
  onSaveRename: () => void;
  onEditingNodeIdChange: (id: string | null) => void;
  onIsCreatingFolderChange: (creating: boolean) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth = 0,
  expandedFolders,
  selectedItems,
  draggedNode,
  dropTarget,
  dragOverPosition,
  editingNodeId,
  editingName,
  isCreatingFolder,
  getFileIcon,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onNodeClick,
  onDoubleClick,
  onRightClick,
  onToggleFolder,
  onEditingNameChange,
  onSaveRename,
  onEditingNodeIdChange,
  onIsCreatingFolderChange,
}) => {
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedItems.has(node.id);
  const Icon = getFileIcon(node);

  return (
    <div key={node.id}>
      <div
        className={`
          flex items-center py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-slate-700
          cursor-pointer transition-colors group
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          ${draggedNode?.id === node.id ? 'opacity-50' : ''}
          ${dropTarget === node.id && dragOverPosition === 'inside' ? 'bg-blue-100 dark:bg-blue-800/50' : ''}
        `}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        data-file-node="true"
        draggable={true}
        onDragStart={(e) => onDragStart(e, node)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, node)}
        onDrop={(e) => onDrop(e, node)}
        onClick={(e) => onNodeClick(node, e)}
        onDoubleClick={() => onDoubleClick(node)}
        onContextMenu={(e) => {
          e.stopPropagation();
          onRightClick(e, node.id);
        }}
      >
        {node.type === 'folder' && (
          <button
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded mr-1"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolder(node.id);
            }}
          >
            {node.children && node.children.length > 0 ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <div className="w-4" />
            )}
          </button>
        )}

        {node.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          )
        ) : (
          <Icon className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        )}

        {editingNodeId === node.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={onSaveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveRename();
              if (e.key === 'Escape') {
                onEditingNodeIdChange(null);
                onEditingNameChange("");
                onIsCreatingFolderChange(false); // Escapeキャンセル時もフラグリセット
              }
            }}
            className="text-sm flex-1 bg-white dark:bg-slate-700 border rounded px-1"
            autoFocus
          />
        ) : (
          <span className="text-sm flex-1">{node.name}</span>
        )}
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              selectedItems={selectedItems}
              draggedNode={draggedNode}
              dropTarget={dropTarget}
              dragOverPosition={dragOverPosition}
              editingNodeId={editingNodeId}
              editingName={editingName}
              isCreatingFolder={isCreatingFolder}
              getFileIcon={getFileIcon}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onNodeClick={onNodeClick}
              onDoubleClick={onDoubleClick}
              onRightClick={onRightClick}
              onToggleFolder={onToggleFolder}
              onEditingNameChange={onEditingNameChange}
              onSaveRename={onSaveRename}
              onEditingNodeIdChange={onEditingNodeIdChange}
              onIsCreatingFolderChange={onIsCreatingFolderChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;