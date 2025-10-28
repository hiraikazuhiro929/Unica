/**
 * カテゴリ作成スクリプト
 * 既存のチャンネルのcategoryIdからカテゴリドキュメントを作成
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';

// Firebase設定（unica/src/lib/firebase/config.tsと同じ設定を使用）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createCategories() {
  try {
    console.log('チャンネルを取得中...');

    // チャンネル一覧を取得
    const channelsSnapshot = await getDocs(collection(db, 'chatChannels'));

    // カテゴリIDを収集
    const categoryIds = new Set<string>();
    channelsSnapshot.docs.forEach(doc => {
      const data = doc.data();
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
