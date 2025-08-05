import React from "react";
import { Building2 } from "lucide-react";
import { getClientColor } from "@/app/tasks/constants";

interface ClientBadgeProps {
  clientName: string;
}

export const ClientBadge: React.FC<ClientBadgeProps> = ({ clientName }) => {
  const clientColor = getClientColor(clientName);

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shadow-sm"
      style={{
        backgroundColor: `${clientColor}30`, // 薄い背景色
        color: "#374151", // グレー系のテキスト色
      }}
    >
      <Building2
        className="w-3 h-3"
        style={{ color: clientColor }} // アイコンは元の受注先色
      />
      <span className="truncate max-w-20">{clientName}</span>
    </div>
  );
};
