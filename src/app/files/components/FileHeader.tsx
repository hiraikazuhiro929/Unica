"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  HardDrive,
  Home,
  ArrowUp,
  ChevronRight,
  Search,
  Upload,
  Download,
  Plus,
  MoreVertical,
  Grid3x3,
  List,
  FolderPlus,
  RotateCcw,
  Share,
  Calendar,
  Filter,
} from "lucide-react";

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  path: string;
}

interface FileHeaderProps {
  selectedPath: string[];
  searchQuery: string;
  viewMode: "list" | "grid";
  showToolsTable: boolean;
  editingTable: FileSystemNode | null;
  currentItems: FileSystemNode[];
  onNavigateToPath: (path: string[]) => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: "list" | "grid") => void;
  onToggleToolsTable: () => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
}

const FileHeader: React.FC<FileHeaderProps> = ({
  selectedPath,
  searchQuery,
  viewMode,
  showToolsTable,
  editingTable,
  currentItems,
  onNavigateToPath,
  onSearchChange,
  onViewModeChange,
  onToggleToolsTable,
  onUpload,
  onCreateFolder,
  onRefresh,
}) => {
  // パンくずリスト生成
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ name: 'ルート', path: [] }];

    for (let i = 0; i < selectedPath.length; i++) {
      breadcrumbs.push({
        name: selectedPath[i],
        path: selectedPath.slice(0, i + 1)
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ファイル管理</h1>
              <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                <button
                  onClick={() => onNavigateToPath([])}
                  className="hover:text-gray-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <Home className="w-3 h-3" />
                  ルート
                </button>
                {selectedPath.length > 0 && (
                  <button
                    onClick={() => onNavigateToPath(selectedPath.slice(0, -1))}
                    className="hover:text-gray-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <ArrowUp className="w-3 h-3" />
                    上へ
                  </button>
                )}
                <span>総件数: {currentItems.length}件</span>
                {editingTable && (
                  <Badge variant="secondary" className="text-xs">
                    テーブル編集中: {editingTable.name}
                  </Badge>
                )}
                {showToolsTable && (
                  <Badge variant="outline" className="text-xs">
                    工具管理表示中
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* パンくずナビ */}
        <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-slate-400">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <button
                onClick={() => onNavigateToPath(crumb.path)}
                className="hover:text-gray-900 dark:hover:text-white px-1 py-0.5 rounded"
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-3 h-3 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ツールバー */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onUpload}>
              <Upload className="w-4 h-4 mr-1" />
              アップロード
            </Button>
            <Button size="sm" variant="outline" onClick={onCreateFolder}>
              <FolderPlus className="w-4 h-4 mr-1" />
              フォルダ
            </Button>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              ダウンロード
            </Button>
            <Button size="sm" variant="outline" onClick={onToggleToolsTable}>
              <Plus className="w-4 h-4 mr-1" />
              {showToolsTable ? '通常表示' : '工具管理'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="ファイルを検索..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <div className="flex items-center gap-1 border border-gray-200 dark:border-slate-600 rounded">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("list")}
                className="rounded-r-none"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("grid")}
                className="rounded-l-none"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileHeader;