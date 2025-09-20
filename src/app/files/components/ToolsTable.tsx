"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye } from "lucide-react";

interface ToolData {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  location: string;
  lastUsed: string;
  purchasePrice: number;
  currentValue: number;
  condition: string;
}

interface ToolsTableProps {
  toolsData: ToolData[];
}

const ToolsTable: React.FC<ToolsTableProps> = ({ toolsData }) => {
  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
          <tr>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">工具名</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">種類</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">メーカー/型番</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">シリアル番号</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">状態</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">設置場所</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">最終使用日</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">購入価格</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">現在価値</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">状態</th>
            <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">操作</th>
          </tr>
        </thead>
        <tbody>
          {toolsData.map(tool => (
            <tr key={tool.id} className="border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50">
              <td className="p-4 text-sm">{tool.name}</td>
              <td className="p-4 text-sm">{tool.type}</td>
              <td className="p-4 text-sm">
                <div>
                  <div>{tool.brand}</div>
                  <div className="text-xs text-gray-500">{tool.model}</div>
                </div>
              </td>
              <td className="p-4 text-sm font-mono">{tool.serialNumber}</td>
              <td className="p-4">
                <Badge variant={tool.status === '利用可能' ? 'default' : 'secondary'}>
                  {tool.status}
                </Badge>
              </td>
              <td className="p-4 text-sm">{tool.location}</td>
              <td className="p-4 text-sm">{tool.lastUsed}</td>
              <td className="p-4 text-sm">¥{tool.purchasePrice.toLocaleString()}</td>
              <td className="p-4 text-sm font-medium">¥{tool.currentValue.toLocaleString()}</td>
              <td className="p-4">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {tool.condition}
                </Badge>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ToolsTable;