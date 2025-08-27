"use client";
import React from "react";
import {
  BarChart3,
  Calendar,
  Search,
  Filter,
  Settings,
  Map,
  ChevronLeft,
  ChevronRight,
  Navigation,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

import { Process } from "../../types";

interface GanttHeaderProps {
  viewType: "machine" | "person" | "project";
  onViewTypeChange: (type: "machine" | "person" | "project") => void;
  datesLength: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredProcessesLength: number;
  statusFilter: Process["status"] | "all";
  onStatusFilterChange: (status: Process["status"] | "all") => void;
  priorityFilter: Process["priority"] | "all";
  onPriorityFilterChange: (priority: Process["priority"] | "all") => void;
  showWeekends: boolean;
  onShowWeekendsChange: (show: boolean) => void;
  showMinimap: boolean;
  onShowMinimapChange: (show: boolean) => void;
  onNavigateDate: (direction: "prev" | "next" | "today", days?: number) => void;
  jumpDate: string;
  onJumpDateChange: (date: string) => void;
  onJumpToDate: () => void;
  onDateRangeChange: (range: { start: number; end: number }) => void;
  onFiltersReset: () => void;
  zoomLevel: number;
  onZoom: (zoomIn: boolean) => void;
}

export const GanttHeader: React.FC<GanttHeaderProps> = ({
  viewType,
  onViewTypeChange,
  datesLength,
  searchQuery,
  onSearchChange,
  filteredProcessesLength,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  showWeekends,
  onShowWeekendsChange,
  showMinimap,
  onShowMinimapChange,
  onNavigateDate,
  jumpDate,
  onJumpDateChange,
  onJumpToDate,
  onDateRangeChange,
  onFiltersReset,
  zoomLevel,
  onZoom,
}) => {
  return (
    <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-xl flex items-center gap-3 text-gray-800 dark:text-white">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {viewType === "machine"
              ? "機械別"
              : viewType === "person"
              ? "担当者別"
              : "案件別"}{" "}
            ガントチャート
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{datesLength}日間表示</span>
          </div>
          {searchQuery && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              "{searchQuery}" で検索中 ({filteredProcessesLength}件)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* 表示切り替え */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-1">
            <Button
              variant={viewType === "machine" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewTypeChange("machine")}
              className="px-3"
            >
              機械別
            </Button>
            <Button
              variant={viewType === "person" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewTypeChange("person")}
              className="px-3"
            >
              担当者別
            </Button>
            <Button
              variant={viewType === "project" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewTypeChange("project")}
              className="px-3"
            >
              案件別
            </Button>
          </div>

          {/* 検索とフィルタ */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="プロジェクト、管理番号で検索..."
                className="pl-9 w-64 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" /> フィルタ{" "}
                  {(statusFilter !== "all" || priorityFilter !== "all") && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 w-4 p-0 text-xs"
                    >
                      •
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>ステータス</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onStatusFilterChange("all")}>
                  すべて
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusFilterChange("planning")}
                >
                  計画
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusFilterChange("data-work")}
                >
                  データ作業
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusFilterChange("processing")}
                >
                  加工中
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusFilterChange("finishing")}
                >
                  仕上げ
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusFilterChange("completed")}
                >
                  完了
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusFilterChange("delayed")}
                >
                  遅延
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>優先度</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onPriorityFilterChange("all")}>
                  すべて
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onPriorityFilterChange("high")}
                >
                  高
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onPriorityFilterChange("medium")}
                >
                  中
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPriorityFilterChange("low")}>
                  低
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onFiltersReset}>
                  <RotateCcw className="w-4 h-4 mr-2" /> フィルタリセット
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* 表示オプション */}
          <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="flex items-center gap-2">
              <Switch
                checked={showWeekends}
                onCheckedChange={onShowWeekendsChange}
                id="weekends"
              />
              <label htmlFor="weekends" className="text-sm text-gray-600 dark:text-slate-400">
                週末表示
              </label>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Switch
                checked={showMinimap}
                onCheckedChange={onShowMinimapChange}
                id="minimap"
              />
              <label htmlFor="minimap" className="text-sm text-gray-600 dark:text-slate-400">
                ミニマップ
              </label>
            </div>
          </div>
          {/* ズームコントロール（一番右） */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onZoom(false)}
              className="px-2"
              title="ズームアウト"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onZoom(true)}
              className="px-2"
              title="ズームイン"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
