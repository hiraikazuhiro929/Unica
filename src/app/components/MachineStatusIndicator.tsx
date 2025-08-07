"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Wrench,
  Zap,
  Activity
} from 'lucide-react';

interface MachineStatusIndicatorProps {
  machineId: string;
  machineName?: string;
  status?: 'available' | 'busy' | 'maintenance' | 'offline';
  utilizationRate?: number;
  currentJob?: string;
  nextAvailable?: string;
  showDetails?: boolean;
}

const MachineStatusIndicator: React.FC<MachineStatusIndicatorProps> = ({
  machineId,
  machineName,
  status = 'available',
  utilizationRate,
  currentJob,
  nextAvailable,
  showDetails = false
}) => {
  const getStatusInfo = (status: string) => {
    const statusMap = {
      available: {
        label: '利用可能',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        dotColor: 'text-green-500'
      },
      busy: {
        label: '稼働中',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Activity,
        dotColor: 'text-blue-500'
      },
      maintenance: {
        label: '保守中',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Wrench,
        dotColor: 'text-orange-500'
      },
      offline: {
        label: 'オフライン',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle,
        dotColor: 'text-red-500'
      }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.available;
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  if (!showDetails) {
    // Compact display for process cards
    return (
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor.replace('text-', 'bg-')}`} />
        <span className="text-sm truncate">{machineName || machineId}</span>
        <Badge className={`${statusInfo.color} text-xs px-1 py-0`}>
          {statusInfo.label}
        </Badge>
      </div>
    );
  }

  // Detailed display
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <StatusIcon className={`w-4 h-4 ${statusInfo.dotColor}`} />
          <span className="font-medium text-gray-900">
            {machineName || machineId}
          </span>
        </div>
        <Badge className={`${statusInfo.color} text-xs px-2 py-1`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Utilization Bar */}
      {utilizationRate !== undefined && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>稼働率</span>
            <span>{utilizationRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                utilizationRate >= 90 ? 'bg-red-500' :
                utilizationRate >= 70 ? 'bg-yellow-500' :
                utilizationRate >= 40 ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${utilizationRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Job */}
      {currentJob && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">現在の作業:</span> {currentJob}
        </div>
      )}

      {/* Next Available */}
      {nextAvailable && status === 'busy' && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">次回空き:</span> {nextAvailable}
        </div>
      )}
    </div>
  );
};

export default MachineStatusIndicator;