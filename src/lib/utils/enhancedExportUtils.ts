// 強化版エクスポートユーティリティ
// バッチ処理・ZIP対応・プログレス表示付きエクスポート機能

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrders } from '@/lib/firebase/orders';
import { getProcessesList } from '@/lib/firebase/processes';
import { getDailyReports } from '@/lib/firebase/dailyReports';
import { getWorkHours } from '@/lib/firebase/workHours';
import { logSecurityEvent } from './securityUtils';

// =============================================================================
// 型定義
// =============================================================================

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'zip';
  batchSize?: number;
  includeHeaders?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  collections?: string[];
  filters?: Record<string, any>;
}

export interface ExportProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentCollection?: string;
  processedRecords: number;
  totalRecords: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BulkExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  recordCount: number;
  fileSize?: number;
  error?: string;
  progressId?: string;
}

export interface CollectionConfig {
  name: string;
  displayName: string;
  fields: Record<string, string>; // フィールド名マッピング
  maxRecords?: number;
  sortField?: string;
}

// =============================================================================
// 強化版エクスポートマネージャークラス
// =============================================================================

class EnhancedExportManagerImpl {
  private static instance: EnhancedExportManagerImpl;

  // プログレス追跡用
  private progressTracker = new Map<string, ExportProgress>();

  private constructor() {}

  public static getInstance(): EnhancedExportManagerImpl {
    if (!EnhancedExportManagerImpl.instance) {
      EnhancedExportManagerImpl.instance = new EnhancedExportManagerImpl();
    }
    return EnhancedExportManagerImpl.instance;
  }

  // =============================================================================
  // コレクション設定
  // =============================================================================

  private getCollectionConfigs(): CollectionConfig[] {
    return [
      {
        name: 'orders',
        displayName: '受注案件',
        fields: {
          managementNumber: '管理番号',
          projectName: '案件名',
          clientName: 'クライアント名',
          status: 'ステータス',
          orderDate: '受注日',
          deliveryDate: '納期',
          totalAmount: '合計金額',
          createdAt: '作成日',
          updatedAt: '更新日'
        },
        sortField: 'createdAt'
      },
      {
        name: 'processes',
        displayName: '工程管理',
        fields: {
          managementNumber: '管理番号',
          processName: '工程名',
          status: 'ステータス',
          assignedTo: '担当者',
          startDate: '開始日',
          endDate: '終了日',
          estimatedHours: '見積工数',
          actualHours: '実績工数',
          createdAt: '作成日',
          updatedAt: '更新日'
        },
        sortField: 'createdAt'
      },
      {
        name: 'daily-reports',
        displayName: '日報',
        fields: {
          reportDate: '日報日',
          employeeName: '従業員名',
          workSummary: '作業内容',
          workHours: '作業時間',
          status: 'ステータス',
          notes: '備考',
          createdAt: '作成日',
          updatedAt: '更新日'
        },
        sortField: 'reportDate'
      },
      {
        name: 'work-hours',
        displayName: '工数管理',
        fields: {
          managementNumber: '管理番号',
          employeeName: '従業員名',
          workDate: '作業日',
          hours: '時間',
          description: '作業内容',
          status: 'ステータス',
          createdAt: '作成日',
          updatedAt: '更新日'
        },
        sortField: 'workDate'
      },
      {
        name: 'notes',
        displayName: 'メモ',
        fields: {
          title: 'タイトル',
          content: '内容',
          tags: 'タグ',
          color: '色',
          isPinned: 'ピン留め',
          createdAt: '作成日',
          updatedAt: '更新日'
        },
        sortField: 'updatedAt'
      },
      {
        name: 'calendar-events',
        displayName: 'カレンダー',
        fields: {
          title: 'タイトル',
          description: '説明',
          startDate: '開始日時',
          endDate: '終了日時',
          location: '場所',
          attendees: '参加者',
          createdAt: '作成日',
          updatedAt: '更新日'
        },
        sortField: 'startDate'
      }
    ];
  }

  // =============================================================================
  // プログレス管理
  // =============================================================================

  private async createProgress(options: ExportOptions): Promise<string> {
    const progressId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const progress: ExportProgress = {
      id: progressId,
      status: 'pending',
      progress: 0,
      processedRecords: 0,
      totalRecords: 0,
      createdAt: new Date().toISOString()
    };

    this.progressTracker.set(progressId, progress);

    // Firestoreにも保存
    try {
      await addDoc(collection(db, 'export-progress'), {
        id: progressId,
        ...progress,
        options
      });
    } catch (error) {
      console.error('プログレス保存エラー:', error);
    }

    return progressId;
  }

  private async updateProgress(
    progressId: string,
    updates: Partial<ExportProgress>
  ): Promise<void> {
    const current = this.progressTracker.get(progressId);
    if (current) {
      const updated = { ...current, ...updates };
      this.progressTracker.set(progressId, updated);

      // Firestoreも更新
      try {
        const progressQuery = query(
          collection(db, 'export-progress'),
          where('id', '==', progressId),
          limit(1)
        );

        const querySnapshot = await getDocs(progressQuery);
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, updates);
        }
      } catch (error) {
        console.error('プログレス更新エラー:', error);
      }
    }
  }

  public getProgress(progressId: string): ExportProgress | null {
    return this.progressTracker.get(progressId) || null;
  }

  // =============================================================================
  // バッチデータ取得
  // =============================================================================

  private async fetchDataInBatches<T>(
    collectionName: string,
    batchSize: number = 1000,
    filters?: Record<string, any>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<T[]> {
    const allData: T[] = [];
    let lastDoc: any = null;
    let processedCount = 0;

    console.log(`🔄 バッチ取得開始: ${collectionName} (batchSize: ${batchSize})`);

    try {
      while (true) {
        let queryRef = query(collection(db, collectionName));

        // フィルターの適用
        if (filters) {
          Object.entries(filters).forEach(([field, value]) => {
            if (value !== undefined && value !== null) {
              queryRef = query(queryRef, where(field, '==', value));
            }
          });
        }

        // ソート順の設定
        const config = this.getCollectionConfigs().find(c => c.name === collectionName);
        if (config?.sortField) {
          try {
            queryRef = query(queryRef, orderBy(config.sortField));
          } catch (error) {
            // orderByでエラーが出た場合はcreatedAtで試行
            queryRef = query(queryRef, orderBy('createdAt'));
          }
        } else {
          queryRef = query(queryRef, orderBy('createdAt'));
        }

        // バッチサイズ制限
        queryRef = query(queryRef, limit(batchSize));

        // ページネーション
        if (lastDoc) {
          queryRef = query(queryRef, startAfter(lastDoc));
        }

        const snapshot = await getDocs(queryRef);

        if (snapshot.empty) {
          console.log(`📄 ${collectionName}: データなし (最終バッチ)`);
          break;
        }

        const batchData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];

        allData.push(...batchData);
        processedCount += batchData.length;

        // プログレス通知
        if (onProgress) {
          onProgress(processedCount, processedCount);
        }

        console.log(`📦 ${collectionName}: ${batchData.length}件取得 (累計: ${processedCount}件)`);

        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        // バッチサイズより少ない場合は最後のバッチ
        if (snapshot.docs.length < batchSize) {
          console.log(`✅ ${collectionName}: 取得完了 (総計: ${processedCount}件)`);
          break;
        }

        // メモリ過多を防ぐため10万件で制限
        if (processedCount >= 100000) {
          console.warn(`⚠️ ${collectionName}: 大量データのため10万件で制限`);
          break;
        }
      }
    } catch (error) {
      console.error(`❌ バッチ取得エラー (${collectionName}):`, error);
      throw error;
    }

    return allData;
  }

  // =============================================================================
  // データ変換
  // =============================================================================

  private transformDataForExport(
    data: any[],
    collectionName: string
  ): any[] {
    const config = this.getCollectionConfigs().find(c => c.name === collectionName);
    if (!config) return data;

    return data.map(item => {
      const transformed: any = {};

      Object.entries(config.fields).forEach(([originalField, displayName]) => {
        const value = item[originalField];

        // データ型に応じた変換
        if (value instanceof Date) {
          transformed[displayName] = value.toLocaleDateString('ja-JP');
        } else if (typeof value === 'boolean') {
          transformed[displayName] = value ? 'はい' : 'いいえ';
        } else if (Array.isArray(value)) {
          transformed[displayName] = value.join(', ');
        } else {
          transformed[displayName] = value || '';
        }
      });

      return transformed;
    });
  }

  // =============================================================================
  // 単一コレクション エクスポート
  // =============================================================================

  async exportSingleCollection(
    collectionName: string,
    options: ExportOptions
  ): Promise<BulkExportResult> {
    const progressId = await this.createProgress(options);

    try {
      await this.updateProgress(progressId, {
        status: 'processing',
        currentCollection: collectionName,
        startedAt: new Date().toISOString()
      });

      console.log(`🚀 エクスポート開始: ${collectionName}`);

      // バッチ処理でデータ取得
      const rawData = await this.fetchDataInBatches(
        collectionName,
        options.batchSize || 1000,
        options.filters,
        (processed, total) => {
          this.updateProgress(progressId, {
            processedRecords: processed,
            totalRecords: Math.max(total, processed),
            progress: Math.min(50, (processed / Math.max(total, 1)) * 50) // データ取得で50%まで
          });
        }
      );

      if (rawData.length === 0) {
        throw new Error('エクスポート対象のデータが見つかりませんでした');
      }

      // データ変換
      console.log(`🔄 データ変換開始: ${rawData.length}件`);
      const transformedData = this.transformDataForExport(rawData, collectionName);

      await this.updateProgress(progressId, {
        progress: 75,
        processedRecords: transformedData.length,
        totalRecords: transformedData.length
      });

      // ファイル生成
      let downloadUrl: string;
      let fileName: string;
      let fileSize: number;

      console.log(`📄 ファイル生成開始: ${options.format}形式`);

      switch (options.format) {
        case 'csv':
          const csvResult = await this.generateCSV(transformedData, collectionName);
          downloadUrl = csvResult.url;
          fileName = csvResult.fileName;
          fileSize = csvResult.size;
          break;

        case 'excel':
          const excelResult = await this.generateExcel(transformedData, collectionName);
          downloadUrl = excelResult.url;
          fileName = excelResult.fileName;
          fileSize = excelResult.size;
          break;

        case 'json':
          const jsonResult = await this.generateJSON(transformedData, collectionName);
          downloadUrl = jsonResult.url;
          fileName = jsonResult.fileName;
          fileSize = jsonResult.size;
          break;

        default:
          throw new Error(`サポートされていない形式: ${options.format}`);
      }

      await this.updateProgress(progressId, {
        status: 'completed',
        progress: 100,
        downloadUrl,
        completedAt: new Date().toISOString()
      });

      logSecurityEvent('data_export_completed', {
        collectionName,
        format: options.format,
        recordCount: transformedData.length,
        progressId
      });

      console.log(`✅ エクスポート完了: ${fileName} (${transformedData.length}件)`);

      return {
        success: true,
        downloadUrl,
        fileName,
        recordCount: transformedData.length,
        fileSize,
        progressId
      };

    } catch (error) {
      await this.updateProgress(progressId, {
        status: 'failed',
        error: error instanceof Error ? error.message : '不明なエラー',
        completedAt: new Date().toISOString()
      });

      console.error('❌ エクスポートエラー:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        recordCount: 0,
        progressId
      };
    }
  }

  // =============================================================================
  // 複数コレクション 一括エクスポート（ZIP形式）
  // =============================================================================

  async exportMultipleCollections(
    collectionNames: string[],
    options: ExportOptions
  ): Promise<BulkExportResult> {
    const progressId = await this.createProgress({
      ...options,
      format: 'zip',
      collections: collectionNames
    });

    try {
      await this.updateProgress(progressId, {
        status: 'processing',
        startedAt: new Date().toISOString()
      });

      console.log(`🚀 一括エクスポート開始: ${collectionNames.join(', ')}`);

      const zip = new JSZip();
      let totalRecords = 0;
      let processedCollections = 0;

      for (const collectionName of collectionNames) {
        await this.updateProgress(progressId, {
          currentCollection: collectionName,
          progress: (processedCollections / collectionNames.length) * 90
        });

        try {
          console.log(`📂 処理中: ${collectionName}`);

          // データ取得
          const rawData = await this.fetchDataInBatches(
            collectionName,
            options.batchSize || 1000,
            options.filters
          );

          if (rawData.length === 0) {
            console.log(`⏭️ スキップ: ${collectionName} (データなし)`);
            continue;
          }

          // データ変換
          const transformedData = this.transformDataForExport(rawData, collectionName);
          totalRecords += transformedData.length;

          // Excel形式でZIPに追加
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.json_to_sheet(transformedData);

          // 列幅を自動調整
          this.autoSizeWorksheetColumns(worksheet, transformedData);

          XLSX.utils.book_append_sheet(workbook, worksheet, 'データ');

          const buffer = XLSX.write(workbook, {
            type: 'array',
            bookType: 'xlsx'
          });

          const config = this.getCollectionConfigs().find(c => c.name === collectionName);
          const displayName = config?.displayName || collectionName;

          zip.file(`${displayName}.xlsx`, buffer);

          console.log(`✅ 追加完了: ${displayName} (${transformedData.length}件)`);

        } catch (error) {
          console.error(`❌ コレクション処理エラー (${collectionName}):`, error);
          // エラーがあっても他のコレクションの処理を続行
        }

        processedCollections++;
      }

      await this.updateProgress(progressId, {
        progress: 95,
        processedRecords: totalRecords,
        totalRecords: totalRecords
      });

      // ZIPファイル生成
      console.log('📦 ZIPファイル生成中...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const fileName = `unica_export_${new Date().toISOString().split('T')[0]}.zip`;
      const downloadUrl = URL.createObjectURL(zipBlob);

      await this.updateProgress(progressId, {
        status: 'completed',
        progress: 100,
        downloadUrl,
        completedAt: new Date().toISOString()
      });

      logSecurityEvent('bulk_export_completed', {
        collections: collectionNames,
        totalRecords,
        format: 'zip',
        progressId
      });

      console.log(`✅ 一括エクスポート完了: ${fileName} (${totalRecords}件)`);

      return {
        success: true,
        downloadUrl,
        fileName,
        recordCount: totalRecords,
        fileSize: zipBlob.size,
        progressId
      };

    } catch (error) {
      await this.updateProgress(progressId, {
        status: 'failed',
        error: error instanceof Error ? error.message : '不明なエラー',
        completedAt: new Date().toISOString()
      });

      console.error('❌ 一括エクスポートエラー:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        recordCount: 0,
        progressId
      };
    }
  }

  // =============================================================================
  // ファイル生成メソッド
  // =============================================================================

  private async generateCSV(data: any[], collectionName: string): Promise<{
    url: string;
    fileName: string;
    size: number;
  }> {
    if (data.length === 0) {
      throw new Error('エクスポートするデータがありません');
    }

    // CSVヘッダー
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','), // ヘッダー行
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // CSVエスケープ処理
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    // BOM付きUTF-8でエンコード
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const encoder = new TextEncoder();
    const csvBuffer = encoder.encode(csvContent);
    const blob = new Blob([bom, csvBuffer], { type: 'text/csv;charset=utf-8' });

    const config = this.getCollectionConfigs().find(c => c.name === collectionName);
    const displayName = config?.displayName || collectionName;
    const fileName = `${displayName}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      url: URL.createObjectURL(blob),
      fileName,
      size: blob.size
    };
  }

  private async generateExcel(data: any[], collectionName: string): Promise<{
    url: string;
    fileName: string;
    size: number;
  }> {
    if (data.length === 0) {
      throw new Error('エクスポートするデータがありません');
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 列幅を自動調整
    this.autoSizeWorksheetColumns(worksheet, data);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'データ');

    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const config = this.getCollectionConfigs().find(c => c.name === collectionName);
    const displayName = config?.displayName || collectionName;
    const fileName = `${displayName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return {
      url: URL.createObjectURL(blob),
      fileName,
      size: blob.size
    };
  }

  private async generateJSON(data: any[], collectionName: string): Promise<{
    url: string;
    fileName: string;
    size: number;
  }> {
    const exportData = {
      exportDate: new Date().toISOString(),
      collectionName,
      recordCount: data.length,
      data: data
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    const config = this.getCollectionConfigs().find(c => c.name === collectionName);
    const displayName = config?.displayName || collectionName;
    const fileName = `${displayName}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      url: URL.createObjectURL(blob),
      fileName,
      size: blob.size
    };
  }

  // =============================================================================
  // ユーティリティメソッド
  // =============================================================================

  private autoSizeWorksheetColumns(worksheet: any, data: any[]): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const colWidths = headers.map(header => {
      let maxWidth = header.length;

      // データの内容から最大幅を計算
      data.slice(0, 100).forEach(row => { // パフォーマンス向上のため100行のみチェック
        const cellValue = String(row[header] || '');
        maxWidth = Math.max(maxWidth, cellValue.length);
      });

      return { wch: Math.min(maxWidth + 2, 50) }; // 最大50文字まで
    });

    worksheet['!cols'] = colWidths;
  }

  getAvailableCollections(): CollectionConfig[] {
    return this.getCollectionConfigs();
  }

  async estimateExportSize(
    collectionNames: string[],
    filters?: Record<string, any>
  ): Promise<{
    totalRecords: number;
    estimatedSizeKB: number;
    collections: Array<{
      name: string;
      recordCount: number;
    }>;
  }> {
    let totalRecords = 0;
    const collections: Array<{ name: string; recordCount: number }> = [];

    for (const collectionName of collectionNames) {
      try {
        // 少量のサンプルを取得して件数を推定
        const sampleSize = 10;
        const sampleData = await this.fetchDataInBatches(
          collectionName,
          sampleSize,
          filters
        );

        // 実際の件数はより多い可能性があるが、サンプルベースで推定
        const estimatedCount = sampleData.length;

        collections.push({
          name: collectionName,
          recordCount: estimatedCount
        });

        totalRecords += estimatedCount;
      } catch (error) {
        console.error(`件数取得エラー (${collectionName}):`, error);
        collections.push({
          name: collectionName,
          recordCount: 0
        });
      }
    }

    // 概算サイズ（1レコードあたり1KB程度と仮定）
    const estimatedSizeKB = totalRecords;

    return {
      totalRecords,
      estimatedSizeKB,
      collections
    };
  }

  // プログレス情報をクリーンアップ
  cleanupProgress(progressId: string): void {
    this.progressTracker.delete(progressId);
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const enhancedExportManager = EnhancedExportManagerImpl.getInstance();

// =============================================================================
// 便利な関数
// =============================================================================

export const downloadFile = (url: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // メモリリーク防止
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getProgressColor = (progress: number): string => {
  if (progress < 30) return 'bg-red-500';
  if (progress < 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

export const getProgressText = (status: ExportProgress['status']): string => {
  switch (status) {
    case 'pending': return '待機中';
    case 'processing': return '処理中';
    case 'completed': return '完了';
    case 'failed': return 'エラー';
    default: return '不明';
  }
};

// =============================================================================
// エクスポート機能のメイン関数
// =============================================================================

export const exportSingleCollection = async (
  collectionName: string,
  options: ExportOptions
): Promise<BulkExportResult> => {
  return await enhancedExportManager.exportSingleCollection(collectionName, options);
};

export const exportMultipleCollections = async (
  collectionNames: string[],
  options: ExportOptions
): Promise<BulkExportResult> => {
  return await enhancedExportManager.exportMultipleCollections(collectionNames, options);
};

export const getExportProgress = (progressId: string): ExportProgress | null => {
  return enhancedExportManager.getProgress(progressId);
};

export default EnhancedExportManagerImpl;