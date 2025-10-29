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
    if (!db) {
      throw new Error('Firestore instance not initialized');
    }
    results.tests.basicConnection = true;

    // 2. 書き込みテスト
    const testDocRef = doc(db, 'test', 'connection-test');
    const testData = {
      message: 'Firebase connection test',
      timestamp: new Date().toISOString(),
      testId: `test-${Date.now()}`,
      success: true
    };

    await setDoc(testDocRef, testData);
    results.tests.writeOperation = true;

    // 3. 読み取りテスト
    const docSnap = await getDoc(testDocRef);

    if (docSnap.exists()) {
      results.tests.readOperation = true;
    } else {
      throw new Error('テストドキュメントが見つかりません');
    }

    // 4. クエリテスト
    const querySnapshot = await getDocs(
      query(collection(db, 'test'), limit(5))
    );

    results.tests.queryOperation = true;

    // 5. 削除テスト
    await deleteDoc(testDocRef);
    results.tests.deleteOperation = true;

    // 最終確認
    const deletedDocSnap = await getDoc(testDocRef);
    if (deletedDocSnap.exists()) {
      results.errors.push('削除されたドキュメントがまだ存在します');
    }

    results.success = Object.values(results.tests).every(test => test);
    results.message = results.success
      ? 'すべてのFirebaseテストが成功しました'
      : '一部のテストが失敗しました';

    return results;

  } catch (error: any) {
    const errorMessage = `Firebase接続テスト失敗: ${error.message}`;
    console.error(errorMessage);
    results.errors.push(errorMessage);
    results.message = errorMessage;
    return results;
  }
};

/**
 * 製造管理システム用のコレクションテスト
 */
export const testManufacturingCollections = async () => {
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

      } catch (error: any) {
        const errorMsg = `${collectionName}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    results.success = results.testedCollections.length === collectionsToTest.length;
    results.message = results.success
      ? 'すべてのコレクションテスト完了'
      : `${results.errors.length}個のコレクションでエラーが発生しました`;

    return results;

  } catch (error: any) {
    const errorMessage = `コレクションテスト失敗: ${error.message}`;
    console.error(errorMessage);
    results.errors.push(errorMessage);
    results.message = errorMessage;
    return results;
  }
};

/**
 * 統合テスト実行
 */
export const runFirebaseIntegrationTest = async () => {
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
}