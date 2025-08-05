import React, { useState } from "react";
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
  onProcessClick: (process: Process) => void;
  onStatusChange: (processId: string, newStatus: Process["status"]) => void;
  onProgressChange: (processId: string, progress: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  processes,
  onProcessClick,
  onStatusChange,
  onProgressChange,
}) => {
  console.log('KanbanBoard rendered with processes:', processes.length);
  const [draggedProcess, setDraggedProcess] = useState<Process | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<
    Process["priority"] | "all"
  >("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "progress">(
    "dueDate"
  );

  const columns = [
    {
      id: "planning",
      title: "計画",
      status: "planning" as const,
      color: "bg-gray-50 border-gray-200",
      headerColor: "bg-gray-100",
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      id: "data-work",
      title: "データ作業",
      status: "data-work" as const,
      color: "bg-purple-50 border-purple-200",
      headerColor: "bg-purple-100",
      icon: <Edit2 className="w-5 h-5" />,
    },
    {
      id: "processing",
      title: "加工中",
      status: "processing" as const,
      color: "bg-blue-50 border-blue-200",
      headerColor: "bg-blue-100",
      icon: <Settings className="w-5 h-5" />,
    },
    {
      id: "finishing",
      title: "仕上げ",
      status: "finishing" as const,
      color: "bg-orange-50 border-orange-200",
      headerColor: "bg-orange-100",
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      id: "completed",
      title: "完了",
      status: "completed" as const,
      color: "bg-green-50 border-green-200",
      headerColor: "bg-green-100",
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
    if (daysUntilDue === null) return "text-gray-500";
    if (daysUntilDue < 0) return "text-red-600 font-bold";
    if (daysUntilDue <= 3) return "text-orange-600 font-medium";
    if (daysUntilDue <= 7) return "text-yellow-600";
    return "text-green-600";
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border p-8">
        <div className="text-center">
          <Grid3X3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500 mb-2">
            表示する工程データがありません
          </p>
          <p className="text-gray-400">
            工程が作成されると、ここに看板ボードが表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
      <div className="p-6 border-b space-y-4 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl flex items-center gap-3">
            <Grid3X3 className="w-6 h-6 text-blue-600" />
            看板ビュー
          </h3>

          <div className="flex items-center gap-3">
            {/* フィルター */}
            <div className="flex items-center gap-3 bg-white rounded-lg border p-2">
              <Select
                value={filterPriority}
                onValueChange={(value: string) =>
                  setFilterPriority(value as Process["priority"] | "all")
                }
              >
                <SelectTrigger className="w-32 border-0 shadow-none">
                  <SelectValue placeholder="優先度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全優先度</SelectItem>
                  <SelectItem value="high">高優先度</SelectItem>
                  <SelectItem value="medium">中優先度</SelectItem>
                  <SelectItem value="low">低優先度</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterAssignee}
                onValueChange={(value: string) => setFilterAssignee(value)}
              >
                <SelectTrigger className="w-36 border-0 shadow-none">
                  <SelectValue placeholder="担当者" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全担当者</SelectItem>
                  {uniqueAssignees.map((assignee) => (
                    <SelectItem key={assignee} value={assignee}>
                      {assignee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* ソート */}
              <Select
                value={sortBy}
                onValueChange={(value: "dueDate" | "priority" | "progress") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger className="w-32 border-0 shadow-none">
                  <SelectValue placeholder="ソート" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">納期順</SelectItem>
                  <SelectItem value="priority">優先度順</SelectItem>
                  <SelectItem value="progress">進捗順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-5 gap-6">
          {columns.map((column) => {
            const columnProcesses = getColumnProcesses(column.status);
            const stats = getColumnStats(column.status);
            const isDropTarget = dragOverColumn === column.status;

            return (
              <div
                key={column.id}
                className={`rounded-xl border-2 transition-all ${
                  column.color
                } ${
                  isDropTarget ? "border-blue-400 bg-blue-100 scale-105" : ""
                }`}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                {/* カラムヘッダー */}
                <div
                  className={`p-4 border-b border-gray-200 ${column.headerColor} rounded-t-xl`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {column.icon}
                      <span className="font-bold text-base text-gray-800">
                        {column.title}
                      </span>
                    </div>
                    <span className="bg-white text-gray-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                      {columnProcesses.length}
                    </span>
                  </div>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/60 rounded-lg p-2">
                      <div className="text-gray-600">総工数</div>
                      <div className="font-bold text-gray-800">
                        {stats.totalHours}H
                      </div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <div className="text-gray-600">平均進捗</div>
                      <div className="font-bold text-gray-800">
                        {stats.avgProgress.toFixed(0)}%
                      </div>
                    </div>
                    {stats.overdueCount > 0 && (
                      <div className="col-span-2 bg-red-100 border border-red-200 rounded-lg p-2">
                        <div className="text-red-600 font-bold text-center">
                          ⚠️ 遅延: {stats.overdueCount}件
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* カラムコンテンツ */}
                <div className="p-4 space-y-3 min-h-[500px] max-h-[700px] overflow-y-auto">
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
                        className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 overflow-hidden`}
                        style={{ borderLeftColor: clientColor }}
                        onClick={() => onProcessClick(process)}
                      >
                        <div className="p-4">
                          {/* ヘッダー部分 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-bold text-base text-gray-900 mb-1">
                                {process.managementNumber}
                              </div>
                              <div className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
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
                                <User className="w-3 h-3 text-gray-500" />
                                <span className="truncate font-medium">
                                  {process.fieldPerson || "未割当"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3 text-gray-500" />
                                <span className="font-medium">
                                  {process.quantity}個
                                </span>
                              </div>
                            </div>

                            {/* 機械情報 */}
                            {process.assignedMachines.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
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
                              <span className="text-gray-500">
                                {formatDate(
                                  process.dueDate || process.shipmentDate
                                )}
                              </span>
                            </div>

                            {/* 工数 */}
                            <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-600">工数</span>
                              </div>
                              <span className="font-bold text-gray-800">
                                {calculateTotalHours(process.workDetails)}H
                              </span>
                            </div>

                            {/* 進捗バー */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">
                                  進捗
                                </span>
                                <span className="font-bold text-base">
                                  {process.progress}%
                                </span>
                              </div>
                              <div className="relative">
                                <div className="w-full bg-gray-200 rounded-full h-3">
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
                              <div className="flex items-start gap-1 text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
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
                    <div className="text-center py-12 text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-3 opacity-30">
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
    </div>
  );
};
