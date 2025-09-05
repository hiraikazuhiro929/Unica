"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Search, FileText, Clock, User, Filter, ChevronDown, Eye, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DailyReportEntry, WorkTimeEntry, Process } from "@/app/tasks/types";
import { getDailyReportsByWorker, confirmDailyReport } from "@/lib/firebase/dailyReports";
import { getProcessesList } from "@/lib/firebase/processes";
import { ReplySection } from "@/app/daily-reports/components/ReplySection";
import { useRouter } from "next/navigation";

// ソートビューコンポーネント
const DateSortView = ({ 
  filteredReports, getStatusBadge, formatTime, canConfirm, handleConfirm,
  setSelectedReport, selectedReport, canReply, currentUser, loadData,
  getProjectNameByProcessId, router 
}: any) => {
  // 日付別グループ化
  const groupedByDate = filteredReports.reduce((groups: any, report: DailyReportEntry) => {
    const dateKey = report.date;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(report);
    return groups;
  }, {});

  // 日付順にソート（新しい順）
  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  return (
    <div className="space-y-4">
      {sortedDates.map(date => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-800 border-l-4 border-blue-500">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              {new Date(date).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
              })}
            </h3>
            <span className="text-sm text-gray-500 dark:text-slate-400">({groupedByDate[date].length}件)</span>
          </div>
          
          <div className="space-y-1">
            {groupedByDate[date].map((report: DailyReportEntry) => (
              <ReportItem
                key={report.id}
                report={report}
                showDate={false}
                getStatusBadge={getStatusBadge}
                formatTime={formatTime}
                canConfirm={canConfirm}
                handleConfirm={handleConfirm}
                setSelectedReport={setSelectedReport}
                selectedReport={selectedReport}
                canReply={canReply}
                currentUser={currentUser}
                loadData={loadData}
                getProjectNameByProcessId={getProjectNameByProcessId}
                router={router}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const UserSortView = ({ 
  filteredReports, getStatusBadge, formatTime, canConfirm, handleConfirm,
  setSelectedReport, selectedReport, canReply, currentUser, loadData,
  getProjectNameByProcessId, router 
}: any) => {
  // ユーザー別グループ化
  const groupedByUser = filteredReports.reduce((groups: any, report: DailyReportEntry) => {
    const userKey = report.workerName;
    if (!groups[userKey]) groups[userKey] = [];
    groups[userKey].push(report);
    return groups;
  }, {});

  // ユーザー名順にソート
  const sortedUsers = Object.keys(groupedByUser).sort();

  return (
    <div className="space-y-4">
      {sortedUsers.map(userName => (
        <div key={userName} className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-800 border-l-4 border-green-500">
            <User className="w-4 h-4 text-green-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">{userName}</h3>
            <span className="text-sm text-gray-500 dark:text-slate-400">({groupedByUser[userName].length}件)</span>
          </div>
          
          <div className="space-y-1">
            {groupedByUser[userName]
              .sort((a: DailyReportEntry, b: DailyReportEntry) => b.date.localeCompare(a.date))
              .map((report: DailyReportEntry) => (
              <ReportItem
                key={report.id}
                report={report}
                showDate={true}
                getStatusBadge={getStatusBadge}
                formatTime={formatTime}
                canConfirm={canConfirm}
                handleConfirm={handleConfirm}
                setSelectedReport={setSelectedReport}
                selectedReport={selectedReport}
                canReply={canReply}
                currentUser={currentUser}
                loadData={loadData}
                getProjectNameByProcessId={getProjectNameByProcessId}
                router={router}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ReportItem = ({ 
  report, showDate, getStatusBadge, formatTime, canConfirm, handleConfirm,
  setSelectedReport, selectedReport, canReply, currentUser, loadData,
  getProjectNameByProcessId, router 
}: any) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleRowClick = () => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleConfirm(report.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/daily-reports?edit=${report.id}`);
  };

  return (
    <div key={report.id}>
      <div 
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        onClick={handleRowClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showDate && (
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{new Date(report.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</span>
              </div>
            )}
            
            {!showDate && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{report.workerName}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{formatTime(report.totalWorkMinutes)}</span>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(report)}
              {report.adminReply && (
                <Badge variant="outline" className="text-xs">
                  💬 {report.adminReply.isRead ? '返信済' : '未読返信'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canConfirm && report.isSubmitted && !report.approved && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleConfirmClick}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                ✓ 確認
              </Button>
            )}

            {!report.isSubmitted && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
              >
                <Edit className="w-4 h-4 mr-1" />
                編集
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
          <DialogHeader className="border-b border-gray-200 dark:border-slate-700 pb-3">
            <DialogTitle className="text-xl font-bold">
              日報詳細 - {new Date(report.date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              作業者: {report.workerName} | 合計: {formatTime(report.totalWorkMinutes)} | {getStatusBadge(report)}
            </p>
          </DialogHeader>
          {selectedReport && (
            <div className="py-4">
              {/* 上部：基本情報（コンパクト） */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded">
                <div>
                  <span className="font-medium text-gray-700 dark:text-slate-300 text-sm">夢や希望:</span>
                  <p className="text-gray-900 dark:text-white">{selectedReport.dreams}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-slate-300 text-sm">今日の目標:</span>
                  <p className="text-gray-900 dark:text-white">{selectedReport.todaysGoals}</p>
                </div>
              </div>

              {/* 作業時間詳細（全幅テーブル形式） */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2 mb-4">作業時間詳細</h3>
                
                {/* 工程作業 */}
                {Object.entries(
                  selectedReport.workTimeEntries
                    .filter((e: any) => e.isSyncedToProcess && e.processId)
                    .reduce((groups: Record<string, any[]>, entry: any) => {
                      const key = entry.processId;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(entry);
                      return groups;
                    }, {})
                ).map(([processId, processEntries]) => (
                  <div key={processId} className="mb-6">
                    {/* 工程ヘッダー */}
                    <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🔧</span>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {processEntries[0].managementNumber || processEntries[0].productionNumber} - {processEntries[0].processName || '工程作業'}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                            ({processEntries.length}件の作業)
                          </span>
                        </div>
                      </div>
                      {/* 進捗表示 */}
                      {processEntries.some((e: any) => e.progress !== undefined && e.progress > 0) && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">進捗:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ width: `${Math.round(processEntries.reduce((sum: number, entry: any) => sum + (entry.progress || 0), 0) / processEntries.length)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 min-w-10">
                            {Math.round(processEntries.reduce((sum: number, entry: any) => sum + (entry.progress || 0), 0) / processEntries.length)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* 作業テーブル */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-slate-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">#</th>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">作業内容</th>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">機械</th>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">操作</th>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">時間</th>
                            <th className="px-4 py-2 text-right text-gray-900 dark:text-white font-medium">所要時間</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {processEntries.map((entry: any, index: number) => (
                            <tr key={entry.id} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                {String(index + 1).padStart(2, '0')}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                {entry.workContentName}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {entry.machineName && entry.machineName !== 'なし' ? entry.machineName : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {entry.operationType && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    entry.operationType === '自動' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>
                                    {entry.operationType}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {entry.startTime} - {entry.endTime}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                {formatTime(entry.durationMinutes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                
                {/* 一般作業 */}
                {selectedReport.workTimeEntries.filter((e: any) => !e.isSyncedToProcess).length > 0 && (
                  <div className="mb-6">
                    {/* 一般作業ヘッダー */}
                    <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-lg">⏰</span>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">一般作業</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                          ({selectedReport.workTimeEntries.filter((e: any) => !e.isSyncedToProcess).length}件の作業)
                        </span>
                      </div>
                    </div>
                    
                    {/* 一般作業テーブル */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-slate-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">#</th>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">作業内容</th>
                            <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-medium">時間</th>
                            <th className="px-4 py-2 text-right text-gray-900 dark:text-white font-medium">所要時間</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {selectedReport.workTimeEntries
                            .filter((e: any) => !e.isSyncedToProcess)
                            .map((entry: any, index: number) => (
                              <tr key={entry.id} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                  {String(index + 1).padStart(2, '0')}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                  {entry.workContentName}
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                  {entry.startTime} - {entry.endTime}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                  {formatTime(entry.durationMinutes)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* 振り返りセクション */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2 mb-4">今日の振り返り</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="font-medium text-gray-700 dark:text-slate-300 mb-2 text-sm">今日の結果</div>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedReport.todaysResults}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="font-medium text-gray-700 dark:text-slate-300 mb-2 text-sm">うまくいったこと</div>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedReport.whatWentWell}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="font-medium text-gray-700 dark:text-slate-300 mb-2 text-sm">うまくいかなかったこと</div>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedReport.whatDidntGoWell}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="font-medium text-gray-700 dark:text-slate-300 mb-2 text-sm">社内への要望</div>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedReport.requestsToManagement}</p>
                  </div>
                </div>
              </div>

              {/* 返信セクション */}
              {selectedReport && (
                <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                  <ReplySection 
                    report={selectedReport}
                    isAdmin={canReply}
                    currentUser={currentUser}
                    onReplyAdded={() => {
                      loadData();
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

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
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<'date' | 'user'>('date');
  const [selectedReport, setSelectedReport] = useState<DailyReportEntry | null>(null);
  
  // ユーザー権限管理 - 設定 > セキュリティ・権限設定 で確認・管理可能
  // 実際の実装では認証システムから現在ユーザーの権限を取得
  const [currentUser] = useState("会長"); 
  const [userPermissions] = useState({
    canConfirmReports: true,
    canReplyToReports: true,
    canViewAllReports: true,
    canManageUsers: true,
  });
  
  const canConfirm = userPermissions.canConfirmReports;
  const canReply = userPermissions.canReplyToReports;

  // 確認済み操作
  const handleConfirm = async (reportId: string) => {
    try {
      console.log(`確認済みにする: ${reportId} by ${currentUser}`);
      const result = await confirmDailyReport(reportId, currentUser);
      
      if (result.success) {
        console.log('✅ 日報が確認済みになりました');
        loadData(); // データを再読み込み
      } else {
        console.error('❌ 確認エラー:', result.error);
        alert('確認処理に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('❌ 確認エラー:', error);
      alert('確認処理に失敗しました');
    }
  };
  
  // 工程IDから工事名を取得するヘルパー関数
  const getProjectNameByProcessId = (processId?: string): string => {
    if (!processId) return "不明";
    const process = processes.find(p => p.id === processId);
    return process?.projectName || "不明";
  };

  // データ読み込み関数
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 日報データと工程データを並行して取得
      const [reportsResult, processesResult] = await Promise.all([
        getDailyReportsByWorker("current-user", {
          limit: 50,
          orderBy: "date",
          order: "desc"
        }),
        getProcessesList()
      ]);
      
      if (reportsResult.error) {
        console.error('Error loading reports:', reportsResult.error);
        setReports(mockDailyReports);
      } else {
        setReports(reportsResult.data);
      }
      
      if (processesResult.error) {
        console.error('Error loading processes:', processesResult.error);
        setProcesses([]);
      } else {
        setProcesses(processesResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setReports(mockDailyReports);
      setProcesses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 日報データと工程データを読み込み
  useEffect(() => {
    loadData();
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
            return report.isSubmitted && !report.approved;
          case "draft":
            return !report.isSubmitted;
          case "approved":
            return report.approved;
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
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">確認済み</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">提出済み</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-2 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">日報一覧</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400">
              作成済みの日報を確認・管理します
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => router.push("/daily-reports")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </div>
        </div>

        {/* フィルタ・検索セクション */}
        <Card className="shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="p-4 space-y-4">
            {/* ソートタブ */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-600 pb-3">
              <button
                onClick={() => setSortMode('date')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  sortMode === 'date'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                日付順
              </button>
              <button
                onClick={() => setSortMode('user')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  sortMode === 'user'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                人名順
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <Input
                  placeholder="作業者名、製番、内容で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 text-gray-900 dark:text-white"
                />
              </div>

              {/* ステータスフィルタ */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 text-gray-900 dark:text-white">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="submitted">提出済み</SelectItem>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="approved">確認済み</SelectItem>
                </SelectContent>
              </Select>

              {/* 日付フィルタ */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 text-gray-900 dark:text-white">
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
              <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600 dark:text-slate-400">
                {filteredReports.length}件の日報
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 日報一覧 */}
        {sortMode === 'date' ? (
          <DateSortView
            filteredReports={filteredReports}
            getStatusBadge={getStatusBadge}
            formatTime={formatTime}
            canConfirm={canConfirm}
            handleConfirm={handleConfirm}
            setSelectedReport={setSelectedReport}
            selectedReport={selectedReport}
            canReply={canReply}
            currentUser={currentUser}
            loadData={loadData}
            getProjectNameByProcessId={getProjectNameByProcessId}
            router={router}
          />
        ) : (
          <UserSortView
            filteredReports={filteredReports}
            getStatusBadge={getStatusBadge}
            formatTime={formatTime}
            canConfirm={canConfirm}
            handleConfirm={handleConfirm}
            setSelectedReport={setSelectedReport}
            selectedReport={selectedReport}
            canReply={canReply}
            currentUser={currentUser}
            loadData={loadData}
            getProjectNameByProcessId={getProjectNameByProcessId}
            router={router}
          />
        )}

        {/* 空の状態 */}
        {filteredReports.length === 0 && (
          <Card className="shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">日報が見つかりません</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-4">検索条件を変更するか、新しい日報を作成してください。</p>
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