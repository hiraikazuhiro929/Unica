"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Edit2,
  CalendarDays,
  Save,
  Search,
  Filter,
  Clock,
  User,
  Settings,
  Package,
  Truck,
  AlertCircle,
  ClipboardList,
  Factory,
  Wrench,
  BarChart3,
  Grid3X3,
  Check,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ZoomIn,
  ZoomOut,
  Building2,
} from "lucide-react";

// ===== 型定義 =====
interface WorkDetails {
  setup: number;
  machining: number;
  finishing: number;
  additionalSetup?: number;
  additionalMachining?: number;
  additionalFinishing?: number;
}

interface Process {
  id: string;
  orderClient: string;
  lineNumber: string;
  projectName: string;
  managementNumber: string;
  progress: number;
  quantity: number;
  salesPerson: string;
  assignee: string;
  fieldPerson: string;
  assignedMachines: string[];
  workDetails: WorkDetails;
  orderDate: string;
  arrivalDate: string;
  shipmentDate: string;
  dataWorkDate: string;
  dataCompleteDate?: string;
  processingPlanDate: string;
  processingEndDate?: string;
  remarks: string;
  status:
    | "planning"
    | "data-work"
    | "processing"
    | "finishing"
    | "completed"
    | "delayed";
  priority: "high" | "medium" | "low";
  dueDate?: string;
  rowNumber?: number;
}

interface Company {
  id: string;
  name: string;
  processes: Process[];
  isExpanded: boolean;
}

// 機械リスト
const MACHINES = [
  "NC旋盤-001",
  "NC旋盤-002",
  "マシニングセンタ-001",
  "マシニングセンタ-002",
  "フライス盤-001",
  "研削盤-001",
  "ボール盤-001",
  "プレス機-001",
  "溶接機-001",
  "切断機-001",
];

const CLIENT_COLORS = [
  "#ff5858ff", // 赤
  "#5f5fffff", // 青
  "#00FF00", // 緑
  "#FF8000", // オレンジ
  "#9f3effff", // 紫
  "#d1d163ff", // 黄色
  "#00FFFF", // シアン
  "#FF0080", // マゼンタ
  "#4d4d4dff", // グレー
  "#000000", // 黒
  "#FFFFFF", // 白（枠線付きで使用）
  "#a00000ff", // ダークレッド
  "#000080", // ネイビー
  "#008000", // ダークグリーン
  "#800080", // ダークパープル
  "#678d00ff", // オリーブ
  "#008080", // ティール
  "#C0C0C0", // シルバー
  "#ffb6ccff", // ライトピンク
  "#582b2bff", // ブラウン
];

// ===== ユーティリティ関数 =====
const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const calculateTotalHours = (details: WorkDetails) => {
  return (
    (details.setup || 0) +
    (details.machining || 0) +
    (details.finishing || 0) +
    (details.additionalSetup || 0) +
    (details.additionalMachining || 0) +
    (details.additionalFinishing || 0)
  );
};

const getDaysFromToday = (dateStr: string) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 受注先から色を生成する関数
const getClientColor = (clientName: string) => {
  if (!clientName) return CLIENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < clientName.length; i++) {
    hash = ((hash << 5) - hash + clientName.charCodeAt(i)) & 0xffffffff;
  }
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
};

// 受注先色からライト版を生成
const getLightClientColor = (clientName: string) => {
  const color = getClientColor(clientName);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
};

// ===== ステータスバッジコンポーネント =====
const StatusBadge: React.FC<{ status: Process["status"] }> = ({ status }) => {
  const styles = {
    planning: "bg-gray-100 text-gray-800 border-gray-300",
    "data-work": "bg-purple-100 text-purple-800 border-purple-300",
    processing: "bg-blue-100 text-blue-800 border-blue-300",
    finishing: "bg-orange-100 text-orange-800 border-orange-300",
    completed: "bg-green-100 text-green-800 border-green-300",
    delayed: "bg-red-100 text-red-800 border-red-300",
  };
  const labels = {
    planning: "計画",
    "data-work": "データ",
    processing: "加工",
    finishing: "仕上",
    completed: "完了",
    delayed: "遅延",
  };
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

// ===== 優先度バッジコンポーネント =====
const PriorityIndicator: React.FC<{ priority: Process["priority"] }> = ({
  priority,
}) => {
  const styles = {
    high: "bg-gradient-to-r from-red-400 to-red-600 shadow-lg",
    medium: "bg-gradient-to-r from-yellow-400 to-orange-500 shadow-md",
    low: "bg-gradient-to-r from-blue-400 to-blue-600 shadow-md",
  };

  return <div className={`w-2 h-full rounded-l-md ${styles[priority]}`} />;
};

// ===== 受注先バッジコンポーネント =====
const ClientBadge: React.FC<{ clientName: string }> = ({ clientName }) => {
  const clientColor = getClientColor(clientName);

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shadow-sm"
      style={{
        backgroundColor: `${clientColor}30`, // 薄い背景色
        color: "#374151", // グレー系のテキスト色
      }}
    >
      <Building2
        className="w-3 h-3"
        style={{ color: clientColor }} // アイコンは元の受注先色
      />
      <span className="truncate max-w-20">{clientName}</span>
    </div>
  );
};

// ===== 機械選択コンポーネント =====
const MachineSelector: React.FC<{
  selectedMachines: string[];
  onMachinesChange: (machines: string[]) => void;
  placeholder?: string;
}> = ({ selectedMachines, onMachinesChange, placeholder = "機械を選択" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMachine = (machine: string) => {
    if (selectedMachines.includes(machine)) {
      onMachinesChange(selectedMachines.filter((m) => m !== machine));
    } else {
      onMachinesChange([...selectedMachines, machine]);
    }
  };

  const displayText =
    selectedMachines.length === 0 ? placeholder : selectedMachines.join(", ");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="max-h-64 overflow-y-auto">
          {MACHINES.map((machine) => (
            <div
              key={machine}
              className={`p-3 hover:bg-gray-100 cursor-pointer transition-colors border-l-4 ${
                selectedMachines.includes(machine)
                  ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                  : "border-transparent"
              }`}
              onClick={() => toggleMachine(machine)}
            >
              <span className="text-sm">{machine}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ===== 日付編集コンポーネント =====
const DateEditor: React.FC<{
  date: string;
  onDateChange: (date: Date | undefined) => void;
  label: string;
  icon?: React.ReactNode;
}> = ({ date, onDateChange, label, icon }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-1 hover:bg-white/20 rounded"
        >
          <div className="flex items-center gap-1">
            {icon}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600">{label}:</span>
              <span className="text-xs font-medium">{formatDate(date)}</span>
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
// ===== ガントチャートコンポーネント =====
const GanttChart: React.FC<{
  processes: Process[];
  viewType: "machine" | "person" | "project";
  onProcessClick: (process: Process) => void;
  onProcessUpdate: (process: Process) => void;
}> = ({ processes, viewType, onProcessClick, onProcessUpdate }) => {
  const [dateRange, setDateRange] = useState({ start: -7, end: 21 });
  const [zoomLevel, setZoomLevel] = useState<"day" | "week" | "month">("day");
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [draggedProcess, setDraggedProcess] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + dateRange.start);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + dateRange.end);

  const generateDateRange = () => {
    const dates = [];
    const current = new Date(startDate);

    if (zoomLevel === "day") {
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (zoomLevel === "week") {
      current.setDate(current.getDate() - current.getDay() + 1);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }
    } else {
      current.setDate(1);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
    }
    return dates;
  };

  const dates = generateDateRange();

  const groupedProcesses = () => {
    if (viewType === "machine") {
      return processes.reduce((acc, process) => {
        process.assignedMachines.forEach((machine) => {
          const key = machine || "未割当";
          if (!acc[key]) acc[key] = [];
          acc[key].push(process);
        });
        if (process.assignedMachines.length === 0) {
          if (!acc["未割当"]) acc["未割当"] = [];
          acc["未割当"].push(process);
        }
        return acc;
      }, {} as Record<string, Process[]>);
    } else if (viewType === "person") {
      return processes.reduce((acc, process) => {
        const key = process.fieldPerson || "未割当";
        if (!acc[key]) acc[key] = [];
        acc[key].push(process);
        return acc;
      }, {} as Record<string, Process[]>);
    } else {
      // project view - プロジェクト別
      return processes.reduce((acc, process) => {
        const key = `${process.orderClient} - ${process.projectName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(process);
        return acc;
      }, {} as Record<string, Process[]>);
    }
  };

  const getBarPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays =
      zoomLevel === "day"
        ? dates.length
        : zoomLevel === "week"
        ? dates.length * 7
        : dates.length * 30;

    const startDay = Math.max(
      0,
      Math.floor((start.getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
    );
    const endDay = Math.min(
      totalDays,
      Math.ceil((end.getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
    );

    const width = ((endDay - startDay) / totalDays) * 100;
    const left = (startDay / totalDays) * 100;
    return { width: Math.max(width, 2), left };
  };

  const getBarColor = (process: Process, isSelected: boolean) => {
    const clientColor = getClientColor(process.orderClient);
    return isSelected
      ? `${clientColor} ring-2 ring-blue-500 shadow-lg`
      : clientColor;
  };

  const formatDateHeader = (date: Date, index: number) => {
    if (zoomLevel === "day") {
      const isToday = date.toDateString() === today.toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      return (
        <div
          key={index}
          className={`flex-1 p-3 text-sm text-center border-r min-w-[60px] ${
            isToday
              ? "bg-blue-100 font-bold text-blue-800 border-blue-300"
              : isWeekend
              ? "bg-red-50 text-red-600"
              : "bg-gray-50"
          }`}
        >
          <div className="font-medium">
            {date.getMonth() + 1}/{date.getDate()}
          </div>
          <div className="text-xs opacity-70 mt-1">
            {["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}
          </div>
        </div>
      );
    } else if (zoomLevel === "week") {
      return (
        <div
          key={index}
          className="flex-1 p-3 text-sm text-center border-r min-w-[80px] bg-gray-50"
        >
          <div className="font-medium">
            {date.getMonth() + 1}/{date.getDate()}
          </div>
          <div className="text-xs opacity-70 mt-1">週</div>
        </div>
      );
    } else {
      return (
        <div
          key={index}
          className="flex-1 p-3 text-sm text-center border-r min-w-[100px] bg-gray-50"
        >
          <div className="font-medium">{date.getFullYear()}</div>
          <div className="text-xs opacity-70 mt-1">{date.getMonth() + 1}月</div>
        </div>
      );
    }
  };

  const handleBarClick = (process: Process, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProcess(selectedProcess === process.id ? null : process.id);
    onProcessClick(process);
  };

  const calculateResourceUtilization = (resourceProcesses: Process[]) => {
    const totalHours = resourceProcesses.reduce(
      (sum, p) => sum + calculateTotalHours(p.workDetails),
      0
    );
    const workingDaysInRange = dates.length * 8;
    return Math.min((totalHours / workingDaysInRange) * 100, 100);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return "text-red-600 bg-red-50 border-red-200";
    if (utilization > 70)
      return "text-orange-600 bg-orange-50 border-orange-200";
    if (utilization > 50) return "text-green-600 bg-green-50 border-green-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const navigateDate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setDateRange({ start: -7, end: 21 });
    } else if (direction === "prev") {
      setDateRange((prev) => ({
        start: prev.start - 7,
        end: prev.end - 7,
      }));
    } else {
      setDateRange((prev) => ({
        start: prev.start + 7,
        end: prev.end + 7,
      }));
    }
  };

  const groupedData = groupedProcesses();

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
      {/* ヘッダーコントロール */}
      <div className="p-6 border-b space-y-4 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            {viewType === "machine"
              ? "機械別"
              : viewType === "person"
              ? "担当者別"
              : "案件別"}
            ガントチャート
          </h3>

          <div className="flex items-center gap-4">
            {/* ナビゲーション */}
            <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="px-3"
              >
                <ChevronLeft className="w-4 h-4" />
                前週
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("today")}
                className="px-4 font-medium"
              >
                今日
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("next")}
                className="px-3"
              >
                次週
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* ズームレベル */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">表示:</span>
              <Select
                value={zoomLevel}
                onValueChange={(value: "day" | "week" | "month") =>
                  setZoomLevel(value)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">日別</SelectItem>
                  <SelectItem value="week">週別</SelectItem>
                  <SelectItem value="month">月別</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1400px]">
          {/* 日付ヘッダー */}
          <div className="flex border-b bg-gray-50 sticky top-0 z-10">
            <div className="w-80 p-4 border-r font-bold bg-gray-100 flex items-center justify-between">
              <span className="text-gray-800">
                {viewType === "machine"
                  ? "機械"
                  : viewType === "person"
                  ? "担当者"
                  : "案件"}
              </span>
              <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                稼働率
              </span>
            </div>
            <div className="flex-1 flex">
              {dates.map((date, index) => formatDateHeader(date, index))}
            </div>
          </div>

          {/* 今日のライン */}
          <div className="relative">
            {dates.map((date, index) => {
              if (date.toDateString() === today.toDateString()) {
                return (
                  <div
                    key="today-line"
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{
                      left: `${320 + (index / dates.length) * (100 - 23)}%`,
                    }}
                  />
                );
              }
              return null;
            })}

            {/* ガントバー */}
            {Object.entries(groupedData).map(
              ([resourceName, resourceProcesses]) => {
                const utilization =
                  calculateResourceUtilization(resourceProcesses);
                return (
                  <div
                    key={resourceName}
                    className="border-b hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-stretch min-h-[100px]">
                      <div className="w-80 p-4 border-r bg-white">
                        <div className="flex items-center justify-between h-full">
                          <div className="flex-1">
                            <div className="font-semibold text-base text-gray-900 mb-1">
                              {resourceName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {resourceProcesses.length}件の工程
                            </div>
                          </div>
                          <div
                            className={`px-3 py-2 rounded-lg text-sm font-bold border ${getUtilizationColor(
                              utilization
                            )}`}
                          >
                            {utilization.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 relative p-3">
                        {resourceProcesses.map((process, index) => {
                          const { width, left } = getBarPosition(
                            process.processingPlanDate,
                            process.dueDate || process.shipmentDate
                          );
                          const isOverdue =
                            new Date(process.dueDate || process.shipmentDate) <
                              today && process.status !== "completed";

                          return (
                            <div
                              key={process.id}
                              className={`absolute rounded-lg cursor-pointer transition-all hover:shadow-lg border-2 ${
                                isOverdue
                                  ? "border-red-400 opacity-75"
                                  : "border-transparent"
                              }`}
                              style={{
                                backgroundColor: getClientColor(
                                  process.orderClient
                                ),
                                width: `${Math.max(width, 3)}%`,
                                left: `${left}%`,
                                top: `${index * 24 + 8}px`,
                                height: "20px",
                                zIndex:
                                  selectedProcess === process.id ? 15 : 10,
                                opacity:
                                  selectedProcess === process.id ? 0.9 : 0.8,
                              }}
                              onClick={(e) => handleBarClick(process, e)}
                              title={`${process.projectName}\n${
                                process.managementNumber
                              }\n進捗: ${
                                process.progress
                              }%\n工数: ${calculateTotalHours(
                                process.workDetails
                              )}H\n受注先: ${process.orderClient}`}
                            >
                              <div className="flex items-center h-full px-2 text-white">
                                <span className="text-xs font-semibold truncate flex-1">
                                  {process.managementNumber}
                                </span>
                                <div className="w-8 bg-white/30 rounded-full h-1 ml-2">
                                  <div
                                    className="bg-white/80 h-1 rounded-full transition-all"
                                    style={{ width: `${process.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs ml-1 font-medium">
                                  {process.progress}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* 選択されたプロセスの詳細 */}
      {selectedProcess && (
        <div className="border-t bg-blue-50 p-4">
          {(() => {
            const process = processes.find((p) => p.id === selectedProcess);
            if (!process) return null;
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="font-bold text-lg">
                      {process.projectName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {process.managementNumber} | {process.orderClient}
                    </div>
                  </div>
                  <StatusBadge status={process.status} />
                  <div className="text-sm">
                    進捗:{" "}
                    <span className="font-bold text-lg">
                      {process.progress}%
                    </span>
                  </div>
                  <div className="text-sm">
                    工数:{" "}
                    <span className="font-bold">
                      {calculateTotalHours(process.workDetails)}H
                    </span>
                  </div>
                  <div className="text-sm">
                    担当:{" "}
                    <span className="font-medium">{process.fieldPerson}</span>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onProcessClick(process)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  詳細を開く
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
// ===== 看板コンポーネント =====
const KanbanBoard: React.FC<{
  processes: Process[];
  onProcessClick: (process: Process) => void;
  onStatusChange: (processId: string, newStatus: Process["status"]) => void;
  onProgressChange: (processId: string, progress: number) => void;
}> = ({ processes, onProcessClick, onStatusChange, onProgressChange }) => {
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
                onValueChange={(value: Process["priority"] | "all") =>
                  setFilterPriority(value)
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

              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
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
// ===== 工程行コンポーネント =====
const ProcessRow: React.FC<{
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
}> = ({
  process,
  companyId,
  onProcessClick,
  onDateChange,
  onDuplicate,
  onDelete,
  onReorder,
  onProgressChange,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu]);

  // ドラッグ機能
  const [isDragging, setIsDragging] = useState(false);

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
        <PriorityIndicator priority={process.priority} />
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
            <DateEditor
              date={process.arrivalDate}
              onDateChange={(date) =>
                onDateChange(process.id, "arrivalDate", date)
              }
              label="入荷"
              icon={<Truck className="w-3 h-3 text-blue-600" />}
            />
            <DateEditor
              date={process.shipmentDate}
              onDateChange={(date) =>
                onDateChange(process.id, "shipmentDate", date)
              }
              label="出荷"
              icon={<Truck className="w-3 h-3 text-green-600" />}
            />
            <DateEditor
              date={process.processingPlanDate}
              onDateChange={(date) =>
                onDateChange(process.id, "processingPlanDate", date)
              }
              label="開始"
              icon={<CalendarDays className="w-3 h-3 text-orange-600" />}
            />
            <DateEditor
              date={process.dueDate || process.shipmentDate}
              onDateChange={(date) => onDateChange(process.id, "dueDate", date)}
              label="納期"
              icon={<CalendarDays className="w-3 h-3 text-red-600" />}
            />
          </div>
        </div>
      </div>

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

// ===== 詳細モーダルコンポーネント =====
const ProcessDetail: React.FC<{
  process: Process;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProcess: Process) => void;
  generateLineNumber: (orderClient: string) => string;
  isNew?: boolean;
  companies: Company[];
}> = ({
  process,
  isOpen,
  onClose,
  onSave,
  generateLineNumber,
  isNew,
  companies,
}) => {
  const [editedProcess, setEditedProcess] = useState<Process>(process);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    setEditedProcess(process);
  }, [process]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!editedProcess.projectName.trim()) {
      alert("案件名が入力されていません。");
      return;
    }
    onSave(editedProcess);
  };

  // 日付フォーマット関数
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "未設定";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "未設定";
    return formatDate(dateStr);
  };

  // 日付更新ハンドラー
  const handleDateUpdate = (field: string, date: Date | undefined) => {
    const newProcess = {
      ...editedProcess,
      [field]: date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(date.getDate()).padStart(2, "0")}`
        : "",
    };
    setEditedProcess(newProcess);
    if (!isNew) {
      onSave(newProcess);
    }
    setEditingField(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onMouseDown={(e) => {
        if (
          !document.getSelection()?.toString() &&
          e.target === e.currentTarget &&
          process.projectName
        ) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col "
        style={{ borderTopColor: getClientColor(editedProcess.orderClient) }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {editedProcess.projectName || "新規工程"}
              </h2>
              <p className="text-blue-100 mt-1">
                {editedProcess.managementNumber && editedProcess.lineNumber
                  ? `${editedProcess.managementNumber} / ${editedProcess.lineNumber}`
                  : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム */}
            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-1">
                  基本情報
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-gray-700 font-medium">案件名</Label>
                    {editingField !== "projectName" ? (
                      <div
                        className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-blue-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                        onClick={() => setEditingField("projectName")}
                      >
                        <span className="text-gray-800 font-medium">
                          {editedProcess.projectName || "未設定"}
                        </span>
                      </div>
                    ) : (
                      <Input
                        value={editedProcess.projectName}
                        onChange={(e) => {
                          const newProcess = {
                            ...editedProcess,
                            projectName: e.target.value,
                          };
                          setEditedProcess(newProcess);
                          if (!isNew) {
                            onSave(newProcess);
                          }
                        }}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingField(null);
                          }
                        }}
                        className="border-blue-300 focus:border-blue-500"
                        autoFocus
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-700 font-medium">
                      管理番号
                    </Label>
                    {editingField !== "managementNumber" ? (
                      <div
                        className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-blue-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                        onClick={() => setEditingField("managementNumber")}
                      >
                        <span className="text-gray-800 font-medium">
                          {editedProcess.managementNumber || "未設定"}
                        </span>
                      </div>
                    ) : (
                      <Input
                        value={editedProcess.managementNumber}
                        onChange={(e) => {
                          const newProcess = {
                            ...editedProcess,
                            managementNumber: e.target.value,
                          };
                          setEditedProcess(newProcess);
                          if (!isNew) {
                            onSave(newProcess);
                          }
                        }}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingField(null);
                          }
                        }}
                        className="border-blue-300 focus:border-blue-500"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">受注先</Label>
                    <div className="relative">
                      {editingField !== "orderClient" ? (
                        <div
                          className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-blue-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("orderClient")}
                        >
                          <span className="text-gray-800 font-medium">
                            {editedProcess.orderClient || "未設定"}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Input
                            value={editedProcess.orderClient}
                            onChange={(e) => {
                              const value = e.target.value;
                              const newLineNumber = value
                                ? generateLineNumber(value)
                                : "";
                              const newProcess = {
                                ...editedProcess,
                                orderClient: value,
                                lineNumber: newLineNumber,
                              };
                              setEditedProcess(newProcess);
                              if (!isNew) {
                                onSave(newProcess);
                              }
                            }}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setEditingField(null);
                              }
                            }}
                            placeholder="受注先を入力..."
                            list="client-options"
                            className="border-blue-300 focus:border-blue-500"
                            autoFocus
                          />
                          <datalist id="client-options">
                            {companies.map((company) => (
                              <option key={company.id} value={company.name} />
                            ))}
                          </datalist>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">数量</Label>
                    {editingField !== "quantity" ? (
                      <div
                        className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-blue-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                        onClick={() => setEditingField("quantity")}
                      >
                        <span className="text-gray-800 font-medium">
                          {editedProcess.quantity}個
                        </span>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        value={editedProcess.quantity}
                        onChange={(e) => {
                          const newProcess = {
                            ...editedProcess,
                            quantity: parseInt(e.target.value) || 0,
                          };
                          setEditedProcess(newProcess);
                          if (!isNew) {
                            onSave(newProcess);
                          }
                        }}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingField(null);
                          }
                        }}
                        className="border-blue-300 focus:border-blue-500"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">優先度</Label>
                    <Select
                      value={editedProcess.priority}
                      onValueChange={(value: Process["priority"]) => {
                        const newProcess = {
                          ...editedProcess,
                          priority: value,
                        };
                        setEditedProcess(newProcess);
                        if (!isNew) {
                          onSave(newProcess);
                        }
                      }}
                    >
                      <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">
                      ステータス
                    </Label>
                    <Select
                      value={editedProcess.status}
                      onValueChange={(value: Process["status"]) => {
                        const newProcess = {
                          ...editedProcess,
                          status: value,
                        };
                        setEditedProcess(newProcess);
                        if (!isNew) {
                          onSave(newProcess);
                        }
                      }}
                    >
                      <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">計画</SelectItem>
                        <SelectItem value="data-work">データ作業</SelectItem>
                        <SelectItem value="processing">加工中</SelectItem>
                        <SelectItem value="finishing">仕上げ</SelectItem>
                        <SelectItem value="completed">完了</SelectItem>
                        <SelectItem value="delayed">遅延</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-700 font-medium">備考</Label>
                    <Textarea
                      value={editedProcess.remarks}
                      onChange={(e) => {
                        const newProcess = {
                          ...editedProcess,
                          remarks: e.target.value,
                        };
                        setEditedProcess(newProcess);
                        if (!isNew) {
                          onSave(newProcess);
                        }
                      }}
                      rows={3}
                      className="border-2 border-gray-300 focus:border-blue-500"
                      placeholder="備考を入力してください"
                    />
                  </div>
                </div>
                {/* スケジュール */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-700 border-b-2 border-green-200 pb-2">
                    スケジュール
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 font-medium">
                        受注日
                      </Label>
                      {editingField !== "orderDate" ? (
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-green-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("orderDate")}
                        >
                          <span className="text-gray-800 font-medium">
                            {formatShortDate(editedProcess.orderDate)}
                          </span>
                        </div>
                      ) : (
                        <Popover
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left border-green-300 hover:border-green-500"
                            >
                              {formatShortDate(editedProcess.orderDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                editedProcess.orderDate
                                  ? new Date(editedProcess.orderDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                handleDateUpdate("orderDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">
                        入荷日
                      </Label>
                      {editingField !== "arrivalDate" ? (
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-green-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("arrivalDate")}
                        >
                          <span className="text-gray-800 font-medium">
                            {formatShortDate(editedProcess.arrivalDate)}
                          </span>
                        </div>
                      ) : (
                        <Popover
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left border-green-300 hover:border-green-500"
                            >
                              {formatShortDate(editedProcess.arrivalDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                editedProcess.arrivalDate
                                  ? new Date(editedProcess.arrivalDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                handleDateUpdate("arrivalDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">
                        データ作業日
                      </Label>
                      {editingField !== "dataWorkDate" ? (
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-green-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("dataWorkDate")}
                        >
                          <span className="text-gray-800 font-medium">
                            {formatShortDate(editedProcess.dataWorkDate)}
                          </span>
                        </div>
                      ) : (
                        <Popover
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left border-green-300 hover:border-green-500"
                            >
                              {formatShortDate(editedProcess.dataWorkDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                editedProcess.dataWorkDate
                                  ? new Date(editedProcess.dataWorkDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                handleDateUpdate("dataWorkDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">
                        加工開始予定日
                      </Label>
                      {editingField !== "processingPlanDate" ? (
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-green-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("processingPlanDate")}
                        >
                          <span className="text-gray-800 font-medium">
                            {formatShortDate(editedProcess.processingPlanDate)}
                          </span>
                        </div>
                      ) : (
                        <Popover
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left border-green-300 hover:border-green-500"
                            >
                              {formatShortDate(
                                editedProcess.processingPlanDate
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                editedProcess.processingPlanDate
                                  ? new Date(editedProcess.processingPlanDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                handleDateUpdate("processingPlanDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">
                        出荷日
                      </Label>
                      {editingField !== "shipmentDate" ? (
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-green-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("shipmentDate")}
                        >
                          <span className="text-gray-800 font-medium">
                            {formatShortDate(editedProcess.shipmentDate)}
                          </span>
                        </div>
                      ) : (
                        <Popover
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left border-green-300 hover:border-green-500"
                            >
                              {formatShortDate(editedProcess.shipmentDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                editedProcess.shipmentDate
                                  ? new Date(editedProcess.shipmentDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                handleDateUpdate("shipmentDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">納期</Label>
                      {editingField !== "dueDate" ? (
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-green-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                          onClick={() => setEditingField("dueDate")}
                        >
                          <span className="text-gray-800 font-medium">
                            {formatShortDate(
                              editedProcess.dueDate ||
                                editedProcess.shipmentDate
                            )}
                          </span>
                        </div>
                      ) : (
                        <Popover
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left border-green-300 hover:border-green-500"
                            >
                              {formatShortDate(
                                editedProcess.dueDate ||
                                  editedProcess.shipmentDate
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                editedProcess.dueDate
                                  ? new Date(editedProcess.dueDate)
                                  : editedProcess.shipmentDate
                                  ? new Date(editedProcess.shipmentDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                handleDateUpdate("dueDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右カラム */}
            <div className="space-y-6">
              {/* 作業内容 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-700 border-b-2 border-orange-200 pb-2">
                  作業内容
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center py-1">
                    <Label className="text-gray-700 font-medium w-32">
                      段取り (時間)
                    </Label>
                    <span className="font-semibold text-gray-800">
                      {editedProcess.workDetails.setup}H
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center py-1">
                      <Label className="text-gray-700 font-medium w-32">
                        機械加工 (時間)
                      </Label>
                      <span className="font-semibold text-gray-800">
                        {editedProcess.workDetails.machining}H
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center py-1">
                      <Label className="text-gray-700 font-medium w-32">
                        仕上げ (時間)
                      </Label>
                      <span className="font-semibold text-gray-800">
                        {editedProcess.workDetails.finishing}H
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg p-4 border-2 border-orange-200">
                    <div className="text-lg font-bold text-orange-800">
                      合計工数: {calculateTotalHours(editedProcess.workDetails)}{" "}
                      時間
                    </div>
                  </div>
                </div>
              </div>

              {/* 担当者・機械 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-700 border-b-2 border-purple-200 pb-2">
                  担当者・機械
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium">
                      営業担当
                    </Label>
                    {editingField !== "salesPerson" ? (
                      <div
                        className="p-3 hover:bg-purple-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-purple-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                        onClick={() => setEditingField("salesPerson")}
                      >
                        <span className="text-gray-800 font-medium">
                          {editedProcess.salesPerson || "未設定"}
                        </span>
                      </div>
                    ) : (
                      <Input
                        value={editedProcess.salesPerson}
                        onChange={(e) => {
                          const newProcess = {
                            ...editedProcess,
                            salesPerson: e.target.value,
                          };
                          setEditedProcess(newProcess);
                          if (!isNew) {
                            onSave(newProcess);
                          }
                        }}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingField(null);
                          }
                        }}
                        className="border-purple-300 focus:border-purple-500"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">担当者</Label>
                    {editingField !== "assignee" ? (
                      <div
                        className="p-3 hover:bg-purple-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-purple-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                        onClick={() => setEditingField("assignee")}
                      >
                        <span className="text-gray-800 font-medium">
                          {editedProcess.assignee || "未設定"}
                        </span>
                      </div>
                    ) : (
                      <Input
                        value={editedProcess.assignee}
                        onChange={(e) => {
                          const newProcess = {
                            ...editedProcess,
                            assignee: e.target.value,
                          };
                          setEditedProcess(newProcess);
                          if (!isNew) {
                            onSave(newProcess);
                          }
                        }}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingField(null);
                          }
                        }}
                        className="border-purple-300 focus:border-purple-500"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">
                      現場担当
                    </Label>
                    {editingField !== "fieldPerson" ? (
                      <div
                        className="p-3 hover:bg-purple-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-purple-200 transition-all min-h-[44px] flex items-center bg-gray-50"
                        onClick={() => setEditingField("fieldPerson")}
                      >
                        <span className="text-gray-800 font-medium">
                          {editedProcess.fieldPerson || "未設定"}
                        </span>
                      </div>
                    ) : (
                      <Input
                        value={editedProcess.fieldPerson}
                        onChange={(e) => {
                          const newProcess = {
                            ...editedProcess,
                            fieldPerson: e.target.value,
                          };
                          setEditedProcess(newProcess);
                          if (!isNew) {
                            onSave(newProcess);
                          }
                        }}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingField(null);
                          }
                        }}
                        className="border-purple-300 focus:border-purple-500"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">
                      割当機械
                    </Label>
                    <MachineSelector
                      selectedMachines={editedProcess.assignedMachines}
                      onMachinesChange={(machines) => {
                        const newProcess = {
                          ...editedProcess,
                          assignedMachines: machines,
                        };
                        setEditedProcess(newProcess);
                        if (!isNew) {
                          onSave(newProcess);
                        }
                      }}
                      placeholder="機械を選択してください"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッターボタン（新規作成時のみ） */}
        {isNew && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700"
            >
              追加
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
// ===== メインコンポーネント =====
const ProcessList = () => {
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Process["status"] | "all">(
    "all"
  );
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [ganttViewType, setGanttViewType] = useState<
    "machine" | "person" | "project"
  >("machine");

  // 会社ごとのデータ
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: "1",
      name: "トヨタ自動車",
      isExpanded: true,
      processes: [
        {
          id: "1-1",
          orderClient: "トヨタ自動車",
          lineNumber: "",
          projectName: "自動車部品A製造",
          managementNumber: "MGT-2024-001",
          progress: 75,
          quantity: 100,
          salesPerson: "山田太郎",
          assignee: "田中一郎",
          fieldPerson: "佐藤次郎",
          assignedMachines: ["NC旋盤-001", "マシニングセンタ-001"],
          workDetails: {
            setup: 6,
            machining: 12,
            finishing: 9,
            additionalSetup: 6,
            additionalMachining: 3,
            additionalFinishing: 1.5,
          },
          orderDate: "2024-03-01",
          arrivalDate: "2024-03-05",
          shipmentDate: "2024-03-31",
          dataWorkDate: "2024-03-03",
          dataCompleteDate: "2024-03-04",
          processingPlanDate: "2024-03-06",
          processingEndDate: "2024-03-25",
          remarks: "特急対応、品質検査強化",
          status: "processing",
          priority: "high",
          dueDate: "2024-03-31",
        },
        {
          id: "1-2",
          orderClient: "トヨタ自動車",
          lineNumber: "",
          projectName: "エンジン部品C加工",
          managementNumber: "MGT-2024-003",
          progress: 45,
          quantity: 200,
          salesPerson: "山田太郎",
          assignee: "鈴木三郎",
          fieldPerson: "高橋四郎",
          assignedMachines: ["NC旋盤-002", "フライス盤-001"],
          workDetails: {
            setup: 8,
            machining: 16,
            finishing: 12,
          },
          orderDate: "2024-03-10",
          arrivalDate: "2024-03-12",
          shipmentDate: "2024-04-10",
          dataWorkDate: "2024-03-11",
          processingPlanDate: "2024-03-13",
          remarks: "",
          status: "processing",
          priority: "medium",
          dueDate: "2024-04-10",
        },
      ],
    },
    {
      id: "2",
      name: "ソニーグループ",
      isExpanded: true,
      processes: [
        {
          id: "2-1",
          orderClient: "ソニーグループ",
          lineNumber: "",
          projectName: "精密機器B組立",
          managementNumber: "MGT-2024-002",
          progress: 30,
          quantity: 50,
          salesPerson: "鈴木花子",
          assignee: "高橋三郎",
          fieldPerson: "伊藤四郎",
          assignedMachines: ["マシニングセンタ-002", "研削盤-001"],
          workDetails: {
            setup: 4,
            machining: 8,
            finishing: 6,
          },
          orderDate: "2024-03-15",
          arrivalDate: "2024-03-18",
          shipmentDate: "2024-04-15",
          dataWorkDate: "2024-03-16",
          processingPlanDate: "2024-03-20",
          remarks: "精密加工注意",
          status: "data-work",
          priority: "medium",
          dueDate: "2024-04-15",
        },
      ],
    },
    {
      id: "3",
      name: "パナソニック",
      isExpanded: true,
      processes: [
        {
          id: "3-1",
          orderClient: "パナソニック",
          lineNumber: "",
          projectName: "電子部品筐体加工",
          managementNumber: "MGT-2024-004",
          progress: 10,
          quantity: 300,
          salesPerson: "田中花子",
          assignee: "佐藤五郎",
          fieldPerson: "山田六郎",
          assignedMachines: ["プレス機-001"],
          workDetails: {
            setup: 2,
            machining: 4,
            finishing: 2,
          },
          orderDate: "2024-03-20",
          arrivalDate: "2024-03-22",
          shipmentDate: "2024-04-20",
          dataWorkDate: "2024-03-21",
          processingPlanDate: "2024-03-25",
          remarks: "",
          status: "planning",
          priority: "low",
          dueDate: "2024-04-20",
        },
      ],
    },
    {
      id: "4",
      name: "ホンダ技研工業",
      isExpanded: true,
      processes: [
        {
          id: "4-1",
          orderClient: "ホンダ技研工業",
          lineNumber: "",
          projectName: "二輪車部品製造",
          managementNumber: "MGT-2024-005",
          progress: 85,
          quantity: 150,
          salesPerson: "佐藤太郎",
          assignee: "田中花子",
          fieldPerson: "山田次郎",
          assignedMachines: ["NC旋盤-001", "フライス盤-001"],
          workDetails: {
            setup: 3,
            machining: 10,
            finishing: 5,
          },
          orderDate: "2024-02-28",
          arrivalDate: "2024-03-02",
          shipmentDate: "2024-03-28",
          dataWorkDate: "2024-03-01",
          processingPlanDate: "2024-03-04",
          remarks: "",
          status: "finishing",
          priority: "medium",
          dueDate: "2024-03-28",
        },
      ],
    },
  ]);

  // 初期化時に行番号を設定
  useEffect(() => {
    setCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        processes: company.processes.map((process, index) => ({
          ...process,
          rowNumber: index + 1,
          lineNumber: String(index + 1).padStart(3, "0"),
        })),
      }))
    );
  }, []);

  // 行番号を自動生成する関数
  const generateLineNumber = (orderClient: string) => {
    const clientProcesses = companies
      .flatMap((c) => c.processes)
      .filter((p) => p.orderClient === orderClient);

    const nextNumber = clientProcesses.length + 1;
    return String(nextNumber).padStart(3, "0");
  };

  // 複製処理
  const handleDuplicate = (originalProcess: Process) => {
    const duplicatedProcess = {
      ...originalProcess,
      id: Date.now().toString(),
      managementNumber: originalProcess.managementNumber + "-copy",
      projectName: originalProcess.projectName + " (複製)",
      progress: 0,
      status: "planning" as const,
    };

    setCompanies((prev) =>
      prev.map((company) =>
        company.processes.some((p) => p.id === originalProcess.id)
          ? { ...company, processes: [...company.processes, duplicatedProcess] }
          : company
      )
    );
  };

  const handleProgressChange = (processId: string, progress: number) => {
    setCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        processes: company.processes.map((p) =>
          p.id === processId ? { ...p, progress } : p
        ),
      }))
    );
  };

  // 削除処理
  const handleDelete = (processId: string) => {
    setCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        processes: company.processes.filter((p) => p.id !== processId),
      }))
    );
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    setCompanies((prev) =>
      prev.map((company) => {
        const processes = [...company.processes];
        const draggedIndex = processes.findIndex((p) => p.id === draggedId);
        const targetIndex = processes.findIndex((p) => p.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedItem] = processes.splice(draggedIndex, 1);
          processes.splice(targetIndex, 0, draggedItem);

          // 行番号を再割り当て
          processes.forEach((process, index) => {
            process.rowNumber = index + 1;
            process.lineNumber = String(index + 1).padStart(3, "0");
          });
        }

        return { ...company, processes };
      })
    );
  };

  const toggleCompany = (companyId: string) => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === companyId
          ? { ...company, isExpanded: !company.isExpanded }
          : company
      )
    );
  };

  const openDetail = (process: Process) => {
    setSelectedProcess(process);
    setShowDetail(true);
  };

  const handleDateChange = (
    companyId: string,
    processId: string,
    key: keyof Process,
    date: Date | undefined
  ) => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id !== companyId
          ? company
          : {
              ...company,
              processes: company.processes.map((p) =>
                p.id !== processId
                  ? p
                  : {
                      ...p,
                      [key]: date
                        ? `${date.getFullYear()}-${String(
                            date.getMonth() + 1
                          ).padStart(2, "0")}-${String(date.getDate()).padStart(
                            2,
                            "0"
                          )}`
                        : "",
                    }
              ),
            }
      )
    );
  };

  const handleProcessUpdate = (updatedProcess: Process) => {
    setCompanies((prev) => {
      // 古い会社から工程を削除
      const withoutOldProcess = prev.map((company) => ({
        ...company,
        processes: company.processes.filter((p) => p.id !== updatedProcess.id),
      }));

      // 新しい会社を探すか作成
      const targetCompany = withoutOldProcess.find(
        (c) => c.name === updatedProcess.orderClient
      );

      if (targetCompany) {
        // 既存の会社に追加
        return withoutOldProcess.map((company) =>
          company.name === updatedProcess.orderClient
            ? { ...company, processes: [...company.processes, updatedProcess] }
            : company
        );
      } else {
        // 新しい会社を作成
        return [
          ...withoutOldProcess,
          {
            id: Date.now().toString(),
            name: updatedProcess.orderClient,
            processes: [updatedProcess],
            isExpanded: true,
          },
        ];
      }
    });
    setSelectedProcess(updatedProcess);
  };

  const handleNewProcessSave = (newProcess: Process) => {
    setCompanies((prev) => {
      const firstCompany = prev[0];
      if (firstCompany) {
        return prev.map((company) =>
          company.id === firstCompany.id
            ? { ...company, processes: [...company.processes, newProcess] }
            : company
        );
      }
      return prev;
    });
    setShowNewProcessModal(false);
  };

  // フィルタリング
  const filteredCompanies = companies
    .map((company) => ({
      ...company,
      processes: company.processes.filter((process) => {
        const matchesSearch =
          process.projectName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          process.managementNumber
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          process.fieldPerson
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          process.orderClient.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === "all" || process.status === filterStatus;

        return matchesSearch && matchesStatus;
      }),
    }))
    .filter((company) => company.processes.length > 0);

  // 新規工程テンプレート
  const createNewProcess = (): Process => ({
    id: Date.now().toString(),
    orderClient: "",
    lineNumber: "",
    projectName: "",
    managementNumber: "",
    progress: 0,
    quantity: 0,
    salesPerson: "",
    assignee: "",
    fieldPerson: "",
    assignedMachines: [],
    workDetails: {
      setup: 0,
      machining: 0,
      finishing: 0,
    },
    orderDate: new Date().toISOString().split("T")[0],
    arrivalDate: "",
    shipmentDate: "",
    dataWorkDate: "",
    processingPlanDate: "",
    remarks: "",
    status: "planning",
    priority: "medium",
    dueDate: "",
  });

  // 全プロセスを取得
  const allProcesses = companies.flatMap((company) => company.processes);

  // 統計情報を計算
  const getStatistics = () => {
    const total = allProcesses.length;
    const byStatus = {
      planning: allProcesses.filter((p) => p.status === "planning").length,
      "data-work": allProcesses.filter((p) => p.status === "data-work").length,
      processing: allProcesses.filter((p) => p.status === "processing").length,
      finishing: allProcesses.filter((p) => p.status === "finishing").length,
      completed: allProcesses.filter((p) => p.status === "completed").length,
      delayed: allProcesses.filter((p) => p.status === "delayed").length,
    };
    const totalHours = allProcesses.reduce(
      (sum, p) => sum + calculateTotalHours(p.workDetails),
      0
    );
    const avgProgress =
      total > 0
        ? allProcesses.reduce((sum, p) => sum + p.progress, 0) / total
        : 0;

    return { total, byStatus, totalHours, avgProgress };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  工程管理システム
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>
                    総工程数:{" "}
                    <span className="font-bold text-blue-600">
                      {stats.total}
                    </span>
                  </span>
                  <span>
                    総工数:{" "}
                    <span className="font-bold text-green-600">
                      {stats.totalHours}H
                    </span>
                  </span>
                  <span>
                    平均進捗:{" "}
                    <span className="font-bold text-purple-600">
                      {stats.avgProgress.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="工程を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              {/* フィルター */}
              <Select
                value={filterStatus}
                onValueChange={(value: Process["status"] | "all") =>
                  setFilterStatus(value)
                }
              >
                <SelectTrigger className="w-40 border-2 border-gray-300">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて ({stats.total})</SelectItem>
                  <SelectItem value="planning">
                    計画 ({stats.byStatus.planning})
                  </SelectItem>
                  <SelectItem value="data-work">
                    データ ({stats.byStatus["data-work"]})
                  </SelectItem>
                  <SelectItem value="processing">
                    加工 ({stats.byStatus.processing})
                  </SelectItem>
                  <SelectItem value="finishing">
                    仕上 ({stats.byStatus.finishing})
                  </SelectItem>
                  <SelectItem value="completed">
                    完了 ({stats.byStatus.completed})
                  </SelectItem>
                  <SelectItem value="delayed">
                    遅延 ({stats.byStatus.delayed})
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 新規追加ボタン */}
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6"
                onClick={() => {
                  setSelectedProcess(createNewProcess());
                  setShowNewProcessModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                新規工程
              </Button>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white border-b border-gray-200 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                工程リスト
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                ガントチャート
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                看板
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* 工程リスト */}
            <TabsContent value="list" className="m-0 p-6">
              {filteredCompanies.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    該当する工程が見つかりません
                  </p>
                  <p className="text-gray-400">
                    検索条件を変更するか、新しい工程を追加してください
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredCompanies.map((company) => (
                    <Card
                      key={company.id}
                      className="bg-white border-gray-200 shadow-lg overflow-hidden rounded-xl p-0"
                    >
                      <CardHeader
                        className="py-5 px-4 cursor-pointer bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors border-b flex items-center"
                        onClick={() => toggleCompany(company.id)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Building2
                              className="w-5 h-5"
                              style={{ color: getClientColor(company.name) }}
                            />
                            <span className="font-medium text-gray-800">
                              {company.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {company.processes.reduce(
                                  (sum, p) =>
                                    sum + calculateTotalHours(p.workDetails),
                                  0
                                )}
                                H
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-4 h-4" />
                              <span>
                                {(
                                  company.processes.reduce(
                                    (sum, p) => sum + p.progress,
                                    0
                                  ) / company.processes.length
                                ).toFixed(0)}
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      {company.isExpanded && (
                        <CardContent className="px-4 pt-0 pb-4">
                          <div className="space-y-2">
                            {company.processes.map((process) => (
                              <ProcessRow
                                key={process.id}
                                process={process}
                                companyId={company.id}
                                onProcessClick={openDetail}
                                onDateChange={(processId, key, date) =>
                                  handleDateChange(
                                    company.id,
                                    processId,
                                    key,
                                    date
                                  )
                                }
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onReorder={handleReorder}
                                onProgressChange={handleProgressChange}
                              />
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ガントチャート */}
            <TabsContent value="gantt" className="m-0 p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    ガントチャート
                  </h2>
                  <Select
                    value={ganttViewType}
                    onValueChange={(value: "machine" | "person" | "project") =>
                      setGanttViewType(value)
                    }
                  >
                    <SelectTrigger className="w-48 border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="machine">機械別表示</SelectItem>
                      <SelectItem value="person">担当者別表示</SelectItem>
                      <SelectItem value="project">案件別表示</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <GanttChart
                  processes={allProcesses}
                  viewType={ganttViewType}
                  onProcessClick={openDetail}
                  onProcessUpdate={handleProcessUpdate}
                />
              </div>
            </TabsContent>

            {/* 看板 */}
            <TabsContent value="kanban" className="m-0 p-6">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">看板ビュー</h2>
                <KanbanBoard
                  processes={allProcesses}
                  onProcessClick={openDetail}
                  onStatusChange={(processId, newStatus) => {
                    setCompanies((prev) =>
                      prev.map((company) => ({
                        ...company,
                        processes: company.processes.map((p) =>
                          p.id === processId ? { ...p, status: newStatus } : p
                        ),
                      }))
                    );
                  }}
                  onProgressChange={handleProgressChange}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 詳細モーダル */}
        {selectedProcess && showDetail && (
          <ProcessDetail
            process={selectedProcess}
            isOpen={showDetail}
            onClose={() => setShowDetail(false)}
            onSave={handleProcessUpdate}
            generateLineNumber={generateLineNumber}
            companies={companies}
          />
        )}

        {selectedProcess && showNewProcessModal && (
          <ProcessDetail
            process={selectedProcess}
            isOpen={showNewProcessModal}
            onClose={() => setShowNewProcessModal(false)}
            onSave={handleNewProcessSave}
            generateLineNumber={generateLineNumber}
            isNew={true}
            companies={companies}
          />
        )}
      </div>
    </div>
  );
};

export default ProcessList;
