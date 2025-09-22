"use client";
import React, { useState, useEffect } from "react";
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
  Download,
  ChevronDown,
  FileText,
  RefreshCcw,
  Camera,
  X,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { exportDefectReports } from "@/lib/utils/exportUtils";
import { useDefectReports } from './hooks/useDefectReports';

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
  const {
    defectReports,
    statistics,
    loading,
    error,
    createReport,
    updateReport,
    deleteReport,
    refreshData,
  } = useDefectReports();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | DefectReport["severity"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | DefectReport["status"]>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | DefectReport["category"]>("all");
  const [showNewReportModal, setShowNewReportModal] = useState(false);

  // 新規報告フォームの状態
  const [newReport, setNewReport] = useState({
    title: "",
    description: "",
    severity: "medium" as DefectReport["severity"],
    category: "quality" as DefectReport["category"],
    reporter: "",
    location: "",
    estimatedCost: "",
  });

  // 画像添付用の状態
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // エラー表示
  useEffect(() => {
    if (error) {
      console.error('DefectReports error:', error);
    }
  }, [error]);

  // 旧サンプルデータ削除
  /* const [defectReports, setDefectReports] = useState<DefectReport[]>([
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
  ]); */

  // アイコン取得
  const getSeverityIcon = (severity: DefectReport["severity"]) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "high": return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case "medium": return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "low": return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStatusIcon = (status: DefectReport["status"]) => {
    switch (status) {
      case "open": return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />;
      case "investigating": return <Search className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case "in_progress": return <Wrench className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case "closed": return <XCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
    }
  };

  const getCategoryIcon = (category: DefectReport["category"]) => {
    switch (category) {
      case "quality": return <CheckCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
      case "equipment": return <Settings className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
      case "process": return <Wrench className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
      case "material": return <Building2 className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
      case "safety": return <AlertTriangle className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
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

  // 画像添付処理
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalImages = attachedImages.length + newFiles.length;

    if (totalImages > 5) {
      alert("画像は最大5枚まで添付できます。");
      return;
    }

    // ファイルサイズチェック（5MB制限）
    const oversizedFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert("画像ファイルは5MB以下にしてください。");
      return;
    }

    // 画像ファイルのみ許可
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== newFiles.length) {
      alert("画像ファイルのみ添付できます。");
      return;
    }

    setAttachedImages(prev => [...prev, ...imageFiles]);

    // プレビュー生成
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 画像削除
  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 新規報告の保存
  const handleSaveNewReport = async () => {
    if (!newReport.title || !newReport.description || !newReport.reporter) {
      alert("必須項目を入力してください。");
      return;
    }

    try {
      const reportData = {
        title: newReport.title,
        description: newReport.description,
        severity: newReport.severity,
        category: newReport.category,
        reporter: newReport.reporter,
        location: newReport.location,
        estimatedCost: newReport.estimatedCost ? parseFloat(newReport.estimatedCost) : undefined,
        status: "open" as DefectReport["status"],
        dateReported: new Date(),
      };

      await createReport(reportData);
      await refreshData();

      // フォームをリセット
      setNewReport({
        title: "",
        description: "",
        severity: "medium",
        category: "quality",
        reporter: "",
        location: "",
        estimatedCost: "",
      });
      setAttachedImages([]);
      setImagePreviews([]);

      setShowNewReportModal(false);
    } catch (error) {
      console.error('Failed to create report:', error);
      alert('報告の作成に失敗しました: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">不具合報告管理</h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  総報告数: <span className="font-bold text-blue-600 dark:text-blue-400">{statistics.totalReports}</span>件 /
                  未解決: <span className="font-bold text-red-600 dark:text-red-400">{statistics.openReports}</span>件 /
                  緊急: <span className="font-bold text-red-600 dark:text-red-400">{statistics.criticalReports}</span>件
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
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

              {/* エクスポートボタン */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    disabled={filteredReports.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    エクスポート
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="px-3 py-2 text-sm text-gray-600 dark:text-slate-300 border-b border-gray-200 dark:border-slate-600">
                    エクスポート対象
                  </div>
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
                    <div>• フィルター適用後の不具合報告: {filteredReports.length}件</div>
                    <div>• 重要度: {filterSeverity === 'all' ? 'すべて' : severityLabels[filterSeverity as keyof typeof severityLabels]}</div>
                    <div>• 状態: {filterStatus === 'all' ? 'すべて' : statusLabels[filterStatus as keyof typeof statusLabels]}</div>
                    <div>• 分類: {filterCategory === 'all' ? 'すべて' : categoryLabels[filterCategory as keyof typeof categoryLabels]}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => exportDefectReports(filteredReports, 'csv', filterStatus, filterSeverity)}
                    disabled={filteredReports.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV形式でエクスポート
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportDefectReports(filteredReports, 'excel', filterStatus, filterSeverity)}
                    disabled={filteredReports.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel形式でエクスポート
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </div>

        {/* 不具合報告リスト */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">不具合報告一覧</h2>
              <Button
                onClick={() => setShowNewReportModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規報告
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-600">
            {loading ? (
              <div className="text-center py-16">
                <RefreshCcw className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4 animate-spin" />
                <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">データを読み込み中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                <p className="text-xl text-red-500 mb-2">データの読み込みに失敗しました</p>
                <p className="text-gray-400 dark:text-slate-500 mb-4">{error}</p>
                <Button onClick={refreshData} variant="outline">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  再試行
                </Button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-xl text-gray-500 dark:text-slate-400 mb-2">該当する不具合報告がありません</p>
                <p className="text-gray-400 dark:text-slate-500">検索条件を変更してください</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {/* 重要度アイコン */}
                  <div className="flex-shrink-0 mr-4">
                    {getSeverityIcon(report.severity)}
                  </div>

                  {/* 報告内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {report.title}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                          {report.reportNumber}
                        </span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(report.status)}
                          <span className="text-sm text-gray-600 dark:text-slate-300">
                            {statusLabels[report.status]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
                        <span>重要度: {severityLabels[report.severity]}</span>
                        <span>{report.dateReported.toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 dark:text-slate-300 mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 dark:text-slate-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4 text-gray-500 dark:text-slate-500" />
                        <span>報告者: {report.reporter}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-4 h-4 text-gray-500 dark:text-slate-500" />
                        <span>部門: {report.department}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getCategoryIcon(report.category)}
                        <span>分類: {categoryLabels[report.category]}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-500 dark:text-slate-500" />
                        <span>場所: {report.location}</span>
                      </div>
                    </div>

                    {report.assignee && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                        担当者: {report.assignee}
                      </div>
                    )}

                    {report.estimatedCost && (
                      <div className="text-sm text-gray-600 dark:text-slate-300">
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

        {/* 新規報告モーダル */}
        <Dialog open={showNewReportModal} onOpenChange={setShowNewReportModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">新規不具合報告</DialogTitle>
              <DialogDescription className="dark:text-slate-300">
                不具合の詳細情報を入力してください。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="dark:text-slate-200">タイトル *</Label>
                  <Input
                    id="title"
                    value={newReport.title}
                    onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="不具合のタイトルを入力"
                  />
                </div>
                <div>
                  <Label htmlFor="reporter" className="dark:text-slate-200">報告者 *</Label>
                  <Input
                    id="reporter"
                    value={newReport.reporter}
                    onChange={(e) => setNewReport(prev => ({ ...prev, reporter: e.target.value }))}
                    placeholder="報告者名を入力"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="dark:text-slate-200">詳細説明 *</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={newReport.description}
                  onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="不具合の詳細な説明を入力してください"
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity" className="dark:text-slate-200">重要度</Label>
                  <Select value={newReport.severity} onValueChange={(value) => setNewReport(prev => ({ ...prev, severity: value as DefectReport["severity"] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="critical">緊急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category" className="dark:text-slate-200">分類</Label>
                  <Select value={newReport.category} onValueChange={(value) => setNewReport(prev => ({ ...prev, category: value as DefectReport["category"] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quality">品質</SelectItem>
                      <SelectItem value="equipment">設備</SelectItem>
                      <SelectItem value="process">工程</SelectItem>
                      <SelectItem value="material">材料</SelectItem>
                      <SelectItem value="safety">安全</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location" className="dark:text-slate-200">発生場所</Label>
                <Input
                  id="location"
                  value={newReport.location}
                  onChange={(e) => setNewReport(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="不具合の発生場所を入力"
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                />
              </div>

              <div>
                <Label htmlFor="estimatedCost" className="dark:text-slate-200">推定費用 (円)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  value={newReport.estimatedCost}
                  onChange={(e) => setNewReport(prev => ({ ...prev, estimatedCost: e.target.value }))}
                  placeholder="推定される対応費用を入力"
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                />
              </div>
            </div>

            {/* 画像添付セクション */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="dark:text-slate-200">写真添付 (最大5枚、1枚5MB以下)</Label>
                <div className="relative">
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    写真を追加
                  </Button>
                </div>
              </div>

              {/* 画像プレビュー */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`添付画像 ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        {Math.round(attachedImages[index]?.size / 1024)}KB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewReportModal(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveNewReport} className="bg-red-600 hover:bg-red-700">
                報告を作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DefectReportsPage;