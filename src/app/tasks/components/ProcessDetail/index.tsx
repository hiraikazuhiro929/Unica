import React, { useState, useEffect } from "react";
import { X, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Process, Company } from "@/app/tasks/types";
import { getClientColor } from "@/app/tasks/constants";
import { BasicInfoSection } from "./BasicInfoSection";
import { ScheduleSection } from "./ScheduleSection";
import { WorkSection } from "./WorkSection";
import { AssignmentSection } from "./AssignmentSection";

interface ProcessDetailProps {
  process: Process;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProcess: Process) => void;
  generateLineNumber: (orderClient: string) => string;
  isNew?: boolean;
  companies: Company[];
}

export const ProcessDetail: React.FC<ProcessDetailProps> = ({
  process,
  isOpen,
  onClose,
  onSave,
  generateLineNumber,
  isNew = false,
  companies,
}) => {
  const [editedProcess, setEditedProcess] = useState<Process>(process);
  const router = useRouter();

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

  const handleProcessChange = (updatedProcess: Process) => {
    setEditedProcess(updatedProcess);
    if (!isNew) {
      onSave(updatedProcess);
    }
  };

  const handleMoveToWorkHours = () => {
    if (!editedProcess.id) {
      alert('工程を保存してから工数管理に移動してください。');
      return;
    }
    
    // 工数管理画面に工程IDを渡して遷移
    router.push(`/work-hours?fromProcess=${editedProcess.id}&orderId=${editedProcess.orderId || ''}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
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
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-black/50 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white p-6 flex-shrink-0 border-b border-slate-600 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {editedProcess.projectName || "新規工程"}
              </h2>
              <p className="text-slate-300 dark:text-slate-400 mt-1">
                {editedProcess.managementNumber && editedProcess.lineNumber
                  ? `${editedProcess.managementNumber} / ${editedProcess.lineNumber}`
                  : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors duration-200 hover:bg-slate-700 rounded-lg p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム */}
            <div className="space-y-6">
              <BasicInfoSection
                process={editedProcess}
                onProcessChange={handleProcessChange}
                generateLineNumber={generateLineNumber}
                companies={companies}
                isNew={isNew}
              />
              <ScheduleSection
                process={editedProcess}
                onProcessChange={handleProcessChange}
                isNew={isNew}
              />
            </div>

            {/* 右カラム */}
            <div className="space-y-6">
              <WorkSection
                process={editedProcess}
                onProcessChange={handleProcessChange}
                isNew={isNew}
              />
              <AssignmentSection
                process={editedProcess}
                onProcessChange={handleProcessChange}
                isNew={isNew}
              />
            </div>
          </div>
        </div>

        {/* フッターボタン */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex gap-3">
            {/* 工数管理への遷移ボタン（既存工程のみ） */}
            {!isNew && editedProcess.id && (
              <Button
                variant="outline"
                onClick={handleMoveToWorkHours}
                className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Clock className="w-4 h-4 mr-2" />
                工数管理
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            {isNew && (
              <>
                <Button variant="outline" onClick={onClose} className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  追加
                </Button>
              </>
            )}
            {!isNew && (
              <Button variant="outline" onClick={onClose} className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                閉じる
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
