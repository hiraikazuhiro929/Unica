// 統合アーカイブシステム
// 既存の警告システム + 新しい削除システムの統合管理

import { enhancedArchiveManager } from './enhancedArchiveManager';
import { dataDeletionManager, DELETION_POLICIES } from './dataDeletionManager';
import { deletionExportManager } from './deletionExportManager';
import { logSecurityEvent } from './securityUtils';

// =============================================================================
// 型定義
// =============================================================================

export interface IntegratedArchiveStatus {
  collectionName: string;
  warnings: {
    active: number;
    critical: number;
    pending: number;
  };
  deletion: {
    policy: any;
    eligible: number;
    scheduled: boolean;
    exportRequired: boolean;
  };
  statistics: {
    totalRecords: number;
    oldRecords: number;
    deletedRecords: number;
    exportedRecords: number;
  };
}

export interface SystemHealthCheck {
  overallHealth: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  lastUpdate: string;
  components: {
    warnings: 'healthy' | 'warning' | 'critical';
    deletion: 'healthy' | 'warning' | 'critical';
    export: 'healthy' | 'warning' | 'critical';
  };
}

// =============================================================================
// 統合アーカイブシステムマネージャー
// =============================================================================

class IntegratedArchiveSystemImpl {
  private static instance: IntegratedArchiveSystemImpl;

  private constructor() {}

  public static getInstance(): IntegratedArchiveSystemImpl {
    if (!IntegratedArchiveSystemImpl.instance) {
      IntegratedArchiveSystemImpl.instance = new IntegratedArchiveSystemImpl();
    }
    return IntegratedArchiveSystemImpl.instance;
  }

  // =============================================================================
  // 全体状況把握
  // =============================================================================

  async getSystemOverview(): Promise<{
    collections: IntegratedArchiveStatus[];
    systemHealth: SystemHealthCheck;
    summary: {
      totalWarnings: number;
      pendingDeletions: number;
      exportRequests: number;
      healthScore: number;
    };
  }> {
    console.log('📊 統合アーカイブシステム状況確認開始');

    const collections: IntegratedArchiveStatus[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 各コレクションの状況を収集
    for (const policy of DELETION_POLICIES) {
      try {
        // 警告システムから情報取得
        const warnings = await enhancedArchiveManager.getAllActiveWarnings();
        const collectionWarnings = warnings.filter(w => w.collectionName === policy.collectionName);

        // 削除対象レコード数を取得
        const eligibleRecords = await dataDeletionManager.findDeletableRecords(policy.collectionName);

        // エクスポート状況確認
        const exportRequests = await deletionExportManager.getExportRequests();
        const collectionExports = exportRequests.filter(r => r.collectionName === policy.collectionName);

        const status: IntegratedArchiveStatus = {
          collectionName: policy.collectionName,
          warnings: {
            active: collectionWarnings.length,
            critical: collectionWarnings.filter(w => w.warningLevel === 'critical').length,
            pending: collectionWarnings.filter(w => !w.isRead).length
          },
          deletion: {
            policy: {
              retentionDays: policy.retentionDays,
              requiresExport: policy.requiresExport,
              autoDelete: policy.autoDelete
            },
            eligible: eligibleRecords.length,
            scheduled: eligibleRecords.length > 0,
            exportRequired: policy.requiresExport && eligibleRecords.length > 0
          },
          statistics: {
            totalRecords: 0, // 実装時に詳細化
            oldRecords: eligibleRecords.length,
            deletedRecords: 0, // 削除ログから取得
            exportedRecords: collectionExports.filter(r => r.status === 'completed').length
          }
        };

        collections.push(status);

        // 問題検出
        if (status.warnings.critical > 10) {
          issues.push(`${policy.collectionName}: 緊急警告が${status.warnings.critical}件あります`);
        }

        if (status.deletion.exportRequired && status.deletion.eligible > 0 && status.statistics.exportedRecords === 0) {
          issues.push(`${policy.collectionName}: エクスポートが必要ですが未実行です`);
        }

        // 推奨事項
        if (status.warnings.pending > 5) {
          recommendations.push(`${policy.collectionName}: ${status.warnings.pending}件の未読警告を確認してください`);
        }

        if (status.deletion.eligible > 100) {
          recommendations.push(`${policy.collectionName}: ${status.deletion.eligible}件の削除対象データがあります`);
        }

      } catch (error) {
        console.error(`${policy.collectionName} 状況確認エラー:`, error);
        issues.push(`${policy.collectionName}: システムエラーが発生しています`);
      }
    }

    // システム全体の健康度判定
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (issues.length > 0) {
      overallHealth = issues.some(issue => issue.includes('緊急') || issue.includes('エラー')) ? 'critical' : 'warning';
    }

    const systemHealth: SystemHealthCheck = {
      overallHealth,
      issues,
      recommendations,
      lastUpdate: new Date().toISOString(),
      components: {
        warnings: issues.some(i => i.includes('警告')) ? 'warning' : 'healthy',
        deletion: issues.some(i => i.includes('削除')) ? 'warning' : 'healthy',
        export: issues.some(i => i.includes('エクスポート')) ? 'warning' : 'healthy'
      }
    };

    // サマリー計算
    const totalWarnings = collections.reduce((sum, c) => sum + c.warnings.active, 0);
    const pendingDeletions = collections.reduce((sum, c) => sum + c.deletion.eligible, 0);
    const exportRequests = collections.filter(c => c.deletion.exportRequired && c.deletion.eligible > 0).length;

    const healthScore = Math.max(0, 100 - (issues.length * 10) - (recommendations.length * 5));

    const summary = {
      totalWarnings,
      pendingDeletions,
      exportRequests,
      healthScore
    };

    console.log(`✅ システム状況確認完了: Health ${healthScore}/100`);

    return {
      collections,
      systemHealth,
      summary
    };
  }

  // =============================================================================
  // 統合処理ワークフロー
  // =============================================================================

  async executeIntegratedMaintenance(): Promise<{
    success: boolean;
    results: {
      warningsGenerated: number;
      deletionsScheduled: number;
      exportsCreated: number;
    };
    errors: string[];
  }> {
    console.log('🔄 統合メンテナンス処理開始');

    const results = {
      warningsGenerated: 0,
      deletionsScheduled: 0,
      exportsCreated: 0
    };
    const errors: string[] = [];

    try {
      // 1. 警告システムの更新
      console.log('⚠️ ステップ1: 警告生成');
      const warnings = await enhancedArchiveManager.generateAllWarnings();
      results.warningsGenerated = warnings.length;
      console.log(`✅ 警告生成完了: ${warnings.length}件`);

      // 2. 削除ジョブの作成
      console.log('🗑️ ステップ2: 削除ジョブ作成');
      for (const policy of DELETION_POLICIES) {
        if (policy.retentionDays !== -1) { // 無期限保存以外
          try {
            const job = await dataDeletionManager.createDeletionJob(policy.collectionName);
            if (job) {
              results.deletionsScheduled++;
              console.log(`📅 削除ジョブ作成: ${policy.collectionName}`);
            }
          } catch (error) {
            errors.push(`${policy.collectionName} 削除ジョブ作成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
          }
        }
      }

      // 3. エクスポート要求の作成（必要な場合）
      console.log('📤 ステップ3: エクスポート要求作成');
      for (const policy of DELETION_POLICIES) {
        if (policy.requiresExport) {
          try {
            const eligibleRecords = await dataDeletionManager.findDeletableRecords(policy.collectionName);
            if (eligibleRecords.length > 0) {
              const exportRequest = await deletionExportManager.createExportRequest(
                policy.collectionName,
                eligibleRecords,
                'excel',
                'normal'
              );
              if (exportRequest) {
                results.exportsCreated++;
                console.log(`📋 エクスポート要求作成: ${policy.collectionName} (${eligibleRecords.length}件)`);
              }
            }
          } catch (error) {
            errors.push(`${policy.collectionName} エクスポート要求作成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
          }
        }
      }

      // 4. 古いデータのクリーンアップ
      console.log('🧹 ステップ4: クリーンアップ');
      const cleanupCount = await enhancedArchiveManager.cleanupOldWarnings();
      console.log(`🧹 古い警告クリーンアップ: ${cleanupCount}件`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明な統合メンテナンスエラー';
      errors.push(errorMessage);
      console.error('❌ 統合メンテナンスエラー:', error);
    }

    // ログ記録
    await logSecurityEvent('integrated_maintenance_executed', {
      results,
      errors,
      executedAt: new Date().toISOString()
    });

    const success = errors.length === 0;

    console.log(`🎯 統合メンテナンス処理${success ? '成功' : '一部失敗'}`);
    console.log(`   ⚠️ 警告生成: ${results.warningsGenerated}件`);
    console.log(`   🗑️ 削除ジョブ: ${results.deletionsScheduled}件`);
    console.log(`   📤 エクスポート: ${results.exportsCreated}件`);

    if (errors.length > 0) {
      console.error('❌ エラー:', errors);
    }

    return {
      success,
      results,
      errors
    };
  }

  // =============================================================================
  // コレクション別統合処理
  // =============================================================================

  async processCollectionLifecycle(
    collectionName: string,
    action: 'warn' | 'export' | 'delete' | 'full'
  ): Promise<{
    success: boolean;
    action: string;
    results: any;
    errors: string[];
  }> {
    console.log(`🔄 ${collectionName} ライフサイクル処理開始: ${action}`);

    const errors: string[] = [];
    let results: any = {};

    try {
      switch (action) {
        case 'warn':
          // 警告のみ生成
          const warnings = await enhancedArchiveManager.generateWarningsForCollection(collectionName);
          results = { warnings: warnings.length };
          break;

        case 'export':
          // エクスポートのみ実行
          const eligibleRecords = await dataDeletionManager.findDeletableRecords(collectionName);
          if (eligibleRecords.length > 0) {
            const exportRequest = await deletionExportManager.createExportRequest(
              collectionName,
              eligibleRecords,
              'excel',
              'normal'
            );
            results = {
              exportRequest: !!exportRequest,
              recordCount: eligibleRecords.length
            };
          } else {
            results = { exportRequest: false, recordCount: 0 };
          }
          break;

        case 'delete':
          // 削除のみ実行（エクスポート済み前提）
          const deletableRecords = await dataDeletionManager.findDeletableRecords(collectionName);
          if (deletableRecords.length > 0) {
            const deleteResult = await dataDeletionManager.executeRecordDeletion(collectionName, deletableRecords);
            results = deleteResult;
          } else {
            results = { success: true, deletedCount: 0, failedCount: 0, errors: [], jobId: 'no-records' };
          }
          break;

        case 'full':
        default:
          // 全ライフサイクル実行
          const policy = dataDeletionManager.getPolicyForCollection(collectionName);
          if (!policy) {
            throw new Error('ポリシーが見つかりません');
          }

          // 1. 警告生成
          const allWarnings = await enhancedArchiveManager.generateWarningsForCollection(collectionName);

          // 2. エクスポート（必要な場合）
          let exportPath: string | undefined;
          if (policy.requiresExport) {
            const allEligibleRecords = await dataDeletionManager.findDeletableRecords(collectionName);
            if (allEligibleRecords.length > 0) {
              exportPath = await dataDeletionManager.exportCollectionData(collectionName, allEligibleRecords) || undefined;
            }
          }

          // 3. 削除（自動削除有効な場合のみ）
          let deleteResult = null;
          if (policy.autoDelete) {
            const allDeletableRecords = await dataDeletionManager.findDeletableRecords(collectionName);
            if (allDeletableRecords.length > 0) {
              deleteResult = await dataDeletionManager.executeRecordDeletion(collectionName, allDeletableRecords);
            }
          }

          results = {
            warnings: allWarnings.length,
            exported: !!exportPath,
            exportPath,
            deleted: deleteResult ? deleteResult.deletedCount : 0,
            deleteErrors: deleteResult ? deleteResult.failedCount : 0
          };
          break;
      }

      await logSecurityEvent('collection_lifecycle_processed', {
        collectionName,
        action,
        results
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明な処理エラー';
      errors.push(errorMessage);
      console.error(`❌ ${collectionName} ${action} 処理エラー:`, error);
    }

    const success = errors.length === 0;

    console.log(`${success ? '✅' : '❌'} ${collectionName} ${action} 処理${success ? '完了' : 'エラー'}`);

    return {
      success,
      action,
      results,
      errors
    };
  }

  // =============================================================================
  // 統計とレポート
  // =============================================================================

  async generateComprehensiveReport(): Promise<{
    generatedAt: string;
    systemOverview: any;
    collections: any[];
    recommendations: string[];
    nextActions: string[];
  }> {
    console.log('📋 包括レポート生成開始');

    const systemOverview = await this.getSystemOverview();

    const nextActions: string[] = [];

    // 次のアクションを推奨
    systemOverview.collections.forEach(collection => {
      if (collection.warnings.critical > 0) {
        nextActions.push(`${collection.collectionName}: 緊急警告 ${collection.warnings.critical}件を確認`);
      }

      if (collection.deletion.exportRequired && collection.deletion.eligible > 0) {
        nextActions.push(`${collection.collectionName}: ${collection.deletion.eligible}件のエクスポートを実行`);
      }
    });

    const report = {
      generatedAt: new Date().toISOString(),
      systemOverview: systemOverview.summary,
      collections: systemOverview.collections,
      recommendations: systemOverview.systemHealth.recommendations,
      nextActions
    };

    console.log('✅ 包括レポート生成完了');

    return report;
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const integratedArchiveSystem = IntegratedArchiveSystemImpl.getInstance();

// =============================================================================
// ユーティリティ関数
// =============================================================================

export const initializeIntegratedSystem = async (): Promise<void> => {
  console.log('🔧 統合アーカイブシステム初期化中...');

  try {
    // 既存システムの初期化
    await enhancedArchiveManager.updateArchiveSettings({
      retentionDays: 180,
      warningDays: [30, 14, 7, 1],
      requireExportBeforeDelete: true,
      autoExportBeforeDelete: false,
      gracePeriodDays: 30,
      notificationMethods: {
        email: false, // Cloud Functions経由で通知
        browser: true,
        dashboard: true
      }
    });

    // 初回統合メンテナンス実行
    await integratedArchiveSystem.executeIntegratedMaintenance();

    console.log('✅ 統合アーカイブシステム初期化完了');
  } catch (error) {
    console.error('❌ 統合システム初期化エラー:', error);
  }
};

export const getCollectionStatus = (collectionName: string): string => {
  const policy = dataDeletionManager.getPolicyForCollection(collectionName);
  if (!policy) return 'ポリシー未定義';

  if (policy.retentionDays === -1) return '無期限保存';

  const days = policy.retentionDays;
  const exportInfo = policy.requiresExport ? 'エクスポート後' : '';
  const deleteInfo = policy.autoDelete ? '自動削除' : '手動削除';

  return `${days}日保持 → ${exportInfo}${deleteInfo}`;
};

export default IntegratedArchiveSystemImpl;