// Workflow Visualization Component for Order Detail Modal
// Displays real-time manufacturing workflow stages with progress indicators

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PlayCircle,
  Users,
  Calendar,
  Gauge,
  ArrowRight,
  Activity,
  Target,
  Settings,
  Zap
} from "lucide-react";

interface WorkflowStage {
  name: string;
  status: 'completed' | 'active' | 'pending' | 'blocked';
  progress: number;
  estimatedCompletion: string;
  resources: string[];
}

interface WorkflowVisualizationProps {
  orderId: string;
  stages: WorkflowStage[];
  onStageClick?: (stageName: string) => void;
  compact?: boolean;
}

const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  orderId,
  stages,
  onStageClick,
  compact = false
}) => {
  const getStatusIcon = (status: WorkflowStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'active':
        return <PlayCircle className="w-5 h-5 text-blue-600" />;
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: WorkflowStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'active':
        return 'bg-blue-50 border-blue-200';
      case 'blocked':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getProgressBarColor = (status: WorkflowStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'blocked':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          ワークフロー進捗
        </h4>
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.name}
              className={`flex items-center justify-between p-2 rounded-md border ${getStatusColor(stage.status)} ${
                onStageClick ? 'cursor-pointer hover:shadow-sm' : ''
              }`}
              onClick={() => onStageClick?.(stage.name)}
            >
              <div className="flex items-center space-x-2">
                {getStatusIcon(stage.status)}
                <span className="text-sm font-medium">{stage.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(stage.status)}`}
                    style={{ width: `${stage.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{stage.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="w-5 h-5 mr-2" />
          製造ワークフロー進捗
          <Badge variant="outline" className="ml-2">
            {stages.filter(s => s.status === 'completed').length}/{stages.length} 完了
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>全体進捗</span>
              <span>{Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Stage Details */}
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <div key={stage.name} className="relative">
                {/* Connection Line */}
                {index < stages.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300 z-0"></div>
                )}
                
                <div
                  className={`relative z-10 p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor(stage.status)} ${
                    onStageClick ? 'cursor-pointer hover:shadow-md' : ''
                  }`}
                  onClick={() => onStageClick?.(stage.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(stage.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{stage.name}</h4>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>進捗</span>
                            <span>{stage.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(stage.status)}`}
                              style={{ width: `${stage.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Stage Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>完了予定: {stage.estimatedCompletion}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Users className="w-4 h-4 mr-1" />
                            <span>担当: {stage.resources.join(', ') || '未設定'}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-2">
                          <Badge 
                            variant={
                              stage.status === 'completed' ? 'default' :
                              stage.status === 'active' ? 'secondary' :
                              stage.status === 'blocked' ? 'destructive' : 'outline'
                            }
                            className="text-xs"
                          >
                            {stage.status === 'completed' ? '完了' :
                             stage.status === 'active' ? '実行中' :
                             stage.status === 'blocked' ? 'ブロック中' : '待機中'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {stage.status === 'active' && (
                      <div className="flex-shrink-0 ml-3">
                        <button 
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle stage action
                          }}
                          title="詳細を表示"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow Metrics */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Gauge className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium">効率性</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {Math.round((stages.reduce((acc, stage) => acc + stage.progress, 0) / stages.length))}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium">アクティブ</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {stages.filter(s => s.status === 'active').length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium">待機中</span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {stages.filter(s => s.status === 'pending').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowVisualization;