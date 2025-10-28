// アーカイブ統計ダッシュボードコンポーネント
// アーカイブシステムの全体的な統計と状況を表示

'use client';

import React from 'react';
import {
  Archive,
  AlertTriangle,
  Clock,
  FileText,
  Database,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Users,
  HardDrive
} from 'lucide-react';
import { type ArchiveStatistics } from '@/lib/utils/enhancedArchiveManager';

// =============================================================================
// 型定義
// =============================================================================

interface ArchiveStatsDashboardProps {
  statistics: ArchiveStatistics & {
    archiveWarnings?: number;
    deleteWarnings?: number;
    businessData?: number;
    chatData?: number;
  };
  isLoading?: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'yellow' | 'green' | 'gray' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

// =============================================================================
// 統計カードコンポーネント
// =============================================================================

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  description
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  const iconBgClasses = {
    blue: 'bg-blue-100',
    red: 'bg-red-100',
    yellow: 'bg-yellow-100',
    green: 'bg-green-100',
    gray: 'bg-gray-100',
    purple: 'bg-purple-100'
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center mt-2">
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <div className={`ml-3 flex items-center text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-4 w-4 ${
                  !trend.isPositive ? 'rotate-180' : ''
                }`} />
                <span className="ml-1">{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${iconBgClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// プログレスバーコンポーネント
// =============================================================================

const ProgressBar: React.FC<{
  value: number;
  max: number;
  color: 'blue' | 'red' | 'yellow' | 'green';
  label: string;
}> = ({ value, max, color, label }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  const colorClasses = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colorClasses[color]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// =============================================================================
// メインコンポーネント
// =============================================================================

export const ArchiveStatsDashboard: React.FC<ArchiveStatsDashboardProps> = ({
  statistics,
  isLoading = false,
  lastUpdated,
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  const {
    totalWarnings,
    criticalWarnings,
    warningWarnings,
    infoWarnings,
    exportedCount,
    extendedCount,
    deletedCount,
    pendingCount,
    archiveWarnings = 0,
    deleteWarnings = 0,
    businessData = 0,
    chatData = 0
  } = statistics;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">アーカイブ統計</h2>
          <p className="text-gray-600">データ管理システムの現在の状況</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>更新</span>
          </button>
        )}
      </div>

      {/* 警告レベル別統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="全警告"
          value={totalWarnings}
          icon={<Database className="h-6 w-6" />}
          color="gray"
          description="現在アクティブな全ての警告"
        />

        <StatCard
          title="緊急警告"
          value={criticalWarnings}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          description="即座に対応が必要"
        />

        <StatCard
          title="注意警告"
          value={warningWarnings}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          description="近日中に対応が必要"
        />

        <StatCard
          title="情報警告"
          value={infoWarnings}
          icon={<FileText className="h-6 w-6" />}
          color="blue"
          description="参考情報・事前通知"
        />
      </div>

      {/* アクション別統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="アーカイブ対象"
          value={archiveWarnings}
          icon={<Archive className="h-6 w-6" />}
          color="purple"
          description="アーカイブコレクションに移動予定"
        />

        <StatCard
          title="削除対象"
          value={deleteWarnings}
          icon={<Trash2 className="h-6 w-6" />}
          color="red"
          description="完全削除予定"
        />

        <StatCard
          title="ビジネスデータ"
          value={businessData}
          icon={<HardDrive className="h-6 w-6" />}
          color="blue"
          description="受注・工程・工数・日報"
        />

        <StatCard
          title="チャットデータ"
          value={chatData}
          icon={<Users className="h-6 w-6" />}
          color="green"
          description="チャット・会話データ"
        />
      </div>

      {/* 応答状況 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="エクスポート済み"
          value={exportedCount}
          icon={<Download className="h-6 w-6" />}
          color="green"
          description="データエクスポート実行済み"
        />

        <StatCard
          title="期間延長"
          value={extendedCount}
          icon={<Calendar className="h-6 w-6" />}
          color="blue"
          description="保持期間を延長"
        />

        <StatCard
          title="削除済み"
          value={deletedCount}
          icon={<CheckCircle className="h-6 w-6" />}
          color="gray"
          description="ユーザー確認済み削除"
        />

        <StatCard
          title="対応待ち"
          value={pendingCount}
          icon={<XCircle className="h-6 w-6" />}
          color="yellow"
          description="まだ応答されていない警告"
        />
      </div>

      {/* 進捗状況 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">対応状況</h3>
        <div className="space-y-4">
          <ProgressBar
            value={criticalWarnings}
            max={totalWarnings}
            color="red"
            label="緊急対応が必要"
          />
          <ProgressBar
            value={exportedCount + extendedCount + deletedCount}
            max={totalWarnings}
            color="green"
            label="対応済み"
          />
          <ProgressBar
            value={pendingCount}
            max={totalWarnings}
            color="yellow"
            label="対応待ち"
          />
        </div>
      </div>

      {/* 最終更新時刻 */}
      {lastUpdated && (
        <div className="text-center text-sm text-gray-500">
          最終更新: {lastUpdated.toLocaleString('ja-JP')}
        </div>
      )}
    </div>
  );
};

export default ArchiveStatsDashboard;