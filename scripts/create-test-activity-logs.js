/**
 * 活動ログのテストデータ作成スクリプト
 *
 * 使用方法:
 * 1. プロジェクトルートで実行: node scripts/create-test-activity-logs.js
 * 2. または開発者コンソールでコピー&ペースト
 */

// Firebase設定（ブラウザ環境用）
const createTestActivityLogs = async () => {
  // Firebase関数をインポート（開発者コンソールで実行時はwindowオブジェクトから取得）
  const { createActivityLog } = window.firebaseUtils || {};

  if (!createActivityLog) {
    console.error('❌ Firebase utils not available. Make sure you are on the activity page.');
    return;
  }

  const testLogs = [
    // 受注関連
    {
      userId: 'test-user-1',
      userName: '田中太郎',
      action: 'created',
      entityType: 'order',
      entityId: 'order-001',
      entityName: 'ABC株式会社 システム開発案件',
      description: '新規受注「ABC株式会社 システム開発案件」を作成しました',
      metadata: { amount: 1500000, client: 'ABC株式会社' },
      severity: 'success',
    },
    {
      userId: 'test-user-2',
      userName: '佐藤花子',
      action: 'updated',
      entityType: 'order',
      entityId: 'order-001',
      entityName: 'ABC株式会社 システム開発案件',
      description: '受注「ABC株式会社 システム開発案件」を更新しました',
      metadata: { updatedFields: ['deadline', 'amount'] },
      severity: 'success',
    },

    // タスク関連
    {
      userId: 'test-user-1',
      userName: '田中太郎',
      action: 'created',
      entityType: 'task',
      entityId: 'task-001',
      entityName: '要件定義作成',
      description: 'タスク「要件定義作成」を作成しました',
      metadata: { estimatedHours: 40, priority: 'high' },
      severity: 'success',
    },
    {
      userId: 'test-user-3',
      userName: '山田次郎',
      action: 'updated',
      entityType: 'task',
      entityId: 'task-001',
      entityName: '要件定義作成',
      description: 'タスク「要件定義作成」のステータスを更新しました',
      metadata: { status: 'in_progress', completedPercentage: 25 },
      severity: 'info',
    },

    // 日報関連
    {
      userId: 'test-user-2',
      userName: '佐藤花子',
      action: 'created',
      entityType: 'report',
      entityId: 'report-20240101',
      entityName: '2024-01-01の日報',
      description: '日報「2024-01-01の日報」を作成しました',
      metadata: { workedHours: 8, tasks: ['要件定義', 'データベース設計'] },
      severity: 'success',
    },

    // システム関連
    {
      userId: 'system',
      userName: 'システム',
      action: 'sync',
      entityType: 'system',
      entityId: 'sync-001',
      entityName: '自動同期処理',
      description: '日報と工数管理の自動同期を実行しました',
      metadata: { syncedRecords: 15, errors: 0 },
      severity: 'success',
    },

    // ユーザー関連
    {
      userId: 'test-user-1',
      userName: '田中太郎',
      action: 'login',
      entityType: 'user',
      description: 'システムにログインしました',
      metadata: { loginMethod: 'email', device: 'PC' },
      severity: 'info',
    },

    // エラー系
    {
      userId: 'test-user-3',
      userName: '山田次郎',
      action: 'error',
      entityType: 'order',
      entityId: 'order-002',
      entityName: 'エラー発生案件',
      description: '受注処理でエラーが発生しました: ファイルアップロードに失敗',
      metadata: {
        error: 'ファイルサイズが上限を超えています',
        fileSize: '15MB',
        maxSize: '10MB'
      },
      severity: 'error',
    },

    // 通知関連
    {
      userId: 'system',
      userName: 'システム',
      action: 'notification',
      entityType: 'notification',
      entityId: 'notif-001',
      entityName: '期限アラート',
      description: 'タスクの期限が近づいています',
      metadata: {
        taskName: '要件定義作成',
        daysLeft: 2,
        assignee: '田中太郎'
      },
      severity: 'warning',
    },

    // 警告系
    {
      userId: 'test-user-2',
      userName: '佐藤花子',
      action: 'viewed',
      entityType: 'task',
      entityId: 'task-002',
      entityName: '遅延タスク',
      description: '遅延中のタスク「遅延タスク」を確認しました',
      metadata: {
        delayedDays: 3,
        originalDeadline: '2024-01-01',
        currentDate: '2024-01-04'
      },
      severity: 'warning',
    },
  ];

  console.log('🚀 Creating test activity logs...');

  for (let i = 0; i < testLogs.length; i++) {
    const log = testLogs[i];

    try {
      const result = await createActivityLog(log);

      if (result.error) {
        console.error(`❌ Failed to create log ${i + 1}:`, result.error);
      } else {
        console.log(`✅ Created log ${i + 1}/${testLogs.length}: ${log.description}`);
      }

      // API負荷軽減のため少し待機
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Error creating log ${i + 1}:`, error);
    }
  }

  console.log('🎉 Test data creation completed!');
  console.log('💡 Refresh the page to see the new activity logs.');
};

// Node.js環境での実行用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createTestActivityLogs };
} else {
  // ブラウザ環境では関数を global に expose
  window.createTestActivityLogs = createTestActivityLogs;
}

console.log(`
📋 Activity Logs Test Data Script Loaded

使用方法:
1. Activity Logs ページ (http://localhost:3000/activity) を開く
2. 開発者コンソールを開く (F12)
3. 以下のコマンドを実行:
   createTestActivityLogs()

または、Firebase utils を手動でインポート後:
   window.firebaseUtils = { createActivityLog: /* your import */ };
   createTestActivityLogs();
`);