import { useState, useEffect, useCallback } from 'react';
import { subscribeToDailyReportsList, getDailyReportsList } from '@/lib/firebase/dailyReports';
import { updateWorkHours, getWorkHoursList } from '@/lib/firebase/workHours';
import type { DailyReport, WorkHours, EnhancedWorkHours } from '@/app/tasks/types';

interface SyncStats {
  totalSynced: number;
  lastSyncTime: Date | null;
  pendingReports: number;
}

export const useDailyReportSync = () => {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalSynced: 0,
    lastSyncTime: null,
    pendingReports: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 日報データの監視と自動同期
  useEffect(() => {
    const unsubscribe = subscribeToDailyReportsList(
      { limit: 100 },
      async (reports) => {
        await processDailyReportsForSync(reports);
      }
    );

    return unsubscribe;
  }, []);

  // 日報データから工数データを更新
  const processDailyReportsForSync = async (reports: DailyReport[]) => {
    try {
      setSyncError(null);
      
      // プロジェクト番号やオーダーIDでグループ化
      const reportsByProcess = reports.reduce((acc, report) => {
        // プロセスIDまたはプロジェクト情報で識別
        const processKey = report.workTimeEntries?.[0]?.productionNumber || 
                          report.workerId || 
                          'unknown';
        
        if (!acc[processKey]) {
          acc[processKey] = [];
        }
        acc[processKey].push(report);
        return acc;
      }, {} as Record<string, DailyReport[]>);

      // 各プロセスの工数を集計
      const updates: Array<{ workHoursId: string; actualHours: any }> = [];
      
      for (const [processKey, processReports] of Object.entries(reportsByProcess)) {
        // 該当する工数データを取得
        const { data: workHoursList } = await getWorkHoursList({ 
          limit: 10 
        });
        
        // プロセスキーに基づいて関連する工数を検索
        const workHours = workHoursList.find(wh => 
          wh.managementNumber.includes(processKey) ||
          wh.projectName.includes(processKey) ||
          wh.id === processKey
        );
        
        if (!workHours) continue;
        
        // 実績工数を集計
        const actualHours = processReports.reduce((acc, report) => {
          if (report.workTimeEntries && Array.isArray(report.workTimeEntries)) {
            report.workTimeEntries.forEach(entry => {
              const hours = parseFloat(entry.workHours?.toString() || '0');
              const workContent = entry.workContent?.toLowerCase() || '';
              
              if (workContent.includes('段取り') || workContent.includes('セットアップ')) {
                acc.setup += hours;
              } else if (workContent.includes('機械加工') || workContent.includes('加工')) {
                acc.machining += hours;
              } else if (workContent.includes('仕上げ') || workContent.includes('検査')) {
                acc.finishing += hours;
              } else {
                acc.finishing += hours; // その他は仕上げに分類
              }
            });
          }
          return acc;
        }, {
          setup: 0,
          machining: 0,
          finishing: 0,
          total: 0,
        });
        
        actualHours.total = actualHours.setup + actualHours.machining + actualHours.finishing;

        updates.push({
          workHoursId: workHours.id,
          actualHours,
        });
      }

      // 工数データを更新
      let syncedCount = 0;
      for (const update of updates) {
        const { error } = await updateWorkHours(
          update.workHoursId,
          { actualHours: update.actualHours },
          {
            triggeredBy: 'system',
            source: 'daily-report-sync',
            reason: '日報データからの自動同期',
          }
        );
        
        if (!error) {
          syncedCount++;
        }
      }

      setSyncStats({
        totalSynced: syncedCount,
        lastSyncTime: new Date(),
        pendingReports: 0,
      });
    } catch (error) {
      console.error('日報同期エラー:', error);
      setSyncError(error instanceof Error ? error.message : '同期中にエラーが発生しました');
    }
  };

  // 手動同期トリガー
  const triggerManualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { data: reports } = await getDailyReportsList({ limit: 100 });
      await processDailyReportsForSync(reports);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 同期状態のリセット
  const resetSyncStats = useCallback(() => {
    setSyncStats({
      totalSynced: 0,
      lastSyncTime: null,
      pendingReports: 0,
    });
    setSyncError(null);
  }, []);

  return {
    syncStats,
    isSyncing,
    syncError,
    triggerManualSync,
    resetSyncStats,
  };
};