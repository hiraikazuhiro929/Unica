"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  EnhancedWorkHours,
  WorkHoursStatistics,
  WorkHoursAnalytics,
  SyncResult,
  BudgetForecast,
  CostVarianceReport,
  WorkHoursApprovalWorkflow,
  ProcessSyncResult,
  BatchSyncResult,
} from "@/app/tasks/types";

// Firebase imports
import {
  getWorkHoursList,
  subscribeToWorkHoursList,
  updateWorkHours,
  createWorkHours,
  deleteWorkHours,
  syncWorkHoursFromDailyReport,
} from "@/lib/firebase/workHours";

import {
  createBudgetForecast,
  generateCostVarianceReport,
  checkBudgetAlerts,
  calculateCostBreakdown,
} from "@/lib/firebase/costManagement";

import {
  getApprovalWorkflows,
  processApprovalStep,
  initiateApprovalWorkflow,
} from "@/lib/firebase/workHoursApproval";

import {
  createWorkHoursFromProcess,
  syncWorkHoursFromProcess,
  batchSyncProcesses,
  generateProcessAnalytics,
} from "@/lib/firebase/processIntegration";

import { useDailyReportIntegration } from "@/app/daily-reports/hooks/useDailyReportIntegration";

// =============================================================================
// MAIN WORK HOURS MANAGEMENT HOOK
// =============================================================================

interface UseWorkHoursManagementOptions {
  autoSync?: boolean;
  realTimeUpdates?: boolean;
  enableApprovalWorkflow?: boolean;
  enableCostTracking?: boolean;
  enableProcessIntegration?: boolean;
}

interface WorkHoursManagementState {
  workHours: EnhancedWorkHours[];
  statistics: WorkHoursStatistics | null;
  analytics: WorkHoursAnalytics | null;
  forecasts: BudgetForecast[];
  approvalWorkflows: WorkHoursApprovalWorkflow[];
  syncResults: SyncResult[];
  isLoading: boolean;
  error: string | null;
}

export const useWorkHoursManagement = (options: UseWorkHoursManagementOptions = {}) => {
  const {
    autoSync = true,
    realTimeUpdates = true,
    enableApprovalWorkflow = true,
    enableCostTracking = true,
    enableProcessIntegration = true,
  } = options;

  // State management
  const [state, setState] = useState<WorkHoursManagementState>({
    workHours: [],
    statistics: null,
    analytics: null,
    forecasts: [],
    approvalWorkflows: [],
    syncResults: [],
    isLoading: false,
    error: null,
  });

  // Daily report integration
  const dailyReportIntegration = useDailyReportIntegration();

  // =============================================================================
  // DATA LOADING AND REAL-TIME UPDATES
  // =============================================================================

  /**
   * 工数データを読み込み
   */
  const loadWorkHours = useCallback(async (filters?: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await getWorkHoursList(filters);
      
      if (error) {
        setState(prev => ({ ...prev, error, isLoading: false }));
        return;
      }

      // 統計を計算
      const statistics = calculateStatistics(data);

      setState(prev => ({
        ...prev,
        workHours: data,
        statistics,
        isLoading: false,
      }));

      // 承認ワークフローを読み込み
      if (enableApprovalWorkflow) {
        await loadApprovalWorkflows();
      }

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load work hours',
        isLoading: false,
      }));
    }
  }, [enableApprovalWorkflow]);

  /**
   * リアルタイム更新を設定
   */
  useEffect(() => {
    if (!realTimeUpdates) return;

    const unsubscribe = subscribeToWorkHoursList(
      { limit: 100 },
      (data) => {
        const statistics = calculateStatistics(data);
        setState(prev => ({
          ...prev,
          workHours: data,
          statistics,
        }));
      }
    );

    return unsubscribe;
  }, [realTimeUpdates]);

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    loadWorkHours();
  }, [loadWorkHours]);

  // =============================================================================
  // WORK HOURS OPERATIONS
  // =============================================================================

  /**
   * 工数レコードを作成
   */
  const createWorkHoursRecord = useCallback(async (
    workHoursData: any,
    options: { generateForecast?: boolean; initiateApproval?: boolean } = {}
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { id, error } = await createWorkHours(workHoursData);
      
      if (error) {
        setState(prev => ({ ...prev, error, isLoading: false }));
        return { id: null, error };
      }

      // 予測を生成
      if (options.generateForecast && enableCostTracking && id) {
        await createBudgetForecast(id);
      }

      // 承認ワークフローを開始
      if (options.initiateApproval && enableApprovalWorkflow && id) {
        await initiateApprovalWorkflow(
          id,
          'creation',
          'user', // 実際の実装ではcurrent user IDを使用
          workHoursData,
          'New work hours record creation'
        );
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { id, error: null };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create work hours';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { id: null, error: errorMessage };
    }
  }, [enableCostTracking, enableApprovalWorkflow]);

  /**
   * 工数レコードを更新
   */
  const updateWorkHoursRecord = useCallback(async (
    workHoursId: string,
    updates: any,
    options: { 
      requireApproval?: boolean; 
      generateForecast?: boolean;
      reason?: string;
    } = {}
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 承認が必要な場合はワークフローを開始
      if (options.requireApproval && enableApprovalWorkflow) {
        const { workflowId, error: workflowError } = await initiateApprovalWorkflow(
          workHoursId,
          'adjustment',
          'user', // 実際の実装ではcurrent user IDを使用
          updates,
          options.reason
        );

        if (workflowError) {
          setState(prev => ({ ...prev, error: workflowError, isLoading: false }));
          return { error: workflowError };
        }

        setState(prev => ({ ...prev, isLoading: false }));
        return { error: null, workflowId };
      }

      // 直接更新
      const { error } = await updateWorkHours(
        workHoursId,
        updates,
        {
          triggeredBy: 'user',
          source: 'manual',
          reason: options.reason || 'Manual update'
        }
      );

      if (error) {
        setState(prev => ({ ...prev, error, isLoading: false }));
        return { error };
      }

      // 予測を更新
      if (options.generateForecast && enableCostTracking) {
        await createBudgetForecast(workHoursId);
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { error: null };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update work hours';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { error: errorMessage };
    }
  }, [enableApprovalWorkflow, enableCostTracking]);

  /**
   * 工数レコードを削除
   */
  const deleteWorkHoursRecord = useCallback(async (workHoursId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await deleteWorkHours(workHoursId, 'user');
      
      if (error) {
        setState(prev => ({ ...prev, error, isLoading: false }));
        return { error };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { error: null };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete work hours';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { error: errorMessage };
    }
  }, []);

  // =============================================================================
  // DAILY REPORT INTEGRATION
  // =============================================================================

  /**
   * 日報から工数を同期
   */
  const syncFromDailyReport = useCallback(async (dailyReport: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await syncWorkHoursFromDailyReport(dailyReport);
      
      setState(prev => ({
        ...prev,
        syncResults: [result, ...prev.syncResults.slice(0, 9)],
        isLoading: false,
      }));

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync from daily report';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw err;
    }
  }, []);

  // =============================================================================
  // COST MANAGEMENT
  // =============================================================================

  /**
   * 予算予測を生成
   */
  const generateForecast = useCallback(async (workHoursId: string) => {
    if (!enableCostTracking) return { data: null, error: 'Cost tracking not enabled' };

    try {
      const { data, error } = await createBudgetForecast(workHoursId);
      
      if (data) {
        setState(prev => ({
          ...prev,
          forecasts: [data, ...prev.forecasts.filter(f => f.workHoursId !== workHoursId)],
        }));
      }

      return { data, error };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate forecast';
      return { data: null, error: errorMessage };
    }
  }, [enableCostTracking]);

  /**
   * コスト差異レポートを生成
   */
  const generateVarianceReport = useCallback(async (workHoursId: string) => {
    if (!enableCostTracking) return { data: null, error: 'Cost tracking not enabled' };

    try {
      const { data, error } = await generateCostVarianceReport(workHoursId);
      return { data, error };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate variance report';
      return { data: null, error: errorMessage };
    }
  }, [enableCostTracking]);

  // =============================================================================
  // APPROVAL WORKFLOW
  // =============================================================================

  /**
   * 承認ワークフローを読み込み
   */
  const loadApprovalWorkflows = useCallback(async () => {
    if (!enableApprovalWorkflow) return;

    try {
      const { data, error } = await getApprovalWorkflows({ limit: 50 });
      
      if (!error) {
        setState(prev => ({
          ...prev,
          approvalWorkflows: data,
        }));
      }

    } catch (err) {
      console.error('Failed to load approval workflows:', err);
    }
  }, [enableApprovalWorkflow]);

  /**
   * 承認ステップを処理
   */
  const processApproval = useCallback(async (
    workflowId: string,
    stepId: string,
    decision: 'approved' | 'rejected',
    comments?: string
  ) => {
    if (!enableApprovalWorkflow) return { error: 'Approval workflow not enabled' };

    try {
      const { error } = await processApprovalStep(
        workflowId,
        stepId,
        decision,
        comments,
        'user' // 実際の実装ではcurrent user IDを使用
      );

      if (!error) {
        await loadApprovalWorkflows(); // 承認状態を更新
      }

      return { error };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process approval';
      return { error: errorMessage };
    }
  }, [enableApprovalWorkflow, loadApprovalWorkflows]);

  // =============================================================================
  // PROCESS INTEGRATION
  // =============================================================================

  /**
   * プロセスから工数を作成
   */
  const createFromProcess = useCallback(async (process: any, options: any = {}) => {
    if (!enableProcessIntegration) return { workHoursId: null, error: 'Process integration not enabled' };

    try {
      const result = await createWorkHoursFromProcess(process, options);
      
      if (result.workHoursId) {
        await loadWorkHours(); // データを再読み込み
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create from process';
      return { workHoursId: null, error: errorMessage };
    }
  }, [enableProcessIntegration, loadWorkHours]);

  /**
   * プロセスとの一括同期
   */
  const batchSyncWithProcesses = useCallback(async (processes: any[], options: any = {}) => {
    if (!enableProcessIntegration) return null;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await batchSyncProcesses(processes, options);
      
      setState(prev => ({ ...prev, isLoading: false }));
      await loadWorkHours(); // データを再読み込み

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to batch sync processes';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return null;
    }
  }, [enableProcessIntegration, loadWorkHours]);

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  /**
   * 分析データを生成
   */
  const generateAnalytics = useCallback(async (processes?: any[]) => {
    try {
      let analytics;
      
      if (processes && enableProcessIntegration) {
        const { data } = await generateProcessAnalytics(processes);
        analytics = data;
      } else {
        // 既存の工数データから分析を生成
        analytics = calculateAnalyticsFromWorkHours(state.workHours);
      }

      setState(prev => ({ ...prev, analytics }));
      return analytics;

    } catch (err) {
      console.error('Failed to generate analytics:', err);
      return null;
    }
  }, [state.workHours, enableProcessIntegration]);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * 統計を計算
   */
  const calculateStatistics = (workHours: EnhancedWorkHours[]): WorkHoursStatistics => {
    const totalProjects = workHours.length;
    const totalPlannedHours = workHours.reduce((sum, wh) => sum + wh.plannedHours.total, 0);
    const totalActualHours = workHours.reduce((sum, wh) => sum + wh.actualHours.total, 0);
    const totalPlannedCost = workHours.reduce((sum, wh) => sum + wh.budget.totalPlannedCost, 0);
    const totalActualCost = workHours.reduce((sum, wh) => sum + wh.budget.totalActualCost, 0);
    const averageEfficiency = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;

    const byStatus = {
      planning: workHours.filter(wh => wh.status === 'planning').length,
      inProgress: workHours.filter(wh => wh.status === 'in-progress').length,
      completed: workHours.filter(wh => wh.status === 'completed').length,
      delayed: workHours.filter(wh => wh.status === 'delayed').length,
    };

    return {
      totalProjects,
      totalPlannedHours,
      totalActualHours,
      totalPlannedCost,
      totalActualCost,
      averageEfficiency,
      byStatus,
      byWorker: [], // 実際の実装では作業者データから計算
      byMachine: [], // 実際の実装では機械データから計算
    };
  };

  /**
   * 工数データから分析を計算
   */
  const calculateAnalyticsFromWorkHours = (workHours: EnhancedWorkHours[]): WorkHoursAnalytics | null => {
    if (workHours.length === 0) return null;

    // 簡易的な分析データを生成
    return {
      projectId: 'overview',
      timeframe: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      efficiency: {
        overall: calculateStatistics(workHours).averageEfficiency,
        byCategory: {
          setup: 0,
          machining: 0,
          finishing: 0,
        },
        trend: {
          direction: 'stable',
          percentage: 0,
        },
      },
      utilization: {
        workers: [],
        machines: [],
      },
      costs: {
        plannedVsActual: {
          planned: calculateStatistics(workHours).totalPlannedCost,
          actual: calculateStatistics(workHours).totalActualCost,
          variance: calculateStatistics(workHours).totalActualCost - calculateStatistics(workHours).totalPlannedCost,
          variancePercentage: 0,
        },
        breakdown: {
          labor: 0,
          machine: 0,
          overhead: 0,
          total: calculateStatistics(workHours).totalActualCost,
        },
      },
      quality: {
        reworkHours: 0,
        defectRate: 0,
        qualityScore: 95,
      },
      predictions: {
        estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedTotalCost: calculateStatistics(workHours).totalActualCost * 1.1,
        riskLevel: 'low',
        recommendations: [],
      },
    };
  };

  // =============================================================================
  // RETURN INTERFACE
  // =============================================================================

  return {
    // State
    ...state,
    
    // Data operations
    loadWorkHours,
    createWorkHoursRecord,
    updateWorkHoursRecord,
    deleteWorkHoursRecord,
    
    // Daily report integration
    syncFromDailyReport,
    dailyReportIntegration,
    
    // Cost management
    generateForecast,
    generateVarianceReport,
    
    // Approval workflow
    processApproval,
    loadApprovalWorkflows,
    
    // Process integration
    createFromProcess,
    batchSyncWithProcesses,
    
    // Analytics
    generateAnalytics,
    
    // Utility
    calculateStatistics: (workHours: EnhancedWorkHours[]) => calculateStatistics(workHours),
  };
};

export default useWorkHoursManagement;