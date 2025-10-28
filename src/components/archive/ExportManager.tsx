// エクスポート管理コンポーネント
// データのエクスポート機能とプログレス表示

'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Database,
  Calendar,
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock,
  Archive,
  Filter,
  X
} from 'lucide-react';
import { useExportManager } from '@/hooks/useArchiveManager';
import {
  type ExportOptions,
  type ExportProgress,
  type BulkExportResult,
  formatFileSize,
  getProgressColor,
  getProgressText,
  downloadFile
} from '@/lib/utils/enhancedExportUtils';

// =============================================================================
// 型定義
// =============================================================================

interface ExportManagerProps {
  className?: string;
  onExportComplete?: (result: BulkExportResult) => void;
}

interface CollectionOption {
  name: string;
  displayName: string;
  description: string;
  estimated: number;
}

// =============================================================================
// プログレス表示コンポーネント
// =============================================================================

const ProgressIndicator: React.FC<{
  progress: ExportProgress;
  onCancel?: () => void;
}> = ({ progress, onCancel }) => {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'processing':
        return (
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        );
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="font-medium text-gray-900">
              エクスポート進行中
            </h4>
            <p className="text-sm text-gray-500">
              {progress.currentCollection && `処理中: ${progress.currentCollection}`}
            </p>
          </div>
        </div>
        {onCancel && progress.status === 'processing' && (
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>進捗</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor(progress.progress)}`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{getProgressText(progress.status)}</span>
          <span>
            {progress.processedRecords} / {progress.totalRecords} レコード
          </span>
        </div>
      </div>

      {progress.status === 'completed' && progress.downloadUrl && (
        <button
          onClick={() => downloadFile(progress.downloadUrl!, `export_${progress.id}`)}
          className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>ダウンロード</span>
        </button>
      )}

      {progress.status === 'failed' && progress.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">エラー: {progress.error}</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// エクスポート履歴コンポーネント
// =============================================================================

const ExportHistory: React.FC<{
  history: BulkExportResult[];
}> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        エクスポート履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((result, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
        >
          <div className="flex items-center space-x-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {result.fileName || 'エクスポート'}
              </p>
              <p className="text-sm text-gray-500">
                {result.recordCount}件のレコード
                {result.fileSize && ` • ${formatFileSize(result.fileSize)}`}
              </p>
            </div>
          </div>

          {result.success && result.downloadUrl && (
            <button
              onClick={() => downloadFile(result.downloadUrl!, result.fileName!)}
              className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">DL</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// メインコンポーネント
// =============================================================================

export const ExportManager: React.FC<ExportManagerProps> = ({
  className = '',
  onExportComplete
}) => {
  const {
    activeExports,
    exportHistory,
    exportCollection,
    exportMultipleCollections,
    availableCollections,
    isLoading,
    error
  } = useExportManager();

  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    batchSize: 1000,
    includeHeaders: true
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single');

  // コレクション情報の準備
  const collectionOptions: CollectionOption[] = availableCollections.map(config => ({
    name: config.name,
    displayName: config.displayName,
    description: `${Object.keys(config.fields).length}フィールド`,
    estimated: 0 // 実際のAPIから取得する場合はここで計算
  }));

  // =============================================================================
  // イベントハンドラー
  // =============================================================================

  const handleSingleExport = async (collectionName: string) => {
    try {
      const result = await exportCollection(collectionName, exportOptions);
      onExportComplete?.(result);

      if (result.success && result.downloadUrl && result.fileName) {
        downloadFile(result.downloadUrl, result.fileName);
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
    }
  };

  const handleMultipleExport = async () => {
    if (selectedCollections.length === 0) {
      alert('エクスポートするコレクションを選択してください');
      return;
    }

    try {
      const result = await exportMultipleCollections(selectedCollections, {
        ...exportOptions,
        format: 'zip' // 複数コレクションはZIP形式
      });
      onExportComplete?.(result);

      if (result.success && result.downloadUrl && result.fileName) {
        downloadFile(result.downloadUrl, result.fileName);
      }
    } catch (error) {
      console.error('一括エクスポートエラー:', error);
    }
  };

  const toggleCollectionSelection = (collectionName: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionName)
        ? prev.filter(c => c !== collectionName)
        : [...prev, collectionName]
    );
  };

  // =============================================================================
  // レンダリング
  // =============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">データエクスポート</h2>
          <p className="text-gray-600">
            Excel、CSV形式でのデータエクスポート機能
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 border rounded-md hover:bg-gray-50"
          >
            履歴
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 border rounded-md hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            <span>詳細設定</span>
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* アクティブなエクスポート表示 */}
      {Array.from(activeExports.values()).map(progress => (
        <ProgressIndicator
          key={progress.id}
          progress={progress}
        />
      ))}

      {/* タブ切り替え */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('single')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            単一コレクション
          </button>
          <button
            onClick={() => setActiveTab('multiple')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'multiple'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            複数コレクション (一括)
          </button>
        </nav>
      </div>

      {/* 詳細設定 */}
      {showAdvanced && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">エクスポート設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                形式
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  format: e.target.value as ExportOptions['format']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                バッチサイズ
              </label>
              <select
                value={exportOptions.batchSize}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  batchSize: Number(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={500}>500件</option>
                <option value={1000}>1,000件</option>
                <option value={2000}>2,000件</option>
                <option value={5000}>5,000件</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeHeaders || true}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeHeaders: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">ヘッダー行を含む</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 単一コレクション */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectionOptions.map(collection => (
            <div
              key={collection.name}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-3">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {collection.displayName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {collection.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSingleExport(collection.name)}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>エクスポート</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 複数コレクション */}
      {activeTab === 'multiple' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">
                コレクション選択 ({selectedCollections.length}件選択中)
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedCollections(collectionOptions.map(c => c.name))}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  全選択
                </button>
                <button
                  onClick={() => setSelectedCollections([])}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  選択解除
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collectionOptions.map(collection => (
                <label
                  key={collection.name}
                  className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(collection.name)}
                    onChange={() => toggleCollectionSelection(collection.name)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {collection.displayName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {collection.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                onClick={handleMultipleExport}
                disabled={isLoading || selectedCollections.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                <span>ZIP形式で一括エクスポート</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エクスポート履歴 */}
      {showHistory && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">エクスポート履歴</h3>
          <ExportHistory history={exportHistory} />
        </div>
      )}
    </div>
  );
};

export default ExportManager;