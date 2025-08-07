import { db } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  addDoc, 
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore';

/**
 * Firebase接続テスト関数
 */
export const testFirebaseConnection = async () => {
  console.log('🔥 Firebase接続テストを開始します...');
  
  const results = {
    success: false,
    message: '',
    tests: {
      basicConnection: false,
      writeOperation: false,
      readOperation: false,
      queryOperation: false,
      deleteOperation: false
    },
    errors: [] as string[]
  };

  try {
    // 1. 基本接続テスト
    console.log('📋 基本接続をテスト中...');
    if (!db) {
      throw new Error('Firestore instance not initialized');
    }
    results.tests.basicConnection = true;
    console.log('✅ 基本接続成功');

    // 2. 書き込みテスト
    console.log('📝 書き込み操作をテスト中...');
    const testDocRef = doc(db, 'test', 'connection-test');
    const testData = {
      message: 'Firebase connection test',
      timestamp: new Date().toISOString(),
      testId: `test-${Date.now()}`,
      success: true
    };

    await setDoc(testDocRef, testData);
    results.tests.writeOperation = true;
    console.log('✅ 書き込み操作成功');

    // 3. 読み取りテスト
    console.log('📖 読み取り操作をテスト中...');
    const docSnap = await getDoc(testDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ 読み取り操作成功:', data.message);
      results.tests.readOperation = true;
    } else {
      throw new Error('テストドキュメントが見つかりません');
    }

    // 4. クエリテスト
    console.log('🔍 クエリ操作をテスト中...');
    const querySnapshot = await getDocs(
      query(collection(db, 'test'), limit(5))
    );
    
    console.log(`✅ クエリ操作成功: ${querySnapshot.size} ドキュメント見つかりました`);
    results.tests.queryOperation = true;

    // 5. 削除テスト
    console.log('🗑️ 削除操作をテスト中...');
    await deleteDoc(testDocRef);
    results.tests.deleteOperation = true;
    console.log('✅ 削除操作成功');

    // 最終確認
    const deletedDocSnap = await getDoc(testDocRef);
    if (deletedDocSnap.exists()) {
      results.errors.push('削除されたドキュメントがまだ存在します');
    }

    results.success = Object.values(results.tests).every(test => test);
    results.message = results.success 
      ? '🎉 すべてのFirebaseテストが成功しました！' 
      : '⚠️ 一部のテストが失敗しました';

    console.log(results.message);
    return results;

  } catch (error: any) {
    const errorMessage = `Firebase接続テスト失敗: ${error.message}`;
    console.error('❌', errorMessage);
    results.errors.push(errorMessage);
    results.message = errorMessage;
    return results;
  }
};

/**
 * 製造管理システム用のコレクションテスト
 */
export const testManufacturingCollections = async () => {
  console.log('🏭 製造管理システムコレクションテストを開始します...');
  
  const results = {
    success: false,
    message: '',
    testedCollections: [] as string[],
    errors: [] as string[]
  };

  try {
    const testId = `test-${Date.now()}`;
    const collectionsToTest = [
      'notes',
      'processes',
      'companyTasks',
      'personalTasks',
      'notifications',
      'announcements',
      'orders',
      'work-hours',
      'daily-reports'
    ];

    for (const collectionName of collectionsToTest) {
      console.log(`📋 ${collectionName} コレクションをテスト中...`);
      
      try {
        // テストドキュメント作成
        const testDocRef = doc(db, collectionName, testId);
        const testData = {
          testField: `Test data for ${collectionName}`,
          createdAt: new Date().toISOString(),
          isTest: true,
          testId
        };

        await setDoc(testDocRef, testData);
        
        // 読み取り確認
        const docSnap = await getDoc(testDocRef);
        if (!docSnap.exists()) {
          throw new Error(`${collectionName} コレクションの作成/読み取りに失敗`);
        }
        
        // 削除
        await deleteDoc(testDocRef);
        
        results.testedCollections.push(collectionName);
        console.log(`✅ ${collectionName} コレクション正常`);
        
      } catch (error: any) {
        const errorMsg = `${collectionName}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    results.success = results.testedCollections.length === collectionsToTest.length;
    results.message = results.success 
      ? '🎉 すべてのコレクションテスト完了！' 
      : `⚠️ ${results.errors.length}個のコレクションでエラーが発生しました`;

    console.log(results.message);
    return results;

  } catch (error: any) {
    const errorMessage = `コレクションテスト失敗: ${error.message}`;
    console.error('❌', errorMessage);
    results.errors.push(errorMessage);
    results.message = errorMessage;
    return results;
  }
};

/**
 * 統合テスト実行
 */
export const runFirebaseIntegrationTest = async () => {
  console.log('🚀 Firebase統合テストを実行します...\n');
  
  const connectionTest = await testFirebaseConnection();
  const collectionsTest = await testManufacturingCollections();
  
  const results = {
    connection: connectionTest,
    collections: collectionsTest,
    overall: connectionTest.success && collectionsTest.success,
    summary: {
      totalTests: Object.keys(connectionTest.tests).length + collectionsTest.testedCollections.length,
      passedTests: Object.values(connectionTest.tests).filter(Boolean).length + collectionsTest.testedCollections.length,
      errors: [...connectionTest.errors, ...collectionsTest.errors]
    }
  };
  
  console.log('\n📊 テスト結果サマリー:');
  console.log('接続テスト:', connectionTest.success ? '✅ 成功' : '❌ 失敗');
  console.log('コレクションテスト:', collectionsTest.success ? '✅ 成功' : '❌ 失敗');
  console.log('総合結果:', results.overall ? '✅ 成功' : '❌ 失敗');
  console.log(`テスト通過率: ${results.summary.passedTests}/${results.summary.totalTests}`);
  
  if (results.summary.errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    results.summary.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return results;
};

/**
 * クイック接続テスト（ブラウザ用）
 */
export const quickConnectionTest = async () => {
  try {
    const testDoc = doc(db, 'test', 'quick-test');
    await setDoc(testDoc, { timestamp: Date.now() });
    await deleteDoc(testDoc);
    return { success: true, message: 'Firebase接続正常' };
  } catch (error: any) {
    return { success: false, message: `Firebase接続エラー: ${error.message}` };
  }
};

// ブラウザ環境でのグローバル関数として公開
if (typeof window !== 'undefined') {
  (window as any).testFirebase = runFirebaseIntegrationTest;
  (window as any).quickTestFirebase = quickConnectionTest;
  console.log('🔧 Firebase テスト関数が利用可能: window.testFirebase(), window.quickTestFirebase()');
}