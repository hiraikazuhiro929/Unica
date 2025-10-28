// データ削除システム設定と初期化
// 製造業務管理システム（Unica）専用設定

import { integratedArchiveSystem, initializeIntegratedSystem } from './integratedArchiveSystem';
import { dataDeletionManager } from './dataDeletionManager';
import { deletionExportManager } from './deletionExportManager';

// =============================================================================
// 設定定数
// =============================================================================

export const DELETION_CONFIG = {
  // システム設定
  SYSTEM: {
    ENABLED: process.env.NODE_ENV !== 'development', // 本番環境でのみ有効
    DEBUG_MODE: process.env.DELETION_DEBUG === 'true',
    DRY_RUN: process.env.DELETION_DRY_RUN === 'true',
  },

  // スケジュール設定
  SCHEDULE: {
    DAILY_DELETION: '0 2 * * *', // 毎日午前2時
    WEEKLY_MAINTENANCE: '0 3 * * 0', // 毎週日曜日午前3時
    TIMEZONE: 'Asia/Tokyo'
  },

  // バッチ処理制限
  BATCH: {
    MAX_RECORDS_PER_BATCH: 500,
    MAX_CONCURRENT_OPERATIONS: 5,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000 // 5秒
  },

  // 通知設定
  NOTIFICATIONS: {
    EMAIL_ENABLED: false, // 現在は無効（将来実装予定）
    DASHBOARD_ENABLED: true,
    BROWSER_ENABLED: true,
    SLACK_ENABLED: false // 将来実装予定
  },

  // セキュリティ設定
  SECURITY: {
    REQUIRE_ADMIN_APPROVAL: true,
    LOG_ALL_OPERATIONS: true,
    AUDIT_TRAIL_ENABLED: true,
    BACKUP_BEFORE_DELETE: true
  }
} as const;

// =============================================================================
// 環境別設定
// =============================================================================

export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV;

  switch (env) {
    case 'development':
      return {
        ...DELETION_CONFIG,
        SYSTEM: {
          ...DELETION_CONFIG.SYSTEM,
          ENABLED: false, // 開発環境では無効
          DEBUG_MODE: true,
          DRY_RUN: true
        },
        BATCH: {
          ...DELETION_CONFIG.BATCH,
          MAX_RECORDS_PER_BATCH: 10 // 開発時は少なく
        }
      };

    case 'staging':
      return {
        ...DELETION_CONFIG,
        SYSTEM: {
          ...DELETION_CONFIG.SYSTEM,
          ENABLED: true,
          DEBUG_MODE: true,
          DRY_RUN: false
        },
        BATCH: {
          ...DELETION_CONFIG.BATCH,
          MAX_RECORDS_PER_BATCH: 100 // ステージングは中程度
        }
      };

    case 'production':
    default:
      return DELETION_CONFIG;
  }
};

// =============================================================================
// 初期化関数
// =============================================================================

export const initializeDataDeletionSystem = async (): Promise<{
  success: boolean;
  message: string;
  config: any;
}> => {
  const config = getEnvironmentConfig();

  console.log('🚀 データ削除システム初期化開始');
  console.log(`   📍 環境: ${process.env.NODE_ENV}`);
  console.log(`   🔧 有効: ${config.SYSTEM.ENABLED}`);
  console.log(`   🧪 デバッグ: ${config.SYSTEM.DEBUG_MODE}`);
  console.log(`   🔒 ドライラン: ${config.SYSTEM.DRY_RUN}`);

  try {
    if (!config.SYSTEM.ENABLED) {
      return {
        success: true,
        message: '開発環境のため削除システムは無効化されています',
        config
      };
    }

    // 統合システム初期化
    await initializeIntegratedSystem();

    // 初期状況確認
    const overview = await integratedArchiveSystem.getSystemOverview();

    console.log('📊 初期システム状況:');
    console.log(`   ⚠️ 警告: ${overview.summary.totalWarnings}件`);
    console.log(`   🗑️ 削除予定: ${overview.summary.pendingDeletions}件`);
    console.log(`   📤 エクスポート要求: ${overview.summary.exportRequests}件`);
    console.log(`   💚 健康度: ${overview.summary.healthScore}/100`);

    return {
      success: true,
      message: 'データ削除システム初期化完了',
      config: {
        ...config,
        overview: overview.summary
      }
    };

  } catch (error) {
    console.error('❌ データ削除システム初期化エラー:', error);
    return {
      success: false,
      message: `初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      config
    };
  }
};

// =============================================================================
// 管理用ユーティリティ
// =============================================================================

export const getDeletionSystemStatus = async () => {
  const config = getEnvironmentConfig();

  if (!config.SYSTEM.ENABLED) {
    return {
      enabled: false,
      reason: '環境設定により無効化',
      config: config.SYSTEM
    };
  }

  try {
    const overview = await integratedArchiveSystem.getSystemOverview();
    const statistics = await dataDeletionManager.getDeletionStatistics();

    return {
      enabled: true,
      systemHealth: overview.systemHealth.overallHealth,
      summary: overview.summary,
      statistics,
      lastUpdate: new Date().toISOString(),
      config: config.SYSTEM
    };

  } catch (error) {
    return {
      enabled: true,
      error: error instanceof Error ? error.message : '不明なエラー',
      config: config.SYSTEM
    };
  }
};

export const executeManualMaintenance = async (taskType: 'all' | 'warnings' | 'deletion' | 'export' = 'all') => {
  const config = getEnvironmentConfig();

  console.log(`🔧 手動メンテナンス実行: ${taskType}`);

  if (!config.SYSTEM.ENABLED && !config.SYSTEM.DEBUG_MODE) {
    throw new Error('システムが無効化されています');
  }

  try {
    switch (taskType) {
      case 'warnings':
        // 警告のみ生成
        const warnings = await integratedArchiveSystem.executeIntegratedMaintenance();
        return warnings;

      case 'deletion':
        // 削除のみ実行
        if (config.SYSTEM.DRY_RUN) {
          console.log('🧪 ドライラン: 実際の削除は実行されません');
        }
        const deletionResults = await dataDeletionManager.runScheduledDeletion();
        return deletionResults;

      case 'export':
        // エクスポートのみ実行
        const exportRequests = await deletionExportManager.getExportRequests();
        const pendingExports = exportRequests.filter(r => r.status === 'pending');

        const exportResults = [];
        for (const request of pendingExports) {
          const result = await deletionExportManager.executeExport(request);
          exportResults.push(result);
        }
        return { exportResults };

      case 'all':
      default:
        // 全メンテナンス実行
        const allResults = await integratedArchiveSystem.executeIntegratedMaintenance();
        return allResults;
    }

  } catch (error) {
    console.error(`❌ 手動メンテナンスエラー (${taskType}):`, error);
    throw error;
  }
};

// =============================================================================
// ヘルスチェック
// =============================================================================

export const performHealthCheck = async () => {
  try {
    const config = getEnvironmentConfig();
    const overview = await integratedArchiveSystem.getSystemOverview();

    const healthCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      systemEnabled: config.SYSTEM.ENABLED,
      overallHealth: overview.systemHealth.overallHealth,
      healthScore: overview.summary.healthScore,
      components: {
        warnings: overview.systemHealth.components.warnings,
        deletion: overview.systemHealth.components.deletion,
        export: overview.systemHealth.components.export
      },
      statistics: overview.summary,
      issues: overview.systemHealth.issues,
      recommendations: overview.systemHealth.recommendations
    };

    return healthCheck;

  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      overallHealth: 'critical',
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};

export default {
  DELETION_CONFIG,
  getEnvironmentConfig,
  initializeDataDeletionSystem,
  getDeletionSystemStatus,
  executeManualMaintenance,
  performHealthCheck
};