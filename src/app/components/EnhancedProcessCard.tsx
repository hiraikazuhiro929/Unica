"use client";

import React, { useState } from 'react';
import { Process } from '@/app/tasks/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import MachineStatusIndicator from './MachineStatusIndicator';
import ProcessStatusUpdateModal from './ProcessStatusUpdateModal';
import {
  Clock,
  User,
  Factory,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  ArrowRight,
  Calendar,
  Wrench,
  Package,
  Timer,
  TrendingUp,
  AlertCircle,
  Settings,
  Eye,
  Edit3,
  Zap,
  Target,
  Activity
} from 'lucide-react';

interface EnhancedProcessCardProps {
  process: Process;
  onStatusUpdate?: (processId: string, newStatus: Process['status']) => void;
  onViewDetails?: (processId: string) => void;
  onEdit?: (processId: string) => void;
}

const EnhancedProcessCard: React.FC<EnhancedProcessCardProps> = ({
  process,
  onStatusUpdate,
  onViewDetails,
  onEdit
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Calculate progress and status indicators
  const calculateProgress = (): number => {
    if (!process.workDetails) return 0;
    
    if (process.workDetails.useDynamicSteps && process.workDetails.customSteps) {
      const completedSteps = process.workDetails.customSteps.filter(step => step.isCompleted).length;
      return Math.round((completedSteps / process.workDetails.customSteps.length) * 100);
    }
    
    // Traditional calculation
    const total = process.workDetails.setup + process.workDetails.machining + process.workDetails.finishing;
    const actual = process.workDetails.totalActualHours;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((actual / total) * 100));
  };

  const getDueDateStatus = () => {
    if (!process.dueDate) return null;
    
    const dueDate = new Date(process.dueDate);
    const now = new Date();
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) {
      return { type: 'overdue', label: '期限超過', color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (diffHours <= 2) {
      return { type: 'due-now', label: '期限迫る', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    } else if (diffHours <= 24) {
      return { type: 'due-today', label: '本日期限', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else if (diffHours <= 72) {
      return { type: 'due-soon', label: '期限近し', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    return null;
  };

  const getStatusInfo = (status: Process['status']) => {
    const statusMap = {
      planning: { label: '計画中', color: 'bg-gray-100 text-gray-800', icon: Target, bgColor: 'bg-gray-50' },
      'data-work': { label: 'データ作業', color: 'bg-blue-100 text-blue-800', icon: Settings, bgColor: 'bg-blue-50' },
      processing: { label: '加工中', color: 'bg-green-100 text-green-800', icon: Play, bgColor: 'bg-green-50' },
      finishing: { label: '仕上げ中', color: 'bg-yellow-100 text-yellow-800', icon: Wrench, bgColor: 'bg-yellow-50' },
      completed: { label: '完了', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, bgColor: 'bg-emerald-50' },
      delayed: { label: '遅延', color: 'bg-red-100 text-red-800', icon: AlertTriangle, bgColor: 'bg-red-50' }
    };
    return statusMap[status] || statusMap.planning;
  };

  const getPriorityInfo = (priority: Process['priority']) => {
    const priorityMap = {
      high: { label: '緊急', color: 'bg-red-500 text-white', icon: AlertTriangle },
      medium: { label: '通常', color: 'bg-blue-500 text-white', icon: Activity },
      low: { label: '低', color: 'bg-gray-500 text-white', icon: Timer }
    };
    return priorityMap[priority] || priorityMap.medium;
  };


  const progress = calculateProgress();
  const dueDateStatus = getDueDateStatus();
  const statusInfo = getStatusInfo(process.status);
  const priorityInfo = getPriorityInfo(process.priority);
  const StatusIcon = statusInfo.icon;
  const PriorityIcon = priorityInfo.icon;

  const efficiency = process.workDetails ? 
    Math.round((process.workDetails.totalEstimatedHours / (process.workDetails.totalActualHours || 1)) * 100) : 100;

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}分`;
    return `${hours.toFixed(1)}時間`;
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${statusInfo.bgColor} border-gray-200 hover:border-blue-300`}>
      {/* Main Card Header */}
      <div className="p-4">
        {/* Top Row: Title, Status, and Priority */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <StatusIcon className="w-4 h-4 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {process.projectName}
              </h3>
              <Badge className={statusInfo.color + ' text-xs px-2 py-1'}>
                {statusInfo.label}
              </Badge>
              {process.priority === 'high' && (
                <Badge className={priorityInfo.color + ' text-xs px-2 py-1 flex items-center'}>
                  <PriorityIcon className="w-3 h-3 mr-1" />
                  {priorityInfo.label}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Package className="w-4 h-4 mr-1" />
                {process.managementNumber}
              </span>
              <span className="flex items-center">
                <Factory className="w-4 h-4 mr-1" />
                {process.orderClient}
              </span>
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {process.assignee}
              </span>
            </div>
          </div>

          {/* Due Date Warning */}
          {dueDateStatus && (
            <div className={`px-2 py-1 rounded-md text-xs font-medium border ${dueDateStatus.color}`}>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {dueDateStatus.label}
              </div>
              <div className="text-xs opacity-75">
                {formatDueDate(process.dueDate)}
              </div>
            </div>
          )}
        </div>

        {/* Manufacturing Details Row */}
        <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
          {/* Machines */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">割当機械</div>
            <div className="space-y-1">
              {process.assignedMachines.map((machine, index) => {
                // Mock machine status data - in real implementation, this would come from API
                const mockStatus = ['available', 'busy', 'maintenance'][Math.floor(Math.random() * 3)] as 'available' | 'busy' | 'maintenance';
                const mockUtilization = Math.floor(Math.random() * 100);
                
                return (
                  <MachineStatusIndicator
                    key={index}
                    machineId={machine}
                    machineName={machine}
                    status={mockStatus}
                    utilizationRate={mockUtilization}
                    showDetails={false}
                  />
                );
              })}
            </div>
          </div>

          {/* Work Details */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">作業内訳</div>
            {process.workDetails && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>段取り:</span>
                  <span>{formatTime(process.workDetails.setup)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>加工:</span>
                  <span>{formatTime(process.workDetails.machining)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>仕上げ:</span>
                  <span>{formatTime(process.workDetails.finishing)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Progress */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">数量・進捗</div>
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span>数量:</span>
                <span className="font-medium">{process.quantity}個</span>
              </div>
              <div className="flex justify-between items-center">
                <span>進捗:</span>
                <span className={`font-bold ${
                  progress >= 90 ? 'text-green-600' : 
                  progress >= 70 ? 'text-blue-600' : 
                  progress >= 40 ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar with Work Hours */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">全体進捗</span>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>実績: {formatTime(process.workDetails?.totalActualHours || 0)}</span>
              <span>予定: {formatTime(process.workDetails?.totalEstimatedHours || 0)}</span>
              <span className={`font-medium ${efficiency >= 100 ? 'text-green-600' : efficiency >= 80 ? 'text-blue-600' : 'text-red-600'}`}>
                効率: {efficiency}%
              </span>
            </div>
          </div>
          <Progress 
            value={progress} 
            className="h-3 bg-gray-200"
            style={{
              '--progress-background': progress >= 90 ? '#10b981' : 
                                    progress >= 70 ? '#3b82f6' : 
                                    progress >= 40 ? '#f59e0b' : '#6b7280'
            } as React.CSSProperties}
          />
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Quick Status Updates */}
            {process.status !== 'completed' && onStatusUpdate && (
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowStatusModal(true)}
                  className="text-xs px-3 py-1 h-auto"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  状況更新
                </Button>
                
                {/* Quick next step button */}
                {process.status === 'planning' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusUpdate(process.id, 'data-work')}
                    className="text-xs px-2 py-1 h-auto bg-blue-50 hover:bg-blue-100"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    開始
                  </Button>
                )}
                {process.status === 'data-work' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusUpdate(process.id, 'processing')}
                    className="text-xs px-2 py-1 h-auto bg-green-50 hover:bg-green-100"
                  >
                    <Factory className="w-3 h-3 mr-1" />
                    加工へ
                  </Button>
                )}
                {process.status === 'processing' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusUpdate(process.id, 'finishing')}
                    className="text-xs px-2 py-1 h-auto bg-yellow-50 hover:bg-yellow-100"
                  >
                    <Wrench className="w-3 h-3 mr-1" />
                    仕上げへ
                  </Button>
                )}
                {process.status === 'finishing' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusUpdate(process.id, 'completed')}
                    className="text-xs px-2 py-1 h-auto bg-emerald-50 hover:bg-emerald-100"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    完了
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewDetails(process.id)}
                className="text-xs px-2 py-1 h-auto"
              >
                <Eye className="w-3 h-3 mr-1" />
                詳細
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(process.id)}
                className="text-xs px-2 py-1 h-auto"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                編集
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs px-2 py-1 h-auto"
            >
              <ArrowRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: Detailed Work Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                作業詳細情報
              </h4>
              
              <div className="space-y-3 text-sm">
                {/* Dynamic Work Steps */}
                {process.workDetails?.useDynamicSteps && process.workDetails.customSteps && (
                  <div>
                    <div className="font-medium text-gray-700 mb-2">作業工程</div>
                    <div className="space-y-2">
                      {process.workDetails.customSteps.map((step, index) => (
                        <div key={step.id} className={`flex items-center justify-between p-2 rounded ${
                          step.isCompleted ? 'bg-green-100' : 'bg-white'
                        }`}>
                          <div className="flex items-center">
                            {step.isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2" />
                            )}
                            <span className="font-medium">{step.nameJapanese}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{step.actualHours}h / {step.estimatedHours}h</span>
                            {step.machineRequired && (
                              <Badge variant="outline" className="text-xs">
                                {step.machineRequired}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Material & Specifications */}
                <div>
                  <div className="font-medium text-gray-700 mb-1">仕様・材料</div>
                  <div className="text-gray-600">
                    数量: {process.quantity}個<br/>
                    {process.remarks && (
                      <>備考: {process.remarks}</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Schedule & Status Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                スケジュール・状況
              </h4>
              
              <div className="space-y-3 text-sm">
                {/* Schedule Timeline */}
                <div>
                  <div className="font-medium text-gray-700 mb-2">重要日程</div>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>受注日:</span>
                      <span>{new Date(process.orderDate).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>納期:</span>
                      <span className={dueDateStatus ? 'font-medium text-red-600' : ''}>
                        {new Date(process.shipmentDate).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>データ作業:</span>
                      <span>{new Date(process.dataWorkDate).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>加工予定:</span>
                      <span>{new Date(process.processingPlanDate).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <div className="font-medium text-gray-700 mb-2">実績指標</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded">
                      <div className="text-xs text-gray-500">効率性</div>
                      <div className={`font-bold ${
                        efficiency >= 100 ? 'text-green-600' : 
                        efficiency >= 80 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {efficiency}%
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="text-xs text-gray-500">進捗率</div>
                      <div className={`font-bold ${
                        progress >= 90 ? 'text-green-600' : 
                        progress >= 70 ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {progress}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Information */}
                <div>
                  <div className="font-medium text-gray-700 mb-2">担当者情報</div>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>営業:</span>
                      <span>{process.salesPerson}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>現場:</span>
                      <span>{process.fieldPerson}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && onStatusUpdate && (
        <ProcessStatusUpdateModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          process={process}
          onStatusUpdate={async (processId, newStatus, notes) => {
            await onStatusUpdate(processId, newStatus);
            // Here you might also want to save the notes or create a log entry
            if (notes) {
              console.log(`Status update notes for ${processId}:`, notes);
            }
          }}
        />
      )}
    </div>
  );
};

export default EnhancedProcessCard;