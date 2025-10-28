'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Archive,
  AlertTriangle,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  FileText,
  Database,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Timer,
  X,
  RefreshCw,
  Trash2
} from 'lucide-react';

import {
  enhancedArchiveManager,
  type ArchiveWarning,
  type ArchiveStatistics,
  type ArchiveSettings,
  getWarningLevelColor,
  getWarningLevelIcon,
  formatDaysUntilAction
} from '@/lib/utils/enhancedArchiveManager';

import {
  enhancedExportManager,
  exportSingleCollection,
  exportMultipleCollections,
  type ExportProgress,
  type BulkExportResult,
  downloadFile,
  formatFileSize,
  getProgressColor,
  getProgressText
} from '@/lib/utils/enhancedExportUtils';

// 追加の型定義
interface EnhancedExportOptions {
  collections: string[];
  format: 'csv' | 'excel' | 'json' | 'zip';
  includeCompleted?: boolean;
  includeArchived?: boolean;
  onProgress?: (progress: number, collection?: string) => void;
}

const ArchivesPage = () => {
  // State管理
  const [warnings, setWarnings] = useState<ArchiveWarning[]>([]);
  const [settings, setSettings] = useState<ArchiveSettings | null>(null);
  const [statistics, setStatistics] = useState<ArchiveStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWarning, setSelectedWarning] = useState<ArchiveWarning | null>(null);
  const [exportProgress, setExportProgress] = useState<{ [key: string]: number }>({});
  const [isExporting, setIsExporting] = useState<{ [key: string]: boolean }>({});

  // フィルター状態
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [showExportedOnly, setShowExportedOnly] = useState(false);

  // データ読み込み
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // 1分間隔で更新
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [warningsData, settingsData, statisticsData] = await Promise.all([
        enhancedArchiveManager.getAllActiveWarnings(),
        enhancedArchiveManager.getArchiveSettings(),
        enhancedArchiveManager.getWarningsStatistics()
      ]);

      setWarnings(warningsData);
      setSettings(settingsData);
      setStatistics(statisticsData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // フィルター処理
  const filteredWarnings = warnings.filter(warning => {
    if (filterLevel !== 'all' && warning.warningLevel !== filterLevel) return false;
    if (filterCollection !== 'all' && warning.collectionName !== filterCollection) return false;
    if (showExportedOnly && warning.userResponse !== 'export') return false;
    return true;
  });

  // 警告レベル別の統計
  const warningStats = statistics || {
    totalWarnings: warnings.length,
    criticalWarnings: warnings.filter(w => w.warningLevel === 'critical').length,
    warningWarnings: warnings.filter(w => w.warningLevel === 'warning').length,
    infoWarnings: warnings.filter(w => w.warningLevel === 'info').length,
    exportedCount: warnings.filter(w => w.userResponse === 'export').length,
    extendedCount: 0,
    deletedCount: 0,
    pendingCount: warnings.filter(w => !w.userResponse).length
  };

  // 警告への応答処理
  const handleWarningResponse = async (
    warningId: string,
    response: 'export' | 'delete' | 'extend'
  ) => {
    try {
      const success = await enhancedArchiveManager.handleUserResponse(warningId, response);

      if (success) {
        // 警告リストを更新
        setWarnings(prev => prev.map(w =>
          w.id === warningId
            ? { ...w, userResponse: response, isRead: true }
            : w
        ));

        switch (response) {
          case 'export':
            await handleEmergencyExport(warningId);
            break;
          case 'extend':
            alert('📅 延長リクエストが送信されました。管理者が確認後、保持期間が延長されます。');
            break;
          case 'delete':
            alert('✅ 削除に同意されました。予定通りデータが削除されます。');
            break;
        }
      }
    } catch (error) {
      console.error('警告応答エラー:', error);
      alert('エラーが発生しました。再度お試しください。');
    }
  };

  // 緊急エクスポート実行
  const handleEmergencyExport = async (warningId: string) => {
    const warning = warnings.find(w => w.id === warningId);
    if (!warning) return;

    setIsExporting(prev => ({ ...prev, [warningId]: true }));
    setExportProgress(prev => ({ ...prev, [warningId]: 0 }));

    try {
      // 進捗更新のコールバック
      const onProgress = (progress: number) => {
        setExportProgress(prev => ({ ...prev, [warningId]: progress }));
      };

      const result = await exportSingleCollection(warning.collectionName, {
        format: 'excel',
        filters: { id: warning.recordId }
      });

      if (result.success && result.downloadUrl && result.fileName) {
        // エクスポート成功時にwarningを更新
        setWarnings(prev => prev.map(w =>
          w.id === warningId
            ? { ...w, userResponse: 'export' }
            : w
        ));

        setExportProgress(prev => ({ ...prev, [warningId]: 100 }));

        // ファイルダウンロード開始
        downloadFile(result.downloadUrl, result.fileName);
        alert(`✅ エクスポート完了: ${result.fileName}`);
      } else {
        alert(`❌ エクスポートエラー: ${result.error || 'ファイル生成に失敗しました'}`);
      }
    } catch (error) {
      console.error('緊急エクスポートエラー:', error);
      alert('エクスポートに失敗しました。');
    } finally {
      setIsExporting(prev => ({ ...prev, [warningId]: false }));
    }
  };

  // 一括エクスポート実行
  const handleBulkExport = async () => {
    const selectedCollections = Array.from(
      new Set(filteredWarnings.map(w => w.collectionName))
    );

    if (selectedCollections.length === 0) {
      alert('エクスポート対象のデータがありません。');
      return;
    }

    setIsExporting(prev => ({ ...prev, 'bulk': true }));
    setExportProgress(prev => ({ ...prev, 'bulk': 0 }));

    try {
      // 進捗更新のコールバック
      const onProgress = (progress: number, collection?: string) => {
        setExportProgress(prev => ({ ...prev, 'bulk': progress }));
      };

      const result = await exportMultipleCollections(selectedCollections, {
        format: 'zip',
        batchSize: 1000,
        includeHeaders: true
      });

      if (result.success && result.downloadUrl && result.fileName) {
        // エクスポート成功時に該当警告を全て更新
        setWarnings(prev => prev.map(w =>
          selectedCollections.includes(w.collectionName)
            ? { ...w, userResponse: 'export' }
            : w
        ));

        // ファイルダウンロード開始
        downloadFile(result.downloadUrl, result.fileName);
        alert(`✅ 一括エクスポート完了: ${result.fileName}\n処理件数: ${result.recordCount}件`);
      } else {
        alert(`❌ 一括エクスポートエラー: ${result.error || 'ファイル生成に失敗しました'}`);
      }
    } catch (error) {
      console.error('一括エクスポートエラー:', error);
      alert('一括エクスポートに失敗しました。');
    } finally {
      setIsExporting(prev => ({ ...prev, 'bulk': false }));
      setExportProgress(prev => ({ ...prev, 'bulk': 0 }));
    }
  };

  // 警告レベルのバッジ表示
  const getWarningLevelBadge = (level: 'info' | 'warning' | 'critical') => {
    switch (level) {
      case 'critical':
        return <Badge className="bg-red-500 text-white"><AlertCircle className="w-3 h-3 mr-1" />緊急</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500 text-white"><AlertTriangle className="w-3 h-3 mr-1" />警告</Badge>;
      case 'info':
        return <Badge className="bg-blue-500 text-white"><AlertCircle className="w-3 h-3 mr-1" />情報</Badge>;
    }
  };

  // カウントダウン表示
  const getCountdownDisplay = (daysUntilDeletion: number) => {
    if (daysUntilDeletion <= 0) {
      return <span className="text-red-600 font-bold">削除対象</span>;
    } else if (daysUntilDeletion === 1) {
      return <span className="text-red-600 font-bold">明日削除</span>;
    } else {
      return <span className={`font-medium ${daysUntilDeletion <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
        あと{daysUntilDeletion}日
      </span>;
    }
  };

  // コレクション名の表示名変換
  const getCollectionDisplayName = (collectionName: string) => {
    const nameMap: { [key: string]: string } = {
      'orders': '受注案件',
      'processes': '工程データ',
      'workHours': '工数データ',
      'daily-reports': '日報データ',
      'notes': 'メモ',
      'calendar': 'カレンダー'
    };
    return nameMap[collectionName] || collectionName;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          データ読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Archive className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold">アーカイブデータ管理</h1>
            <p className="text-gray-600">削除予定データの確認とエクスポート</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleBulkExport}
            disabled={isExporting['bulk'] || filteredWarnings.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExporting['bulk'] ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                エクスポート中
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                一括エクスポート
              </>
            )}
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総警告数</p>
                <p className="text-2xl font-bold">{warningStats.totalWarnings}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">緊急</p>
                <p className="text-2xl font-bold text-red-600">{warningStats.criticalWarnings}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">警告</p>
                <p className="text-2xl font-bold text-orange-600">{warningStats.warningWarnings}</p>
              </div>
              <Timer className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">情報</p>
                <p className="text-2xl font-bold text-blue-600">{warningStats.infoWarnings}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">エクスポート済み</p>
                <p className="text-2xl font-bold text-green-600">{warningStats.exportedCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-1">警告レベル</label>
              <Select value={filterLevel} onValueChange={(value: any) => setFilterLevel(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="critical">緊急</SelectItem>
                  <SelectItem value="warning">警告</SelectItem>
                  <SelectItem value="info">情報</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">データ種類</label>
              <Select value={filterCollection} onValueChange={setFilterCollection}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="orders">受注案件</SelectItem>
                  <SelectItem value="processes">工程データ</SelectItem>
                  <SelectItem value="workHours">工数データ</SelectItem>
                  <SelectItem value="daily-reports">日報データ</SelectItem>
                  <SelectItem value="notes">メモ</SelectItem>
                  <SelectItem value="calendar">カレンダー</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="exportedOnly"
                checked={showExportedOnly}
                onChange={(e) => setShowExportedOnly(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="exportedOnly" className="text-sm">
                エクスポート済みのみ表示
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 一括エクスポート進捗 */}
      {isExporting['bulk'] && (
        <Alert className="mb-6">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>一括エクスポート実行中...</span>
              <span>{exportProgress['bulk']?.toFixed(1) || 0}%</span>
            </div>
            <Progress value={exportProgress['bulk'] || 0} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* 警告リスト */}
      <div className="space-y-4">
        {filteredWarnings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {filterLevel === 'all' && filterCollection === 'all'
                  ? '削除予定のデータはありません'
                  : 'フィルター条件に該当するデータがありません'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredWarnings.map(warning => (
            <Card key={warning.id} className={`hover:shadow-md transition-shadow ${warning.warningLevel === 'critical' ? 'border-red-200 bg-red-50' : warning.warningLevel === 'warning' ? 'border-orange-200 bg-orange-50' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium">{warning.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{getCollectionDisplayName(warning.collectionName)}</span>
                        {warning.managementNumber && (
                          <>
                            <span>•</span>
                            <span>管理番号: {warning.managementNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getWarningLevelBadge(warning.warningLevel)}
                    {warning.userResponse === 'export' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        エクスポート済み
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">削除予定日</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {new Date(warning.actionDate).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">削除まで</div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {getCountdownDisplay(warning.daysUntilAction)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">ステータス</div>
                    <div className="font-medium">
                      {warning.userResponse
                        ? warning.userResponse === 'export'
                          ? 'エクスポート済み'
                          : warning.userResponse === 'extend'
                          ? '延長要求済み'
                          : warning.userResponse === 'delete'
                          ? '削除同意済み'
                          : '対応済み'
                        : warning.isRead
                        ? '確認済み'
                        : '未確認'
                      }
                    </div>
                  </div>
                </div>

                {/* エクスポート進捗 */}
                {isExporting[warning.id] && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>エクスポート中...</span>
                      <span>{exportProgress[warning.id]?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={exportProgress[warning.id] || 0} />
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex flex-wrap gap-2">
                  {warning.userResponse !== 'export' && (
                    <Button
                      size="sm"
                      onClick={() => handleEmergencyExport(warning.id)}
                      disabled={isExporting[warning.id]}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isExporting[warning.id] ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3 mr-1" />
                      )}
                      エクスポート
                    </Button>
                  )}

                  {!warning.userResponse && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWarningResponse(warning.id, 'extend')}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        延長要求
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('本当に削除に同意しますか？この操作は取り消せません。')) {
                            handleWarningResponse(warning.id, 'delete');
                          }
                        }}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        削除同意
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ArchivesPage;