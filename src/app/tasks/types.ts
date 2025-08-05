// ===== 型定義 =====

// 動的な作業工程の定義
export interface WorkStep {
  id: string;
  name: string;
  nameJapanese: string;
  order: number;
  estimatedHours: number;
  actualHours: number;
  isCompleted: boolean;
  description?: string;
  requiredSkills?: string[];
  machineRequired?: string;
  isOptional: boolean;
}

// 工程テンプレート（作業手順のプリセット）
export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // "machining", "assembly", "finishing", etc.
  defaultSteps: Omit<WorkStep, 'id' | 'actualHours' | 'isCompleted'>[];
  estimatedTotalHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 拡張されたWorkDetails（後方互換性を保持）
export interface WorkDetails {
  // 従来の固定的な構造（後方互換性のため）
  setup: number;
  machining: number;
  finishing: number;
  additionalSetup?: number;
  additionalMachining?: number;
  additionalFinishing?: number;
  
  // 新しい動的な作業手順
  customSteps?: WorkStep[];
  templateId?: string; // 使用したテンプレートのID
  useDynamicSteps: boolean; // 動的手順を使用するかどうか
  totalEstimatedHours: number;
  totalActualHours: number;
}

export interface Process {
  id: string;
  orderId?: string; // 受注案件との紐付け（新規追加）
  orderClient: string;
  lineNumber: string;
  projectName: string;
  managementNumber: string;
  progress: number;
  quantity: number;
  salesPerson: string;
  assignee: string;
  fieldPerson: string;
  assignedMachines: string[];
  workDetails: WorkDetails;
  orderDate: string;
  arrivalDate: string;
  shipmentDate: string;
  dataWorkDate: string;
  dataCompleteDate?: string;
  processingPlanDate: string;
  processingEndDate?: string;
  remarks: string;
  status:
    | "planning"
    | "data-work"
    | "processing"
    | "finishing"
    | "completed"
    | "delayed";
  priority: "high" | "medium" | "low";
  dueDate?: string;
  rowNumber?: number;
}

export interface Company {
  id: string;
  name: string;
  processes: Process[];
  isExpanded: boolean;
}

// ===== 工数管理用の型定義（新規追加） =====

export interface PlannedHours {
  setup: number;
  machining: number;
  finishing: number;
  total: number;
}

export interface ActualHours {
  setup: number;
  machining: number;
  finishing: number;
  total: number;
}

export interface Budget {
  estimatedAmount: number; // 見積金額
  setupRate: number; // 段取り時間単価
  machiningRate: number; // 機械加工時間単価
  finishingRate: number; // 仕上げ時間単価
  totalPlannedCost: number; // 予定原価
  totalActualCost: number; // 実績原価
}

export interface WorkHours {
  id: string;
  orderId: string; // 受注案件ID
  processId: string; // 工程ID
  projectName: string;
  client: string;
  managementNumber: string;
  
  // 工数情報
  plannedHours: PlannedHours;
  actualHours: ActualHours;
  
  // 予算情報
  budget: Budget;
  
  // 進捗・ステータス
  status: "planning" | "in-progress" | "completed" | "delayed";
  createdAt: string;
  updatedAt: string;
}

// 作業者情報
export interface Worker {
  id: string;
  name: string;
  department: string;
  hourlyRate: number; // 時間単価
  skills: string[]; // 保有スキル
}

// 機械情報
export interface Machine {
  id: string;
  name: string;
  type: string;
  hourlyRate: number; // 機械稼働時間単価
  status: "available" | "busy" | "maintenance";
}

// 作業内容の種類
export interface WorkContentType {
  id: string;
  name: string;
  nameJapanese: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// 作業時間エントリ（日報内で使用）
export interface WorkTimeEntry {
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  productionNumber: string; // 製番
  workContentId: string; // 作業内容ID（WorkContentTypeから参照）
  workContentName: string; // 作業内容名（表示用）
  durationMinutes: number; // 自動計算される時間（分）
  
  // 機械関連
  machineId?: string; // 使用機械ID
  machineName?: string; // 使用機械名
  
  // 工程連携のための新フィールド
  processId?: string; // 関連する工程ID
  processName?: string; // 工程名（表示用）
  workStepId?: string; // 関連する作業手順ID
  workStepName?: string; // 作業手順名（表示用）
  managementNumber?: string; // 管理番号
  isSyncedToProcess: boolean; // 工程に同期済みかどうか
  syncedAt?: string; // 同期日時
}

// 工程別作業実績
export interface ProcessWorkTimeEntry {
  processId: string;
  workItems: {
    id: string;
    name: string;
    plannedHours: number;
    actualHours: number;
  }[];
  additionalWorkItems: {
    id: string;
    name: string;
    plannedHours: number;
    actualHours: number;
  }[];
  overallProgress: number;
}

// 日報エントリ（フィールドワーカー向け）
export interface DailyReportEntry {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD format
  
  // 基本情報
  dreams: string; // 夢や希望
  todaysGoals: string; // 今日の目標
  
  // 作業時間テーブル
  workTimeEntries: WorkTimeEntry[];
  processWorkTimeEntries?: ProcessWorkTimeEntry[]; // 工程別作業実績
  
  // 今日の振り返り
  todaysResults: string; // 今日の結果
  whatWentWell: string; // うまくいったこと・感謝
  whatDidntGoWell: string; // うまくいかなかったこと・反省
  requestsToManagement: string; // 社内への要望
  
  // システム管理用
  totalWorkMinutes: number; // 合計作業時間（分）
  isSubmitted: boolean; // 提出済みフラグ
  submittedAt?: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// 日報統計情報
export interface DailyReportStatistics {
  totalReports: number;
  averageWorkHours: number;
  completionRate: number;
  byWorkContent: {
    workContentId: string;
    workContentName: string;
    totalMinutes: number;
    reportCount: number;
  }[];
  byWorker: {
    workerId: string;
    workerName: string;
    totalReports: number;
    averageWorkHours: number;
  }[];
}

// 工数管理の統計情報
export interface WorkHoursStatistics {
  totalProjects: number;
  totalPlannedHours: number;
  totalActualHours: number;
  totalPlannedCost: number;
  totalActualCost: number;
  averageEfficiency: number; // 効率性（実績/予定）
  byStatus: {
    planning: number;
    inProgress: number;
    completed: number;
    delayed: number;
  };
  byWorker: {
    workerId: string;
    workerName: string;
    totalHours: number;
    efficiency: number;
  }[];
  byMachine: {
    machineId: string;
    machineName: string;
    utilizationRate: number;
    totalHours: number;
  }[];
}

// ===== 工数管理システム強化用型定義 =====

// 工数調整・承認フロー
export interface WorkHoursAdjustment {
  id: string;
  workHoursId: string;
  adjustmentType: "manual" | "daily-report-sync" | "correction";
  fieldType: "planned" | "actual";
  category: "setup" | "machining" | "finishing";
  oldValue: number;
  newValue: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: "pending" | "approved" | "rejected";
  comments?: string;
}

// 工数管理システムの設定
export interface WorkHoursSystemConfig {
  id: string;
  autoSyncFromDailyReports: boolean;
  requireApprovalForManualAdjustments: boolean;
  requireApprovalThreshold: number; // 時間（調整がこの値を超える場合承認が必要）
  defaultRates: {
    setupRate: number;
    machiningRate: number;
    finishingRate: number;
  };
  alertThresholds: {
    efficiencyWarning: number; // 効率性がこの値を下回ると警告
    costOverrunWarning: number; // コスト超過率がこの値を上回ると警告
  };
  notifications: {
    dailyReportSync: boolean;
    budgetOverrun: boolean;
    efficiencyIssues: boolean;
  };
}

// 工数追跡履歴
export interface WorkHoursHistory {
  id: string;
  workHoursId: string;
  timestamp: string;
  changeType: "created" | "updated" | "synced" | "approved" | "rejected";
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  triggeredBy: string; // userId or "system"
  source: "manual" | "daily-report" | "approval-workflow" | "system";
  metadata?: {
    dailyReportId?: string;
    adjustmentId?: string;
    approvalId?: string;
  };
}

// 予算管理強化
export interface EnhancedBudget extends Budget {
  currencyCode: string;
  lastUpdated: string;
  budgetVersion: number;
  approvedBy?: string;
  approvedAt?: string;
  revisions: BudgetRevision[];
  alerts: BudgetAlert[];
}

export interface BudgetRevision {
  id: string;
  version: number;
  revisedBy: string;
  revisedAt: string;
  reason: string;
  changes: {
    field: keyof Budget;
    oldValue: number;
    newValue: number;
    variance: number;
    variancePercentage: number;
  }[];
}

export interface BudgetAlert {
  id: string;
  type: "overrun" | "variance" | "threshold";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  threshold: number;
  currentValue: number;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// 工数分析用インターface
export interface WorkHoursAnalytics {
  projectId: string;
  timeframe: {
    startDate: string;
    endDate: string;
  };
  efficiency: {
    overall: number;
    byCategory: {
      setup: number;
      machining: number;
      finishing: number;
    };
    trend: {
      direction: "improving" | "declining" | "stable";
      percentage: number;
    };
  };
  utilization: {
    workers: {
      workerId: string;
      workerName: string;
      totalHours: number;
      utilization: number;
      productivity: number;
    }[];
    machines: {
      machineId: string;
      machineName: string;
      totalHours: number;
      utilization: number;
      efficiency: number;
    }[];
  };
  costs: {
    plannedVsActual: {
      planned: number;
      actual: number;
      variance: number;
      variancePercentage: number;
    };
    breakdown: {
      labor: number;
      machine: number;
      overhead: number;
      total: number;
    };
  };
  quality: {
    reworkHours: number;
    defectRate: number;
    qualityScore: number;
  };
  predictions: {
    estimatedCompletion: string;
    estimatedTotalCost: number;
    riskLevel: "low" | "medium" | "high";
    recommendations: string[];
  };
}

// 実績同期結果
export interface SyncResult {
  success: boolean;
  syncedEntries: number;
  updatedWorkHours: string[];
  errors: {
    type: string;
    message: string;
    data?: any;
  }[];
  warnings: {
    type: string;
    message: string;
    data?: any;
  }[];
  metadata: {
    syncedAt: string;
    syncSource: string;
    totalProcessingTime: number;
  };
}

// 強化されたWorkHours
export interface EnhancedWorkHours extends WorkHours {
  version: number;
  lastSyncedAt?: string;
  syncSource?: "daily-report" | "manual" | "system";
  locked: boolean; // 承認済みでロックされているかどうか
  lockedBy?: string;
  lockedAt?: string;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  qualityMetrics?: {
    reworkHours: number;
    defectCount: number;
    qualityScore: number;
  };
  integrations: {
    processId?: string;
    dailyReportIds: string[];
    adjustmentIds: string[];
  };
}

// 工数承認ワークフロー
export interface WorkHoursApprovalWorkflow {
  id: string;
  workHoursId: string;
  requestType: "creation" | "adjustment" | "completion";
  requestedBy: string;
  requestedAt: string;
  approvalSteps: {
    stepId: string;
    stepName: string;
    assignedTo: string;
    status: "pending" | "approved" | "rejected" | "skipped";
    processedAt?: string;
    comments?: string;
    metadata?: any;
  }[];
  currentStep: number;
  finalStatus: "pending" | "approved" | "rejected";
  completedAt?: string;
  metadata: {
    urgency: "low" | "medium" | "high";
    businessJustification?: string;
    expectedImpact?: string;
  };
}