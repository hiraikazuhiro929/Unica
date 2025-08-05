/**
 * 工数予測エンジン
 * 過去データから作業時間を予測する
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { WORK_HOURS_COLLECTIONS } from '@/lib/firebase/workHours';

export interface PredictionInput {
  productionNumber: string;      // 製番
  workContentId: string;        // 作業内容ID
  workerId?: string;            // 作業者ID
  machineId?: string;           // 機械ID
  date: string;                 // 作業予定日
  quantity?: number;            // 数量
}

export interface PredictionResult {
  estimatedMinutes: number;     // 予測作業時間（分）
  confidence: number;           // 信頼度 (0-1)
  factors: {                    // 予測要因の内訳
    baseTime: number;           // 基準時間
    workerEfficiency: number;   // 作業者効率係数
    seasonalFactor: number;     // 季節要因
    machineFactor: number;      // 機械要因
    complexityFactor: number;   // 複雑度要因
  };
  historicalData: {             // 参考データ
    sampleCount: number;        // サンプル数
    averageTime: number;        // 平均時間
    standardDeviation: number;  // 標準偏差
  };
}

/**
 * 作業時間を予測
 */
export async function predictWorkTime(input: PredictionInput): Promise<PredictionResult> {
  // 1. 同一製番の過去データを取得
  const exactMatches = await getHistoricalData({
    productionNumber: input.productionNumber,
    workContentId: input.workContentId
  });

  // 2. 類似製番の過去データを取得（製番パターンマッチング）
  const similarMatches = await getSimilarProductionData(input.productionNumber, input.workContentId);

  // 3. 基準時間を計算
  let baseTime = 0;
  let confidence = 0;

  if (exactMatches.length >= 3) {
    // 同一製番のデータが十分ある場合
    baseTime = calculateWeightedAverage(exactMatches);
    confidence = Math.min(0.9, exactMatches.length / 10);
  } else if (similarMatches.length >= 5) {
    // 類似製番のデータを使用
    baseTime = calculateWeightedAverage(similarMatches);
    confidence = Math.min(0.7, similarMatches.length / 15);
  } else {
    // 作業内容の全体平均を使用
    const generalData = await getWorkContentAverage(input.workContentId);
    baseTime = generalData.averageTime;
    confidence = 0.5;
  }

  // 4. 調整要因を計算
  const factors = await calculateAdjustmentFactors(input);

  // 5. 最終予測時間を計算
  const estimatedMinutes = Math.round(
    baseTime * 
    factors.workerEfficiency * 
    factors.seasonalFactor * 
    factors.machineFactor * 
    factors.complexityFactor
  );

  // 6. 統計情報を生成
  const allData = [...exactMatches, ...similarMatches];
  const historicalData = {
    sampleCount: allData.length,
    averageTime: allData.length > 0 ? allData.reduce((sum, d) => sum + d.minutes, 0) / allData.length : 0,
    standardDeviation: calculateStandardDeviation(allData.map(d => d.minutes))
  };

  return {
    estimatedMinutes,
    confidence,
    factors,
    historicalData
  };
}

/**
 * 製番パターンから類似データを検索
 */
async function getSimilarProductionData(productionNumber: string, workContentId: string) {
  // 製番のパターンを抽出（例: "A001" → "A***" パターン）
  const pattern = extractProductionPattern(productionNumber);
  
  return await getHistoricalData({
    productionPattern: pattern,
    workContentId: workContentId
  });
}

/**
 * 調整要因を計算
 */
async function calculateAdjustmentFactors(input: PredictionInput) {
  return {
    workerEfficiency: await getWorkerEfficiency(input.workerId, input.workContentId),
    seasonalFactor: getSeasonalFactor(input.date),
    machineFactor: await getMachineFactor(input.machineId),
    complexityFactor: getComplexityFactor(input.productionNumber, input.quantity)
  };
}

/**
 * 作業者効率係数を取得
 */
async function getWorkerEfficiency(workerId?: string, workContentId?: string): Promise<number> {
  if (!workerId || !workContentId) return 1.0;

  // 過去3ヶ月の作業者実績から効率性を計算
  const workerHistory = await getWorkerPerformance(workerId, workContentId, 90); // 90日
  
  if (workerHistory.length < 5) return 1.0; // データ不足の場合は標準値

  const workerAverage = workerHistory.reduce((sum, h) => sum + h.minutes, 0) / workerHistory.length;
  const globalAverage = await getWorkContentAverage(workContentId);
  
  // 作業者の平均時間 / 全体平均時間 = 効率係数（逆数）
  return globalAverage.averageTime / workerAverage;
}

/**
 * 季節要因を取得
 */
function getSeasonalFactor(date: string): number {
  const workDate = new Date(date);
  const dayOfWeek = workDate.getDay();
  const month = workDate.getMonth();
  
  let factor = 1.0;
  
  // 曜日要因
  switch(dayOfWeek) {
    case 1: factor *= 0.9; break;  // 月曜日（週明け効果）
    case 5: factor *= 0.95; break; // 金曜日（疲労蓄積）
    default: factor *= 1.0;
  }
  
  // 月要因
  if (month === 11 || month === 0) {  // 12月、1月
    factor *= 0.85; // 年末年始は効率低下
  } else if (month === 3 || month === 8) { // 4月、9月
    factor *= 1.1;  // 新年度、下半期開始で効率向上
  }
  
  return factor;
}

/**
 * 機械要因を取得
 */
async function getMachineFactor(machineId?: string): Promise<number> {
  if (!machineId) return 1.0;

  // 機械の故障履歴、メンテナンス状況から効率係数を計算
  const machineStatus = await getMachineStatus(machineId);
  
  let factor = 1.0;
  
  // 故障率による調整
  if (machineStatus.faultRate > 0.1) {
    factor *= 0.9; // 故障率10%以上で効率低下
  }
  
  // 新機械の習熟期間
  if (machineStatus.installDate && 
      (Date.now() - new Date(machineStatus.installDate).getTime()) < (30 * 24 * 60 * 60 * 1000)) {
    factor *= 0.8; // 新機械は30日間習熟期間
  }
  
  return factor;
}

/**
 * 複雑度要因を取得
 */
function getComplexityFactor(productionNumber: string, quantity?: number): number {
  let factor = 1.0;
  
  // 数量による効率化（学習効果）
  if (quantity && quantity > 10) {
    factor *= Math.max(0.8, 1 - (quantity - 10) * 0.01); // 数量が多いほど効率化
  }
  
  // 製番の複雑度（製番パターンから推定）
  if (productionNumber.includes('X') || productionNumber.includes('Z')) {
    factor *= 1.2; // 特殊製番は複雑度高い
  }
  
  return factor;
}

/**
 * 重み付き平均を計算（新しいデータほど重みを大きく）
 */
function calculateWeightedAverage(data: { minutes: number; date: string }[]): number {
  if (data.length === 0) return 0;

  const now = Date.now();
  let totalWeight = 0;
  let weightedSum = 0;

  data.forEach(item => {
    const daysDiff = Math.max(1, (now - new Date(item.date).getTime()) / (24 * 60 * 60 * 1000));
    const weight = 1 / Math.sqrt(daysDiff); // 古いデータほど重みを小さく
    
    weightedSum += item.minutes * weight;
    totalWeight += weight;
  });

  return weightedSum / totalWeight;
}

/**
 * 標準偏差を計算
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

// Firebase データ取得関数

interface HistoricalDataEntry {
  minutes: number;
  date: string;
}

async function getHistoricalData(filter: {
  productionNumber?: string;
  productionPattern?: string;
  workContentId: string;
}): Promise<HistoricalDataEntry[]> {
  try {
    let q;
    
    if (filter.productionNumber) {
      // 完全一致での検索
      q = query(
        collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS),
        where('productionNumber', '==', filter.productionNumber),
        where('workContentId', '==', filter.workContentId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } else if (filter.productionPattern) {
      // パターンマッチの場合（クライアントサイドでフィルタ）
      q = query(
        collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS),
        where('workContentId', '==', filter.workContentId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      return [];
    }

    const snapshot = await getDocs(q);
    const data: HistoricalDataEntry[] = [];

    snapshot.docs.forEach(doc => {
      const docData = doc.data();
      
      // パターンマッチの場合、クライアントサイドでフィルタ
      if (filter.productionPattern) {
        const pattern = extractProductionPattern(docData.productionNumber || '');
        if (pattern !== filter.productionPattern) {
          return; // スキップ
        }
      }

      if (docData.durationMinutes && docData.createdAt) {
        data.push({
          minutes: docData.durationMinutes,
          date: docData.createdAt instanceof Timestamp 
            ? docData.createdAt.toDate().toISOString()
            : docData.createdAt
        });
      }
    });

    return data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

async function getWorkContentAverage(workContentId: string): Promise<{ averageTime: number }> {
  try {
    const q = query(
      collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS),
      where('workContentId', '==', workContentId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const durations: number[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.durationMinutes) {
        durations.push(data.durationMinutes);
      }
    });

    if (durations.length === 0) {
      return { averageTime: 480 }; // デフォルト8時間
    }

    const averageTime = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    return { averageTime };
  } catch (error) {
    console.error('Error fetching work content average:', error);
    return { averageTime: 480 };
  }
}

async function getWorkerPerformance(
  workerId: string, 
  workContentId: string, 
  days: number
): Promise<HistoricalDataEntry[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, WORK_HOURS_COLLECTIONS.WORK_HOURS),
      where('workerId', '==', workerId),
      where('workContentId', '==', workContentId),
      where('createdAt', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const data: HistoricalDataEntry[] = [];

    snapshot.docs.forEach(doc => {
      const docData = doc.data();
      if (docData.durationMinutes && docData.createdAt) {
        data.push({
          minutes: docData.durationMinutes,
          date: docData.createdAt instanceof Timestamp 
            ? docData.createdAt.toDate().toISOString()
            : docData.createdAt
        });
      }
    });

    return data;
  } catch (error) {
    console.error('Error fetching worker performance:', error);
    return [];
  }
}

async function getMachineStatus(machineId: string): Promise<{
  faultRate: number;
  installDate: string | null;
}> {
  try {
    // 機械マスタからステータスを取得（仮の実装）
    // 実際は機械管理テーブルから取得
    const machineRef = collection(db, 'machines');
    const q = query(machineRef, where('id', '==', machineId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const machineData = snapshot.docs[0].data();
      return {
        faultRate: machineData.faultRate || 0,
        installDate: machineData.installDate || null
      };
    }

    return { faultRate: 0, installDate: null };
  } catch (error) {
    console.error('Error fetching machine status:', error);
    return { faultRate: 0, installDate: null };
  }
}

function extractProductionPattern(productionNumber: string): string { 
  return productionNumber.replace(/\d/g, '*'); 
}