import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "gray";
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = "blue",
  subtitle,
}) => {
  const colorStyles = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    green: "text-green-600 bg-green-50 border-green-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    red: "text-red-600 bg-red-50 border-red-200",
    gray: "text-gray-600 bg-gray-50 border-gray-200",
  };

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <span>
        {title}:{" "}
        <span
          className={`font-bold ${
            color === "blue"
              ? "text-blue-600"
              : color === "green"
              ? "text-green-600"
              : color === "purple"
              ? "text-purple-600"
              : "text-gray-600"
          }`}
        >
          {value}
        </span>
      </span>
      {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
    </div>
  );
};
