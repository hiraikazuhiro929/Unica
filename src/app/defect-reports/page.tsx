"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wrench,
  Settings,
  Building2,
  User,
  Calendar,
} from "lucide-react";

// 型定義
interface DefectReport {
  id: string;
  reportNumber: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "in_progress" | "resolved" | "closed";
  category: "quality" | "equipment" | "process" | "material" | "safety" | "other";
  reporter: string;
  assignee?: string;
  department: string;
  location: string;
  dateReported: Date;
  dateResolved?: Date;
  estimatedResolution?: Date;
  actualCost?: number;
  estimatedCost?: number;
  attachments?: string[];
  correctionActions?: string[];
  preventiveActions?: string[];
}

const DefectReportsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | DefectReport["severity"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | DefectReport["status"]>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | DefectReport["category"]>("all");
  const [showNewReportModal, setShowNewReportModal] = useState(false);

  // サンプル不具合報告データ
  const [defectReports, setDefectReports] = useState<DefectReport[]>([
    {
      id: "1",
      reportNumber: "DEF-2025-001",
      title: "加工精度不良",
      description: "製品A-001の寸法精度が仕様値を外れています。公差±0.01mmに対して±0.03mmの誤差が発生。",
      severity: "high",
      status: "investigating",
      category: "quality",
      reporter: "田中作業員",
      assignee: "佐藤品質管理",
      department: "生産部",
      location: "第1工場 ライン3",
      dateReported: new Date(Date.now() - 86400000 * 2),
      estimatedResolution: new Date(Date.now() + 86400000 * 3),
      estimatedCost: 150000,
      correctionActions: ["再加工実施", "検査基準見直し"],
    },
    {
      id: "2",
      reportNumber: "DEF-2025-002",
      title: "設備異常停止",
      description: "CNC旋盤M-003が異常停止。エラーコード E-402 表示。冷却水温度異常の可能性。",
      severity: "critical",
      status: "in_progress",
      category: "equipment",
      reporter: "山田技師",
      assignee: "設備保全チーム",
      department: "保全部",
      location: "第2工場 B棟",
      dateReported: new Date(Date.now() - 43200000),
      estimatedResolution: new Date(Date.now() + 86400000),
      estimatedCost: 300000,
      correctionActions: ["冷却システム点検", "緊急部品交換"],
    },
    {
      id: "3",
      reportNumber: "DEF-2025-003",
      title: "材料不良発見",
      description: "入荷した鋼材ロットNo.ST-240115に表面クラックを発見。検査で10本中3本に欠陥あり。",
      severity: "medium",
      status: "resolved",
      category: "material",
      reporter: "鈴木検査員",
      assignee: "購買部",
      department: "品質管理部",
      location: "材料倉庫",
      dateReported: new Date(Date.now() - 86400000 * 7),
      dateResolved: new Date(Date.now() - 86400000 * 2),
      actualCost: 80000,
      correctionActions: ["不良材料返品", "代替材料手配"],
      preventiveActions: ["入荷検査強化", "サプライヤー品質監査"],
    },
    {
      id: "4",
      reportNumber: "DEF-2025-004",
      title: "安全装置作動",
      description: "プレス機P-005の安全カーテンが予期しない作動。センサー感度調整が必要。",
      severity: "medium",
      status: "open",
      category: "safety",
      reporter: "伊藤安全管理",
      department: "総務部",
      location: "第1工場 A棟",
      dateReported: new Date(Date.now() - 3600000),
      estimatedCost: 50000,
    },
  ]);

  // アイコン取得
  const getSeverityIcon = (severity: DefectReport["severity"]) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4 text-red-600" />;
      case "high": return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "medium": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "low": return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusIcon = (status: DefectReport["status"]) => {
    switch (status) {
      case "open": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "investigating": return <Search className="w-4 h-4 text-orange-500" />;
      case "in_progress": return <Wrench className="w-4 h-4 text-blue-500" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed": return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: DefectReport["category"]) => {
    switch (category) {
      case "quality": return <CheckCircle className="w-4 h-4" />;
      case "equipment": return <Settings className="w-4 h-4" />;
      case "process": return <Wrench className="w-4 h-4" />;
      case "material": return <Building2 className="w-4 h-4" />;
      case "safety": return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // フィルタリング
  const filteredReports = defectReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.reporter.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = filterSeverity === "all" || report.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    const matchesCategory = filterCategory === "all" || report.category === filterCategory;

    return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
  });

  const severityLabels = {
    critical: "緊急",
    high: "高",
    medium: "中",
    low: "低"
  };

  const statusLabels = {
    open: "新規",
    investigating: "調査中",
    in_progress: "対応中",
    resolved: "解決済",
    closed: "完了"
  };

  const categoryLabels = {
    quality: "品質",
    equipment: "設備",
    process: "工程",
    material: "材料",
    safety: "安全",
    other: "その他"
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">不具合報告管理</h1>
                <p className="text-sm text-gray-600">
                  総報告数: <span className="font-bold text-blue-600">{defectReports.length}</span>件 /
                  未解決: <span className="font-bold text-red-600">
                    {defectReports.filter(r => !["resolved", "closed"].includes(r.status)).length}
                  </span>件
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="不具合報告を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80"
                />
              </div>

              {/* フィルター */}
              <Select
                value={filterSeverity}
                onValueChange={(value: string) => setFilterSeverity(value as any)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="重要度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="critical">緊急</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
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
                  <SelectItem value="open">新規</SelectItem>
                  <SelectItem value="investigating">調査中</SelectItem>
                  <SelectItem value="in_progress">対応中</SelectItem>
                  <SelectItem value="resolved">解決済</SelectItem>
                  <SelectItem value="closed">完了</SelectItem>
                </SelectContent>
              </Select>

              {/* 新規追加ボタン */}
              <Button
                onClick={() => setShowNewReportModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規報告
              </Button>
            </div>
          </div>
        </div>

        {/* 不具合報告リスト */}
        <div className="flex-1 overflow-auto">
          <div className="divide-y divide-gray-200">
            {filteredReports.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">該当する不具合報告がありません</p>
                <p className="text-gray-400">検索条件を変更してください</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start p-6 hover:bg-gray-50 transition-colors"
                >
                  {/* 重要度アイコン */}
                  <div className="flex-shrink-0 mr-4">
                    {getSeverityIcon(report.severity)}
                  </div>

                  {/* 報告内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {report.title}
                        </h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {report.reportNumber}
                        </span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(report.status)}
                          <span className="text-sm text-gray-600">
                            {statusLabels[report.status]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>重要度: {severityLabels[report.severity]}</span>
                        <span>{report.dateReported.toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>報告者: {report.reporter}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-4 h-4" />
                        <span>部門: {report.department}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getCategoryIcon(report.category)}
                        <span>分類: {categoryLabels[report.category]}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>場所: {report.location}</span>
                      </div>
                    </div>

                    {report.assignee && (
                      <div className="text-sm text-blue-600 mb-2">
                        担当者: {report.assignee}
                      </div>
                    )}

                    {report.estimatedCost && (
                      <div className="text-sm text-gray-600">
                        推定費用: ¥{report.estimatedCost.toLocaleString()}
                        {report.actualCost && (
                          <span className="ml-2">
                            (実費: ¥{report.actualCost.toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-green-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default DefectReportsPage;