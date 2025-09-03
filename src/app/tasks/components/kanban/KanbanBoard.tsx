import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Edit2,
  Settings,
  Wrench,
  Check,
  Grid3X3,
  User,
  Package,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Process } from "@/app/tasks/types";
import {
  calculateTotalHours,
  formatDate,
  getClientColor,
} from "@/app/tasks/constants";
import { ClientBadge } from "../cards/ClientBadge";

interface KanbanBoardProps {
  processes: Process[];
  groupBy?: "status" | "priority" | "assignee";
  sortBy?: "dueDate" | "priority" | "progress";
  filterPriority?: Process["priority"] | "all";
  filterAssignee?: string;
  showCompleted?: boolean;
  onProcessClick: (process: Process) => void;
  onStatusChange: (processId: string, newStatus: Process["status"]) => void;
  onProgressChange: (processId: string, progress: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  processes,
  groupBy = "status",
  sortBy = "dueDate", 
  filterPriority = "all",
  filterAssignee = "all",
  showCompleted = true,
  onProcessClick,
  onStatusChange,
  onProgressChange,
}) => {
  console.log('KanbanBoard rendered with processes:', processes.length);
  const [draggedProcess, setDraggedProcess] = useState<Process | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columns = [
    {
      id: "planning",
      title: "計画",
      status: "planning" as const,
      color: "bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600",
      headerColor: "bg-gray-100 dark:bg-slate-700",
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      id: "data-work",
      title: "データ作業",
      status: "data-work" as const,
      color: "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700",
      headerColor: "bg-purple-100 dark:bg-purple-800/60",
      icon: <Edit2 className="w-5 h-5" />,
    },
    {
      id: "processing",
      title: "加工中",
      status: "processing" as const,
      color: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
      headerColor: "bg-blue-100 dark:bg-blue-800/60",
      icon: <Settings className="w-5 h-5" />,
    },
    {
      id: "finishing",
      title: "仕上げ",
      status: "finishing" as const,
      color: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700",
      headerColor: "bg-orange-100 dark:bg-orange-800/60",
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      id: "completed",
      title: "完了",
      status: "completed" as const,
      color: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700",
      headerColor: "bg-green-100 dark:bg-green-800/60",
      icon: <Check className="w-5 h-5" />,
    },
  ];

  // フィルタリングとソート
  const filteredProcesses = processes.filter((process) => {
    if (filterPriority !== "all" && process.priority !== filterPriority)
      return false;
    if (filterAssignee !== "all" && process.fieldPerson !== filterAssignee)
      return false;
    return true;
  });

  const getColumnProcesses = (status: Process["status"]) => {
    const columnProcesses = filteredProcesses.filter(
      (process) => process.status === status
    );

    return columnProcesses.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          const aDate = new Date(a.dueDate || a.shipmentDate || "9999-12-31");
          const bDate = new Date(b.dueDate || b.shipmentDate || "9999-12-31");
          return aDate.getTime() - bDate.getTime();
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "progress":
          return a.progress - b.progress;
        default:
          return 0;
      }
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateColor = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return "text-gray-500 dark:text-slate-400";
    if (daysUntilDue < 0) return "text-red-600 dark:text-red-400 font-bold";
    if (daysUntilDue <= 3) return "text-orange-600 dark:text-orange-400 font-medium";
    if (daysUntilDue <= 7) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  // ドラッグ&ドロップ
  const handleDragStart = (process: Process) => {
    setDraggedProcess(process);
  };

  const handleDragOver = (
    e: React.DragEvent,
    columnStatus: Process["status"]
  ) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnStatus: Process["status"]) => {
    e.preventDefault();
    if (draggedProcess && draggedProcess.status !== columnStatus) {
      onStatusChange(draggedProcess.id, columnStatus);
    }
    setDraggedProcess(null);
    setDragOverColumn(null);
  };

  // 統計計算
  const getColumnStats = (status: Process["status"]) => {
    const columnProcesses = getColumnProcesses(status);
    const totalHours = columnProcesses.reduce(
      (sum, p) => sum + calculateTotalHours(p.workDetails),
      0
    );
    const avgProgress =
      columnProcesses.length > 0
        ? columnProcesses.reduce((sum, p) => sum + p.progress, 0) /
          columnProcesses.length
        : 0;
    const overdueCount = columnProcesses.filter((p) => {
      const days = getDaysUntilDue(p.dueDate || p.shipmentDate);
      return days !== null && days < 0;
    }).length;

    return { totalHours, avgProgress, overdueCount };
  };

  const uniqueAssignees = Array.from(
    new Set(processes.map((p) => p.fieldPerson).filter(Boolean))
  );

  // processesが空の場合の処理
  if (!processes || processes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-slate-700 p-8">
        <div className="text-center">
          <Grid3X3 className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">
            表示する工程データがありません
          </p>
          <p className="text-gray-400 dark:text-slate-500">
            工程が作成されると、ここに看板ボードが表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      <div className="grid grid-cols-5 gap-4">
        {columns.map((column) => {
          const columnProcesses = getColumnProcesses(column.status);
          const stats = getColumnStats(column.status);
          const isDropTarget = dragOverColumn === column.status;

          return (
            <div
                key={column.id}
                className={`rounded-lg bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-gray-200/50 dark:border-slate-600/50 transition-all ${
                  isDropTarget ? "border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-102" : ""
                }`}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                {/* カラムヘッダー */}
                <div
                  className={`p-4 border-b border-gray-200 dark:border-slate-600 ${column.headerColor} rounded-t-xl`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-gray-700 dark:text-slate-300">{column.icon}</div>
                      <span className="font-bold text-base text-gray-800 dark:text-white">
                        {column.title}
                      </span>
                    </div>
                    <span className="bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                      {columnProcesses.length}
                    </span>
                  </div>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/60 dark:bg-slate-700/60 rounded-lg p-2">
                      <div className="text-gray-600 dark:text-slate-300">総工数</div>
                      <div className="font-bold text-gray-800 dark:text-white">
                        {stats.totalHours}H
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-700/60 rounded-lg p-2">
                      <div className="text-gray-600 dark:text-slate-300">平均進捗</div>
                      <div className="font-bold text-gray-800 dark:text-white">
                        {stats.avgProgress.toFixed(0)}%
                      </div>
                    </div>
                    {stats.overdueCount > 0 && (
                      <div className="col-span-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2">
                        <div className="text-red-600 dark:text-red-400 font-bold text-center">
                          ⚠️ 遅延: {stats.overdueCount}件
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* カラムコンテンツ */}
                <div className="p-4 space-y-3 min-h-[500px] max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-700">
                  {columnProcesses.map((process) => {
                    const daysUntilDue = getDaysUntilDue(
                      process.dueDate || process.shipmentDate
                    );
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                    const clientColor = getClientColor(process.orderClient);

                    return (
                      <div
                        key={process.id}
                        draggable
                        onDragStart={() => handleDragStart(process)}
                        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/20 hover:shadow-md dark:hover:shadow-slate-900/40 transition-all cursor-pointer border-l-4 border-r border-t border-b border-gray-200 dark:border-slate-600 overflow-hidden`}
                        style={{ borderLeftColor: clientColor }}
                        onClick={() => onProcessClick(process)}
                      >
                        <div className="p-4">
                          {/* ヘッダー部分 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-bold text-base text-gray-900 dark:text-white mb-1">
                                {process.managementNumber}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                {process.projectName}
                              </div>
                            </div>
                          </div>

                          {/* 受注先バッジ */}
                          <div className="mb-3">
                            <ClientBadge clientName={process.orderClient} />
                          </div>

                          {/* 詳細情報 */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                                <span className="truncate font-medium text-gray-700 dark:text-slate-300">
                                  {process.fieldPerson || "未割当"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                                <span className="font-medium text-gray-700 dark:text-slate-300">
                                  {process.quantity}個
                                </span>
                              </div>
                            </div>

                            {/* 機械情報 */}
                            {process.assignedMachines.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-400">
                                <Settings className="w-3 h-3" />
                                <span className="truncate">
                                  {process.assignedMachines[0]}
                                  {process.assignedMachines.length > 1 &&
                                    ` +${process.assignedMachines.length - 1}`}
                                </span>
                              </div>
                            )}

                            {/* 納期情報 */}
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span
                                className={`font-medium ${getDueDateColor(
                                  daysUntilDue
                                )}`}
                              >
                                {daysUntilDue !== null
                                  ? daysUntilDue < 0
                                    ? `${Math.abs(daysUntilDue)}日遅延`
                                    : daysUntilDue === 0
                                    ? "今日納期"
                                    : `あと${daysUntilDue}日`
                                  : "納期未設定"}
                              </span>
                              <span className="text-gray-500 dark:text-slate-400">
                                {formatDate(
                                  process.dueDate || process.shipmentDate
                                )}
                              </span>
                            </div>

                            {/* 工数 */}
                            <div className="flex items-center justify-between text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                                <span className="text-gray-600 dark:text-slate-300">工数</span>
                              </div>
                              <span className="font-bold text-gray-800 dark:text-white">
                                {calculateTotalHours(process.workDetails)}H
                              </span>
                            </div>

                            {/* 進捗バー */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-slate-300 font-medium">
                                  進捗
                                </span>
                                <span className="font-bold text-base text-gray-800 dark:text-white">
                                  {process.progress}%
                                </span>
                              </div>
                              <div className="relative">
                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3">
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
                                {/* インタラクティブスライダー */}
                                <Slider
                                  value={[process.progress]}
                                  onValueChange={(value) =>
                                    onProgressChange(process.id, value[0])
                                  }
                                  max={100}
                                  step={5}
                                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            {/* 備考（あれば） */}
                            {process.remarks && (
                              <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2 leading-relaxed">
                                  {process.remarks}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 空の状態 */}
                  {columnProcesses.length === 0 && (
                    <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                      <div className="w-16 h-16 mx-auto mb-3 opacity-30 text-gray-400 dark:text-slate-500">
                        {column.icon}
                      </div>
                      <p className="text-sm font-medium">工程なし</p>
                      <p className="text-xs mt-1">カードをドラッグして追加</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
