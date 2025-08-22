import { 
  createChannel, 
  upsertChatUser,
  sendMessage,
  CHAT_COLLECTIONS 
} from './chat';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';

/**
 * 初期チャンネルデータ
 */
const INITIAL_CHANNELS = [
  {
    name: "全体連絡",
    description: "全社員向けの重要なお知らせ",
    type: "announcement" as const,
    category: "全社",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "生産チーム",
    description: "生産ラインの連絡・相談",
    type: "text" as const,
    category: "生産部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "品質管理",
    description: "品質管理・検査に関する連絡",
    type: "text" as const,
    category: "品質管理部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "設備保全",
    description: "設備メンテナンス・故障対応",
    type: "text" as const,
    category: "設備保全部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "安全管理",
    description: "安全管理・事故報告",
    type: "text" as const,
    category: "安全管理部",
    isPrivate: false,
    createdBy: "system",
  },
  {
    name: "雑談",
    description: "自由な雑談・交流",
    type: "text" as const,
    category: "その他",
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
    return !querySnapshot.empty;
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
 * 初期チャンネルを作成
 */
export const createInitialChannels = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🏗️ 初期チャンネルを作成中...');
    
    const channelPromises = INITIAL_CHANNELS.map(async (channelData) => {
      const result = await createChannel(channelData);
      if (result.error) {
        console.error(`チャンネル作成エラー (${channelData.name}):`, result.error);
        return null;
      }
      console.log(`✅ チャンネル作成成功: ${channelData.name} (ID: ${result.id})`);
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
 * チャットの初期データをすべて作成
 */
export const initializeChatData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🚀 チャット初期化を開始...');
    
    // チャンネルとユーザーの存在確認
    const [channelsExist, usersExist] = await Promise.all([
      checkChannelsExist(),
      checkUsersExist(),
    ]);

    if (channelsExist && usersExist) {
      console.log('ℹ️ 初期データは既に存在します');
      return { success: true };
    }

    // 初期データ作成
    const results = await Promise.all([
      !channelsExist ? createInitialChannels() : { success: true },
      !usersExist ? createInitialUsers() : { success: true },
    ]);

    // エラーチェック
    const hasError = results.some(result => !result.success);
    if (hasError) {
      const errors = results.filter(result => !result.success).map(result => result.error);
      return { success: false, error: errors.join(', ') };
    }

    // ウェルカムメッセージ送信
    if (!channelsExist) {
      const welcomeResult = await sendWelcomeMessages();
      if (!welcomeResult.success) {
        console.warn('ウェルカムメッセージ送信に失敗:', welcomeResult.error);
      }
    }

    console.log('🎉 チャット初期化が完了しました');
    return { success: true };
  } catch (error: any) {
    console.error('チャット初期化エラー:', error);
    return { success: false, error: error.message };
  }
};