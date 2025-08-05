import { db } from './config';
import { collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

/**
 * Firebase接続テスト関数
 */
export const testFirebaseConnection = async () => {
  console.log('🔥 Firebase接続テストを開始します...');
  
  try {
    // テストドキュメントを作成
    const testDocRef = doc(db, 'test', 'connection-test');
    const testData = {
      message: 'Firebase connection test',
      timestamp: new Date().toISOString(),
      success: true
    };

    console.log('📝 テストドキュメントを作成中...');
    await setDoc(testDocRef, testData);
    console.log('✅ テストドキュメント作成成功');

    // テストドキュメントを読み取り
    console.log('📖 テストドキュメントを読み取り中...');
    const docSnap = await getDoc(testDocRef);
    
    if (docSnap.exists()) {
      console.log('✅ テストドキュメント読み取り成功:', docSnap.data());
    } else {
      throw new Error('テストドキュメントが見つかりません');
    }

    // テストドキュメントを削除
    console.log('🗑️ テストドキュメントを削除中...');
    await deleteDoc(testDocRef);
    console.log('✅ テストドキュメント削除成功');

    console.log('🎉 Firebase接続テスト完了 - すべて正常です！');
    return {
      success: true,
      message: 'Firebase接続テスト成功'
    };

  } catch (error: any) {
    console.error('❌ Firebase接続テスト失敗:', error);
    return {
      success: false,
      message: `Firebase接続テスト失敗: ${error.message}`,
      error: error
    };
  }
};

/**
 * 製造管理システム用のコレクション作成テスト
 */
export const testManufacturingCollections = async () => {
  console.log('🏭 製造管理システムコレクションテストを開始します...');
  
  try {
    const testId = `test-${Date.now()}`;
    const collections_to_test = [
      'orders',
      'work-hours', 
      'daily-reports',
      'work-content-types',
      'processes'
    ];

    for (const collectionName of collections_to_test) {
      console.log(`📋 ${collectionName} コレクションをテスト中...`);
      
      const testDocRef = doc(db, collectionName, testId);
      const testData = {
        testField: `Test data for ${collectionName}`,
        createdAt: new Date().toISOString(),
        isTest: true
      };

      await setDoc(testDocRef, testData);
      const docSnap = await getDoc(testDocRef);
      
      if (!docSnap.exists()) {
        throw new Error(`${collectionName} コレクションの作成/読み取りに失敗`);
      }
      
      await deleteDoc(testDocRef);
      console.log(`✅ ${collectionName} コレクション正常`);
    }

    console.log('🎉 すべてのコレクションテスト完了！');
    return {
      success: true,
      message: '製造管理システムコレクション作成テスト成功'
    };

  } catch (error: any) {
    console.error('❌ コレクションテスト失敗:', error);
    return {
      success: false,
      message: `コレクションテスト失敗: ${error.message}`,
      error: error
    };
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
    overall: connectionTest.success && collectionsTest.success
  };
  
  console.log('\n📊 テスト結果サマリー:');
  console.log('接続テスト:', connectionTest.success ? '✅ 成功' : '❌ 失敗');
  console.log('コレクションテスト:', collectionsTest.success ? '✅ 成功' : '❌ 失敗');
  console.log('総合結果:', results.overall ? '✅ 成功' : '❌ 失敗');
  
  return results;
};