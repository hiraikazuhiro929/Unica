// src/app/tasks/components/gantt/ganttUtils.ts
import { Process } from '@/app/tasks/types';

// 色関連
const CLIENT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#F43F5E", "#8B5CF6", "#059669", "#DC2626",
  "#7C3AED", "#DB2777", "#0891B2", "#65A30D", "#EA580C",
];

export const getClientColor = (clientName: string): string => {
  if (!clientName) return CLIENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < clientName.length; i++) {
    hash = ((hash << 5) - hash + clientName.charCodeAt(i)) & 0xffffffff;
  }
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
};

// 工数計算
export const calculateTotalHours = (details: Process['workDetails']): number => {
  return (
    (details.setup || 0) +
    (details.machining || 0) +
    (details.finishing || 0) +
    (details.additionalSetup || 0) +
    (details.additionalMachining || 0) +
    (details.additionalFinishing || 0)
  );
};

// 期間に基づいた日付範囲を取得
export const getDateRangeByPeriod = (period: "week" | "month" | "quarter") => {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);
  
  switch (period) {
    case "week":
      // 今週の月曜日から日曜日まで
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(today.getDate() + diff);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case "month":
      // 今月の初日から末日まで
      startDate.setDate(1);
      endDate.setMonth(today.getMonth() + 1, 0);
      break;
    case "quarter":
      // 今日から3ヶ月後まで
      startDate.setMonth(today.getMonth() - 1);
      endDate.setMonth(today.getMonth() + 2);
      break;
  }
  
  return { startDate, endDate };
};

// 日付範囲生成
export const generateDateRange = (
  startDate: Date, 
  endDate: Date, 
  showWeekends: boolean
): Date[] => {
  const dates = [];
  const current = new Date(startDate);
  const maxDays = 1000;
  let dayCount = 0;

  while (current <= endDate && dayCount < maxDays) {
    if (showWeekends || (current.getDay() !== 0 && current.getDay() !== 6)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
    dayCount++;
  }
  return dates;
};

// 修正されたバー位置計算 - シンプルで正確なバージョン
export const getBarPosition = (
  startDateStr: string, 
  endDateStr: string, 
  dates: Date[]
): { width: number; left: number } => {
  try {
    if (!startDateStr || !endDateStr || !dates.length) {
      return { width: 0, left: 0 };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { width: 0, left: 0 };
    }

    // 日付配列の最初と最後を取得
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    
    // タイムゾーンの影響を排除
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    firstDate.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    // 全期間の日数を計算
    const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 開始位置の計算（日数ベース）
    const startDays = Math.floor((startDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const left = (startDays / totalDays) * 100;
    
    // 幅の計算（日数ベース）
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const width = (duration / totalDays) * 100;
    
    // 範囲外の場合の処理
    if (startDate > lastDate || endDate < firstDate) {
      return { width: 0, left: 0 };
    }
    
    // 部分的に範囲外の場合の調整
    const adjustedLeft = Math.max(0, left);
    const adjustedWidth = Math.min(100 - adjustedLeft, Math.max(0.5, width));
    
    return { 
      left: adjustedLeft, 
      width: adjustedWidth
    };
    
  } catch (error) {
    console.warn('Date parsing error:', error);
    return { width: 0, left: 0 };
  }
};

// ミニマップ用のバー位置計算（プロジェクト全体期間ベース）
export const getMinimapBarPosition = (
  startDateStr: string, 
  endDateStr: string, 
  projectDateRange: [Date, Date]
): { width: number; left: number } => {
  try {
    if (!startDateStr || !endDateStr) {
      return { width: 0, left: 0 };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const [projectStart, projectEnd] = projectDateRange;
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { width: 0, left: 0 };
    }

    // タイムゾーンの影響を排除
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const projectStartTime = projectStart.getTime();
    const projectEndTime = projectEnd.getTime();
    const totalProjectDuration = projectEndTime - projectStartTime;
    
    if (totalProjectDuration <= 0) {
      return { width: 0, left: 0 };
    }

    // プロジェクト全体期間に対する位置とサイズ
    const left = ((startDate.getTime() - projectStartTime) / totalProjectDuration) * 100;
    const width = ((endDate.getTime() - startDate.getTime()) / totalProjectDuration) * 100;
    
    return { 
      left: Math.max(0, left), 
      width: Math.max(0.5, width)
    };
    
  } catch (error) {
    console.warn('Minimap date parsing error:', error);
    return { width: 0, left: 0 };
  }
};

// ガントチャート用のバー位置計算（表示日付配列ベース）- 修正版
export const getGanttBarPosition = (
  startDateStr: string, 
  endDateStr: string, 
  dates: Date[]
): { width: number; left: number } => {
  try {
    if (!startDateStr || !endDateStr || !dates.length) {
      return { width: 0, left: 0 };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { width: 0, left: 0 };
    }

    // タイムゾーンの影響を排除
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // dates配列内での開始位置を探す
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      currentDate.setHours(0, 0, 0, 0);
      
      if (startIndex === -1 && currentDate.getTime() >= startDate.getTime()) {
        startIndex = i;
      }
      
      if (currentDate.getTime() <= endDate.getTime()) {
        endIndex = i;
      }
    }

    // 範囲外の場合
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[dates.length - 1]);
      firstDate.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);
      
      if (endDate < firstDate || startDate > lastDate) {
        return { width: 0, left: 0 };
      }
      
      if (startIndex === -1) startIndex = 0;
      if (endIndex === -1) endIndex = dates.length - 1;
    }

    // パーセント計算
    const left = (startIndex / dates.length) * 100;
    const width = ((endIndex - startIndex + 1) / dates.length) * 100;
    
    return { 
      left: Math.max(0, left), 
      width: Math.max(0.5, Math.min(100 - left, width))
    };
    
  } catch (error) {
    console.warn('Gantt date parsing error:', error);
    return { width: 0, left: 0 };
  }
};

// 稼働率計算
export const calculateResourceUtilization = (
  resourceProcesses: Process[], 
  datesLength: number
): number => {
  const totalHours = resourceProcesses.reduce(
    (sum, p) => sum + calculateTotalHours(p.workDetails), 0
  );
  const workingDaysInRange = datesLength * 8;
  return workingDaysInRange > 0 
    ? Math.min((totalHours / workingDaysInRange) * 100, 100) 
    : 0;
};

// プロセスグループ化
// プロセスグループ化
export const groupProcesses = (
 processes: Process[], 
 viewType: "machine" | "person" | "project"
): Record<string, Process[]> => {
 let grouped: Record<string, Process[]> = {};

 if (viewType === "machine") {
   processes.forEach((process) => {
     process.assignedMachines.forEach((machine) => {
       const key = machine || "未割当";
       if (!grouped[key]) grouped[key] = [];
       grouped[key].push(process);
     });
     if (process.assignedMachines.length === 0) {
       if (!grouped["未割当"]) grouped["未割当"] = [];
       grouped["未割当"].push(process);
     }
   });
 } else if (viewType === "person") {
   processes.forEach((process) => {
     const key = process.fieldPerson || "未割当";
     if (!grouped[key]) grouped[key] = [];
     grouped[key].push(process);
   });
 } else if (viewType === "project") {
   processes.forEach((process) => {
     const key = `${process.orderClient} - ${process.projectName}`;
     if (!grouped[key]) grouped[key] = [];
     
     const projectProcess = {
       ...process,
       processingPlanDate: process.arrivalDate || process.processingPlanDate,
       dueDate: process.shipmentDate
     };
     
     grouped[key].push(projectProcess);
   });
 }

  // ここで順番を固定！
  const sortedEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(sortedEntries);
};
// 稼働率の色分け
export const getUtilizationColor = (utilization: number): string => {
  if (utilization > 90) return "text-red-600 bg-red-50 border-red-200";
  if (utilization > 70) return "text-amber-600 bg-amber-50 border-amber-200";
  if (utilization > 50) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  return "text-blue-600 bg-blue-50 border-blue-200";
};

// ステータスバッジのスタイル
export const getStatusBadgeStyle = (status: Process["status"]) => {
  const styles = {
    planning: "bg-slate-100 text-slate-700 border-slate-300",
    "data-work": "bg-purple-100 text-purple-700 border-purple-300",
    processing: "bg-blue-100 text-blue-700 border-blue-300",
    finishing: "bg-amber-100 text-amber-700 border-amber-300",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
    delayed: "bg-red-100 text-red-700 border-red-300",
  };
  const labels = {
    planning: "計画",
    "data-work": "データ",
    processing: "加工",
    finishing: "仕上",
    completed: "完了",
    delayed: "遅延",
  };
  return { style: styles[status], label: labels[status] };
};

// 日付文字列を安全にDateオブジェクトに変換
export const parseDate = (dateStr: string): Date => {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
};

// 2つの日付間の日数を計算
export const getDaysBetween = (date1: Date, date2: Date): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};