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
import { getMachinesFromWorkHours } from "@/app/tasks/utils/machineUtils";

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
  onDelete: (processId: string) => Promise<void>;
  onReorder?: (draggedId: string, targetId: string) => Promise<void>;
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

  // 機械情報の状態管理
  const [machines, setMachines] = useState<string[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);

  // 機械情報を取得
  useEffect(() => {
    const fetchMachines = async () => {
      if (!process.id) return;

      setMachinesLoading(true);
      try {
        const machineList = await getMachinesFromWorkHours(process.id);
        setMachines(machineList);
      } catch (error) {
        console.error('機械情報の取得に失敗:', error);
      } finally {
        setMachinesLoading(false);
      }
    };

    fetchMachines();
  }, [process.id]);

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
    e.dataTransfer.setData("process-drag", process.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // 工程のドラッグのみ受け入れる
    const hasProcessDrag = e.dataTransfer.types.includes("process-drag");
    if (hasProcessDrag) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    const draggedId = e.dataTransfer.getData("process-drag");
    if (draggedId && draggedId !== process.id && onReorder) {
      e.preventDefault();
      await onReorder(draggedId, process.id);
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
        className={`bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-md hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all shadow-sm ${getBorderStyle(
          process.priority
        )} relative overflow-hidden cursor-move ${
          isDragging ? "opacity-50" : ""
        }`}
        draggable={true}
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
            <div className="font-medium text-base text-gray-800 dark:text-white truncate">
              {process.managementNumber}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400 truncate">
              └ {process.lineNumber}
            </div>
          </div>

          {/* プロジェクト名・備考 */}
          <div
            className="min-w-0 cursor-pointer"
            onClick={() => onProcessClick(process)}
          >
            <div className="font-medium text-base text-gray-900 dark:text-white truncate">
              {process.projectName}
            </div>
            {process.remarks && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600 dark:text-red-400 truncate">
                <AlertCircle className="w-4 h-4 text-red-500" />
                {process.remarks}
              </div>
            )}
          </div>

          {/* 作業者・機械・数量 */}
          <div className="grid grid-cols-3 gap-2 text-base">
            <div className="flex items-center gap-1 truncate">
              <Package className="w-4 h-4 text-gray-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{process.quantity}個</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 truncate">
                <User className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{process.fieldPerson}</span>
              </div>
            </div>
            <div className="space-y-1 ml-4">
              <div>
                <div className="flex gap-1">
                  <div className="flex flex-col justify-center pt-[2px]">
                    <Settings className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                  </div>
                  <div className="space-y-0.5">
                    {machinesLoading ? (
                      <div className="text-xs text-gray-600 dark:text-slate-400">読み込み中...</div>
                    ) : machines.length > 0 ? (
                      machines.map((machine, index) => (
                        <div
                          key={index}
                          className="text-xs text-gray-900 dark:text-white truncate font-medium"
                        >
                          {machine}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-600 dark:text-slate-400">未割当</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 工数 */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-gray-600 dark:text-slate-400" />
              <span className="text-base font-bold text-gray-800 dark:text-white">
                {calculateTotalHours(process.workDetails)}H
              </span>
            </div>
          </div>

          {/* ステータス + 進捗 */}
          <div className="flex items-center gap-3">
            <StatusBadge status={process.status} />
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 relative">
                <div className="w-full h-3 bg-gray-200 dark:bg-slate-600 rounded-full">
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
                  className="absolute inset-0 [&_[role=slider]]:h-5 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white dark:[&_[role=slider]]:bg-slate-700 [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-400 dark:[&_[role=slider]]:border-slate-500 [&_[role=slider]]:shadow-md [&_[role=slider]]:rounded-sm"
                  style={
                    {
                      "--slider-track": "transparent",
                      "--slider-range": "transparent",
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-slate-300 w-12 text-right">
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
          className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-lg rounded-md py-1 z-50"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <button
            className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-700 w-full text-left text-sm text-gray-900 dark:text-white"
            onClick={() => {
              onProcessClick(process);
              setShowContextMenu(false);
            }}
          >
            詳細を開く
          </button>
          <button
            className="px-3 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 w-full text-left text-sm text-gray-900 dark:text-white"
            onClick={() => {
              onDuplicate(process);
              setShowContextMenu(false);
            }}
          >
            複製
          </button>
          <button
            className="px-3 py-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 w-full text-left text-sm flex items-center gap-2 text-gray-900 dark:text-white"
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
            className="px-3 py-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 w-full text-left text-sm"
            onClick={async () => {
              if (confirm("この工程を削除しますか？")) {
                await onDelete(process.id);
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
