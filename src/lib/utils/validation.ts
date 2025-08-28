// バリデーションユーティリティ
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
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

// 受注データのバリデーション
export const validateOrderData = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // 最低限のバリデーション
  const requiredError = validateRequired(data.client, '取引先');
  if (requiredError) errors.push(requiredError);
  
  const quantityError = validatePositiveNumber(data.quantity, '数量');
  if (quantityError) errors.push(quantityError);
  
  const dateError = validateDateRange(data.orderDate, data.deliveryDate, '受注日', '納期');
  if (dateError) errors.push(dateError);
  
  return {
    isValid: errors.length === 0,
    errors
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