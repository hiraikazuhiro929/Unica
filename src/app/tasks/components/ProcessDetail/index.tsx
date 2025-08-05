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
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
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
        <div className="flex justify-between gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex gap-3">
            {/* 工数管理への遷移ボタン（既存工程のみ） */}
            {!isNew && editedProcess.id && (
              <Button
                variant="outline"
                onClick={handleMoveToWorkHours}
                className="border-green-300 text-green-600 hover:bg-green-50"
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
                <Button variant="outline" onClick={onClose}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  追加
                </Button>
              </>
            )}
            {!isNew && (
              <Button variant="outline" onClick={onClose}>
                閉じる
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
