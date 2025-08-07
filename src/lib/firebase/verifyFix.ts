import { runFirebaseIntegrationTest } from './connectionTest';
import { createNote, getNotesList, deleteNote } from './notes';
import { createCompanyTask, getCompanyTasks, deleteCompanyTask } from './tasks';
import { createProcess, getProcessesList, deleteProcess } from './processes';

/**
 * Firebase修復確認テスト
 */
export const verifyFirebaseFix = async () => {
  console.log('🔧 Firebase修復確認テストを開始します...');
  
  const results = {
    success: false,
    tests: {
      basicConnection: false,
      notesOperations: false,
      taskOperations: false,
      processOperations: false
    },
    errors: [] as string[],
    details: {} as any
  };

  try {
    // 1. 基本接続テスト
    console.log('\n1️⃣ 基本接続テスト実行中...');
    const connectionTest = await runFirebaseIntegrationTest();
    results.tests.basicConnection = connectionTest.overall;
    results.details.connection = connectionTest;
    
    if (!connectionTest.overall) {
      results.errors.push('基本接続テストが失敗しました');
    }

    // 2. ノート機能テスト
    console.log('\n2️⃣ ノート機能テスト実行中...');
    try {
      const testUserId = 'test-user-' + Date.now();
      const testUserName = 'Test User';
      
      // ノート作成
      const { id: noteId, error: createError } = await createNote({
        title: 'テストノート',
        content: 'Firebase修復テスト用のノートです',
        category: 'work',
        priority: 'medium',
        color: 'bg-blue-100',
        createdBy: testUserName,
        createdById: testUserId,
        isPrivate: false,
        isArchived: false,
        isActive: true
      });

      if (createError || !noteId) {
        throw new Error(`ノート作成エラー: ${createError}`);
      }

      // ノート取得
      const { data: notes, error: fetchError } = await getNotesList({
        userId: testUserId,
        limit: 10
      });

      if (fetchError) {
        throw new Error(`ノート取得エラー: ${fetchError}`);
      }

      const createdNote = notes.find(n => n.id === noteId);
      if (!createdNote) {
        throw new Error('作成したノートが見つかりません');
      }

      // ノート削除
      const { error: deleteError } = await deleteNote(noteId);
      if (deleteError) {
        throw new Error(`ノート削除エラー: ${deleteError}`);
      }

      results.tests.notesOperations = true;
      console.log('✅ ノート機能テスト成功');

    } catch (error: any) {
      results.errors.push(`ノート機能テスト失敗: ${error.message}`);
      console.error('❌ ノート機能テスト失敗:', error.message);
    }

    // 3. タスク機能テスト
    console.log('\n3️⃣ タスク機能テスト実行中...');
    try {
      const testUserId = 'test-user-' + Date.now();
      const testUserName = 'Test User';
      
      // タスク作成
      const { id: taskId, error: createError } = await createCompanyTask({
        title: 'テストタスク',
        description: 'Firebase修復テスト用のタスクです',
        status: 'pending',
        priority: 'medium',
        assignee: testUserName,
        assigneeId: testUserId,
        createdBy: testUserName,
        createdById: testUserId,
        category: 'general'
      });

      if (createError || !taskId) {
        throw new Error(`タスク作成エラー: ${createError}`);
      }

      // タスク取得
      const { data: tasks, error: fetchError } = await getCompanyTasks({
        assigneeId: testUserId,
        limit: 10
      });

      if (fetchError) {
        throw new Error(`タスク取得エラー: ${fetchError}`);
      }

      const createdTask = tasks.find(t => t.id === taskId);
      if (!createdTask) {
        throw new Error('作成したタスクが見つかりません');
      }

      // タスク削除
      const { error: deleteError } = await deleteCompanyTask(taskId);
      if (deleteError) {
        throw new Error(`タスク削除エラー: ${deleteError}`);
      }

      results.tests.taskOperations = true;
      console.log('✅ タスク機能テスト成功');

    } catch (error: any) {
      results.errors.push(`タスク機能テスト失敗: ${error.message}`);
      console.error('❌ タスク機能テスト失敗:', error.message);
    }

    // 4. プロセス機能テスト
    console.log('\n4️⃣ プロセス機能テスト実行中...');
    try {
      // プロセス作成
      const { id: processId, error: createError } = await createProcess({
        orderId: 'TEST-ORDER-' + Date.now(),
        orderDate: new Date().toISOString().split('T')[0],
        orderClient: 'テスト会社',
        priority: 'medium',
        status: 'pending',
        assignee: 'Test User',
        workDetails: {
          itemName: 'テストアイテム',
          quantity: 10,
          unitPrice: 1000,
          totalAmount: 10000,
          specifications: 'テスト仕様',
          materials: ['テスト材料'],
          estimatedHours: 8,
          notes: 'テストプロセス'
        },
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (createError || !processId) {
        throw new Error(`プロセス作成エラー: ${createError}`);
      }

      // プロセス取得
      const { data: processes, error: fetchError } = await getProcessesList({
        orderClient: 'テスト会社',
        limit: 10
      });

      if (fetchError) {
        throw new Error(`プロセス取得エラー: ${fetchError}`);
      }

      const createdProcess = processes.find(p => p.id === processId);
      if (!createdProcess) {
        throw new Error('作成したプロセスが見つかりません');
      }

      // プロセス削除
      const { error: deleteError } = await deleteProcess(processId);
      if (deleteError) {
        throw new Error(`プロセス削除エラー: ${deleteError}`);
      }

      results.tests.processOperations = true;
      console.log('✅ プロセス機能テスト成功');

    } catch (error: any) {
      results.errors.push(`プロセス機能テスト失敗: ${error.message}`);
      console.error('❌ プロセス機能テスト失敗:', error.message);
    }

    // 最終結果
    const allTestsPassed = Object.values(results.tests).every(test => test);
    results.success = allTestsPassed;

    console.log('\n📊 修復確認テスト結果:');
    console.log('基本接続:', results.tests.basicConnection ? '✅ 成功' : '❌ 失敗');
    console.log('ノート機能:', results.tests.notesOperations ? '✅ 成功' : '❌ 失敗');
    console.log('タスク機能:', results.tests.taskOperations ? '✅ 成功' : '❌ 失敗');
    console.log('プロセス機能:', results.tests.processOperations ? '✅ 成功' : '❌ 失敗');
    console.log('総合結果:', results.success ? '✅ 修復成功' : '❌ 修復未完了');

    if (results.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (results.success) {
      console.log('\n🎉 Firebase修復が完了しました！すべての機能が正常に動作しています。');
    } else {
      console.log('\n⚠️ 一部の機能に問題が残っています。詳細を確認してください。');
    }

    return results;

  } catch (error: any) {
    const errorMessage = `修復確認テスト実行エラー: ${error.message}`;
    console.error('❌', errorMessage);
    results.errors.push(errorMessage);
    return results;
  }
};

// ブラウザ環境でのグローバル関数として公開
if (typeof window !== 'undefined') {
  (window as any).verifyFirebaseFix = verifyFirebaseFix;
  console.log('🔧 Firebase修復確認テスト関数が利用可能: window.verifyFirebaseFix()');
}