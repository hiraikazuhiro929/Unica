import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings } from "lucide-react";
import { Process } from "@/app/tasks/types";
import { getMachinesFromWorkHours } from "@/app/tasks/utils/machineUtils";

interface AssignmentSectionProps {
  process: Process;
  onProcessChange: (process: Process) => void;
  isNew: boolean;
}

export const AssignmentSection: React.FC<AssignmentSectionProps> = ({
  process,
  onProcessChange,
  isNew,
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [workHoursMachines, setWorkHoursMachines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 工数管理から機械情報を取得
  useEffect(() => {
    const fetchMachines = async () => {
      if (!process.id || isNew) return;

      setLoading(true);
      try {
        const machines = await getMachinesFromWorkHours(process.id);
        setWorkHoursMachines(machines);
      } catch (error) {
        console.error('機械情報の取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, [process.id, isNew]);

  const handleFieldChange = (field: keyof Process, value: any) => {
    onProcessChange({ ...process, [field]: value });
  };

  const handleNavigateToWorkHours = () => {
    if (!process.id) {
      alert('工程を保存してから工数管理に移動してください。');
      return;
    }
    // 工数管理画面に遷移
    window.open(`/work-hours?fromProcess=${process.id}&orderId=${process.orderId || ''}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
        担当者・機械
      </h3>
      <div className="space-y-4">
        {/* 営業担当 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">営業担当</Label>
          {editingField !== "salesPerson" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("salesPerson")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {process.salesPerson || "未設定"}
              </span>
            </div>
          ) : (
            <Input
              value={process.salesPerson}
              onChange={(e) => handleFieldChange("salesPerson", e.target.value)}
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingField(null);
                }
              }}
              className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 dark:bg-slate-800 dark:text-white"
              autoFocus
            />
          )}
        </div>

        {/* 担当者 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">担当者</Label>
          {editingField !== "assignee" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("assignee")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {process.assignee || "未設定"}
              </span>
            </div>
          ) : (
            <Input
              value={process.assignee}
              onChange={(e) => handleFieldChange("assignee", e.target.value)}
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingField(null);
                }
              }}
              className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 dark:bg-slate-800 dark:text-white"
              autoFocus
            />
          )}
        </div>

        {/* 現場担当 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">現場担当</Label>
          {editingField !== "fieldPerson" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("fieldPerson")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {process.fieldPerson || "未設定"}
              </span>
            </div>
          ) : (
            <Input
              value={process.fieldPerson}
              onChange={(e) => handleFieldChange("fieldPerson", e.target.value)}
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingField(null);
                }
              }}
              className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 dark:bg-slate-800 dark:text-white"
              autoFocus
            />
          )}
        </div>

        {/* 割当機械（工数管理から取得） */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-gray-700 dark:text-gray-300 font-medium">割当機械</Label>
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToWorkHours}
                className="text-xs border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Settings className="w-3 h-3 mr-1" />
                工数管理で設定
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>

          <div className="p-3 rounded-lg border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm min-h-[44px] flex items-center">
            {loading ? (
              <span className="text-gray-500 dark:text-gray-400 text-sm">読み込み中...</span>
            ) : workHoursMachines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {workHoursMachines.map((machine, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                  >
                    {machine}
                  </span>
                ))}
              </div>
            ) : isNew ? (
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                工程保存後、工数管理で機械を設定してください
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                工数管理で機械が設定されていません
              </span>
            )}
          </div>

          {!isNew && workHoursMachines.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              工数管理で各作業の機械を設定すると、ここに表示されます
            </p>
          )}
        </div>
      </div>
    </div>
  );
};