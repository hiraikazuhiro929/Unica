// 強化版データアーカイブ管理システム
// 6ヶ月アーカイブ・3ヶ月削除・通知システム統合

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  writeBatch,
  orderBy,
  limit,
  deleteDoc,
  getDoc,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logSecurityEvent } from './securityUtils';
import { enhancedExportManager } from './enhancedExportUtils';
import { Resend } from 'resend';

// =============================================================================
// 型定義
// =============================================================================

export interface ArchiveWarning {
  id: string;
  recordId: string;
  collectionName: string;
  managementNumber?: string;
  title: string;
  warningLevel: 'info' | 'warning' | 'critical';
  daysUntilAction: number; // アーカイブまたは削除までの日数
  actionDate: string; // アーカイブまたは削除予定日
  actionType: 'archive' | 'delete'; // アクション種別
  createdAt: string;
  userResponse?: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now';
  responseDate?: string;
  isRead: boolean;
  isActive: boolean;
  remindersSent: number;
  notificationsSent: {
    email: boolean;
    browser: boolean;
    dashboard: boolean;
  };
}

export interface ArchiveRecord {
  id: string;
  originalCollectionName: string;
  originalRecordId: string;
  archivedAt: string;
  archivedBy: string;
  reason: 'retention_policy' | 'user_request' | 'system_maintenance';
  originalData: any;
  metadata: {
    originalCreatedAt?: string;
    originalUpdatedAt?: string;
    originalCompletedAt?: string;
    dataSize: number;
    fieldsCount: number;
  };
}

export interface ChatDeletionRecord {
  id: string;
  originalCollectionName: string;
  deletedRecordsCount: number;
  deletedAt: string;
  deletedBy: string;
  reason: 'retention_policy' | 'user_request';
  dateRange: {
    from: string;
    to: string;
  };
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    recipients: string[];
    sender: string;
  };
  browser: {
    enabled: boolean;
    permission: 'granted' | 'denied' | 'default';
  };
  dashboard: {
    enabled: boolean;
    showCriticalOnly: boolean;
  };
}

export interface ArchiveSettings {
  id?: string;

  // ビジネスデータのアーカイブ設定（6ヶ月）
  businessDataPolicy: {
    archiveDays: number; // 完了から何日後にアーカイブするか（デフォルト：180日）
    warningDays: number[]; // 警告タイミング（例：[30, 7, 1]）
    requireExportBeforeArchive: boolean; // アーカイブ前エクスポート必須
    autoExportBeforeArchive: boolean; // 自動エクスポート
    collections: string[]; // 対象コレクション
  };

  // チャットデータの削除設定（3ヶ月）
  chatDataPolicy: {
    deleteDays: number; // 作成から何日後に削除するか（デフォルト：90日）
    warningDays: number[]; // 警告タイミング（例：[7, 1]）
    requireExportBeforeDelete: boolean; // 削除前エクスポート（通常はfalse）
    collections: string[]; // 対象コレクション
  };

  gracePeriodDays: number; // アクション延期期間
  notificationSettings: NotificationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchiveStatistics {
  totalWarnings: number;
  criticalWarnings: number;
  warningWarnings: number;
  infoWarnings: number;
  exportedCount: number;
  extendedCount: number;
  deletedCount: number;
  pendingCount: number;
}

export interface DataRecord {
  id: string;
  status: string;
  completedAt?: string;
  updatedAt: string;
  createdAt: string;
  managementNumber?: string;
  title?: string;
  name?: string;
  [key: string]: any;
}

// =============================================================================
// 強化版アーカイブマネージャークラス
// =============================================================================

class EnhancedArchiveManagerImpl {
  private static instance: EnhancedArchiveManagerImpl;

  private constructor() {}

  public static getInstance(): EnhancedArchiveManagerImpl {
    if (!EnhancedArchiveManagerImpl.instance) {
      EnhancedArchiveManagerImpl.instance = new EnhancedArchiveManagerImpl();
    }
    return EnhancedArchiveManagerImpl.instance;
  }

  // =============================================================================
  // アーカイブ設定管理
  // =============================================================================

  async getArchiveSettings(): Promise<ArchiveSettings> {
    try {
      const settingsQuery = query(
        collection(db, 'archive-settings'),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(settingsQuery);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as ArchiveSettings;
      }
    } catch (error) {
      console.error('設定取得エラー:', error);
    }

    // デフォルト設定を返す
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): ArchiveSettings {
    return {
      businessDataPolicy: {
        archiveDays: 180, // 6ヶ月
        warningDays: [30, 7, 1], // 30日前、7日前、1日前
        requireExportBeforeArchive: true,
        autoExportBeforeArchive: false,
        collections: ['orders', 'processes', 'work-hours', 'daily-reports']
      },
      chatDataPolicy: {
        deleteDays: 90, // 3ヶ月
        warningDays: [7, 1], // 7日前、1日前
        requireExportBeforeDelete: false,
        collections: ['chat-messages', 'conversations']
      },
      gracePeriodDays: 30,
      notificationSettings: {
        email: {
          enabled: true,
          recipients: [],
          sender: 'noreply@unica-system.com'
        },
        browser: {
          enabled: true,
          permission: 'default'
        },
        dashboard: {
          enabled: true,
          showCriticalOnly: false
        }
      }
    };
  }

  async updateArchiveSettings(settings: Partial<ArchiveSettings>): Promise<string> {
    const currentSettings = await this.getArchiveSettings();
    const now = new Date().toISOString();

    const updatedSettings: Omit<ArchiveSettings, 'id'> = {
      ...currentSettings,
      ...settings,
      updatedAt: now,
      createdAt: currentSettings.createdAt || now
    };

    if (currentSettings.id) {
      const settingsRef = doc(db, 'archive-settings', currentSettings.id);
      await updateDoc(settingsRef, updatedSettings);

      logSecurityEvent('archive_settings_updated', {
        settingsId: currentSettings.id,
        changes: Object.keys(settings)
      });

      return currentSettings.id;
    } else {
      const docRef = await addDoc(collection(db, 'archive-settings'), updatedSettings);

      logSecurityEvent('archive_settings_created', {
        settingsId: docRef.id
      });

      return docRef.id;
    }
  }

  // =============================================================================
  // 警告システム
  // =============================================================================

  // =============================================================================
  // アーカイブ処理（コレクション間移動）
  // =============================================================================

  async archiveRecords(
    collectionName: string,
    recordIds: string[],
    reason: 'retention_policy' | 'user_request' = 'retention_policy',
    userId: string = 'system'
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`📦 アーカイブ開始: ${collectionName} (${recordIds.length}件)`);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const batchSize = 500; // Firestore制限

    const archiveCollectionName = `archived-${collectionName}`;

    try {
      // バッチ処理でアーカイブ
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = recordIds.slice(i, i + batchSize);

        for (const recordId of batchIds) {
          try {
            // 元データを取得
            const originalDocRef = doc(db, collectionName, recordId);
            const originalDoc = await getDoc(originalDocRef);

            if (!originalDoc.exists()) {
              failed++;
              errors.push(`レコードが見つかりません: ${recordId}`);
              continue;
            }

            const originalData = originalDoc.data();

            // アーカイブレコードを作成
            const archiveRecord: Omit<ArchiveRecord, 'id'> = {
              originalCollectionName: collectionName,
              originalRecordId: recordId,
              archivedAt: new Date().toISOString(),
              archivedBy: userId,
              reason,
              originalData,
              metadata: {
                originalCreatedAt: originalData.createdAt,
                originalUpdatedAt: originalData.updatedAt,
                originalCompletedAt: originalData.completedAt,
                dataSize: JSON.stringify(originalData).length,
                fieldsCount: Object.keys(originalData).length
              }
            };

            // アーカイブコレクションに追加
            const archiveDocRef = doc(collection(db, archiveCollectionName));
            batch.set(archiveDocRef, archiveRecord);

            // 元コレクションから削除
            batch.delete(originalDocRef);

            success++;
          } catch (error) {
            failed++;
            errors.push(`${recordId}: ${error instanceof Error ? error.message : '不明なエラー'}`);
          }
        }

        // バッチを実行
        try {
          await batch.commit();
          console.log(`✅ バッチアーカイブ完了: ${Math.min(batchSize, recordIds.length - i)}件`);
        } catch (error) {
          console.error('❌ バッチアーカイブエラー:', error);
          failed += Math.min(batchSize, recordIds.length - i);
          errors.push('バッチ処理エラー');
        }
      }

      logSecurityEvent('records_archived', {
        collectionName,
        archiveCollectionName,
        totalRecords: recordIds.length,
        successCount: success,
        failedCount: failed,
        reason,
        archivedBy: userId
      });

      console.log(`🎯 アーカイブ完了: 成功 ${success}件, 失敗 ${failed}件`);

      return { success, failed, errors };

    } catch (error) {
      console.error(`❌ アーカイブ処理エラー (${collectionName}):`, error);
      return {
        success: 0,
        failed: recordIds.length,
        errors: [error instanceof Error ? error.message : '不明なエラー']
      };
    }
  }

  async deleteRecords(
    collectionName: string,
    recordIds: string[],
    reason: 'retention_policy' | 'user_request' = 'retention_policy',
    userId: string = 'system'
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🗑️ レコード削除開始: ${collectionName} (${recordIds.length}件)`);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const batchSize = 500;

    try {
      // 削除ログの作成（チャットデータ用）
      if (collectionName === 'chat-messages' || collectionName === 'conversations') {
        const deletionRecord: Omit<ChatDeletionRecord, 'id'> = {
          originalCollectionName: collectionName,
          deletedRecordsCount: recordIds.length,
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
          reason,
          dateRange: {
            from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90日前
            to: new Date().toISOString()
          }
        };

        await addDoc(collection(db, 'chat-deletion-logs'), deletionRecord);
      }

      // バッチ削除
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = recordIds.slice(i, i + batchSize);

        for (const recordId of batchIds) {
          const docRef = doc(db, collectionName, recordId);
          batch.delete(docRef);
        }

        try {
          await batch.commit();
          success += batchIds.length;
          console.log(`✅ バッチ削除完了: ${batchIds.length}件`);
        } catch (error) {
          failed += batchIds.length;
          errors.push(`バッチ削除エラー: ${error instanceof Error ? error.message : '不明'}`);
        }
      }

      logSecurityEvent('records_deleted', {
        collectionName,
        totalRecords: recordIds.length,
        successCount: success,
        failedCount: failed,
        reason,
        deletedBy: userId
      });

      console.log(`🎯 削除完了: 成功 ${success}件, 失敗 ${failed}件`);

      return { success, failed, errors };

    } catch (error) {
      console.error(`❌ 削除処理エラー (${collectionName}):`, error);
      return {
        success: 0,
        failed: recordIds.length,
        errors: [error instanceof Error ? error.message : '不明なエラー']
      };
    }
  }

  async generateWarningsForCollection(collectionName: string): Promise<ArchiveWarning[]> {
    console.log(`🔍 警告生成開始: ${collectionName}`);

    const settings = await this.getArchiveSettings();
    const now = new Date();
    const warnings: ArchiveWarning[] = [];

    try {
      // コレクションの種類を判定
      const isBusinessData = settings.businessDataPolicy.collections.includes(collectionName);
      const isChatData = settings.chatDataPolicy.collections.includes(collectionName);

      if (!isBusinessData && !isChatData) {
        console.log(`⏭️ スキップ: ${collectionName} (対象外)`);
        return [];
      }

      const policy = isBusinessData ? settings.businessDataPolicy : settings.chatDataPolicy;
      const actionType: 'archive' | 'delete' = isBusinessData ? 'archive' : 'delete';
      const actionDays = isBusinessData ? policy.archiveDays : (policy as any).deleteDays;

      // 完了済みレコードを取得
      let targetQuery;
      if (isBusinessData) {
        targetQuery = query(
          collection(db, collectionName),
          where('status', '==', 'completed'),
          orderBy('completedAt', 'asc'),
          limit(100)
        );
      } else {
        // チャットデータは作成日で判定
        targetQuery = query(
          collection(db, collectionName),
          orderBy('createdAt', 'asc'),
          limit(100)
        );
      }

      const querySnapshot = await getDocs(targetQuery);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DataRecord[];

      console.log(`📊 対象レコード: ${records.length}件`);

      for (const record of records) {
        const baseDate = isBusinessData
          ? new Date(record.completedAt || record.updatedAt)
          : new Date(record.createdAt);

        // アクション予定日を計算
        const actionDate = new Date(baseDate);
        actionDate.setDate(actionDate.getDate() + actionDays);

        const daysUntilAction = Math.floor(
          (actionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 警告レベルを判定
        let warningLevel: 'info' | 'warning' | 'critical' | null = null;
        const warningDays = policy.warningDays;

        if (daysUntilAction <= warningDays[warningDays.length - 1]) {
          warningLevel = 'critical';
        } else if (daysUntilAction <= warningDays[warningDays.length - 2] || 7) {
          warningLevel = 'warning';
        } else if (daysUntilAction <= warningDays[0] || 30) {
          warningLevel = 'info';
        }

        if (warningLevel && daysUntilAction >= 0) {
          // 既存の警告をチェック
          const existingWarningQuery = query(
            collection(db, 'archive-warnings'),
            where('recordId', '==', record.id),
            where('collectionName', '==', collectionName),
            where('isActive', '==', true)
          );

          const existingWarnings = await getDocs(existingWarningQuery);

          if (existingWarnings.empty) {
            // 新しい警告を作成
            const warning: Omit<ArchiveWarning, 'id'> = {
              recordId: record.id,
              collectionName,
              managementNumber: record.managementNumber,
              title: record.title || record.name || `${collectionName} - ${record.id}`,
              warningLevel,
              daysUntilAction,
              actionDate: actionDate.toISOString(),
              actionType,
              createdAt: now.toISOString(),
              isRead: false,
              isActive: true,
              remindersSent: 0,
              notificationsSent: {
                email: false,
                browser: false,
                dashboard: false
              }
            };

            const warningRef = await addDoc(collection(db, 'archive-warnings'), warning);
            warnings.push({
              id: warningRef.id,
              ...warning
            });
          } else {
            // 既存の警告を更新
            const existingWarning = existingWarnings.docs[0];
            await updateDoc(existingWarning.ref, {
              daysUntilAction,
              warningLevel,
              actionDate: actionDate.toISOString(),
              updatedAt: now.toISOString()
            });

            const updatedWarning = {
              id: existingWarning.id,
              ...existingWarning.data(),
              daysUntilAction,
              warningLevel,
              actionDate: actionDate.toISOString()
            } as ArchiveWarning;

            warnings.push(updatedWarning);
          }
        }
      }

      logSecurityEvent('archive_warnings_generated', {
        collectionName,
        actionType,
        totalRecords: records.length,
        warningsGenerated: warnings.length,
        criticalCount: warnings.filter(w => w.warningLevel === 'critical').length,
        warningCount: warnings.filter(w => w.warningLevel === 'warning').length,
        infoCount: warnings.filter(w => w.warningLevel === 'info').length
      });

      console.log(`✅ 警告生成完了: ${warnings.length}件`);
      return warnings;

    } catch (error) {
      console.error(`❌ 警告生成エラー (${collectionName}):`, error);
      return [];
    }
  }

  async getAllActiveWarnings(): Promise<ArchiveWarning[]> {
    try {
      const warningsQuery = query(
        collection(db, 'archive-warnings'),
        where('isActive', '==', true),
        orderBy('daysUntilAction', 'asc')
      );

      const querySnapshot = await getDocs(warningsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArchiveWarning[];
    } catch (error) {
      console.error('警告取得エラー:', error);
      return [];
    }
  }

  async getWarningsStatistics(): Promise<ArchiveStatistics & {
    archiveWarnings: number;
    deleteWarnings: number;
    businessData: number;
    chatData: number;
  }> {
    const warnings = await this.getAllActiveWarnings();

    return {
      totalWarnings: warnings.length,
      criticalWarnings: warnings.filter(w => w.warningLevel === 'critical').length,
      warningWarnings: warnings.filter(w => w.warningLevel === 'warning').length,
      infoWarnings: warnings.filter(w => w.warningLevel === 'info').length,
      exportedCount: warnings.filter(w => w.userResponse === 'export').length,
      extendedCount: warnings.filter(w => w.userResponse === 'extend').length,
      deletedCount: warnings.filter(w => w.userResponse === 'delete').length,
      pendingCount: warnings.filter(w => !w.userResponse).length,
      archiveWarnings: warnings.filter(w => w.actionType === 'archive').length,
      deleteWarnings: warnings.filter(w => w.actionType === 'delete').length,
      businessData: warnings.filter(w => ['orders', 'processes', 'work-hours', 'daily-reports'].includes(w.collectionName)).length,
      chatData: warnings.filter(w => ['chat-messages', 'conversations'].includes(w.collectionName)).length
    };
  }

  // =============================================================================
  // ユーザー応答処理
  // =============================================================================

  async handleUserResponse(
    warningId: string,
    response: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ): Promise<boolean> {
    try {
      const warningRef = doc(db, 'archive-warnings', warningId);
      const now = new Date().toISOString();

      // 警告を更新
      await updateDoc(warningRef, {
        userResponse: response,
        responseDate: now,
        isRead: true,
        updatedAt: now
      });

      // 応答に基づく追加処理
      if (response === 'extend' && additionalDays) {
        // アクション予定日を延長
        const warningDoc = await getDoc(warningRef);
        if (warningDoc.exists()) {
          const warning = warningDoc.data() as ArchiveWarning;
          const newActionDate = new Date(warning.actionDate);
          newActionDate.setDate(newActionDate.getDate() + additionalDays);

          await updateDoc(warningRef, {
            actionDate: newActionDate.toISOString(),
            daysUntilAction: warning.daysUntilAction + additionalDays
          });
        }
      } else if (response === 'archive_now') {
        // 即座アーカイブ実行
        const warningDoc = await getDoc(warningRef);
        if (warningDoc.exists()) {
          const warning = warningDoc.data() as ArchiveWarning;

          if (warning.actionType === 'archive') {
            await this.archiveRecords(
              warning.collectionName,
              [warning.recordId],
              'user_request',
              'user_manual'
            );
          } else {
            await this.deleteRecords(
              warning.collectionName,
              [warning.recordId],
              'user_request',
              'user_manual'
            );
          }

          // 警告を非アクティブに
          await updateDoc(warningRef, {
            isActive: false,
            completedAt: now
          });
        }
      }

      logSecurityEvent('archive_warning_response', {
        warningId,
        response,
        additionalDays
      });

      return true;
    } catch (error) {
      console.error('応答処理エラー:', error);
      return false;
    }
  }

  async markWarningAsRead(warningId: string): Promise<boolean> {
    try {
      const warningRef = doc(db, 'archive-warnings', warningId);
      await updateDoc(warningRef, {
        isRead: true,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('既読処理エラー:', error);
      return false;
    }
  }

  // =============================================================================
  // 全コレクション警告生成
  // =============================================================================

  async generateAllWarnings(): Promise<ArchiveWarning[]> {
    console.log('🔄 全コレクション警告生成開始');

    const settings = await this.getArchiveSettings();
    const allCollections = [
      ...settings.businessDataPolicy.collections,
      ...settings.chatDataPolicy.collections
    ];

    const allWarnings: ArchiveWarning[] = [];

    // 並列処理で高速化
    const warningPromises = allCollections.map(collectionName =>
      this.generateWarningsForCollection(collectionName)
    );

    try {
      const warningResults = await Promise.all(warningPromises);
      warningResults.forEach(warnings => allWarnings.push(...warnings));
    } catch (error) {
      console.error('並列警告生成エラー:', error);

      // フォールバック: 順次処理
      for (const collectionName of allCollections) {
        try {
          const warnings = await this.generateWarningsForCollection(collectionName);
          allWarnings.push(...warnings);
        } catch (error) {
          console.error(`警告生成エラー (${collectionName}):`, error);
        }
      }
    }

    console.log(`✅ 全警告生成完了: ${allWarnings.length}件`);
    return allWarnings;
  }

  // =============================================================================
  // 通知システム
  // =============================================================================

  async sendNotifications(warnings: ArchiveWarning[]): Promise<{
    email: { sent: number; failed: number };
    browser: { sent: number; failed: number };
    dashboard: { sent: number; failed: number };
  }> {
    console.log(`📨 通知送信開始: ${warnings.length}件の警告`);

    const settings = await this.getArchiveSettings();
    const results = {
      email: { sent: 0, failed: 0 },
      browser: { sent: 0, failed: 0 },
      dashboard: { sent: 0, failed: 0 }
    };

    // メール通知
    if (settings.notificationSettings.email.enabled) {
      const emailResult = await this.sendEmailNotifications(warnings, settings);
      results.email = emailResult;
    }

    // ブラウザ通知
    if (settings.notificationSettings.browser.enabled) {
      const browserResult = await this.sendBrowserNotifications(warnings, settings);
      results.browser = browserResult;
    }

    // ダッシュボード通知
    if (settings.notificationSettings.dashboard.enabled) {
      const dashboardResult = await this.sendDashboardNotifications(warnings, settings);
      results.dashboard = dashboardResult;
    }

    logSecurityEvent('notifications_sent', {
      totalWarnings: warnings.length,
      results
    });

    console.log(`✅ 通知送信完了:`, results);
    return results;
  }

  private async sendEmailNotifications(
    warnings: ArchiveWarning[],
    settings: ArchiveSettings
  ): Promise<{ sent: number; failed: number }> {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEYが設定されていません');
      return { sent: 0, failed: warnings.length };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;
    let failed = 0;

    // 警告レベル別にグループ化
    const groupedWarnings = {
      critical: warnings.filter(w => w.warningLevel === 'critical'),
      warning: warnings.filter(w => w.warningLevel === 'warning'),
      info: warnings.filter(w => w.warningLevel === 'info')
    };

    for (const recipient of settings.notificationSettings.email.recipients) {
      try {
        const emailContent = this.generateEmailContent(groupedWarnings);

        await resend.emails.send({
          from: settings.notificationSettings.email.sender,
          to: [recipient],
          subject: `[Unica] データ管理通知 - ${warnings.length}件の警告`,
          html: emailContent
        });

        sent++;
        console.log(`✅ メール送信成功: ${recipient}`);
      } catch (error) {
        failed++;
        console.error(`❌ メール送信エラー (${recipient}):`, error);
      }
    }

    return { sent, failed };
  }

  private generateEmailContent(warnings: {
    critical: ArchiveWarning[];
    warning: ArchiveWarning[];
    info: ArchiveWarning[];
  }): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h1 style="color: #2c3e50;">📊 Unica データ管理通知</h1>

          ${warnings.critical.length > 0 ? `
          <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 10px 0;">
            <h2 style="color: #c62828; margin-top: 0;">🚨 緊急通知 (${warnings.critical.length}件)</h2>
            <p>以下のデータは間もなくアーカイブまたは削除される予定です。</p>
            ${warnings.critical.map(w => `
              <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
                <strong>${w.title}</strong><br>
                <small>${w.collectionName} - ${w.daysUntilAction}日後に${w.actionType === 'archive' ? 'アーカイブ' : '削除'}</small>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${warnings.warning.length > 0 ? `
          <div style="background: #fff8e1; border-left: 4px solid #ff9800; padding: 15px; margin: 10px 0;">
            <h2 style="color: #f57c00; margin-top: 0;">⚠️ 警告 (${warnings.warning.length}件)</h2>
            ${warnings.warning.map(w => `
              <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
                <strong>${w.title}</strong><br>
                <small>${w.collectionName} - ${w.daysUntilAction}日後に${w.actionType === 'archive' ? 'アーカイブ' : '削除'}</small>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px;">
            <h3>🔧 対応方法</h3>
            <ul>
              <li><strong>エクスポート</strong>: 必要なデータは事前にエクスポートしてください</li>
              <li><strong>保持期間延長</strong>: 続けて使用したい場合は延長してください</li>
              <li><strong>手動削除</strong>: 不要なデータは手動で削除できます</li>
            </ul>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/archive" style="color: #1976d2;">アーカイブ管理ページへ</a></p>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            このメールはUnica系から自動送信されています。<br>
            送信日時: ${new Date().toLocaleString('ja-JP')}
          </p>
        </body>
      </html>
    `;
  }

  private async sendBrowserNotifications(
    warnings: ArchiveWarning[],
    settings: ArchiveSettings
  ): Promise<{ sent: number; failed: number }> {
    // ブラウザ通知はクライアントサイドで実行するため、
    // ここでは通知データをFirestoreに保存
    try {
      const notificationData = {
        type: 'archive_warning',
        title: `データ管理通知: ${warnings.length}件の警告`,
        message: `${warnings.filter(w => w.warningLevel === 'critical').length}件の緊急通知を含みます。`,
        warnings: warnings.slice(0, 5), // 最初の5件のみ
        createdAt: new Date().toISOString(),
        isRead: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7日後
      };

      await addDoc(collection(db, 'browser-notifications'), notificationData);

      return { sent: 1, failed: 0 };
    } catch (error) {
      console.error('❌ ブラウザ通知データ保存エラー:', error);
      return { sent: 0, failed: 1 };
    }
  }

  private async sendDashboardNotifications(
    warnings: ArchiveWarning[],
    settings: ArchiveSettings
  ): Promise<{ sent: number; failed: number }> {
    try {
      const notificationData = {
        type: 'dashboard_notification',
        title: `データ管理通知`,
        summary: {
          total: warnings.length,
          critical: warnings.filter(w => w.warningLevel === 'critical').length,
          warning: warnings.filter(w => w.warningLevel === 'warning').length,
          info: warnings.filter(w => w.warningLevel === 'info').length
        },
        warnings: settings.notificationSettings.dashboard.showCriticalOnly
          ? warnings.filter(w => w.warningLevel === 'critical')
          : warnings,
        createdAt: new Date().toISOString(),
        isRead: false
      };

      await addDoc(collection(db, 'dashboard-notifications'), notificationData);

      return { sent: 1, failed: 0 };
    } catch (error) {
      console.error('❌ ダッシュボード通知データ保存エラー:', error);
      return { sent: 0, failed: 1 };
    }
  }

  // =============================================================================
  // クリーンアップ
  // =============================================================================

  async cleanupOldWarnings(): Promise<number> {
    try {
      // 30日以上古い非アクティブな警告を削除
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const oldWarningsQuery = query(
        collection(db, 'archive-warnings'),
        where('isActive', '==', false),
        where('createdAt', '<', cutoffDate.toISOString())
      );

      const querySnapshot = await getDocs(oldWarningsQuery);
      const batch = writeBatch(db);

      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`🧹 古い警告をクリーンアップ: ${querySnapshot.size}件`);
      return querySnapshot.size;
    } catch (error) {
      console.error('クリーンアップエラー:', error);
      return 0;
    }
  }

  // =============================================================================
  // 統計とレポート
  // =============================================================================

  async getArchiveReport(): Promise<{
    settings: ArchiveSettings;
    statistics: ArchiveStatistics;
    recentWarnings: ArchiveWarning[];
    upcomingDeletions: ArchiveWarning[];
  }> {
    const [settings, statistics, allWarnings] = await Promise.all([
      this.getArchiveSettings(),
      this.getWarningsStatistics(),
      this.getAllActiveWarnings()
    ]);

    const recentWarnings = allWarnings
      .filter(w => !w.isRead)
      .slice(0, 10);

    const upcomingActions = allWarnings
      .filter(w => w.warningLevel === 'critical')
      .sort((a, b) => a.daysUntilAction - b.daysUntilAction)
      .slice(0, 5);

    return {
      settings,
      statistics,
      recentWarnings,
      upcomingDeletions
    };
  }

  // =============================================================================
  // バッチ操作
  // =============================================================================

  async handleBulkResponse(
    warningIds: string[],
    response: 'extend' | 'delete' | 'export' | 'ignore' | 'archive_now',
    additionalDays?: number
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // バッチ処理で高速化
    if (response === 'export') {
      // エクスポートは別処理
      return await this.handleBulkExport(warningIds);
    }

    for (const warningId of warningIds) {
      try {
        const result = await this.handleUserResponse(warningId, response, additionalDays);
        if (result) {
          success++;
        } else {
          failed++;
          errors.push(`警告 ${warningId} の処理に失敗`);
        }
      } catch (error) {
        failed++;
        errors.push(`警告 ${warningId}: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }

    logSecurityEvent('archive_bulk_response', {
      warningCount: warningIds.length,
      response,
      success,
      failed,
      additionalDays
    });

    return { success, failed, errors };
  }

  private async handleBulkExport(warningIds: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      // 警告からコレクション別にグループ化
      const warningsByCollection = new Map<string, string[]>();

      for (const warningId of warningIds) {
        const warningRef = doc(db, 'archive-warnings', warningId);
        const warningDoc = await getDoc(warningRef);

        if (warningDoc.exists()) {
          const warning = warningDoc.data() as ArchiveWarning;
          if (!warningsByCollection.has(warning.collectionName)) {
            warningsByCollection.set(warning.collectionName, []);
          }
          warningsByCollection.get(warning.collectionName)?.push(warning.recordId);
        }
      }

      // コレクション別にエクスポート
      const collections = Array.from(warningsByCollection.keys());
      const exportResult = await enhancedExportManager.exportMultipleCollections(collections, {
        format: 'zip',
        batchSize: 1000
      });

      if (exportResult.success) {
        // エクスポート成功時は全ての警告を更新
        const now = new Date().toISOString();
        const batch = writeBatch(db);

        for (const warningId of warningIds) {
          const warningRef = doc(db, 'archive-warnings', warningId);
          batch.update(warningRef, {
            userResponse: 'export',
            responseDate: now,
            isRead: true,
            updatedAt: now
          });
        }

        await batch.commit();

        return { success: warningIds.length, failed: 0, errors: [] };
      } else {
        return {
          success: 0,
          failed: warningIds.length,
          errors: [exportResult.error || 'エクスポートエラー']
        };
      }
    } catch (error) {
      return {
        success: 0,
        failed: warningIds.length,
        errors: [error instanceof Error ? error.message : '不明なエラー']
      };
    }
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const enhancedArchiveManager = EnhancedArchiveManagerImpl.getInstance();

// =============================================================================
// デフォルト設定
// =============================================================================

export const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = {
  businessDataPolicy: {
    archiveDays: 180, // 6ヶ月
    warningDays: [30, 7, 1], // 30日前、7日前、1日前
    requireExportBeforeArchive: true,
    autoExportBeforeArchive: false,
    collections: ['orders', 'processes', 'work-hours', 'daily-reports']
  },
  chatDataPolicy: {
    deleteDays: 90, // 3ヶ月
    warningDays: [7, 1], // 7日前、1日前
    requireExportBeforeDelete: false,
    collections: ['chat-messages', 'conversations']
  },
  gracePeriodDays: 30,
  notificationSettings: {
    email: {
      enabled: true,
      recipients: [],
      sender: 'noreply@unica-system.com'
    },
    browser: {
      enabled: true,
      permission: 'default'
    },
    dashboard: {
      enabled: true,
      showCriticalOnly: false
    }
  }
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

export const initializeEnhancedArchive = async (): Promise<void> => {
  console.log('🔧 強化版アーカイブシステム初期化中...');

  try {
    // デフォルト設定を作成
    await enhancedArchiveManager.updateArchiveSettings(DEFAULT_ARCHIVE_SETTINGS);

    // 初回警告生成
    const warnings = await enhancedArchiveManager.generateAllWarnings();

    // 通知送信
    if (warnings.length > 0) {
      await enhancedArchiveManager.sendNotifications(warnings);
    }

    console.log('✅ 強化版アーカイブシステム初期化完了');
  } catch (error) {
    console.error('❌ 初期化エラー:', error);
  }
};

// =============================================================================
// メインアーカイブ処理関数
// =============================================================================

export const processArchiveAndDeletion = async (): Promise<{
  archived: { success: number; failed: number };
  deleted: { success: number; failed: number };
  warnings: ArchiveWarning[];
}> => {
  console.log('🔄 メインアーカイブ処理開始');

  const settings = await enhancedArchiveManager.getArchiveSettings();
  let totalArchived = { success: 0, failed: 0 };
  let totalDeleted = { success: 0, failed: 0 };

  // ビジネスデータのアーカイブ処理
  for (const collectionName of settings.businessDataPolicy.collections) {
    try {
      const readyForArchive = await findRecordsReadyForAction(
        collectionName,
        settings.businessDataPolicy.archiveDays,
        'completed'
      );

      if (readyForArchive.length > 0) {
        const result = await enhancedArchiveManager.archiveRecords(
          collectionName,
          readyForArchive,
          'retention_policy'
        );
        totalArchived.success += result.success;
        totalArchived.failed += result.failed;
      }
    } catch (error) {
      console.error(`❌ ${collectionName} アーカイブエラー:`, error);
    }
  }

  // チャットデータの削除処理
  for (const collectionName of settings.chatDataPolicy.collections) {
    try {
      const readyForDeletion = await findRecordsReadyForAction(
        collectionName,
        settings.chatDataPolicy.deleteDays,
        null // チャットデータはステータスに関係なく作成日で判定
      );

      if (readyForDeletion.length > 0) {
        const result = await enhancedArchiveManager.deleteRecords(
          collectionName,
          readyForDeletion,
          'retention_policy'
        );
        totalDeleted.success += result.success;
        totalDeleted.failed += result.failed;
      }
    } catch (error) {
      console.error(`❌ ${collectionName} 削除エラー:`, error);
    }
  }

  // 警告生成と通知
  const warnings = await enhancedArchiveManager.generateAllWarnings();
  if (warnings.length > 0) {
    await enhancedArchiveManager.sendNotifications(warnings);
  }

  const result = {
    archived: totalArchived,
    deleted: totalDeleted,
    warnings
  };

  logSecurityEvent('archive_deletion_process_completed', result);

  console.log('🎆 メインアーカイブ処理完了:', result);
  return result;
};

export const findRecordsReadyForAction = async (
  collectionName: string,
  days: number,
  statusFilter: string | null
): Promise<string[]> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    let queryRef = collection(db, collectionName);

    if (statusFilter) {
      queryRef = query(
        queryRef,
        where('status', '==', statusFilter),
        where('completedAt', '<', cutoffDate.toISOString()),
        orderBy('completedAt', 'asc'),
        limit(500)
      );
    } else {
      queryRef = query(
        queryRef,
        where('createdAt', '<', cutoffDate.toISOString()),
        orderBy('createdAt', 'asc'),
        limit(500)
      );
    }

    const snapshot = await getDocs(queryRef);
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error(`❌ ${collectionName} アクション対象検索エラー:`, error);
    return [];
  }
};

// =============================================================================
// 便利な関数
// =============================================================================

export const getWarningLevelColor = (level: 'info' | 'warning' | 'critical'): string => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getWarningLevelIcon = (level: 'info' | 'warning' | 'critical'): string => {
  switch (level) {
    case 'critical': return '🚨';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📋';
  }
};

export const formatDaysUntilAction = (days: number, actionType: 'archive' | 'delete'): string => {
  const actionText = actionType === 'archive' ? 'アーカイブ' : '削除';

  if (days <= 0) return `${actionText}予定日を過ぎています`;
  if (days === 1) return `明日${actionText}予定`;
  if (days <= 7) return `${days}日後に${actionText}予定`;
  return `${days}日後に${actionText}予定`;
};

export const getActionTypeText = (actionType: 'archive' | 'delete'): string => {
  return actionType === 'archive' ? 'アーカイブ' : '削除';
};

export const getCollectionDisplayName = (collectionName: string): string => {
  const displayNames: Record<string, string> = {
    'orders': '受注案件',
    'processes': '工程管理',
    'work-hours': '工数管理',
    'daily-reports': '日報',
    'chat-messages': 'チャットメッセージ',
    'conversations': '会話',
    'notes': 'メモ',
    'calendar-events': 'カレンダー'
  };

  return displayNames[collectionName] || collectionName;
};

export default EnhancedArchiveManagerImpl;