import { WorkTimeEntry } from "@/app/tasks/types";

// チャージ計算の設定
export interface ChargeSettings {
  defaultHumanRate: number; // デフォルトの人件費単価（円/時間）
  defaultMachineRate: number; // デフォルトの機械費単価（円/時間）
}

// 計算結果の型
export interface ChargeCalculationResult {
  humanCost: number; // 人件費
  machineCost: number; // 機械費
  totalCost: number; // 合計費用
  details: string; // 計算詳細
}

// デフォルト設定
const DEFAULT_SETTINGS: ChargeSettings = {
  defaultHumanRate: 2500, // 人件費: 2,500円/時間
  defaultMachineRate: 3000, // 機械費: 3,000円/時間
};

/**
 * 作業エントリーのチャージを計算
 * @param entry 作業時間エントリー
 * @param humanRate 人件費単価（円/時間）
 * @param machineRate 機械費単価（円/時間）
 * @returns 計算結果
 */
export function calculateEntryCharge(
  entry: WorkTimeEntry,
  humanRate?: number,
  machineRate?: number
): ChargeCalculationResult {
  const hours = entry.durationMinutes / 60;
  const actualHumanRate = humanRate || DEFAULT_SETTINGS.defaultHumanRate;
  const actualMachineRate = machineRate || DEFAULT_SETTINGS.defaultMachineRate;
  
  let humanCost = 0;
  let machineCost = 0;
  let details = '';
  
  // 自動/手動による計算分岐
  if (entry.operationType === '自動') {
    // 自動運転時：人件費ゼロ、機械費のみ
    humanCost = 0;
    if (entry.machineId && entry.machineId !== 'none') {
      machineCost = hours * actualMachineRate;
      details = `自動運転: ${hours.toFixed(2)}時間 × ${actualMachineRate}円/時（機械費のみ）`;
    } else {
      details = `自動運転: 機械なし`;
    }
  } else {
    // 手動作業時：人件費＋機械費（機械使用時）
    humanCost = hours * actualHumanRate;
    if (entry.machineId && entry.machineId !== 'none') {
      machineCost = hours * actualMachineRate;
      details = `手動作業: ${hours.toFixed(2)}時間 × (${actualHumanRate}円/時 + ${actualMachineRate}円/時)`;
    } else {
      details = `手動作業: ${hours.toFixed(2)}時間 × ${actualHumanRate}円/時（人件費のみ）`;
    }
  }
  
  return {
    humanCost: Math.round(humanCost),
    machineCost: Math.round(machineCost),
    totalCost: Math.round(humanCost + machineCost),
    details
  };
}

/**
 * 複数エントリーの合計チャージを計算
 * @param entries 作業時間エントリーの配列
 * @param settings チャージ設定
 * @returns 合計計算結果
 */
export function calculateTotalCharge(
  entries: WorkTimeEntry[],
  settings?: Partial<ChargeSettings>
): {
  totalHumanCost: number;
  totalMachineCost: number;
  grandTotal: number;
  breakdown: Array<{
    entry: WorkTimeEntry;
    calculation: ChargeCalculationResult;
  }>;
  savings: number; // 自動化による削減額
} {
  const actualSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  let totalHumanCost = 0;
  let totalMachineCost = 0;
  let potentialHumanCost = 0; // 全て手動だった場合の人件費
  const breakdown: Array<{ entry: WorkTimeEntry; calculation: ChargeCalculationResult }> = [];
  
  for (const entry of entries) {
    const calculation = calculateEntryCharge(
      entry,
      actualSettings.defaultHumanRate,
      actualSettings.defaultMachineRate
    );
    
    totalHumanCost += calculation.humanCost;
    totalMachineCost += calculation.machineCost;
    
    // 全て手動だった場合の人件費を計算（削減効果算出用）
    const hours = entry.durationMinutes / 60;
    potentialHumanCost += hours * actualSettings.defaultHumanRate;
    
    breakdown.push({ entry, calculation });
  }
  
  // 自動化による削減額
  const savings = Math.round(potentialHumanCost - totalHumanCost);
  
  return {
    totalHumanCost: Math.round(totalHumanCost),
    totalMachineCost: Math.round(totalMachineCost),
    grandTotal: Math.round(totalHumanCost + totalMachineCost),
    breakdown,
    savings
  };
}

/**
 * 作業内容ごとのデフォルト設定を取得
 * @param workContentId 作業内容ID
 * @returns 作業内容に応じたチャージ設定
 */
export function getWorkContentSettings(workContentId: string): {
  includesHumanCost: boolean;
  includesMachineCost: boolean;
} {
  // 段取りや仕上げは基本的に機械を使わない
  const noMachineWorkTypes = ['setup', 'finishing', 'inspection', 'packing'];
  
  return {
    includesHumanCost: true, // 基本的に全ての作業で人件費は発生（自動時除く）
    includesMachineCost: !noMachineWorkTypes.includes(workContentId)
  };
}

/**
 * 時間の重複をチェックして警告
 * @param entries 作業時間エントリーの配列
 * @returns 重複している時間帯の情報
 */
export function checkTimeOverlaps(entries: WorkTimeEntry[]): {
  hasOverlap: boolean;
  overlaps: Array<{
    entry1: WorkTimeEntry;
    entry2: WorkTimeEntry;
    overlapMinutes: number;
  }>;
} {
  const overlaps: Array<{
    entry1: WorkTimeEntry;
    entry2: WorkTimeEntry;
    overlapMinutes: number;
  }> = [];
  
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const e1 = entries[i];
      const e2 = entries[j];
      
      if (!e1.startTime || !e1.endTime || !e2.startTime || !e2.endTime) {
        continue;
      }
      
      const start1 = timeToMinutes(e1.startTime);
      const end1 = timeToMinutes(e1.endTime);
      const start2 = timeToMinutes(e2.startTime);
      const end2 = timeToMinutes(e2.endTime);
      
      // 重複チェック
      if (start1 < end2 && end1 > start2) {
        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);
        const overlapMinutes = overlapEnd - overlapStart;
        
        overlaps.push({
          entry1: e1,
          entry2: e2,
          overlapMinutes
        });
      }
    }
  }
  
  return {
    hasOverlap: overlaps.length > 0,
    overlaps
  };
}

/**
 * 時刻文字列を分に変換
 * @param time HH:MM形式の時刻
 * @returns 0:00からの経過分数
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 実績原価と予定原価の差異を計算
 * @param plannedCost 予定原価
 * @param actualCost 実績原価
 * @returns 差異情報
 */
export function calculateCostVariance(
  plannedCost: number,
  actualCost: number
): {
  variance: number;
  varianceRate: number;
  status: 'over' | 'under' | 'equal';
} {
  const variance = actualCost - plannedCost;
  const varianceRate = plannedCost > 0 ? (variance / plannedCost) * 100 : 0;
  
  return {
    variance,
    varianceRate,
    status: variance > 0 ? 'over' : variance < 0 ? 'under' : 'equal'
  };
}