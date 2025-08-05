import {
  collection,
  doc,
  addDoc,
  setDoc,
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
  WorkHoursApprovalWorkflow,
  WorkHoursAdjustment,
  EnhancedWorkHours,
  WorkHoursSystemConfig,
} from '@/app/tasks/types';

// =============================================================================
// APPROVAL WORKFLOW OPERATIONS
// =============================================================================

/**
 * 承認ワークフローを作成
 */
export const createApprovalWorkflow = async (
  workflowData: Omit<WorkHoursApprovalWorkflow, 'id' | 'completedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, 'workHoursWorkflows'), {
      ...workflowData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating approval workflow:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 承認ワークフローを取得
 */
export const getApprovalWorkflow = async (
  workflowId: string
): Promise<{ data: WorkHoursApprovalWorkflow | null; error: string | null }> => {
  try {
    const docRef = doc(db, 'workHoursWorkflows', workflowId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data,
          requestedAt: data.requestedAt?.toDate()?.toISOString() || '',
          completedAt: data.completedAt?.toDate()?.toISOString() || null,
          approvalSteps: data.approvalSteps?.map((step: any) => ({
            ...step,
            processedAt: step.processedAt?.toDate()?.toISOString() || null
          })) || []
        } as WorkHoursApprovalWorkflow,
        error: null
      };
    } else {
      return { data: null, error: 'Approval workflow not found' };
    }
  } catch (error: any) {
    console.error('Error getting approval workflow:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 承認ワークフローリストを取得
 */
export const getApprovalWorkflows = async (filters?: {
  workHoursId?: string;
  requestedBy?: string;
  status?: WorkHoursApprovalWorkflow['finalStatus'];
  assignedTo?: string;
  limit?: number;
}): Promise<{ data: WorkHoursApprovalWorkflow[]; error: string | null }> => {
  try {
    let q = collection(db, 'workHoursWorkflows');
    const constraints = [];

    if (filters?.workHoursId) {
      constraints.push(where('workHoursId', '==', filters.workHoursId));
    }
    if (filters?.requestedBy) {
      constraints.push(where('requestedBy', '==', filters.requestedBy));
    }
    if (filters?.status) {
      constraints.push(where('finalStatus', '==', filters.status));
    }

    constraints.push(orderBy('requestedAt', 'desc'));

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    const data = querySnapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        requestedAt: docData.requestedAt?.toDate()?.toISOString() || '',
        completedAt: docData.completedAt?.toDate()?.toISOString() || null,
        approvalSteps: docData.approvalSteps?.map((step: any) => ({
          ...step,
          processedAt: step.processedAt?.toDate()?.toISOString() || null
        })) || []
      } as WorkHoursApprovalWorkflow;
    });

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting approval workflows:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 承認ステップを処理
 */
export const processApprovalStep = async (
  workflowId: string,
  stepId: string,
  decision: 'approved' | 'rejected',
  comments?: string,
  processedBy?: string
): Promise<{ error: string | null }> => {
  try {
    const { data: workflow } = await getApprovalWorkflow(workflowId);
    if (!workflow) {
      return { error: 'Approval workflow not found' };
    }

    // 現在のステップを確認
    const currentStep = workflow.approvalSteps[workflow.currentStep];
    if (!currentStep || currentStep.stepId !== stepId) {
      return { error: 'Invalid approval step' };
    }

    if (currentStep.status !== 'pending') {
      return { error: 'Approval step has already been processed' };
    }

    const batch = writeBatch(db);
    const workflowRef = doc(db, 'workHoursWorkflows', workflowId);

    // ステップを更新
    const updatedSteps = workflow.approvalSteps.map((step, index) => {
      if (index === workflow.currentStep) {
        return {
          ...step,
          status: decision,
          processedAt: new Date().toISOString(),
          comments: comments || '',
          processedBy: processedBy || 'unknown'
        };
      }
      return step;
    });

    let finalStatus: WorkHoursApprovalWorkflow['finalStatus'] = 'pending';
    let nextStep = workflow.currentStep;
    let completedAt: string | null = null;

    if (decision === 'rejected') {
      // 拒否された場合、ワークフロー全体を拒否
      finalStatus = 'rejected';
      completedAt = new Date().toISOString();
    } else if (decision === 'approved') {
      // 承認された場合、次のステップに進む
      nextStep = workflow.currentStep + 1;
      
      if (nextStep >= workflow.approvalSteps.length) {
        // 全てのステップが完了
        finalStatus = 'approved';
        completedAt = new Date().toISOString();
        
        // 工数レコードのロックを解除（実際の実装では工数レコードも更新）
        await unlockWorkHours(workflow.workHoursId);
      }
    }

    // ワークフローを更新
    batch.update(workflowRef, {
      approvalSteps: updatedSteps,
      currentStep: nextStep,
      finalStatus,
      completedAt: completedAt ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Error processing approval step:', error);
    return { error: error.message };
  }
};

/**
 * 承認ワークフローをキャンセル
 */
export const cancelApprovalWorkflow = async (
  workflowId: string,
  reason: string,
  cancelledBy: string
): Promise<{ error: string | null }> => {
  try {
    const workflowRef = doc(db, 'workHoursWorkflows', workflowId);
    
    await updateDoc(workflowRef, {
      finalStatus: 'rejected',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        cancellationReason: reason,
        cancelledBy,
        cancelledAt: new Date().toISOString()
      }
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error cancelling approval workflow:', error);
    return { error: error.message };
  }
};

// =============================================================================
// WORK HOURS ADJUSTMENT OPERATIONS
// =============================================================================

/**
 * 工数調整を作成
 */
export const createWorkHoursAdjustment = async (
  adjustmentData: Omit<WorkHoursAdjustment, 'id' | 'requestedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, 'workHoursAdjustments'), {
      ...adjustmentData,
      requestedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating work hours adjustment:', error);
    return { id: null, error: error.message };
  }
};

/**
 * 工数調整を取得
 */
export const getWorkHoursAdjustment = async (
  adjustmentId: string
): Promise<{ data: WorkHoursAdjustment | null; error: string | null }> => {
  try {
    const docRef = doc(db, 'workHoursAdjustments', adjustmentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data,
          requestedAt: data.requestedAt?.toDate()?.toISOString() || '',
          approvedAt: data.approvedAt?.toDate()?.toISOString() || null
        } as WorkHoursAdjustment,
        error: null
      };
    } else {
      return { data: null, error: 'Work hours adjustment not found' };
    }
  } catch (error: any) {
    console.error('Error getting work hours adjustment:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 工数調整を承認
 */
export const approveWorkHoursAdjustment = async (
  adjustmentId: string,
  approvedBy: string,
  comments?: string
): Promise<{ error: string | null }> => {
  try {
    const { data: adjustment } = await getWorkHoursAdjustment(adjustmentId);
    if (!adjustment) {
      return { error: 'Work hours adjustment not found' };
    }

    if (adjustment.status !== 'pending') {
      return { error: 'Adjustment has already been processed' };
    }

    const batch = writeBatch(db);
    
    // 調整を承認
    const adjustmentRef = doc(db, 'workHoursAdjustments', adjustmentId);
    batch.update(adjustmentRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp(),
      comments: comments || ''
    });

    // 工数レコードを更新
    const { updateWorkHours } = await import('./workHours');
    const updateData: any = {};
    
    if (adjustment.fieldType === 'planned') {
      updateData[`plannedHours.${adjustment.category}`] = adjustment.newValue;
      updateData['plannedHours.total'] = await calculateTotalHours(adjustment.workHoursId, 'planned', adjustment.category, adjustment.newValue);
    } else if (adjustment.fieldType === 'actual') {
      updateData[`actualHours.${adjustment.category}`] = adjustment.newValue;
      updateData['actualHours.total'] = await calculateTotalHours(adjustment.workHoursId, 'actual', adjustment.category, adjustment.newValue);
    }

    await updateWorkHours(
      adjustment.workHoursId,
      updateData,
      {
        triggeredBy: approvedBy,
        source: 'approval-workflow',
        reason: `Adjustment approved: ${adjustment.reason}`
      }
    );

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Error approving work hours adjustment:', error);
    return { error: error.message };
  }
};

/**
 * 工数調整を拒否
 */
export const rejectWorkHoursAdjustment = async (
  adjustmentId: string,
  rejectedBy: string,
  comments?: string
): Promise<{ error: string | null }> => {
  try {
    const adjustmentRef = doc(db, 'workHoursAdjustments', adjustmentId);
    
    await updateDoc(adjustmentRef, {
      status: 'rejected',
      approvedBy: rejectedBy,
      approvedAt: serverTimestamp(),
      comments: comments || ''
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error rejecting work hours adjustment:', error);
    return { error: error.message };
  }
};

// =============================================================================
// WORKFLOW AUTOMATION
// =============================================================================

/**
 * 工数変更時の自動承認ワークフロー開始
 */
export const initiateApprovalWorkflow = async (
  workHoursId: string,
  requestType: WorkHoursApprovalWorkflow['requestType'],
  requestedBy: string,
  changes: any,
  businessJustification?: string
): Promise<{ workflowId: string | null; error: string | null }> => {
  try {
    // システム設定を取得
    const config = await getSystemConfig();
    
    // 承認が必要かどうかを判定
    const requiresApproval = shouldRequireApproval(changes, config);
    
    if (!requiresApproval) {
      return { workflowId: null, error: null }; // 承認不要
    }

    // 承認ステップを定義
    const approvalSteps = await defineApprovalSteps(workHoursId, requestType, changes);

    // ワークフローを作成
    const workflowData: Omit<WorkHoursApprovalWorkflow, 'id' | 'completedAt'> = {
      workHoursId,
      requestType,
      requestedBy,
      requestedAt: new Date().toISOString(),
      approvalSteps,
      currentStep: 0,
      finalStatus: 'pending',
      metadata: {
        urgency: determineUrgency(changes),
        businessJustification: businessJustification || '',
        expectedImpact: calculateExpectedImpact(changes)
      }
    };

    const { id, error } = await createApprovalWorkflow(workflowData);

    if (error) {
      return { workflowId: null, error };
    }

    // 工数レコードをロック
    await lockWorkHours(workHoursId, requestedBy, id!);

    // 承認者に通知を送信（実装予定）
    await sendApprovalNotifications(id!, approvalSteps[0]);

    return { workflowId: id, error: null };
  } catch (error: any) {
    console.error('Error initiating approval workflow:', error);
    return { workflowId: null, error: error.message };
  }
};

/**
 * 承認が必要かどうかを判定
 */
const shouldRequireApproval = (changes: any, config: WorkHoursSystemConfig): boolean => {
  // 手動調整の場合は承認が必要
  if (config.requireApprovalForManualAdjustments) {
    return true;
  }

  // 閾値を超える変更の場合は承認が必要
  if (config.requireApprovalThreshold > 0) {
    const totalHourChange = Math.abs(
      (changes.plannedHours?.total || 0) + (changes.actualHours?.total || 0)
    );
    
    if (totalHourChange > config.requireApprovalThreshold) {
      return true;
    }
  }

  return false;
};

/**
 * 承認ステップを定義
 */
const defineApprovalSteps = async (
  workHoursId: string,
  requestType: WorkHoursApprovalWorkflow['requestType'],
  changes: any
): Promise<WorkHoursApprovalWorkflow['approvalSteps']> => {
  // 実際の実装では、組織構造やルールに基づいて承認者を決定
  const steps: WorkHoursApprovalWorkflow['approvalSteps'] = [];

  // プロジェクトマネージャーによる承認
  steps.push({
    stepId: 'pm-approval',
    stepName: 'プロジェクトマネージャー承認',
    assignedTo: 'project-manager', // 実際の実装ではユーザーIDを使用
    status: 'pending'
  });

  // 大きな変更の場合は部長承認も必要
  const isSignificantChange = Math.abs((changes.plannedHours?.total || 0) + (changes.actualHours?.total || 0)) > 20;
  
  if (isSignificantChange || requestType === 'completion') {
    steps.push({
      stepId: 'manager-approval',
      stepName: '部長承認',
      assignedTo: 'department-manager',
      status: 'pending'
    });
  }

  return steps;
};

/**
 * 緊急度を判定
 */
const determineUrgency = (changes: any): 'low' | 'medium' | 'high' => {
  const totalChange = Math.abs(
    (changes.plannedHours?.total || 0) + (changes.actualHours?.total || 0)
  );

  if (totalChange > 50) return 'high';
  if (totalChange > 20) return 'medium';
  return 'low';
};

/**
 * 期待される影響を計算
 */
const calculateExpectedImpact = (changes: any): string => {
  const impacts = [];
  
  if (changes.plannedHours) {
    impacts.push('計画工数の変更');
  }
  
  if (changes.actualHours) {
    impacts.push('実績工数の変更');
  }
  
  if (changes.budget) {
    impacts.push('予算への影響');
  }

  return impacts.join(', ');
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 工数レコードをロック
 */
const lockWorkHours = async (workHoursId: string, lockedBy: string, workflowId: string): Promise<void> => {
  const { updateWorkHours } = await import('./workHours');
  await updateWorkHours(
    workHoursId,
    {
      locked: true,
      lockedBy,
      lockedAt: new Date().toISOString()
    } as Partial<EnhancedWorkHours>,
    {
      triggeredBy: 'system',
      source: 'approval-workflow',
      reason: `Locked for approval workflow: ${workflowId}`
    }
  );
};

/**
 * 工数レコードのロックを解除
 */
const unlockWorkHours = async (workHoursId: string): Promise<void> => {
  const { updateWorkHours } = await import('./workHours');
  await updateWorkHours(
    workHoursId,
    {
      locked: false,
      lockedBy: null,
      lockedAt: null
    } as Partial<EnhancedWorkHours>,
    {
      triggeredBy: 'system',
      source: 'approval-workflow',
      reason: 'Unlocked after approval workflow completion'
    }
  );
};

/**
 * システム設定を取得
 */
const getSystemConfig = async (): Promise<WorkHoursSystemConfig> => {
  try {
    const configDoc = await getDoc(doc(db, 'workHoursConfig', 'system'));
    
    if (configDoc.exists()) {
      return configDoc.data() as WorkHoursSystemConfig;
    }
    
    // デフォルト設定
    return {
      id: 'system',
      autoSyncFromDailyReports: true,
      requireApprovalForManualAdjustments: true,
      requireApprovalThreshold: 10,
      defaultRates: {
        setupRate: 3000,
        machiningRate: 4000,
        finishingRate: 3500
      },
      alertThresholds: {
        efficiencyWarning: 120,
        costOverrunWarning: 110
      },
      notifications: {
        dailyReportSync: true,
        budgetOverrun: true,
        efficiencyIssues: true
      }
    };
  } catch (error) {
    console.error('Error getting system config:', error);
    throw error;
  }
};

/**
 * 合計時間を計算
 */
const calculateTotalHours = async (
  workHoursId: string, 
  type: 'planned' | 'actual', 
  category: string, 
  newValue: number
): Promise<number> => {
  try {
    const { getWorkHours } = await import('./workHours');
    const { data: workHours } = await getWorkHours(workHoursId);
    
    if (!workHours) {
      return newValue;
    }

    const hours = type === 'planned' ? workHours.plannedHours : workHours.actualHours;
    const updated = { ...hours, [category]: newValue };
    
    return updated.setup + updated.machining + updated.finishing;
  } catch (error) {
    console.error('Error calculating total hours:', error);
    return newValue;
  }
};

/**
 * 承認者に通知を送信
 */
const sendApprovalNotifications = async (
  workflowId: string, 
  approvalStep: WorkHoursApprovalWorkflow['approvalSteps'][0]
): Promise<void> => {
  // 実際の実装では、メール通知やシステム内通知を送信
  console.log(`Sending approval notification for workflow ${workflowId} to ${approvalStep.assignedTo}`);
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * 承認ワークフローの変更をリアルタイムで監視
 */
export const subscribeToApprovalWorkflows = (
  filters: Parameters<typeof getApprovalWorkflows>[0],
  callback: (data: WorkHoursApprovalWorkflow[]) => void
): (() => void) => {
  let q = collection(db, 'workHoursWorkflows');
  const constraints = [];

  if (filters?.workHoursId) {
    constraints.push(where('workHoursId', '==', filters.workHoursId));
  }
  if (filters?.requestedBy) {
    constraints.push(where('requestedBy', '==', filters.requestedBy));
  }
  if (filters?.status) {
    constraints.push(where('finalStatus', '==', filters.status));
  }

  constraints.push(orderBy('requestedAt', 'desc'));

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        requestedAt: docData.requestedAt?.toDate()?.toISOString() || '',
        completedAt: docData.completedAt?.toDate()?.toISOString() || null,
        approvalSteps: docData.approvalSteps?.map((step: any) => ({
          ...step,
          processedAt: step.processedAt?.toDate()?.toISOString() || null
        })) || []
      } as WorkHoursApprovalWorkflow;
    });

    callback(data);
  }, (error) => {
    console.error('Error in approval workflows subscription:', error);
    callback([]);
  });
};

export {
  // Types for external use
  type WorkHoursApprovalWorkflow,
  type WorkHoursAdjustment,
  type WorkHoursSystemConfig
};