"use client";

import React, { useState } from 'react';
import { Process } from '@/app/tasks/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Target,
  Settings,
  Play,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  Activity
} from 'lucide-react';

interface ProcessStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process;
  onStatusUpdate: (processId: string, newStatus: Process['status'], notes?: string) => Promise<void>;
}

const ProcessStatusUpdateModal: React.FC<ProcessStatusUpdateModalProps> = ({
  isOpen,
  onClose,
  process,
  onStatusUpdate
}) => {
  const [selectedStatus, setSelectedStatus] = useState<Process['status']>(process.status);
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions: Array<{
    status: Process['status'];
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    disabled?: boolean;
  }> = [
    {
      status: 'planning',
      label: '計画中',
      description: 'データ作業の準備段階',
      icon: Target,
      color: 'bg-gray-100 text-gray-800',
      disabled: process.status !== 'planning'
    },
    {
      status: 'data-work',
      label: 'データ作業',
      description: '図面・プログラム作成中',
      icon: Settings,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      status: 'processing',
      label: '加工中',
      description: '機械による製造加工中',
      icon: Play,
      color: 'bg-green-100 text-green-800'
    },
    {
      status: 'finishing',
      label: '仕上げ中',
      description: '最終仕上げ・検査中',
      icon: Wrench,
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      status: 'completed',
      label: '完了',
      description: '工程完了・納期準備完了',
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-800'
    },
    {
      status: 'delayed',
      label: '遅延',
      description: '予定より遅れている状態',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800'
    }
  ];

  const handleStatusUpdate = async () => {
    if (selectedStatus === process.status && !updateNotes.trim()) {
      onClose();
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(process.id, selectedStatus, updateNotes.trim());
      onClose();
    } catch (error) {
      console.error('Status update failed:', error);
      // Handle error - you might want to show a toast notification
    } finally {
      setIsUpdating(false);
    }
  };

  const getProgressForStatus = (status: Process['status']) => {
    const progressMap = {
      planning: 0,
      'data-work': 20,
      processing: 60,
      finishing: 85,
      completed: 100,
      delayed: process.progress // Keep current progress for delayed status
    };
    return progressMap[status];
  };

  const canTransitionTo = (fromStatus: Process['status'], toStatus: Process['status']) => {
    const transitions: Record<Process['status'], Process['status'][]> = {
      planning: ['data-work', 'delayed'],
      'data-work': ['processing', 'delayed'],
      processing: ['finishing', 'delayed'],
      finishing: ['completed', 'delayed'],
      completed: ['delayed'], // Only allow delayed from completed in case of rework
      delayed: ['data-work', 'processing', 'finishing', 'completed']
    };
    return transitions[fromStatus]?.includes(toStatus) || fromStatus === toStatus;
  };

  const getTimeEstimate = (status: Process['status']) => {
    // This would typically come from work details or historical data
    const estimates = {
      'planning': '1-2時間',
      'data-work': '2-4時間',
      processing: '8-12時間',
      finishing: '2-3時間',
      completed: '即座',
      delayed: '要調整'
    };
    return estimates[status];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>工程状況更新</span>
          </DialogTitle>
          <DialogDescription>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900">{process.projectName}</div>
              <div className="text-xs text-gray-600 mt-1">
                {process.managementNumber} • {process.orderClient}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Current Status */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">現在の状況</div>
            <div className="flex items-center space-x-3">
              {statusOptions.find(opt => opt.status === process.status) && (
                <>
                  <Badge className={statusOptions.find(opt => opt.status === process.status)!.color}>
                    {statusOptions.find(opt => opt.status === process.status)!.label}
                  </Badge>
                  <div className="text-sm text-gray-600">進捗: {process.progress}%</div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {process.dueDate ? new Date(process.dueDate).toLocaleDateString('ja-JP') : '未設定'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">新しい状況を選択</div>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map((option) => {
                const StatusIcon = option.icon;
                const isDisabled = !canTransitionTo(process.status, option.status);
                const isSelected = selectedStatus === option.status;

                return (
                  <button
                    key={option.status}
                    onClick={() => !isDisabled && setSelectedStatus(option.status)}
                    disabled={isDisabled}
                    className={`
                      flex items-center p-3 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : isDisabled 
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <StatusIcon className="w-5 h-5 mr-3 text-gray-600" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{option.label}</span>
                        <Badge className={option.color + ' text-xs'}>
                          {getProgressForStatus(option.status)}%
                        </Badge>
                        {getTimeEstimate(option.status) && (
                          <span className="text-xs text-gray-500">
                            予想: {getTimeEstimate(option.status)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Update Notes */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              更新メモ (任意)
            </div>
            <textarea
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="状況変更の理由や追加情報があれば入力してください..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Impact Warning */}
          {selectedStatus === 'delayed' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="font-medium">遅延設定の注意</span>
              </div>
              <div className="text-sm text-red-700 mt-1">
                この工程を遅延に設定すると、関連する作業者や管理者に通知が送信されます。
                必要に応じて納期の調整や他の工程への影響を確認してください。
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            キャンセル
          </Button>
          <Button 
            onClick={handleStatusUpdate} 
            disabled={isUpdating}
            className="ml-2"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                更新中...
              </>
            ) : (
              '状況を更新'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessStatusUpdateModal;