import { useState, useEffect, useCallback } from 'react';
import { subscribeToDailyReportsList, getDailyReportsList } from '@/lib/firebase/dailyReports';
import { updateWorkHours, getWorkHoursList } from '@/lib/firebase/workHours';
import type { DailyReport, WorkHours, EnhancedWorkHours } from '@/app/tasks/types';

interface SyncStats {
  syncedCount: number;
  lastSyncTime: string | null;
  pendingReports: number;
  totalReports: number;
  errorReports: number;
  updatedWorkHours: string[];
}

export const useDailyReportSync = () => {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    syncedCount: 0,
    lastSyncTime: null,
    pendingReports: 0,
    totalReports: 0,
    errorReports: 0,
    updatedWorkHours: [],
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
      const updates: Array<{ workHoursId: string; actualHours: any; integrations: any }> = [];
      const updatedWorkHoursIds: string[] = [];
      let errorReports = 0;
      
      for (const [processKey, processReports] of Object.entries(reportsByProcess)) {
        try {
          // 該当する工数データを取得
          const { data: workHoursList } = await getWorkHoursList({ 
            limit: 50 
          });
          
          // より精度の高いマッチングロジック
          const workHours = workHoursList.find(wh => {
            const managementMatch = wh.managementNumber && processKey.includes(wh.managementNumber);
            const projectMatch = wh.projectName && processKey.toLowerCase().includes(wh.projectName.toLowerCase());
            const exactMatch = wh.id === processKey;
            
            return exactMatch || managementMatch || projectMatch;
          });
          
          if (!workHours) {
            console.log(`工数データが見つかりません: ${processKey}`);
            continue;
          }
          
          // 実績工数を集計
          const actualHours = processReports.reduce((acc, report) => {
            if (report.workTimeEntries && Array.isArray(report.workTimeEntries)) {
              report.workTimeEntries.forEach(entry => {
                const hours = parseFloat(entry.workHours?.toString() || '0');
                const workContent = entry.workContent?.toLowerCase() || '';
                
                // 作業者別工数を記録
                if (report.workerId) {
                  if (!acc.workerHours) {
                    acc.workerHours = [];
                  }
                  const existingWorkerHours = acc.workerHours.find(wh => wh.workerId === report.workerId);
                  if (existingWorkerHours) {
                    existingWorkerHours.hours += hours;
                  } else {
                    acc.workerHours.push({
                      workerId: report.workerId,
                      hours: hours
                    });
                  }
                }
                
                // 工程別工数を分類
                if (workContent.includes('段取り') || workContent.includes('セットアップ')) {
                  acc.setup += hours;
                } else if (workContent.includes('機械加工') || workContent.includes('加工')) {
                  acc.machining += hours;
                } else if (workContent.includes('仕上げ') || workContent.includes('検査')) {
                  acc.finishing += hours;
                } else {
                  acc.finishing += hours;
                }
              });
            }
            return acc;
          }, {
            setup: 0,
            machining: 0,
            finishing: 0,
            total: 0,
            workerHours: [] as Array<{ workerId: string; hours: number }>
          });
          
          actualHours.total = actualHours.setup + actualHours.machining + actualHours.finishing;
  
          // 日報IDを結約
          const reportIds = processReports.map(r => r.id).filter(Boolean) as string[];
          
          updates.push({
            workHoursId: workHours.id!,
            actualHours,
            integrations: {
              dailyReportIds: reportIds,
              lastSyncTime: new Date().toISOString(),
              syncedReportCount: reportIds.length
            }
          });
          
          updatedWorkHoursIds.push(workHours.id!);
        } catch (error) {
          console.error(`プロセス ${processKey} の同期エラー:`, error);
          errorReports++;
        }
      }

      // 工数データを更新
      let syncedCount = 0;
      for (const update of updates) {
        try {
          const { error } = await updateWorkHours(
            update.workHoursId,
            { 
              actualHours: update.actualHours,
              integrations: update.integrations
            },
            {
              triggeredBy: 'system',
              source: 'daily-report-sync',
              reason: '日報データからの自動同期',
            }
          );
          
          if (!error) {
            syncedCount++;
          } else {
            console.error(`工数更新エラー (${update.workHoursId}):`, error);
            errorReports++;
          }
        } catch (error) {
          console.error(`工数更新例外 (${update.workHoursId}):`, error);
          errorReports++;
        }
      }

      setSyncStats({
        syncedCount,
        lastSyncTime: new Date().toISOString(),
        pendingReports: Math.max(0, reports.length - syncedCount),
        totalReports: reports.length,
        errorReports,
        updatedWorkHours: updatedWorkHoursIds,
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
      syncedCount: 0,
      lastSyncTime: null,
      pendingReports: 0,
      totalReports: 0,
      errorReports: 0,
      updatedWorkHours: [],
    });
    setSyncError(null);
  }, []);
  
  // 特定の工数IDに関連する日報データの強制同期
  const syncWorkHoursById = useCallback(async (workHoursId: string) => {
    setIsSyncing(true);
    try {
      const { data: reports } = await getDailyReportsList({ limit: 100 });
      
      // 該当する工数データを取得
      const { data: workHoursList } = await getWorkHoursList({ limit: 10 });
      const workHours = workHoursList.find(wh => wh.id === workHoursId);
      
      if (!workHours) {
        throw new Error('該当する工数データが見つかりません');
      }
      
      // 関連する日報を検索
      const relatedReports = reports.filter(report => 
        report.workTimeEntries?.some(entry => 
          entry.productionNumber?.includes(workHours.managementNumber || '') ||
          entry.workContent?.toLowerCase().includes(workHours.projectName?.toLowerCase() || '')
        )
      );
      
      if (relatedReports.length === 0) {
        throw new Error('関連する日報データが見つかりません');
      }
      
      // 実績工数を集計
      const actualHours = relatedReports.reduce((acc, report) => {
        report.workTimeEntries?.forEach(entry => {
          const hours = parseFloat(entry.workHours?.toString() || '0');
          const workContent = entry.workContent?.toLowerCase() || '';
          
          if (workContent.includes('段取り') || workContent.includes('セットアップ')) {
            acc.setup += hours;
          } else if (workContent.includes('機械加工') || workContent.includes('加工')) {
            acc.machining += hours;
          } else if (workContent.includes('仕上げ') || workContent.includes('検査')) {
            acc.finishing += hours;
          } else {
            acc.finishing += hours;
          }
        });
        return acc;
      }, {
        setup: 0,
        machining: 0,
        finishing: 0,
        total: 0,
      });
      
      actualHours.total = actualHours.setup + actualHours.machining + actualHours.finishing;
      
      // 工数データを更新
      const { error } = await updateWorkHours(
        workHoursId,
        { 
          actualHours,
          integrations: {
            dailyReportIds: relatedReports.map(r => r.id).filter(Boolean),
            lastSyncTime: new Date().toISOString(),
            syncedReportCount: relatedReports.length
          }
        },
        {
          triggeredBy: 'user',
          source: 'manual-sync',
          reason: '手動での個別同期',
        }
      );
      
      if (error) {
        throw new Error(error);
      }
      
      // 統計を更新
      setSyncStats(prev => ({
        ...prev,
        syncedCount: prev.syncedCount + 1,
        lastSyncTime: new Date().toISOString(),
        updatedWorkHours: [...prev.updatedWorkHours, workHoursId],
      }));
      
    } catch (error) {
      console.error('個別同期エラー:', error);
      setSyncError(error instanceof Error ? error.message : '個別同期中にエラーが発生しました');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    syncStats,
    isSyncing,
    syncError,
    triggerManualSync,
    resetSyncStats,
    syncWorkHoursById,
  };
};