// メンテナンス処理
// 毎週日曜日午前3時に実行されるシステムメンテナンス

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * セキュリティログを記録
 */
async function logSecurityEvent(eventType: string, data: any) {
  try {
    await db.collection('security-logs').add({
      eventType,
      data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'maintenance-tasks'
    });
  } catch (error) {
    console.error('セキュリティログ記録エラー:', error);
  }
}

// =============================================================================
// メンテナンスタスク
// =============================================================================

/**
 * 古い警告とログのクリーンアップ
 */
async function cleanupOldWarningsAndLogs(): Promise<{
  deletedWarnings: number;
  deletedLogs: number;
  errors: string[];
}> {
  console.log('🧹 古い警告とログのクリーンアップ開始');

  let deletedWarnings = 0;
  let deletedLogs = 0;
  const errors: string[] = [];

  try {
    // 30日以上古い非アクティブな警告を削除
    const warningCutoff = new Date();
    warningCutoff.setDate(warningCutoff.getDate() - 30);

    const oldWarnings = await db.collection('archive-warnings')
      .where('isActive', '==', false)
      .where('createdAt', '<', warningCutoff.toISOString())
      .limit(500)
      .get();

    if (!oldWarnings.empty) {
      const warningBatch = db.batch();
      oldWarnings.docs.forEach(doc => {
        warningBatch.delete(doc.ref);
      });
      await warningBatch.commit();
      deletedWarnings = oldWarnings.size;
      console.log(`✅ 古い警告削除: ${deletedWarnings}件`);
    }

    // 90日以上古いセキュリティログを削除
    const logCutoff = new Date();
    logCutoff.setDate(logCutoff.getDate() - 90);

    const oldLogs = await db.collection('security-logs')
      .where('timestamp', '<', admin.firestore.Timestamp.fromDate(logCutoff))
      .limit(500)
      .get();

    if (!oldLogs.empty) {
      const logBatch = db.batch();
      oldLogs.docs.forEach(doc => {
        logBatch.delete(doc.ref);
      });
      await logBatch.commit();
      deletedLogs = oldLogs.size;
      console.log(`✅ 古いログ削除: ${deletedLogs}件`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なクリーンアップエラー';
    errors.push(errorMessage);
    console.error('❌ クリーンアップエラー:', error);
  }

  return { deletedWarnings, deletedLogs, errors };
}

/**
 * 期限切れエクスポート記録のクリーンアップ
 */
async function cleanupExpiredExportRecords(): Promise<{
  deletedRecords: number;
  errors: string[];
}> {
  console.log('📋 期限切れエクスポート記録のクリーンアップ開始');

  let deletedRecords = 0;
  const errors: string[] = [];

  try {
    // 1年以上古いエクスポート記録を削除
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const expiredRecords = await db.collection('export-records')
      .where('exportDate', '<', admin.firestore.Timestamp.fromDate(cutoff))
      .limit(500)
      .get();

    if (!expiredRecords.empty) {
      const batch = db.batch();
      expiredRecords.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      deletedRecords = expiredRecords.size;
      console.log(`✅ 期限切れエクスポート記録削除: ${deletedRecords}件`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なクリーンアップエラー';
    errors.push(errorMessage);
    console.error('❌ エクスポート記録クリーンアップエラー:', error);
  }

  return { deletedRecords, errors };
}

/**
 * 失敗した削除ジョブのリトライ
 */
async function retryFailedDeletionJobs(): Promise<{
  retriedJobs: number;
  successfulRetries: number;
  errors: string[];
}> {
  console.log('🔄 失敗した削除ジョブのリトライ開始');

  let retriedJobs = 0;
  let successfulRetries = 0;
  const errors: string[] = [];

  try {
    // 24時間以上前に失敗したジョブを取得
    const retryThreshold = new Date();
    retryThreshold.setHours(retryThreshold.getHours() - 24);

    const failedJobs = await db.collection('deletion-jobs')
      .where('status', '==', 'failed')
      .where('createdAt', '<', retryThreshold.toISOString())
      .limit(10) // リトライは少数に限定
      .get();

    for (const jobDoc of failedJobs.docs) {
      const job = jobDoc.data();
      retriedJobs++;

      try {
        // ジョブを再実行可能状態に戻す
        await jobDoc.ref.update({
          status: 'pending',
          retryCount: (job.retryCount || 0) + 1,
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        successfulRetries++;
        console.log(`🔄 削除ジョブリトライ: ${jobDoc.id}`);

      } catch (error) {
        const errorMessage = `ジョブ ${jobDoc.id}: ${error instanceof Error ? error.message : '不明なエラー'}`;
        errors.push(errorMessage);
        console.error(`❌ ジョブリトライエラー:`, error);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なリトライエラー';
    errors.push(errorMessage);
    console.error('❌ ジョブリトライ処理エラー:', error);
  }

  return { retriedJobs, successfulRetries, errors };
}

/**
 * システム統計の更新
 */
async function updateSystemStatistics(): Promise<{
  updated: boolean;
  stats: any;
  errors: string[];
}> {
  console.log('📊 システム統計の更新開始');

  const errors: string[] = [];

  try {
    // 各種統計を計算
    const now = new Date();
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // 削除統計
    const deletionLogs = await db.collection('deletion-logs')
      .where('executedAt', '>=', admin.firestore.Timestamp.fromDate(last30Days))
      .get();

    const totalDeleted = deletionLogs.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.deletedCount || 0);
    }, 0);

    const deletionsByCollection: { [key: string]: number } = {};
    deletionLogs.docs.forEach(doc => {
      const data = doc.data();
      const collection = data.collectionName;
      if (collection) {
        deletionsByCollection[collection] = (deletionsByCollection[collection] || 0) + (data.deletedCount || 0);
      }
    });

    // エクスポート統計
    const exportRecords = await db.collection('export-records')
      .where('exportDate', '>=', admin.firestore.Timestamp.fromDate(last30Days))
      .get();

    const totalExported = exportRecords.docs.length;
    const exportedCollections = [...new Set(exportRecords.docs.map(doc => doc.data().collectionName))];

    // アクティブ警告数
    const activeWarnings = await db.collection('archive-warnings')
      .where('isActive', '==', true)
      .get();

    const stats = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      period: '30日間',
      deletions: {
        total: totalDeleted,
        byCollection: deletionsByCollection
      },
      exports: {
        total: totalExported,
        collections: exportedCollections
      },
      warnings: {
        active: activeWarnings.size,
        critical: activeWarnings.docs.filter(doc => doc.data().warningLevel === 'critical').length
      },
      maintenance: {
        lastRun: admin.firestore.FieldValue.serverTimestamp(),
        nextScheduled: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // 1週間後
      }
    };

    // 統計を保存
    await db.collection('system-statistics').doc('current').set(stats);

    console.log('✅ システム統計更新完了');
    console.log(`   📊 削除: ${totalDeleted}件`);
    console.log(`   📤 エクスポート: ${totalExported}件`);
    console.log(`   ⚠️ アクティブ警告: ${activeWarnings.size}件`);

    return { updated: true, stats, errors };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明な統計更新エラー';
    errors.push(errorMessage);
    console.error('❌ 統計更新エラー:', error);

    return { updated: false, stats: null, errors };
  }
}

// =============================================================================
// メイン関数
// =============================================================================

/**
 * 週次メンテナンスタスクのメイン処理
 */
export const maintenanceTasks = functions
  .region('asia-northeast1')
  .pubsub
  .schedule('0 3 * * 0') // 毎週日曜日午前3時
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    console.log('🔧 週次メンテナンス処理開始');

    const maintenanceResults = {
      startTime: new Date().toISOString(),
      tasks: {} as any,
      errors: [] as string[],
      success: true
    };

    // メンテナンス開始ログ
    await logSecurityEvent('maintenance_started', {
      scheduledTime: context.timestamp
    });

    try {
      // 1. 古い警告とログのクリーンアップ
      console.log('🧹 タスク1: 古い警告とログのクリーンアップ');
      const cleanupResult = await cleanupOldWarningsAndLogs();
      maintenanceResults.tasks.cleanup = cleanupResult;
      if (cleanupResult.errors.length > 0) {
        maintenanceResults.errors.push(...cleanupResult.errors);
        maintenanceResults.success = false;
      }

      // 2. 期限切れエクスポート記録のクリーンアップ
      console.log('📋 タスク2: 期限切れエクスポート記録のクリーンアップ');
      const exportCleanupResult = await cleanupExpiredExportRecords();
      maintenanceResults.tasks.exportCleanup = exportCleanupResult;
      if (exportCleanupResult.errors.length > 0) {
        maintenanceResults.errors.push(...exportCleanupResult.errors);
        maintenanceResults.success = false;
      }

      // 3. 失敗した削除ジョブのリトライ
      console.log('🔄 タスク3: 失敗した削除ジョブのリトライ');
      const retryResult = await retryFailedDeletionJobs();
      maintenanceResults.tasks.jobRetry = retryResult;
      if (retryResult.errors.length > 0) {
        maintenanceResults.errors.push(...retryResult.errors);
        maintenanceResults.success = false;
      }

      // 4. システム統計の更新
      console.log('📊 タスク4: システム統計の更新');
      const statsResult = await updateSystemStatistics();
      maintenanceResults.tasks.statistics = statsResult;
      if (statsResult.errors.length > 0) {
        maintenanceResults.errors.push(...statsResult.errors);
        maintenanceResults.success = false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なメンテナンスエラー';
      maintenanceResults.errors.push(errorMessage);
      maintenanceResults.success = false;
      console.error('❌ メンテナンス処理エラー:', error);
    }

    maintenanceResults.endTime = new Date().toISOString();

    // メンテナンス完了ログ
    await logSecurityEvent('maintenance_completed', {
      ...maintenanceResults,
      duration: new Date(maintenanceResults.endTime).getTime() - new Date(maintenanceResults.startTime).getTime()
    });

    console.log('🎯 週次メンテナンス処理完了');
    console.log(`   🧹 警告クリーンアップ: ${maintenanceResults.tasks.cleanup?.deletedWarnings || 0}件`);
    console.log(`   🗂️ ログクリーンアップ: ${maintenanceResults.tasks.cleanup?.deletedLogs || 0}件`);
    console.log(`   📋 エクスポート記録削除: ${maintenanceResults.tasks.exportCleanup?.deletedRecords || 0}件`);
    console.log(`   🔄 ジョブリトライ: ${maintenanceResults.tasks.jobRetry?.successfulRetries || 0}件`);
    console.log(`   📊 統計更新: ${maintenanceResults.tasks.statistics?.updated ? '成功' : '失敗'}`);

    if (maintenanceResults.errors.length > 0) {
      console.error('⚠️ メンテナンス中のエラー:', maintenanceResults.errors);
    }

    return maintenanceResults;
  });

// =============================================================================
// 手動メンテナンストリガー
// =============================================================================

export const manualMaintenance = functions
  .region('asia-northeast1')
  .https
  .onCall(async (data, context) => {
    // 認証チェック（管理者のみ）
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    // 管理者権限チェック（実装時に詳細化）
    // if (!context.auth.token.admin) {
    //   throw new functions.https.HttpsError('permission-denied', '管理者権限が必要です');
    // }

    const { taskType = 'all' } = data;

    try {
      let result: any = {};

      switch (taskType) {
        case 'cleanup':
          result = await cleanupOldWarningsAndLogs();
          break;
        case 'export-cleanup':
          result = await cleanupExpiredExportRecords();
          break;
        case 'job-retry':
          result = await retryFailedDeletionJobs();
          break;
        case 'statistics':
          result = await updateSystemStatistics();
          break;
        case 'all':
        default:
          result = {
            cleanup: await cleanupOldWarningsAndLogs(),
            exportCleanup: await cleanupExpiredExportRecords(),
            jobRetry: await retryFailedDeletionJobs(),
            statistics: await updateSystemStatistics()
          };
          break;
      }

      await logSecurityEvent('manual_maintenance_executed', {
        taskType,
        executedBy: context.auth.uid,
        result
      });

      return {
        success: true,
        taskType,
        result,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('手動メンテナンスエラー:', error);
      throw new functions.https.HttpsError('internal', 'メンテナンス処理でエラーが発生しました');
    }
  });