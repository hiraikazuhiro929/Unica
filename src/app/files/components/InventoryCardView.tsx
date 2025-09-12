"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, Edit, QrCode, AlertTriangle, CheckCircle, 
  Clock, Wrench, Package, MapPin
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
    icon: any;
    color: string;
    bgColor: string;
  };
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  condition: "excellent" | "good" | "fair" | "poor" | "broken";
  status: "available" | "in-use" | "maintenance" | "repair" | "retired";
  location: string;
  currentValue: number;
  usageHours?: number;
  imageUrl?: string;
  qrCode?: string;
  nextMaintenanceDate?: string;
}

interface InventoryCardViewProps {
  items: InventoryItem[];
  onView: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onQRCode?: (item: InventoryItem) => void;
}

export const InventoryCardView: React.FC<InventoryCardViewProps> = ({
  items,
  onView,
  onEdit,
  onQRCode
}) => {
  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case "excellent":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "good":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "fair":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "poor":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "broken":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700 border-green-300";
      case "in-use":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "repair":
        return "bg-red-100 text-red-700 border-red-300";
      case "retired":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "利用可能";
      case "in-use": return "使用中";
      case "maintenance": return "メンテナンス";
      case "repair": return "修理中";
      case "retired": return "廃棄";
      default: return status;
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    const categoryId = item.category.id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        category: item.category,
        items: []
      };
    }
    acc[categoryId].items.push(item);
    return acc;
  }, {} as Record<string, { category: any; items: InventoryItem[] }>);

  return (
    <div className="space-y-8">
      {Object.values(groupedItems).map(({ category, items }) => {
        const Icon = category.icon;
        return (
          <div key={category.id}>
            <div className="flex items-center mb-4">
              <Icon className={`w-5 h-5 mr-2 ${category.color}`} />
              <h3 className="text-lg font-semibold">{category.name}</h3>
              <Badge variant="outline" className="ml-3">
                {items.length}件
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <Card 
                  key={item.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => onView(item)}
                >
                  {item.imageUrl && (
                    <div className="h-32 bg-gray-100 dark:bg-slate-700 relative">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {getConditionIcon(item.condition)}
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm line-clamp-2">
                        {item.name}
                      </h4>
                      {item.qrCode && onQRCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQRCode(item);
                          }}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-400">
                      <div>{item.brand} {item.model}</div>
                      {item.serialNumber && (
                        <div>S/N: {item.serialNumber}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(item.status)}`}
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.location}
                      </div>
                      <div className="text-xs font-medium">
                        ¥{item.currentValue.toLocaleString()}
                      </div>
                    </div>

                    {item.nextMaintenanceDate && (
                      <div className="flex items-center text-xs text-orange-600 mt-2">
                        <Wrench className="w-3 h-3 mr-1" />
                        次回: {item.nextMaintenanceDate}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onView(item)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        詳細
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        編集
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};