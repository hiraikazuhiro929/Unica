/**
 * カテゴリIDのない孤立チャンネルをクリーンアップするスクリプト
 *
 * 実行方法:
 * npx ts-node scripts/cleanup-orphan-channels.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Firebase Admin初期化
if (getApps().length === 0) {
  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ エラー: serviceAccountKey.json が見つかりません');
    console.error(`   パス: ${serviceAccountPath}`);
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface Channel {
  id: string;
  name: string;
  categoryId?: string;
  createdAt?: any;
  type?: string;
}

async function cleanupOrphanChannels() {
  console.log('🔍 孤立チャンネル（categoryIdなし）の検索を開始します...\n');

  try {
    // すべてのチャンネルを取得
    const channelsSnapshot = await db.collection('chat_channels').get();

    const orphanChannels: Channel[] = [];
    const validChannels: Channel[] = [];

    channelsSnapshot.forEach(doc => {
      const data = doc.data();
      const channel: Channel = {
        id: doc.id,
        name: data.name || '名前なし',
        categoryId: data.categoryId,
        createdAt: data.createdAt,
        type: data.type || 'text',
      };

      if (!channel.categoryId) {
        orphanChannels.push(channel);
      } else {
        validChannels.push(channel);
      }
    });

    console.log('📊 チャンネル統計:');
    console.log(`   総チャンネル数: ${channelsSnapshot.size}`);
    console.log(`   有効チャンネル数（categoryIdあり）: ${validChannels.length}`);
    console.log(`   孤立チャンネル数（categoryIdなし）: ${orphanChannels.length}\n`);

    if (orphanChannels.length === 0) {
      console.log('✅ 孤立チャンネルは見つかりませんでした。クリーンアップは不要です。');
      return;
    }

    // 孤立チャンネルの詳細表示
    console.log('🗑️  削除対象の孤立チャンネル:');
    orphanChannels.forEach((channel, index) => {
      console.log(`   ${index + 1}. ${channel.name} (ID: ${channel.id}, タイプ: ${channel.type})`);
    });
    console.log('');

    // 確認プロンプト（本番環境では手動確認推奨）
    console.log('⚠️  これらのチャンネルを削除しますか？');
    console.log('   このスクリプトは自動実行されます。中止するにはCtrl+Cを押してください。');
    console.log('   5秒後に削除を開始します...\n');

    // 5秒待機
    await new Promise(resolve => setTimeout(resolve, 5000));

    // バッチ削除実行
    console.log('🔄 削除を開始します...\n');

    let deletedCount = 0;
    const batch = db.batch();

    for (const channel of orphanChannels) {
      const channelRef = db.collection('chat_channels').doc(channel.id);
      batch.delete(channelRef);
      console.log(`   ✓ 削除予定: ${channel.name} (${channel.id})`);
      deletedCount++;

      // Firestoreのバッチ制限（500操作）を考慮
      if (deletedCount % 500 === 0) {
        await batch.commit();
        console.log(`   💾 バッチコミット完了（${deletedCount}件）`);
      }
    }

    // 残りのバッチをコミット
    if (deletedCount % 500 !== 0) {
      await batch.commit();
    }

    console.log(`\n✅ 完了: ${deletedCount}件の孤立チャンネルを削除しました。`);
    console.log(`   残りの有効チャンネル数: ${validChannels.length}`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプト実行
cleanupOrphanChannels()
  .then(() => {
    console.log('\n🎉 クリーンアップが正常に完了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 クリーンアップ中にエラーが発生しました:', error);
    process.exit(1);
  });
