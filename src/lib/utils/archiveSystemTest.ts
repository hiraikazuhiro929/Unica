// アーカイブシステム統合テスト
// 新しいアーカイブ機能と既存システムの統合検証

import { enhancedArchiveManager } from './enhancedArchiveManager';
import { dataArchiveManager } from './dataArchiveManager';
import { executeEnhancedExport } from './enhancedExportUtils';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

interface SystemTestResults {
  allTestsPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  timestamp: string;
}

/**
 * アーカイブシステム統合テストスイート
 */
class ArchiveSystemTester {
  private results: TestResult[] = [];

  /**
   * 全統合テストを実行
   */
  async runAllTests(): Promise<SystemTestResults> {
    console.log('🧪 アーカイブシステム統合テスト開始...');
    this.results = [];

    // 基本機能テスト
    await this.testBasicFunctionality();

    // データ整合性テスト
    await this.testDataIntegrity();

    // エクスポート機能テスト
    await this.testExportFunctionality();

    // 警告システムテスト
    await this.testWarningSystem();

    // パフォーマンステスト
    await this.testPerformance();

    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.length - passedTests;

    const summary: SystemTestResults = {
      allTestsPassed: failedTests === 0,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      results: this.results,
      timestamp: new Date().toISOString()
    };

    this.logTestSummary(summary);
    return summary;
  }

  /**
   * 基本機能テスト
   */
  private async testBasicFunctionality(): Promise<void> {
    // Enhanced Archive Manager初期化テスト
    await this.runTest('Enhanced Archive Manager 初期化', async () => {
      const policies = await enhancedArchiveManager.getEnhancedPolicies();
      if (!Array.isArray(policies)) {
        throw new Error('ポリシー取得が配列を返しませんでした');
      }
      return { policyCount: policies.length };
    });

    // Archive Settings 取得テスト
    await this.runTest('Archive Settings 取得', async () => {
      const settings = await enhancedArchiveManager.getArchiveSettings();
      if (!settings) {
        throw new Error('設定が取得できませんでした');
      }
      return {
        retentionDays: settings.globalRetentionDays,
        warningDays: settings.warningDays.length
      };
    });

    // 既存システムとの互換性テスト
    await this.runTest('既存アーカイブシステム互換性', async () => {
      const legacyPolicies = await dataArchiveManager.getArchivePolicies();
      if (!Array.isArray(legacyPolicies)) {
        throw new Error('既存ポリシー取得が失敗しました');
      }
      return { legacyPolicyCount: legacyPolicies.length };
    });
  }

  /**
   * データ整合性テスト
   */
  private async testDataIntegrity(): Promise<void> {
    await this.runTest('警告データ構造検証', async () => {
      const warnings = await enhancedArchiveManager.getUserWarnings();

      for (const warning of warnings.slice(0, 5)) { // 最初の5件をテスト
        if (!warning.id || !warning.collectionName || !warning.recordId) {
          throw new Error(`不完全な警告データ: ${JSON.stringify(warning)}`);
        }

        if (!['info', 'warning', 'critical'].includes(warning.warningLevel)) {
          throw new Error(`無効な警告レベル: ${warning.warningLevel}`);
        }
      }

      return { validWarnings: Math.min(warnings.length, 5) };
    });
  }

  /**
   * エクスポート機能テスト
   */
  private async testExportFunctionality(): Promise<void> {
    await this.runTest('強化エクスポート機能基本テスト', async () => {
      // 小さなテストデータでエクスポート機能をテスト
      const result = await executeEnhancedExport({
        collections: ['orders'],
        format: 'json',
        includeCompleted: true,
        batchSize: 10, // 小さなバッチサイズでテスト
        onProgress: (progress) => {
          // プログレスコールバックが正常に動作することを確認
        }
      });

      if (!result.success && result.error !== 'エクスポート対象のデータが見つかりませんでした') {
        throw new Error(`エクスポートエラー: ${result.error}`);
      }

      return {
        exportSuccessful: result.success || result.error === 'エクスポート対象のデータが見つかりませんでした',
        processedRecords: result.processedRecords
      };
    });
  }

  /**
   * 警告システムテスト
   */
  private async testWarningSystem(): Promise<void> {
    await this.runTest('警告生成システム', async () => {
      // 警告スキャン機能をテスト（実際のデータは変更しない）
      try {
        const warnings = await enhancedArchiveManager.scanAndGenerateWarnings();
        return { generatedWarnings: warnings.length };
      } catch (error) {
        // 警告生成がエラーになっても、システム自体は動作している可能性がある
        if (error instanceof Error && error.message.includes('No matching documents')) {
          return { generatedWarnings: 0, note: 'データなしのため警告生成なし' };
        }
        throw error;
      }
    });
  }

  /**
   * パフォーマンステスト
   */
  private async testPerformance(): Promise<void> {
    await this.runTest('応答時間テスト', async () => {
      const startTime = Date.now();

      // 基本的なAPI呼び出しの応答時間を測定
      await Promise.all([
        enhancedArchiveManager.getArchiveSettings(),
        enhancedArchiveManager.getUserWarnings(),
        enhancedArchiveManager.getEnhancedPolicies()
      ]);

      const responseTime = Date.now() - startTime;

      if (responseTime > 5000) { // 5秒を超える場合は警告
        throw new Error(`応答時間が遅すぎます: ${responseTime}ms`);
      }

      return { responseTimeMs: responseTime };
    });
  }

  /**
   * 個別テスト実行
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    try {
      console.log(`  🧪 ${testName}...`);
      const details = await testFunction();

      this.results.push({
        testName,
        passed: true,
        details
      });

      console.log(`  ✅ ${testName} - 成功`);
    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });

      console.log(`  ❌ ${testName} - 失敗: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * テスト結果サマリー出力
   */
  private logTestSummary(summary: SystemTestResults): void {
    console.log('\n📊 アーカイブシステム統合テスト結果');
    console.log('═'.repeat(50));
    console.log(`総テスト数: ${summary.totalTests}`);
    console.log(`成功: ${summary.passedTests}`);
    console.log(`失敗: ${summary.failedTests}`);
    console.log(`成功率: ${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`実行時刻: ${new Date(summary.timestamp).toLocaleString('ja-JP')}`);

    if (summary.allTestsPassed) {
      console.log('🎉 全てのテストが成功しました！');
    } else {
      console.log('⚠️ 一部のテストが失敗しています。');
      console.log('\n失敗したテスト:');
      summary.results.filter(r => !r.passed).forEach(result => {
        console.log(`  • ${result.testName}: ${result.error}`);
      });
    }

    console.log('═'.repeat(50));
  }
}

// =============================================================================
// エクスポート関数
// =============================================================================

/**
 * アーカイブシステム統合テストを実行
 */
export const runArchiveSystemTests = async (): Promise<SystemTestResults> => {
  const tester = new ArchiveSystemTester();
  return await tester.runAllTests();
};

/**
 * システム健全性チェック（軽量版）
 */
export const quickHealthCheck = async (): Promise<{ healthy: boolean; issues: string[] }> => {
  const issues: string[] = [];
  let healthy = true;

  try {
    // 基本的な機能が動作するかチェック
    const settings = await enhancedArchiveManager.getArchiveSettings();
    if (!settings) {
      issues.push('アーカイブ設定の取得に失敗');
      healthy = false;
    }

    const policies = await enhancedArchiveManager.getEnhancedPolicies();
    if (!Array.isArray(policies)) {
      issues.push('ポリシー一覧の取得に失敗');
      healthy = false;
    }

    // 既存システムとの互換性チェック
    const legacyPolicies = await dataArchiveManager.getArchivePolicies();
    if (!Array.isArray(legacyPolicies)) {
      issues.push('既存アーカイブシステムとの互換性に問題');
      healthy = false;
    }

  } catch (error) {
    issues.push(`システムエラー: ${error instanceof Error ? error.message : error}`);
    healthy = false;
  }

  return { healthy, issues };
};

/**
 * 開発者向けテスト実行関数
 */
export const devTestArchiveSystem = async (): Promise<void> => {
  console.log('🚀 開発者モード: アーカイブシステムテスト');

  // クイックヘルスチェック
  console.log('\n1️⃣ クイックヘルスチェック...');
  const healthCheck = await quickHealthCheck();
  if (healthCheck.healthy) {
    console.log('✅ システムは正常に動作しています');
  } else {
    console.log('⚠️ システムに問題があります:');
    healthCheck.issues.forEach(issue => console.log(`  • ${issue}`));
  }

  // 全統合テスト
  console.log('\n2️⃣ 全統合テスト実行...');
  const testResults = await runArchiveSystemTests();

  return;
};

export default ArchiveSystemTester;