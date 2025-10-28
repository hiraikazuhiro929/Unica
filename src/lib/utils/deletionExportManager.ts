// 削除前データエクスポート専用マネージャー
// データ削除システムと連携したエクスポート機能

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logSecurityEvent } from './securityUtils';
import {
  exportToExcel,
  exportToCSV,
  generateFileName
} from './exportUtils';

// =============================================================================
// 型定義
// =============================================================================

export interface ExportRequest {
  id: string;
  collectionName: string;
  recordIds: string[];
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportFormat: 'excel' | 'csv';
  exportPath?: string;
  recordCount: number;
  completedAt?: string;
  errorMessage?: string;
  deletionScheduled: boolean;
  urgency: 'normal' | 'urgent';
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  recordCount: number;
  exportFormat: 'excel' | 'csv';
  fileSize?: number;
  errorMessage?: string;
  exportId: string;
}

export interface BatchExportRequest {
  collections: {
    name: string;
    recordIds: string[];
  }[];
  format: 'excel' | 'csv';
  requestedBy: string;
  urgency: 'normal' | 'urgent';
}

// =============================================================================
// 削除前エクスポートマネージャー
// =============================================================================

class DeletionExportManagerImpl {
  private static instance: DeletionExportManagerImpl;

  private constructor() {}

  public static getInstance(): DeletionExportManagerImpl {
    if (!DeletionExportManagerImpl.instance) {
      DeletionExportManagerImpl.instance = new DeletionExportManagerImpl();
    }
    return DeletionExportManagerImpl.instance;
  }

  // =============================================================================
  // エクスポート要求管理
  // =============================================================================

  async createExportRequest(
    collectionName: string,
    recordIds: string[],
    format: 'excel' | 'csv' = 'excel',
    urgency: 'normal' | 'urgent' = 'normal'
  ): Promise<ExportRequest | null> {
    try {
      const now = new Date();
      const request: Omit<ExportRequest, 'id'> = {
        collectionName,
        recordIds,
        requestedBy: 'system', // 将来的にはユーザーIDを設定
        requestedAt: now.toISOString(),
        status: 'pending',
        exportFormat: format,
        recordCount: recordIds.length,
        deletionScheduled: true,
        urgency
      };

      const requestRef = await addDoc(collection(db, 'export-requests'), request);

      logSecurityEvent('export_request_created', {
        exportId: requestRef.id,
        collectionName,
        recordCount: recordIds.length,
        format,
        urgency
      });

      console.log(`📋 エクスポート要求作成: ${collectionName} (${recordIds.length}件)`);

      return {
        id: requestRef.id,
        ...request
      };
    } catch (error) {
      console.error('エクスポート要求作成エラー:', error);
      return null;
    }
  }

  // =============================================================================
  // データ取得とフォーマット
  // =============================================================================

  private async fetchRecordsForExport(
    collectionName: string,
    recordIds: string[]
  ): Promise<any[]> {
    console.log(`📊 ${collectionName} データ取得開始 (${recordIds.length}件)`);

    const records: any[] = [];
    const batchSize = 50; // メモリ使用量を抑制

    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batchIds = recordIds.slice(i, i + batchSize);

      try {
        // バッチでドキュメントを取得
        const batchQuery = query(
          collection(db, collectionName),
          where('__name__', 'in', batchIds.slice(0, 10)) // Firestore制限: in句は10個まで
        );

        const snapshot = await getDocs(batchQuery);
        snapshot.forEach(doc => {
          records.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // 10個を超える場合は追加クエリ
        if (batchIds.length > 10) {
          for (let j = 10; j < batchIds.length; j++) {
            const singleQuery = query(
              collection(db, collectionName),
              where('__name__', '==', batchIds[j])
            );
            const singleSnapshot = await getDocs(singleQuery);
            singleSnapshot.forEach(doc => {
              records.push({
                id: doc.id,
                ...doc.data()
              });
            });
          }
        }

      } catch (error) {
        console.error(`バッチデータ取得エラー (${i}-${i + batchSize}):`, error);
      }
    }

    console.log(`✅ データ取得完了: ${records.length}件`);
    return records;
  }

  // =============================================================================
  // コレクション別データフォーマット
  // =============================================================================

  private formatRecordsForExport(collectionName: string, records: any[]): any[] {
    switch (collectionName) {
      case 'orders':
        return this.formatOrdersData(records);
      case 'processes':
        return this.formatProcessesData(records);
      case 'work-hours':
        return this.formatWorkHoursData(records);
      case 'daily-reports':
        return this.formatDailyReportsData(records);
      case 'companyTasks':
        return this.formatCompanyTasksData(records);
      case 'chat-messages':
        return this.formatChatMessagesData(records);
      case 'calendar-events':
        return this.formatCalendarEventsData(records);
      default:
        return this.formatGenericData(records);
    }
  }

  private formatOrdersData(records: any[]): any[] {
    return records.map(record => ({
      削除対象ID: record.id,
      管理番号: record.managementNumber || '',
      受注日: record.orderDate || record.createdAt?.split('T')[0] || '',
      客先名: record.client || record.clientName || '',
      案件名: record.projectName || record.productName || '',
      数量: record.quantity || '',
      金額: record.totalAmount ? `¥${Number(record.totalAmount).toLocaleString()}` : '',
      納期: record.dueDate || record.deliveryDate || '',
      ステータス: record.status || '',
      優先度: record.priority || '',
      担当者: record.assignee || '',
      作成日時: record.createdAt || '',
      更新日時: record.updatedAt || '',
      備考: record.notes || ''
    }));
  }

  private formatProcessesData(records: any[]): any[] {
    return records.map(record => ({
      削除対象ID: record.id,
      行番号: record.lineNumber || '',
      管理番号: record.managementNumber || '',
      工程名: record.name || '',
      客先: record.companyName || record.client || '',
      案件名: record.projectName || '',
      開始予定日: record.startDate || '',
      完了予定日: record.endDate || record.dueDate || '',
      実開始日: record.actualStartDate || '',
      実完了日: record.actualEndDate || '',
      担当者: record.assignee || '',
      使用機械: record.machineName || record.machine || '',
      予定工数: record.plannedHours ? `${record.plannedHours}時間` : '',
      実績工数: record.actualHours ? `${record.actualHours}時間` : '',
      進捗率: record.progress ? `${record.progress}%` : '',
      ステータス: record.status || '',
      優先度: record.priority || '',
      作成日時: record.createdAt || '',
      更新日時: record.updatedAt || '',
      備考: record.notes || record.description || ''
    }));
  }

  private formatWorkHoursData(records: any[]): any[] {
    return records.map(record => ({
      削除対象ID: record.id,
      日付: record.date || record.createdAt?.split('T')[0] || '',
      管理番号: record.managementNumber || '',
      案件名: record.projectName || '',
      客先: record.client || record.clientName || '',
      工程名: record.processName || record.name || '',
      作業者: record.assignee || record.workerName || '',
      機械: record.machineName || '',
      予定工数: record.plannedHours ? `${record.plannedHours}時間` : '',
      実績工数: record.actualHours ? `${record.actualHours}時間` : '',
      進捗率: record.progress ? `${record.progress}%` : record.progressRate ? `${record.progressRate}%` : '',
      予定コスト: record.plannedCost ? `¥${Number(record.plannedCost).toLocaleString()}` : '',
      実績コスト: record.actualCost ? `¥${Number(record.actualCost).toLocaleString()}` : '',
      ステータス: record.status || '',
      作成日時: record.createdAt || '',
      更新日時: record.updatedAt || '',
      備考: record.notes || record.description || ''
    }));
  }

  private formatDailyReportsData(records: any[]): any[] {
    const formattedData: any[] = [];

    records.forEach(record => {
      const baseRecord = {
        削除対象ID: record.id,
        日付: record.date || '',
        作業者: record.workerName || '',
        総作業時間: record.totalWorkMinutes ? `${Math.floor(record.totalWorkMinutes / 60)}時間${record.totalWorkMinutes % 60}分` : '',
        今日の目標: record.todaysGoals || '',
        今日の成果: record.todaysResults || '',
        うまくいったこと: record.whatWentWell || '',
        うまくいかなかったこと: record.whatDidntGoWell || '',
        管理への要望: record.requestsToManagement || '',
        提出状態: record.isSubmitted ? '提出済み' : '下書き',
        確認状態: record.approved ? '確認済み' : '未確認',
        作成日時: record.createdAt || '',
        更新日時: record.updatedAt || ''
      };

      // 作業時間詳細がある場合
      if (record.workTimeEntries && record.workTimeEntries.length > 0) {
        record.workTimeEntries.forEach((entry: any, index: number) => {
          if (index === 0) {
            formattedData.push({
              ...baseRecord,
              作業内容: entry.content || '',
              開始時刻: entry.startTime || '',
              終了時刻: entry.endTime || '',
              作業時間: `${entry.durationMinutes || 0}分`,
              工程名: entry.processName || ''
            });
          } else {
            formattedData.push({
              削除対象ID: '',
              日付: '',
              作業者: '',
              総作業時間: '',
              作業内容: entry.content || '',
              開始時刻: entry.startTime || '',
              終了時刻: entry.endTime || '',
              作業時間: `${entry.durationMinutes || 0}分`,
              工程名: entry.processName || '',
              今日の目標: '',
              今日の成果: '',
              うまくいったこと: '',
              うまくいかなかったこと: '',
              管理への要望: '',
              提出状態: '',
              確認状態: '',
              作成日時: '',
              更新日時: ''
            });
          }
        });
      } else {
        formattedData.push({
          ...baseRecord,
          作業内容: '',
          開始時刻: '',
          終了時刻: '',
          作業時間: '',
          工程名: ''
        });
      }
    });

    return formattedData;
  }

  private formatCompanyTasksData(records: any[]): any[] {
    return records.map(record => ({
      削除対象ID: record.id,
      タスク名: record.title || record.name || '',
      説明: record.description || '',
      ステータス: record.status || '',
      優先度: record.priority || '',
      担当者: record.assignee || record.assignedTo || '',
      開始日: record.startDate || '',
      期限: record.dueDate || record.endDate || '',
      完了日: record.completedAt ? record.completedAt.split('T')[0] : '',
      進捗率: record.progress ? `${record.progress}%` : '',
      カテゴリ: record.category || '',
      作成者: record.createdBy || '',
      作成日時: record.createdAt || '',
      更新日時: record.updatedAt || '',
      備考: record.notes || record.comments || ''
    }));
  }

  private formatChatMessagesData(records: any[]): any[] {
    return records.map(record => ({
      削除対象ID: record.id,
      送信者: record.senderName || record.userId || '',
      メッセージ: record.message || record.content || '',
      送信日時: record.timestamp || record.createdAt || '',
      チャンネル: record.channel || record.room || '',
      メッセージタイプ: record.type || 'text',
      返信先: record.replyTo || '',
      添付ファイル: record.attachments ? 'あり' : 'なし',
      編集済み: record.edited ? 'はい' : 'いいえ',
      削除済み: record.deleted ? 'はい' : 'いいえ'
    }));
  }

  private formatCalendarEventsData(records: any[]): any[] {
    return records.map(record => ({
      削除対象ID: record.id,
      イベントタイトル: record.title || record.summary || '',
      説明: record.description || '',
      開始日時: record.startDate || record.start || '',
      終了日時: record.endDate || record.end || '',
      終日イベント: record.allDay ? 'はい' : 'いいえ',
      場所: record.location || '',
      作成者: record.creator || record.createdBy || '',
      参加者: Array.isArray(record.attendees) ? record.attendees.join(', ') : '',
      ステータス: record.status || '',
      繰り返し: record.recurring ? 'あり' : 'なし',
      リマインダー: record.reminder || '',
      作成日時: record.createdAt || '',
      更新日時: record.updatedAt || ''
    }));
  }

  private formatGenericData(records: any[]): any[] {
    // 汎用フォーマット
    return records.map(record => ({
      削除対象ID: record.id,
      作成日時: record.createdAt || '',
      更新日時: record.updatedAt || '',
      ...record
    }));
  }

  // =============================================================================
  // エクスポート実行
  // =============================================================================

  async executeExport(exportRequest: ExportRequest): Promise<ExportResult> {
    console.log(`📤 エクスポート実行開始: ${exportRequest.collectionName} (${exportRequest.recordCount}件)`);

    try {
      // レコードデータを取得
      const records = await this.fetchRecordsForExport(
        exportRequest.collectionName,
        exportRequest.recordIds
      );

      if (records.length === 0) {
        return {
          success: false,
          recordCount: 0,
          exportFormat: exportRequest.exportFormat,
          errorMessage: 'エクスポート対象データが見つかりません',
          exportId: exportRequest.id
        };
      }

      // データをフォーマット
      const formattedData = this.formatRecordsForExport(exportRequest.collectionName, records);

      // ファイル名生成
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `削除前バックアップ_${exportRequest.collectionName}_${timestamp}_${exportRequest.id.slice(-6)}`;

      // エクスポート実行
      let filePath: string;
      if (exportRequest.exportFormat === 'excel') {
        exportToExcel(formattedData, filename, `${exportRequest.collectionName}_削除前データ`);
        filePath = `${filename}.xlsx`;
      } else {
        exportToCSV(formattedData, filename);
        filePath = `${filename}.csv`;
      }

      // 成功ログ
      logSecurityEvent('export_completed', {
        exportId: exportRequest.id,
        collectionName: exportRequest.collectionName,
        recordCount: records.length,
        filePath,
        format: exportRequest.exportFormat
      });

      console.log(`✅ エクスポート完了: ${filePath}`);

      return {
        success: true,
        filePath,
        recordCount: records.length,
        exportFormat: exportRequest.exportFormat,
        exportId: exportRequest.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'エクスポートエラーが発生しました';

      logSecurityEvent('export_failed', {
        exportId: exportRequest.id,
        collectionName: exportRequest.collectionName,
        error: errorMessage
      });

      console.error(`❌ エクスポートエラー (${exportRequest.collectionName}):`, error);

      return {
        success: false,
        recordCount: 0,
        exportFormat: exportRequest.exportFormat,
        errorMessage,
        exportId: exportRequest.id
      };
    }
  }

  // =============================================================================
  // バッチエクスポート
  // =============================================================================

  async executeBatchExport(batchRequest: BatchExportRequest): Promise<{
    success: boolean;
    results: ExportResult[];
    overallPath?: string;
    errors: string[];
  }> {
    console.log(`📦 バッチエクスポート開始: ${batchRequest.collections.length}コレクション`);

    const results: ExportResult[] = [];
    const errors: string[] = [];

    // 各コレクションを順次エクスポート
    for (const collectionInfo of batchRequest.collections) {
      try {
        const exportRequest: ExportRequest = {
          id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          collectionName: collectionInfo.name,
          recordIds: collectionInfo.recordIds,
          requestedBy: batchRequest.requestedBy,
          requestedAt: new Date().toISOString(),
          status: 'processing',
          exportFormat: batchRequest.format,
          recordCount: collectionInfo.recordIds.length,
          deletionScheduled: true,
          urgency: batchRequest.urgency
        };

        const result = await this.executeExport(exportRequest);
        results.push(result);

        if (!result.success) {
          errors.push(`${collectionInfo.name}: ${result.errorMessage}`);
        }

      } catch (error) {
        const errorMessage = `${collectionInfo.name}: ${error instanceof Error ? error.message : '不明なエラー'}`;
        errors.push(errorMessage);
      }
    }

    const successCount = results.filter(r => r.success).length;

    logSecurityEvent('batch_export_completed', {
      collectionCount: batchRequest.collections.length,
      successCount,
      errorCount: errors.length,
      format: batchRequest.format,
      urgency: batchRequest.urgency
    });

    console.log(`🎯 バッチエクスポート完了: 成功 ${successCount}/${batchRequest.collections.length}`);

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  // =============================================================================
  // エクスポート要求一覧
  // =============================================================================

  async getExportRequests(): Promise<ExportRequest[]> {
    try {
      const requestsQuery = query(
        collection(db, 'export-requests'),
        orderBy('requestedAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(requestsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ExportRequest[];
    } catch (error) {
      console.error('エクスポート要求取得エラー:', error);
      return [];
    }
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const deletionExportManager = DeletionExportManagerImpl.getInstance();

export default DeletionExportManagerImpl;