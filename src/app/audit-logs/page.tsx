"use client";
import React, { useState } from "react";
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
  Download,
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
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  actionType: "create" | "read" | "update" | "delete" | "login" | "logout" | "system";
  resourceType: "order" | "process" | "user" | "file" | "report" | "setting" | "system";
  resourceId?: string;
  resourceName?: string;
  details?: string;
  ipAddress: string;
  userAgent?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "success" | "failure" | "warning";
}

const AuditLogsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActionType, setFilterActionType] = useState<"all" | AuditLog["actionType"]>("all");
  const [filterResourceType, setFilterResourceType] = useState<"all" | AuditLog["resourceType"]>("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | AuditLog["severity"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | AuditLog["status"]>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // サンプル操作履歴データ
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: "1",
      timestamp: new Date(Date.now() - 300000),
      userId: "user001",
      userName: "田中部長",
      userRole: "生産部長",
      action: "工程進捗を更新",
      actionType: "update",
      resourceType: "process",
      resourceId: "proc-123",
      resourceName: "製品A-001 加工工程",
      details: "進捗率を75%から85%に更新",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      severity: "low",
      status: "success",
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 900000),
      userId: "user002",
      userName: "佐藤作業員",
      userRole: "加工担当",
      action: "新規受注案件作成",
      actionType: "create",
      resourceType: "order",
      resourceId: "ord-456",
      resourceName: "精密部品製造",
      details: "顧客: ABC製作所、納期: 2025-02-15",
      ipAddress: "192.168.1.105",
      severity: "medium",
      status: "success",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 1800000),
      userId: "admin",
      userName: "システム管理者",
      userRole: "管理者",
      action: "ユーザー権限変更",
      actionType: "update",
      resourceType: "user",
      resourceId: "user003",
      resourceName: "山田技師",
      details: "権限レベルを'一般'から'管理者'に変更",
      ipAddress: "192.168.1.50",
      severity: "high",
      status: "success",
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 3600000),
      userId: "user004",
      userName: "鈴木課長",
      userRole: "品質管理課長",
      action: "機密ファイルアクセス試行",
      actionType: "read",
      resourceType: "file",
      resourceId: "file-789",
      resourceName: "設計仕様書_機密.pdf",
      details: "アクセス権限不足により拒否",
      ipAddress: "192.168.1.110",
      severity: "high",
      status: "failure",
    },
    {
      id: "5",
      timestamp: new Date(Date.now() - 7200000),
      userId: "system",
      userName: "システム",
      userRole: "システム",
      action: "自動バックアップ実行",
      actionType: "system",
      resourceType: "system",
      details: "データベース自動バックアップが正常に完了",
      ipAddress: "localhost",
      severity: "low",
      status: "success",
    },
    {
      id: "6",
      timestamp: new Date(Date.now() - 10800000),
      userId: "user005",
      userName: "伊藤主任",
      userRole: "安全管理",
      action: "不正ログイン試行",
      actionType: "login",
      resourceType: "system",
      details: "パスワード5回連続失敗",
      ipAddress: "203.0.113.100",
      severity: "critical",
      status: "failure",
    },
  ]);

  // アイコン取得
  const getActionIcon = (actionType: AuditLog["actionType"]) => {
    switch (actionType) {
      case "create": return <Plus className="w-4 h-4 text-green-600" />;
      case "read": return <Eye className="w-4 h-4 text-blue-600" />;
      case "update": return <Edit className="w-4 h-4 text-orange-600" />;
      case "delete": return <Trash2 className="w-4 h-4 text-red-600" />;
      case "login": return <LogIn className="w-4 h-4 text-purple-600" />;
      case "logout": return <LogOut className="w-4 h-4 text-gray-600" />;
      case "system": return <Settings className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getStatusIcon = (status: AuditLog["status"]) => {
    switch (status) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failure": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: AuditLog["severity"]) => {
    switch (severity) {
      case "low": return "text-blue-600 bg-blue-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "high": return "text-orange-600 bg-orange-50";
      case "critical": return "text-red-600 bg-red-50";
    }
  };

  // フィルタリング
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.resourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.details?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesActionType = filterActionType === "all" || log.actionType === filterActionType;
    const matchesResourceType = filterResourceType === "all" || log.resourceType === filterResourceType;
    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;

    return matchesSearch && matchesActionType && matchesResourceType && matchesSeverity && matchesStatus;
  });

  const actionTypeLabels = {
    create: "作成",
    read: "参照",
    update: "更新",
    delete: "削除",
    login: "ログイン",
    logout: "ログアウト",
    system: "システム",
  };

  const resourceTypeLabels = {
    order: "受注案件",
    process: "工程",
    user: "ユーザー",
    file: "ファイル",
    report: "レポート",
    setting: "設定",
    system: "システム",
  };

  const severityLabels = {
    low: "低",
    medium: "中",
    high: "高",
    critical: "重要",
  };

  const statusLabels = {
    success: "成功",
    failure: "失敗",
    warning: "警告",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Activity className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">操作履歴</h1>
                <p className="text-sm text-gray-600">
                  システムの全操作を記録・監査します
                </p>
              </div>
            </div>
            
            <Button variant="outline" className="text-gray-600 border-gray-300">
              <Download className="w-4 h-4 mr-2" />
              エクスポート
            </Button>
          </div>

          {/* フィルターバー */}
          <div className="mt-4 flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="操作履歴を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
              </div>
            </div>

            <Select
              value={filterActionType}
              onValueChange={(value: string) => setFilterActionType(value as any)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="操作種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="create">作成</SelectItem>
                <SelectItem value="read">参照</SelectItem>
                <SelectItem value="update">更新</SelectItem>
                <SelectItem value="delete">削除</SelectItem>
                <SelectItem value="login">ログイン</SelectItem>
                <SelectItem value="logout">ログアウト</SelectItem>
                <SelectItem value="system">システム</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterSeverity}
              onValueChange={(value: string) => setFilterSeverity(value as any)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="重要度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="critical">重要</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(value: string) => setFilterStatus(value as any)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failure">失敗</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 操作履歴リスト */}
        <div className="flex-1 overflow-auto">
          <div className="divide-y divide-gray-200">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">該当する操作履歴がありません</p>
                <p className="text-gray-400">検索条件を変更してください</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* 操作アイコン */}
                  <div className="flex-shrink-0 mr-4 mt-1">
                    {getActionIcon(log.actionType)}
                  </div>

                  {/* 操作内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {log.action}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(log.status)}
                          <span className="text-xs text-gray-600">
                            {statusLabels[log.status]}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(log.severity)}`}>
                          {severityLabels[log.severity]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
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
                    
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{log.userName} ({log.userRole})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>{resourceTypeLabels[log.resourceType]}</span>
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
                      <p className="text-sm text-gray-700">
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