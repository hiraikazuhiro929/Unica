// =============================================================================
// UNICA製造業務管理システム - 統一型定義
// =============================================================================

// =============================================================================
// 基本型・共通型
// =============================================================================

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

export type Status = 'active' | 'inactive' | 'deleted';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ProcessStatus = 'planning' | 'data-work' | 'processing' | 'finishing' | 'completed' | 'delayed';

// =============================================================================
// ユーザー・認証関連
// =============================================================================

export type UserRole = 'worker' | 'leader' | 'manager' | 'admin';
export type AuthProvider = 'email' | 'google' | 'microsoft';

export interface AppUser extends BaseEntity {
  uid: string;
  email: string;
  name: string;
  displayName?: string; // 表示名（nameのエイリアス）
  role: UserRole;
  department: string;
  employeeId?: string;
  companyId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  profileImage?: string;
  avatar?: string; // profileImageのエイリアス
  phoneNumber?: string;
  skills: string[];
  hourlyRate?: number;
  permissions: {
    canViewAllProjects: boolean;
    canEditProjects: boolean;
    canDeleteProjects: boolean;
    canManageUsers: boolean;
    canAccessReports: boolean;
    canApproveWorkHours: boolean;
    canConfirmReports?: boolean;
    canReplyToReports?: boolean;
    canViewAllReports?: boolean;
    canEditReports?: boolean;
    canDeleteReports?: boolean;
    canViewAnalytics?: boolean;
    canExportData?: boolean;
  };
  workingHours?: {
    start: string;
    end: string;
    daysOfWeek: number[];
  };
  lastLogin?: any;
}

// =============================================================================
// 会社・組織
// =============================================================================

export interface Company extends BaseEntity {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  departments: Department[];
  isActive: boolean;
}

export interface Department extends BaseEntity {
  name: string;
  companyId: string;
  managerId?: string;
  description?: string;
  isActive: boolean;
}

// =============================================================================
// 受注管理
// =============================================================================

export interface OrderItem extends BaseEntity {
  managementNumber: string;
  projectName: string;
  client: string;
  quantity: number;
  unit: string;
  orderDate: string;
  deliveryDate: string;
  description?: string;
  estimatedAmount?: number;
  status: ProcessStatus;
  priority: Priority;
  progress: number;
  tags: string[];
  attachments: string[];
  assignedTo?: string;
  departmentId?: string;
}

// =============================================================================
// 工程管理
// =============================================================================

export interface WorkStep extends BaseEntity {
  name: string;
  nameJapanese: string;
  order: number;
  estimatedHours: number;
  actualHours: number;
  isCompleted: boolean;
  isOptional: boolean;
  description?: string;
  requiredSkills: string[];
  machineRequired?: string;
  assignedTo?: string;
  dependencies: string[]; // 依存する工程のID
}

export interface ProcessTemplate extends BaseEntity {
  name: string;
  description: string;
  category: 'machining' | 'assembly' | 'finishing' | 'quality-check' | 'other';
  defaultSteps: Omit<WorkStep, 'id' | 'actualHours' | 'isCompleted' | keyof TimestampedEntity>[];
  estimatedTotalHours: number;
  isActive: boolean;
  departmentId?: string;
}

export interface ProcessDetails {
  // 従来の固定構造（後方互換性）
  setup: number;
  machining: number;
  finishing: number;
  additionalSetup?: number;
  additionalMachining?: number;
  additionalFinishing?: number;
  
  // 動的工程
  customSteps: WorkStep[];
  templateId?: string;
  useDynamicSteps: boolean;
  totalEstimatedHours: number;
  totalActualHours: number;
  overallProgress: number;
}

export interface Process extends BaseEntity {
  orderId?: string;
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
  workDetails: ProcessDetails;
  
  // 日程管理
  orderDate: string;
  arrivalDate: string;
  shipmentDate: string;
  dataWorkDate: string;
  dataCompleteDate?: string;
  processingPlanDate: string;
  processingEndDate?: string;
  dueDate?: string;
  
  status: ProcessStatus;
  priority: Priority;
  remarks: string;
  tags: string[];
  attachments: string[];
  departmentId?: string;
  companyId?: string;
}

// =============================================================================
// 工数管理
// =============================================================================

export interface WorkHoursData {
  setup: number;
  machining: number;
  finishing: number;
  total: number;
}

export interface BudgetData {
  estimatedAmount: number;
  setupRate: number;
  machiningRate: number;
  finishingRate: number;
  totalPlannedCost: number;
  totalActualCost: number;
  currencyCode: string;
}

export interface WorkHours extends BaseEntity {
  orderId: string;
  processId: string;
  projectName: string;
  client: string;
  managementNumber: string;
  
  // 工数情報
  plannedHours: WorkHoursData;
  actualHours: WorkHoursData;
  
  // 予算情報
  budget: BudgetData;
  
  // 進捗・ステータス
  status: 'planning' | 'in-progress' | 'completed' | 'delayed';
  progress: number;
  
  // メタデータ
  version: number;
  lastSyncedAt?: string;
  syncSource?: 'daily-report' | 'manual' | 'system';
  locked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  
  // 品質メトリクス
  qualityMetrics?: {
    reworkHours: number;
    defectCount: number;
    qualityScore: number;
  };
}

// =============================================================================
// 日報管理
// =============================================================================

export interface WorkContentType extends BaseEntity {
  name: string;
  nameJapanese: string;
  isActive: boolean;
  order: number;
  category: 'production' | 'maintenance' | 'preparation' | 'other';
  hourlyRate?: number;
}

export interface WorkTimeEntry {
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  durationMinutes: number;
  
  // 作業内容
  productionNumber: string;
  workContentId: string;
  workContentName: string;
  
  // 機械・設備
  machineId?: string;
  machineName?: string;
  operationType?: 'manual' | 'auto';
  
  // 工程連携
  processId?: string;
  processName?: string;
  workStepId?: string;
  workStepName?: string;
  managementNumber?: string;
  projectName?: string;
  
  // 進捗・コスト
  progress?: number;
  humanCost?: number;
  machineCost?: number;
  
  // 同期情報
  isSyncedToProcess: boolean;
  syncedAt?: string;
  syncErrors?: string[];
}

export interface DailyReportEntry extends BaseEntity {
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD format
  
  // 基本情報
  dreams: string;
  todaysGoals: string;
  
  // 作業時間
  workTimeEntries: WorkTimeEntry[];
  totalWorkMinutes: number;
  
  // 振り返り
  todaysResults: string;
  whatWentWell: string;
  whatDidntGoWell: string;
  requestsToManagement: string;
  
  // 承認フロー
  isSubmitted: boolean;
  submittedAt?: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  // 返信機能
  adminReply?: {
    content: string;
    repliedBy: string;
    repliedAt: string;
    isRead: boolean;
  };
  
  // メタデータ
  departmentId?: string;
  tags: string[];
}

// =============================================================================
// 機械・設備管理
// =============================================================================

export interface Machine extends BaseEntity {
  name: string;
  type: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyDate?: string;
  
  // 稼働情報
  status: 'available' | 'busy' | 'maintenance' | 'broken';
  hourlyRate: number;
  utilizationRate?: number;
  
  // 技術仕様
  specifications: Record<string, any>;
  capabilities: string[];
  requiredSkills: string[];
  
  // 保守情報
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceIntervalDays: number;
  
  departmentId?: string;
  location?: string;
  responsiblePersonId?: string;
}

// =============================================================================
// 在庫管理
// =============================================================================

export interface InventoryItem extends BaseEntity {
  name: string;
  description?: string;
  category: string;
  sku: string; // 商品コード
  barcode?: string;
  qrCode?: string;
  
  // 在庫情報
  quantity: number;
  unit: string;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  
  // 価格情報
  unitCost: number;
  sellingPrice?: number;
  supplierInfo: {
    supplierId: string;
    supplierName: string;
    supplierPartNumber?: string;
    leadTimeDays: number;
  }[];
  
  // 保管情報
  location: string;
  storageRequirements?: string;
  expirationDate?: string;
  batchNumber?: string;
  
  // 品質管理
  qualityStatus: 'good' | 'warning' | 'expired' | 'damaged';
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  
  departmentId?: string;
  isActive: boolean;
  tags: string[];
}

// =============================================================================
// パートナー・取引先管理
// =============================================================================

export interface Partner extends BaseEntity {
  name: string;
  type: 'supplier' | 'customer' | 'subcontractor' | 'other';
  
  // 基本情報
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  
  // 取引情報
  paymentTerms?: string;
  creditLimit?: number;
  preferredCurrency?: string;
  taxId?: string;
  
  // 担当者情報
  contacts: {
    id: string;
    name: string;
    position: string;
    phoneNumber?: string;
    email?: string;
    isPrimary: boolean;
  }[];
  
  // 評価・履歴
  rating?: number; // 1-5
  totalTransactions?: number;
  lastTransactionDate?: string;
  
  status: Status;
  tags: string[];
  notes?: string;
}

// =============================================================================
// 品質管理・不具合報告
// =============================================================================

export interface DefectReport extends BaseEntity {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'material' | 'process' | 'equipment' | 'human-error' | 'other';
  
  // 関連情報
  processId?: string;
  orderId?: string;
  machineId?: string;
  workerId?: string;
  productionNumber?: string;
  
  // 詳細情報
  discoveredDate: string;
  discoveredBy: string;
  location?: string;
  quantity?: number;
  
  // 対応状況
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
  
  // 対策・改善
  rootCause?: string;
  correctiveActions: string[];
  preventiveActions: string[];
  
  // 承認・確認
  verifiedBy?: string;
  verifiedAt?: string;
  closedBy?: string;
  closedAt?: string;
  
  attachments: string[];
  tags: string[];
  departmentId?: string;
}

// =============================================================================
// メモ・ノート管理
// =============================================================================

export interface Note extends BaseEntity {
  title: string;
  content: string;
  type: 'text' | 'checklist' | 'image' | 'mixed';
  
  // 分類・整理
  category: string;
  tags: string[];
  color: string; // カラーコード
  isPinned: boolean;
  
  // 画像・添付ファイル
  images: {
    id: string;
    url: string;
    filename: string;
    size: number;
    uploadedAt: string;
  }[];
  attachments: {
    id: string;
    url: string;
    filename: string;
    size: number;
    type: string;
    uploadedAt: string;
  }[];
  
  // チェックリスト（type=checklistの場合）
  checklistItems?: {
    id: string;
    text: string;
    isCompleted: boolean;
    order: number;
  }[];
  
  // アクセス制御
  isPublic: boolean;
  sharedWith: string[]; // ユーザーIDの配列
  
  // メタデータ
  userId: string;
  departmentId?: string;
  relatedIds: string[]; // 関連するプロジェクト、工程等のID
}

// =============================================================================
// カレンダー・スケジュール管理
// =============================================================================

export interface CalendarEvent extends BaseEntity {
  title: string;
  description?: string;
  
  // 日時情報
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  timeZone?: string;
  
  // 分類
  type: 'meeting' | 'deadline' | 'maintenance' | 'training' | 'other';
  category: string;
  priority: Priority;
  
  // 参加者
  organizer: string;
  attendees: {
    userId: string;
    userName: string;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';
    isOptional: boolean;
  }[];
  
  // 場所・リソース
  location?: string;
  resourceIds: string[]; // 機械、会議室等のID
  
  // 関連情報
  relatedIds: string[]; // プロジェクト、工程等のID
  
  // 繰り返し設定
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    exceptions: string[]; // 除外日
  };
  
  // Google Calendar連携
  googleEventId?: string;
  syncedAt?: string;
  syncErrors?: string[];
  
  // 通知設定
  reminders: {
    method: 'popup' | 'email';
    minutesBefore: number;
  }[];
  
  userId: string;
  departmentId?: string;
  isPublic: boolean;
  tags: string[];
}

// =============================================================================
// システム設定・構成
// =============================================================================

export interface SystemConfig extends BaseEntity {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  category: 'general' | 'security' | 'ui' | 'integration' | 'notification';
  description?: string;
  isEditable: boolean;
  requiresRestart?: boolean;
}

// =============================================================================
// 統計・分析データ
// =============================================================================

export interface Statistics {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string;
  category: 'orders' | 'processes' | 'work-hours' | 'quality' | 'finance';
  data: Record<string, any>;
  generatedAt: string;
  generatedBy?: string;
}

// =============================================================================
// API レスポンス型
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  message?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  };
}

// =============================================================================
// フィルタ・検索・ソート
// =============================================================================

export interface FilterOptions {
  status?: string[];
  priority?: Priority[];
  dateRange?: {
    start: string;
    end: string;
  };
  assignee?: string[];
  department?: string[];
  tags?: string[];
  searchQuery?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface QueryOptions {
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

// =============================================================================
// フォーム・バリデーション
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
}

// =============================================================================
// 通知・アラート
// =============================================================================

export interface Notification extends BaseEntity {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: Priority;
  
  // 宛先
  userId?: string; // 特定ユーザー宛
  departmentId?: string; // 部署宛
  role?: UserRole; // 役職宛
  isGlobal: boolean; // 全体宛
  
  // 関連情報
  relatedType?: 'order' | 'process' | 'work-hours' | 'defect' | 'other';
  relatedId?: string;
  
  // ステータス
  isRead: boolean;
  readAt?: string;
  
  // 設定
  canDismiss: boolean;
  autoExpire: boolean;
  expiresAt?: string;
  
  // 配信
  channels: ('web' | 'email' | 'sms')[];
  sentAt?: string;
  deliveryStatus?: Record<string, 'pending' | 'sent' | 'failed'>;
}

// =============================================================================
// エクスポート・バックアップ
// =============================================================================

export interface ExportRequest extends BaseEntity {
  type: 'csv' | 'xlsx' | 'pdf' | 'json';
  entity: 'orders' | 'processes' | 'work-hours' | 'daily-reports' | 'all';
  filters?: FilterOptions;
  options: {
    includeHeaders: boolean;
    dateFormat?: string;
    timezone?: string;
    fields?: string[];
  };
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: string;
  
  requestedBy: string;
  error?: string;
}

export interface BackupInfo extends BaseEntity {
  type: 'full' | 'incremental';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  size?: number;
  location?: string;
  checksum?: string;
  retentionDate?: string;
  error?: string;
}