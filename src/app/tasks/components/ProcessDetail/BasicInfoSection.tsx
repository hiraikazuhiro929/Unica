import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Process, Company } from "@/app/tasks/types";

interface BasicInfoSectionProps {
  process: Process;
  onProcessChange: (process: Process) => void;
  generateLineNumber: (orderClient: string) => string;
  companies: Company[];
  isNew: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  process,
  onProcessChange,
  generateLineNumber,
  companies,
  isNew,
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleFieldChange = (field: keyof Process, value: any) => {
    let newProcess = { ...process, [field]: value };

    // 受注先が変更された場合、ライン番号を自動生成
    if (field === "orderClient" && value) {
      const newLineNumber = generateLineNumber(value);
      newProcess = { ...newProcess, lineNumber: newLineNumber };
    }

    onProcessChange(newProcess);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
        基本情報
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {/* 案件名 */}
        <div className="col-span-2">
          <Label className="text-gray-700 dark:text-gray-300 font-medium">案件名</Label>
          {editingField !== "projectName" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("projectName")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {process.projectName || "未設定"}
              </span>
            </div>
          ) : (
            <Input
              value={process.projectName}
              onChange={(e) => handleFieldChange("projectName", e.target.value)}
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

        {/* 管理番号 */}
        <div className="col-span-2">
          <Label className="text-gray-700 dark:text-gray-300 font-medium">管理番号</Label>
          {editingField !== "managementNumber" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("managementNumber")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {process.managementNumber || "未設定"}
              </span>
            </div>
          ) : (
            <Input
              value={process.managementNumber}
              onChange={(e) =>
                handleFieldChange("managementNumber", e.target.value)
              }
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

        {/* 受注先 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">受注先</Label>
          <div className="relative">
            {editingField !== "orderClient" ? (
              <div
                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
                onClick={() => setEditingField("orderClient")}
              >
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {process.orderClient || "未設定"}
                </span>
              </div>
            ) : (
              <>
                <Input
                  value={process.orderClient}
                  onChange={(e) =>
                    handleFieldChange("orderClient", e.target.value)
                  }
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingField(null);
                    }
                  }}
                  placeholder="受注先を入力..."
                  list="client-options"
                  className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 dark:bg-slate-800 dark:text-white"
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

        {/* 数量 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">数量</Label>
          {editingField !== "quantity" ? (
            <div
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all min-h-[44px] flex items-center bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              onClick={() => setEditingField("quantity")}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {process.quantity}個
              </span>
            </div>
          ) : (
            <Input
              type="number"
              value={process.quantity}
              onChange={(e) =>
                handleFieldChange("quantity", parseInt(e.target.value) || 0)
              }
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

        {/* 優先度 */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">優先度</Label>
          <Select
            value={process.priority}
            onValueChange={(value: Process["priority"]) =>
              handleFieldChange("priority", value)
            }
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

        {/* ステータス */}
        <div>
          <Label className="text-gray-700 dark:text-gray-300 font-medium">ステータス</Label>
          <Select
            value={process.status}
            onValueChange={(value: Process["status"]) =>
              handleFieldChange("status", value)
            }
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

        {/* 備考 */}
        <div className="col-span-2">
          <Label className="text-gray-700 dark:text-gray-300 font-medium">備考</Label>
          <Textarea
            value={process.remarks}
            onChange={(e) => handleFieldChange("remarks", e.target.value)}
            rows={3}
            className="border-2 border-gray-300 focus:border-blue-500"
            placeholder="備考を入力してください"
          />
        </div>
      </div>
    </div>
  );
};
