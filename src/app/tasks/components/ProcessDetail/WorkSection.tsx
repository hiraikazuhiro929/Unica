import React from "react";
import { Label } from "@/components/ui/label";
import { Process } from "@/app/tasks/types";
import { calculateTotalHours } from "@/app/tasks/constants";

interface WorkSectionProps {
  process: Process;
  onProcessChange: (process: Process) => void;
  isNew: boolean;
}

export const WorkSection: React.FC<WorkSectionProps> = ({
  process,
  onProcessChange,
  isNew,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
        作業内容
      </h3>
      <div className="space-y-3">
        {/* 基本工数 */}
        <div className="space-y-3">
          <div className="flex items-center py-1">
            <Label className="text-gray-700 dark:text-gray-300 font-medium w-32">
              段取り (時間)
            </Label>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {process.workDetails.setup}H
            </span>
          </div>

          <div className="flex items-center py-1">
            <Label className="text-gray-700 dark:text-gray-300 font-medium w-32">
              機械加工 (時間)
            </Label>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {process.workDetails.machining}H
            </span>
          </div>

          <div className="flex items-center py-1">
            <Label className="text-gray-700 dark:text-gray-300 font-medium w-32">
              仕上げ (時間)
            </Label>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {process.workDetails.finishing}H
            </span>
          </div>
        </div>

        {/* 追加工数（値が0より大きい場合のみ表示） */}
        {((process.workDetails.additionalSetup &&
          process.workDetails.additionalSetup > 0) ||
          (process.workDetails.additionalMachining &&
            process.workDetails.additionalMachining > 0) ||
          (process.workDetails.additionalFinishing &&
            process.workDetails.additionalFinishing > 0)) && (
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">追加工数</h4>

            {process.workDetails.additionalSetup &&
              process.workDetails.additionalSetup > 0 && (
                <div className="flex items-center py-1">
                  <Label className="text-gray-700 dark:text-gray-300 font-medium w-32">
                    追加段取り
                  </Label>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {process.workDetails.additionalSetup}H
                  </span>
                </div>
              )}

            {process.workDetails.additionalMachining &&
              process.workDetails.additionalMachining > 0 && (
                <div className="flex items-center py-1">
                  <Label className="text-gray-700 dark:text-gray-300 font-medium w-32">
                    追加機械加工
                  </Label>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {process.workDetails.additionalMachining}H
                  </span>
                </div>
              )}

            {process.workDetails.additionalFinishing &&
              process.workDetails.additionalFinishing > 0 && (
                <div className="flex items-center py-1">
                  <Label className="text-gray-700 dark:text-gray-300 font-medium w-32">
                    追加仕上げ
                  </Label>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {process.workDetails.additionalFinishing}H
                  </span>
                </div>
              )}
          </div>
        )}

        {/* 合計工数 */}
        <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg p-4 border-2 border-orange-200">
          <div className="text-lg font-bold text-orange-800">
            合計工数: {calculateTotalHours(process.workDetails)} 時間
          </div>
        </div>
      </div>
    </div>
  );
};
