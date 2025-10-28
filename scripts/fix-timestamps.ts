/**
 * Firestoreの壊れたタイムスタンプを修正するスクリプト
 *
 * 実行方法:
 * npx ts-node scripts/fix-timestamps.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

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

async function fixTimestamps() {
  console.log('🔧 タイムスタンプ修正を開始します...');

  const messagesRef = collection(db, 'chat_messages');
  const snapshot = await getDocs(messagesRef);

  let fixedCount = 0;
  let brokenCount = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const timestamp = data.timestamp;

    // serverTimestampのプレースホルダーを検出
    if (timestamp && timestamp._methodName === 'serverTimestamp') {
      brokenCount++;
      console.log(`⚠️ 壊れたメッセージ: ${docSnapshot.id} - ${data.content?.substring(0, 20)}`);

      // 現在時刻で修正（本来のタイムスタンプは失われる）
      const now = Timestamp.fromDate(new Date());
      await updateDoc(doc(db, 'chat_messages', docSnapshot.id), {
        timestamp: now,
      });

      fixedCount++;
      console.log(`✅ 修正完了: ${docSnapshot.id}`);
    }
  }

  console.log(`\n📊 結果:`);
  console.log(`- 壊れたメッセージ: ${brokenCount}件`);
  console.log(`- 修正したメッセージ: ${fixedCount}件`);
  console.log(`- 全体: ${snapshot.size}件`);
}

fixTimestamps()
  .then(() => {
    console.log('✅ 完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
