// 品質管理システム - 製造業向け統合品質管理
import { DefectReport, InventoryItem, Process } from '@/types';
import { logSecurityEvent } from './securityUtils';
import { showError, showSuccess } from './errorHandling';

// =============================================================================
// 品質管理の型定義
// =============================================================================

export interface QualityCheckpoint {
  id: string;
  name: string;
  description: string;
  processStage: 'incoming' | 'in-process' | 'final' | 'outgoing';
  required: boolean;
  criteriaList: QualityCriteria[];
  frequency: 'every' | 'sample' | 'batch' | 'lot';
  sampleSize?: number;
  tolerance: {
    acceptable: number; // 許容範囲（%）
    warning: number;    // 警告しきい値（%）
    critical: number;   // 重大しきい値（%）
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface QualityCriteria {
  id: string;
  name: string;
  type: 'dimensional' | 'visual' | 'functional' | 'material' | 'other';
  measurementType: 'numeric' | 'boolean' | 'selection' | 'text';
  specification: {
    target?: number;
    upperLimit?: number;
    lowerLimit?: number;
    unit?: string;
    options?: string[]; // 選択型の場合の選択肢
  };
  importance: 'critical' | 'major' | 'minor';
  inspectionMethod: string;
  equipment?: string;
}

export interface QualityInspection {
  id: string;
  checkpointId: string;
  checkpointName: string;
  inspectorId: string;
  inspectorName: string;
  
  // 対象物の情報
  targetType: 'process' | 'inventory' | 'batch' | 'product';
  targetId: string;
  targetName: string;
  lotNumber?: string;
  serialNumber?: string;
  productionNumber?: string;
  
  // 検査結果
  overallResult: 'pass' | 'fail' | 'conditional' | 'pending';
  inspectionDate: string;
  measurements: QualityMeasurement[];
  
  // 不具合情報
  defectsFound: QualityDefect[];
  correctiveActions: string[];
  
  // 承認・確認
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // メタデータ
  environmentConditions?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    other?: Record<string, any>;
  };
  notes?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QualityMeasurement {
  criteriaId: string;
  criteriaName: string;
  value: any; // 数値、真偽値、文字列など
  result: 'pass' | 'fail' | 'warning';
  deviation?: number; // 目標値からの偏差
  unit?: string;
  notes?: string;
}

export interface QualityDefect {
  id: string;
  type: 'dimensional' | 'surface' | 'functional' | 'material' | 'assembly' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location?: string;
  quantity?: number;
  cause?: 'material' | 'process' | 'equipment' | 'human' | 'environment' | 'unknown';
  images?: string[];
  measurementData?: any;
}

export interface QualityStatistics {
  period: {
    start: string;
    end: string;
  };
  totalInspections: number;
  passRate: number;
  defectRate: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  
  byCheckpoint: {
    checkpointId: string;
    checkpointName: string;
    inspectionCount: number;
    passRate: number;
    avgInspectionTime?: number;
  }[];
  
  byDefectType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  
  trends: {
    date: string;
    passRate: number;
    defectCount: number;
    totalInspections: number;
  }[];
  
  topDefectCauses: {
    cause: string;
    count: number;
    impact: 'high' | 'medium' | 'low';
  }[];
}

// =============================================================================
// 品質管理クラス
// =============================================================================

export class QualityControlSystem {
  private checkpoints: QualityCheckpoint[] = [];
  private inspections: QualityInspection[] = [];

  // =============================================================================
  // チェックポイント管理
  // =============================================================================

  public addCheckpoint(checkpoint: Omit<QualityCheckpoint, 'id' | 'createdAt' | 'updatedAt'>): QualityCheckpoint {
    const newCheckpoint: QualityCheckpoint = {
      ...checkpoint,
      id: this.generateId('QCP'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.checkpoints.push(newCheckpoint);
    
    logSecurityEvent('quality_checkpoint_created', {
      checkpointId: newCheckpoint.id,
      processStage: newCheckpoint.processStage,
      criteriaCount: newCheckpoint.criteriaList.length
    });

    return newCheckpoint;
  }

  public getCheckpointsForStage(stage: QualityCheckpoint['processStage']): QualityCheckpoint[] {
    return this.checkpoints.filter(cp => cp.processStage === stage && cp.isActive);
  }

  // =============================================================================
  // 品質検査実行
  // =============================================================================

  public async startInspection(
    checkpointId: string,
    targetInfo: {
      type: QualityInspection['targetType'];
      id: string;
      name: string;
      lotNumber?: string;
      serialNumber?: string;
      productionNumber?: string;
    },
    inspectorInfo: {
      id: string;
      name: string;
    }
  ): Promise<QualityInspection> {
    const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`チェックポイントが見つかりません: ${checkpointId}`);
    }

    const inspection: QualityInspection = {
      id: this.generateId('QIN'),
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      inspectorId: inspectorInfo.id,
      inspectorName: inspectorInfo.name,
      targetType: targetInfo.type,
      targetId: targetInfo.id,
      targetName: targetInfo.name,
      lotNumber: targetInfo.lotNumber,
      serialNumber: targetInfo.serialNumber,
      productionNumber: targetInfo.productionNumber,
      overallResult: 'pending',
      inspectionDate: new Date().toISOString(),
      measurements: [],
      defectsFound: [],
      correctiveActions: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.inspections.push(inspection);

    logSecurityEvent('quality_inspection_started', {
      inspectionId: inspection.id,
      checkpointId: checkpoint.id,
      targetType: targetInfo.type,
      inspectorId: inspectorInfo.id
    });

    return inspection;
  }

  // 測定値の記録
  public recordMeasurement(
    inspectionId: string,
    criteriaId: string,
    value: any,
    notes?: string
  ): QualityMeasurement {
    const inspection = this.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      throw new Error(`検査が見つかりません: ${inspectionId}`);
    }

    const checkpoint = this.checkpoints.find(cp => cp.id === inspection.checkpointId);
    const criteria = checkpoint?.criteriaList.find(c => c.id === criteriaId);
    
    if (!criteria) {
      throw new Error(`検査項目が見つかりません: ${criteriaId}`);
    }

    const measurement: QualityMeasurement = {
      criteriaId,
      criteriaName: criteria.name,
      value,
      result: this.evaluateMeasurement(criteria, value),
      unit: criteria.specification.unit,
      notes
    };

    // 偏差計算（数値型の場合）
    if (criteria.measurementType === 'numeric' && criteria.specification.target !== undefined) {
      measurement.deviation = Math.abs(Number(value) - criteria.specification.target);
    }

    // 既存の測定値を更新または追加
    const existingIndex = inspection.measurements.findIndex(m => m.criteriaId === criteriaId);
    if (existingIndex >= 0) {
      inspection.measurements[existingIndex] = measurement;
    } else {
      inspection.measurements.push(measurement);
    }

    inspection.updatedAt = new Date().toISOString();

    return measurement;
  }

  private evaluateMeasurement(criteria: QualityCriteria, value: any): QualityMeasurement['result'] {
    switch (criteria.measurementType) {
      case 'numeric':
        const numValue = Number(value);
        const { upperLimit, lowerLimit, target } = criteria.specification;
        
        if (upperLimit !== undefined && numValue > upperLimit) return 'fail';
        if (lowerLimit !== undefined && numValue < lowerLimit) return 'fail';
        
        // 警告範囲チェック（目標値の±10%など）
        if (target !== undefined) {
          const tolerance = target * 0.1; // 10%の許容範囲
          if (Math.abs(numValue - target) > tolerance) return 'warning';
        }
        
        return 'pass';
        
      case 'boolean':
        return value ? 'pass' : 'fail';
        
      case 'selection':
        const acceptableOptions = criteria.specification.options || [];
        return acceptableOptions.includes(value) ? 'pass' : 'fail';
        
      default:
        return 'pass'; // テキストなどは個別に判断
    }
  }

  // 不具合の記録
  public recordDefect(inspectionId: string, defect: Omit<QualityDefect, 'id'>): QualityDefect {
    const inspection = this.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      throw new Error(`検査が見つかりません: ${inspectionId}`);
    }

    const newDefect: QualityDefect = {
      ...defect,
      id: this.generateId('QDF')
    };

    inspection.defectsFound.push(newDefect);
    inspection.updatedAt = new Date().toISOString();

    // 重大な不具合の場合は即座に通知
    if (defect.severity === 'critical') {
      this.triggerCriticalDefectAlert(inspection, newDefect);
    }

    logSecurityEvent('quality_defect_recorded', {
      inspectionId,
      defectId: newDefect.id,
      severity: newDefect.severity,
      type: newDefect.type
    });

    return newDefect;
  }

  // 検査完了
  public completeInspection(
    inspectionId: string,
    finalNotes?: string,
    correctiveActions: string[] = []
  ): QualityInspection {
    const inspection = this.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      throw new Error(`検査が見つかりません: ${inspectionId}`);
    }

    // 総合判定を計算
    inspection.overallResult = this.calculateOverallResult(inspection);
    inspection.correctiveActions = correctiveActions;
    inspection.notes = finalNotes;
    inspection.updatedAt = new Date().toISOString();

    logSecurityEvent('quality_inspection_completed', {
      inspectionId,
      result: inspection.overallResult,
      defectCount: inspection.defectsFound.length,
      measurementCount: inspection.measurements.length
    });

    // 結果に基づく通知
    if (inspection.overallResult === 'fail') {
      showError(new Error('quality_inspection_failed'), 
        `品質検査で不具合が検出されました: ${inspection.targetName}`);
    } else {
      showSuccess(`品質検査が完了しました: ${inspection.targetName}`);
    }

    return inspection;
  }

  private calculateOverallResult(inspection: QualityInspection): QualityInspection['overallResult'] {
    // 重大な不具合があれば不合格
    if (inspection.defectsFound.some(d => d.severity === 'critical')) {
      return 'fail';
    }

    // 測定結果に不合格があれば不合格
    if (inspection.measurements.some(m => m.result === 'fail')) {
      return 'fail';
    }

    // 主要な不具合が多い場合は条件付き合格
    const majorDefects = inspection.defectsFound.filter(d => d.severity === 'major').length;
    if (majorDefects > 2) {
      return 'conditional';
    }

    // 警告がある場合は条件付き合格
    if (inspection.measurements.some(m => m.result === 'warning')) {
      return 'conditional';
    }

    return 'pass';
  }

  // =============================================================================
  // 統計・分析
  // =============================================================================

  public generateStatistics(
    startDate: string,
    endDate: string,
    filters?: {
      checkpointIds?: string[];
      targetTypes?: QualityInspection['targetType'][];
      inspectorIds?: string[];
    }
  ): QualityStatistics {
    let filteredInspections = this.inspections.filter(i => 
      i.inspectionDate >= startDate && 
      i.inspectionDate <= endDate &&
      i.overallResult !== 'pending'
    );

    // フィルター適用
    if (filters) {
      if (filters.checkpointIds?.length) {
        filteredInspections = filteredInspections.filter(i => 
          filters.checkpointIds!.includes(i.checkpointId));
      }
      if (filters.targetTypes?.length) {
        filteredInspections = filteredInspections.filter(i => 
          filters.targetTypes!.includes(i.targetType));
      }
      if (filters.inspectorIds?.length) {
        filteredInspections = filteredInspections.filter(i => 
          filters.inspectorIds!.includes(i.inspectorId));
      }
    }

    const totalInspections = filteredInspections.length;
    const passedInspections = filteredInspections.filter(i => i.overallResult === 'pass').length;
    const allDefects = filteredInspections.flatMap(i => i.defectsFound);

    return {
      period: { start: startDate, end: endDate },
      totalInspections,
      passRate: totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0,
      defectRate: totalInspections > 0 ? (allDefects.length / totalInspections) * 100 : 0,
      criticalDefects: allDefects.filter(d => d.severity === 'critical').length,
      majorDefects: allDefects.filter(d => d.severity === 'major').length,
      minorDefects: allDefects.filter(d => d.severity === 'minor').length,
      
      byCheckpoint: this.calculateCheckpointStatistics(filteredInspections),
      byDefectType: this.calculateDefectTypeStatistics(allDefects),
      trends: this.calculateTrends(filteredInspections, startDate, endDate),
      topDefectCauses: this.calculateTopDefectCauses(allDefects)
    };
  }

  private calculateCheckpointStatistics(inspections: QualityInspection[]) {
    const checkpointStats: Record<string, any> = {};
    
    inspections.forEach(inspection => {
      if (!checkpointStats[inspection.checkpointId]) {
        checkpointStats[inspection.checkpointId] = {
          checkpointId: inspection.checkpointId,
          checkpointName: inspection.checkpointName,
          inspectionCount: 0,
          passCount: 0
        };
      }
      
      checkpointStats[inspection.checkpointId].inspectionCount++;
      if (inspection.overallResult === 'pass') {
        checkpointStats[inspection.checkpointId].passCount++;
      }
    });
    
    return Object.values(checkpointStats).map((stats: any) => ({
      ...stats,
      passRate: (stats.passCount / stats.inspectionCount) * 100
    }));
  }

  private calculateDefectTypeStatistics(defects: QualityDefect[]) {
    const typeCount: Record<string, number> = {};
    
    defects.forEach(defect => {
      typeCount[defect.type] = (typeCount[defect.type] || 0) + 1;
    });
    
    const total = defects.length;
    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  private calculateTrends(inspections: QualityInspection[], startDate: string, endDate: string) {
    // 日別の統計を計算
    const dailyStats: Record<string, any> = {};
    
    inspections.forEach(inspection => {
      const date = inspection.inspectionDate.split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          totalInspections: 0,
          passCount: 0,
          defectCount: 0
        };
      }
      
      dailyStats[date].totalInspections++;
      if (inspection.overallResult === 'pass') {
        dailyStats[date].passCount++;
      }
      dailyStats[date].defectCount += inspection.defectsFound.length;
    });
    
    return Object.values(dailyStats).map((stats: any) => ({
      ...stats,
      passRate: (stats.passCount / stats.totalInspections) * 100
    }));
  }

  private calculateTopDefectCauses(defects: QualityDefect[]) {
    const causeCount: Record<string, number> = {};
    
    defects.forEach(defect => {
      if (defect.cause) {
        causeCount[defect.cause] = (causeCount[defect.cause] || 0) + 1;
      }
    });
    
    return Object.entries(causeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([cause, count]) => ({
        cause,
        count,
        impact: count > 10 ? 'high' : count > 5 ? 'medium' : 'low'
      })) as Array<{ cause: string; count: number; impact: 'high' | 'medium' | 'low' }>;
  }

  // =============================================================================
  // アラート・通知
  // =============================================================================

  private triggerCriticalDefectAlert(inspection: QualityInspection, defect: QualityDefect): void {
    // 重大な不具合の緊急通知
    console.error('🚨 CRITICAL QUALITY DEFECT DETECTED:', {
      inspectionId: inspection.id,
      targetName: inspection.targetName,
      defectType: defect.type,
      description: defect.description
    });

    // 実際の実装では、メール通知、Slack通知、管理者への即座の通知などを行う
    showError(new Error('critical_defect'), 
      `重大な品質不具合が検出されました: ${defect.description}`);
  }

  // =============================================================================
  // ユーティリティ
  // =============================================================================

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  public getInspectionHistory(targetId: string): QualityInspection[] {
    return this.inspections.filter(i => i.targetId === targetId)
      .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
  }

  public exportInspectionData(inspectionIds: string[]): any {
    return this.inspections.filter(i => inspectionIds.includes(i.id));
  }
}

// =============================================================================
// エクスポート
// =============================================================================

export const qualityControlSystem = new QualityControlSystem();

// 製造業向けプリセットチェックポイント
export const manufacturingCheckpoints = {
  incomingMaterials: {
    name: '受入検査',
    processStage: 'incoming' as const,
    description: '原材料・部品の受入時品質検査',
    criteriaList: [
      {
        id: 'material-appearance',
        name: '外観検査',
        type: 'visual' as const,
        measurementType: 'selection' as const,
        specification: { options: ['良好', '軽微な傷', '不良'] },
        importance: 'major' as const,
        inspectionMethod: '目視検査'
      },
      {
        id: 'material-dimensions',
        name: '寸法検査',
        type: 'dimensional' as const,
        measurementType: 'numeric' as const,
        specification: { unit: 'mm' },
        importance: 'critical' as const,
        inspectionMethod: 'ノギス測定'
      }
    ]
  },
  
  processControl: {
    name: '工程内検査',
    processStage: 'in-process' as const,
    description: '製造工程中の品質管理',
    criteriaList: [
      {
        id: 'process-temperature',
        name: '加工温度',
        type: 'material' as const,
        measurementType: 'numeric' as const,
        specification: { unit: '°C', target: 200, upperLimit: 220, lowerLimit: 180 },
        importance: 'critical' as const,
        inspectionMethod: '温度計測定'
      }
    ]
  }
};

export default QualityControlSystem;