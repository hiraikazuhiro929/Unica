"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Archive,
  Clock,
  Database,
  Download,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Activity,
  BarChart3
} from "lucide-react";

import {
  dataArchiveManager,
  manualArchiveExecution,
  initializeDefaultPolicies,
  type ArchivePolicy,
  type ArchiveOperation
} from "@/lib/utils/dataArchiveManager";

import {
  archiveScheduler,
  initializeArchiveScheduler,
  type ScheduleConfig,
  type SchedulerState
} from "@/lib/utils/archiveScheduler";

const ArchiveManagement = () => {
  // State管理
  const [policies, setPolicies] = useState<ArchivePolicy[]>([]);
  const [operations, setOperations] = useState<ArchiveOperation[]>([]);
  const [schedulerConfig, setSchedulerConfig] = useState<ScheduleConfig>({
    enabled: false,
    intervalHours: 24,
    runTime: '03:00',
    maxConcurrentOperations: 3,
    retryAttempts: 3,
    retryDelayMinutes: 30
  });
  const [schedulerState, setSchedulerState] = useState<SchedulerState>({
    isRunning: false,
    activeOperations: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'policies' | 'operations' | 'scheduler'>('policies');

  // データ読み込み
  useEffect(() => {
    loadData();
    // 定期的に状態を更新
    const interval = setInterval(refreshState, 30000); // 30秒間隔
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [policiesData] = await Promise.all([
        dataArchiveManager.getArchivePolicies()
      ]);

      setPolicies(policiesData);
      refreshState();
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshState = () => {
    const currentConfig = archiveScheduler.getConfig();
    const currentState = archiveScheduler.getState();

    setSchedulerConfig(currentConfig);
    setSchedulerState(currentState);

    if (currentState.lastResults) {
      setOperations(currentState.lastResults);
    }
  };

  // 手動実行
  const handleManualExecution = async (collectionName?: string) => {
    try {
      setIsLoading(true);
      const results = await manualArchiveExecution(collectionName);
      setOperations(results);

      const successCount = results.filter(r => r.status === 'completed').length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);

      alert(`✅ アーカイブ実行完了\n成功: ${successCount}件\n処理レコード数: ${totalRecords}件`);
    } catch (error: any) {
      alert(`❌ アーカイブ実行エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // スケジューラー制御
  const handleSchedulerToggle = () => {
    if (schedulerState.isRunning) {
      archiveScheduler.stop();
      alert('🛑 アーカイブスケジューラーを停止しました');
    } else {
      archiveScheduler.start();
      alert('▶️ アーカイブスケジューラーを開始しました');
    }
    refreshState();
  };

  // デフォルトポリシー初期化
  const handleInitializePolicies = async () => {
    if (!confirm('デフォルトのアーカイブポリシーを初期化しますか？')) return;

    try {
      await initializeDefaultPolicies();
      await loadData();
      alert('✅ デフォルトポリシーを初期化しました');
    } catch (error: any) {
      alert(`❌ 初期化エラー: ${error.message}`);
    }
  };

  // ステータス表示関数
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />完了</Badge>;
      case 'running':
        return <Badge className="bg-blue-500 text-white"><Activity className="w-3 h-3 mr-1" />実行中</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />失敗</Badge>;
      case 'pending':
        return <Badge className="bg-gray-500 text-white"><Clock className="w-3 h-3 mr-1" />待機</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin" />
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Archive className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">データアーカイブ管理</h1>
            <p className="text-gray-600">完了データの自動削除とバックアップシステム</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleManualExecution()}
            disabled={schedulerState.isRunning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            手動実行
          </Button>
          <Button
            onClick={handleInitializePolicies}
            variant="outline"
          >
            <Settings className="w-4 h-4 mr-2" />
            初期化
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'policies' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('policies')}
        >
          <Database className="w-4 h-4 inline mr-2" />
          アーカイブポリシー
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'operations' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('operations')}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          実行履歴
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'scheduler' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('scheduler')}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          スケジューラー
        </button>
      </div>

      {/* アーカイブポリシータブ */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">データ保持ポリシー</h2>
            <div className="text-sm text-gray-600">
              {policies.filter(p => p.isActive).length}件のアクティブなポリシー
            </div>
          </div>

          <div className="grid gap-4">
            {policies.map(policy => (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{policy.collectionName}</span>
                      {policy.isActive ?
                        <Badge className="bg-green-100 text-green-800">有効</Badge> :
                        <Badge className="bg-gray-100 text-gray-800">無効</Badge>
                      }
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleManualExecution(policy.collectionName)}
                      disabled={schedulerState.isRunning}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      実行
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">保持期間</div>
                    <div className="font-medium">{policy.retentionDays}日間</div>
                  </div>
                  <div>
                    <div className="text-gray-600">バックアップ</div>
                    <div className="font-medium">{policy.backupBeforeDelete ? '有効' : '無効'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">削除</div>
                    <div className="font-medium">{policy.deleteAfterBackup ? '有効' : '無効'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">最終実行</div>
                    <div className="font-medium">{formatDate(policy.lastRunAt)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {policies.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">アーカイブポリシーが設定されていません</p>
                <Button
                  onClick={handleInitializePolicies}
                  className="mt-4"
                  variant="outline"
                >
                  デフォルトポリシーを作成
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 実行履歴タブ */}
      {activeTab === 'operations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">アーカイブ実行履歴</h2>
            <Button
              onClick={refreshState}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              更新
            </Button>
          </div>

          <div className="space-y-3">
            {operations.map(operation => (
              <Card key={operation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{operation.collectionName}</span>
                      {getStatusBadge(operation.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(operation.startedAt)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">処理レコード数</div>
                      <div className="font-medium">{operation.recordCount}件</div>
                    </div>
                    <div>
                      <div className="text-gray-600">バックアップ</div>
                      <div className="font-medium">{operation.metadata.backedupRecords}件</div>
                    </div>
                    <div>
                      <div className="text-gray-600">削除</div>
                      <div className="font-medium">{operation.metadata.deletedRecords}件</div>
                    </div>
                    <div>
                      <div className="text-gray-600">実行時間</div>
                      <div className="font-medium">
                        {operation.completedAt ?
                          `${Math.round((new Date(operation.completedAt).getTime() - new Date(operation.startedAt).getTime()) / 60000)}分` :
                          '実行中...'
                        }
                      </div>
                    </div>
                  </div>

                  {operation.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <div className="text-red-800 text-sm font-medium">エラー:</div>
                      <div className="text-red-700 text-sm">{operation.error}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {operations.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">実行履歴がありません</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* スケジューラータブ */}
      {activeTab === 'scheduler' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">自動実行スケジューラー</h2>
            <Button
              onClick={handleSchedulerToggle}
              className={schedulerConfig.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {schedulerConfig.enabled ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  開始
                </>
              )}
            </Button>
          </div>

          {/* 現在の状態 */}
          <Card>
            <CardHeader>
              <h3 className="font-medium">現在の状態</h3>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-600 text-sm">スケジューラー</div>
                <div className="font-medium">
                  {schedulerConfig.enabled ? '有効' : '無効'}
                </div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">実行状態</div>
                <div className="font-medium">
                  {schedulerState.isRunning ? '実行中' : '待機中'}
                </div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">前回実行</div>
                <div className="font-medium">
                  {formatDate(schedulerState.lastRunAt)}
                </div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">次回実行予定</div>
                <div className="font-medium">
                  {formatDate(schedulerState.nextRunAt)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 設定 */}
          <Card>
            <CardHeader>
              <h3 className="font-medium">スケジュール設定</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">実行間隔（時間）</label>
                  <Input
                    type="number"
                    value={schedulerConfig.intervalHours}
                    onChange={(e) => setSchedulerConfig({
                      ...schedulerConfig,
                      intervalHours: parseInt(e.target.value) || 24
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">実行時刻（HH:MM）</label>
                  <Input
                    type="time"
                    value={schedulerConfig.runTime || '03:00'}
                    onChange={(e) => setSchedulerConfig({
                      ...schedulerConfig,
                      runTime: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    archiveScheduler.updateConfig(schedulerConfig);
                    refreshState();
                    alert('✅ 設定を更新しました');
                  }}
                  variant="outline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  設定保存
                </Button>
                <Button
                  onClick={() => {
                    archiveScheduler.reset();
                    refreshState();
                    alert('🔄 スケジューラーをリセットしました');
                  }}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  リセット
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ArchiveManagement;