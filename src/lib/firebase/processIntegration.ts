import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

import { db } from './config';
import { 
  getWorkHoursList, 
  updateWorkHours, 
  createWorkHours,
  subscribeToWorkHoursList 
} from './workHours';
import { 
  createBudgetForecast, 
  calculateCostBreakdown,
  getCostConfiguration 
} from './costManagement';

import type {
  Process,
  Company,
  EnhancedWorkHours,
  WorkHours,
  PlannedHours,
  Budget,
  WorkHoursAnalytics,
} from '@/app/tasks/types';

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

export interface ProcessWorkHoursMapping {
  processId: string;
  workHoursId: string;
  mappingType: 'automatic' | 'manual';
  createdAt: string;
  lastSyncedAt?: string;
  syncStatus: 'active' | 'paused' | 'error';
  errorMessage?: string;
}

export interface ProcessSyncResult {
  processId: string;
  workHoursId?: string;
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  message: string;
  syncedAt: string;
}

export interface BatchSyncResult {
  totalProcesses: number;
  successfulSyncs: number;
  failedSyncs: number;
  skippedSyncs: number;
  results: ProcessSyncResult[];
  startTime: string;
  endTime: string;
  duration: number;
}

// =============================================================================
// PROCESS-WORK HOURS INTEGRATION
// =============================================================================

/**
 * プロセスから工数レコードを自動生成
 */
export const createWorkHoursFromProcess = async (
  process: Process,
  options: {
    generateBudget?: boolean;
    autoSync?: boolean;
    overrideExisting?: boolean;
  } = {}
): Promise<{ workHoursId: string | null; error: string | null }> => {
  try {
    // 既存の工数レコードをチェック
    if (!options.overrideExisting) {
      const { data: existingWorkHours } = await getWorkHoursList({ processId: process.id });
      if (existingWorkHours.length > 0) {
        return { 
          workHoursId: existingWorkHours[0].id, 
          error: 'Work hours record already exists for this process' 
        };
      }
    }

    // 計画工数を計算
    const plannedHours: PlannedHours = {
      setup: process.workDetails.setup + (process.workDetails.additionalSetup || 0),
      machining: process.workDetails.machining + (process.workDetails.additionalMachining || 0),
      finishing: process.workDetails.finishing + (process.workDetails.additionalFinishing || 0),
      total: 0
    };
    plannedHours.total = plannedHours.setup + plannedHours.machining + plannedHours.finishing;

    // 予算を生成
    let budget: Budget;
    if (options.generateBudget) {
      const costConfig = await getCostConfiguration();
      budget = {
        estimatedAmount: 0, // プロセスに見積金額がない場合
        setupRate: costConfig.defaultRates.setupRate,
        machiningRate: costConfig.defaultRates.machiningRate,
        finishingRate: costConfig.defaultRates.finishingRate,
        totalPlannedCost: 
          plannedHours.setup * costConfig.defaultRates.setupRate +
          plannedHours.machining * costConfig.defaultRates.machiningRate +
          plannedHours.finishing * costConfig.defaultRates.finishingRate,
        totalActualCost: 0
      };
    } else {
      budget = {
        estimatedAmount: 0,
        setupRate: 3000,
        machiningRate: 4000,
        finishingRate: 3500,
        totalPlannedCost: 0,
        totalActualCost: 0
      };
    }

    // 工数レコードを作成
    const workHoursData: Omit<WorkHours, 'id' | 'createdAt' | 'updatedAt'> = {
      orderId: process.orderId || '',
      processId: process.id,
      projectName: process.projectName,
      client: process.orderClient,
      managementNumber: process.managementNumber,
      plannedHours,
      actualHours: {
        setup: 0,
        machining: 0,
        finishing: 0,
        total: 0
      },
      budget,
      status: mapProcessStatusToWorkHoursStatus(process.status),
    };

    const { id, error } = await createWorkHours(workHoursData);

    if (error) {
      return { workHoursId: null, error };
    }

    // プロセスマッピングを作成
    if (options.autoSync && id) {
      await createProcessMapping(process.id, id, 'automatic');
    }

    return { workHoursId: id, error: null };
  } catch (error: any) {
    console.error('Error creating work hours from process:', error);
    return { workHoursId: null, error: error.message };
  }
};

/**
 * プロセス更新時に工数レコードを同期
 */
export const syncWorkHoursFromProcess = async (
  process: Process,
  options: {
    syncBudget?: boolean;
    syncStatus?: boolean;
    syncPlannedHours?: boolean;
  } = {}
): Promise<{ error: string | null }> => {
  try {
    // 対応する工数レコードを取得
    const { data: workHoursList } = await getWorkHoursList({ processId: process.id });
    
    if (workHoursList.length === 0) {
      return { error: 'No work hours record found for this process' };
    }

    const workHours = workHoursList[0];
    const updates: Partial<EnhancedWorkHours> = {};

    // 計画工数の同期
    if (options.syncPlannedHours) {
      const plannedHours: PlannedHours = {
        setup: process.workDetails.setup + (process.workDetails.additionalSetup || 0),
        machining: process.workDetails.machining + (process.workDetails.additionalMachining || 0),
        finishing: process.workDetails.finishing + (process.workDetails.additionalFinishing || 0),
        total: 0
      };
      plannedHours.total = plannedHours.setup + plannedHours.machining + plannedHours.finishing;
      updates.plannedHours = plannedHours;
    }

    // ステータスの同期
    if (options.syncStatus) {
      updates.status = mapProcessStatusToWorkHoursStatus(process.status);
    }

    // 予算の同期
    if (options.syncBudget && updates.plannedHours) {
      const costConfig = await getCostConfiguration();
      updates.budget = {
        ...workHours.budget,
        totalPlannedCost: 
          updates.plannedHours.setup * costConfig.defaultRates.setupRate +
          updates.plannedHours.machining * costConfig.defaultRates.machiningRate +
          updates.plannedHours.finishing * costConfig.defaultRates.finishingRate
      };
    }

    // プロジェクト情報の同期
    updates.projectName = process.projectName;
    updates.client = process.orderClient;
    updates.managementNumber = process.managementNumber;

    // 工数レコードを更新
    const { error } = await updateWorkHours(
      workHours.id,
      updates,
      {
        triggeredBy: 'system',
        source: 'system',
        reason: 'Synced from process management system'
      }
    );

    if (error) {
      return { error };
    }

    // マッピングの最終同期時刻を更新
    await updateProcessMappingSync(process.id, workHours.id);

    return { error: null };
  } catch (error: any) {
    console.error('Error syncing work hours from process:', error);
    return { error: error.message };
  }
};

/**
 * 複数プロセスの一括同期
 */
export const batchSyncProcesses = async (
  processes: Process[],
  options: {
    createMissing?: boolean;
    syncBudget?: boolean;
    syncStatus?: boolean;
    syncPlannedHours?: boolean;
  } = {}
): Promise<BatchSyncResult> => {
  const startTime = new Date().toISOString();
  const results: ProcessSyncResult[] = [];
  let successfulSyncs = 0;
  let failedSyncs = 0;
  let skippedSyncs = 0;

  for (const process of processes) {
    try {
      // 既存の工数レコードをチェック
      const { data: existingWorkHours } = await getWorkHoursList({ processId: process.id });

      if (existingWorkHours.length === 0) {
        if (options.createMissing) {
          // 新規作成
          const { workHoursId, error } = await createWorkHoursFromProcess(process, {
            generateBudget: options.syncBudget,
            autoSync: true
          });

          if (error) {
            results.push({
              processId: process.id,
              success: false,
              action: 'error',
              message: error,
              syncedAt: new Date().toISOString()
            });
            failedSyncs++;
          } else {
            results.push({
              processId: process.id,
              workHoursId,
              success: true,
              action: 'created',
              message: 'Work hours record created successfully',
              syncedAt: new Date().toISOString()
            });
            successfulSyncs++;
          }
        } else {
          results.push({
            processId: process.id,
            success: true,
            action: 'skipped',
            message: 'No existing work hours record found, creation not requested',
            syncedAt: new Date().toISOString()
          });
          skippedSyncs++;
        }
      } else {
        // 既存レコードを更新
        const { error } = await syncWorkHoursFromProcess(process, options);

        if (error) {
          results.push({
            processId: process.id,
            workHoursId: existingWorkHours[0].id,
            success: false,
            action: 'error',
            message: error,
            syncedAt: new Date().toISOString()
          });
          failedSyncs++;
        } else {
          results.push({
            processId: process.id,
            workHoursId: existingWorkHours[0].id,
            success: true,
            action: 'updated',
            message: 'Work hours record updated successfully',
            syncedAt: new Date().toISOString()
          });
          successfulSyncs++;
        }
      }
    } catch (error: any) {
      results.push({
        processId: process.id,
        success: false,
        action: 'error',
        message: error.message,
        syncedAt: new Date().toISOString()
      });
      failedSyncs++;
    }
  }

  const endTime = new Date().toISOString();
  const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

  return {
    totalProcesses: processes.length,
    successfulSyncs,
    failedSyncs,
    skippedSyncs,
    results,
    startTime,
    endTime,
    duration
  };
};

/**
 * 工数変更をプロセス管理に反映
 */
export const syncProcessFromWorkHours = async (
  workHours: EnhancedWorkHours,
  processData: Partial<Process>
): Promise<{ error: string | null }> => {
  try {
    // プロセス管理システムのAPIまたはデータベースを更新
    // 実際の実装では、プロセス管理システムの更新APIを呼び出す
    
    console.log('Syncing process from work hours:', {
      workHoursId: workHours.id,
      processId: workHours.processId,
      updates: processData
    });

    // プロセスの進捗を実績工数に基づいて更新
    if (workHours.plannedHours.total > 0) {
      const progressPercentage = Math.min(
        (workHours.actualHours.total / workHours.plannedHours.total) * 100,
        100
      );
      
      // プロセス管理システムに進捗を反映
      // await updateProcessProgress(workHours.processId, progressPercentage);
    }

    // ステータスの同期
    const processStatus = mapWorkHoursStatusToProcessStatus(workHours.status);
    // await updateProcessStatus(workHours.processId, processStatus);

    return { error: null };
  } catch (error: any) {
    console.error('Error syncing process from work hours:', error);
    return { error: error.message };
  }
};

// =============================================================================
// PROCESS MAPPING MANAGEMENT
// =============================================================================

/**
 * プロセスマッピングを作成
 */
export const createProcessMapping = async (
  processId: string,
  workHoursId: string,
  mappingType: 'automatic' | 'manual'
): Promise<{ error: string | null }> => {
  try {
    const mappingData: ProcessWorkHoursMapping = {
      processId,
      workHoursId,
      mappingType,
      createdAt: new Date().toISOString(),
      syncStatus: 'active'
    };

    const docRef = doc(db, 'processWorkHoursMappings', `${processId}-${workHoursId}`);
    await updateDoc(docRef, mappingData);

    return { error: null };
  } catch (error: any) {
    console.error('Error creating process mapping:', error);
    return { error: error.message };
  }
};

/**
 * プロセスマッピングの同期時刻を更新
 */
export const updateProcessMappingSync = async (
  processId: string,
  workHoursId: string
): Promise<{ error: string | null }> => {
  try {
    const mappingRef = doc(db, 'processWorkHoursMappings', `${processId}-${workHoursId}`);
    
    await updateDoc(mappingRef, {
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'active',
      errorMessage: null
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error updating process mapping sync:', error);
    return { error: error.message };
  }
};

/**
 * プロセスマッピングを取得
 */
export const getProcessMappings = async (
  processId?: string,
  workHoursId?: string
): Promise<{ data: ProcessWorkHoursMapping[]; error: string | null }> => {
  try {
    let q = collection(db, 'processWorkHoursMappings');
    const constraints = [];

    if (processId) {
      constraints.push(where('processId', '==', processId));
    }
    if (workHoursId) {
      constraints.push(where('workHoursId', '==', workHoursId));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    const data = querySnapshot.docs.map(doc => ({
      ...doc.data()
    })) as ProcessWorkHoursMapping[];

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting process mappings:', error);
    return { data: [], error: error.message };
  }
};

// =============================================================================
// ANALYTICS INTEGRATION
// =============================================================================

/**
 * プロセス分析データを生成
 */
export const generateProcessAnalytics = async (
  processes: Process[]
): Promise<{ data: WorkHoursAnalytics | null; error: string | null }> => {
  try {
    const processIds = processes.map(p => p.id);
    const { data: workHoursList } = await getWorkHoursList();
    
    // プロセスに対応する工数レコードをフィルタ
    const relatedWorkHours = workHoursList.filter(wh => 
      processIds.includes(wh.processId || '') || processIds.includes(wh.integrations?.processId || '')
    );

    if (relatedWorkHours.length === 0) {
      return { data: null, error: 'No work hours data found for specified processes' };
    }

    // 分析データを計算
    const analytics: WorkHoursAnalytics = {
      projectId: 'batch-analysis',
      timeframe: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      efficiency: calculateEfficiencyMetrics(relatedWorkHours),
      utilization: await calculateUtilizationMetrics(relatedWorkHours),
      costs: await calculateCostMetrics(relatedWorkHours),
      quality: calculateQualityMetrics(relatedWorkHours),
      predictions: await generatePredictions(relatedWorkHours)
    };

    return { data: analytics, error: null };
  } catch (error: any) {
    console.error('Error generating process analytics:', error);
    return { data: null, error: error.message };
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * プロセスステータスを工数ステータスにマッピング
 */
const mapProcessStatusToWorkHoursStatus = (processStatus: Process['status']): WorkHours['status'] => {
  const statusMap: Record<Process['status'], WorkHours['status']> = {
    'planning': 'planning',
    'data-work': 'planning',
    'processing': 'in-progress',
    'finishing': 'in-progress',
    'completed': 'completed',
    'delayed': 'delayed'
  };

  return statusMap[processStatus] || 'planning';
};

/**
 * 工数ステータスをプロセスステータスにマッピング
 */
const mapWorkHoursStatusToProcessStatus = (workHoursStatus: WorkHours['status']): Process['status'] => {
  const statusMap: Record<WorkHours['status'], Process['status']> = {
    'planning': 'planning',
    'in-progress': 'processing',
    'completed': 'completed',
    'delayed': 'delayed'
  };

  return statusMap[workHoursStatus] || 'planning';
};

/**
 * 効率性メトリクスを計算
 */
const calculateEfficiencyMetrics = (workHours: EnhancedWorkHours[]) => {
  const totalPlanned = workHours.reduce((sum, wh) => sum + wh.plannedHours.total, 0);
  const totalActual = workHours.reduce((sum, wh) => sum + wh.actualHours.total, 0);
  
  const overall = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

  const byCategory = {
    setup: calculateCategoryEfficiency(workHours, 'setup'),
    machining: calculateCategoryEfficiency(workHours, 'machining'),
    finishing: calculateCategoryEfficiency(workHours, 'finishing')
  };

  const trend = {
    direction: overall <= 100 ? 'improving' as const : overall <= 120 ? 'stable' as const : 'declining' as const,
    percentage: Math.abs(overall - 100)
  };

  return { overall, byCategory, trend };
};

/**
 * カテゴリ別効率性を計算
 */
const calculateCategoryEfficiency = (
  workHours: EnhancedWorkHours[], 
  category: 'setup' | 'machining' | 'finishing'
): number => {
  const totalPlanned = workHours.reduce((sum, wh) => sum + wh.plannedHours[category], 0);
  const totalActual = workHours.reduce((sum, wh) => sum + wh.actualHours[category], 0);
  
  return totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
};

/**
 * 稼働率メトリクスを計算
 */
const calculateUtilizationMetrics = async (workHours: EnhancedWorkHours[]) => {
  // 実際の実装では、作業者と機械のデータを取得して稼働率を計算
  return {
    workers: [],
    machines: []
  };
};

/**
 * コストメトリクスを計算
 */
const calculateCostMetrics = async (workHours: EnhancedWorkHours[]) => {
  const totalPlanned = workHours.reduce((sum, wh) => sum + wh.budget.totalPlannedCost, 0);
  const totalActual = workHours.reduce((sum, wh) => sum + wh.budget.totalActualCost, 0);
  const variance = totalActual - totalPlanned;
  const variancePercentage = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0;

  return {
    plannedVsActual: {
      planned: totalPlanned,
      actual: totalActual,
      variance,
      variancePercentage
    },
    breakdown: {
      labor: totalActual * 0.4, // 簡易計算
      machine: totalActual * 0.3,
      overhead: totalActual * 0.3,
      total: totalActual
    }
  };
};

/**
 * 品質メトリクスを計算
 */
const calculateQualityMetrics = (workHours: EnhancedWorkHours[]) => {
  // 実際の実装では、品質データを取得して計算
  return {
    reworkHours: 0,
    defectRate: 0,
    qualityScore: 95
  };
};

/**
 * 予測データを生成
 */
const generatePredictions = async (workHours: EnhancedWorkHours[]) => {
  const inProgressProjects = workHours.filter(wh => wh.status === 'in-progress');
  
  // 完了予測日を計算
  const avgEfficiency = inProgressProjects.reduce((sum, wh) => {
    const efficiency = wh.plannedHours.total > 0 ? wh.actualHours.total / wh.plannedHours.total : 1;
    return sum + efficiency;
  }, 0) / inProgressProjects.length;

  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + 14); // 2週間後と仮定

  // 推定総コストを計算
  const estimatedTotalCost = workHours.reduce((sum, wh) => {
    if (wh.status === 'completed') {
      return sum + wh.budget.totalActualCost;
    } else {
      const projectedCost = wh.budget.totalPlannedCost * (avgEfficiency || 1);
      return sum + projectedCost;
    }
  }, 0);

  // リスクレベルを判定
  const riskLevel = avgEfficiency > 1.2 ? 'high' : avgEfficiency > 1.1 ? 'medium' : 'low';

  const recommendations = [];
  if (avgEfficiency > 1.1) {
    recommendations.push('作業プロセスの効率化が必要です');
  }
  if (workHours.some(wh => wh.status === 'delayed')) {
    recommendations.push('遅延プロジェクトの優先対応が必要です');
  }

  return {
    estimatedCompletion: estimatedCompletion.toISOString(),
    estimatedTotalCost,
    riskLevel,
    recommendations
  };
};

// =============================================================================
// REAL-TIME INTEGRATION
// =============================================================================

/**
 * プロセス変更を監視して工数レコードを自動同期
 */
export const startProcessWorkHoursSync = (
  processes: Process[],
  onSync: (result: ProcessSyncResult) => void
): (() => void) => {
  // 実際の実装では、プロセス管理システムの変更イベントを監視
  console.log('Starting process-work hours sync for', processes.length, 'processes');
  
  // 定期的な同期をシミュレート
  const interval = setInterval(async () => {
    for (const process of processes) {
      try {
        const { error } = await syncWorkHoursFromProcess(process, {
          syncBudget: true,
          syncStatus: true,
          syncPlannedHours: true
        });

        onSync({
          processId: process.id,
          success: !error,
          action: error ? 'error' : 'updated',
          message: error || 'Process synced successfully',
          syncedAt: new Date().toISOString()
        });
      } catch (error: any) {
        onSync({
          processId: process.id,
          success: false,
          action: 'error',
          message: error.message,
          syncedAt: new Date().toISOString()
        });
      }
    }
  }, 60000); // 1分間隔

  return () => clearInterval(interval);
};

// =============================================================================
// DAILY REPORT INTEGRATION
// =============================================================================

/**
 * 製番から工程を検索
 */
export const findProcessByProductionNumber = async (productionNumber: string) => {
  try {
    // 管理番号で検索
    const processesQuery = query(
      collection(db, 'processes'),
      where('managementNumber', '==', productionNumber)
    );
    
    const querySnapshot = await getDocs(processesQuery);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        success: true,
        data: { id: doc.id, ...doc.data() } as Process
      };
    }
    
    // プロジェクト名でも検索を試行
    const projectQuery = query(
      collection(db, 'processes'),
      where('projectName', '==', productionNumber)
    );
    
    const projectSnapshot = await getDocs(projectQuery);
    
    if (!projectSnapshot.empty) {
      const doc = projectSnapshot.docs[0];
      return {
        success: true,
        data: { id: doc.id, ...doc.data() } as Process
      };
    }
    
    return {
      success: false,
      error: '該当する工程が見つかりません'
    };
  } catch (error: any) {
    console.error('Error finding process:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 日報の作業時間を工程の実績工数に反映
 */
export const syncWorkTimeToProcess = async (
  workTimeEntry: any, // WorkTimeEntry型
  processId: string
) => {
  try {
    const processRef = doc(db, 'processes', processId);
    
    // 工程データを取得
    const processDoc = await getDoc(processRef);
    if (!processDoc.exists()) {
      return {
        success: false,
        error: '工程が見つかりません'
      };
    }
    
    const processData = processDoc.data() as Process;
    const workDetails = processData.workDetails;
    
    // 作業時間を時間単位に変換
    const hours = workTimeEntry.durationMinutes / 60;
    
    // 動的な作業手順を使用している場合
    if (workDetails.useDynamicSteps && workDetails.customSteps) {
      const updatedSteps = workDetails.customSteps.map((step: any) => {
        if (step.id === workTimeEntry.workStepId) {
          return {
            ...step,
            actualHours: step.actualHours + hours
          };
        }
        return step;
      });
      
      const totalActualHours = updatedSteps.reduce((sum: number, step: any) => sum + step.actualHours, 0);
      
      await updateDoc(processRef, {
        'workDetails.customSteps': updatedSteps,
        'workDetails.totalActualHours': totalActualHours,
        updatedAt: new Date().toISOString()
      });
    } else {
      // 従来の固定的な構造の場合
      const updatedWorkDetails = { ...workDetails };
      
      // 作業内容に応じて適切なフィールドに追加
      switch (workTimeEntry.workContentId) {
        case 'setup':
        case 'data':
          updatedWorkDetails.setup = (updatedWorkDetails.setup || 0) + hours;
          break;
        case 'machining':
          updatedWorkDetails.machining = (updatedWorkDetails.machining || 0) + hours;
          break;
        case 'finishing':
        case 'chamfering':
          updatedWorkDetails.finishing = (updatedWorkDetails.finishing || 0) + hours;
          break;
        default:
          // デフォルトは機械加工時間に追加
          updatedWorkDetails.machining = (updatedWorkDetails.machining || 0) + hours;
      }
      
      await updateDoc(processRef, {
        workDetails: updatedWorkDetails,
        updatedAt: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      syncedHours: hours
    };
  } catch (error: any) {
    console.error('Error syncing work time to process:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 日報の作業時間エントリを工程と自動連携
 */
export const autoLinkWorkTimeToProcess = async (workTimeEntry: any) => {
  try {
    // 製番から工程を検索
    const processResult = await findProcessByProductionNumber(workTimeEntry.productionNumber);
    
    if (!processResult.success || !processResult.data) {
      return {
        success: false,
        error: `製番「${workTimeEntry.productionNumber}」に対応する工程が見つかりません`,
        workTimeEntry
      };
    }
    
    const process = processResult.data;
    
    // 作業時間エントリに工程情報を追加
    const updatedWorkTimeEntry = {
      ...workTimeEntry,
      processId: process.id,
      processName: process.projectName,
      managementNumber: process.managementNumber,
      isSyncedToProcess: true,
      syncedAt: new Date().toISOString()
    };
    
    // 工程の実績工数に反映
    const syncResult = await syncWorkTimeToProcess(updatedWorkTimeEntry, process.id);
    
    if (!syncResult.success) {
      return {
        success: false,
        error: syncResult.error,
        workTimeEntry: updatedWorkTimeEntry
      };
    }
    
    return {
      success: true,
      workTimeEntry: updatedWorkTimeEntry,
      process,
      syncedHours: syncResult.syncedHours
    };
  } catch (error: any) {
    console.error('Error auto-linking work time to process:', error);
    return {
      success: false,
      error: error.message,
      workTimeEntry
    };
  }
};

/**
 * 利用可能な工程リストを取得（日報の製番入力支援用）
 */
/**
 * 工程データに作業項目を含めて取得
 */
export const getProcessesWithWorkItems = async () => {
  try {
    const processesQuery = query(
      collection(db, 'processes'),
      orderBy('managementNumber', 'asc')
    );
    
    const snapshot = await getDocs(processesQuery);
    const processes = [];
    
    for (const processDoc of snapshot.docs) {
      const processData = processDoc.data();
      
      // 工数管理から作業項目を取得
      const workHoursQuery = query(
        collection(db, 'workHours'),
        where('processId', '==', processDoc.id)
      );
      
      const workHoursSnapshot = await getDocs(workHoursQuery);
      let workItems = [];
      
      if (!workHoursSnapshot.empty) {
        const workHoursData = workHoursSnapshot.docs[0].data();
        
        // 工数データから作業項目を構築
        if (workHoursData.plannedHours) {
          workItems = [
            {
              id: 'setup',
              name: '段取り',
              plannedHours: workHoursData.plannedHours.setup || 0,
              actualHours: workHoursData.actualHours?.setup || 0
            },
            {
              id: 'machining',
              name: '機械加工',
              plannedHours: workHoursData.plannedHours.machining || 0,
              actualHours: workHoursData.actualHours?.machining || 0
            },
            {
              id: 'finishing',
              name: '仕上げ',
              plannedHours: workHoursData.plannedHours.finishing || 0,
              actualHours: workHoursData.actualHours?.finishing || 0
            }
          ].filter(item => item.plannedHours > 0); // 予定工数があるもののみ
        }
      }
      
      // デフォルトの作業項目（工数データがない場合）
      if (workItems.length === 0) {
        workItems = [
          { id: 'setup', name: '段取り', plannedHours: 2, actualHours: 0 },
          { id: 'machining', name: '機械加工', plannedHours: 8, actualHours: 0 },
          { id: 'finishing', name: '仕上げ', plannedHours: 2, actualHours: 0 }
        ];
      }
      
      // クライアントサイドで対象ステータスをフィルタ
      if (['planning', 'data-work', 'processing', 'finishing'].includes(processData.status)) {
        processes.push({
          id: processDoc.id,
          managementNumber: processData.managementNumber || '',
          projectName: processData.projectName || '',
          orderClient: processData.orderClient || '',
          status: processData.status || 'planning',
          progress: processData.progress || 0,
          workItems
        });
      }
    }
    
    return {
      success: true,
      data: processes
    };
  } catch (error: any) {
    console.error('Error fetching processes with work items:', error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

export const getAvailableProcesses = async () => {
  try {
    // 複合インデックス回避のため、単純なクエリにしてクライアントサイドでフィルタ
    const processesQuery = query(
      collection(db, 'processes'),
      orderBy('managementNumber', 'asc')
    );
    
    const querySnapshot = await getDocs(processesQuery);
    const processes: any[] = [];
    
    querySnapshot.forEach((doc) => {
      const processData = doc.data() as Process;
      
      // クライアントサイドで対象ステータスをフィルタ
      if (['planning', 'data-work', 'processing', 'finishing'].includes(processData.status)) {
        processes.push({
          id: doc.id,
          managementNumber: processData.managementNumber,
          projectName: processData.projectName,
          orderClient: processData.orderClient,
          status: processData.status,
          progress: processData.progress
        });
      }
    });
    
    return {
      success: true,
      data: processes
    };
  } catch (error: any) {
    console.error('Error getting available processes:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * 日報の工程別作業実績から工程リストに同期
 */
export const syncProcessWorkTimeFromDailyReport = async (processWorkTimeEntries: any[]) => {
  try {
    const batch = writeBatch(db);
    const syncResults = [];

    for (const entry of processWorkTimeEntries) {
      // 工程の進捗を更新
      const processRef = doc(db, 'processes', entry.processId);
      batch.update(processRef, {
        progress: entry.overallProgress,
        updatedAt: new Date().toISOString()
      });

      // 工数管理の実績を更新
      const workHoursQuery = query(
        collection(db, 'workHours'),
        where('processId', '==', entry.processId)
      );
      
      const workHoursSnapshot = await getDocs(workHoursQuery);
      
      if (!workHoursSnapshot.empty) {
        const workHoursRef = workHoursSnapshot.docs[0].ref;
        const currentData = workHoursSnapshot.docs[0].data();
        
        // 実績工数を更新
        const updatedActualHours = {
          setup: entry.workItems.find((item: any) => item.id === 'setup')?.actualHours || 0,
          machining: entry.workItems.find((item: any) => item.id === 'machining')?.actualHours || 0,
          finishing: entry.workItems.find((item: any) => item.id === 'finishing')?.actualHours || 0,
          total: entry.workItems.reduce((sum: number, item: any) => sum + item.actualHours, 0) +
                 entry.additionalWorkItems.reduce((sum: number, item: any) => sum + item.actualHours, 0)
        };

        batch.update(workHoursRef, {
          actualHours: updatedActualHours,
          updatedAt: new Date().toISOString()
        });
      }

      syncResults.push({
        processId: entry.processId,
        progress: entry.overallProgress,
        actualHours: entry.workItems.reduce((sum: number, item: any) => sum + item.actualHours, 0) +
                     entry.additionalWorkItems.reduce((sum: number, item: any) => sum + item.actualHours, 0)
      });
    }

    await batch.commit();

    return {
      success: true,
      syncedProcesses: syncResults.length,
      results: syncResults
    };
  } catch (error: any) {
    console.error('Error syncing process work time from daily report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 工程の進捗を更新
 */
export const updateProcessProgress = async (processId: string, progress: number) => {
  try {
    const processRef = doc(db, 'processes', processId);
    
    await updateDoc(processRef, {
      progress,
      updatedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      updatedProgress: progress
    };
  } catch (error: any) {
    console.error('Error updating process progress:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export {
  // Types for external use
  type ProcessWorkHoursMapping,
  type ProcessSyncResult,
  type BatchSyncResult
};