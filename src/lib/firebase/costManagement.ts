import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

import { db } from './config';
import type {
  EnhancedWorkHours,
  EnhancedBudget,
  BudgetRevision,
  BudgetAlert,
  WorkHoursAnalytics,
} from '@/app/tasks/types';

// =============================================================================
// COST MANAGEMENT TYPES
// =============================================================================

export interface CostConfiguration {
  id: string;
  baseCurrencyCode: string;
  defaultRates: {
    setupRate: number;
    machiningRate: number;
    finishingRate: number;
    overtimeMultiplier: number;
    holidayMultiplier: number;
  };
  budgetThresholds: {
    warningThreshold: number; // %
    criticalThreshold: number; // %
    autoAlertEnabled: boolean;
  };
  costCategories: {
    id: string;
    name: string;
    description: string;
    defaultRate: number;
    isActive: boolean;
  }[];
  approvalLimits: {
    projectManagerLimit: number;
    departmentManagerLimit: number;
    executiveApprovalRequired: number;
  };
}

export interface CostBreakdown {
  laborCosts: {
    regularHours: number;
    overtimeHours: number;
    holidayHours: number;
    totalLaborCost: number;
  };
  machineCosts: {
    setupCost: number;
    operatingCost: number;
    maintenanceCost: number;
    totalMachineCost: number;
  };
  materialCosts: {
    directMaterials: number;
    indirectMaterials: number;
    totalMaterialCost: number;
  };
  overheadCosts: {
    facilityOverhead: number;
    administrativeOverhead: number;
    totalOverheadCost: number;
  };
  totalProjectCost: number;
}

export interface BudgetForecast {
  id: string;
  workHoursId: string;
  projectedCompletion: string;
  forecastedCosts: CostBreakdown;
  confidenceLevel: number; // 0-100
  riskFactors: {
    factor: string;
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  lastUpdated: string;
}

export interface CostVarianceReport {
  id: string;
  workHoursId: string;
  reportDate: string;
  plannedCosts: CostBreakdown;
  actualCosts: CostBreakdown;
  variances: {
    category: string;
    plannedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercentage: number;
    status: 'favorable' | 'unfavorable' | 'neutral';
  }[];
  rootCauseAnalysis: string;
  correctiveActions: string[];
  nextReviewDate: string;
}

// =============================================================================
// BUDGET MANAGEMENT OPERATIONS
// =============================================================================

/**
 * 予算を作成または更新
 */
export const createOrUpdateBudget = async (
  workHoursId: string,
  budgetData: Partial<EnhancedBudget>,
  updatedBy: string,
  reason?: string
): Promise<{ error: string | null }> => {
  try {
    const { getWorkHours, updateWorkHours } = await import('./workHours');
    const { data: workHours } = await getWorkHours(workHoursId);
    
    if (!workHours) {
      return { error: 'Work hours record not found' };
    }

    const currentBudget = workHours.budget;
    const newBudget: EnhancedBudget = {
      ...currentBudget,
      ...budgetData,
      currencyCode: budgetData.currencyCode || 'JPY',
      lastUpdated: new Date().toISOString(),
      budgetVersion: (currentBudget as any)?.budgetVersion ? (currentBudget as any).budgetVersion + 1 : 1,
      revisions: [],
      alerts: []
    };

    // 予算変更履歴を作成
    if (currentBudget) {
      const revision: BudgetRevision = {
        id: `rev-${Date.now()}`,
        version: newBudget.budgetVersion - 1,
        revisedBy: updatedBy,
        revisedAt: new Date().toISOString(),
        reason: reason || 'Budget update',
        changes: calculateBudgetChanges(currentBudget, newBudget)
      };

      newBudget.revisions = [revision, ...(currentBudget as any)?.revisions || []].slice(0, 10);
    }

    // 予算アラートをチェック
    const alerts = await checkBudgetAlerts(workHoursId, newBudget);
    newBudget.alerts = alerts;

    // 工数レコードを更新
    const { error } = await updateWorkHours(
      workHoursId,
      { budget: newBudget },
      {
        triggeredBy: updatedBy,
        source: 'manual',
        reason: reason || 'Budget update'
      }
    );

    return { error };
  } catch (error: any) {
    console.error('Error creating/updating budget:', error);
    return { error: error.message };
  }
};

/**
 * コスト内訳を計算
 */
export const calculateCostBreakdown = async (
  workHours: EnhancedWorkHours,
  config?: CostConfiguration
): Promise<CostBreakdown> => {
  try {
    const costConfig = config || await getCostConfiguration();
    
    // 労務費計算
    const laborCosts = {
      regularHours: workHours.actualHours.total * getAverageHourlyRate(costConfig),
      overtimeHours: 0, // 実際の実装では残業時間を計算
      holidayHours: 0,   // 実際の実装では休日労働時間を計算
      totalLaborCost: 0
    };
    laborCosts.totalLaborCost = laborCosts.regularHours + laborCosts.overtimeHours + laborCosts.holidayHours;

    // 機械費計算
    const machineCosts = {
      setupCost: workHours.actualHours.setup * costConfig.defaultRates.setupRate,
      operatingCost: workHours.actualHours.machining * costConfig.defaultRates.machiningRate,
      maintenanceCost: workHours.actualHours.total * 100, // 固定メンテナンス費
      totalMachineCost: 0
    };
    machineCosts.totalMachineCost = machineCosts.setupCost + machineCosts.operatingCost + machineCosts.maintenanceCost;

    // 材料費計算（簡易版）
    const materialCosts = {
      directMaterials: workHours.budget.estimatedAmount * 0.3, // 見積の30%を材料費と仮定
      indirectMaterials: workHours.budget.estimatedAmount * 0.05, // 見積の5%を間接材料費と仮定
      totalMaterialCost: 0
    };
    materialCosts.totalMaterialCost = materialCosts.directMaterials + materialCosts.indirectMaterials;

    // 間接費計算
    const overheadCosts = {
      facilityOverhead: laborCosts.totalLaborCost * 0.2, // 労務費の20%
      administrativeOverhead: laborCosts.totalLaborCost * 0.1, // 労務費の10%
      totalOverheadCost: 0
    };
    overheadCosts.totalOverheadCost = overheadCosts.facilityOverhead + overheadCosts.administrativeOverhead;

    return {
      laborCosts,
      machineCosts,
      materialCosts,
      overheadCosts,
      totalProjectCost: laborCosts.totalLaborCost + machineCosts.totalMachineCost + 
                       materialCosts.totalMaterialCost + overheadCosts.totalOverheadCost
    };
  } catch (error) {
    console.error('Error calculating cost breakdown:', error);
    throw error;
  }
};

/**
 * 予算予測を作成
 */
export const createBudgetForecast = async (
  workHoursId: string,
  projectionWeeks: number = 4
): Promise<{ data: BudgetForecast | null; error: string | null }> => {
  try {
    const { getWorkHours } = await import('./workHours');
    const { data: workHours } = await getWorkHours(workHoursId);
    
    if (!workHours) {
      return { data: null, error: 'Work hours record not found' };
    }

    // 進捗率に基づく完了予測
    const progressRate = workHours.plannedHours.total > 0 
      ? workHours.actualHours.total / workHours.plannedHours.total 
      : 0;

    const estimatedCompletionWeeks = progressRate > 0 
      ? (1 - progressRate) * projectionWeeks 
      : projectionWeeks;

    const projectedCompletion = new Date();
    projectedCompletion.setDate(projectedCompletion.getDate() + estimatedCompletionWeeks * 7);

    // 予測コストを計算
    const currentCostBreakdown = await calculateCostBreakdown(workHours);
    const projectionMultiplier = progressRate > 0 ? (1 / progressRate) : 2;

    const forecastedCosts: CostBreakdown = {
      laborCosts: {
        ...currentCostBreakdown.laborCosts,
        totalLaborCost: currentCostBreakdown.laborCosts.totalLaborCost * projectionMultiplier
      },
      machineCosts: {
        ...currentCostBreakdown.machineCosts,
        totalMachineCost: currentCostBreakdown.machineCosts.totalMachineCost * projectionMultiplier
      },
      materialCosts: currentCostBreakdown.materialCosts, // 材料費は変動しないと仮定
      overheadCosts: {
        ...currentCostBreakdown.overheadCosts,
        totalOverheadCost: currentCostBreakdown.overheadCosts.totalOverheadCost * projectionMultiplier
      },
      totalProjectCost: 0
    };

    forecastedCosts.totalProjectCost = 
      forecastedCosts.laborCosts.totalLaborCost +
      forecastedCosts.machineCosts.totalMachineCost +
      forecastedCosts.materialCosts.totalMaterialCost +
      forecastedCosts.overheadCosts.totalOverheadCost;

    // 信頼度とリスク要因を計算
    const confidenceLevel = calculateForecastConfidence(workHours, progressRate);
    const riskFactors = identifyRiskFactors(workHours, forecastedCosts);

    const forecast: BudgetForecast = {
      id: `forecast-${workHoursId}-${Date.now()}`,
      workHoursId,
      projectedCompletion: projectedCompletion.toISOString(),
      forecastedCosts,
      confidenceLevel,
      riskFactors,
      lastUpdated: new Date().toISOString()
    };

    // Firestoreに保存
    const docRef = await addDoc(collection(db, 'budgetForecasts'), forecast);
    forecast.id = docRef.id;

    return { data: forecast, error: null };
  } catch (error: any) {
    console.error('Error creating budget forecast:', error);
    return { data: null, error: error.message };
  }
};

/**
 * コスト差異レポートを生成
 */
export const generateCostVarianceReport = async (
  workHoursId: string
): Promise<{ data: CostVarianceReport | null; error: string | null }> => {
  try {
    const { getWorkHours } = await import('./workHours');
    const { data: workHours } = await getWorkHours(workHoursId);
    
    if (!workHours) {
      return { data: null, error: 'Work hours record not found' };
    }

    // 計画コストを計算（計画時間ベース）
    const plannedWorkHours: EnhancedWorkHours = {
      ...workHours,
      actualHours: workHours.plannedHours // 計画時間を実績として使用
    };
    const plannedCosts = await calculateCostBreakdown(plannedWorkHours);

    // 実績コストを計算
    const actualCosts = await calculateCostBreakdown(workHours);

    // 差異を計算
    const variances = [
      {
        category: '労務費',
        plannedAmount: plannedCosts.laborCosts.totalLaborCost,
        actualAmount: actualCosts.laborCosts.totalLaborCost,
        variance: actualCosts.laborCosts.totalLaborCost - plannedCosts.laborCosts.totalLaborCost,
        variancePercentage: plannedCosts.laborCosts.totalLaborCost > 0 
          ? ((actualCosts.laborCosts.totalLaborCost - plannedCosts.laborCosts.totalLaborCost) / plannedCosts.laborCosts.totalLaborCost) * 100 
          : 0,
        status: 'neutral' as const
      },
      {
        category: '機械費',
        plannedAmount: plannedCosts.machineCosts.totalMachineCost,
        actualAmount: actualCosts.machineCosts.totalMachineCost,
        variance: actualCosts.machineCosts.totalMachineCost - plannedCosts.machineCosts.totalMachineCost,
        variancePercentage: plannedCosts.machineCosts.totalMachineCost > 0 
          ? ((actualCosts.machineCosts.totalMachineCost - plannedCosts.machineCosts.totalMachineCost) / plannedCosts.machineCosts.totalMachineCost) * 100 
          : 0,
        status: 'neutral' as const
      },
      {
        category: '材料費',
        plannedAmount: plannedCosts.materialCosts.totalMaterialCost,
        actualAmount: actualCosts.materialCosts.totalMaterialCost,
        variance: actualCosts.materialCosts.totalMaterialCost - plannedCosts.materialCosts.totalMaterialCost,
        variancePercentage: plannedCosts.materialCosts.totalMaterialCost > 0 
          ? ((actualCosts.materialCosts.totalMaterialCost - plannedCosts.materialCosts.totalMaterialCost) / plannedCosts.materialCosts.totalMaterialCost) * 100 
          : 0,
        status: 'neutral' as const
      },
      {
        category: '間接費',
        plannedAmount: plannedCosts.overheadCosts.totalOverheadCost,
        actualAmount: actualCosts.overheadCosts.totalOverheadCost,
        variance: actualCosts.overheadCosts.totalOverheadCost - plannedCosts.overheadCosts.totalOverheadCost,
        variancePercentage: plannedCosts.overheadCosts.totalOverheadCost > 0 
          ? ((actualCosts.overheadCosts.totalOverheadCost - plannedCosts.overheadCosts.totalOverheadCost) / plannedCosts.overheadCosts.totalOverheadCost) * 100 
          : 0,
        status: 'neutral' as const
      }
    ];

    // 差異ステータスを設定
    variances.forEach(variance => {
      if (Math.abs(variance.variancePercentage) < 5) {
        variance.status = 'neutral';
      } else if (variance.variance < 0) {
        variance.status = 'favorable'; // 実績が計画を下回る場合は有利
      } else {
        variance.status = 'unfavorable'; // 実績が計画を上回る場合は不利
      }
    });

    const report: CostVarianceReport = {
      id: `variance-${workHoursId}-${Date.now()}`,
      workHoursId,
      reportDate: new Date().toISOString(),
      plannedCosts,
      actualCosts,
      variances,
      rootCauseAnalysis: generateRootCauseAnalysis(variances),
      correctiveActions: generateCorrectiveActions(variances),
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1週間後
    };

    // Firestoreに保存
    const docRef = await addDoc(collection(db, 'costVarianceReports'), report);
    report.id = docRef.id;

    return { data: report, error: null };
  } catch (error: any) {
    console.error('Error generating cost variance report:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 予算アラートをチェック
 */
export const checkBudgetAlerts = async (
  workHoursId: string,
  budget: EnhancedBudget
): Promise<BudgetAlert[]> => {
  try {
    const config = await getCostConfiguration();
    const alerts: BudgetAlert[] = [];

    // コスト超過アラート
    if (budget.totalActualCost > 0 && budget.totalPlannedCost > 0) {
      const costOverrunPercentage = ((budget.totalActualCost - budget.totalPlannedCost) / budget.totalPlannedCost) * 100;
      
      if (costOverrunPercentage > config.budgetThresholds.criticalThreshold) {
        alerts.push({
          id: `alert-${Date.now()}-critical`,
          type: 'overrun',
          severity: 'critical',
          message: `予算を${costOverrunPercentage.toFixed(1)}%超過しています（重大）`,
          threshold: config.budgetThresholds.criticalThreshold,
          currentValue: costOverrunPercentage,
          createdAt: new Date().toISOString(),
          acknowledged: false
        });
      } else if (costOverrunPercentage > config.budgetThresholds.warningThreshold) {
        alerts.push({
          id: `alert-${Date.now()}-warning`,
          type: 'overrun',
          severity: 'high',
          message: `予算を${costOverrunPercentage.toFixed(1)}%超過しています（警告）`,
          threshold: config.budgetThresholds.warningThreshold,
          currentValue: costOverrunPercentage,
          createdAt: new Date().toISOString(),
          acknowledged: false
        });
      }
    }

    // 見積金額との差異アラート
    if (budget.estimatedAmount > 0 && budget.totalActualCost > 0) {
      const estimateVariance = ((budget.totalActualCost - budget.estimatedAmount) / budget.estimatedAmount) * 100;
      
      if (Math.abs(estimateVariance) > 20) {
        alerts.push({
          id: `alert-${Date.now()}-estimate`,
          type: 'variance',
          severity: estimateVariance > 0 ? 'high' : 'medium',
          message: `見積金額との差異が${Math.abs(estimateVariance).toFixed(1)}%です`,
          threshold: 20,
          currentValue: Math.abs(estimateVariance),
          createdAt: new Date().toISOString(),
          acknowledged: false
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error checking budget alerts:', error);
    return [];
  }
};

/**
 * 予算アラートを承認
 */
export const acknowledgeBudgetAlert = async (
  workHoursId: string,
  alertId: string,
  acknowledgedBy: string
): Promise<{ error: string | null }> => {
  try {
    const { getWorkHours, updateWorkHours } = await import('./workHours');
    const { data: workHours } = await getWorkHours(workHoursId);
    
    if (!workHours || !workHours.budget) {
      return { error: 'Work hours or budget not found' };
    }

    const budget = workHours.budget as EnhancedBudget;
    const updatedAlerts = budget.alerts.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            acknowledged: true, 
            acknowledgedBy, 
            acknowledgedAt: new Date().toISOString() 
          }
        : alert
    );

    const { error } = await updateWorkHours(
      workHoursId,
      { budget: { ...budget, alerts: updatedAlerts } },
      {
        triggeredBy: acknowledgedBy,
        source: 'manual',
        reason: `Budget alert acknowledged: ${alertId}`
      }
    );

    return { error };
  } catch (error: any) {
    console.error('Error acknowledging budget alert:', error);
    return { error: error.message };
  }
};

// =============================================================================
// CONFIGURATION MANAGEMENT
// =============================================================================

/**
 * コスト設定を取得
 */
export const getCostConfiguration = async (): Promise<CostConfiguration> => {
  try {
    const configDoc = await getDoc(doc(db, 'costConfiguration', 'system'));
    
    if (configDoc.exists()) {
      return configDoc.data() as CostConfiguration;
    }
    
    // デフォルト設定
    return {
      id: 'system',
      baseCurrencyCode: 'JPY',
      defaultRates: {
        setupRate: 3000,
        machiningRate: 4000,
        finishingRate: 3500,
        overtimeMultiplier: 1.25,
        holidayMultiplier: 1.5
      },
      budgetThresholds: {
        warningThreshold: 10,
        criticalThreshold: 20,
        autoAlertEnabled: true
      },
      costCategories: [
        { id: 'setup', name: '段取り', description: 'セットアップ作業', defaultRate: 3000, isActive: true },
        { id: 'machining', name: '機械加工', description: '加工作業', defaultRate: 4000, isActive: true },
        { id: 'finishing', name: '仕上げ', description: '仕上げ作業', defaultRate: 3500, isActive: true }
      ],
      approvalLimits: {
        projectManagerLimit: 100000,
        departmentManagerLimit: 500000,
        executiveApprovalRequired: 1000000
      }
    };
  } catch (error) {
    console.error('Error getting cost configuration:', error);
    throw error;
  }
};

/**
 * コスト設定を更新
 */
export const updateCostConfiguration = async (
  configData: Partial<CostConfiguration>,
  updatedBy: string
): Promise<{ error: string | null }> => {
  try {
    const configRef = doc(db, 'costConfiguration', 'system');
    
    await updateDoc(configRef, {
      ...configData,
      lastUpdated: serverTimestamp(),
      updatedBy
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error updating cost configuration:', error);
    return { error: error.message };
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 予算変更を計算
 */
const calculateBudgetChanges = (
  oldBudget: any,
  newBudget: EnhancedBudget
): BudgetRevision['changes'] => {
  const changes: BudgetRevision['changes'] = [];
  
  const fieldsToCheck = [
    'estimatedAmount',
    'setupRate',
    'machiningRate',
    'finishingRate',
    'totalPlannedCost',
    'totalActualCost'
  ];

  fieldsToCheck.forEach(field => {
    const oldValue = oldBudget[field];
    const newValue = (newBudget as any)[field];
    
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue
      });
    }
  });

  return changes;
};

/**
 * 平均時給を取得
 */
const getAverageHourlyRate = (config: CostConfiguration): number => {
  const rates = config.defaultRates;
  return (rates.setupRate + rates.machiningRate + rates.finishingRate) / 3;
};

/**
 * 予測信頼度を計算
 */
const calculateForecastConfidence = (
  workHours: EnhancedWorkHours,
  progressRate: number
): number => {
  let confidence = 50; // ベース信頼度

  // 進捗率に基づく調整
  if (progressRate > 0.5) confidence += 20; // 50%以上進捗している場合
  if (progressRate > 0.8) confidence += 15; // 80%以上進捗している場合

  // 実績データの有無に基づく調整
  if (workHours.actualHours.total > 0) confidence += 15;

  // 過去の精度に基づく調整（実装時に追加）
  // if (pastAccuracy > 0.8) confidence += 10;

  return Math.min(confidence, 95); // 最大95%
};

/**
 * リスク要因を特定
 */
const identifyRiskFactors = (
  workHours: EnhancedWorkHours,
  forecastedCosts: CostBreakdown
): BudgetForecast['riskFactors'] => {
  const riskFactors: BudgetForecast['riskFactors'] = [];

  // 効率性リスク
  const efficiency = workHours.plannedHours.total > 0 
    ? workHours.actualHours.total / workHours.plannedHours.total 
    : 0;

  if (efficiency > 1.2) {
    riskFactors.push({
      factor: '作業効率の低下',
      impact: 'high',
      mitigation: '作業プロセスの見直しと改善計画の策定'
    });
  }

  // コスト超過リスク
  const costOverrun = workHours.budget.totalActualCost > workHours.budget.totalPlannedCost;
  if (costOverrun) {
    riskFactors.push({
      factor: '予算超過',
      impact: 'medium',
      mitigation: '予算管理の強化と承認プロセスの見直し'
    });
  }

  // スケジュールリスク
  if (workHours.status === 'delayed') {
    riskFactors.push({
      factor: 'スケジュール遅延',
      impact: 'high',
      mitigation: 'リソースの追加投入とスケジュールの再調整'
    });
  }

  return riskFactors;
};

/**
 * 根本原因分析を生成
 */
const generateRootCauseAnalysis = (variances: CostVarianceReport['variances']): string => {
  const significantVariances = variances.filter(v => Math.abs(v.variancePercentage) > 10);
  
  if (significantVariances.length === 0) {
    return 'コストは計画通りに推移しており、大きな差異は見られません。';
  }

  const causes = [];
  
  significantVariances.forEach(variance => {
    if (variance.category === '労務費' && variance.variance > 0) {
      causes.push('作業時間の増加による労務費の上昇');
    }
    if (variance.category === '機械費' && variance.variance > 0) {
      causes.push('機械稼働時間の延長による機械費の増加');
    }
    if (variance.category === '材料費' && variance.variance > 0) {
      causes.push('材料価格の上昇または使用量の増加');
    }
  });

  return causes.length > 0 
    ? causes.join('、') + 'が主な要因と考えられます。'
    : '差異の具体的な原因については詳細な調査が必要です。';
};

/**
 * 是正措置を生成
 */
const generateCorrectiveActions = (variances: CostVarianceReport['variances']): string[] => {
  const actions = [];
  
  variances.forEach(variance => {
    if (variance.status === 'unfavorable' && Math.abs(variance.variancePercentage) > 10) {
      switch (variance.category) {
        case '労務費':
          actions.push('作業プロセスの効率化と作業者のスキル向上');
          break;
        case '機械費':
          actions.push('機械稼働率の最適化と予防保全の強化');
          break;
        case '材料費':
          actions.push('材料調達先の見直しと在庫管理の改善');
          break;
        case '間接費':
          actions.push('間接費配賦基準の見直しと管理費の削減');
          break;
      }
    }
  });

  if (actions.length === 0) {
    actions.push('現在のコスト管理体制を維持し、定期的な監視を継続');
  }

  return actions;
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 予算予測の変更をリアルタイムで監視
 */
export const subscribeToBudgetForecasts = (
  workHoursId: string,
  callback: (data: BudgetForecast[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'budgetForecasts'),
    where('workHoursId', '==', workHoursId),
    orderBy('lastUpdated', 'desc'),
    limit(10)
  );

  return onSnapshot(q, (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BudgetForecast[];

    callback(data);
  }, (error) => {
    console.error('Error in budget forecasts subscription:', error);
    callback([]);
  });
};

export {
  // Types for external use
  type CostConfiguration,
  type CostBreakdown,
  type BudgetForecast,
  type CostVarianceReport
};