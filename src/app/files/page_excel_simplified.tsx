"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Database,
  ChevronRight,
  ChevronDown,
  Search,
  Upload,
  Download,
  Plus,
  MoreVertical,
  Grid3x3,
  List,
  Edit,
  Trash2,
  Eye,
  FolderPlus,
  Clock,
  User,
  HardDrive,
  Copy,
  Scissors,
  Star,
  GripVertical,
  FileX,
  Archive,
  Home,
  ArrowUp,
  RotateCcw,
  Share,
  Calendar,
  Filter,
  SortAsc,
  SortDesc,
} from "lucide-react";
import AdvancedExcelTable from './components/AdvancedExcelTable';

// 型定義
interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'status' | 'formula' | 'url' | 'rating' | 'multi_select' | 'date_range' | 'file' | 'email' | 'phone';
  options?: string[];
  formula?: string;
  maxRating?: number;
  width?: number;
}

interface TableRow {
  id: string;
  data: { [key: string]: any };
}

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
  tableColumns?: TableColumn[];
  tableData?: TableRow[];
}

type SortBy = 'name' | 'size' | 'modified' | 'type';
type SortOrder = 'asc' | 'desc';

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileManagementSystem = () => {
  const [fileSystem, setFileSystem] = useState<FileSystemNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['documents', 'drawings', 'deliveries']));
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [editingTable, setEditingTable] = useState<FileSystemNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, nodeId?: string, type: 'file' | 'folder' | 'background'} | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [clipboard, setClipboard] = useState<{items: FileSystemNode[], operation: 'copy' | 'cut'} | null>(null);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableColumns, setNewTableColumns] = useState<Array<{name: string, type: 'text' | 'number' | 'date'}>>([
    { name: "名前", type: "text" },
    { name: "種類", type: "text" },
    { name: "数量", type: "number" }
  ]);

  // 初期化
  useEffect(() => {
    const savedSystem = localStorage.getItem('unica-file-system');
    if (savedSystem) {
      try {
        setFileSystem(JSON.parse(savedSystem));
      } catch (e) {
        initializeFileSystem();
      }
    } else {
      initializeFileSystem();
    }
  }, []);

  const initializeFileSystem = () => {
    const initialSystem: FileSystemNode[] = [
      {
        id: 'folder-1',
        name: 'プロジェクト管理',
        type: 'folder',
        parentId: null,
        path: '/プロジェクト管理',
        created: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        children: [
          {
            id: 'db-1',
            name: 'タスク管理.db',
            type: 'database',
            parentId: 'folder-1',
            path: '/プロジェクト管理/タスク管理.db',
            created: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            tableColumns: [
              { name: 'タスク名', type: 'text' },
              { name: 'ステータス', type: 'select', options: ['未着手', '進行中', '完了', 'レビュー'] },
              { name: '優先度', type: 'number' },
              { name: 'タグ', type: 'multi_select', options: ['重要', '急ぎ', 'レビュー'] },
              { name: '期日', type: 'date' },
              { name: '担当者', type: 'text' },
              { name: '完了', type: 'checkbox' }
            ],
            tableData: [
              {
                id: 'task-1',
                data: {
                  'タスク名': 'Excel風テーブル実装',
                  'ステータス': '進行中',
                  '優先度': 4,
                  'タグ': ['重要'],
                  '期日': '2024-12-31',
                  '担当者': 'Claude',
                  '完了': false
                }
              }
            ]
          }
        ]
      },
      {
        id: 'folder-2', 
        name: '顧客管理',
        type: 'folder',
        parentId: null,
        path: '/顧客管理',
        created: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        children: []
      }
    ];
    setFileSystem(initialSystem);
    localStorage.setItem('unica-file-system', JSON.stringify(initialSystem));
  };

  // ユーティリティ関数
  const findNodeById = (id: string): FileSystemNode | null => {
    const search = (nodes: FileSystemNode[]): FileSystemNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(fileSystem);
  };

  const getCurrentFolder = (): FileSystemNode | null => {
    if (selectedPath.length === 0) return null;
    let current = fileSystem.find(node => node.name === selectedPath[0]);
    for (let i = 1; i < selectedPath.length && current; i++) {
      current = current.children?.find(child => child.name === selectedPath[i]);
    }
    return current || null;
  };

  const getCurrentItems = (): FileSystemNode[] => {
    if (selectedPath.length === 0) return fileSystem;
    const currentFolder = getCurrentFolder();
    return currentFolder?.children || [];
  };

  // フォルダ操作
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const navigateToPath = (path: string[]) => {
    setSelectedPath(path);
    setEditingTable(null);
    setSelectedItems(new Set());
  };

  // ノード操作
  const handleNodeClick = (node: FileSystemNode) => {
    if (node.type === 'folder') {
      const pathParts = node.path.split('/').filter(part => part !== '');
      navigateToPath(pathParts);
    } else if (node.type === 'database') {
      setEditingTable(node);
    }
    setSelectedNode(node);
    setSelectedItems(new Set([node.id]));
  };

  const handleDoubleClick = (node: FileSystemNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
      navigateToPath([...selectedPath, node.name]);
    } else if (node.type === 'database') {
      setEditingTable(node);
    }
  };

  // 右クリックメニュー
  const handleRightClick = (e: React.MouseEvent, nodeId?: string) => {
    e.preventDefault();
    const node = nodeId ? findNodeById(nodeId) : null;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      type: node ? (node.type === 'folder' ? 'folder' : 'file') : 'background'
    });
  };

  // 新しいフォルダ作成
  const handleCreateFolder = () => {
    const currentFolder = getCurrentFolder();
    const parentNodes = currentFolder?.children || fileSystem;
    const uniqueName = generateUniqueName("新しいフォルダ", parentNodes);
    
    const newFolder: FileSystemNode = {
      id: `folder-${Date.now()}`,
      name: uniqueName,
      type: 'folder',
      parentId: currentFolder?.id || null,
      path: currentFolder ? `${currentFolder.path}/${uniqueName}` : `/${uniqueName}`,
      children: [],
      created: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    const updateNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
      if (!currentFolder) return [...nodes, newFolder];
      
      return nodes.map(node => {
        if (node.id === currentFolder.id) {
          return { ...node, children: [...(node.children || []), newFolder] };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };

    const updatedFileSystem = updateNodes(fileSystem);
    setFileSystem(updatedFileSystem);
    localStorage.setItem('unica-file-system', JSON.stringify(updatedFileSystem));
    setContextMenu(null);
  };

  // ユニーク名生成
  const generateUniqueName = (baseName: string, parentNodes: FileSystemNode[]): string => {
    let name = baseName;
    let counter = 1;
    while (parentNodes.some(node => node.name === name)) {
      name = `${baseName} (${counter})`;
      counter++;
    }
    return name;
  };

  // データベース作成
  const handleCreateDatabase = () => {
    if (!newTableName.trim()) return;

    const currentFolder = getCurrentFolder();
    const parentNodes = currentFolder?.children || fileSystem;
    const uniqueName = generateUniqueName(`${newTableName.trim()}.db`, parentNodes);

    const newDatabase: FileSystemNode = {
      id: `database-${Date.now()}`,
      name: uniqueName,
      type: 'database',
      parentId: currentFolder?.id || null,
      path: currentFolder ? `${currentFolder.path}/${uniqueName}` : `/${uniqueName}`,
      created: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      tableColumns: [...newTableColumns],
      tableData: []
    };

    const updateNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
      if (!currentFolder) return [...nodes, newDatabase];
      
      return nodes.map(node => {
        if (node.id === currentFolder.id) {
          return { ...node, children: [...(node.children || []), newDatabase] };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };

    setFileSystem(updateNodes(fileSystem));
    localStorage.setItem('unica-file-system', JSON.stringify(updateNodes(fileSystem)));
    setShowTableCreator(false);
    setNewTableName("");
  };

  // ファイルツリー表示
  const renderFileTree = (nodes: FileSystemNode[], level = 0): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.id} style={{ marginLeft: `${level * 16}px` }}>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 text-sm ${
            editingTable?.id === node.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => handleDoubleClick(node)}
          onContextMenu={(e) => handleRightClick(e, node.id)}
        >
          {node.type === 'folder' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.id);
                }}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
              >
                {expandedFolders.has(node.id) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
              <Folder className="w-4 h-4 text-blue-600" />
            </>
          ) : node.type === 'database' ? (
            <>
              <div className="w-4" />
              <Database className="w-4 h-4 text-purple-600" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="w-4 h-4 text-gray-600" />
            </>
          )}
          
          <span className="truncate">{node.name}</span>
        </div>
        
        {node.type === 'folder' && expandedFolders.has(node.id) && node.children && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  // カスタムテーブル表示 (Excel風高機能版)
  const renderCustomTable = () => {
    if (!editingTable || !editingTable.tableColumns) return null;

    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTable.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {editingTable.path}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-1" />
              共有
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditingTable(null)}
            >
              閉じる
            </Button>
          </div>
        </div>

        {/* 高機能Excelテーブル */}
        <AdvancedExcelTable
          initialColumns={editingTable.tableColumns}
          initialData={editingTable.tableData || []}
          onDataChange={(columns, data) => {
            const updateNode = (nodes: FileSystemNode[]): FileSystemNode[] => {
              return nodes.map(node => {
                if (node.id === editingTable.id) {
                  return { ...node, tableColumns: columns, tableData: data };
                }
                if (node.children) {
                  return { ...node, children: updateNode(node.children) };
                }
                return node;
              });
            };
            const newSystem = updateNode(fileSystem);
            setFileSystem(newSystem);
            localStorage.setItem('unica-file-system', JSON.stringify(newSystem));
            setEditingTable({ ...editingTable, tableColumns: columns, tableData: data });
          }}
        />
      </div>
    );
  };

  // ファイルリスト表示
  const renderFileList = () => {
    const items = getCurrentItems();
    
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => {
              if (selectedPath.length > 0) {
                navigateToPath(selectedPath.slice(0, -1));
              }
            }} disabled={selectedPath.length === 0}>
              <ArrowUp className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Home className="w-4 h-4" />
              {selectedPath.map((segment, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="w-3 h-3" />
                  <span
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => navigateToPath(selectedPath.slice(0, index + 1))}
                  >
                    {segment}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreateFolder}>
              <FolderPlus className="w-4 h-4 mr-1" />
              フォルダ
            </Button>
            <Button size="sm" onClick={() => setShowTableCreator(true)}>
              <Database className="w-4 h-4 mr-1" />
              データベース
            </Button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 p-4" onContextMenu={(e) => handleRightClick(e)}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Folder className="w-16 h-16 mb-4" />
              <p>このフォルダは空です</p>
              <p className="text-sm">新しいファイルやフォルダを作成してください</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-slate-900 cursor-pointer ${
                    selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  onClick={() => handleNodeClick(item)}
                  onDoubleClick={() => handleDoubleClick(item)}
                  onContextMenu={(e) => handleRightClick(e, item.id)}
                >
                  {item.type === 'folder' ? (
                    <Folder className="w-8 h-8 text-blue-600" />
                  ) : item.type === 'database' ? (
                    <Database className="w-8 h-8 text-purple-600" />
                  ) : (
                    <File className="w-8 h-8 text-gray-600" />
                  )}
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.modifiedDate && new Date(item.modifiedDate).toLocaleDateString('ja-JP')}
                      {item.size && ` • ${formatFileSize(item.size)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-white dark:bg-slate-950">
      {/* 左サイドバー */}
      <div className="w-80 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            ファイル管理
          </h2>
        </div>

        <div className="flex-1 p-3 overflow-y-auto">
          {renderFileTree(fileSystem)}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <HardDrive className="h-3 w-3" />
            <span>容量: 8.2GB / 100GB</span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        {editingTable ? renderCustomTable() : renderFileList()}
      </div>

      {/* 右クリックメニュー */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
            onClick={handleCreateFolder}
          >
            <FolderPlus className="w-3 h-3 mr-2" />
            新規フォルダ
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
            onClick={() => {
              setShowTableCreator(true);
              setContextMenu(null);
            }}
          >
            <Database className="w-3 h-3 mr-2" />
            新規データベース
          </button>
        </div>
      )}

      {/* テーブル作成モーダル */}
      {showTableCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">新規データベース作成</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">データベース名</label>
              <Input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="例：在庫管理"
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTableCreator(false)}
              >
                キャンセル
              </Button>
              <Button onClick={handleCreateDatabase} disabled={!newTableName.trim()}>
                作成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagementSystem;