import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// 3ヶ月前の日付を取得
const getThreeMonthsAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return admin.firestore.Timestamp.fromDate(date);
};

// チャット削除処理
export const cleanupOldChats = async () => {
  const threeMonthsAgo = getThreeMonthsAgo();
  const batch = db.batch();
  let deletedCount = 0;

  try {
    // 古いメッセージを検索
    const messagesQuery = await db
      .collection('messages')
      .where('createdAt', '<', threeMonthsAgo)
      .limit(500)
      .get();

    // バッチ削除
    messagesQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    // 関連する未読カウントも削除
    const messageIds = messagesQuery.docs.map(doc => doc.id);
    if (messageIds.length > 0) {
      const readsQuery = await db
        .collection('messageReads')
        .where('messageId', 'in', messageIds.slice(0, 10)) // in演算子の制限対策
        .get();

      readsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    await batch.commit();

    console.log(`✅ チャットクリーンアップ完了: ${deletedCount}件のメッセージを削除`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('❌ チャットクリーンアップエラー:', error);
    throw error;
  }
};

// 削除警告の作成（1週間前）
export const createDeletionWarnings = async () => {
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const threeMonthsMinusOneWeek = new Date();
  threeMonthsMinusOneWeek.setMonth(threeMonthsMinusOneWeek.getMonth() - 3);
  threeMonthsMinusOneWeek.setDate(threeMonthsMinusOneWeek.getDate() + 7);

  const targetDate = admin.firestore.Timestamp.fromDate(threeMonthsMinusOneWeek);

  // 削除対象のメッセージ数を取得
  const messagesSnapshot = await db
    .collection('messages')
    .where('createdAt', '<', targetDate)
    .get();

  const messageCount = messagesSnapshot.size;

  if (messageCount > 0) {
    // 警告を作成
    await db.collection('systemWarnings').add({
      type: 'chat-deletion',
      message: `${messageCount}件のメッセージが1週間後に自動削除されます`,
      severity: 'info',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledDeletionDate: oneWeekFromNow,
      acknowledged: false
    });

    console.log(`⚠️ チャット削除警告作成: ${messageCount}件が削除対象`);
  }

  return { warningCreated: messageCount > 0, messageCount };
};