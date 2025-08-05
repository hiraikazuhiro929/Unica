"use client";
// src/app/tasks/components/gantt/GanttBar.tsx
import React, { useState, useEffect } from "react";
import { Edit, Copy, Trash2, Eye } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Process } from "@/app/tasks/types";
import {
  getClientColor,
  calculateTotalHours,
} from "@/app/tasks/components/gantt/ganttUtils";

interface GanttBarProps {
  process: Process;
  resourceName: string;
  index: number;
  position: { width: number; left: number; top?: number };
  isSelected: boolean;
  isDragging: boolean;
  isOverdue: boolean;
  onBarClick: (process: Process, e: React.MouseEvent) => void;
  onProcessEdit: (process: Process) => void;
  onProcessDuplicate: (process: Process) => void;
  onProcessDelete: (processId: string) => void;
  onProcessClick: (process: Process) => void;
  onResize?: (process: Process, edge: "left" | "right", deltaX: number) => void;
  isResizing?: { process: Process; edge: "left" | "right" } | null;
  onResizeStart?: (
    value: { process: Process; edge: "left" | "right" } | null,
    mouseEvent?: MouseEvent
  ) => void;
  onResizeEnd?: () => void;
  pixelsPerDay?: number; // ズーム対応用
}

export const GanttBar: React.FC<GanttBarProps> = ({
  process,
  resourceName,
  index,
  position,
  isSelected,
  isDragging: propIsDragging,
  isOverdue,
  onBarClick,
  onProcessEdit,
  onProcessDuplicate,
  onProcessDelete,
  onProcessClick,
  onResize,
  isResizing,
  onResizeStart,
  onResizeEnd,
  pixelsPerDay = 40,
}) => {
  // @dnd-kit のドラッグ機能
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: process.id,
    });

  // リサイズ用のstate
  const [isHovered, setIsHovered] = useState(false);

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    edge: "left" | "right"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onResizeStart?.({ process, edge }, e.nativeEvent);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={setNodeRef}
              data-process-id={process.id}
              className={`absolute rounded-lg cursor-move group ${
                isSelected ? "ring-2 ring-blue-500 shadow-lg scale-105" : ""
              } ${isDragging ? "opacity-70 ring-2 ring-yellow-400" : ""} ${
                isResizing ? "ring-2 ring-purple-400 shadow-xl" : ""
              }`}
              {...(!isResizing ? listeners : {})}
              {...(!isResizing ? attributes : {})}
              style={{
                backgroundColor: getClientColor(process.orderClient),
                width: `${Math.max(position.width, 2)}%`,
                left: `${position.left}%`,
                top: position.top !== undefined ? `${position.top}px` : `50%`, // ← この行に変更
                height: "24px",
                zIndex: isSelected ? 15 : 10,
                transform:
                  transform && !isResizing
                    ? `translate3d(${transform.x}px, 0px, 0) translateY(-50%)`
                    : `translateY(-50%)`,
                transition: isDragging ? "none" : "all 0.15s ease-out",
              }}
              onClick={(e) => {
                if (!isDragging) {
                  onBarClick(process, e);
                }
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              role="button"
              tabIndex={0}
              aria-label={`プロセス: ${process.projectName} - 進捗: ${process.progress}%`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onBarClick(process, e as any);
                }
              }}
            >
              <div className="flex items-center h-full px-2 text-white relative">
                {/* コンテンツ */}
                <span className="text-xs font-semibold truncate flex-1 relative z-10">
                  {process.managementNumber}
                </span>

                {/* リサイズハンドル */}
                {onResize && (
                  <>
                    {/* 左のリサイズハンドル */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-4 ${
                        isHovered || isResizing ? "opacity-100" : "opacity-0"
                      } ${isResizing && isResizing.edge === "left" ? "bg-purple-400/40" : "bg-white/20"} hover:bg-white/40 cursor-ew-resize transition-opacity rounded-l-lg flex items-center justify-center`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResizeMouseDown(e, "left");
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        pointerEvents: isDragging ? "none" : "auto",
                      }}
                    >
                      <div className="w-0.5 h-3 bg-white rounded" />
                    </div>

                    {/* 右のリサイズハンドル */}
                    <div
                      className={`absolute right-0 top-0 bottom-0 w-4 ${
                        isHovered || isResizing ? "opacity-100" : "opacity-0"
                      } ${isResizing && isResizing.edge === "right" ? "bg-purple-400/40" : "bg-white/20"} hover:bg-white/40 cursor-ew-resize transition-opacity rounded-r-lg flex items-center justify-center`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleResizeMouseDown(e, "right");
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        pointerEvents: isDragging ? "none" : "auto",
                      }}
                    >
                      <div className="w-0.5 h-3 bg-white rounded" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-semibold">{process.projectName}</div>
              <div className="text-sm">
                管理番号: {process.managementNumber}
              </div>
              <div className="text-sm">受注先: {process.orderClient}</div>
              <div className="text-sm">進捗: {process.progress}%</div>
              <div className="text-sm">
                工数: {calculateTotalHours(process.workDetails)}H
              </div>
              <div className="text-sm">担当: {process.fieldPerson}</div>
              <div className="text-sm">
                期間:{" "}
                {new Date(process.processingPlanDate).toLocaleDateString(
                  "ja-JP"
                )}{" "}
                〜{" "}
                {new Date(
                  process.dueDate || process.shipmentDate
                ).toLocaleDateString("ja-JP")}
              </div>
              {process.remarks && (
                <div className="text-sm text-amber-600">
                  備考: {process.remarks}
                </div>
              )}
              {isOverdue && (
                <div className="text-sm text-red-600 font-bold">
                  ⚠️ 納期遅延
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <div>• バー全体をドラッグで移動</div>
                <div>• 端をドラッグで期間調整</div>
                <div>• クリックで詳細表示</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => onProcessClick(process)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          詳細を表示
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onProcessEdit(process)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          編集
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onProcessDuplicate(process)}
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          複製
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onProcessDelete(process.id)}
          className="gap-2 text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
          削除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
