// アーカイブ警告カードコンポーネント
// 個別の警告を表示・操作するためのカード

'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Database,
  Download,
  Eye,
  Archive,
  Trash2,
  Calendar,
  MoreVertical,
  FileText
} from 'lucide-react';
import {
  type ArchiveWarning,
  getWarningLevelColor,
  getWarningLevelIcon,
  formatDaysUntilAction,
  getActionTypeText,
  getCollectionDisplayName
} from '@/lib/utils/enhancedArchiveManager';

// =============================================================================
// 型定義
// =============================================================================

interface ArchiveWarningCardProps {
  warning: ArchiveWarning;
  onResponse: (
    warningId: string,
    response: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ) => Promise<void>;
  onMarkAsRead: (warningId: string) => Promise<void>;
  showActions?: boolean;
  compact?: boolean;
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export const ArchiveWarningCard: React.FC<ArchiveWarningCardProps> = ({
  warning,
  onResponse,
  onMarkAsRead,
  showActions = true,
  compact = false
}) => {
  const [isResponding, setIsResponding] = useState(false);
  const [showExtendOptions, setShowExtendOptions] = useState(false);
  const [extendDays, setExtendDays] = useState(30);

  // =============================================================================
  // ヘルパー関数
  // =============================================================================

  const getWarningIcon = () => {
    switch (warning.warningLevel) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <Database className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionIcon = () => {
    return warning.actionType === 'archive' ? (
      <Archive className="h-4 w-4" />
    ) : (
      <Trash2 className="h-4 w-4" />
    );
  };

  const getStatusColor = () => {
    if (warning.daysUntilAction <= 0) return 'border-red-500 bg-red-50';
    if (warning.daysUntilAction <= 1) return 'border-red-400 bg-red-25';
    if (warning.daysUntilAction <= 7) return 'border-yellow-400 bg-yellow-25';
    return 'border-blue-400 bg-blue-25';
  };

  // =============================================================================
  // イベントハンドラー
  // =============================================================================

  const handleResponse = async (
    response: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ) => {
    setIsResponding(true);
    try {
      await onResponse(warning.id, response, additionalDays);
      setShowExtendOptions(false);
    } catch (error) {
      console.error('応答処理エラー:', error);
    } finally {
      setIsResponding(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!warning.isRead) {
      await onMarkAsRead(warning.id);
    }
  };

  // =============================================================================
  // レンダリング
  // =============================================================================

  return (
    <div
      className={`border rounded-lg p-4 transition-all hover:shadow-md ${
        !warning.isRead ? 'bg-blue-50/50' : 'bg-white'
      } ${getStatusColor()}`}
      onClick={handleMarkAsRead}
    >
      {/* ヘッダー部分 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getWarningIcon()}
          <div>
            <h3 className="font-medium text-gray-900 line-clamp-1">
              {warning.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">
                {getCollectionDisplayName(warning.collectionName)}
              </span>
              <span className="text-gray-300">•</span>
              <div className="flex items-center space-x-1">
                {getActionIcon()}
                <span className="text-sm text-gray-600">
                  {getActionTypeText(warning.actionType)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!warning.isRead && (
          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
        )}
      </div>

      {/* 詳細情報 */}
      {!compact && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDaysUntilAction(warning.daysUntilAction, warning.actionType)}
            </span>
          </div>

          {warning.managementNumber && (
            <div className="text-sm text-gray-500">
              管理番号: {warning.managementNumber}
            </div>
          )}

          <div className="text-xs text-gray-400">
            作成日: {new Date(warning.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      {showActions && (
        <div className="border-t pt-3 mt-3">
          <div className="flex flex-wrap gap-2">
            {/* エクスポート */}
            <button
              onClick={() => handleResponse('export')}
              disabled={isResponding}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">エクスポート</span>
            </button>

            {/* 延長 */}
            <div className="relative">
              <button
                onClick={() => setShowExtendOptions(!showExtendOptions)}
                disabled={isResponding}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm">延長</span>
              </button>

              {showExtendOptions && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[200px]">
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        延長日数
                      </label>
                      <select
                        value={extendDays}
                        onChange={(e) => setExtendDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value={7}>7日</option>
                        <option value={14}>14日</option>
                        <option value={30}>30日</option>
                        <option value={60}>60日</option>
                        <option value={90}>90日</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResponse('extend', extendDays)}
                        disabled={isResponding}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        延長
                      </button>
                      <button
                        onClick={() => setShowExtendOptions(false)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 即座に実行 */}
            <button
              onClick={() => handleResponse('archive_now')}
              disabled={isResponding}
              className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors disabled:opacity-50"
            >
              {getActionIcon()}
              <span className="text-sm">今すぐ実行</span>
            </button>

            {/* 無視 */}
            <button
              onClick={() => handleResponse('ignore')}
              disabled={isResponding}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              <span className="text-sm">無視</span>
            </button>
          </div>

          {warning.userResponse && (
            <div className="mt-2 text-xs text-gray-500">
              前回の応答: {warning.userResponse}
              {warning.responseDate && (
                <span className="ml-1">
                  ({new Date(warning.responseDate).toLocaleDateString('ja-JP')})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ローディング状態 */}
      {isResponding && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>処理中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// コンパクト版のコンポーネント
// =============================================================================

export const CompactWarningCard: React.FC<ArchiveWarningCardProps> = (props) => {
  return <ArchiveWarningCard {...props} compact={true} showActions={false} />;
};

export default ArchiveWarningCard;