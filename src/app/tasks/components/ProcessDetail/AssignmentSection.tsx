import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Process } from "@/app/tasks/types";
import { MachineSelector } from "../forms/MachineSelector";

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

  const handleFieldChange = (field: keyof Process, value: any) => {
    onProcessChange({ ...process, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-700 border-b-2 border-purple-200 pb-2">
        担当者・機械
      </h3>
      <div className="space-y-4">
        {/* 営業担当 */}
        <div>
          <Label className="text-gray-700 font-medium">営業担当</Label>
          {editingField !== "salesPerson" ? (
            <div
              className="p-3 hover:bg-purple-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-purple-200 transition-all min-h-[44px] flex items-center bg-gray-50"
              onClick={() => setEditingField("salesPerson")}
            >
              <span className="text-gray-800 font-medium">
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
              className="border-purple-300 focus:border-purple-500"
              autoFocus
            />
          )}
        </div>

        {/* 担当者 */}
        <div>
          <Label className="text-gray-700 font-medium">担当者</Label>
          {editingField !== "assignee" ? (
            <div
              className="p-3 hover:bg-purple-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-purple-200 transition-all min-h-[44px] flex items-center bg-gray-50"
              onClick={() => setEditingField("assignee")}
            >
              <span className="text-gray-800 font-medium">
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
              className="border-purple-300 focus:border-purple-500"
              autoFocus
            />
          )}
        </div>

        {/* 現場担当 */}
        <div>
          <Label className="text-gray-700 font-medium">現場担当</Label>
          {editingField !== "fieldPerson" ? (
            <div
              className="p-3 hover:bg-purple-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-purple-200 transition-all min-h-[44px] flex items-center bg-gray-50"
              onClick={() => setEditingField("fieldPerson")}
            >
              <span className="text-gray-800 font-medium">
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
              className="border-purple-300 focus:border-purple-500"
              autoFocus
            />
          )}
        </div>

        {/* 割当機械 */}
        <div>
          <Label className="text-gray-700 font-medium">割当機械</Label>
          <MachineSelector
            selectedMachines={process.assignedMachines}
            onMachinesChange={(machines) =>
              handleFieldChange("assignedMachines", machines)
            }
            placeholder="機械を選択してください"
          />
        </div>
      </div>
    </div>
  );
};
