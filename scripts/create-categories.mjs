/**
 * カテゴリ作成スクリプト
 * 既存のチャンネルのcategoryIdからカテゴリドキュメントを作成
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';

// Firebase設定（プロジェクトIDから判断）
const firebaseConfig = {
  apiKey: "AIzaSyBfk9fz0fBVNSrYPJP6fWN1tQPZYLVfgPk",
  authDomain: "unica-1ef93.firebaseapp.com",
  projectId: "unica-1ef93",
  storageBucket: "unica-1ef93.firebasestorage.app",
  messagingSenderId: "495818859166",
  appId: "1:495818859166:web:bf7ee89bc9fd1b51b96e31"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createCategories() {
  try {
    console.log('チャンネルを取得中...');

    // チャンネル一覧を取得
    const channelsSnapshot = await getDocs(collection(db, 'chatChannels'));

    // カテゴリIDを収集
    const categoryIds = new Set();
    channelsSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      if (data.categoryId && data.categoryId !== 'uncategorized') {
        categoryIds.add(data.categoryId);
      }
    });

    console.log(`見つかったカテゴリID: ${Array.from(categoryIds).join(', ')}`);

    // 既存のカテゴリを確認
    const existingCategoriesSnapshot = await getDocs(collection(db, 'chatCategories'));
    const existingCategoryIds = new Set(existingCategoriesSnapshot.docs.map(doc => doc.id));

    console.log(`既存のカテゴリ: ${Array.from(existingCategoryIds).join(', ')}`);

    // 不足しているカテゴリを作成
    let position = existingCategoriesSnapshot.size;

    for (const categoryId of categoryIds) {
      if (!existingCategoryIds.has(categoryId)) {
        console.log(`カテゴリ作成中: ${categoryId}`);

        const categoryRef = doc(db, 'chatCategories', categoryId);
        await setDoc(categoryRef, {
          id: categoryId,
          name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1), // 先頭を大文字に
          position: position++,
          isCollapsed: false,
          createdBy: 'system', // システムによる作成
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log(`✅ カテゴリ作成完了: ${categoryId}`);
      } else {
        console.log(`⏭️  カテゴリは既に存在: ${categoryId}`);
      }
    }

    console.log('\n✨ カテゴリ作成処理が完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプト実行
createCategories()
  .then(() => {
    console.log('スクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプトが失敗しました:', error);
    process.exit(1);
  });
