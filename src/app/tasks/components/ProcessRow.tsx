import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  User,
  Settings,
  Clock,
  AlertCircle,
  Truck,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Process } from "@/app/tasks/types";
import { calculateTotalHours } from "@/app/tasks/constants";
import { StatusBadge } from "./cards/StatusBadge";

import { DatePickerField } from "./forms/DatePickerField";

interface ProcessRowProps {
  process: Process;
  companyId: string;
  onProcessClick: (process: Process) => void;
  onDateChange: (
    processId: string,
    key: keyof Process,
    date: Date | undefined
  ) => void;
  onDuplicate: (process: Process) => void;
  onDelete: (processId: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  onProgressChange: (processId: string, progress: number) => void;
}

export const ProcessRow: React.FC<ProcessRowProps> = ({
  process,
  companyId,
  onProcessClick,
  onDateChange,
  onDuplicate,
  onDelete,
  onReorder,
  onProgressChange,
}) => {
  const router = useRouter();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu]);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", process.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId !== process.id && onReorder) {
      onReorder(draggedId, process.id);
    }
  };

  const getBorderStyle = (priority: Process["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-6 border-red-500";
      case "medium":
        return "border-l-6 border-yellow-500";
      case "low":
        return "border-l-6 border-blue-500";
      default:
        return "border-l-4 border-gray-300";
    }
  };

  return (
    <>
      <div
        className={`bg-white/40 backdrop-blur-sm rounded-md hover:bg-white/60 transition-all shadow-sm ${getBorderStyle(
          process.priority
        )} relative overflow-hidden cursor-move ${
          isDragging ? "opacity-50" : ""
        }`}
        draggable="true"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuPosition({ x: e.clientX, y: e.clientY });
          setShowContextMenu(true);
        }}
      >
        <div
          className={`w-2 h-full rounded-l-md ${
            process.priority === "high"
              ? "bg-gradient-to-r from-red-400 to-red-600 shadow-lg"
              : process.priority === "medium"
              ? "bg-gradient-to-r from-yellow-400 to-orange-500 shadow-md"
              : "bg-gradient-to-r from-blue-400 to-blue-600 shadow-md"
          }`}
        />
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start md:items-center p-2 ml-2">
          {/* 管理番号・ライン */}
          <div
            className="min-w-0 cursor-pointer"
            onClick={() => onProcessClick(process)}
          >
            <div className="font-medium text-base text-gray-800 truncate">
              {process.managementNumber}
            </div>
            <div className="text-sm text-gray-600 truncate">
              └ {process.lineNumber}
            </div>
          </div>

          {/* プロジェクト名・備考 */}
          <div
            className="min-w-0 cursor-pointer"
            onClick={() => onProcessClick(process)}
          >
            <div className="font-medium text-base text-gray-900 truncate">
              {process.projectName}
            </div>
            {process.remarks && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600 truncate">
                <AlertCircle className="w-4 h-4 text-red-500" />
                {process.remarks}
              </div>
            )}
          </div>

          {/* 作業者・機械・数量 */}
          <div className="grid grid-cols-3 gap-2 text-base">
            <div className="flex items-center gap-1 truncate">
              <Package className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">{process.quantity}個</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">{process.fieldPerson}</span>
            </div>
            <div className="space-y-1">
              <div>
                <div className="flex gap-1">
                  <div className="flex flex-col justify-center pt-[2px]">
                    <Settings className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="space-y-0.5">
                    {process.assignedMachines.length > 0 ? (
                      process.assignedMachines.map((machine, index) => (
                        <div
                          key={index}
                          className="text-xs text-gray-700 truncate font-medium"
                        >
                          {machine}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">未割当</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 工数 */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-base font-bold text-gray-800">
                {calculateTotalHours(process.workDetails)}H
              </span>
            </div>
          </div>

          {/* ステータス + 進捗 */}
          <div className="flex items-center gap-3">
            <StatusBadge status={process.status} />
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 relative">
                <div className="w-full h-3 bg-gray-200 rounded-full">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      process.progress >= 80
                        ? "bg-green-500"
                        : process.progress >= 50
                        ? "bg-blue-500"
                        : "bg-yellow-500"
                    }`}
                    style={{ width: `${process.progress}%` }}
                  />
                </div>
                <Slider
                  value={[process.progress]}
                  onValueChange={(value) =>
                    onProgressChange(process.id, value[0])
                  }
                  max={100}
                  step={1}
                  className="absolute inset-0 [&_[role=slider]]:h-5 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-400 [&_[role=slider]]:shadow-md [&_[role=slider]]:rounded-sm"
                  style={
                    {
                      "--slider-track": "transparent",
                      "--slider-range": "transparent",
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="text-sm font-bold text-gray-700 w-12 text-right">
                {process.progress}%
              </span>
            </div>
          </div>

          {/* 日付（クリックイベント防止） */}
          <div
            className="grid grid-cols-2 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <DatePickerField
              date={process.arrivalDate}
              onDateChange={(date) =>
                onDateChange(process.id, "arrivalDate", date)
              }
              label="入荷"
              icon={<Truck className="w-3 h-3 text-blue-600" />}
              variant="compact"
            />
            <DatePickerField
              date={process.shipmentDate}
              onDateChange={(date) =>
                onDateChange(process.id, "shipmentDate", date)
              }
              label="出荷"
              icon={<Truck className="w-3 h-3 text-green-600" />}
              variant="compact"
            />
            <DatePickerField
              date={process.processingPlanDate}
              onDateChange={(date) =>
                onDateChange(process.id, "processingPlanDate", date)
              }
              label="開始"
              icon={<CalendarDays className="w-3 h-3 text-orange-600" />}
              variant="compact"
            />
            <DatePickerField
              date={process.dueDate || process.shipmentDate}
              onDateChange={(date) => onDateChange(process.id, "dueDate", date)}
              label="納期"
              icon={<CalendarDays className="w-3 h-3 text-red-600" />}
              variant="compact"
            />
          </div>
        </div>
      </div>

      {/* コンテキストメニュー */}
      {showContextMenu && (
        <div
          className="fixed bg-white border shadow-lg rounded-md py-1 z-50"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <button
            className="px-3 py-1 hover:bg-gray-100 w-full text-left text-sm"
            onClick={() => {
              onProcessClick(process);
              setShowContextMenu(false);
            }}
          >
            詳細を開く
          </button>
          <button
            className="px-3 py-1 hover:bg-blue-100 w-full text-left text-sm"
            onClick={() => {
              onDuplicate(process);
              setShowContextMenu(false);
            }}
          >
            複製
          </button>
          <button
            className="px-3 py-1 hover:bg-purple-100 w-full text-left text-sm flex items-center gap-2"
            onClick={() => {
              router.push(`/work-hours?fromProcess=${process.id}`);
              setShowContextMenu(false);
            }}
          >
            <BarChart3 className="w-4 h-4" />
            工数管理
          </button>
          <hr className="my-1" />
          <button
            className="px-3 py-1 hover:bg-red-100 text-red-600 w-full text-left text-sm"
            onClick={() => {
              if (confirm("この工程を削除しますか？")) {
                onDelete(process.id);
              }
              setShowContextMenu(false);
            }}
          >
            削除
          </button>
        </div>
      )}
    </>
  );
};
