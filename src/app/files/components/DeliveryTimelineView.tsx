"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Receipt, Calendar, Package, Truck, CheckCircle, 
  Clock, Eye, Download, Edit, ChevronRight,
  TrendingUp, Building2, MapPin
} from "lucide-react";

interface DeliveryItem {
  id: string;
  deliveryNumber: string;
  orderNumber: string;
  clientName: string;
  clientAddress: string;
  deliveryDate: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  tax: number;
  finalAmount: number;
  deliveryMethod: string;
  trackingNumber?: string;
  status: "pending" | "shipped" | "delivered" | "completed";
  createdDate: string;
}

interface DeliveryTimelineViewProps {
  deliveries: DeliveryItem[];
  onView: (delivery: DeliveryItem) => void;
  onDownload: (delivery: DeliveryItem) => void;
  onEdit: (delivery: DeliveryItem) => void;
  viewMode?: "timeline" | "kanban";
}

export const DeliveryTimelineView: React.FC<DeliveryTimelineViewProps> = ({
  deliveries,
  onView,
  onDownload,
  onEdit,
  viewMode = "timeline"
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const groupByMonth = () => {
    return deliveries.reduce((acc, delivery) => {
      const month = delivery.deliveryDate.substring(0, 7);
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(delivery);
      return acc;
    }, {} as Record<string, DeliveryItem[]>);
  };

  const groupByStatus = () => {
    return {
      pending: deliveries.filter(d => d.status === "pending"),
      shipped: deliveries.filter(d => d.status === "shipped"),
      delivered: deliveries.filter(d => d.status === "delivered"),
      completed: deliveries.filter(d => d.status === "completed")
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "shipped": return <Truck className="w-4 h-4" />;
      case "delivered": return <Package className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "shipped": return "bg-blue-100 text-blue-700 border-blue-300";
      case "delivered": return "bg-purple-100 text-purple-700 border-purple-300";
      case "completed": return "bg-green-100 text-green-700 border-green-300";
      default: return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "未発送";
      case "shipped": return "発送済";
      case "delivered": return "配達完了";
      case "completed": return "完了";
      default: return status;
    }
  };

  const renderTimelineView = () => {
    const monthlyDeliveries = groupByMonth();
    const sortedMonths = Object.keys(monthlyDeliveries).sort().reverse();

    return (
      <div className="space-y-6">
        {sortedMonths.map((month) => {
          const monthDeliveries = monthlyDeliveries[month];
          const totalAmount = monthDeliveries.reduce((sum, d) => sum + d.finalAmount, 0);
          const isExpanded = expandedMonths.has(month) || sortedMonths.indexOf(month) === 0;

          return (
            <div key={month} className="relative">
              <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-300 dark:bg-slate-600" />
              
              <div
                className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg p-2 -ml-2"
                onClick={() => toggleMonth(month)}
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center z-10">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-lg">
                    {new Date(month + "-01").toLocaleDateString("ja-JP", { 
                      year: "numeric", 
                      month: "long" 
                    })}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-400">
                    <span>{monthDeliveries.length}件</span>
                    <span className="flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      ¥{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </div>

              {isExpanded && (
                <div className="ml-14 mt-4 space-y-3">
                  {monthDeliveries.map((delivery, index) => (
                    <Card 
                      key={delivery.id} 
                      className="hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(delivery.status)}
                              <span className="font-medium">
                                {delivery.deliveryNumber}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getStatusColor(delivery.status)}`}
                              >
                                {getStatusLabel(delivery.status)}
                              </Badge>
                            </div>

                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                                <Building2 className="w-3 h-3 mr-2" />
                                {delivery.clientName}
                              </div>
                              <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                                <MapPin className="w-3 h-3 mr-2" />
                                {delivery.clientAddress.substring(0, 30)}...
                              </div>
                              <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                                <Calendar className="w-3 h-3 mr-2" />
                                納品日: {delivery.deliveryDate}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-sm">
                                <span className="text-gray-500">商品: </span>
                                <span className="font-medium">{delivery.items.length}点</span>
                              </div>
                              <div className="text-lg font-semibold">
                                ¥{delivery.finalAmount.toLocaleString()}
                              </div>
                            </div>

                            {delivery.trackingNumber && (
                              <div className="mt-2 text-xs text-blue-600">
                                追跡番号: {delivery.trackingNumber}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onView(delivery)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownload(delivery)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(delivery)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderKanbanView = () => {
    const statusGroups = groupByStatus();
    const columns = [
      { key: "pending", label: "未発送", color: "border-yellow-500" },
      { key: "shipped", label: "発送済", color: "border-blue-500" },
      { key: "delivered", label: "配達完了", color: "border-purple-500" },
      { key: "completed", label: "完了", color: "border-green-500" }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.key} className="space-y-3">
            <div className={`border-t-4 ${column.color} bg-white dark:bg-slate-800 rounded-lg p-3`}>
              <h3 className="font-semibold flex items-center justify-between">
                {column.label}
                <Badge variant="outline">{statusGroups[column.key as keyof typeof statusGroups].length}</Badge>
              </h3>
            </div>

            <div className="space-y-3">
              {statusGroups[column.key as keyof typeof statusGroups].map((delivery) => (
                <Card 
                  key={delivery.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onView(delivery)}
                >
                  <div className="p-3">
                    <div className="font-medium text-sm mb-2">
                      {delivery.deliveryNumber}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
                      <div>{delivery.clientName}</div>
                      <div>{delivery.deliveryDate}</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ¥{delivery.finalAmount.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7"
                        onClick={() => onDownload(delivery)}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7"
                        onClick={() => onEdit(delivery)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return viewMode === "timeline" ? renderTimelineView() : renderKanbanView();
};