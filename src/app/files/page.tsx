"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { uploadFile, getFileSystem, deleteFile, createFolder, renameItem, moveItem } from "@/lib/firebase/fileManagement";
import * as XLSX from 'xlsx';
import { Document, Page, pdfjs } from 'react-pdf';

// PDF.js workerを設定
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
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
import EnhancedNotionTable from './components/EnhancedNotionTable';

// 型定義
interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'status' | 'formula' | 'url' | 'rating' | 'multi-select' | 'date-range' | 'file';
  options?: string[]; // select, status, multi-selectタイプ用
  formula?: string; // formulaタイプ用
  maxRating?: number; // ratingタイプ用（デフォルト5）
  width?: number; // カラム幅（px）
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
  // データベース用
  tableColumns?: TableColumn[];
  tableData?: TableRow[];
  // ファイル内容
  content?: string;
  dataUrl?: string;
  // Excel専用データ
  excelData?: {
    sheets: { [key: string]: any[][] };
    sheetNames: string[];
    styles?: any;
    metadata?: any;
    rawSheets?: { [key: string]: any }; // 生のワークシートデータ
    columnWidths?: { [key: string]: { [key: string]: number } }; // シート別列幅
  };
  // PDF専用データ
  pdfData?: {
    numPages: number;
    dataUrl: string;
  };
}

// ソート設定
type SortBy = 'name' | 'size' | 'modified' | 'type';
type SortOrder = 'asc' | 'desc';

// ユーティリティ関数
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
      return FileText;
    case 'doc':
    case 'docx':
      return FileText;
    case 'txt':
    case 'md':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return Image;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return FileSpreadsheet;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return Archive;
    case 'dwg':
    case 'dxf':
      return FileText;
    default:
      return File;
  }
};

const FileManagementSystem = () => {
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['documents', 'drawings', 'deliveries']));
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showToolsTable, setShowToolsTable] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    type: 'file' | 'folder' | 'background';
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // 統一されたコンテキストメニュー
  const [unifiedContextMenu, setUnifiedContextMenu] = useState<{
    x: number;
    y: number;
    type: 'file' | 'folder' | 'background' | 'row' | 'column' | 'cell';
    nodeId?: string;
    rowId?: string;
    rowIndex?: number;
    columnName?: string;
  } | null>(null);
  
  const [editingColumnName, setEditingColumnName] = useState<string | null>(null);
  const [tempColumnName, setTempColumnName] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [clipboard, setClipboard] = useState<{items: FileSystemNode[], operation: 'copy' | 'cut'} | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [draggedNode, setDraggedNode] = useState<FileSystemNode | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableColumns, setNewTableColumns] = useState<Array<{name: string, type: 'text' | 'number' | 'date'}>>([
    { name: "名前", type: "text" },
    { name: "種類", type: "text" },
    { name: "数量", type: "number" }
  ]);
  const [editingTable, setEditingTable] = useState<FileSystemNode | null>(null);
  const [editingTableData, setEditingTableData] = useState<TableRow[]>([]);
  const [editingCell, setEditingCell] = useState<{rowId: string, columnName: string} | null>(null);
  const [newRowData, setNewRowData] = useState<{ [key: string]: any }>({});
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date' | 'select' | 'checkbox' | 'status' | 'formula' | 'url' | 'rating' | 'multi-select' | 'date-range' | 'file'>('text');
  const [newColumnOptions, setNewColumnOptions] = useState<string[]>([]);
  const [newColumnFormula, setNewColumnFormula] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [tableSortBy, setTableSortBy] = useState<string>("");
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState<{columnName: string, startX: number, startWidth: number} | null>(null);
  const [newColumnMaxRating, setNewColumnMaxRating] = useState(5);
  const [cellContextMenu, setCellContextMenu] = useState<{x: number, y: number, rowId: string, columnName: string} | null>(null);
  const [copiedCell, setCopiedCell] = useState<{value: any, type: string} | null>(null);
  const [isDraggingColumn, setIsDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'table' | 'kanban' | 'gallery'>('table');
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [filePreview, setFilePreview] = useState<{
    show: boolean;
    file: FileSystemNode | null;
  }>({ show: false, file: null });
  const [activeExcelSheet, setActiveExcelSheet] = useState<string>('');
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  // データの初期化・読み込み
  const [fileSystem, setFileSystem] = useState<FileSystemNode[]>(() => {
    try {
      const saved = localStorage.getItem('unica-file-system');
      if (saved) {
        console.log('📁 保存データを読み込みました');
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
    
    // デフォルトデータ
    return [
    {
      id: "documents",
      name: "ドキュメント",
      type: "folder",
      parentId: null,
      path: "/ドキュメント",
      created: "2024-01-01",
      modifiedDate: "2024-01-20",
      modifiedBy: "システム",
      children: [
        {
          id: "spec-001",
          name: "製品仕様書_Ver2.1.pdf",
          type: "file",
          parentId: "documents",
          path: "/ドキュメント/製品仕様書_Ver2.1.pdf",
          fileType: "pdf",
          size: 2048576,
          created: "2024-01-15",
          modifiedDate: "2024-01-20",
          modifiedBy: "田中エンジニア"
        },
        {
          id: "manual-001",
          name: "操作マニュアル.docx",
          type: "file",
          parentId: "documents",
          path: "/ドキュメント/操作マニュアル.docx",
          fileType: "docx",
          size: 1024000,
          created: "2024-01-10",
          modifiedDate: "2024-01-18",
          modifiedBy: "佐藤"
        }
      ]
    },
    {
      id: "drawings",
      name: "図面",
      type: "folder",
      parentId: null,
      path: "/図面",
      created: "2024-01-01",
      modifiedDate: "2024-01-15",
      modifiedBy: "システム",
      children: [
        {
          id: "project-a",
          name: "プロジェクトA",
          type: "folder",
          parentId: "drawings",
          path: "/図面/プロジェクトA",
          created: "2024-01-05",
          modifiedDate: "2024-01-15",
          modifiedBy: "設計部",
          children: [
            {
              id: "dwg-001",
              name: "DWG-2024-001.dwg",
              type: "file",
              parentId: "project-a",
              path: "/図面/プロジェクトA/DWG-2024-001.dwg",
              fileType: "dwg",
              size: 1024000,
              created: "2024-01-15",
              modifiedDate: "2024-01-15",
              modifiedBy: "鈴木設計"
            },
            {
              id: "dwg-002",
              name: "DWG-2024-002.dwg",
              type: "file",
              parentId: "project-a",
              path: "/図面/プロジェクトA/DWG-2024-002.dwg",
              fileType: "dwg",
              size: 856000,
              created: "2024-01-16",
              modifiedDate: "2024-01-16",
              modifiedBy: "鈴木設計"
            }
          ]
        },
        {
          id: "project-b",
          name: "プロジェクトB",
          type: "folder",
          parentId: "drawings",
          path: "/図面/プロジェクトB",
          created: "2024-01-08",
          modifiedDate: "2024-01-12",
          modifiedBy: "設計部",
          children: []
        }
      ]
    },
    {
      id: "deliveries",
      name: "納品書",
      type: "folder",
      parentId: null,
      path: "/納品書",
      created: "2024-01-01",
      modifiedDate: "2024-02-15",
      modifiedBy: "システム",
      children: [
        {
          id: "2024",
          name: "2024年",
          type: "folder",
          parentId: "deliveries",
          path: "/納品書/2024年",
          created: "2024-01-01",
          modifiedDate: "2024-02-15",
          modifiedBy: "営業部",
          children: [
            {
              id: "del-001",
              name: "DEL-2024-001.pdf",
              type: "file",
              parentId: "2024",
              path: "/納品書/2024年/DEL-2024-001.pdf",
              fileType: "pdf",
              size: 512000,
              created: "2024-02-15",
              modifiedDate: "2024-02-15",
              modifiedBy: "営業部"
            },
            {
              id: "del-002",
              name: "DEL-2024-002.pdf",
              type: "file",
              parentId: "2024",
              path: "/納品書/2024年/DEL-2024-002.pdf",
              fileType: "pdf",
              size: 456000,
              created: "2024-02-20",
              modifiedDate: "2024-02-20",
              modifiedBy: "営業部"
            }
          ]
        }
      ]
    },
    {
      id: "images",
      name: "画像",
      type: "folder",
      parentId: null,
      path: "/画像",
      created: "2024-01-01",
      modifiedDate: "2024-01-10",
      modifiedBy: "システム",
      children: [
        {
          id: "photo-001",
          name: "工程写真_2024-01.jpg",
          type: "file",
          parentId: "images",
          path: "/画像/工程写真_2024-01.jpg",
          fileType: "jpg",
          size: 1536000,
          created: "2024-01-10",
          modifiedDate: "2024-01-10",
          modifiedBy: "佐藤作業員"
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
      created: "2024-01-01",
      modifiedDate: "2024-01-20",
      modifiedBy: "田中太郎"
    }
    ];
  });

  // 工具管理データ
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
      condition: "良好",
      purchaseDate: "2023-03-15",
      purchasePrice: 8500,
      currentValue: 6800
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
      condition: "良好",
      purchaseDate: "2022-08-10",
      purchasePrice: 15000,
      currentValue: 12000
    },
    {
      id: "3",
      name: "フライス加工用バイト",
      type: "バイト",
      brand: "三菱マテリアル",
      model: "SNMG120408",
      serialNumber: "BT-003",
      status: "利用可能",
      location: "工具庫B-2-1",
      lastUsed: "2024-01-19",
      condition: "良好",
      purchaseDate: "2023-12-05",
      purchasePrice: 3200,
      currentValue: 2800
    }
  ]);

  // 現在のフォルダ取得
  const getCurrentFolder = (): FileSystemNode | null => {
    if (selectedPath.length === 0) return null;
    
    const findFolder = (nodes: FileSystemNode[], path: string[]): FileSystemNode | null => {
      if (path.length === 0) return null;
      
      for (const node of nodes) {
        if (node.name === path[0] && node.type === 'folder') {
          if (path.length === 1) return node;
          if (node.children) {
            return findFolder(node.children, path.slice(1));
          }
        }
      }
      return null;
    };
    
    return findFolder(fileSystem, selectedPath);
  };

  // 現在のアイテム取得
  const getCurrentItems = (): FileSystemNode[] => {
    const currentFolder = getCurrentFolder();
    const items = currentFolder?.children || fileSystem;
    
    // フィルタリング
    let filteredItems = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // ソート
    filteredItems.sort((a, b) => {
      let comparison = 0;
      
      // フォルダを常に上に
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'modified':
          comparison = (a.modifiedDate || '').localeCompare(b.modifiedDate || '');
          break;
        case 'type':
          comparison = (a.fileType || '').localeCompare(b.fileType || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filteredItems;
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
    console.log('🧭 navigateToPath called', { 
      path, 
      currentPath: selectedPath,
      timestamp: Date.now()
    });
    setSelectedPath(path);
    setShowToolsTable(false);
    setEditingTable(null);
    setEditingTableData([]);
    setSelectedItems(new Set());
  };

  const goUp = () => {
    if (selectedPath.length > 0) {
      navigateToPath(selectedPath.slice(0, -1));
    }
  };

  // ノード操作
  const handleNodeClick = (node: FileSystemNode, event?: React.MouseEvent) => {
    console.log('🖱️ handleNodeClick called', { 
      nodeName: node.name, 
      nodeType: node.type,
      currentPath: selectedPath,
      timestamp: Date.now()
    });
    
    if (event?.ctrlKey || event?.metaKey) {
      // Ctrl+Click で複数選択
      const newSelected = new Set(selectedItems);
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
      } else {
        newSelected.add(node.id);
      }
      setSelectedItems(newSelected);
      return;
    }

    if (node.type === 'folder') {
      // ノードのパスから正しい階層を取得
      const pathParts = node.path.split('/').filter(part => part !== '');
      console.log('📁 Folder clicked, navigating to:', pathParts);
      navigateToPath(pathParts);
    } else if (node.type === 'database') {
      if (node.name === '工具管理.db') {
        setShowToolsTable(true);
        setSelectedPath(['工具管理']);
      } else {
        // カスタムデータベースを開く
        setEditingTable(node);
        setEditingTableData(node.tableData || []);
        setShowToolsTable(false);
      }
    } else {
      // ファイルを開く
      handleFileOpen(node);
    }

    setSelectedNode(node);
    setSelectedItems(new Set([node.id]));
  };

  const handleDoubleClick = (node: FileSystemNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
      // ノードのパスから正しい階層を取得（handleNodeClickと同様）
      const pathParts = node.path.split('/').filter(part => part !== '');
      navigateToPath(pathParts);
    } else if (node.type === 'database') {
      if (node.name === '工具管理.db') {
        setShowToolsTable(true);
        setSelectedPath(['工具管理']);
      } else {
        // カスタムデータベースを開く
        setEditingTable(node);
        setEditingTableData(node.tableData || []);
        setShowToolsTable(false);
      }
    } else {
      // ファイルを開く
      handleFileOpen(node);
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

  // 名前重複チェック関数
  const checkNameDuplicate = (name: string, parentNodes: FileSystemNode[]): boolean => {
    return parentNodes.some(node => node.name === name);
  };

  // 一意な名前生成関数
  const generateUniqueName = (baseName: string, parentNodes: FileSystemNode[]): string => {
    let name = baseName;
    let counter = 1;

    while (checkNameDuplicate(name, parentNodes)) {
      name = `${baseName} (${counter})`;
      counter++;
    }

    return name;
  };

  // ファイルを開く関数
  // Excelセルスタイルを CSS に変換する関数
  const getCellStyle = (cellData: any, styles: any[]): React.CSSProperties => {
    if (!cellData || !cellData.style || !styles) return {};

    const style: React.CSSProperties = {};
    const cellStyle = styles[cellData.style] || {};

    // フォント設定
    if (cellStyle.font) {
      if (cellStyle.font.bold) style.fontWeight = 'bold';
      if (cellStyle.font.italic) style.fontStyle = 'italic';
      if (cellStyle.font.underline) style.textDecoration = 'underline';
      if (cellStyle.font.sz) style.fontSize = `${cellStyle.font.sz}px`;
      if (cellStyle.font.name) style.fontFamily = cellStyle.font.name;

      // フォント色
      if (cellStyle.font.color) {
        if (cellStyle.font.color.rgb) {
          style.color = `#${cellStyle.font.color.rgb}`;
        } else if (cellStyle.font.color.theme !== undefined) {
          // テーマカラーの基本的な対応
          const themeColors = ['#000000', '#FFFFFF', '#1F497D', '#4F81BD', '#C0504D', '#9BBB59'];
          if (themeColors[cellStyle.font.color.theme]) {
            style.color = themeColors[cellStyle.font.color.theme];
          }
        }
      }
    }

    // 背景色
    if (cellStyle.fill && cellStyle.fill.bgColor) {
      if (cellStyle.fill.bgColor.rgb) {
        style.backgroundColor = `#${cellStyle.fill.bgColor.rgb}`;
      }
    }

    // 文字揃え
    if (cellStyle.alignment) {
      if (cellStyle.alignment.horizontal) {
        switch (cellStyle.alignment.horizontal) {
          case 'center': style.textAlign = 'center'; break;
          case 'right': style.textAlign = 'right'; break;
          case 'left': style.textAlign = 'left'; break;
        }
      }
      if (cellStyle.alignment.vertical) {
        switch (cellStyle.alignment.vertical) {
          case 'center': style.verticalAlign = 'middle'; break;
          case 'top': style.verticalAlign = 'top'; break;
          case 'bottom': style.verticalAlign = 'bottom'; break;
        }
      }
    }

    // 境界線
    if (cellStyle.border) {
      const borderStyle = '1px solid #ccc';
      if (cellStyle.border.top) style.borderTop = borderStyle;
      if (cellStyle.border.bottom) style.borderBottom = borderStyle;
      if (cellStyle.border.left) style.borderLeft = borderStyle;
      if (cellStyle.border.right) style.borderRight = borderStyle;
    }

    return style;
  };

  // 列幅を取得する関数
  const getColumnWidth = (sheetName: string, colIndex: number): number => {
    if (!filePreview.file?.excelData?.columnWidths?.[sheetName]) return 120;

    const colLetter = XLSX.utils.encode_col(colIndex);
    return filePreview.file.excelData.columnWidths[sheetName][colLetter] || 120;
  };

  const handleFileOpen = (node: FileSystemNode) => {
    console.log('ファイルを開く:', node);

    if (node.type !== 'file') return;

    // ファイルの内容があるかチェック
    if (!node.dataUrl && !node.content) {
      alert('ファイルの内容が保存されていません。');
      return;
    }

    // ファイルプレビューを表示
    setFilePreview({ show: true, file: node });

    // Excelファイルの場合、最初のシートを選択
    if (node.excelData && node.excelData.sheetNames.length > 0) {
      setActiveExcelSheet(node.excelData.sheetNames[0]);
    } else {
      setActiveExcelSheet('');
    }

    // PDFファイルの場合、最初のページを選択
    if (node.pdfData) {
      setCurrentPdfPage(1);
      setPdfNumPages(node.pdfData.numPages);
    }
  };

  // ファイル操作
  const handleCreateFolder = (targetFolderId?: string) => {
    console.log('🔥 handleCreateFolder called', { 
      isCreatingFolder, 
      editingNodeId, 
      targetFolderId,
      timestamp: Date.now()
    });
    
    if (isCreatingFolder || editingNodeId) {
      console.log('❌ Blocked by flag', { isCreatingFolder, editingNodeId });
      return;
    }
    
    console.log('✅ Proceeding with folder creation');
    setIsCreatingFolder(true);
    
    try {
      // 右クリックしたフォルダがあればそれを親に、なければ現在のフォルダを親に
      const targetFolder = targetFolderId ? findNodeById(targetFolderId) : getCurrentFolder();
      const currentFolder = (targetFolder && targetFolder.type === 'folder') ? targetFolder : getCurrentFolder();
      const parentNodes = currentFolder?.children || fileSystem;
      const uniqueName = generateUniqueName("新しいフォルダ", parentNodes);
      
      const newFolder: FileSystemNode = {
        id: `folder-${Date.now()}-${Math.random()}`,
        name: uniqueName,
        type: 'folder',
        parentId: currentFolder?.id || null,
        path: currentFolder ? `${currentFolder.path}/${uniqueName}` : `/${uniqueName}`,
        children: [],
        created: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        modifiedBy: "現在のユーザー"
      };

      const updateFileSystem = (nodes: FileSystemNode[]): FileSystemNode[] => {
        if (!currentFolder) {
          // ルート階層に追加
          return [...nodes, newFolder];
        }
        
        // 指定されたフォルダの子として追加
        return nodes.map(node => {
          if (node.id === currentFolder.id) {
            return {
              ...node,
              children: [...(node.children || []), newFolder]
            };
          }
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: updateFileSystem(node.children)
            };
          }
          return node;
        });
      };

      const updatedFileSystem = updateFileSystem(fileSystem);
      setFileSystem(updatedFileSystem);
      localStorage.setItem('unica-file-system', JSON.stringify(updatedFileSystem));
      
      // 作成直後に名前変更モード（即座に実行）
      setEditingNodeId(newFolder.id);
      setEditingName(uniqueName);
      
      // 500ms後にフラグをリセット（デバウンス強化）
      setTimeout(() => {
        console.log('⏰ Resetting isCreatingFolder flag');
        setIsCreatingFolder(false);
      }, 500);
      
    } catch (error) {
      console.error('フォルダ作成でエラーが発生しました:', error);
      setIsCreatingFolder(false);
      alert('フォルダの作成に失敗しました。');
    }
  };

  // 新規データベース作成
  const handleCreateDatabase = () => {
    if (!newTableName.trim()) {
      alert('テーブル名を入力してください。');
      return;
    }

    const currentFolder = getCurrentFolder();
    const parentNodes = currentFolder?.children || fileSystem;
    const uniqueName = generateUniqueName(`${newTableName.trim()}.db`, parentNodes);

    const newDatabase: FileSystemNode = {
      id: `database-${Date.now()}-${Math.random()}`,
      name: uniqueName,
      type: 'database',
      parentId: currentFolder?.id || null,
      path: currentFolder ? `${currentFolder.path}/${uniqueName}` : `/${uniqueName}`,
      size: 0,
      created: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      modifiedBy: "現在のユーザー",
      tableColumns: [...newTableColumns],
      tableData: []
    };

    const updateFileSystem = (nodes: FileSystemNode[]): FileSystemNode[] => {
      if (!currentFolder) {
        return [...nodes, newDatabase];
      }
      
      return nodes.map(node => {
        if (node.id === currentFolder.id) {
          return {
            ...node,
            children: [...(node.children || []), newDatabase]
          };
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: updateFileSystem(node.children)
          };
        }
        return node;
      });
    };

    setFileSystem(updateFileSystem(fileSystem));
    setShowTableCreator(false);
    setNewTableName("");
    setNewTableColumns([
      { name: "名前", type: "text" },
      { name: "種類", type: "text" },
      { name: "数量", type: "number" }
    ]);
  };

  const handleUpload = async (files: FileList) => {
    console.log('handleUpload called with', files.length, 'files');
    const currentFolder = getCurrentFolder();
    console.log('Current folder:', currentFolder);
    console.log('Current selectedPath:', selectedPath);

    // parentNodesを正しく取得
    let parentNodes: FileSystemNode[];
    if (currentFolder && currentFolder.children) {
      parentNodes = currentFolder.children;
    } else if (selectedPath.length === 0) {
      parentNodes = fileSystem;
    } else {
      // フォルダが見つからない場合は、ルートを使用
      parentNodes = fileSystem;
      console.warn('Could not find parent folder, using root');
    }

    console.log('Parent nodes:', parentNodes);

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        console.log('Processing file:', file.name, file.size, file.type);
        const uniqueName = generateUniqueName(file.name, parentNodes);

        // ファイル内容を読み込む
        let dataUrl: string | undefined;
        let content: string | undefined;
        let excelData: { sheets: { [key: string]: any[][] }; sheetNames: string[]; styles?: any; metadata?: any } | undefined;
        let pdfData: { numPages: number; dataUrl: string } | undefined;

        // PDFファイルの場合
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          try {
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });

            // PDFの基本情報を取得
            pdfData = {
              numPages: 0, // 実際のページ数は表示時に取得
              dataUrl: dataUrl
            };

            console.log('PDF file processed');
          } catch (error) {
            console.error('PDF processing error:', error);
          }
        }
        // Excelファイルの場合は構造化データとして保存
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel') {
          try {
            const buffer = await new Promise<ArrayBuffer>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
              reader.readAsArrayBuffer(file);
            });

            const workbook = XLSX.read(buffer, {
              type: 'array',
              cellStyles: true,
              cellNF: true,
              cellHTML: false,
              cellText: false,
              sheetStubs: true
            });

            const sheets: { [key: string]: any[][] } = {};
            const rawSheets: { [key: string]: any } = {};
            const columnWidths: { [key: string]: { [key: string]: number } } = {};

            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              rawSheets[sheetName] = worksheet;

              // セル範囲を取得
              const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

              // 列幅情報を取得
              const colWidths: { [key: string]: number } = {};
              if (worksheet['!cols']) {
                worksheet['!cols'].forEach((col: any, index: number) => {
                  if (col && col.width) {
                    const colLetter = XLSX.utils.encode_col(index);
                    colWidths[colLetter] = col.width * 7; // Excelの幅をピクセルに変換
                  }
                });
              }
              columnWidths[sheetName] = colWidths;

              // セルデータを書式情報付きで取得
              const sheetData: any[][] = [];
              for (let R = range.s.r; R <= range.e.r; ++R) {
                const row: any[] = [];
                for (let C = range.s.c; C <= range.e.c; ++C) {
                  const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                  const cell = worksheet[cellAddress];

                  if (cell) {
                    // セル値と書式情報を保持
                    row.push({
                      value: cell.w || cell.v || '', // 表示値または生値
                      style: cell.s || {},           // スタイル情報
                      type: cell.t || 's',           // セルタイプ
                      format: cell.z || 'General'    // 書式
                    });
                  } else {
                    row.push({
                      value: '',
                      style: {},
                      type: 's',
                      format: 'General'
                    });
                  }
                }
                sheetData.push(row);
              }
              sheets[sheetName] = sheetData;
            });

            excelData = {
              sheets,
              sheetNames: workbook.SheetNames,
              styles: workbook.Styles || [],
              rawSheets,
              columnWidths,
              metadata: {
                creator: workbook.Props?.Creator,
                created: workbook.Props?.CreatedDate,
                modified: workbook.Props?.ModifiedDate
              }
            };

            // フォールバック用にDataURLも保存
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });

            console.log('Excel data parsed:', excelData);
          } catch (error) {
            console.error('Excel parsing error:', error);
            // エラー時はDataURLのみ保存
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });
          }
        }
        // 画像ファイルの場合はDataURLとして保存
        else if (file.type.startsWith('image/')) {
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }
        // テキストファイルの場合は内容を保存
        else if (file.type.startsWith('text/') ||
                 file.name.endsWith('.txt') ||
                 file.name.endsWith('.md') ||
                 file.name.endsWith('.json') ||
                 file.name.endsWith('.csv')) {
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsText(file);
          });
        }
        // PDFやその他のファイルもDataURLとして保存
        else {
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }

        const newFile: FileSystemNode = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: uniqueName,
          type: 'file',
          parentId: currentFolder?.id || null,
          path: selectedPath.length > 0
            ? `/${selectedPath.join('/')}/${uniqueName}`
            : `/${uniqueName}`,
          size: file.size,
          fileType: file.name.split('.').pop() || 'unknown',
          created: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
          modifiedBy: "現在のユーザー",
          content,
          dataUrl,
          excelData,
          pdfData
        };

        // Firebaseにアップロード
        try {
          await uploadFile(file, selectedPath.join('/'), {
            id: newFile.id,
            name: newFile.name,
            type: 'file',
            parentId: newFile.parentId,
            path: newFile.path,
            size: newFile.size,
            fileType: newFile.fileType,
            createdBy: "現在のユーザー",
            modifiedBy: "現在のユーザー"
          });
          console.log('Firebase upload successful');
        } catch (uploadError) {
          console.warn('Firebase upload failed, saving locally only:', uploadError);
        }

        // ローカルのファイルシステムを更新
        const updateFileSystem = (nodes: FileSystemNode[], pathIndex: number = 0): FileSystemNode[] => {
          if (selectedPath.length === 0) {
            // ルートディレクトリに追加
            console.log('Adding file to root:', newFile.name);
            return [...nodes, newFile];
          }

          return nodes.map(node => {
            if (node.name === selectedPath[pathIndex] && node.type === 'folder') {
              if (pathIndex === selectedPath.length - 1) {
                // 最終階層に到達、ここにファイルを追加
                console.log(`Adding file to folder: ${node.name}`, newFile.name);
                return {
                  ...node,
                  children: [...(node.children || []), newFile]
                };
              } else if (node.children) {
                // さらに深い階層を探索
                return {
                  ...node,
                  children: updateFileSystem(node.children, pathIndex + 1)
                };
              }
            }
            return node;
          });
        };

        const updatedFileSystem = updateFileSystem(fileSystem);
        console.log('Updated file system:', updatedFileSystem);
        setFileSystem(updatedFileSystem);
        localStorage.setItem('unica-file-system', JSON.stringify(updatedFileSystem));

        // 次のファイルのために、parentNodesを更新
        if (currentFolder && currentFolder.children) {
          const updatedFolder = findNodeById(currentFolder.id);
          if (updatedFolder && updatedFolder.children) {
            parentNodes = updatedFolder.children;
          }
        } else {
          parentNodes = updatedFileSystem;
        }
      }

      console.log(`${files.length}個のファイルをアップロードしました`);
      alert(`${files.length}個のファイルをアップロードしました`);
    } catch (error) {
      console.error('Upload error:', error);
      alert("ファイルのアップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRename = (nodeId: string) => {
    const node = findNodeById(nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditingName(node.name);
    }
    setContextMenu(null);
  };

  const handleDelete = (nodeIds: string[]) => {
    if (!nodeIds.length) return;
    
    try {
      if (confirm(`${nodeIds.length}個のアイテムを削除してもよろしいですか？`)) {
        const deleteFromNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
          return nodes.filter(node => {
            if (nodeIds.includes(node.id)) return false;
            if (node.children) {
              node.children = deleteFromNodes(node.children);
            }
            return true;
          });
        };
        
        setFileSystem(deleteFromNodes(fileSystem));
        setSelectedItems(new Set());
      }
    } catch (error) {
      console.error('削除処理でエラーが発生しました:', error);
      alert('削除処理に失敗しました。');
    }
    setContextMenu(null);
  };

  const handleCopy = (nodeIds: string[]) => {
    try {
      const nodes = nodeIds.map(id => findNodeById(id)).filter(Boolean) as FileSystemNode[];
      if (nodes.length > 0) {
        setClipboard({ items: nodes, operation: 'copy' });
      }
    } catch (error) {
      console.error('コピー処理でエラーが発生しました:', error);
      alert('コピー処理に失敗しました。');
    }
    setContextMenu(null);
  };

  const handleCut = (nodeIds: string[]) => {
    try {
      const nodes = nodeIds.map(id => findNodeById(id)).filter(Boolean) as FileSystemNode[];
      if (nodes.length > 0) {
        setClipboard({ items: nodes, operation: 'cut' });
      }
    } catch (error) {
      console.error('切り取り処理でエラーが発生しました:', error);
      alert('切り取り処理に失敗しました。');
    }
    setContextMenu(null);
  };

  const handlePaste = () => {
    if (!clipboard) return;
    
    try {
      const currentFolder = getCurrentFolder();
      const targetPath = selectedPath.length > 0 ? `/${selectedPath.join('/')}` : '';
      const parentNodes = currentFolder?.children || fileSystem;
      
      clipboard.items.forEach(item => {
        const uniqueName = generateUniqueName(item.name, parentNodes);
        
        const newItem: FileSystemNode = {
          ...item,
          id: `${item.type}-${Date.now()}-${Math.random()}`,
          name: uniqueName,
          parentId: currentFolder?.id || null,
          path: `${targetPath}/${uniqueName}`,
          created: clipboard.operation === 'copy' ? new Date().toISOString() : item.created,
          modifiedDate: new Date().toISOString()
        };
        
        const updateFileSystem = (nodes: FileSystemNode[]): FileSystemNode[] => {
          if (selectedPath.length === 0) {
            return [...nodes, newItem];
          }
          
          return nodes.map(node => {
            if (node.name === selectedPath[0] && node.type === 'folder') {
              if (selectedPath.length === 1) {
                return {
                  ...node,
                  children: [...(node.children || []), newItem]
                };
              } else if (node.children) {
                return {
                  ...node,
                  children: updateFileSystem(node.children)
                };
              }
            }
            return node;
          });
        };
        
        const updatedFileSystem = updateFileSystem(fileSystem);
      setFileSystem(updatedFileSystem);
      localStorage.setItem('unica-file-system', JSON.stringify(updatedFileSystem));
      });
      
      if (clipboard.operation === 'cut') {
        const nodeIds = clipboard.items.map(item => item.id);
        const deleteFromNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
          return nodes.filter(node => {
            if (nodeIds.includes(node.id)) return false;
            if (node.children) {
              node.children = deleteFromNodes(node.children);
            }
            return true;
          });
        };
        setFileSystem(deleteFromNodes(fileSystem));
        setClipboard(null);
      }
    } catch (error) {
      console.error('ペースト処理でエラーが発生しました:', error);
      alert('ペースト処理に失敗しました。');
    }
    
    setContextMenu(null);
  };

  const saveRename = () => {
    if (!editingNodeId || !editingName.trim()) return;

    const editingNode = findNodeById(editingNodeId);
    if (!editingNode) return;

    // 同じ階層での名前重複チェック
    const getParentNodes = (nodes: FileSystemNode[], targetId: string): FileSystemNode[] => {
      const findParent = (nodes: FileSystemNode[], id: string): FileSystemNode | null => {
        for (const node of nodes) {
          if (node.children?.some(child => child.id === id)) {
            return node;
          }
          if (node.children) {
            const found = findParent(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const parent = findParent(fileSystem, targetId);
      return parent?.children || fileSystem;
    };

    const parentNodes = getParentNodes(fileSystem, editingNodeId);
    const trimmedName = editingName.trim();
    
    // 現在の名前と同じ場合、または重複しない場合のみ更新
    if (trimmedName === editingNode.name || !checkNameDuplicate(trimmedName, parentNodes.filter(n => n.id !== editingNodeId))) {
      const updateNodeName = (nodes: FileSystemNode[]): FileSystemNode[] => {
        return nodes.map(node => {
          if (node.id === editingNodeId) {
            return { 
              ...node, 
              name: trimmedName,
              modifiedDate: new Date().toISOString()
            };
          }
          if (node.children) {
            node.children = updateNodeName(node.children);
          }
          return node;
        });
      };

      setFileSystem(updateNodeName(fileSystem));
    } else {
      // 重複の場合は元の名前に戻す
      setEditingName(editingNode.name);
      alert('同じ名前のファイル/フォルダが既に存在します。');
      return;
    }

    setEditingNodeId(null);
    setEditingName("");
    setIsCreatingFolder(false); // リネーム完了時にフラグリセット
  };

  // ドラッグ&ドロップ処理
  const handleDragStart = (e: React.DragEvent, node: FileSystemNode) => {
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDropTarget(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetNode?: FileSystemNode) => {
    e.preventDefault();
    
    if (!draggedNode || !targetNode || targetNode.id === draggedNode.id) {
      e.dataTransfer.dropEffect = 'none';
      setDropTarget(null);
      setDragOverPosition(null);
      return;
    }

    // 現状ではフォルダ内部への移動のみをサポート
    if (targetNode.type === 'folder') {
      setDragOverPosition('inside');
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(targetNode.id);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropTarget(null);
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNode?: FileSystemNode) => {
    e.preventDefault();
    
    if (!draggedNode || !targetNode || targetNode.id === draggedNode.id || !dragOverPosition) {
      setDraggedNode(null);
      setDropTarget(null);
      setDragOverPosition(null);
      return;
    }

    try {
      // フォルダ内部への移動の場合のみ
      if (dragOverPosition === 'inside' && targetNode.type === 'folder') {
        // 循環参照チェック：ドラッグ対象の子階層にターゲットが含まれていないか
        const isChildOfDragged = (draggedNode: FileSystemNode, targetId: string): boolean => {
          const checkRecursive = (node: FileSystemNode): boolean => {
            if (node.id === targetId) return true;
            if (node.children && node.children.length > 0) {
              return node.children.some(child => checkRecursive(child));
            }
            return false;
          };
          
          return checkRecursive(draggedNode);
        };

        if (isChildOfDragged(draggedNode, targetNode.id)) {
          alert('フォルダを自分の子フォルダに移動することはできません。');
          setDraggedNode(null);
          setDropTarget(null);
          setDragOverPosition(null);
          return;
        }

        // 既にターゲットフォルダの直接の子である場合はスキップ
        if (draggedNode.parentId === targetNode.id) {
          console.log('既に同じフォルダに存在します');
          setDraggedNode(null);
          setDropTarget(null);
          setDragOverPosition(null);
          return;
        }

        // より確実な処理：フラットな検索で対象を見つけて操作
        const findAndRemoveNode = (nodes: FileSystemNode[], targetId: string): {updatedNodes: FileSystemNode[], removedNode: FileSystemNode | null} => {
          let removedNode: FileSystemNode | null = null;
          
          const processNodes = (nodeList: FileSystemNode[]): FileSystemNode[] => {
            const result: FileSystemNode[] = [];
            
            for (const node of nodeList) {
              if (node.id === targetId) {
                removedNode = node;
                continue; // このノードは除外
              }
              
              if (node.children && node.children.length > 0) {
                const updatedChildren = processNodes(node.children);
                result.push({
                  ...node,
                  children: updatedChildren
                });
              } else {
                result.push(node);
              }
            }
            
            return result;
          };
          
          return {
            updatedNodes: processNodes(nodes),
            removedNode
          };
        };

        const addNodeToTarget = (nodes: FileSystemNode[], targetId: string, nodeToAdd: FileSystemNode): FileSystemNode[] => {
          return nodes.map(node => {
            if (node.id === targetId) {
              const updatedNodeToAdd = {
                ...nodeToAdd,
                parentId: targetId,
                path: `${node.path}/${nodeToAdd.name}`
              };
              return {
                ...node,
                children: [...(node.children || []), updatedNodeToAdd]
              };
            }
            
            if (node.children && node.children.length > 0) {
              return {
                ...node,
                children: addNodeToTarget(node.children, targetId, nodeToAdd)
              };
            }
            
            return node;
          });
        };

        // 実行
        const {updatedNodes, removedNode} = findAndRemoveNode(fileSystem, draggedNode.id);
        
        if (removedNode) {
          const finalFileSystem = addNodeToTarget(updatedNodes, targetNode.id, removedNode);
          setFileSystem(finalFileSystem);
        } else {
          console.error('ドラッグされたノードが見つかりませんでした');
          alert('移動処理に失敗しました。');
        }
      }
      // 現状では並び替えは無効化（バグが多いため）
      // else {
      //   // 同じ階層での並び替えは後で実装
      // }

    } catch (error) {
      console.error('ドロップ処理でエラーが発生しました:', error);
      alert('移動処理に失敗しました。');
    }

    setDraggedNode(null);
    setDropTarget(null);
    setDragOverPosition(null);
  };

  // ツリー表示
  const renderTreeNode = (node: FileSystemNode, depth = 0) => {
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
          onDragStart={(e) => handleDragStart(e, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, node)}
          onDrop={(e) => handleDrop(e, node)}
          onClick={(e) => handleNodeClick(node, e)}
          onDoubleClick={() => handleDoubleClick(node)}
          onContextMenu={(e) => {
            e.stopPropagation();
            handleRightClick(e, node.id);
          }}
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
                  setIsCreatingFolder(false); // Escapeキャンセル時もフラグリセット
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

  // カスタムテーブル用の操作関数
  // セル値更新関数
  const updateCellValue = (rowId: string, columnName: string, value: any) => {
    setEditingTableData(prevData => 
      prevData.map(row => 
        row.id === rowId 
          ? { ...row, data: { ...row.data, [columnName]: value } }
          : row
      )
    );
    // 自動保存
    setTimeout(() => saveTableData(), 100);
  };

  // 数式計算関数（簡易版）
  const calculateFormula = (formula: string, rowData: any): string => {
    try {
      // 基本的な数式をサポート
      let result = formula;
      
      // 数値の合計（例: SUM(A,B,C)）
      if (formula.startsWith('SUM(') && formula.endsWith(')')) {
        const fields = formula.slice(4, -1).split(',').map(f => f.trim());
        const sum = fields.reduce((acc, field) => {
          const value = Number(rowData[field]) || 0;
          return acc + value;
        }, 0);
        return sum.toString();
      }
      
      // 平均（例: AVERAGE(A,B,C)）
      if (formula.startsWith('AVERAGE(') && formula.endsWith(')')) {
        const fields = formula.slice(8, -1).split(',').map(f => f.trim());
        const sum = fields.reduce((acc, field) => {
          const value = Number(rowData[field]) || 0;
          return acc + value;
        }, 0);
        return (sum / fields.length).toString();
      }
      
      // 文字列結合（例: CONCAT(A,B)）
      if (formula.startsWith('CONCAT(') && formula.endsWith(')')) {
        const fields = formula.slice(7, -1).split(',').map(f => f.trim());
        return fields.map(field => rowData[field] || '').join('');
      }
      
      return formula;
    } catch (error) {
      return '#ERROR';
    }
  };

  const addNewRow = () => {
    if (!editingTable || !editingTable.tableColumns) return;
    
    const newRow: TableRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      data: {}
    };
    
    // 各列のデフォルト値を設定
    editingTable.tableColumns.forEach(column => {
      switch (column.type) {
        case 'number':
          newRow.data[column.name] = 0;
          break;
        case 'checkbox':
          newRow.data[column.name] = false;
          break;
        case 'select':
        case 'status':
          newRow.data[column.name] = column.options?.[0] || '';
          break;
        default:
          newRow.data[column.name] = '';
      }
    });
    
    setEditingTableData([...editingTableData, newRow]);
    setEditingCell({rowId: newRow.id, columnName: editingTable.tableColumns![0].name});
    
    // 新しい行のデータで初期化
    const initialData: { [key: string]: any } = {};
    editingTable.tableColumns.forEach(column => {
      initialData[column.name] = column.type === 'number' ? 0 : '';
    });
    setNewRowData(initialData);
  };

  const saveTableData = () => {
    if (!editingTable) return;

    const updateFileSystem = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === editingTable.id) {
          return {
            ...node,
            tableData: editingTableData,
            tableColumns: editingTable.tableColumns,
            modifiedDate: new Date().toISOString()
          };
        }
        if (node.children) {
          return {
            ...node,
            children: updateFileSystem(node.children)
          };
        }
        return node;
      });
    };

    const updatedFileSystem = updateFileSystem(fileSystem);
    setFileSystem(updatedFileSystem);
    
    // データをローカルストレージに保存
    try {
      localStorage.setItem('unica-file-system', JSON.stringify(updatedFileSystem));
      console.log('✅ データが保存されました');
    } catch (error) {
      console.error('❌ データ保存エラー:', error);
    }
  };

  const deleteRow = (rowId: string) => {
    if (confirm('この行を削除してもよろしいですか？')) {
      setEditingTableData(editingTableData.filter(row => row.id !== rowId));
    }
  };

  const duplicateRow = (rowId: string) => {
    const originalRow = editingTableData.find(r => r.id === rowId);
    if (originalRow) {
      const newRow = {
        ...originalRow,
        id: `row-${Date.now()}-${Math.random()}`,
        data: {...originalRow.data}
      };
      const rowIndex = editingTableData.findIndex(r => r.id === rowId);
      const newData = [...editingTableData];
      newData.splice(rowIndex + 1, 0, newRow);
      setEditingTableData(newData);
      saveTableData();
    }
  };

  const updateRowData = (rowId: string, columnName: string, value: any) => {
    const updatedData = editingTableData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          data: {
            ...row.data,
            [columnName]: value
          }
        };
      }
      return row;
    });
    setEditingTableData(updatedData);
  };

  const addColumn = () => {
    if (!editingTable || !newColumnName.trim()) {
      alert('カラム名を入力してください。');
      return;
    }

    const existingColumns = editingTable.tableColumns || [];
    if (existingColumns.some(col => col.name === newColumnName.trim())) {
      alert('同じ名前のカラムが既に存在します。');
      return;
    }

    const newColumn: TableColumn = {
      name: newColumnName.trim(),
      type: newColumnType,
      options: (newColumnType === 'select' || newColumnType === 'status' || newColumnType === 'multi-select') ? 
        (newColumnOptions.length > 0 ? newColumnOptions : 
         newColumnType === 'status' ? ['待機中', '進行中', '完了', '保留'] : 
         ['選択肢1', '選択肢2', '選択肢3']) : undefined,
      formula: newColumnType === 'formula' ? newColumnFormula.trim() : undefined,
      maxRating: newColumnType === 'rating' ? newColumnMaxRating : undefined
    };

    const updatedTable = {
      ...editingTable,
      tableColumns: [...existingColumns, newColumn]
    };

    setEditingTable(updatedTable);

    // 既存のデータに新しいカラムのデフォルト値を追加
    const getDefaultValue = (type: string) => {
      switch (type) {
        case 'number': return 0;
        case 'checkbox': return false;
        case 'select': case 'status': return newColumn.options?.[0] || '';
        case 'multi-select': return [];
        case 'rating': return 0;
        case 'date': return new Date().toISOString().split('T')[0];
        case 'date-range': return { start: '', end: '' };
        case 'file': return null;
        case 'formula': return '';
        case 'url': return '';
        default: return '';
      }
    };
    
    const defaultValue = getDefaultValue(newColumnType);
    const updatedData = editingTableData.map(row => ({
      ...row,
      data: {
        ...row.data,
        [newColumn.name]: defaultValue
      }
    }));
    setEditingTableData(updatedData);

    setNewColumnName("");
    setNewColumnType('text');
    setNewColumnOptions([]);
    setNewColumnFormula("");
    setShowColumnEditor(false);
  };

  const removeColumn = (columnName: string) => {
    if (!editingTable || !editingTable.tableColumns) return;

    if (confirm(`カラム「${columnName}」を削除してもよろしいですか？データも削除されます。`)) {
      const updatedColumns = editingTable.tableColumns.filter(col => col.name !== columnName);
      
      const updatedTable = {
        ...editingTable,
        tableColumns: updatedColumns
      };
      
      setEditingTable(updatedTable);

      // データからも該当するカラムを削除
      const updatedData = editingTableData.map(row => {
        const { [columnName]: removed, ...remainingData } = row.data;
        return {
          ...row,
          data: remainingData
        };
      });
      setEditingTableData(updatedData);
    }
  };

  // 計算式評価関数
  const evaluateFormula = (formula: string, rowData: { [key: string]: any }, allData: TableRow[]): any => {
    try {
      // IF(条件, 真値, 偽値) - 条件分岐
      const ifMatch = formula.match(/IF\(([^,]+),([^,]+),([^)]+)\)/i);
      if (ifMatch) {
        const [, condition, trueValue, falseValue] = ifMatch;
        // 条件評価（簡易版：列名と値の比較）
        const conditionMatch = condition.match(/(.+?)\s*([><=!]+)\s*(.+)/);
        if (conditionMatch) {
          const [, leftSide, operator, rightSide] = conditionMatch;
          const leftValue = rowData[leftSide.trim()] || leftSide.trim();
          const rightValue = rowData[rightSide.trim()] || rightSide.trim();
          
          let result = false;
          switch (operator) {
            case '>': result = leftValue > rightValue; break;
            case '<': result = leftValue < rightValue; break;
            case '>=': result = leftValue >= rightValue; break;
            case '<=': result = leftValue <= rightValue; break;
            case '==': case '=': result = leftValue == rightValue; break;
            case '!=': result = leftValue != rightValue; break;
          }
          
          const returnValue = result ? trueValue.trim() : falseValue.trim();
          // 返り値が数値か文字列かを判定
          const numValue = parseFloat(returnValue);
          return isNaN(numValue) ? returnValue.replace(/^["']|["']$/g, '') : numValue;
        }
      }

      // TODAY() - 今日の日付
      if (formula.includes('TODAY()')) {
        const today = new Date().toISOString().split('T')[0];
        formula = formula.replace(/TODAY\(\)/g, `"${today}"`);
      }

      // DATEDIFF(日付1, 日付2) - 日数差
      const dateDiffMatch = formula.match(/DATEDIFF\(([^,]+),([^)]+)\)/i);
      if (dateDiffMatch) {
        const [, date1Field, date2Field] = dateDiffMatch;
        const date1 = rowData[date1Field.trim()] || date1Field.trim().replace(/^["']|["']$/g, '');
        const date2 = rowData[date2Field.trim()] || date2Field.trim().replace(/^["']|["']$/g, '');
        
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          const diffTime = Math.abs(d2.getTime() - d1.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
        }
        return 0;
      }

      // CONCAT(文字列1, 文字列2, ...) - 文字列結合
      const concatMatch = formula.match(/CONCAT\(([^)]+)\)/i);
      if (concatMatch) {
        const parts = concatMatch[1].split(',').map(part => {
          const trimmed = part.trim();
          const columnValue = rowData[trimmed];
          if (columnValue !== undefined) return columnValue;
          return trimmed.replace(/^["']|["']$/g, '');
        });
        return parts.join('');
      }

      // SUM(カラム名) - 全行の合計
      const sumMatch = formula.match(/SUM\(([^)]+)\)/i);
      if (sumMatch) {
        const columnName = sumMatch[1].trim();
        const sum = allData.reduce((total, row) => {
          const value = parseFloat(row.data[columnName]) || 0;
          return total + value;
        }, 0);
        return sum;
      }

      // AVG(カラム名) - 全行の平均
      const avgMatch = formula.match(/AVG\(([^)]+)\)/i);
      if (avgMatch) {
        const columnName = avgMatch[1].trim();
        const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }

      // COUNT(カラム名) - 空でない値の数
      const countMatch = formula.match(/COUNT\(([^)]+)\)/i);
      if (countMatch) {
        const columnName = countMatch[1].trim();
        return allData.filter(row => row.data[columnName] !== null && row.data[columnName] !== undefined && row.data[columnName] !== '').length;
      }

      // MAX(カラム名) - 最大値
      const maxMatch = formula.match(/MAX\(([^)]+)\)/i);
      if (maxMatch) {
        const columnName = maxMatch[1].trim();
        const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
        return values.length > 0 ? Math.max(...values) : 0;
      }

      // MIN(カラム名) - 最小値
      const minMatch = formula.match(/MIN\(([^)]+)\)/i);
      if (minMatch) {
        const columnName = minMatch[1].trim();
        const values = allData.map(row => parseFloat(row.data[columnName]) || 0).filter(v => !isNaN(v));
        return values.length > 0 ? Math.min(...values) : 0;
      }

      // 単純な数値計算 (カラム名での参照対応)
      let processedFormula = formula;
      if (editingTable?.tableColumns) {
        editingTable.tableColumns.forEach(col => {
          if (col.type === 'number') {
            const regex = new RegExp(`\\b${col.name}\\b`, 'g');
            const value = rowData[col.name] || 0;
            processedFormula = processedFormula.replace(regex, value.toString());
          }
        });
      }

      // 安全な計算実行（限定的な数式のみ）
      if (/^[\d+\-*/().\s]+$/.test(processedFormula)) {
        return Function('"use strict"; return (' + processedFormula + ')')();
      }

      return '計算エラー';
    } catch (error) {
      return 'エラー';
    }
  };

  // カスタムテーブル用のフィルタリング・ソート関数
  const getFilteredAndSortedTableData = () => {
    if (!editingTable || !editingTable.tableColumns) return [];

    let filtered = editingTableData;

    // フィルタリング
    if (tableFilter.trim()) {
      filtered = editingTableData.filter(row => {
        return editingTable.tableColumns!.some(column => {
          const value = row.data[column.name];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(tableFilter.toLowerCase());
        });
      });
    }

    // ソート
    if (tableSortBy) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.data[tableSortBy];
        const bValue = b.data[tableSortBy];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // 数値比較
        const column = editingTable.tableColumns!.find(col => col.name === tableSortBy);
        if (column?.type === 'number') {
          const comparison = Number(aValue) - Number(bValue);
          return tableSortOrder === 'asc' ? comparison : -comparison;
        }

        // 文字列比較
        const comparison = String(aValue).localeCompare(String(bValue));
        return tableSortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  };

  // カスタムテーブル表示 (EnhancedNotionTable使用)
  const renderCustomTable = () => {
    if (!editingTable || !editingTable.tableColumns) return null;

    const filteredData = getFilteredAndSortedTableData();

    return (
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
        {/* ヘッダー - シンプルに */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{editingTable.name}</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {filteredData.length} レコード
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setEditingTable(null);
                setEditingTableData([]);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
          
          {/* 検索バー - データがある時だけ表示 */}
          {editingTableData.length > 5 && (
            <div className="relative mt-4 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="検索... (Ctrl+F)"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTableFilter('');
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* バルクアクションバー */}
        {selectedRows.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedRows.size}行を選択中
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  selectedRows.forEach(rowId => duplicateRow(rowId));
                  setSelectedRows(new Set());
                }}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <Copy className="w-4 h-4 inline mr-1" />
                複製
              </button>
              <button
                onClick={() => {
                  if (confirm(`${selectedRows.size}行を削除してもよろしいですか？`)) {
                    setEditingTableData(editingTableData.filter(row => !selectedRows.has(row.id)));
                    setSelectedRows(new Set());
                    saveTableData();
                  }
                }}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                削除
              </button>
              <button
                onClick={() => setSelectedRows(new Set())}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                選択解除
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {editingTableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Database className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">データがありません</h3>
              <p className="text-sm mb-6">新しい行を追加してデータベースを開始しましょう</p>
              <Button
                onClick={addNewRow}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                最初の行を追加
              </Button>
            </div>
          ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="w-8 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(new Set(filteredData.map(r => r.id)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                {editingTable.tableColumns.map(column => (
                  <th 
                    key={column.name} 
                    className="text-left py-3 pr-6 relative group"
                    style={{width: columnWidths[column.name] || 'auto'}}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setColumnContextMenu({x: e.clientX, y: e.clientY, columnName: column.name});
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        onClick={() => {
                          if (tableSortBy === column.name) {
                            setTableSortOrder(tableSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setTableSortBy(column.name);
                            setTableSortOrder('asc');
                          }
                        }}
                      >
                        {column.name}
                        {tableSortBy === column.name && (
                          tableSortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                        )}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            const filterValue = prompt(`${column.name}でフィルター:`);
                            if (filterValue !== null) {
                              setColumnFilters({...columnFilters, [column.name]: filterValue});
                            }
                          }}
                          title="フィルター"
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* カラムリサイズハンドル */}
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(column.name);
                      }}
                    />
                  </th>
                ))}
                <th className="text-left py-3 w-12">
                  <button
                    className="text-gray-400 hover:text-gray-600 text-sm"
                    onClick={() => setShowColumnEditor(true)}
                    title="カラムを追加"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(row => (
                <tr 
                  key={row.id} 
                  className={`group border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                    selectedRows.has(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      nodeId: row.id,
                      type: 'file'
                    });
                  }}>
                  <td className="w-8 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRows);
                        if (e.target.checked) {
                          newSelected.add(row.id);
                        } else {
                          newSelected.delete(row.id);
                        }
                        setSelectedRows(newSelected);
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  {editingTable.tableColumns!.map(column => (
                    <td 
                      key={column.name} 
                      className="py-3 pr-6"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setCellContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          rowId: row.id,
                          columnName: column.name
                        });
                      }}>
                      {editingCell?.rowId === row.id && editingCell?.columnName === column.name ? (
                        // 編集モード
                        column.type === 'select' || column.type === 'status' ? (
                          <Select
                            value={row.data[column.name] || ''}
                            onValueChange={(value) => {
                              updateRowData(row.id, column.name, value);
                              setEditingCell(null);
                              saveTableData();
                            }}
                          >
                            <SelectTrigger className="border-none p-0 h-auto bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {column.options?.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : column.type === 'multi-select' ? (
                          <div className="flex flex-wrap gap-1">
                            {column.options?.map(option => (
                              <button
                                key={option}
                                onClick={() => {
                                  const current = row.data[column.name] || [];
                                  const updated = current.includes(option) 
                                    ? current.filter((t: string) => t !== option)
                                    : [...current, option];
                                  updateRowData(row.id, column.name, updated);
                                  saveTableData();
                                }}
                                className={`px-2 py-1 text-xs rounded border ${
                                  (row.data[column.name] || []).includes(option)
                                    ? 'bg-blue-100 border-blue-300'
                                    : 'bg-gray-50 border-gray-300'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : column.type === 'date-range' ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="date"
                              value={row.data[column.name]?.start || ''}
                              onChange={(e) => {
                                updateRowData(row.id, column.name, {
                                  ...row.data[column.name],
                                  start: e.target.value
                                });
                              }}
                              className="border-b px-1 py-1 text-sm"
                            />
                            <span>〜</span>
                            <input
                              type="date"
                              value={row.data[column.name]?.end || ''}
                              onChange={(e) => {
                                updateRowData(row.id, column.name, {
                                  ...row.data[column.name],
                                  end: e.target.value
                                });
                              }}
                              onBlur={() => {
                                setEditingCell(null);
                                saveTableData();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  setEditingCell(null);
                                  saveTableData();
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="border-b px-1 py-1 text-sm"
                            />
                          </div>
                        ) : column.type === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(row.data[column.name])}
                            onChange={(e) => {
                              updateRowData(row.id, column.name, e.target.checked);
                              setEditingCell(null);
                              saveTableData();
                            }}
                            className="w-4 h-4"
                          />
                        ) : (
                          <Input
                            type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                            value={row.data[column.name] || ''}
                            onChange={(e) => {
                              const value = column.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                              updateRowData(row.id, column.name, value);
                            }}
                            onBlur={() => {
                              setEditingCell(null);
                              saveTableData();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                setEditingCell(null);
                                saveTableData();
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="border-none p-0 focus:ring-0 focus:border-none bg-transparent"
                            autoFocus
                          />
                        )
                      ) : (
                        // 表示モード
                        <div
                          className="min-h-[20px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                          onClick={() => setEditingCell({rowId: row.id, columnName: column.name})}
                        >
                          {column.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(row.data[column.name])}
                              onChange={(e) => {
                                updateRowData(row.id, column.name, e.target.checked);
                                saveTableData();
                              }}
                              className="w-4 h-4 pointer-events-auto"
                            />
                          ) : column.type === 'status' ? (
                            <Badge 
                              variant={row.data[column.name] === '完了' ? 'default' : 
                                     row.data[column.name] === '進行中' ? 'secondary' : 'outline'}
                              className={
                                row.data[column.name] === '完了' ? 'bg-green-100 text-green-800 border-green-300' :
                                row.data[column.name] === '進行中' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                row.data[column.name] === '保留' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }
                            >
                              {row.data[column.name] || '未設定'}
                            </Badge>
                          ) : column.type === 'formula' ? (
                            <span className="font-mono text-blue-600">
                              {column.formula ? evaluateFormula(column.formula, row.data, editingTableData) : '数式未設定'}
                            </span>
                          ) : column.type === 'url' ? (
                            row.data[column.name] ? (
                              <a 
                                href={row.data[column.name]} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {row.data[column.name].length > 30 
                                  ? `${row.data[column.name].substring(0, 30)}...` 
                                  : row.data[column.name]
                                }
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">URL未設定</span>
                            )
                          ) : column.type === 'rating' ? (
                            <div className="flex gap-0.5">
                              {Array.from({length: column.maxRating || 5}, (_, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateRowData(row.id, column.name, i + 1);
                                    saveTableData();
                                  }}
                                  className="text-lg hover:scale-110 transition-transform"
                                >
                                  {(row.data[column.name] || 0) > i ? 
                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" /> : 
                                    <Star className="w-5 h-5 text-gray-300" />
                                  }
                                </button>
                              ))}
                            </div>
                          ) : column.type === 'multi-select' ? (
                            <div className="flex flex-wrap gap-1">
                              {(row.data[column.name] || []).map((tag: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : column.type === 'date-range' ? (
                            <span className="text-sm">
                              {row.data[column.name]?.start || ''} 
                              {row.data[column.name]?.start && row.data[column.name]?.end && ' 〜 '}
                              {row.data[column.name]?.end || ''}
                            </span>
                          ) : column.type === 'file' ? (
                            <span className="text-sm text-gray-500">
                              {row.data[column.name] ? '📎 ファイル' : '未添付'}
                            </span>
                          ) : (
                            row.data[column.name] || (
                              <span className="text-gray-400 italic">空白</span>
                            )
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="py-3 w-12">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* 新規行追加（Notionスタイル） */}
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="w-8 py-3"></td>
                {editingTable.tableColumns!.map(column => (
                  <td key={column.name} className="py-3 pr-6">
                    <div
                      className="min-h-[20px] cursor-pointer text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
                      onClick={addNewRow}
                    >
                      {column === editingTable.tableColumns![0] ? '新しい行を追加...' : ''}
                    </div>
                  </td>
                ))}
                <td className="py-3 w-12"></td>
              </tr>
            </tbody>
          </table>
          )}
        </div>
      </div>
    );
  };

  // 自然なテーブル表示 (Excel機能付き)
  const renderCustomTableNew = () => {
    if (!editingTable || !editingTable.tableColumns) return null;

    const filteredData = getFilteredAndSortedTableData();

    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-800">
        {/* フルスクリーンテーブル */}
        <div className="flex-1 overflow-auto">
          {editingTableData.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
              onClick={addNewRow}
            >
              <Database className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">空のテーブル</h3>
              <p className="text-sm">クリックして最初の行を追加</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                <tr className="border-b border-gray-200 dark:border-slate-600">
                  {editingTable.tableColumns.map(column => (
                    <th 
                      key={column.name} 
                      className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-slate-600 min-w-[120px] relative group"
                      style={{width: columnWidths[column.name] || 150}}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setUnifiedContextMenu({
                          x: e.clientX, 
                          y: e.clientY, 
                          type: 'column',
                          columnName: column.name
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {editingColumnName === column.name ? (
                          <Input
                            value={tempColumnName}
                            onChange={(e) => setTempColumnName(e.target.value)}
                            onBlur={() => {
                              if (tempColumnName.trim() && tempColumnName !== column.name) {
                                const updatedColumns = editingTable.tableColumns.map(col => 
                                  col.name === column.name 
                                    ? { ...col, name: tempColumnName.trim() }
                                    : col
                                );
                                setEditingTable({
                                  ...editingTable,
                                  tableColumns: updatedColumns
                                });
                                // データも更新
                                setEditingTableData(editingTableData.map(row => {
                                  const newData = { ...row.data };
                                  if (column.name in newData) {
                                    newData[tempColumnName.trim()] = newData[column.name];
                                    delete newData[column.name];
                                  }
                                  return { ...row, data: newData };
                                }));
                                saveTableData();
                              }
                              setEditingColumnName(null);
                              setTempColumnName("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                setEditingColumnName(null);
                                setTempColumnName("");
                              }
                            }}
                            className="h-6 text-sm font-medium"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => {
                              setEditingColumnName(column.name);
                              setTempColumnName(column.name);
                            }}
                            className="cursor-pointer"
                          >
                            {column.name}
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              if (tableSortBy === column.name) {
                                setTableSortOrder(tableSortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setTableSortBy(column.name);
                                setTableSortOrder('asc');
                              }
                            }}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600"
                          >
                            {tableSortBy === column.name && (
                              tableSortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      {/* リサイズハンドル */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-transparent hover:bg-blue-300 opacity-0 group-hover:opacity-50"
                        onMouseDown={(e) => startColumnResize(e, column.name)}
                      />
                    </th>
                  ))}
                  {/* 列追加ボタン */}
                  <th className="w-12 py-3 px-2 border-r border-gray-200 dark:border-slate-600">
                    <button
                      onClick={() => {
                        // 直接新しい列を追加
                        const columnCount = editingTable.tableColumns.length;
                        const newColumn: TableColumn = {
                          name: `列${columnCount + 1}`,
                          type: 'text'
                        };
                        setEditingTable({
                          ...editingTable,
                          tableColumns: [...editingTable.tableColumns, newColumn]
                        });
                        saveTableData();
                        // 即座に編集モードに入る
                        setTimeout(() => {
                          setEditingColumnName(newColumn.name);
                          setTempColumnName(newColumn.name);
                        }, 100);
                      }}
                      className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-slate-600 flex items-center justify-center text-gray-500"
                      title="列を追加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIndex) => {
                  return (
                    <tr 
                      key={row.id} 
                      className="border-b border-gray-100 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setUnifiedContextMenu({
                          x: e.clientX, 
                          y: e.clientY, 
                          type: 'row',
                          rowId: row.id,
                          rowIndex
                        });
                      }}
                    >
                      {editingTable.tableColumns.map(column => (
                        <td key={column.name} className="py-2 px-4 text-sm border-r border-gray-100 dark:border-slate-600">
                          {column.type === 'select' && (
                            <Select
                              value={row.data[column.name] || ''}
                              onValueChange={(value) => updateCellValue(row.id, column.name, value)}
                            >
                              <SelectTrigger className="w-full h-8 text-sm">
                                <SelectValue placeholder="選択..." />
                              </SelectTrigger>
                              <SelectContent>
                                {column.options?.map(option => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {column.type === 'multi-select' && (
                            <div className="flex flex-wrap gap-1">
                              {(row.data[column.name] || []).map((value: string) => (
                                <Badge key={value} variant="secondary" className="text-xs">
                                  {value}
                                  <button
                                    onClick={() => {
                                      const current = row.data[column.name] || [];
                                      const updated = current.filter((v: string) => v !== value);
                                      updateCellValue(row.id, column.name, updated);
                                    }}
                                    className="ml-1 text-gray-500 hover:text-gray-700"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  if (value) {
                                    const current = row.data[column.name] || [];
                                    const updated = current.includes(value)
                                      ? current.filter((v: string) => v !== value)
                                      : [...current, value];
                                    updateCellValue(row.id, column.name, updated);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-20 h-6 text-xs">
                                  <SelectValue placeholder="+" />
                                </SelectTrigger>
                                <SelectContent>
                                  {column.options?.map(option => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {column.type === 'checkbox' && (
                            <input
                              type="checkbox"
                              checked={row.data[column.name] || false}
                              onChange={(e) => updateCellValue(row.id, column.name, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          )}
                          {column.type === 'date' && (
                            <Input
                              type="date"
                              value={row.data[column.name] || ''}
                              onChange={(e) => updateCellValue(row.id, column.name, e.target.value)}
                              className="w-full h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                            />
                          )}
                          {(column.type === 'text' || column.type === 'number' || column.type === 'url' || column.type === 'formula') && (
                            <Input
                              type={column.type === 'number' ? 'number' : 'text'}
                              value={column.type === 'formula' ? 
                                calculateFormula(column.formula || '', row.data) : 
                                row.data[column.name] || ''
                              }
                              onChange={(e) => updateCellValue(row.id, column.name, e.target.value)}
                              disabled={column.type === 'formula'}
                              className={`w-full h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500 ${column.type === 'formula' ? 'bg-gray-50 dark:bg-slate-700' : ''}`}
                            />
                          )}
                        </td>
                      ))}
                      {/* 空のセル（列追加ボタンの下） */}
                      <td className="py-2 px-4 text-sm border-r border-gray-100 dark:border-slate-600"></td>
                    </tr>
                  );
                })}
                {/* 新しい行を追加するための行 */}
                <tr 
                  className="border-b border-gray-100 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                  onClick={addNewRow}
                >
                  {editingTable.tableColumns.map((column, index) => (
                    <td 
                      key={column.name} 
                      className="py-3 px-4 text-sm border-r border-gray-100 dark:border-slate-600 text-gray-400 dark:text-gray-500"
                    >
                      {index === 0 ? (
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span>新しい行を追加</span>
                        </div>
                      ) : (
                        ""
                      )}
                    </td>
                  ))}
                  {/* 空のセル（列追加ボタンの下） */}
                  <td className="py-3 px-4 text-sm border-r border-gray-100 dark:border-slate-600"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* 旧行の右クリックメニュー - 完全削除済み */}
      </div>
    );
  };

  // 列リサイズ機能
  const startColumnResize = (e: React.MouseEvent, columnName: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[columnName] || 150;
    setIsResizing({columnName, startX, startWidth});
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const diff = e.clientX - isResizing.startX;
        const newWidth = Math.max(80, isResizing.startWidth + diff);
        setColumnWidths(prev => ({
          ...prev,
          [isResizing.columnName]: newWidth
        }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 既存の工具テーブル表示
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
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">購入価格</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">現在価値</th>
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
              <td className="p-4 text-sm">¥{tool.purchasePrice.toLocaleString()}</td>
              <td className="p-4 text-sm font-medium">¥{tool.currentValue.toLocaleString()}</td>
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

  // リスト表示
  const renderFileList = () => {
    const items = getCurrentItems();

    return (
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">
                <button 
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortOrder('asc');
                    }
                  }}
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
                  onClick={() => {
                    if (sortBy === 'size') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('size');
                      setSortOrder('desc');
                    }
                  }}
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
                  onClick={() => {
                    if (sortBy === 'modified') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('modified');
                      setSortOrder('desc');
                    }
                  }}
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
              const isBeingCut = clipboard?.operation === 'cut' && clipboard.items.some(i => i.id === item.id);
              
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
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  onClick={(e) => handleNodeClick(item, e)}
                  onDoubleClick={() => handleDoubleClick(item)}
                  onContextMenu={(e) => handleRightClick(e, item.id)}
                >
                  <td className="p-4">
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                      {editingNodeId === item.id ? (
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
                              setIsCreatingFolder(false); // Escapeキャンセル時もフラグリセット
                            }
                          }}
                          className="text-sm bg-white dark:bg-slate-700 border rounded px-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm">{item.name}</span>
                      )}
                    </div>
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
                  <button 
                    onClick={() => {
                      console.log('🏠 Root button clicked');
                      navigateToPath([]);
                    }}
                    className="hover:text-gray-700 dark:hover:text-slate-300"
                  >
                    <Home className="w-3 h-3 inline mr-1" />
                    ルート
                  </button>
                  {selectedPath.map((path, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight className="w-3 h-3" />
                      <button 
                        onClick={() => navigateToPath(selectedPath.slice(0, idx + 1))}
                        className="hover:text-gray-700 dark:hover:text-slate-300"
                      >
                        {path}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedPath.length > 0 && (
                <Button variant="outline" size="sm" onClick={goUp}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ツールバー */}
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

            {selectedItems.size > 0 && (
              <div className="text-sm text-gray-600 dark:text-slate-400">
                {selectedItems.size}個選択中
              </div>
            )}

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
          {/* サイドバー */}
          <div 
            className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto"
            onContextMenu={(e) => {
              e.preventDefault();
              handleRightClick(e);
            }}
          >
            <div className="p-2 min-h-full">
              {fileSystem.map(node => renderTreeNode(node))}
              {/* サイドバー全体を埋めるための空のスペース */}
              <div className="h-full min-h-[200px]" />
            </div>
          </div>

          {/* コンテンツエリア */}
          <div 
            className={`flex-1 relative ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            onContextMenu={(e) => !showToolsTable && handleRightClick(e)}
            onDragEnter={(e) => {
              e.preventDefault();
              console.log('Drag enter detected');
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
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              console.log('Drop event fired', {
                filesLength: e.dataTransfer.files?.length,
                files: e.dataTransfer.files,
                showToolsTable
              });
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !showToolsTable) {
                console.log('Calling handleUpload with files:', e.dataTransfer.files);
                handleUpload(e.dataTransfer.files);
              }
            }}
          >
            {editingTable ? renderCustomTableNew() : showToolsTable ? renderToolsTable() : renderFileList()}
            
            {/* ドラッグオーバー時のオーバーレイ */}
            {isDragOver && !showToolsTable && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400 dark:border-blue-500">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">ファイルをドロップしてアップロード</p>
                  {isUploading && <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">アップロード中...</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* カラムヘッダー右クリックメニュー */}
        {unifiedContextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUnifiedContextMenu(null)}
            />
            <div
              className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[200px]"
              style={{ left: unifiedContextMenu.x, top: unifiedContextMenu.y }}
            >
              {/* 列の操作メニュー */}
              {unifiedContextMenu.type === 'column' && unifiedContextMenu.columnName && (
                <>
                  {/* 列タイプ選択サブメニュー */}
                  <div className="px-3 py-1.5">
                    <div className="text-xs text-gray-500 mb-1">列タイプを選択:</div>
                    <div className="grid grid-cols-2 gap-1">
                      {(['text', 'number', 'date', 'select', 'checkbox', 'multi-select', 'url', 'formula'] as TableColumn['type'][]).map(type => {
                        const currentColumn = editingTable?.tableColumns?.find(c => c.name === unifiedContextMenu.columnName);
                        const isActive = currentColumn?.type === type;
                        
                        return (
                          <button
                            key={type}
                            className={`px-2 py-1 text-xs rounded text-left hover:bg-gray-100 dark:hover:bg-slate-600 ${
                              isActive 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                            onClick={() => {
                              if (!isActive) {
                                const updatedColumns = editingTable.tableColumns.map(col => 
                                  col.name === unifiedContextMenu.columnName 
                                    ? { ...col, type }
                                    : col
                                );
                                setEditingTable({
                                  ...editingTable,
                                  tableColumns: updatedColumns
                                });
                                saveTableData();
                              }
                              setUnifiedContextMenu(null);
                            }}
                          >
                            {type}
                            {isActive && ' ✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // インライン編集モードに入る
                      setEditingColumnName(unifiedContextMenu.columnName);
                      setTempColumnName(unifiedContextMenu.columnName);
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    列名を変更
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // カラムを複製
                      const column = editingTable?.tableColumns?.find(c => c.name === unifiedContextMenu.columnName);
                      if (column) {
                        const newColumn: TableColumn = {
                          ...column,
                          name: `${column.name} (コピー)`
                        };
                        setEditingTable({
                          ...editingTable,
                          tableColumns: [...editingTable.tableColumns, newColumn]
                        });
                        saveTableData();
                      }
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    列を複製
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center text-red-600"
                    onClick={() => {
                      if (confirm('この列を削除してもよろしいですか？')) {
                        const updatedColumns = editingTable.tableColumns.filter(col => col.name !== unifiedContextMenu.columnName);
                        setEditingTable({
                          ...editingTable,
                          tableColumns: updatedColumns
                        });
                        // データからも削除
                        setEditingTableData(editingTableData.map(row => {
                          const newData = { ...row.data };
                          delete newData[unifiedContextMenu.columnName!];
                          return { ...row, data: newData };
                        }));
                        saveTableData();
                      }
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    列を削除
                  </button>
                </>
              )}

              {/* 行の操作メニュー */}
              {unifiedContextMenu.type === 'row' && unifiedContextMenu.rowId && (
                <>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // 上に行を挿入
                      const newRow: TableRow = {
                        id: crypto.randomUUID(),
                        data: {}
                      };
                      const newData = [...editingTableData];
                      newData.splice(unifiedContextMenu.rowIndex!, 0, newRow);
                      setEditingTableData(newData);
                      saveTableData();
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    上に行を挿入
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // 下に行を挿入
                      const newRow: TableRow = {
                        id: crypto.randomUUID(),
                        data: {}
                      };
                      const newData = [...editingTableData];
                      newData.splice(unifiedContextMenu.rowIndex! + 1, 0, newRow);
                      setEditingTableData(newData);
                      saveTableData();
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    下に行を挿入
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // 行を複製
                      const targetRow = editingTableData.find(r => r.id === unifiedContextMenu.rowId);
                      if (targetRow) {
                        const newRow: TableRow = {
                          id: crypto.randomUUID(),
                          data: { ...targetRow.data }
                        };
                        const newData = [...editingTableData];
                        newData.splice(unifiedContextMenu.rowIndex! + 1, 0, newRow);
                        setEditingTableData(newData);
                        saveTableData();
                      }
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    行を複製
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center text-red-600"
                    onClick={() => {
                      if (confirm('この行を削除してもよろしいですか？')) {
                        setEditingTableData(editingTableData.filter(row => row.id !== unifiedContextMenu.rowId));
                        saveTableData();
                      }
                      setUnifiedContextMenu(null);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    行を削除
                  </button>
                </>
              )}
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                onClick={() => {
                  // カラムを複製
                  const column = editingTable?.tableColumns?.find(c => c.name === unifiedContextMenu.columnName);
                  if (column) {
                    const newColumn: TableColumn = {
                      ...column,
                      name: `${column.name} (コピー)`
                    };
                    const updatedTable = {
                      ...editingTable!,
                      tableColumns: [...editingTable!.tableColumns!, newColumn]
                    };
                    setEditingTable(updatedTable);
                    saveTableData();
                  }
                  setUnifiedContextMenu(null);
                }}
              >
                <Copy className="w-3 h-3 mr-2" />
                カラムを複製
              </button>
              <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                onClick={() => {
                  if (tableSortBy === unifiedContextMenu.columnName) {
                    setTableSortOrder(tableSortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setTableSortBy(unifiedContextMenu.columnName!);
                    setTableSortOrder('asc');
                  }
                  setUnifiedContextMenu(null);
                }}
              >
                <SortAsc className="w-3 h-3 mr-2" />
                {tableSortBy === unifiedContextMenu.columnName && tableSortOrder === 'asc' ? '降順で並び替え' : '昇順で並び替え'}
              </button>
              <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center text-red-600"
                onClick={() => {
                  removeColumn(unifiedContextMenu.columnName!);
                  setUnifiedContextMenu(null);
                }}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                カラムを削除
              </button>
            </div>
          </>
        )}

        {/* セル右クリックメニュー */}
        {false && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setCellContextMenu(null)}
            />
            <div
              className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[160px]"
              style={{ left: cellContextMenu.x, top: cellContextMenu.y }}
            >
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                onClick={() => {
                  const row = editingTableData.find(r => r.id === cellContextMenu.rowId);
                  const value = row?.data[cellContextMenu.columnName];
                  const column = editingTable?.tableColumns?.find(c => c.name === cellContextMenu.columnName);
                  setCopiedCell({ value, type: column?.type || 'text' });
                  setCellContextMenu(null);
                }}
              >
                <Copy className="w-3 h-3 mr-2" />
                コピー
              </button>
              {copiedCell && (
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                  onClick={() => {
                    updateRowData(cellContextMenu.rowId, cellContextMenu.columnName, copiedCell.value);
                    saveTableData();
                    setCellContextMenu(null);
                  }}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  貼り付け
                </button>
              )}
              <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                onClick={() => {
                  updateRowData(cellContextMenu.rowId, cellContextMenu.columnName, '');
                  saveTableData();
                  setCellContextMenu(null);
                }}
              >
                <FileX className="w-3 h-3 mr-2" />
                クリア
              </button>
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                onClick={() => {
                  setEditingCell({ rowId: cellContextMenu.rowId, columnName: cellContextMenu.columnName });
                  setCellContextMenu(null);
                }}
              >
                <Edit className="w-3 h-3 mr-2" />
                編集
              </button>
            </div>
          </>
        )}

        {/* 行右クリックメニュー */}
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
            />
            <div
              className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.type === 'file' && contextMenu.nodeId && editingTable && (
                <>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      duplicateRow(contextMenu.nodeId!);
                      setContextMenu(null);
                    }}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    行を複製
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // 行を上に挿入
                      const rowIndex = editingTableData.findIndex(r => r.id === contextMenu.nodeId);
                      const newRow = {
                        id: `row-${Date.now()}-${Math.random()}`,
                        data: {}
                      };
                      const newData = [...editingTableData];
                      newData.splice(rowIndex, 0, newRow);
                      setEditingTableData(newData);
                      saveTableData();
                      setContextMenu(null);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    上に行を挿入
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      // 行を下に挿入
                      const rowIndex = editingTableData.findIndex(r => r.id === contextMenu.nodeId);
                      const newRow = {
                        id: `row-${Date.now()}-${Math.random()}`,
                        data: {}
                      };
                      const newData = [...editingTableData];
                      newData.splice(rowIndex + 1, 0, newRow);
                      setEditingTableData(newData);
                      saveTableData();
                      setContextMenu(null);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    下に行を挿入
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center text-red-600"
                    onClick={() => {
                      deleteRow(contextMenu.nodeId!);
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    行を削除
                  </button>
                </>
              )}
              {contextMenu.type === 'background' && (
                <>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      console.log('🖱️ Background menu clicked');
                      handleCreateFolder();
                      setContextMenu(null);
                      console.log('📋 Context menu closed');
                    }}
                  >
                    <FolderPlus className="w-3 h-3 mr-2" />
                    新規フォルダ
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      console.log('🗃️ New database menu clicked');
                      setShowTableCreator(true);
                      setContextMenu(null);
                    }}
                  >
                    <Database className="w-3 h-3 mr-2" />
                    新規データベース
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
                  {clipboard && (
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                      onClick={handlePaste}
                    >
                      <FileX className="w-3 h-3 mr-2" />
                      貼り付け ({clipboard.items.length}個)
                    </button>
                  )}
                </>
              )}
              
              {contextMenu.nodeId && (
                <>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => {
                      const node = findNodeById(contextMenu.nodeId!);
                      if (node) handleFileOpen(node);
                      setContextMenu(null);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-2" />
                    開く
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                  
                  {contextMenu.type === 'folder' && (
                    <>
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                        onClick={() => {
                          handleCreateFolder(contextMenu.nodeId!);
                          setContextMenu(null);
                        }}
                      >
                        <FolderPlus className="w-3 h-3 mr-2" />
                        新規フォルダ
                      </button>
                      <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                    </>
                  )}
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => handleCopy(Array.from(selectedItems))}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    コピー
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => handleCut(Array.from(selectedItems))}
                  >
                    <Scissors className="w-3 h-3 mr-2" />
                    切り取り
                  </button>
                  {clipboard && (
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                      onClick={handlePaste}
                    >
                      <FileX className="w-3 h-3 mr-2" />
                      貼り付け
                    </button>
                  )}
                  <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => handleRename(contextMenu.nodeId!)}
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    名前を変更
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                    onClick={() => handleDelete(Array.from(selectedItems))}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    削除
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* テーブル作成モーダル */}
        {showTableCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 max-w-md">
              <h3 className="text-lg font-semibold mb-4">新規データベース作成</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">テーブル名</label>
                <Input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="例：在庫管理"
                  className="w-full"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">列の設定</label>
                <div className="space-y-2">
                  {newTableColumns.map((column, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="text"
                        value={column.name}
                        onChange={(e) => {
                          const updated = [...newTableColumns];
                          updated[index].name = e.target.value;
                          setNewTableColumns(updated);
                        }}
                        placeholder="列名"
                        className="flex-1"
                      />
                      <Select
                        value={column.type}
                        onValueChange={(value: 'text' | 'number' | 'date') => {
                          const updated = [...newTableColumns];
                          updated[index].type = value;
                          setNewTableColumns(updated);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">テキスト</SelectItem>
                          <SelectItem value="number">数値</SelectItem>
                          <SelectItem value="date">日付</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = newTableColumns.filter((_, i) => i !== index);
                          setNewTableColumns(updated);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewTableColumns([...newTableColumns, { name: "", type: "text" }]);
                    }}
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    列を追加
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTableCreator(false);
                    setNewTableName("");
                    setNewTableColumns([
                      { name: "名前", type: "text" },
                      { name: "種類", type: "text" },
                      { name: "数量", type: "number" }
                    ]);
                  }}
                >
                  キャンセル
                </Button>
                <Button onClick={handleCreateDatabase}>
                  作成
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* カラム編集モーダル */}
        {showColumnEditor && editingTable && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-96 max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">カラムを管理</h3>
                <button
                  onClick={() => {
                    setShowColumnEditor(false);
                    setNewColumnName("");
                    setNewColumnType('text');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="新しいカラム名..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newColumnName.trim()) {
                        addColumn();
                      }
                    }}
                  />
                  <Select
                    value={newColumnType}
                    onValueChange={(value: any) => setNewColumnType(value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">文字</SelectItem>
                      <SelectItem value="number">数値</SelectItem>
                      <SelectItem value="date">日付</SelectItem>
                      <SelectItem value="select">選択肢</SelectItem>
                      <SelectItem value="checkbox">チェックボックス</SelectItem>
                      <SelectItem value="status">ステータス</SelectItem>
                      <SelectItem value="formula">計算式</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="rating">評価</SelectItem>
                      <SelectItem value="multi-select">複数選択</SelectItem>
                      <SelectItem value="date-range">日付範囲</SelectItem>
                      <SelectItem value="file">ファイル</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* 計算式入力（計算式タイプの場合） */}
                {newColumnType === 'formula' && (
                  <div className="mb-3">
                    <Input
                      type="text"
                      value={newColumnFormula}
                      onChange={(e) => setNewColumnFormula(e.target.value)}
                      placeholder="例：SUM(数量), IF(価格>1000, '高額', '通常'), DATEDIFF(終了日, 開始日)"
                      className="w-full text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      使用可能: SUM, AVG, COUNT, MAX, MIN, IF(条件,真,偽), TODAY(), DATEDIFF(日付1,日付2), CONCAT(文字列...), 基本演算(+,-,*,/)
                    </p>
                  </div>
                )}
                
                {/* 選択肢入力（select, status, multi-selectタイプの場合） */}
                {(newColumnType === 'select' || newColumnType === 'status' || newColumnType === 'multi-select') && (
                  <div className="mb-3">
                    <Input
                      type="text"
                      placeholder="選択肢をカンマ区切りで入力（例: 低,中,高）"
                      onChange={(e) => setNewColumnOptions(e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt))}
                      className="w-full text-sm"
                    />
                  </div>
                )}
                
                {/* 評価の最大値設定（ratingタイプの場合） */}
                {newColumnType === 'rating' && (
                  <div className="mb-3">
                    <label className="text-xs text-gray-500">最大評価値</label>
                    <Input
                      type="number"
                      value={newColumnMaxRating}
                      onChange={(e) => setNewColumnMaxRating(parseInt(e.target.value) || 5)}
                      min="1"
                      max="10"
                      className="w-full text-sm"
                    />
                  </div>
                )}
                
                <Button 
                  onClick={addColumn} 
                  disabled={!newColumnName.trim() || (newColumnType === 'formula' && !newColumnFormula.trim())}
                  className="w-full"
                  variant="outline"
                >
                  カラムを追加
                </Button>
              </div>

              {editingTable.tableColumns && editingTable.tableColumns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">既存のカラム</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editingTable.tableColumns.map(column => (
                      <div key={column.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                        <div>
                          <span className="font-medium">{column.name}</span>
                          <span className="text-xs ml-2 text-gray-500">
                            ({column.type === 'text' ? '文字' : column.type === 'number' ? '数値' : '日付'})
                          </span>
                        </div>
                        <button
                          onClick={() => removeColumn(column.name)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ファイルプレビューモーダル */}
      {filePreview.show && filePreview.file && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
              <h3 className="text-lg font-semibold">{filePreview.file.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilePreview({ show: false, file: null })}
              >
                ✕
              </Button>
            </div>

            {/* コンテンツ */}
            <div className="p-4 overflow-auto max-h-[70vh]">
              {filePreview.file.pdfData ? (
                // PDF表示
                <div>
                  {/* PDFページナビゲーション */}
                  <div className="flex items-center justify-between mb-4 bg-gray-100 dark:bg-slate-700 p-2 rounded">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPdfPage(Math.max(1, currentPdfPage - 1))}
                      disabled={currentPdfPage <= 1}
                    >
                      前のページ
                    </Button>
                    <span className="text-sm">
                      {currentPdfPage} / {pdfNumPages} ページ
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPdfPage(Math.min(pdfNumPages, currentPdfPage + 1))}
                      disabled={currentPdfPage >= pdfNumPages}
                    >
                      次のページ
                    </Button>
                  </div>

                  {/* PDF表示 */}
                  <div className="text-center">
                    <Document
                      file={filePreview.file.pdfData.dataUrl}
                      onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                      loading={<div>PDFを読み込み中...</div>}
                      error={<div>PDFの読み込みに失敗しました</div>}
                    >
                      <Page
                        pageNumber={currentPdfPage}
                        width={600}
                        loading={<div>ページを読み込み中...</div>}
                        error={<div>ページの読み込みに失敗しました</div>}
                      />
                    </Document>
                  </div>
                </div>
              ) : filePreview.file.excelData ? (
                // Excel表示（強化版）
                <div>
                  {/* シートタブとメタデータ */}
                  <div className="mb-4">
                    {filePreview.file.excelData.sheetNames.length > 1 && (
                      <div className="flex gap-2 mb-2 border-b">
                        {filePreview.file.excelData.sheetNames.map(sheetName => (
                          <button
                            key={sheetName}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              activeExcelSheet === sheetName
                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveExcelSheet(sheetName)}
                          >
                            {sheetName}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* メタデータ表示 */}
                    {filePreview.file.excelData.metadata && (
                      <div className="text-xs text-gray-500 mb-2">
                        {filePreview.file.excelData.metadata.creator && (
                          <span className="mr-4">作成者: {filePreview.file.excelData.metadata.creator}</span>
                        )}
                        {filePreview.file.excelData.metadata.created && (
                          <span>作成日: {new Date(filePreview.file.excelData.metadata.created).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* シンプルで実用的なExcelテーブル */}
                  {activeExcelSheet && filePreview.file.excelData.sheets[activeExcelSheet] && (
                    <div className="w-full">
                      {/* スクロール可能なテーブルコンテナ */}
                      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                        <div className="text-xs text-gray-500 p-2 border-b bg-gray-50">
                          Excel表示 (最初の500行まで表示) - 横縦スクロール可能
                        </div>
                        <div className="overflow-auto max-h-[500px] max-w-full">
                          <table className="border-collapse text-sm" style={{minWidth: 'max-content'}}>
                            {/* 列ヘッダー */}
                            <thead className="sticky top-0 bg-gray-100 z-10">
                              <tr>
                                <th className="border border-gray-400 bg-gray-200 p-1 text-center font-bold text-gray-700 w-12 min-w-[48px]">
                                  #
                                </th>
                                {filePreview.file.excelData.sheets[activeExcelSheet][0]?.map((_, colIndex) => (
                                  <th
                                    key={colIndex}
                                    className="border border-gray-400 bg-gray-100 p-1 text-center font-bold text-gray-700"
                                    style={{minWidth: '120px', maxWidth: '200px'}}
                                  >
                                    {XLSX.utils.encode_col(colIndex)}
                                  </th>
                                ))}
                            </tr>
                          </thead>

                          {/* データ行 */}
                          <tbody>
                            {filePreview.file.excelData.sheets[activeExcelSheet]
                              .slice(0, 500)
                              .map((row, rowIndex) => (
                              <tr
                                key={rowIndex}
                                className={`hover:bg-blue-50 ${
                                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } ${rowIndex === 0 ? 'bg-blue-100 font-semibold' : ''}`}
                              >
                                {/* 行番号 */}
                                <td className="border border-gray-400 bg-gray-100 p-1 text-center font-bold text-gray-700 w-12 min-w-[48px]">
                                  {rowIndex + 1}
                                </td>

                                {/* データセル */}
                                {Array.from({ length: Math.max(...filePreview.file.excelData.sheets[activeExcelSheet].map(r => r.length)) }, (_, colIndex) => {
                                  const cellData = row[colIndex];
                                  const isString = typeof cellData === 'string';
                                  const displayValue = isString ? cellData : (cellData?.value || '');

                                  return (
                                    <td
                                      key={colIndex}
                                      className="border border-gray-300 p-1 overflow-hidden"
                                      style={{minWidth: '120px', maxWidth: '200px'}}
                                      title={String(displayValue)}
                                    >
                                      <div className="truncate text-gray-900 text-xs">
                                        {String(displayValue)}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 表示件数情報 */}
                      <div className="mt-2 text-sm text-gray-600">
                        表示: {Math.min(500, filePreview.file.excelData.sheets[activeExcelSheet].length)}行 /
                        全{filePreview.file.excelData.sheets[activeExcelSheet].length}行
                        {filePreview.file.excelData.sheets[activeExcelSheet].length > 500 && (
                          <span className="ml-2 text-orange-600">
                            ※ 最初の500行のみ表示
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                filePreview.file.fileType &&
                ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(
                  filePreview.file.fileType.toLowerCase()
                ) && filePreview.file.dataUrl
              ) ? (
                {/* 画像表示 */}
                <div className="text-center">
                  <img
                    src={filePreview.file.dataUrl}
                    alt={filePreview.file.name}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              ) : filePreview.file.content ? (
                {/* テキスト表示 */}
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-slate-700 p-4 rounded">
                  {filePreview.file.content}
                </pre>
              ) : filePreview.file.dataUrl ? (
                {/* その他のファイル（PDF等） */}
                <div className="text-center">
                  <p className="mb-4">このファイルタイプのプレビューはサポートされていません。</p>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = filePreview.file.dataUrl!;
                      link.download = filePreview.file.name;
                      link.click();
                    }}
                  >
                    ダウンロード
                  </Button>
                </div>
              ) : (
                <p>ファイルの内容が読み込めませんでした。</p>
              )}
            </div>

            {/* フッター */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-4">
                <div>
                  <p>📄 サイズ: {formatFileSize(filePreview.file.size)}</p>
                  <p>📅 更新日: {formatDate(filePreview.file.modifiedDate)}</p>
                  <p>👤 更新者: {filePreview.file.modifiedBy}</p>
                </div>
                <div>
                  {filePreview.file.excelData && (
                    <>
                      <p>📊 シート数: {filePreview.file.excelData.sheetNames.length}個</p>
                      {activeExcelSheet && (
                        <p>📈 行数: {filePreview.file.excelData.sheets[activeExcelSheet]?.length || 0}行</p>
                      )}
                    </>
                  )}
                  {filePreview.file.pdfData && (
                    <p>📑 ページ数: {pdfNumPages}ページ</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = filePreview.file.dataUrl!;
                    link.download = filePreview.file.name;
                    link.click();
                  }}
                >
                  📥 ダウンロード
                </Button>
                {(filePreview.file.excelData || filePreview.file.pdfData) && (
                  <Badge variant="secondary" className="text-xs">
                    プレビュー対応
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default FileManagementSystem;