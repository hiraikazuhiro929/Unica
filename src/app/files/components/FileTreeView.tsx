"use client";
import React, { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  path: string;
  children?: FileSystemNode[];
  fileData?: any;
  depth?: number;
}

interface FileTreeViewProps {
  nodes: FileSystemNode[];
  onSelect: (node: FileSystemNode) => void;
  selectedId?: string;
  onCreateFolder?: (parentId: string | null) => void;
  onDelete?: (nodeId: string) => void;
  onRename?: (nodeId: string, newName: string) => void;
  renderFileItem?: (node: FileSystemNode) => React.ReactNode;
}

export const FileTreeView: React.FC<FileTreeViewProps> = ({
  nodes,
  onSelect,
  selectedId,
  onCreateFolder,
  onDelete,
  onRename,
  renderFileItem
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const renderNode = (node: FileSystemNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer rounded transition-colors",
            isSelected && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
            "group"
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleExpand(node.id);
            }
            onSelect(node);
          }}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
        >
          {node.type === 'folder' && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-4 w-4 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <div className="w-4" />
              )}
            </Button>
          )}
          
          {node.type === 'folder' ? (
            <div className="flex items-center flex-1">
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 mr-2 text-blue-500" />
              )}
              <span className="text-sm font-medium">{node.name}</span>
              {hasChildren && (
                <span className="ml-2 text-xs text-gray-500">
                  ({node.children?.length})
                </span>
              )}
            </div>
          ) : (
            renderFileItem ? renderFileItem(node) : (
              <div className="flex items-center flex-1 ml-5">
                <span className="text-sm">{node.name}</span>
              </div>
            )
          )}

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, node.id);
              }}
            >
              •••
            </Button>
          </div>
        </div>

        {node.type === 'folder' && isExpanded && hasChildren && (
          <div>
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {nodes.map((node) => renderNode(node))}

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[150px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {onCreateFolder && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => {
                  onCreateFolder(contextMenu.nodeId);
                  setContextMenu(null);
                }}
              >
                新規フォルダ
              </button>
            )}
            {onRename && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => {
                  const newName = prompt("新しい名前を入力してください");
                  if (newName) {
                    onRename(contextMenu.nodeId, newName);
                  }
                  setContextMenu(null);
                }}
              >
                名前を変更
              </button>
            )}
            {onDelete && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => {
                  if (confirm("削除してもよろしいですか？")) {
                    onDelete(contextMenu.nodeId);
                  }
                  setContextMenu(null);
                }}
              >
                削除
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};