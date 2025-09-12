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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";

// 型定義
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
}

// ユーティリティ関数
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (node: FileSystemNode) => {
  if (node.type === 'folder') {
    return Folder;
  }
  if (node.type === 'database') {
    return Database;
  }
  
  switch (node.fileType?.toLowerCase()) {
    case 'pdf':
    case 'doc':
    case 'docx':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return Image;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return FileSpreadsheet;
    default:
      return File;
  }
};

const FileManagementSystem = () => {
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showToolsTable, setShowToolsTable] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    type: 'file' | 'folder' | 'background';
  } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // サンプルデータ
  const [fileSystem, setFileSystem] = useState<FileSystemNode[]>([
    {
      id: "documents",
      name: "ドキュメント",
      type: "folder",
      parentId: null,
      path: "/ドキュメント",
      children: [
        {
          id: "spec-001",
          name: "製品仕様書_Ver2.1.pdf",
          type: "file",
          parentId: "documents",
          path: "/ドキュメント/製品仕様書_Ver2.1.pdf",
          fileType: "pdf",
          size: 2048576,
          modifiedDate: "2024-01-20",
          modifiedBy: "田中エンジニア"
        }
      ]
    },
    {
      id: "drawings",
      name: "図面",
      type: "folder",
      parentId: null,
      path: "/図面",
      children: [
        {
          id: "project-a",
          name: "プロジェクトA",
          type: "folder",
          parentId: "drawings",
          path: "/図面/プロジェクトA",
          children: [
            {
              id: "dwg-001",
              name: "DWG-2024-001.dwg",
              type: "file",
              parentId: "project-a",
              path: "/図面/プロジェクトA/DWG-2024-001.dwg",
              fileType: "dwg",
              size: 1024000,
              modifiedDate: "2024-01-15",
              modifiedBy: "鈴木設計"
            }
          ]
        }
      ]
    },
    {
      id: "deliveries",
      name: "納品書",
      type: "folder",
      parentId: null,
      path: "/納品書",
      children: [
        {
          id: "2024",
          name: "2024年",
          type: "folder",
          parentId: "deliveries",
          path: "/納品書/2024年",
          children: [
            {
              id: "del-001",
              name: "DEL-2024-001.pdf",
              type: "file",
              parentId: "2024",
              path: "/納品書/2024年/DEL-2024-001.pdf",
              fileType: "pdf",
              size: 512000,
              modifiedDate: "2024-02-15",
              modifiedBy: "営業部"
            }
          ]
        }
      ]
    },
    {
      id: "tools-db",
      name: "工具管理.db",
      type: "database",
      parentId: null,
      path: "/工具管理.db",
      size: 256000,
      modifiedDate: "2024-01-20",
      modifiedBy: "田中太郎"
    }
  ]);

  // 工具管理データ（テーブル用）
  const [toolsData] = useState([
    {
      id: "1",
      name: "超硬エンドミル 10mm",
      type: "エンドミル",
      brand: "OSG",
      model: "EX-EEDL",
      serialNumber: "EM-001",
      status: "利用可能",
      location: "工具庫A-1-3",
      lastUsed: "2024-01-18",
      condition: "良好"
    },
    {
      id: "2",
      name: "デジタルノギス",
      type: "測定器具",
      brand: "ミツトヨ",
      model: "CD-15APX",
      serialNumber: "MG-002",
      status: "使用中",
      location: "作業台B",
      lastUsed: "2024-01-20",
      condition: "良好"
    }
  ]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleNodeClick = (node: FileSystemNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
      setSelectedPath(node.path.split('/').filter(p => p));
      setShowToolsTable(false);
    } else if (node.type === 'database' && node.name === '工具管理.db') {
      setShowToolsTable(true);
      setSelectedPath(['工具管理']);
    } else {
      // ファイルの処理
      console.log('ファイルを開く:', node);
      setShowToolsTable(false);
    }
    setSelectedNode(node);
  };

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

  const handleCreateFolder = () => {
    const newFolder: FileSystemNode = {
      id: `folder-${Date.now()}`,
      name: "新しいフォルダ",
      type: 'folder',
      parentId: null,
      path: "/新しいフォルダ",
      children: [],
      modifiedDate: new Date().toISOString().split('T')[0],
      modifiedBy: "現在のユーザー"
    };

    setFileSystem([...fileSystem, newFolder]);
    setContextMenu(null);
    
    // 作成直後に名前変更モードに
    setTimeout(() => {
      setEditingNodeId(newFolder.id);
      setEditingName("新しいフォルダ");
    }, 50);
  };

  const handleUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      const newFile: FileSystemNode = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: 'file',
        parentId: null,
        path: `/${file.name}`,
        size: file.size,
        fileType: file.name.split('.').pop() || 'unknown',
        modifiedDate: new Date().toISOString().split('T')[0],
        modifiedBy: "現在のユーザー"
      };
      
      setFileSystem(prev => [...prev, newFile]);
    });
  };

  const handleRename = (nodeId: string) => {
    const node = findNodeById(nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditingName(node.name);
    }
    setContextMenu(null);
  };

  const handleDelete = (nodeId: string) => {
    if (confirm("このアイテムを削除してもよろしいですか？")) {
      const deleteFromNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
        return nodes.filter(node => {
          if (node.id === nodeId) return false;
          if (node.children) {
            node.children = deleteFromNodes(node.children);
          }
          return true;
        });
      };
      
      setFileSystem(deleteFromNodes(fileSystem));
    }
    setContextMenu(null);
  };

  const saveRename = () => {
    if (!editingNodeId || !editingName.trim()) return;

    const updateNodeName = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === editingNodeId) {
          return { ...node, name: editingName.trim() };
        }
        if (node.children) {
          node.children = updateNodeName(node.children);
        }
        return node;
      });
    };

    setFileSystem(updateNodeName(fileSystem));
    setEditingNodeId(null);
    setEditingName("");
  };

  const renderTreeNode = (node: FileSystemNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const Icon = getFileIcon(node);

    return (
      <div key={node.id}>
        <div
          className={`
            flex items-center py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-slate-700 
            cursor-pointer transition-colors group
            ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          onContextMenu={(e) => handleRightClick(e, node.id)}
        >
          {node.type === 'folder' && (
            <button
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
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
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename();
                if (e.key === 'Escape') {
                  setEditingNodeId(null);
                  setEditingName("");
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
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderToolsTable = () => (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
      <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">工具名</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">種類</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">メーカー/型番</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">シリアル番号</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">ステータス</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">保管場所</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">最終使用日</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">状態</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">操作</th>
              </tr>
            </thead>
            <tbody>
              {toolsData.map(tool => (
                <tr key={tool.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="p-4 text-sm">{tool.name}</td>
                  <td className="p-4 text-sm">{tool.type}</td>
                  <td className="p-4 text-sm">
                    <div>
                      <div>{tool.brand}</div>
                      <div className="text-xs text-gray-500">{tool.model}</div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono">{tool.serialNumber}</td>
                  <td className="p-4">
                    <Badge variant={tool.status === '利用可能' ? 'default' : 'secondary'}>
                      {tool.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm">{tool.location}</td>
                  <td className="p-4 text-sm">{tool.lastUsed}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {tool.condition}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
    </div>
  );

  const renderFileList = () => {
    // 現在選択されているフォルダの中身を表示
    const currentFolder = selectedPath.length > 0 
      ? fileSystem.find(node => node.path === '/' + selectedPath.join('/'))
      : null;
    
    const items = currentFolder?.children || fileSystem;

    return (
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
        <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">名前</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">サイズ</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">更新日時</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">更新者</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const Icon = getFileIcon(item);
                  return (
                    <tr 
                      key={item.id} 
                      className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => handleNodeClick(item)}
                      onContextMenu={(e) => handleRightClick(e, item.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center">
                          <Icon className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm">{item.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(item.size)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.modifiedDate || '-'}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.modifiedBy || '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ファイル管理</h1>
                <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                  {selectedPath.length > 0 ? (
                    <>
                      <span>ルート</span>
                      {selectedPath.map((path, idx) => (
                        <React.Fragment key={idx}>
                          <ChevronRight className="w-3 h-3" />
                          <span>{path}</span>
                        </React.Fragment>
                      ))}
                    </>
                  ) : (
                    <span>ルートディレクトリ</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ファイル名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                />
              </div>
            </div>


            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex overflow-hidden">
          {/* サイドバー（ツリー表示） */}
          <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-2">
              {fileSystem.map(node => renderTreeNode(node))}
            </div>
          </div>

          {/* コンテンツエリア */}
          <div 
            className={`flex-1 relative ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            onContextMenu={(e) => !showToolsTable && handleRightClick(e)}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragOver(false);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && !showToolsTable) {
                handleUpload(e.dataTransfer.files);
              }
            }}
          >
            {showToolsTable ? renderToolsTable() : renderFileList()}
            
            {/* ドラッグオーバー時のオーバーレイ */}
            {isDragOver && !showToolsTable && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400 dark:border-blue-500">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">ファイルをドロップしてアップロード</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右クリックメニュー */}
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
              {contextMenu.type === 'background' && (
                <>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={handleCreateFolder}
                  >
                    <FolderPlus className="w-3 h-3 mr-2" />
                    新規フォルダ
                  </button>
                  <label className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleUpload(e.target.files);
                          setContextMenu(null);
                        }
                      }}
                    />
                    <Upload className="w-3 h-3 mr-2" />
                    ファイルをアップロード
                  </label>
                </>
              )}
              
              {contextMenu.nodeId && (
                <>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => handleRename(contextMenu.nodeId!)}
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    名前を変更
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => console.log('プロパティ')}
                  >
                    <Eye className="w-3 h-3 mr-2" />
                    プロパティ
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => handleDelete(contextMenu.nodeId!)}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    削除
                  </button>
                </>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default FileManagementSystem;