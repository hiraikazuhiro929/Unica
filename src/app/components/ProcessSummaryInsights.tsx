"use client";

import React from 'react';
import { Process } from '@/app/tasks/types';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  Factory,
  Users,
  Target,
  Zap
} from 'lucide-react';

interface ProcessSummaryInsightsProps {
  processes: Process[];
}

const ProcessSummaryInsights: React.FC<ProcessSummaryInsightsProps> = ({ processes }) => {
  // Calculate insights
  const totalProcesses = processes.length;
  const completedProcesses = processes.filter(p => p.status === 'completed').length;
  const delayedProcesses = processes.filter(p => p.status === 'delayed').length;
  const highPriorityProcesses = processes.filter(p => p.priority === 'high').length;
  
  // Due date analysis
  const now = new Date();
  const dueTodayProcesses = processes.filter(p => {
    if (!p.dueDate) return false;
    const dueDate = new Date(p.dueDate);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  }).length;

  const overdueProcesses = processes.filter(p => {
    if (!p.dueDate) return false;
    const dueDate = new Date(p.dueDate);
    return dueDate.getTime() < now.getTime();
  }).length;

  // Work efficiency
  const avgProgress = totalProcesses > 0 ? 
    Math.round(processes.reduce((sum, p) => sum + (p.progress || 0), 0) / totalProcesses) : 0;

  const avgEfficiency = processes.reduce((sum, p) => {
    if (!p.workDetails) return sum;
    const estimated = p.workDetails.totalEstimatedHours;
    const actual = p.workDetails.totalActualHours;
    if (actual === 0) return sum;
    return sum + (estimated / actual);
  }, 0) / (processes.filter(p => p.workDetails?.totalActualHours > 0).length || 1);

  // Machine utilization
  const allMachines = Array.from(new Set(
    processes.flatMap(p => p.assignedMachines)
  ));
  const machineCount = allMachines.length;

  // Status distribution
  const statusCounts = {
    planning: processes.filter(p => p.status === 'planning').length,
    'data-work': processes.filter(p => p.status === 'data-work').length,
    processing: processes.filter(p => p.status === 'processing').length,
    finishing: processes.filter(p => p.status === 'finishing').length,
    completed: completedProcesses,
    delayed: delayedProcesses
  };

  const completionRate = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;

  const insights = [
    {
      title: '全体進捗',
      value: `${avgProgress}%`,
      subtitle: `平均進捗率`,
      icon: TrendingUp,
      color: avgProgress >= 70 ? 'text-green-600' : avgProgress >= 40 ? 'text-blue-600' : 'text-yellow-600',
      bgColor: avgProgress >= 70 ? 'bg-green-50' : avgProgress >= 40 ? 'bg-blue-50' : 'bg-yellow-50'
    },
    {
      title: '効率指標',
      value: `${Math.round(avgEfficiency * 100)}%`,
      subtitle: '平均作業効率',
      icon: avgEfficiency >= 1 ? TrendingUp : TrendingDown,
      color: avgEfficiency >= 1 ? 'text-green-600' : avgEfficiency >= 0.8 ? 'text-yellow-600' : 'text-red-600',
      bgColor: avgEfficiency >= 1 ? 'bg-green-50' : avgEfficiency >= 0.8 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      title: '緊急対応',
      value: `${highPriorityProcesses + overdueProcesses}`,
      subtitle: '高優先・期限超過',
      icon: AlertTriangle,
      color: (highPriorityProcesses + overdueProcesses) > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: (highPriorityProcesses + overdueProcesses) > 0 ? 'bg-red-50' : 'bg-green-50'
    },
    {
      title: '本日期限',
      value: `${dueTodayProcesses}`,
      subtitle: '今日が期限',
      icon: Clock,
      color: dueTodayProcesses > 0 ? 'text-orange-600' : 'text-green-600',
      bgColor: dueTodayProcesses > 0 ? 'bg-orange-50' : 'bg-green-50'
    },
    {
      title: '完了率',
      value: `${completionRate}%`,
      subtitle: `${completedProcesses}/${totalProcesses}件`,
      icon: CheckCircle,
      color: completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-blue-600' : 'text-gray-600',
      bgColor: completionRate >= 80 ? 'bg-green-50' : completionRate >= 50 ? 'bg-blue-50' : 'bg-gray-50'
    },
    {
      title: '機械稼働',
      value: `${machineCount}`,
      subtitle: '使用中機械数',
      icon: Factory,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          製造状況サマリー
        </h3>
        <Badge variant="outline" className="text-xs">
          {new Date().toLocaleDateString('ja-JP')} 現在
        </Badge>
      </div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div key={index} className={`${insight.bgColor} rounded-lg p-3 border`}>
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${insight.color}`} />
                <span className={`text-lg font-bold ${insight.color}`}>
                  {insight.value}
                </span>
              </div>
              <div className="text-xs font-medium text-gray-700">{insight.title}</div>
              <div className="text-xs text-gray-500">{insight.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">工程状況内訳</div>
        <div className="flex items-center space-x-1">
          {Object.entries(statusCounts).map(([status, count]) => {
            if (count === 0) return null;
            
            const statusInfo = {
              planning: { label: '計画', color: 'bg-gray-100 text-gray-700' },
              'data-work': { label: 'データ', color: 'bg-blue-100 text-blue-700' },
              processing: { label: '加工', color: 'bg-green-100 text-green-700' },
              finishing: { label: '仕上げ', color: 'bg-yellow-100 text-yellow-700' },
              completed: { label: '完了', color: 'bg-emerald-100 text-emerald-700' },
              delayed: { label: '遅延', color: 'bg-red-100 text-red-700' }
            }[status];

            return (
              <Badge key={status} className={`${statusInfo?.color} text-xs px-2 py-1`}>
                {statusInfo?.label}: {count}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4 text-gray-600">
          <span className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            {new Set(processes.map(p => p.assignee)).size} 担当者
          </span>
          <span className="flex items-center">
            <Target className="w-3 h-3 mr-1" />
            {new Set(processes.map(p => p.orderClient)).size} クライアント
          </span>
        </div>
        
        {(overdueProcesses > 0 || delayedProcesses > 0) && (
          <div className="flex items-center text-red-600">
            <Zap className="w-3 h-3 mr-1" />
            <span className="font-medium">要対応: {overdueProcesses + delayedProcesses}件</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessSummaryInsights;