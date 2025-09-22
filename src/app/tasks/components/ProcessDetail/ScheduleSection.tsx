import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Process } from "@/app/tasks/types";

interface ScheduleSectionProps {
  process: Process;
  onProcessChange: (process: Process) => void;
  isNew: boolean;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  process,
  onProcessChange,
  isNew,
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);

  // 日付フォーマット関数
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "未設定";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "未設定";
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  // 日付更新ハンドラー
  const handleDateUpdate = (field: keyof Process, date: Date | undefined) => {
    const dateString = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")}`
      : "";

    const newProcess = { ...process, [field]: dateString };
    onProcessChange(newProcess);
    setEditingField(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
        スケジュール
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* 受注日 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">受注日</Label>
          {editingField !== "orderDate" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("orderDate")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {formatShortDate(process.orderDate)}
              </span>
            </div>
          ) : (
            <Popover
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingField(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 dark:bg-slate-800 dark:text-white"
                >
                  {formatShortDate(process.orderDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    process.orderDate ? new Date(process.orderDate) : undefined
                  }
                  onSelect={(date) => handleDateUpdate("orderDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* 入荷日 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">入荷日</Label>
          {editingField !== "arrivalDate" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("arrivalDate")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {formatShortDate(process.arrivalDate)}
              </span>
            </div>
          ) : (
            <Popover
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingField(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 dark:bg-slate-800 dark:text-white"
                >
                  {formatShortDate(process.arrivalDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    process.arrivalDate
                      ? new Date(process.arrivalDate)
                      : undefined
                  }
                  onSelect={(date) => handleDateUpdate("arrivalDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* データ作業日 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">データ作業日</Label>
          {editingField !== "dataWorkDate" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("dataWorkDate")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {formatShortDate(process.dataWorkDate)}
              </span>
            </div>
          ) : (
            <Popover
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingField(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 dark:bg-slate-800 dark:text-white"
                >
                  {formatShortDate(process.dataWorkDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    process.dataWorkDate
                      ? new Date(process.dataWorkDate)
                      : undefined
                  }
                  onSelect={(date) => handleDateUpdate("dataWorkDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* 加工開始予定日 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">加工開始予定日</Label>
          {editingField !== "processingPlanDate" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("processingPlanDate")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {formatShortDate(process.processingPlanDate)}
              </span>
            </div>
          ) : (
            <Popover
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingField(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 dark:bg-slate-800 dark:text-white"
                >
                  {formatShortDate(process.processingPlanDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    process.processingPlanDate
                      ? new Date(process.processingPlanDate)
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

        {/* 出荷日 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">出荷日</Label>
          {editingField !== "shipmentDate" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("shipmentDate")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {formatShortDate(process.shipmentDate)}
              </span>
            </div>
          ) : (
            <Popover
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingField(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 dark:bg-slate-800 dark:text-white"
                >
                  {formatShortDate(process.shipmentDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    process.shipmentDate
                      ? new Date(process.shipmentDate)
                      : undefined
                  }
                  onSelect={(date) => handleDateUpdate("shipmentDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* 納期 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">納期</Label>
          {editingField !== "dueDate" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("dueDate")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {formatShortDate(process.dueDate || process.shipmentDate)}
              </span>
            </div>
          ) : (
            <Popover
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setEditingField(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 dark:bg-slate-800 dark:text-white"
                >
                  {formatShortDate(process.dueDate || process.shipmentDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    process.dueDate
                      ? new Date(process.dueDate)
                      : process.shipmentDate
                      ? new Date(process.shipmentDate)
                      : undefined
                  }
                  onSelect={(date) => handleDateUpdate("dueDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
};
