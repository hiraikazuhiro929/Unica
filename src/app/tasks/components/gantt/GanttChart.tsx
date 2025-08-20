"use client";
// src/app/tasks/components/gantt/GanttChart.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Map as MapIcon, MapPin, MousePointer, ZoomIn, ZoomOut, Grid3X3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Process } from "@/app/tasks/types";
import { GanttHeader } from "@/app/tasks/components/gantt/GanttHeader";
import { GanttBar } from "@/app/tasks/components/gantt/GanttBar";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  generateDateRange,
  getGanttBarPosition,
  getMinimapBarPosition,
  getBarPosition,
  calculateResourceUtilization,
  groupProcesses,
  getUtilizationColor,
  getClientColor,
  calculateTotalHours,
  getStatusBadgeStyle,
  getDaysBetween,
} from "@/app/tasks/components/gantt/ganttUtils";

// サンプルデータ（変更なし）
const sampleProcesses: Process[] = [
  {
    id: "1-1",
    orderClient: "トヨタ自動車",
    lineNumber: "001",
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
      useDynamicSteps: false,
      totalEstimatedHours: 27,
      totalActualHours: 0
    },
    orderDate: "2025-07-15",
    arrivalDate: "2025-07-18",
    shipmentDate: "2025-08-15",
    dataWorkDate: "2025-07-16",
    processingPlanDate: "2025-07-20",
    remarks: "特急対応",
    status: "processing",
    priority: "high",
    dueDate: "2025-08-15",
  },
  {
    id: "2-1",
    orderClient: "ソニーグループ",
    lineNumber: "002",
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
      useDynamicSteps: false,
      totalEstimatedHours: 18,
      totalActualHours: 0
    },
    orderDate: "2025-07-10",
    arrivalDate: "2025-07-25",
    shipmentDate: "2025-09-05",
    dataWorkDate: "2025-07-24",
    processingPlanDate: "2025-07-28",
    remarks: "精密加工注意",
    status: "data-work",
    priority: "medium",
    dueDate: "2025-09-05",
  },
  {
    id: "3-1",
    orderClient: "パナソニック",
    lineNumber: "003",
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
      useDynamicSteps: false,
      totalEstimatedHours: 8,
      totalActualHours: 0
    },
    orderDate: "2025-07-12",
    arrivalDate: "2025-08-01",
    shipmentDate: "2025-09-15",
    dataWorkDate: "2025-07-30",
    processingPlanDate: "2025-08-05",
    remarks: "",
    status: "planning",
    priority: "low",
    dueDate: "2025-09-15",
  },
];

interface DropZone {
  date: Date;
  resourceName: string;
}

interface GanttChartProps {
  processes?: Process[];
  viewType?: "machine" | "person" | "project";
  showWeekends?: boolean;
  period?: "week" | "month" | "quarter";
  onProcessClick?: (process: Process) => void;
  onProcessUpdate?: (process: Process) => void;
  onProcessEdit?: (process: Process) => void;
  onProcessDelete?: (processId: string) => void;
  onProcessDuplicate?: (process: Process) => void;
}

// ステータスバッジコンポーネント
const StatusBadge = ({ status }: { status: Process["status"] }) => {
  const { style, label } = getStatusBadgeStyle(status);
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-md border ${style}`}
    >
      {label}
    </span>
  );
};

const GanttChartComponent: React.FC<GanttChartProps> = ({
  processes = [],
  viewType: initialViewType = "machine",
  showWeekends: propsShowWeekends = true,
  period: propsPeriod = "month",
  onProcessClick = () => {},
  onProcessUpdate = () => {},
  onProcessEdit = () => {},
  onProcessDelete = () => {},
  onProcessDuplicate = () => {},
}) => {
  const [viewType, setViewType] = useState<"machine" | "person" | "project">(
    initialViewType
  );
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [showWeekends, setShowWeekends] = useState(propsShowWeekends);
  
  // propsが変更された時にstateを更新
  useEffect(() => {
    setViewType(initialViewType);
  }, [initialViewType]);
  
  useEffect(() => {
    setShowWeekends(propsShowWeekends);
  }, [propsShowWeekends]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Process["status"] | "all">(
    "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<
    Process["priority"] | "all"
  >("all");
  const [draggedProcess, setDraggedProcess] = useState<Process | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const [jumpDate, setJumpDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [hoveredBar, setHoveredBar] = useState<{
    process: Process;
    x: number;
    y: number;
  } | null>(null);
  const [isResizing, setIsResizing] = useState<{
    process: Process;
    edge: "left" | "right";
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(40); // ピクセル/日
  const [dragEndTime, setDragEndTime] = useState(0); // ドラッグ終了時刻
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartDate, setResizeStartDate] = useState<Date | null>(null);
  const [originalProcess, setOriginalProcess] = useState<Process | null>(null);
  const [tempProcesses, setTempProcesses] = useState<Map<string, Process>>(new Map());

  const ganttRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  // 上下スクロール同期
  useEffect(() => {
    const ganttElement = ganttRef.current;
    const leftListElement = document.querySelector(
      ".resource-list"
    ) as HTMLElement;

    if (!ganttElement || !leftListElement) return;

    const handleGanttScroll = () => {
      leftListElement.scrollTop = ganttElement.scrollTop;
    };

    const handleLeftScroll = () => {
      ganttElement.scrollTop = leftListElement.scrollTop;
    };

    ganttElement.addEventListener("scroll", handleGanttScroll, {
      passive: true,
    });
    leftListElement.addEventListener("scroll", handleLeftScroll, {
      passive: true,
    });

    return () => {
      ganttElement.removeEventListener("scroll", handleGanttScroll);
      leftListElement.removeEventListener("scroll", handleLeftScroll);
    };
  }, []);

  // 横スクロール同期
  useEffect(() => {
    const ganttElement = ganttRef.current;
    const scrollBarElement = horizontalScrollRef.current;

    if (!ganttElement || !scrollBarElement) return;

    const handleGanttScroll = () => {
      if (scrollBarElement) {
        scrollBarElement.scrollLeft = ganttElement.scrollLeft;
      }
    };

    const handleScrollBarScroll = () => {
      if (ganttElement) {
        ganttElement.scrollLeft = scrollBarElement.scrollLeft;
      }
    };

    ganttElement.addEventListener("scroll", handleGanttScroll, {
      passive: true,
    });
    scrollBarElement.addEventListener("scroll", handleScrollBarScroll, {
      passive: true,
    });

    return () => {
      ganttElement.removeEventListener("scroll", handleGanttScroll);
      scrollBarElement.removeEventListener("scroll", handleScrollBarScroll);
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // メモ化されたフィルタリング
  const filteredProcesses = useMemo(() => {
    return processes.filter((process) => {
      const matchesSearch =
        process.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.managementNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        process.orderClient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.fieldPerson.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || process.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || process.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [processes, searchQuery, statusFilter, priorityFilter]);

  // プロジェクト全体の日付範囲を計算（固定バッファ）
  const projectDateRange = useMemo(() => {
    const today = new Date();
    const minDate = new Date(today);
    const maxDate = new Date(today);
    
    // 固定的な範囲（前月から3ヶ月後まで）
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 3);

    return { minDate, maxDate };
  }, []);

  const startDate = new Date(projectDateRange.minDate);
  const endDate = new Date(projectDateRange.maxDate);

  // メモ化された日付範囲生成
  const dates = useMemo(() => {
    return generateDateRange(startDate, endDate, showWeekends);
  }, [startDate, endDate, showWeekends]);

  // メモ化されたプロセスグループ化
  const groupedData = useMemo(() => {
    return groupProcesses(filteredProcesses, viewType);
  }, [filteredProcesses, viewType]);

  // バークリックハンドラー（ドラッグ直後100ms無効化）
  const handleBarClick = useCallback(
    (process: Process, e: React.MouseEvent) => {
      e.stopPropagation();
      const now = Date.now();
      if (!isResizing && now - dragEndTime > 100) {
        setSelectedProcess(selectedProcess === process.id ? null : process.id);
        onProcessClick(process);
      }
    },
    [selectedProcess, onProcessClick, isResizing, dragEndTime]
  );

  // ドラッグ開始（@dnd-kit版）
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const processId = event.active.id as string;
      const process = filteredProcesses.find((p) => p.id === processId);
      if (process) {
        setDraggedProcess(process);

        // リサイズ判定を追加
        if (event.activatorEvent) {
          const activatorEvent = event.activatorEvent as MouseEvent;
          const target = activatorEvent.target as HTMLElement;
          const barElement = target.closest("[data-process-id]") || target;

          if (barElement) {
            const barRect = barElement.getBoundingClientRect();
            const clickX = activatorEvent.clientX - barRect.left;
            const barWidth = barRect.width;

            // 通常のドラッグ処理（オフセット計算）
            const offsetRatio = clickX / barWidth;
            setDragOffset(offsetRatio);
          }
        }
      }
    },
    [filteredProcesses]
  );

  // ドラッグ中（@dnd-kit版）
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // 後で実装
  }, []);

  // ドラッグ終了（@dnd-kit版）
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedProcess(null);
      setDropZone(null);
      setDragEndTime(Date.now()); // ドラッグ終了時刻を記録

      if (!draggedProcess) return;

      const { delta } = event;

      // ドラッグ距離が5px未満の場合は更新しない
      if (Math.abs(delta.x) < 5 && Math.abs(delta.y) < 5) {
        setIsResizing(null);
        return;
      }

      // 通常の移動処理
      const mouseEvent = event.activatorEvent as MouseEvent;
      if (!mouseEvent || !ganttRef.current) return;

      const ganttRect = ganttRef.current.getBoundingClientRect();
      const finalMouseX = mouseEvent.clientX + delta.x;
      const x = finalMouseX - ganttRect.left + ganttRef.current.scrollLeft;
      const dateIndex = Math.floor(x / zoomLevel); // zoomLevelを使用

      if (dateIndex >= 0 && dateIndex < dates.length) {
        const targetDate = dates[dateIndex];

        const originalStartDate = new Date(draggedProcess.processingPlanDate);
        const originalEndDate = new Date(
          draggedProcess.dueDate || draggedProcess.shipmentDate
        );
        const duration = getDaysBetween(originalStartDate, originalEndDate) + 1;

        const offsetDays = Math.round(duration * dragOffset);
        const newStartDate = new Date(targetDate);
        newStartDate.setDate(newStartDate.getDate() - offsetDays);

        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + duration - 1);

        const updatedProcess = {
          ...draggedProcess,
          processingPlanDate: newStartDate.toISOString().split("T")[0],
          dueDate: newEndDate.toISOString().split("T")[0],
        };

        onProcessUpdate(updatedProcess);
      }
    },
    [draggedProcess, dates, dragOffset, onProcessUpdate, isResizing, zoomLevel]
  );

  // リサイズハンドラー
  useEffect(() => {
    if (!isResizing || !originalProcess) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !originalProcess) return;

      const deltaX = e.clientX - resizeStartX;
      const daysDelta = Math.round(deltaX / zoomLevel);

      const newProcess = { ...originalProcess };
      let validResize = false;

      if (isResizing.edge === "left") {
        const newStartDate = new Date(originalProcess.processingPlanDate);
        newStartDate.setDate(newStartDate.getDate() + daysDelta);
        
        // 終了日より後にならないようにチェック
        const endDate = new Date(originalProcess.dueDate || originalProcess.shipmentDate);
        if (newStartDate < endDate) {
          newProcess.processingPlanDate = newStartDate.toISOString().split("T")[0];
          validResize = true;
        }
      } else {
        const newEndDate = new Date(originalProcess.dueDate || originalProcess.shipmentDate);
        newEndDate.setDate(newEndDate.getDate() + daysDelta);
        
        // 開始日より前にならないようにチェック
        const startDate = new Date(originalProcess.processingPlanDate);
        if (newEndDate > startDate) {
          newProcess.dueDate = newEndDate.toISOString().split("T")[0];
          validResize = true;
        }
      }

      // 一時的な表示更新用にMapを更新
      if (validResize) {
        setTempProcesses(prev => {
          const newMap = new Map(prev);
          newMap.set(newProcess.id, newProcess);
          return newMap;
        });
      }
    };

    const handleMouseUp = () => {
      // 最終的な更新を実行
      const tempProcess = tempProcesses.get(originalProcess.id);
      if (tempProcess) {
        onProcessUpdate(tempProcess);
      }
      
      setIsResizing(null);
      setResizeStartX(0);
      setResizeStartDate(null);
      setOriginalProcess(null);
      setTempProcesses(new Map());
      setDragEndTime(Date.now()); // リサイズ終了時刻を記録
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStartX, originalProcess, zoomLevel, onProcessUpdate, tempProcesses]);

  // ナビゲーション
  const navigateDate = useCallback(
    (direction: "prev" | "next" | "today") => {
      if (!ganttRef.current) return;

      if (direction === "today") {
        const todayIndex = dates.findIndex(
          (d) => d.toDateString() === today.toDateString()
        );
        if (todayIndex !== -1) {
          const scrollPosition =
            todayIndex * zoomLevel - ganttRef.current.clientWidth / 2;
          ganttRef.current.scrollLeft = Math.max(0, scrollPosition);
        }
      } else {
        const scrollAmount = ganttRef.current.clientWidth * 0.8;
        if (direction === "prev") {
          ganttRef.current.scrollLeft -= scrollAmount;
        } else {
          ganttRef.current.scrollLeft += scrollAmount;
        }
      }
    },
    [dates, today, zoomLevel]
  );

  // 日付ジャンプ
  const handleJumpToDate = useCallback(() => {
    if (!ganttRef.current) return;

    const targetDate = new Date(jumpDate);
    const targetIndex = dates.findIndex(
      (d) => d.toDateString() === targetDate.toDateString()
    );

    if (targetIndex !== -1) {
      const scrollPosition =
        targetIndex * zoomLevel - ganttRef.current.clientWidth / 2;
      ganttRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [jumpDate, dates, zoomLevel]);

  // ミニマップクリック - 修正版
  const handleMinimapClick = useCallback(
    (e: React.MouseEvent) => {
      if (!minimapRef.current || !ganttRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickRatio = clickX / rect.width;

      // クリック位置に対応する日付を計算
      const totalDays = getDaysBetween(
        projectDateRange.minDate,
        projectDateRange.maxDate
      );
      const clickedDayFromStart = Math.floor(totalDays * clickRatio);

      // その日付がdates配列の何番目かを探す
      const clickedDate = new Date(projectDateRange.minDate);
      clickedDate.setDate(clickedDate.getDate() + clickedDayFromStart);

      const targetIndex = dates.findIndex(
        (d) => d.toDateString() === clickedDate.toDateString()
      );

      if (targetIndex !== -1) {
        // クリック位置を中心にスクロール
        const scrollPosition =
          targetIndex * zoomLevel - ganttRef.current.clientWidth / 2;
        ganttRef.current.scrollLeft = Math.max(0, scrollPosition);
        
        // 横スクロールバーも同期
        if (horizontalScrollRef.current) {
          horizontalScrollRef.current.scrollLeft = ganttRef.current.scrollLeft;
        }
      }
    },
    [projectDateRange, dates, zoomLevel]
  );

  // ズーム機能
  const handleZoom = useCallback((zoomIn: boolean) => {
    setZoomLevel((prev) => {
      if (zoomIn) {
        return Math.min(120, prev + 20); // 最大120px
      } else {
        return Math.max(20, prev - 20); // 最小20px
      }
    });
  }, []);

  // フィルタリセット
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  // 進捗更新
  const handleProgressChange = useCallback(
    (processId: string, newProgress: number) => {
      const process = filteredProcesses.find((p) => p.id === processId);
      if (process) {
        const updatedProcess = { ...process, progress: newProgress };
        onProcessUpdate(updatedProcess);
        setSelectedProcess(processId);
      }
    },
    [filteredProcesses, onProcessUpdate]
  );

  // ミニマップ用の現在の表示位置
  const [viewportPosition, setViewportPosition] = useState(0);
  
  // スクロール位置の監視と表示位置の更新
  useEffect(() => {
    const ganttElement = ganttRef.current;
    if (!ganttElement) return;
    
    const updateViewportPosition = () => {
      const scrollLeft = ganttElement.scrollLeft;
      const scrollWidth = dates.length * zoomLevel;
      const viewportWidth = ganttElement.clientWidth;
      
      // 現在表示されている範囲の中心位置を計算
      const centerPosition = scrollLeft + viewportWidth / 2;
      const centerDateIndex = Math.floor(centerPosition / zoomLevel);
      
      if (centerDateIndex >= 0 && centerDateIndex < dates.length) {
        const centerDate = dates[centerDateIndex];
        const totalTimeRange = projectDateRange.maxDate.getTime() - projectDateRange.minDate.getTime();
        const centerOffset = centerDate.getTime() - projectDateRange.minDate.getTime();
        const position = Math.max(0, Math.min(100, (centerOffset / totalTimeRange) * 100));
        setViewportPosition(position);
      }
    };
    
    // 初期位置とスクロール時の更新
    updateViewportPosition();
    ganttElement.addEventListener('scroll', updateViewportPosition, { passive: true });
    
    return () => {
      ganttElement.removeEventListener('scroll', updateViewportPosition);
    };
  }, [dates, zoomLevel, projectDateRange]);

  // processesが空の場合の処理
  if (!processes || processes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-8">
        <div className="text-center">
          <Grid3X3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500 mb-2">
            表示する工程データがありません
          </p>
          <p className="text-gray-400">
            工程が作成されると、ここにガントチャートが表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <TooltipProvider>
        {(() => {
          const { setNodeRef: setDropRef } = useDroppable({
            id: "gantt-area",
          });

          return (
            <div className="bg-transparent">
              {/* ヘッダー */}
              <GanttHeader
                viewType={viewType}
                onViewTypeChange={setViewType}
                datesLength={dates.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filteredProcessesLength={filteredProcesses.length}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                priorityFilter={priorityFilter}
                onPriorityFilterChange={setPriorityFilter}
                showWeekends={showWeekends}
                onShowWeekendsChange={setShowWeekends}
                showMinimap={showMinimap}
                onShowMinimapChange={setShowMinimap}
                onNavigateDate={navigateDate}
                jumpDate={jumpDate}
                onJumpDateChange={setJumpDate}
                onJumpToDate={handleJumpToDate}
                onDateRangeChange={() => {}} // 削除予定
                onFiltersReset={resetFilters}
                zoomLevel={zoomLevel}
                onZoom={handleZoom}
              />

              {/* ミニマップ */}
              {showMinimap && (
                <div className="mx-6 mt-4 p-3 bg-white/60 backdrop-blur rounded-lg border border-gray-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <MapIcon className="w-3 h-3" />
                      プロジェクト全体図
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 ml-2">
                        クリックで移動
                      </span>
                    </div>
                  </div>
                  <div
                    ref={minimapRef}
                    className="relative h-20 bg-white/80 border border-gray-200/50 rounded-lg cursor-pointer overflow-hidden group"
                    onClick={handleMinimapClick}
                  >
                    {/* 月表示 */}
                    <div className="absolute inset-x-0 top-0 h-4 bg-gray-50 border-b flex">
                      {(() => {
                        const months = [];
                        const current = new Date(projectDateRange.minDate);
                        while (current <= projectDateRange.maxDate) {
                          const monthStart = new Date(current);
                          const monthEnd = new Date(
                            current.getFullYear(),
                            current.getMonth() + 1,
                            0
                          );
                          const startPos =
                            ((monthStart.getTime() -
                              projectDateRange.minDate.getTime()) /
                              (projectDateRange.maxDate.getTime() -
                                projectDateRange.minDate.getTime())) *
                            100;
                          const endPos =
                            ((Math.min(
                              monthEnd.getTime(),
                              projectDateRange.maxDate.getTime()
                            ) -
                              projectDateRange.minDate.getTime()) /
                              (projectDateRange.maxDate.getTime() -
                                projectDateRange.minDate.getTime())) *
                            100;

                          months.push(
                            <div
                              key={`month-${current.getMonth()}-${current.getFullYear()}`}
                              className="absolute text-xs text-gray-600 px-1"
                              style={{
                                left: `${startPos}%`,
                                width: `${endPos - startPos}%`,
                              }}
                            >
                              {current.getMonth() + 1}月
                            </div>
                          );
                          current.setMonth(current.getMonth() + 1);
                        }
                        return months;
                      })()}
                    </div>

                    {/* プロセスバー */}
                    <div className="absolute inset-x-0 top-4 bottom-0">
                      {Object.entries(groupedData).flatMap(
                        ([resourceName, resourceProcesses]) =>
                          resourceProcesses.map((process, processIndex) => {
                            const position = getMinimapBarPosition(
                              process.processingPlanDate,
                              process.dueDate || process.shipmentDate,
                              [
                                projectDateRange.minDate,
                                projectDateRange.maxDate,
                              ]
                            );

                            // 各グループのプロセスインデックスを計算
                            const globalIndex =
                              Object.entries(groupedData)
                                .slice(
                                  0,
                                  Object.keys(groupedData).indexOf(resourceName)
                                )
                                .reduce(
                                  (acc, [_, procs]) => acc + procs.length,
                                  0
                                ) + processIndex;

                            return (
                              <div
                                key={`minimap-${viewType}-${resourceName}-${process.id}-${processIndex}`}
                                className="absolute h-2 rounded-sm transition-all hover:h-3 hover:shadow-md"
                                style={{
                                  backgroundColor: getClientColor(
                                    process.orderClient
                                  ),
                                  width: `${position.width}%`,
                                  left: `${position.left}%`,
                                  top: `${4 + (globalIndex % 7) * 8}px`,
                                  opacity:
                                    selectedProcess === process.id ? 1 : 0.7,
                                }}
                                title={`${process.projectName} (${process.progress}%)`}
                              />
                            );
                          })
                      )}
                    </div>

                    {/* 現在の表示位置インジケータ */}
                    <div
                      className="absolute top-4 bottom-0 w-px bg-blue-400 opacity-60 pointer-events-none transition-all duration-300"
                      style={{
                        left: `${viewportPosition}%`,
                      }}
                    >
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-sm" />
                    </div>

                    {/* 今日の位置 */}
                    <div
                      className="absolute top-4 bottom-0 w-px bg-red-400 opacity-80 pointer-events-none"
                      style={{
                        left: `${
                          ((today.getTime() -
                            projectDateRange.minDate.getTime()) /
                            (projectDateRange.maxDate.getTime() -
                              projectDateRange.minDate.getTime())) *
                          100
                        }%`,
                      }}
                    >
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[10px] bg-red-500 text-white px-1 py-0.5 rounded-sm shadow-sm">
                        今日
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex mt-4 overflow-hidden">
                {/* リソースリスト */}
                <div className="w-80 bg-white/60 backdrop-blur border-r border-gray-200/50 flex-shrink-0 rounded-l-lg">
                  <div className="p-4 border-t border-b border-gray-200/50 bg-white/80">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">
                        {viewType === "machine"
                          ? "機械"
                          : viewType === "person"
                          ? "担当者"
                          : "案件"}
                      </span>
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        稼働率
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-[600px] overflow-y-scroll resource-list"
                    style={{ scrollbarWidth: "none" }}
                  >
                    <style jsx>{`
                      .resource-list::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    {Object.entries(groupedData).map(
                      ([resourceName, resourceProcesses]) => {
                        const utilization = calculateResourceUtilization(
                          resourceProcesses,
                          dates.length
                        );
                        return (
                          <div
                            key={`resource-${viewType}-${resourceName}`}
                            className={`border-b border-gray-200 ${
                              dropZone?.resourceName === resourceName
                                ? "bg-green-50"
                                : ""
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedProcess) {
                                setDropZone({ date: new Date(), resourceName });
                              }
                            }}
                          >
                            <div
                              className="p-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                              style={{
                                height: `${Math.max(
                                  100,
                                  resourceProcesses.length * 28 + 44
                                )}px`,
                              }}
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-base text-gray-900 mb-1">
                                  {resourceName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {resourceProcesses.length}件の工程
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  総工数:{" "}
                                  {resourceProcesses.reduce(
                                    (sum, p) =>
                                      sum + calculateTotalHours(p.workDetails),
                                    0
                                  )}
                                  H
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
                        );
                      }
                    )}
                  </div>
                </div>

                {/* ガントチャート本体 */}
                <div className="flex-1 overflow-hidden">
                  <div
                    className="h-[658px] overflow-y-auto overflow-x-hidden"
                    ref={ganttRef}
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#9CA3AF #F3F4F6",
                    }}
                  >
                    {/* 日付タイムライン（sticky固定） */}
                    <div className="sticky top-0 z-20 border-t border-b border-gray-200/50 bg-white/90 backdrop-blur">
                      <div
                        className="flex"
                        style={{ minWidth: `${dates.length * zoomLevel}px` }}
                      >
                        {dates.map((date, index) => {
                          const isToday =
                            date.toDateString() === today.toDateString();
                          const isWeekend =
                            date.getDay() === 0 || date.getDay() === 6;
                          const dayNames = [
                            "日",
                            "月",
                            "火",
                            "水",
                            "木",
                            "金",
                            "土",
                          ];

                          return (
                            <div
                              key={`date-${index}`}
                              className={`flex-shrink-0 text-xs text-center border-r border-gray-200 flex flex-col justify-center items-center ${
                                isToday
                                  ? "bg-blue-100 font-bold text-blue-800 border-blue-300"
                                  : isWeekend
                                  ? "bg-red-50 text-red-600"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                              style={{
                                width: `${zoomLevel}px`,
                                height: "56px",
                              }}
                            >
                              <div className="font-medium text-xs">
                                {zoomLevel >= 40
                                  ? `${date.getMonth() + 1}/${date.getDate()}`
                                  : date.getDate()}
                              </div>
                              {zoomLevel >= 40 && (
                                <div
                                  className={`text-[10px] mt-0.5 ${
                                    isWeekend ? "text-red-500" : "text-gray-500"
                                  }`}
                                >
                                  {dayNames[date.getDay()]}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      ref={(node) => {
                        setDropRef(node);
                        if (node && ganttRef.current !== node) {
                          ganttRef.current =
                            node.parentElement as HTMLDivElement;
                        }
                      }}
                      className="relative"
                      style={{ minWidth: `${dates.length * zoomLevel}px` }}
                      role="grid"
                      aria-label="ガントチャート"
                    >
                      {/* 背景グリッド */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {dates.map((date, index) => {
                          const isToday =
                            date.toDateString() === today.toDateString();
                          const isWeekend =
                            date.getDay() === 0 || date.getDay() === 6;
                          return (
                            <div
                              key={`grid-${index}`}
                              className={`flex-shrink-0 border-r ${
                                isToday
                                  ? "bg-blue-50 border-blue-200"
                                  : isWeekend
                                  ? "bg-gray-50 border-gray-100"
                                  : "border-gray-100"
                              }`}
                              style={{ width: `${zoomLevel}px` }}
                            />
                          );
                        })}
                      </div>

                      {/* プロセスバー */}
                      {Object.entries(groupedData).map(
                        ([resourceName, resourceProcesses]) => (
                          <div
                            key={`gantt-row-${viewType}-${resourceName}`}
                            className="border-b border-gray-200"
                            role="row"
                          >
                            <div
                              className="relative p-3"
                              style={{
                                height: `${Math.max(
                                  100,
                                  resourceProcesses.length * 28 + 44
                                )}px`,
                              }}
                            >
                              {resourceProcesses.map((process, index) => {
                                // リサイズ中の場合は一時的なプロセスを使用
                                const displayProcess = tempProcesses.get(process.id) || process;
                                
                                const position = getGanttBarPosition(
                                  displayProcess.processingPlanDate,
                                  displayProcess.dueDate || displayProcess.shipmentDate,
                                  dates
                                );

                                const isSelected =
                                  selectedProcess === process.id;
                                const isDragging =
                                  draggedProcess?.id === process.id;
                                const isOverdue =
                                  new Date(
                                    displayProcess.dueDate || displayProcess.shipmentDate
                                  ) < today && displayProcess.status !== "completed";

                                return (
                                  <GanttBar
                                    key={`${viewType}-${resourceName}-${process.id}-${index}`}
                                    process={displayProcess}
                                    resourceName={resourceName}
                                    index={index}
                                    position={{
                                      ...position,
                                      top: index * 28 + 22,
                                    }}
                                    isSelected={isSelected}
                                    isDragging={isDragging}
                                    isOverdue={isOverdue}
                                    onBarClick={handleBarClick}
                                    onProcessEdit={onProcessUpdate}
                                    onProcessDuplicate={onProcessDuplicate}
                                    onProcessDelete={onProcessDelete}
                                    onProcessClick={onProcessClick}
                                    onResize={(process, edge, deltaX) => {
                                      // リサイズ中の処理はuseEffectで実装
                                    }}
                                    isResizing={isResizing && isResizing.process.id === process.id ? isResizing : null}
                                    onResizeStart={(value, mouseEvent) => {
                                      if (value && mouseEvent) {
                                        setIsResizing(value);
                                        setOriginalProcess({ ...value.process });
                                        setResizeStartX(mouseEvent.clientX);
                                        const dateToUse = value.edge === "left" 
                                          ? new Date(value.process.processingPlanDate)
                                          : new Date(value.process.dueDate || value.process.shipmentDate);
                                        setResizeStartDate(dateToUse);
                                      }
                                    }}
                                    onResizeEnd={() => {
                                      setIsResizing(null);
                                      setResizeStartX(0);
                                      setResizeStartDate(null);
                                    }}
                                    pixelsPerDay={zoomLevel}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 横スクロールバー（ガントエリアのみ表示） */}
              <div className="flex">
                {/* リソースリスト幅分の空白 */}
                <div className="w-80 flex-shrink-0"></div>

                {/* 横スクロールバー（ガントエリア分だけ） */}
                <div
                  className="flex-1 overflow-x-auto overflow-y-hidden"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#9CA3AF #F3F4F6",
                    height: "17px",
                  }}
                  ref={horizontalScrollRef}
                >
                  <div
                    style={{
                      width: `${dates.length * zoomLevel}px`,
                      height: "1px",
                    }}
                  ></div>
                </div>
              </div>

              {/* 選択されたプロセスの詳細パネル */}
              {selectedProcess && (
                <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  {(() => {
                    const process = filteredProcesses.find(
                      (p) => p.id === selectedProcess
                    );
                    if (!process) return null;
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{
                                backgroundColor: getClientColor(
                                  process.orderClient
                                ),
                              }}
                            />
                            <div>
                              <div className="font-bold text-lg text-gray-900">
                                {process.projectName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {process.managementNumber} |{" "}
                                {process.orderClient}
                              </div>
                            </div>
                          </div>

                          <StatusBadge status={process.status} />

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">進捗:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  value={process.progress}
                                  onChange={(e) =>
                                    handleProgressChange(
                                      process.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  min="0"
                                  max="100"
                                  step="5"
                                  className="w-20"
                                />
                                <span className="font-bold text-blue-600 min-w-[40px]">
                                  {process.progress}%
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">工数:</span>
                              <span className="font-bold text-emerald-600">
                                {calculateTotalHours(process.workDetails)}H
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">担当:</span>
                              <span className="font-medium text-gray-800">
                                {process.fieldPerson}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">期間:</span>
                              <span className="font-medium text-gray-800">
                                {new Date(
                                  process.processingPlanDate
                                ).toLocaleDateString("ja-JP")}
                                〜
                                {new Date(
                                  process.dueDate || process.shipmentDate
                                ).toLocaleDateString("ja-JP")}
                              </span>
                            </div>

                            {process.assignedMachines.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">機械:</span>
                                <span className="font-medium text-gray-800">
                                  {process.assignedMachines.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onProcessEdit(process)}
                            className="gap-2"
                          >
                            編集
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onProcessClick(process)}
                            className="bg-blue-600 hover:bg-blue-700 gap-2"
                          >
                            詳細
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ホバー時のバー位置表示 */}
              {hoveredBar && (
                <div
                  className="fixed bg-black/80 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-50 whitespace-nowrap"
                  style={{
                    left: hoveredBar.x + 10,
                    top: hoveredBar.y - 30,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {new Date(
                        hoveredBar.process.processingPlanDate
                      ).toLocaleDateString("ja-JP")}
                      〜
                      {new Date(
                        hoveredBar.process.dueDate ||
                          hoveredBar.process.shipmentDate
                      ).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </TooltipProvider>
    </DndContext>
  );
};

export const GanttChart = GanttChartComponent;
