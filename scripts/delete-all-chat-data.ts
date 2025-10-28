/**
 * チャットデータ全削除スクリプト
 *
 * 実行方法:
 * npx ts-node scripts/delete-all-chat-data.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAIe-WxxfD6ID1QLWp7-PSykPvtW4mcECA',
  authDomain: 'unica-1ef93.firebaseapp.com',
  projectId: 'unica-1ef93',
  storageBucket: 'unica-1ef93.firebasestorage.app',
  messagingSenderId: '390538059390',
  appId: '1:390538059390:web:da8ea2cb9d609cd462022f',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllChatData() {
  console.log('🗑️  チャットデータ全削除を開始...');

  // メッセージ削除
  console.log('\n📨 メッセージを削除中...');
  const messagesSnapshot = await getDocs(collection(db, 'chatMessages'));
  console.log(`  見つかったメッセージ: ${messagesSnapshot.docs.length}件`);

  let deletedMessages = 0;
  const batchSize = 500;

  for (let i = 0; i < messagesSnapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchDocs = messagesSnapshot.docs.slice(i, i + batchSize);

    batchDocs.forEach((docSnapshot) => {
      batch.delete(doc(db, 'chatMessages', docSnapshot.id));
    });

    await batch.commit();
    deletedMessages += batchDocs.length;
    console.log(`  ${deletedMessages}件削除...`);
  }
  console.log(`✅ メッセージ ${deletedMessages}件削除完了`);

  // チャンネル削除
  console.log('\n📢 チャンネルを削除中...');
  const channelsSnapshot = await getDocs(collection(db, 'chatChannels'));
  let deletedChannels = 0;
  for (const docSnapshot of channelsSnapshot.docs) {
    await deleteDoc(doc(db, 'chatChannels', docSnapshot.id));
    deletedChannels++;
  }
  console.log(`✅ チャンネル ${deletedChannels}件削除完了`);

  // ユーザー情報削除
  console.log('\n👤 チャットユーザー情報を削除中...');
  const usersSnapshot = await getDocs(collection(db, 'chatUsers'));
  let deletedUsers = 0;
  for (const docSnapshot of usersSnapshot.docs) {
    await deleteDoc(doc(db, 'chatUsers', docSnapshot.id));
    deletedUsers++;
  }
  console.log(`✅ ユーザー ${deletedUsers}件削除完了`);

  console.log('\n🎉 全削除完了！');
  console.log(`📊 削除サマリ:`);
  console.log(`  - メッセージ: ${deletedMessages}件`);
  console.log(`  - チャンネル: ${deletedChannels}件`);
  console.log(`  - ユーザー: ${deletedUsers}件`);
}

deleteAllChatData()
  .then(() => {
    console.log('✅ 処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
