import {
  createChannel,
  upsertChatUser,
  sendMessage,
  CHAT_COLLECTIONS
} from './chat';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './config';

/**
 * 初期チャンネルデータ（カテゴリ名との対応）
 */
const INITIAL_CHANNELS = [
  {
    name: "全体連絡",
    description: "全社員向けの重要なお知らせ",
    type: "announcement" as const,
    categoryName: "全社", // カテゴリIDに変換する
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "生産チーム",
    description: "生産ラインの連絡・相談",
    type: "text" as const,
    categoryName: "生産部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "品質管理",
    description: "品質管理・検査に関する連絡",
    type: "text" as const,
    categoryName: "品質管理部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "設備保全",
    description: "設備メンテナンス・故障対応",
    type: "text" as const,
    categoryName: "設備保全部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "安全管理",
    description: "安全管理・事故報告",
    type: "text" as const,
    categoryName: "安全管理部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "雑談",
    description: "自由な雑談・交流",
    type: "text" as const,
    categoryName: "その他",
    isPrivate: false,
    createdBy: "system",
  },
];

/**
 * 初期ユーザーデータ
 */
const INITIAL_USERS = [
  {
    id: "user-tanaka",
    name: "田中作業員",
    email: "tanaka@company.com",
    role: "作業員",
    department: "生産部",
    status: "online" as const,
  },
  {
    id: "user-sato",
    name: "佐藤班長",
    email: "sato@company.com",
    role: "班長",
    department: "生産部",
    status: "online" as const,
  },
  {
    id: "user-suzuki",
    name: "鈴木品質管理者",
    email: "suzuki@company.com",
    role: "品質管理者",
    department: "品質管理部",
    status: "away" as const,
  },
  {
    id: "user-yamada",
    name: "山田保全担当",
    email: "yamada@company.com",
    role: "保全担当",
    department: "設備保全部",
    status: "busy" as const,
  },
  {
    id: "user-watanabe",
    name: "渡辺部長",
    email: "watanabe@company.com",
    role: "部長",
    department: "生産部",
    status: "online" as const,
  },
];

/**
 * チャンネルが存在するかチェック
 */
export const checkChannelsExist = async (): Promise<boolean> => {
  try {
    const querySnapshot = await getDocs(collection(db, CHAT_COLLECTIONS.CHANNELS));
    console.log('🔍 [checkChannelsExist] チャンネル存在確認:', {
      exists: !querySnapshot.empty,
      count: querySnapshot.docs.length,
    });
    // 空でない場合のみtrueを返す（ドキュメント数もチェック）
    return !querySnapshot.empty && querySnapshot.docs.length > 0;
  } catch (error) {
    console.error('Error checking channels:', error);
    return false;
  }
};

/**
 * ユーザーが存在するかチェック
 */
export const checkUsersExist = async (): Promise<boolean> => {
  try {
    const querySnapshot = await getDocs(collection(db, CHAT_COLLECTIONS.USERS));
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking users:', error);
    return false;
  }
};

/**
 * 初期チャンネルを作成（カテゴリIDを使用）
 */
export const createInitialChannels = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🏗️ 初期チャンネルを作成中...');

    // カテゴリIDマップを取得
    const categoryMap = (window as any).__categoryIdMap as Map<string, string>;
    if (!categoryMap || categoryMap.size === 0) {
      console.error('❌ カテゴリIDマップが見つかりません。先にカテゴリを作成してください。');
      return { success: false, error: 'カテゴリが存在しません' };
    }

    const channelPromises = INITIAL_CHANNELS.map(async (channelData) => {
      const categoryId = categoryMap.get(channelData.categoryName);
      if (!categoryId) {
        console.error(`❌ カテゴリIDが見つかりません: ${channelData.categoryName}`);
        return null;
      }

      const { categoryName, ...rest } = channelData;
      const result = await createChannel({
        ...rest,
        categoryId, // カテゴリIDを設定
      });

      if (result.error) {
        console.error(`チャンネル作成エラー (${channelData.name}):`, result.error);
        return null;
      }
      console.log(`✅ チャンネル作成成功: ${channelData.name} (ID: ${result.id}, CategoryID: ${categoryId})`);
      return result.id;
    });

    const results = await Promise.all(channelPromises);
    const successCount = results.filter(id => id !== null).length;

    console.log(`📋 ${successCount}/${INITIAL_CHANNELS.length} チャンネルを作成しました`);
    return { success: true };
  } catch (error: any) {
    console.error('初期チャンネル作成エラー:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 初期ユーザーを作成
 */
export const createInitialUsers = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('👥 初期ユーザーを作成中...');
    
    const userPromises = INITIAL_USERS.map(async (userData) => {
      const result = await upsertChatUser(userData);
      if (result.error) {
        console.error(`ユーザー作成エラー (${userData.name}):`, result.error);
        return false;
      }
      console.log(`✅ ユーザー作成成功: ${userData.name}`);
      return true;
    });

    const results = await Promise.all(userPromises);
    const successCount = results.filter(success => success).length;
    
    console.log(`👤 ${successCount}/${INITIAL_USERS.length} ユーザーを作成しました`);
    return { success: true };
  } catch (error: any) {
    console.error('初期ユーザー作成エラー:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ウェルカムメッセージを送信
 */
export const sendWelcomeMessages = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('💬 ウェルカムメッセージを送信中...');
    
    // 全体連絡チャンネルを取得
    const channelsSnapshot = await getDocs(collection(db, CHAT_COLLECTIONS.CHANNELS));
    const generalChannel = channelsSnapshot.docs.find(doc => 
      doc.data().name === "全体連絡"
    );
    
    if (!generalChannel) {
      return { success: false, error: "全体連絡チャンネルが見つかりません" };
    }

    // ウェルカムメッセージを送信
    const welcomeMessage = {
      channelId: generalChannel.id,
      content: "🏭 Unica製造チームチャットへようこそ！\n\n各部門の連絡・相談にご活用ください。\n\n📋 生産チーム: 生産ラインの情報共有\n🔍 品質管理: 品質関連の連絡\n🔧 設備保全: メンテナンス情報\n⚠️ 安全管理: 安全に関する重要事項\n💬 雑談: 自由な交流",
      authorId: "system",
      authorName: "システム",
      authorRole: "システム",
      type: "system" as const,
      priority: "normal" as const,
      attachments: [],
      reactions: [],
    };

    const result = await sendMessage(welcomeMessage);
    if (result.error) {
      return { success: false, error: result.error };
    }

    console.log('✅ ウェルカムメッセージを送信しました');
    return { success: true };
  } catch (error: any) {
    console.error('ウェルカムメッセージ送信エラー:', error);
    return { success: false, error: error.message };
  }
};

/**
 * カテゴリが存在するかチェック
 */
export const checkCategoriesExist = async (): Promise<boolean> => {
  try {
    const querySnapshot = await getDocs(collection(db, CHAT_COLLECTIONS.CATEGORIES));
    console.log('🔍 [checkCategoriesExist] カテゴリ存在確認:', {
      exists: !querySnapshot.empty,
      count: querySnapshot.docs.length,
    });
    return !querySnapshot.empty && querySnapshot.docs.length > 0;
  } catch (error) {
    console.error('Error checking categories:', error);
    return false;
  }
};

/**
 * 初期カテゴリを作成
 */
export const createInitialCategories = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📁 初期カテゴリを作成中...');

    const categories = [
      { name: '全社', position: 0, order: 0, createdBy: 'system' },
      { name: '生産部', position: 1, order: 1, createdBy: 'system' },
      { name: '品質管理部', position: 2, order: 2, createdBy: 'system' },
      { name: '設備保全部', position: 3, order: 3, createdBy: 'system' },
      { name: '安全管理部', position: 4, order: 4, createdBy: 'system' },
      { name: 'その他', position: 5, order: 5, createdBy: 'system' },
    ];

    const { createCategory } = await import('./chat');

    const categoryMap = new Map<string, string>();
    for (const category of categories) {
      const result = await createCategory(category);
      if (result.error) {
        console.error(`カテゴリ作成エラー (${category.name}):`, result.error);
        return { success: false, error: result.error };
      }
      if (result.id) {
        categoryMap.set(category.name, result.id);
        console.log(`✅ カテゴリ作成成功: ${category.name} (ID: ${result.id})`);
      }
    }

    // グローバルにカテゴリIDマップを保存
    (window as any).__categoryIdMap = categoryMap;

    return { success: true };
  } catch (error: any) {
    console.error('初期カテゴリ作成エラー:', error);
    return { success: false, error: error.message };
  }
};

/**
 * チャットの初期データをすべて作成（カテゴリ優先）
 */
export const initializeChatData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🚀 チャット初期化を開始...');

    // 1. カテゴリの存在確認
    const categoriesExist = await checkCategoriesExist();

    if (!categoriesExist) {
      console.log('📁 カテゴリを作成します...');
      const categoryResult = await createInitialCategories();
      if (!categoryResult.success) {
        return { success: false, error: 'カテゴリ作成に失敗' };
      }
    }

    // 2. チャンネルの存在確認（カテゴリがある前提）
    const channelsExist = await checkChannelsExist();

    if (!channelsExist) {
      console.log('📺 チャンネルを作成します...');
      const channelResult = await createInitialChannels();
      if (!channelResult.success) {
        return { success: false, error: 'チャンネル作成に失敗' };
      }

      // ウェルカムメッセージ
      await sendWelcomeMessages();
    }

    // 3. ユーザーの存在確認
    const usersExist = await checkUsersExist();
    if (!usersExist) {
      await createInitialUsers();
    }

    console.log('🎉 チャット初期化が完了しました');
    return { success: true };
  } catch (error: any) {
    console.error('チャット初期化エラー:', error);
    return { success: false, error: error.message };
  }
};

/**
 * チャンネルを強制的に再作成する（デバッグ用）
 */
export const forceRecreateChannels = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 チャンネルを強制再作成します...');

    // 既存のチャンネルを削除
    const channelsSnapshot = await getDocs(collection(db, CHAT_COLLECTIONS.CHANNELS));
    const batch = writeBatch(db);
    channelsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // 初期チャンネルを作成
    const result = await createInitialChannels();

    if (result.success) {
      console.log('✅ チャンネル再作成完了');
      // ウェルカムメッセージ送信
      await sendWelcomeMessages();
    }

    return result;
  } catch (error: any) {
    console.error('❌ チャンネル再作成エラー:', error);
    return { success: false, error: error.message };
  }
};

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).forceRecreateChannels = forceRecreateChannels;
}