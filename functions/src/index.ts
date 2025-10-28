// Unica製造業務管理システム Cloud Functions
// データ自動削除とメンテナンス機能

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Firebase Admin初期化
admin.initializeApp();

// サブモジュールのインポート
import { scheduledDataDeletion } from './scheduledDeletion';
import { maintenanceTasks, manualMaintenance } from './maintenanceTasks';
import { cleanupOldChats, createDeletionWarnings } from './scheduled/chatCleanup';

// =============================================================================
// 定期実行関数のエクスポート
// =============================================================================

// 毎日午前2時に実行される自動削除処理
export const dailyDataDeletion = scheduledDataDeletion;

// 毎週日曜日午前3時に実行されるメンテナンス処理
export const weeklyMaintenance = maintenanceTasks;

// =============================================================================
// チャット自動削除機能
// =============================================================================

// 毎週日曜日午前2時に実行されるチャット自動削除（3ヶ月保持）
export const scheduledChatCleanup = functions
  .region('asia-northeast1')
  .pubsub
  .schedule('0 2 * * 0') // 毎週日曜日午前2時
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    console.log('🔄 定期チャットクリーンアップ開始');

    try {
      // 1週間前に削除警告を作成
      const warningResult = await createDeletionWarnings();
      console.log('⚠️ 削除警告:', warningResult.warningCreated ? '作成済み' : 'スキップ');

      // 古いチャットを削除
      const cleanupResult = await cleanupOldChats();
      console.log('✅ チャット削除:', cleanupResult.deletedCount, '件');

      return {
        success: true,
        warning: warningResult,
        cleanup: cleanupResult,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ チャットクリーンアップエラー:', error);
      throw error;
    }
  });

// =============================================================================
// 手動実行用HTTP関数
// =============================================================================

// 手動チャットクリーンアップ（テスト用）
export const manualChatCleanup = functions
  .region('asia-northeast1')
  .https
  .onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    const { action = 'cleanup' } = data;

    try {
      let result: any;

      switch (action) {
        case 'warning':
          result = await createDeletionWarnings();
          break;
        case 'cleanup':
          result = await cleanupOldChats();
          break;
        case 'both':
        default:
          const warningResult = await createDeletionWarnings();
          const cleanupResult = await cleanupOldChats();
          result = { warning: warningResult, cleanup: cleanupResult };
          break;
      }

      return {
        success: true,
        action,
        result,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('手動チャットクリーンアップエラー:', error);
      throw new functions.https.HttpsError('internal', 'チャットクリーンアップ処理でエラーが発生しました');
    }
  });

// 手動アーカイブ実行（管理画面用）
export const manualArchive = functions
  .region('asia-northeast1')
  .https
  .onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    const { collectionName } = data;

    try {
      // dataArchiveManagerの手動実行
      const { manualArchiveExecution } = require('./utils/dataArchiveManager');
      const result = await manualArchiveExecution(collectionName);

      return {
        success: true,
        collectionName: collectionName || 'all',
        operations: result,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('手動アーカイブエラー:', error);
      throw new functions.https.HttpsError('internal', 'アーカイブ処理でエラーが発生しました');
    }
  });

// =============================================================================
// 手動メンテナンス実行（既存機能への橋渡し）
// =============================================================================

// 手動メンテナンス（管理画面用）
export const manualMaintenanceExecution = manualMaintenance;