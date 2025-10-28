// アーカイブ管理ダッシュボードページ
// 包括的なアーカイブ・削除システムのメインインターフェース

'use client';

import React, { useState } from 'react';
import {
  Archive,
  Database,
  Settings,
  AlertTriangle,
  Download,
  RefreshCw,
  Bell,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useArchiveManager } from '@/hooks/useArchiveManager';
import ArchiveStatsDashboard from '@/components/archive/ArchiveStatsDashboard';
import ArchiveWarningCard from '@/components/archive/ArchiveWarningCard';
import ExportManager from '@/components/archive/ExportManager';

// =============================================================================
// 型定義
// =============================================================================

type TabType = 'overview' | 'warnings' | 'export' | 'settings';

interface FilterOptions {
  level: 'all' | 'critical' | 'warning' | 'info';
  collection: string;
  actionType: 'all' | 'archive' | 'delete';
  status: 'all' | 'read' | 'unread';
}

// =============================================================================
// フィルタリングコンポーネント
// =============================================================================

const WarningFilters: React.FC<{
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  collections: string[];
}> = ({ filters, onFiltersChange, collections }) => {
  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">フィルター</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 警告レベル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            警告レベル
          </label>
          <select
            value={filters.level}
            onChange={(e) => onFiltersChange({
              ...filters,
              level: e.target.value as FilterOptions['level']
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">すべて</option>
            <option value="critical">緊急</option>
            <option value="warning">注意</option>
            <option value="info">情報</option>
          </select>
        </div>

        {/* コレクション */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            コレクション
          </label>
          <select
            value={filters.collection}
            onChange={(e) => onFiltersChange({
              ...filters,
              collection: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">すべて</option>
            {collections.map(collection => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>
        </div>

        {/* アクション種別 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アクション
          </label>
          <select
            value={filters.actionType}
            onChange={(e) => onFiltersChange({
              ...filters,
              actionType: e.target.value as FilterOptions['actionType']
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">すべて</option>
            <option value="archive">アーカイブ</option>
            <option value="delete">削除</option>
          </select>
        </div>

        {/* 既読状態 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            状態
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({
              ...filters,
              status: e.target.value as FilterOptions['status']
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">すべて</option>
            <option value="unread">未読</option>
            <option value="read">既読</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 設定パネルコンポーネント
// =============================================================================

const SettingsPanel: React.FC<{
  settings: any;
  onUpdateSettings: (settings: any) => Promise<void>;
}> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings(localSettings);
    } catch (error) {
      console.error('設定保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ビジネスデータ設定 */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ビジネスデータ設定 (6ヶ月アーカイブ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              アーカイブまでの日数
            </label>
            <input
              type="number"
              value={localSettings.businessDataPolicy?.archiveDays || 180}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                businessDataPolicy: {
                  ...localSettings.businessDataPolicy,
                  archiveDays: Number(e.target.value)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              警告日数 (カンマ区切り)
            </label>
            <input
              type="text"
              value={localSettings.businessDataPolicy?.warningDays?.join(',') || '30,7,1'}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                businessDataPolicy: {
                  ...localSettings.businessDataPolicy,
                  warningDays: e.target.value.split(',').map(d => Number(d.trim()))
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.businessDataPolicy?.requireExportBeforeArchive || false}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                businessDataPolicy: {
                  ...localSettings.businessDataPolicy,
                  requireExportBeforeArchive: e.target.checked
                }
              })}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">
              アーカイブ前にエクスポートを必須とする
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.businessDataPolicy?.autoExportBeforeArchive || false}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                businessDataPolicy: {
                  ...localSettings.businessDataPolicy,
                  autoExportBeforeArchive: e.target.checked
                }
              })}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">
              アーカイブ前に自動エクスポートを実行
            </span>
          </label>
        </div>
      </div>

      {/* チャットデータ設定 */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          チャットデータ設定 (3ヶ月削除)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              削除までの日数
            </label>
            <input
              type="number"
              value={localSettings.chatDataPolicy?.deleteDays || 90}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                chatDataPolicy: {
                  ...localSettings.chatDataPolicy,
                  deleteDays: Number(e.target.value)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              警告日数 (カンマ区切り)
            </label>
            <input
              type="text"
              value={localSettings.chatDataPolicy?.warningDays?.join(',') || '7,1'}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                chatDataPolicy: {
                  ...localSettings.chatDataPolicy,
                  warningDays: e.target.value.split(',').map(d => Number(d.trim()))
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          通知設定
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.notificationSettings?.email?.enabled || false}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  notificationSettings: {
                    ...localSettings.notificationSettings,
                    email: {
                      ...localSettings.notificationSettings?.email,
                      enabled: e.target.checked
                    }
                  }
                })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                メール通知を有効にする
              </span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.notificationSettings?.browser?.enabled || false}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  notificationSettings: {
                    ...localSettings.notificationSettings,
                    browser: {
                      ...localSettings.notificationSettings?.browser,
                      enabled: e.target.checked
                    }
                  }
                })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                ブラウザ通知を有効にする
              </span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.notificationSettings?.dashboard?.enabled || false}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  notificationSettings: {
                    ...localSettings.notificationSettings,
                    dashboard: {
                      ...localSettings.notificationSettings?.dashboard,
                      enabled: e.target.checked
                    }
                  }
                })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                ダッシュボード通知を有効にする
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{isSaving ? '保存中...' : '設定を保存'}</span>
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function ArchivePage() {
  const {
    warnings,
    statistics,
    settings,
    isLoading,
    error,
    lastRefresh,
    refreshData,
    handleWarningResponse,
    handleBulkWarningResponse,
    markWarningAsRead,
    updateSettings,
    executeArchiveProcess,
    sendTestNotification,
    setError
  } = useArchiveManager({
    autoRefresh: true,
    refreshInterval: 60000 // 1分
  });

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    level: 'all',
    collection: '',
    actionType: 'all',
    status: 'all'
  });

  // =============================================================================
  // フィルタリング
  // =============================================================================

  const filteredWarnings = warnings.filter(warning => {
    if (filters.level !== 'all' && warning.warningLevel !== filters.level) return false;
    if (filters.collection && warning.collectionName !== filters.collection) return false;
    if (filters.actionType !== 'all' && warning.actionType !== filters.actionType) return false;
    if (filters.status === 'read' && !warning.isRead) return false;
    if (filters.status === 'unread' && warning.isRead) return false;
    return true;
  });

  const uniqueCollections = Array.from(new Set(warnings.map(w => w.collectionName)));

  // =============================================================================
  // イベントハンドラー
  // =============================================================================

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedWarnings([]);
    setError(null);
  };

  const handleWarningSelection = (warningId: string, selected: boolean) => {
    setSelectedWarnings(prev =>
      selected
        ? [...prev, warningId]
        : prev.filter(id => id !== warningId)
    );
  };

  const handleBulkAction = async (
    action: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ) => {
    if (selectedWarnings.length === 0) {
      alert('操作する警告を選択してください');
      return;
    }

    const result = await handleBulkWarningResponse(selectedWarnings, action, additionalDays);
    if (result.success) {
      setSelectedWarnings([]);
    }
  };

  // =============================================================================
  // レンダリング
  // =============================================================================

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ページヘッダー */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Archive className="h-8 w-8 text-blue-500" />
            <span>アーカイブ管理</span>
          </h1>
          <p className="text-gray-600 mt-2">
            製造業務管理システムのデータアーカイブ・削除システム
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={sendTestNotification}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
          >
            <Bell className="h-4 w-4" />
            <span>テスト通知</span>
          </button>

          <button
            onClick={executeArchiveProcess}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            <Archive className="h-4 w-4" />
            <span>手動実行</span>
          </button>

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>更新</span>
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: '概要', icon: Database },
            { key: 'warnings', label: '警告', icon: AlertTriangle },
            { key: 'export', label: 'エクスポート', icon: Download },
            { key: 'settings', label: '設定', icon: Settings }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as TabType)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.key === 'warnings' && statistics?.totalWarnings && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {statistics.totalWarnings}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <ArchiveStatsDashboard
            statistics={statistics || {
              totalWarnings: 0,
              criticalWarnings: 0,
              warningWarnings: 0,
              infoWarnings: 0,
              exportedCount: 0,
              extendedCount: 0,
              deletedCount: 0,
              pendingCount: 0
            }}
            isLoading={isLoading}
            lastUpdated={lastRefresh}
            onRefresh={refreshData}
          />
        )}

        {/* 警告タブ */}
        {activeTab === 'warnings' && (
          <div className="space-y-6">
            {/* フィルター */}
            <WarningFilters
              filters={filters}
              onFiltersChange={setFilters}
              collections={uniqueCollections}
            />

            {/* 一括操作 */}
            {selectedWarnings.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedWarnings.length}件選択中
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBulkAction('export')}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      一括エクスポート
                    </button>
                    <button
                      onClick={() => handleBulkAction('extend', 30)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      30日延長
                    </button>
                    <button
                      onClick={() => setSelectedWarnings([])}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      選択解除
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 警告リスト */}
            {filteredWarnings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {filters.level !== 'all' || filters.collection || filters.actionType !== 'all'
                  ? 'フィルター条件に一致する警告はありません'
                  : '現在、警告はありません'
                }
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWarnings.map(warning => (
                  <div key={warning.id} className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedWarnings.includes(warning.id)}
                      onChange={(e) => handleWarningSelection(warning.id, e.target.checked)}
                      className="mt-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <div className="flex-1">
                      <ArchiveWarningCard
                        warning={warning}
                        onResponse={handleWarningResponse}
                        onMarkAsRead={markWarningAsRead}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* エクスポートタブ */}
        {activeTab === 'export' && (
          <ExportManager />
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
      </div>
    </div>
  );
}