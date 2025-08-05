"use client";

import { useState, useEffect } from "react";
import { Calendar, Search, FileText, Clock, User, Filter, ChevronDown, Eye, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DailyReportEntry, WorkTimeEntry } from "@/app/tasks/types";
import { getDailyReportsByWorker } from "@/lib/firebase/dailyReports";
import { useRouter } from "next/navigation";

// モックデータ（バックアップ用）
const mockDailyReports: DailyReportEntry[] = [
  {
    id: "1",
    workerId: "worker1",
    workerName: "田中太郎",
    date: "2025-01-31",
    dreams: "品質向上を目指して効率的な作業を心がけたい",
    todaysGoals: "製番A001の加工作業完了、新しい工具の使用方法習得",
    workTimeEntries: [
      {
        id: "t1",
        startTime: "08:00",
        endTime: "10:30",
        productionNumber: "A001",
        workContentId: "4",
        workContentName: "機械加工", 
        durationMinutes: 150,
        isSyncedToProcess: true,
      },
      {
        id: "t2",
        startTime: "13:00",
        endTime: "16:00",
        productionNumber: "A001",
        workContentId: "3",
        workContentName: "仕上げ",
        durationMinutes: 180,
        isSyncedToProcess: true,
      },
    ],
    todaysResults: "予定通り製番A001の作業を完了。新工具による加工精度も良好。",
    whatWentWell: "チームとの連携がスムーズで、予定より30分早く完了できた。",
    whatDidntGoWell: "午前中の段取りに予想以上に時間がかかった。",
    requestsToManagement: "新工具の追加購入を検討してほしい。",
    totalWorkMinutes: 330,
    isSubmitted: true,
    submittedAt: "2025-01-31T17:00:00Z",
    approved: true,
    approvedBy: "supervisor1",
    approvedAt: "2025-02-01T09:00:00Z",
    createdAt: "2025-01-31T16:30:00Z",
    updatedAt: "2025-01-31T17:00:00Z",
  },
  {
    id: "2",
    workerId: "worker1",
    workerName: "田中太郎",
    date: "2025-01-30",
    dreams: "安全第一で丁寧な作業を続けたい",
    todaysGoals: "製番B002のデータ作業と面取り作業",
    workTimeEntries: [
      {
        id: "t3",
        startTime: "08:30",
        endTime: "12:00",
        productionNumber: "B002",
        workContentId: "1",
        workContentName: "データ",
        durationMinutes: 210,
        isSyncedToProcess: false,
      },
      {
        id: "t4",
        startTime: "13:00",
        endTime: "15:30",
        productionNumber: "B002",
        workContentId: "2",
        workContentName: "面取り",
        durationMinutes: 150,
        isSyncedToProcess: false,
      },
    ],
    todaysResults: "データ作成が順調に進み、面取り作業も完了。",
    whatWentWell: "データ作成での新しいアプローチが効率的だった。",
    whatDidntGoWell: "昼休み後の集中力の回復に時間がかかった。",
    requestsToManagement: "作業環境の照明をもう少し明るくしてほしい。",
    totalWorkMinutes: 360,
    isSubmitted: true,
    submittedAt: "2025-01-30T17:00:00Z",
    approved: false,
    createdAt: "2025-01-30T16:45:00Z",
    updatedAt: "2025-01-30T17:00:00Z",
  },
];

export default function DailyReportsHistoryPage() {
  const router = useRouter();
  const [reports, setReports] = useState<DailyReportEntry[]>([]);
  const [filteredReports, setFilteredReports] = useState<DailyReportEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<DailyReportEntry | null>(null);

  // 日報データを読み込み
  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getDailyReportsByWorker("current-user", {
          limit: 50,
          orderBy: "date",
          order: "desc"
        });
        
        if (error) {
          console.error('Error loading reports:', error);
          setReports(mockDailyReports);
        } else {
          setReports(data);
        }
      } catch (error) {
        console.error('Error loading reports:', error);
        setReports(mockDailyReports);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReports();
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = reports;

    // 検索クエリによるフィルタリング
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.workerName.includes(searchQuery) ||
        report.todaysGoals.includes(searchQuery) ||
        report.todaysResults.includes(searchQuery) ||
        report.workTimeEntries.some(entry => entry.productionNumber.includes(searchQuery))
      );
    }

    // ステータスによるフィルタリング
    if (statusFilter !== "all") {
      filtered = filtered.filter(report => {
        switch (statusFilter) {
          case "submitted":
            return report.isSubmitted;
          case "draft":
            return !report.isSubmitted;
          case "approved":
            return report.approved;
          case "pending":
            return report.isSubmitted && !report.approved;
          default:
            return true;
        }
      });
    }

    // 日付によるフィルタリング
    if (dateFilter !== "all") {
      const today = new Date();
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.date);
        switch (dateFilter) {
          case "today":
            return reportDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return reportDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return reportDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, statusFilter, dateFilter]);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  const getStatusBadge = (report: DailyReportEntry) => {
    if (!report.isSubmitted) {
      return <Badge variant="secondary">下書き</Badge>;
    }
    if (report.approved) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">承認済み</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">承認待ち</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">日報一覧</h1>
            <p className="text-sm sm:text-base text-gray-600">
              作成済みの日報を確認・管理します
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/daily-reports")}
              className="w-full sm:w-auto bg-white border-gray-200 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </div>
        </div>

        {/* フィルタ・検索セクション */}
        <Card className="shadow border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="作業者名、製番、内容で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-blue-400"
                />
              </div>

              {/* ステータスフィルタ */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 focus:border-blue-400">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="submitted">提出済み</SelectItem>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="pending">承認待ち</SelectItem>
                </SelectContent>
              </Select>

              {/* 日付フィルタ */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-white border-gray-200 focus:border-blue-400">
                  <SelectValue placeholder="期間" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="today">今日</SelectItem>
                  <SelectItem value="week">1週間以内</SelectItem>
                  <SelectItem value="month">1ヶ月以内</SelectItem>
                </SelectContent>
              </Select>

              {/* 結果件数 */}
              <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600">
                {filteredReports.length}件の日報
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 日報一覧 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="shadow border border-gray-200 bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-gray-900">
                        {new Date(report.date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {getStatusBadge(report)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{report.workerName}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 作業時間サマリー */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">合計: {formatTime(report.totalWorkMinutes)}</span>
                  <span className="text-gray-500">
                    ({report.workTimeEntries.length}件の作業)
                  </span>
                </div>

                {/* 製番一覧 */}
                <div className="flex flex-wrap gap-1">
                  {[...new Set(report.workTimeEntries.map(entry => entry.productionNumber))].map((productionNumber) => (
                    <Badge key={productionNumber} variant="outline" className="text-xs">
                      {productionNumber}
                    </Badge>
                  ))}
                </div>

                {/* 今日の目標（省略版） */}
                <div className="text-sm text-gray-700 line-clamp-2">
                  <strong>目標:</strong> {report.todaysGoals}
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                        className="flex-1 bg-white hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳細
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          日報詳細 - {report.date}
                        </DialogTitle>
                      </DialogHeader>
                      {selectedReport && (
                        <div className="space-y-4 py-4">
                          {/* 基本情報 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <strong>作業者:</strong> {selectedReport.workerName}
                            </div>
                            <div>
                              <strong>合計作業時間:</strong> {formatTime(selectedReport.totalWorkMinutes)}
                            </div>
                          </div>

                          {/* 夢や希望・目標 */}
                          <div className="space-y-2">
                            <div>
                              <strong>夢や希望:</strong>
                              <p className="text-sm text-gray-700 mt-1 p-2 bg-pink-50 rounded">{selectedReport.dreams}</p>
                            </div>
                            <div>
                              <strong>今日の目標:</strong>
                              <p className="text-sm text-gray-700 mt-1 p-2 bg-green-50 rounded">{selectedReport.todaysGoals}</p>
                            </div>
                          </div>

                          {/* 作業時間詳細 */}
                          <div>
                            <strong>作業時間詳細:</strong>
                            <div className="mt-2 space-y-2">
                              {selectedReport.workTimeEntries.map((entry) => (
                                <div key={entry.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                  <div>
                                    <span className="font-medium">{entry.productionNumber}</span> - {entry.workContentName}
                                  </div>
                                  <div>
                                    {entry.startTime} - {entry.endTime} ({formatTime(entry.durationMinutes)})
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 振り返り */}
                          <div className="space-y-2">
                            <div>
                              <strong>今日の結果:</strong>
                              <p className="text-sm text-gray-700 mt-1 p-2 bg-blue-50 rounded">{selectedReport.todaysResults}</p>
                            </div>
                            <div>
                              <strong>うまくいったこと:</strong>
                              <p className="text-sm text-gray-700 mt-1 p-2 bg-green-50 rounded">{selectedReport.whatWentWell}</p>
                            </div>
                            <div>
                              <strong>うまくいかなかったこと:</strong>
                              <p className="text-sm text-gray-700 mt-1 p-2 bg-orange-50 rounded">{selectedReport.whatDidntGoWell}</p>
                            </div>
                            <div>
                              <strong>社内への要望:</strong>
                              <p className="text-sm text-gray-700 mt-1 p-2 bg-purple-50 rounded">{selectedReport.requestsToManagement}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {!report.isSubmitted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/daily-reports?edit=${report.id}`)}
                      className="flex-1 bg-white hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 空の状態 */}
        {filteredReports.length === 0 && (
          <Card className="shadow border border-gray-200 bg-white">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">日報が見つかりません</h3>
              <p className="text-gray-500 mb-4">検索条件を変更するか、新しい日報を作成してください。</p>
              <Button
                onClick={() => router.push("/daily-reports")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                新規作成
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}