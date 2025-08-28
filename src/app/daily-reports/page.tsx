"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Clock, FileText, Calendar, User, Target, Heart, AlertTriangle, CheckCircle, RefreshCw, Building2, MessageSquare, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DailyReportEntry, WorkTimeEntry, WorkContentType } from "@/app/tasks/types";
import IntegratedWorkTimeTable from "./components/IntegratedWorkTimeTable";
import DailyReviewSection from "./components/DailyReviewSection";
import { 
  createDailyReport, 
  updateDailyReport, 
  getDailyReportsByWorker,
  getDailyReportDraft,
  saveDailyReportDraft,
  migrateDraftFromLocalStorage 
} from "@/lib/firebase/dailyReports";
import { syncWorkHoursFromDailyReport } from "@/lib/firebase/workHours";
import { getWorkContentTypes, subscribeToWorkContentTypes } from "@/lib/firebase/workContentSettings";
import { useAutoSave } from "@/lib/utils/autoSave";
import { validateDailyReportData } from "@/lib/utils/validation";
import { showError, showSuccess } from "@/lib/utils/errorHandling";

// デフォルトの作業内容（Firebase接続失敗時のフォールバック）
const defaultWorkContentTypes: WorkContentType[] = [
  {
    id: "1",
    name: "data",
    nameJapanese: "データ",
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "chamfering",
    nameJapanese: "面取り",
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "finishing",
    nameJapanese: "仕上げ",
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "machining",
    nameJapanese: "機械加工",
    isActive: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "others",
    nameJapanese: "その他",
    isActive: true,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function DailyReportPage() {
  const [reportData, setReportData] = useState<Partial<DailyReportEntry>>({
    date: new Date().toISOString().split('T')[0],
    workerId: "current-user", // 実際は認証情報から取得
    workerName: "現場作業者", // 実際は認証情報から取得
    dreams: "",
    todaysGoals: "",
    workTimeEntries: [],
    processWorkTimeEntries: [], // 工程別作業実績
    todaysResults: "",
    whatWentWell: "",
    whatDidntGoWell: "",
    requestsToManagement: "",
    totalWorkMinutes: 0,
    isSubmitted: false,
  });

  // Firebase state
  const [workContentTypes, setWorkContentTypes] = useState<WorkContentType[]>(defaultWorkContentTypes);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  // 自動保存機能
  const { manualSave, getBackups, restoreBackup, clearAll } = useAutoSave(
    `daily-report-${reportData.date}`,
    reportData,
    {
      interval: 3000, // 3秒ごとに自動保存
      maxBackups: 3,
      onSave: () => console.log('日報を自動保存しました'),
      onRestore: (data) => {
        setReportData(data);
        showSuccess('前回の内容を復元しました');
      }
    }
  );

  // Firebase初期化とデータ読み込み
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 作業内容タイプを読み込み
      const { data: contentTypes, error: contentError } = await getWorkContentTypes();
      if (contentError) {
        console.error('Failed to load work content types:', contentError);
        setError('作業内容の読み込みに失敗しました');
      } else {
        setWorkContentTypes(contentTypes);
      }

      // 日報の下書きを読み込み
      const today = new Date().toISOString().split('T')[0];
      const { data: draftData, error: draftError } = await getDailyReportDraft(
        "current-user", // 実際は認証情報から取得
        today
      );
      
      if (draftData && !draftError) {
        setReportData(draftData);
        setReportId(draftData.id);
        setHasDraft(true);
      } else {
        // ローカルストレージからの移行をチェック
        await checkForLocalStorageMigration();
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ローカルストレージからの移行をチェック
  const checkForLocalStorageMigration = async () => {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const localStorageKey = `daily-report-draft-${today}`;
    const localData = localStorage.getItem(localStorageKey);
    
    if (localData) {
      try {
        const parsedData = JSON.parse(localData);
        setReportData(parsedData);
        setHasDraft(true);
        
        // 自動的にFirebaseに保存
        const { id, error } = await saveDailyReportDraft(
          parsedData.workerId || "current-user",
          today,
          parsedData
        );
        
        if (!error && id) {
          setReportId(id);
          // ローカルストレージからデータを削除
          localStorage.removeItem(localStorageKey);
          console.log('Successfully migrated draft from localStorage to Firebase');
        }
      } catch (error) {
        console.error('Error migrating from localStorage:', error);
      }
    }
  };

  // 作業内容タイプの変更をリアルタイムで監視
  useEffect(() => {
    const unsubscribe = subscribeToWorkContentTypes(
      (data) => {
        setWorkContentTypes(data);
      },
      true // アクティブのみ
    );

    return unsubscribe;
  }, []);

  // データが変更されたら自動で下書き保存（Firebase）
  useEffect(() => {
    if (reportData.workerName && !isSaving) {
      const saveTimer = setTimeout(async () => {
        await saveDraftToFirebase();
      }, 2000); // 2秒後に自動保存

      return () => clearTimeout(saveTimer);
    }
  }, [reportData]);

  // Firebase下書き保存
  const saveDraftToFirebase = async () => {
    if (!reportData.workerId || !reportData.date) return;
    
    try {
      const { id, error } = await saveDailyReportDraft(
        reportData.workerId,
        reportData.date,
        reportData
      );
      
      if (!error) {
        if (id && !reportId) {
          setReportId(id);
        }
        setHasDraft(true);
        setError(null);
      } else {
        console.error('Failed to save draft:', error);
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
    }
  };

  // 作業時間の合計を計算
  useEffect(() => {
    const totalMinutes = reportData.workTimeEntries?.reduce(
      (sum, entry) => sum + entry.durationMinutes,
      0
    ) || 0;
    
    setReportData(prev => ({
      ...prev,
      totalWorkMinutes: totalMinutes,
    }));
  }, [reportData.workTimeEntries]);

  const handleBasicInfoChange = (field: string, value: string) => {
    setReportData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleWorkTimeEntriesChange = (entries: WorkTimeEntry[]) => {
    setReportData(prev => ({
      ...prev,
      workTimeEntries: entries,
    }));
  };

  const handleProcessWorkTimeEntriesChange = (entries: any[]) => {
    setReportData(prev => ({
      ...prev,
      processWorkTimeEntries: entries,
    }));
  };

  const handleReviewChange = (field: string, value: string) => {
    setReportData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 下書きを削除
  const clearDraft = () => {
    setHasDraft(false);
    setReportId(null);
    
    // フォームを初期化
    setReportData({
      date: new Date().toISOString().split('T')[0],
      workerId: "current-user",
      workerName: "現場作業者",
      dreams: "",
      todaysGoals: "",
      workTimeEntries: [],
      processWorkTimeEntries: [],
      todaysResults: "",
      whatWentWell: "",
      whatDidntGoWell: "",
      requestsToManagement: "",
      totalWorkMinutes: 0,
      isSubmitted: false,
    });
    
    setError(null);
  };

  // 工程進捗更新コールバック
  const handleProcessProgressUpdate = async (processId: string, newProgress: number) => {
    try {
      // 工程管理システムに進捗更新を通知
      console.log(`工程 ${processId} の進捗を ${newProgress}% に更新しました`);
      
      // 必要に応じて工数管理システムにも反映
      // この部分は将来的に工数管理との連携で使用
      
      // 成功通知
      // toast やスナックバーで通知できる
    } catch (error) {
      console.error('工程進捗の更新中にエラーが発生しました:', error);
    }
  };

  // ローカルストレージからFirebaseへの一括移行
  const migrateFromLocalStorage = async () => {
    setIsMigrating(true);
    try {
      // 簡易的なローカルストレージ移行機能
      const keys = Object.keys(localStorage).filter(key => key.startsWith('daily-report-draft-'));
      let migratedCount = 0;
      
      for (const key of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const date = key.replace('daily-report-draft-', '');
          
          await saveDailyReportDraft(
            data.workerId || "current-user",
            date,
            data
          );
          
          localStorage.removeItem(key);
          migratedCount++;
        } catch (itemError) {
          console.error(`Failed to migrate item ${key}:`, itemError);
        }
      }
      
      alert(`移行が完了しました！\n${migratedCount}件のデータを移行しました。`);
      await loadInitialData(); // データを再読み込み
    } catch (error: any) {
      alert(`移行に失敗しました: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSave = async (submit: boolean = false) => {
    setIsSaving(true);
    setError(null);
    
    // バリデーション
    const validation = validateDailyReportData(reportData);
    if (!validation.isValid) {
      showError(null, validation.errors.join('\n'));
      setIsSaving(false);
      return;
    }
    
    try {
      // 必須項目チェック（最低限）
      if (!reportData.workerName) {
        showError(null, "氏名を入力してください");
        setIsSaving(false);
        return;
      }

      const updatedReport: Partial<DailyReportEntry> = {
        ...reportData,
        isSubmitted: submit,
        approved: false, // 提出時は未承認
      };

      let saveResult;
      
      if (submit) {
        // 提出の場合は新しいレコードを作成
        saveResult = await createDailyReport(updatedReport as Omit<DailyReportEntry, 'id' | 'createdAt' | 'updatedAt'>);
        
        if (!saveResult.error && saveResult.id) {
          // 工数管理システムとの同期を試行
          try {
            const syncResult = await syncWorkHoursFromDailyReport({
              ...updatedReport,
              id: saveResult.id
            } as DailyReportEntry);
            
            if (syncResult.success) {
              console.log('Successfully synced with work hours:', syncResult);
            } else {
              console.warn('Work hours sync had issues:', syncResult.warnings, syncResult.errors);
            }
          } catch (syncError) {
            console.error('Work hours sync failed:', syncError);
            // 同期失敗は警告のみ（日報提出は成功とする）
          }

          // 工程別作業実績の同期
          if (updatedReport.processWorkTimeEntries && updatedReport.processWorkTimeEntries.length > 0) {
            try {
              const { syncProcessWorkTimeFromDailyReport } = await import('@/lib/firebase/processIntegration');
              const processSync = await syncProcessWorkTimeFromDailyReport(updatedReport.processWorkTimeEntries);
              
              if (processSync.success) {
                console.log('Successfully synced process work time:', processSync);
              } else {
                console.warn('Process work time sync had issues:', processSync.error);
              }
            } catch (processSyncError) {
              console.error('Process work time sync failed:', processSyncError);
            }
          }
          
          setReportId(saveResult.id);
          setHasDraft(false);
        }
      } else {
        // 下書き保存の場合
        saveResult = await saveDailyReportDraft(
          reportData.workerId,
          reportData.date,
          updatedReport
        );
        
        if (!saveResult.error && saveResult.id) {
          setReportId(saveResult.id);
          setHasDraft(true);
        }
      }
      
      if (saveResult.error) {
        setError(saveResult.error);
        showError(saveResult.error, '保存に失敗しました');
      } else {
        // 成功メッセージ
        showSuccess(submit ? "日報を提出しました！" : "下書きを保存しました");
        
        // 自動保存のローカルストレージをクリア
        if (submit) {
          clearAll();
          setReportData(prev => ({
            ...prev,
            isSubmitted: true,
            id: saveResult.id || prev.id,
          }));
        }
      }
    } catch (error: any) {
      console.error("Failed to save daily report:", error);
      setError(error.message);
      showError(error, '保存に失敗しました');
      
      // ネットワークエラーの場合は手動保存を促す
      manualSave();
      showSuccess('ネットワークエラーのため、ローカルに保存しました');
    } finally {
      setIsSaving(false);
    }
  };

  const totalHours = Math.floor((reportData.totalWorkMinutes || 0) / 60);
  const totalMinutes = (reportData.totalWorkMinutes || 0) % 60;

  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-lg text-gray-600 dark:text-slate-400">データを読み込んでいます...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">エラー</span>
            </div>
            <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                閉じる
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInitialData}
                disabled={isLoading}
                className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                再試行
              </Button>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日報作成</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-600 dark:text-slate-400">
                {new Date(reportData.date || "").toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {hasDraft && (
                <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded border border-orange-200 dark:border-orange-800">
                  下書きあり
                </span>
              )}
              {isSaving && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  保存中...
                </span>
              )}
            </div>
          </div>
          
          {reportData.totalWorkMinutes! > 0 && (
            <div className="flex items-center gap-2 text-lg font-semibold text-blue-700 dark:text-blue-400 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
              <Clock className="w-5 h-5" />
              <span>合計: {totalHours}時間{totalMinutes}分</span>
            </div>
          )}
        </div>

        {/* メイン日報 */}
        <Card className="shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">

          <CardContent className="p-8 space-y-8">
            {/* 基本情報セクション */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-slate-600">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">基本情報</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    日付
                  </Label>
                  <Input
                    type="date"
                    value={reportData.date}
                    onChange={(e) => handleBasicInfoChange("date", e.target.value)}
                    disabled={reportData.isSubmitted}
                    className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                    <User className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    作業者名
                  </Label>
                  <Input
                    value={reportData.workerName}
                    onChange={(e) => handleBasicInfoChange("workerName", e.target.value)}
                    placeholder="作業者名を入力"
                    disabled={reportData.isSubmitted}
                    className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                    <Heart className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                    夢や希望
                  </Label>
                  <Textarea
                    value={reportData.dreams}
                    onChange={(e) => handleBasicInfoChange("dreams", e.target.value)}
                    placeholder="今日の夢や希望について記入してください..."
                    disabled={reportData.isSubmitted}
                    className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 min-h-[100px] resize-none text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                    <Target className="w-4 h-4 text-green-500 dark:text-green-400" />
                    今日の目標
                  </Label>
                  <Textarea
                    value={reportData.todaysGoals}
                    onChange={(e) => handleBasicInfoChange("todaysGoals", e.target.value)}
                    placeholder="今日の目標を記入してください..."
                    disabled={reportData.isSubmitted}
                    className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 min-h-[100px] resize-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 作業実績セクション */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-slate-600">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">作業実績</h2>
              </div>
              
              <div className="bg-gray-50/50 dark:bg-slate-700/50 rounded-lg p-1">
                <IntegratedWorkTimeTable
                  entries={reportData.workTimeEntries || []}
                  workContentTypes={workContentTypes}
                  onEntriesChange={handleWorkTimeEntriesChange}
                  onProcessProgressUpdate={handleProcessProgressUpdate}
                  disabled={reportData.isSubmitted}
                />
              </div>
            </div>

            {/* 振り返りセクション */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-slate-600">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">今日の振り返り</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      今日の結果
                    </Label>
                    <Textarea
                      value={reportData.todaysResults || ""}
                      onChange={(e) => handleReviewChange("todaysResults", e.target.value)}
                      placeholder="今日達成できたことを記入してください..."
                      disabled={reportData.isSubmitted}
                      className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 min-h-[100px] resize-none text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      うまくいったこと・感謝
                    </Label>
                    <Textarea
                      value={reportData.whatWentWell || ""}
                      onChange={(e) => handleReviewChange("whatWentWell", e.target.value)}
                      placeholder="良かった点や感謝したいことを記入してください..."
                      disabled={reportData.isSubmitted}
                      className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 min-h-[100px] resize-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      うまくいかなかったこと・反省
                    </Label>
                    <Textarea
                      value={reportData.whatDidntGoWell || ""}
                      onChange={(e) => handleReviewChange("whatDidntGoWell", e.target.value)}
                      placeholder="改善すべき点や反省点を記入してください..."
                      disabled={reportData.isSubmitted}
                      className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 min-h-[100px] resize-none text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <MessageSquare className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      社内への要望
                    </Label>
                    <Textarea
                      value={reportData.requestsToManagement || ""}
                      onChange={(e) => handleReviewChange("requestsToManagement", e.target.value)}
                      placeholder="会社や管理者への要望があれば記入してください..."
                      disabled={reportData.isSubmitted}
                      className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-600 min-h-[100px] resize-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          {/* フッター */}
          <div className="border-t border-gray-200 dark:border-slate-600 p-6 bg-gray-50 dark:bg-slate-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* 左側の情報 */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                {reportId && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                    Firebase連携済み (ID: {reportId.slice(-8)})
                  </span>
                )}
                {(typeof window !== 'undefined' && 
                  Object.keys(localStorage).some(key => key.startsWith('daily-report-draft-'))) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={migrateFromLocalStorage}
                    disabled={isMigrating || isSaving}
                    className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  >
                    {isMigrating ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    データ移行
                  </Button>
                )}
              </div>
              
              {/* 右側のボタン */}
              <div className="flex items-center gap-3">
                {hasDraft && (
                  <Button
                    variant="outline"
                    onClick={clearDraft}
                    disabled={isSaving}
                    className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                  >
                    下書きクリア
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={isSaving || isLoading}
                  className="border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  下書き保存
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={isSaving || isLoading || reportData.isSubmitted}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  {reportData.isSubmitted ? '提出済み' : '提出する'}
                </Button>
              </div>
            </div>
            
            {/* 提出状態表示 */}
            {reportData.isSubmitted && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  <span>この日報は提出済みです</span>
                  {reportData.submittedAt && (
                    <span className="text-sm text-green-600 dark:text-green-300">
                      ({new Date(reportData.submittedAt).toLocaleString("ja-JP")})
                    </span>
                  )}
                </div>
                {reportData.approved && (
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-300 text-sm mt-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>承認済み</span>
                    {reportData.approvedAt && (
                      <span className="text-green-600 dark:text-green-300">({new Date(reportData.approvedAt).toLocaleString("ja-JP")})</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}