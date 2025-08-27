import React from "react";
import { Process } from "@/app/tasks/types";

interface StatusBadgeProps {
  status: Process["status"];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    planning: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600",
    "data-work": "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-600",
    processing: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-600",
    finishing: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600",
    completed: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600",
    delayed: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-600",
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
