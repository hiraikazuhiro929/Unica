import React from "react";
import { Process } from "@/app/tasks/types";

interface StatusBadgeProps {
  status: Process["status"];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    planning: "bg-gray-100 text-gray-800 border-gray-300",
    "data-work": "bg-purple-100 text-purple-800 border-purple-300",
    processing: "bg-blue-100 text-blue-800 border-blue-300",
    finishing: "bg-orange-100 text-orange-800 border-orange-300",
    completed: "bg-green-100 text-green-800 border-green-300",
    delayed: "bg-red-100 text-red-800 border-red-300",
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
