// バリデーションユーティリティ - 強化版
import { 
  OrderItem, 
  Process, 
  WorkHours, 
  DailyReportEntry, 
  AppUser,
  ProcessStatus,
  Priority,
  UserRole 
} from '@/types';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  // 後方互換性のため
  errors_legacy?: string[];
}

// 基本的な数値バリデーション
export const validatePositiveNumber = (value: number | undefined, fieldName: string): string | null => {
  if (value === undefined || value === null) {
    return null; // 必須でない場合はOK
  }
  if (value <= 0) {
    return `${fieldName}は1以上の数値を入力してください`;
  }
  return null;
};

// 必須項目のバリデーション
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName}は必須項目です`;
  }
  return null;
};

// 日付の論理チェック
export const validateDateRange = (startDate: string, endDate: string, startLabel: string = '開始日', endLabel: string = '終了日'): string | null => {
  if (!startDate || !endDate) {
    return null; // 日付が未設定の場合はスキップ
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    return `${endLabel}は${startLabel}より後の日付を設定してください`;
  }
  
  return null;
};

// 強化されたバリデーション関数
export const validateEmail = (email: string): ValidationError | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: '有効なメールアドレス形式で入力してください',
      code: 'INVALID_EMAIL'
    };
  }
  return null;
};

export const validateManagementNumber = (managementNumber: string): ValidationError | null => {
  const pattern = /^[A-Z]{2,4}-\d{4}-\d{3}$/;
  if (!pattern.test(managementNumber)) {
    return {
      field: 'managementNumber',
      message: '管理番号は「ORD-2024-001」形式で入力してください',
      code: 'INVALID_MANAGEMENT_NUMBER'
    };
  }
  return null;
};

// 受注データのバリデーション（強化版）
export const validateOrderData = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const legacyErrors: string[] = [];
  
  // 必須フィールド
  if (!data.client?.trim()) {
    const error = { field: 'client', message: '取引先は必須です', code: 'REQUIRED' };
    errors.push(error);
    legacyErrors.push(error.message);
  }
  
  if (data.managementNumber && data.managementNumber.trim()) {
    const managementError = validateManagementNumber(data.managementNumber);
    if (managementError) {
      errors.push(managementError);
      legacyErrors.push(managementError.message);
    }
  }
  
  // 数量チェック（既存のロジック維持）
  const quantityError = validatePositiveNumber(data.quantity, '数量');
  if (quantityError) {
    const error = { field: 'quantity', message: quantityError, code: 'INVALID_NUMBER' };
    errors.push(error);
    legacyErrors.push(quantityError);
  }
  
  // 日付チェック（既存のロジック維持）
  const dateError = validateDateRange(data.orderDate, data.deliveryDate, '受注日', '納期');
  if (dateError) {
    const error = { field: 'deliveryDate', message: dateError, code: 'INVALID_DATE_RANGE' };
    errors.push(error);
    legacyErrors.push(dateError);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    errors_legacy: legacyErrors
  };
};

// 工程データのバリデーション
export const validateProcessData = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // 最低限のバリデーション
  const quantityError = validatePositiveNumber(data.quantity, '数量');
  if (quantityError) errors.push(quantityError);
  
  // 工数の妥当性チェック（オプション）
  if (data.workDetails) {
    const totalHours = (data.workDetails.setup || 0) + 
                      (data.workDetails.machining || 0) + 
                      (data.workDetails.finishing || 0);
    if (totalHours > 999) {
      errors.push('合計工数が大きすぎます（999時間以下にしてください）');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 日報データのバリデーション
export const validateDailyReportData = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // 作業時間の妥当性チェック
  const workEntries = data.workTimeEntries || [];
  for (const entry of workEntries) {
    if (entry.startTime && entry.endTime) {
      const start = new Date(`2000-01-01 ${entry.startTime}`);
      const end = new Date(`2000-01-01 ${entry.endTime}`);
      if (end < start) {
        errors.push('終了時刻は開始時刻より後にしてください');
      }
    }
    
    const hoursError = validatePositiveNumber(entry.hours, '作業時間');
    if (hoursError && entry.hours !== 0) errors.push(hoursError);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};