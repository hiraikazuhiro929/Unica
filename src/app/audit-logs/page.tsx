"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  FileText,
  Edit,
  Trash2,
  Eye,
  Plus,
  Settings,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  getAuditLogs,
  subscribeToAuditLogs,
  AuditLog,
  AuditLogFilters,
  ACTION_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS
} from "@/lib/firebase/auditLogger";

interface AuditLogDisplay extends AuditLog {
  // 追加のUI表示用プロパティがあれば定義
}

const AuditLogsPage = () => {
  // State管理
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActionType, setFilterActionType] = useState<"all" | AuditLog["actionType"]>("all");
  const [filterResourceType, setFilterResourceType] = useState<"all" | AuditLog["resourceType"]>("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | AuditLog["severity"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | AuditLog["status"]>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // 一時的な企業ID（実際の実装では認証システムから取得）
  const [companyId] = useState("demo-company-id");

  // データ取得
  useEffect(() => {
    loadAuditLogs();
  }, [companyId]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: AuditLogFilters = {
        companyId,
        actionType: filterActionType !== 'all' ? filterActionType : undefined,
        resourceType: filterResourceType !== 'all' ? filterResourceType : undefined,
        severity: filterSeverity !== 'all' ? filterSeverity : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        searchQuery: searchQuery.trim() || undefined,
      };

      // 日付範囲フィルタを追加
      if (dateFrom && dateTo) {
        filters.dateRange = {
          start: new Date(dateFrom),
          end: new Date(dateTo),
        };
      }

      const result = await getAuditLogs(filters, 100);

      if (result.error) {
        setError(result.error);
      } else {
        setAuditLogs(result.data);
      }
    } catch (err: any) {
      setError(err.message || '監査ログの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // フィルター変更時の再取得
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoading) {
        loadAuditLogs();
      }
    }, 300); // デバウンス

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterActionType, filterResourceType, filterSeverity, filterStatus, dateFrom, dateTo]);

  // アイコン取得
  const getActionIcon = (actionType: AuditLog["actionType"]) => {
    switch (actionType) {
      case "create": return <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "read": return <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "update": return <Edit className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case "delete": return <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "login": return <LogIn className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "logout": return <LogOut className="w-4 h-4 text-gray-600 dark:text-slate-400" />;
      case "system": return <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getStatusIcon = (status: AuditLog["status"]) => {
    switch (status) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case "failure": return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
    }
  };

  const getSeverityColor = (severity: AuditLog["severity"]) => {
    switch (severity) {
      case "low": return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30";
      case "medium": return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30";
      case "high": return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30";
      case "critical": return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
    }
  };

  // 表示用のフィルタリングされたログ（検索フィルタは既にサーバーサイドで適用済み）
  const filteredLogs = auditLogs;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">操作履歴</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  システムの全操作を記録・監査します
                </p>
              </div>
            </div>
          </div>

          {/* フィルターバー */}
          <div className="mt-4 flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="操作履歴を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
              </div>
            </div>

            <Select
              value={filterActionType}
              onValueChange={(value: string) => setFilterActionType(value as any)}
            >
              <SelectTrigger className="w-32 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="操作種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterSeverity}
              onValueChange={(value: string) => setFilterSeverity(value as any)}
            >
              <SelectTrigger className="w-32 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="重要度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(value: string) => setFilterStatus(value as any)}
            >
              <SelectTrigger className="w-32 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="状態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-6 mb-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  データ取得エラー
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={loadAuditLogs}
                    disabled={isLoading}
                    className="text-red-800 border-red-300 hover:bg-red-100 dark:text-red-200 dark:border-red-700 dark:hover:bg-red-900/20"
                  >
                    再試行
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作履歴リスト */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {isLoading ? (
              <div className="text-center py-16">
                <RefreshCw className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4 animate-spin" />
                <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">データを読み込み中...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <Activity className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">該当する操作履歴がありません</p>
                <p className="text-gray-400 dark:text-slate-500">検索条件を変更するか、システムの利用を開始してください</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                >
                  {/* 操作アイコン */}
                  <div className="flex-shrink-0 mr-4 mt-1">
                    {getActionIcon(log.actionType)}
                  </div>

                  {/* 操作内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {log.action}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(log.status)}
                          <span className="text-xs text-gray-600 dark:text-slate-400">
                            {STATUS_LABELS[log.status]}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(log.severity)}`}>
                          {SEVERITY_LABELS[log.severity]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {log.timestamp.toLocaleString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 dark:text-slate-400 mb-2">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{log.userName} ({log.userRole})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>{RESOURCE_TYPE_LABELS[log.resourceType]}</span>
                      </div>
                      {log.resourceName && (
                        <div className="flex items-center space-x-1">
                          <span>対象: {log.resourceName}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    </div>
                    
                    {log.details && (
                      <p className="text-sm text-gray-700 dark:text-slate-300">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;