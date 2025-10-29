import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './config';

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const CHAT_COLLECTIONS = {
  SERVERS: 'chatServers',
  CATEGORIES: 'chatCategories',
  CHANNELS: 'chatChannels',
  MESSAGES: 'chatMessages',
  USERS: 'chatUsers',
  USER_STATUSES: 'userStatuses',
  CHANNEL_MEMBERS: 'channelMembers',
  UNREAD_COUNTS: 'unreadCounts',
  TYPING_STATUS: 'typingStatus',
  THREADS: 'threads',
  NOTIFICATIONS: 'notifications',
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * オブジェクトからundefinedフィールドを除去する関数（ネストされたオブジェクトも処理）
 */
const removeUndefinedFields = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        result[key] = removeUndefinedFields(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ChannelCategory {
  id: string;
  name: string;
  position: number;
  order: number; // ソート順
  isCollapsed?: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  permissions?: {
    viewRole?: string[];
    manageRole?: string[];
  };
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  type: 'text' | 'voice' | 'announcement';
  category?: string; // 互換性のため残す
  categoryId?: string; // 新しいカテゴリーID
  position?: number; // カテゴリー内での表示順
  order: number; // ソート順
  isPrivate: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  memberCount: number;
  permissions?: {
    canRead: boolean;
    canWrite: boolean;
    canManage: boolean;
    allowedRoles?: string[];
    blockedUsers?: string[];
  };
  lastMessage?: {
    content: string;
    authorName: string;
    timestamp: any;
  };
}

export interface ChatMessage {
  id: string;
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  timestamp: any;
  // clientTimestampを削除：serverTimestamp()のみ使用
  editedAt?: any;
  type: 'message' | 'system' | 'announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  mentions?: string[]; // メンションされたユーザーID
  replyTo?: {
    messageId: string;
    content: string;
    authorName: string;
  };
  threadId?: string; // スレッドの親メッセージID
  isThread?: boolean; // スレッドメッセージかどうか
  threadCount?: number; // スレッド内メッセージ数
  isDeleted: boolean;
  isOptimistic?: boolean; // 楽観的UIのための一時メッセージフラグ
  status?: 'sending' | 'sent' | 'failed'; // Discord風メッセージ状態
  localId?: string; // ローカルID（楽観的メッセージ用）
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio';
  size: number;
  mimeType: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: any;
  status: 'online' | 'away' | 'busy' | 'offline';
  statusMessage?: string;
  isTyping?: boolean;
  typingInChannel?: string;
  lastActivity?: any;
  permissions?: {
    canCreateChannels: boolean;
    canManageChannels: boolean;
    canMentionEveryone: boolean;
  };
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  joinedAt: any;
  role: 'admin' | 'member';
  canWrite: boolean;
  notifications: boolean;
}

export interface UnreadCount {
  userId: string;
  channelId: string;
  count: number;
  lastReadMessageId?: string;
  lastReadAt: any;
}

export interface TypingStatus {
  userId: string;
  channelId: string;
  userName: string;
  timestamp: any;
}

export interface ChatNotification {
  id: string;
  userId: string;
  type: 'mention' | 'reply' | 'channel_message' | 'thread_reply';
  title: string;
  message: string;
  channelId: string;
  messageId?: string;
  fromUserId: string;
  fromUserName: string;
  isRead: boolean;
  createdAt: any;
}

export interface Thread {
  id: string; // 親メッセージIDと同じ
  channelId: string;
  parentMessageId: string;
  messageCount: number;
  participants: string[]; // 参加ユーザーIDの配列
  lastActivity: any;
  createdAt: any;
  updatedAt: any;
}

// =============================================================================
// CATEGORY OPERATIONS
// =============================================================================

/**
 * カテゴリー作成
 */
export const createCategory = async (
  categoryData: Omit<ChannelCategory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.CATEGORIES), {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { id: docRef.id, error: null };
  } catch (error: Error | unknown) {
    console.error('Error creating category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { id: null, error: errorMessage };
  }
};

/**
 * カテゴリー更新
 */
export const updateCategory = async (
  categoryId: string,
  updates: Partial<ChannelCategory>
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, CHAT_COLLECTIONS.CATEGORIES, categoryId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating category:', error);
    return { error: error.message };
  }
};

/**
 * カテゴリー削除
 */
export const deleteCategory = async (
  categoryId: string
): Promise<{ error: string | null }> => {
  try {
    // カテゴリー内のチャンネルを未分類に移動
    const channelsQuery = query(
      collection(db, CHAT_COLLECTIONS.CHANNELS),
      where('categoryId', '==', categoryId)
    );
    const channelsSnapshot = await getDocs(channelsQuery);
    
    const batch = writeBatch(db);
    channelsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        categoryId: null,
        category: '未分類',
        updatedAt: serverTimestamp() 
      });
    });
    
    // カテゴリーを削除
    batch.delete(doc(db, CHAT_COLLECTIONS.CATEGORIES, categoryId));
    await batch.commit();
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting category:', error);
    return { error: error.message };
  }
};

/**
 * カテゴリー一覧取得
 */
export const getCategories = async (): Promise<ChannelCategory[]> => {
  try {
    const q = query(
      collection(db, CHAT_COLLECTIONS.CATEGORIES),
      orderBy('position', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChannelCategory));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * カテゴリーのリアルタイム監視
 */
export const subscribeToCategories = (
  callback: (categories: ChannelCategory[]) => void
) => {
  const q = query(
    collection(db, CHAT_COLLECTIONS.CATEGORIES),
    orderBy('position', 'asc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const categories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChannelCategory));
    
    callback(categories);
  });
};

/**
 * カテゴリーの順序を更新
 */
export const updateCategoriesOrder = async (
  categoryUpdates: { id: string; position: number }[]
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);
    
    categoryUpdates.forEach(({ id, position }) => {
      const docRef = doc(db, CHAT_COLLECTIONS.CATEGORIES, id);
      batch.update(docRef, { 
        position, 
        updatedAt: serverTimestamp() 
      });
    });
    
    await batch.commit();
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating categories order:', error);
    return { error: error.message };
  }
};

/**
 * チャンネルの順序を更新
 */
export const updateChannelsOrder = async (
  channelUpdates: { id: string; position: number; categoryId?: string }[]
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);
    
    channelUpdates.forEach(({ id, position, categoryId }) => {
      const docRef = doc(db, CHAT_COLLECTIONS.CHANNELS, id);
      const updateData: any = { 
        position, 
        updatedAt: serverTimestamp() 
      };
      
      if (categoryId !== undefined) {
        updateData.categoryId = categoryId;
      }
      
      batch.update(docRef, updateData);
    });
    
    await batch.commit();
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating channels order:', error);
    return { error: error.message };
  }
};

// =============================================================================
// CHANNEL OPERATIONS
// =============================================================================

/**
 * チャンネル作成
 */
export const createChannel = async (
  channelData: Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const cleanChannelData = {
      ...channelData,
      memberCount: 0,
      permissions: channelData.permissions || {
        canRead: true,
        canWrite: true,
        canManage: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // undefinedフィールドを除去してからFirestoreに保存
    const cleanedData = removeUndefinedFields(cleanChannelData);
    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.CHANNELS), cleanedData);

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return { id: null, error: error.message || 'チャンネルの作成に失敗しました' };
  }
};

/**
 * チャンネル編集
 */
export const updateChannel = async (
  channelId: string,
  updateData: Partial<Omit<ChatChannel, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, CHAT_COLLECTIONS.CHANNELS, channelId), {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating channel:', error);
    return { error: error.message };
  }
};

/**
 * チャンネル削除
 */
export const deleteChannel = async (
  channelId: string
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);
    
    // チャンネルを削除
    batch.delete(doc(db, CHAT_COLLECTIONS.CHANNELS, channelId));
    
    // 関連するメッセージも削除
    const messagesQuery = query(
      collection(db, CHAT_COLLECTIONS.MESSAGES),
      where('channelId', '==', channelId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // 関連する未読数も削除
    const unreadQuery = query(
      collection(db, CHAT_COLLECTIONS.UNREAD_COUNTS),
      where('channelId', '==', channelId)
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    unreadSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting channel:', error);
    return { error: error.message };
  }
};

/**
 * チャンネルメンバー追加
 */
export const addChannelMember = async (
  channelId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<{ error: string | null }> => {
  try {
    const memberData: ChannelMember = {
      channelId,
      userId,
      joinedAt: serverTimestamp(),
      role,
      canWrite: true,
      notifications: true,
    };
    
    await setDoc(
      doc(db, CHAT_COLLECTIONS.CHANNEL_MEMBERS, `${channelId}_${userId}`),
      memberData
    );
    
    // チャンネルのメンバー数を更新
    const channelRef = doc(db, CHAT_COLLECTIONS.CHANNELS, channelId);
    const channelDoc = await getDoc(channelRef);
    if (channelDoc.exists()) {
      const currentCount = channelDoc.data().memberCount || 0;
      await updateDoc(channelRef, { memberCount: currentCount + 1 });
    }
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error adding channel member:', error);
    return { error: error.message };
  }
};

/**
 * チャンネルメンバー削除
 */
export const removeChannelMember = async (
  channelId: string,
  userId: string
): Promise<{ error: string | null }> => {
  try {
    await deleteDoc(
      doc(db, CHAT_COLLECTIONS.CHANNEL_MEMBERS, `${channelId}_${userId}`)
    );
    
    // チャンネルのメンバー数を更新
    const channelRef = doc(db, CHAT_COLLECTIONS.CHANNELS, channelId);
    const channelDoc = await getDoc(channelRef);
    if (channelDoc.exists()) {
      const currentCount = channelDoc.data().memberCount || 0;
      await updateDoc(channelRef, { memberCount: Math.max(0, currentCount - 1) });
    }
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error removing channel member:', error);
    return { error: error.message };
  }
};

/**
 * チャンネル一覧取得
 */
export const getChannels = async (
  userId?: string
): Promise<{ data: ChatChannel[]; error: string | null }> => {
  try {
    // 単一orderByクエリでFirestoreインデックスエラーを回避
    let q = query(
      collection(db, CHAT_COLLECTIONS.CHANNELS),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    let channels = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatChannel[];
    
    // ユーザーがアクセス可能なチャンネルのみフィルタリング
    if (userId) {
      channels = await filterChannelsByPermissions(channels, userId);
    }

    return { data: channels, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting channels:', error);
    return { data: [], error: error.message };
  }
};

/**
 * ユーザーがアクセス可能なチャンネルをフィルタリング
 */
const filterChannelsByPermissions = async (
  channels: ChatChannel[],
  userId: string
): Promise<ChatChannel[]> => {
  // 一時的にパーミッションチェックをスキップして、すべてのチャンネルを返す
  return channels;

  /* 元のコード（一時的に無効化）
  const accessibleChannels: ChatChannel[] = [];

  for (const channel of channels) {
    // パブリックチャンネルは常にアクセス可能
    if (!channel.isPrivate) {
      accessibleChannels.push(channel);
      continue;
    }

    // プライベートチャンネルはメンバーかどうかチェック
    const memberDoc = await getDoc(
      doc(db, CHAT_COLLECTIONS.CHANNEL_MEMBERS, `${channel.id}_${userId}`)
    );

    if (memberDoc.exists()) {
      accessibleChannels.push(channel);
    }
  }

  return accessibleChannels;
  */
};

/**
 * チャンネルメンバー一覧取得
 */
export const getChannelMembers = async (
  channelId: string
): Promise<{ data: ChannelMember[]; error: string | null }> => {
  try {
    const q = query(
      collection(db, CHAT_COLLECTIONS.CHANNEL_MEMBERS),
      where('channelId', '==', channelId)
    );
    
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => doc.data()) as ChannelMember[];
    
    return { data: members, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting channel members:', error);
    return { data: [], error: error.message };
  }
};

/**
 * チャンネルをリアルタイムで監視
 */
export const subscribeToChannels = (
  callback: (channels: ChatChannel[]) => void,
  userId?: string
) => {
  // 複合インデックス回避のため単一orderByを使用
  let q = query(
    collection(db, CHAT_COLLECTIONS.CHANNELS),
    orderBy('name', 'asc')
  );

  return onSnapshot(
    q,
    async (querySnapshot) => {
      let channels = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      }) as ChatChannel[];

      // ユーザーがアクセス可能なチャンネルのみフィルタリング
      if (userId) {
        channels = await filterChannelsByPermissions(channels, userId);
      }

    callback(channels);
  }, (error) => {
    console.error('Error subscribing to channels:', error);
    callback([]);
  });
};

/**
 * チャンネルメンバーをリアルタイムで監視
 */
export const subscribeToChannelMembers = (
  channelId: string,
  callback: (members: ChannelMember[]) => void
) => {
  const q = query(
    collection(db, CHAT_COLLECTIONS.CHANNEL_MEMBERS),
    where('channelId', '==', channelId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const members = querySnapshot.docs.map(doc => doc.data()) as ChannelMember[];
    callback(members);
  }, (error) => {
    console.error('Error in channel members subscription:', error);
    callback([]);
  });
}

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

/**
 * メッセージ送信
 */
/**
 * メンション解析関数（内部用）
 */
const parseSimpleMentions = (content: string): string[] => {
  const mentionPattern = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionPattern.exec(content)) !== null) {
    mentions.push(match[1]); // ユーザー名部分
  }
  
  return [...new Set(mentions)]; // 重複を削除
};


export const sendMessage = async (
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isDeleted'>
): Promise<{ id: string | null; error: string | null }> => {
  try {

    // メンション解析
    const mentionUsernames = parseSimpleMentions(messageData.content);

    // タイムスタンプの統一処理（serverTimestamp()のみ使用）
    const serverTime = serverTimestamp();

    // メッセージデータにメンション情報を追加
    const messageWithMentions = {
      ...messageData,
      mentions: mentionUsernames.length > 0 ? mentionUsernames : undefined,
      timestamp: serverTime,
      isDeleted: false,
    };

    // undefinedフィールドを除去してからFirestoreに保存
    const cleanedMessage = removeUndefinedFields(messageWithMentions);
    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.MESSAGES), cleanedMessage);

    // チャンネルの最終メッセージ更新
    await updateDoc(doc(db, CHAT_COLLECTIONS.CHANNELS, messageData.channelId), {
      lastMessage: {
        content: messageData.content,
        authorName: messageData.authorName,
        timestamp: serverTime,
      },
      updatedAt: serverTime,
    });

    // メンション通知作成（非同期で実行）
    if (mentionUsernames.length > 0) {
      // ユーザー名からユーザーIDに変換してから通知作成
      const usersQuery = query(
        collection(db, CHAT_COLLECTIONS.USERS),
        where('name', 'in', mentionUsernames)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const mentionedUserIds = usersSnapshot.docs.map(doc => doc.id);

      if (mentionedUserIds.length > 0) {
        sendMentionNotifications(
          docRef.id,
          messageData.channelId,
          mentionedUserIds,
          messageData.authorId,
          messageData.authorName,
          messageData.content
        ).catch(console.error);
      }
    }

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('❌ [Firebase] メッセージ送信エラー:', error);
    return { id: null, error: error.message || 'メッセージの送信に失敗しました' };
  }
};

/**
 * チャンネルのメッセージをリアルタイムで監視
 */
export const subscribeToMessages = (
  channelId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
) => {
  // channelIdの検証 - より安全な方法
  if (!channelId || typeof channelId !== 'string') {
    callback([]);
    return () => {}; // 空のunsubscribe関数を返す
  }

  const trimmedChannelId = String(channelId).trim();
  if (trimmedChannelId === '') {
    callback([]);
    return () => {}; // 空のunsubscribe関数を返す
  }

  // シンプルクエリ: channelIdのみでフィルタし、昇順で取得
  const q = query(
    collection(db, CHAT_COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
    orderBy('timestamp', 'asc'), // チャット表示に適した昇順（下から上に表示）
    limit(messageLimit)
  );

  return onSnapshot(q, (querySnapshot) => {
    let messages = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    }) as ChatMessage[];

    // クライアントサイドで削除メッセージを除外
    messages = messages.filter(msg => !msg.isDeleted);

    // 追加の重複排除処理（ID による）
    const uniqueMessages = new Map<string, ChatMessage>();
    messages.forEach(msg => {
      uniqueMessages.set(msg.id, msg);
    });

    // マップから配列に戻す（順序は保持される）
    const deduplicatedMessages = Array.from(uniqueMessages.values());

    // 既に昇順で取得しているので、そのまま使用（古いメッセージから新しいメッセージへ）
    callback(deduplicatedMessages);
  }, (error) => {
    console.error('Error subscribing to messages:', error, 'channelId:', trimmedChannelId);
    callback([]);
  });
};

/**
 * メッセージ編集
 */
export const updateMessage = async (
  messageId: string,
  content: string
): Promise<{ error: string | null }> => {
  try {
    const currentTime = Timestamp.now();
    await updateDoc(doc(db, CHAT_COLLECTIONS.MESSAGES, messageId), {
      content,
      editedAt: currentTime,
    });

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating message:', error);
    return { error: error.message };
  }
};

/**
 * メッセージ削除
 */
export const deleteMessage = async (
  messageId: string
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, CHAT_COLLECTIONS.MESSAGES, messageId), {
      isDeleted: true,
      content: '[削除されたメッセージ]',
    });

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting message:', error);
    return { error: error.message };
  }
};

// =============================================================================
// FILE UPLOAD OPERATIONS
// =============================================================================

/**
 * ファイルアップロード
 */
export const uploadChatFile = async (
  file: File,
  userId: string,
  channelId: string
): Promise<{ url: string | null; attachment: ChatAttachment | null; error: string | null }> => {
  try {
    // ファイルサイズ制限（1MB - Firestoreのドキュメントサイズ制限のため）
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      return { url: null, attachment: null, error: 'ファイルサイズが1MBを超えています（Firebase無料プランの制限）' };
    }

    // ファイルタイプ判定
    let fileType: ChatAttachment['type'] = 'document';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type.startsWith('audio/')) fileType = 'audio';

    // Base64に変換（Storage不使用）
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const attachment: ChatAttachment = {
      id: Date.now().toString(),
      name: file.name,
      url: base64Data, // Base64データをURLとして保存
      type: fileType,
      size: file.size,
      mimeType: file.type,
    };

    return { url: base64Data, attachment, error: null };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('Error uploading file:', error);
    return { url: null, attachment: null, error: errorMessage };
  }
};

/**
 * ファイル削除
 */
export const deleteChatFile = async (
  fileUrl: string
): Promise<{ error: string | null }> => {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting file:', error);
    return { error: error.message };
  }
};

// =============================================================================
// REACTION OPERATIONS
// =============================================================================

/**
 * リアクション追加・削除
 */
export const toggleReaction = async (
  messageId: string,
  emoji: string,
  userId: string
): Promise<{ error: string | null }> => {
  try {
    // userIdの検証 - より安全な方法
    if (!userId || typeof userId !== 'string') {
      return { error: 'Invalid user ID' };
    }

    const trimmedUserId = String(userId).trim();
    if (trimmedUserId === '') {
      return { error: 'Empty user ID' };
    }

    // messageIdとemojiの検証も追加
    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
      return { error: 'Invalid message ID' };
    }

    if (!emoji || typeof emoji !== 'string' || emoji.trim() === '') {
      return { error: 'Invalid emoji' };
    }
    const messageRef = doc(db, CHAT_COLLECTIONS.MESSAGES, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return { error: 'メッセージが見つかりません' };
    }

    const messageData = messageDoc.data() as ChatMessage;
    const reactions = messageData.reactions || [];
    
    // 既存のリアクションを探す
    const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);
    
    if (existingReactionIndex >= 0) {
      // 既存のリアクションがある場合
      const reaction = reactions[existingReactionIndex];
      const userIndex = reaction.users.indexOf(trimmedUserId);
      
      if (userIndex >= 0) {
        // ユーザーがすでにリアクションしている → 削除
        reaction.users.splice(userIndex, 1);
        reaction.count = reaction.users.length;
        
        if (reaction.count === 0) {
          // カウントが0になったらリアクション自体を削除
          reactions.splice(existingReactionIndex, 1);
        }
      } else {
        // ユーザーがリアクションしていない → 追加
        reaction.users.push(trimmedUserId);
        reaction.count = reaction.users.length;
      }
    } else {
      // 新しいリアクション
      reactions.push({
        emoji,
        count: 1,
        users: [trimmedUserId],
      });
    }

    await updateDoc(messageRef, { reactions });
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error toggling reaction:', error);
    return { error: error.message };
  }
};

// =============================================================================
// USER OPERATIONS
// =============================================================================

/**
 * ユーザー作成・更新
 */
export const upsertChatUser = async (
  userData: Omit<ChatUser, 'isOnline' | 'lastSeen'>
): Promise<{ error: string | null }> => {
  try {
    await setDoc(doc(db, CHAT_COLLECTIONS.USERS, userData.id), {
      ...userData,
      isOnline: true,
      lastSeen: serverTimestamp(),
    }, { merge: true });

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error upserting user:', error);
    return { error: error.message };
  }
};

/**
 * ユーザーのオンライン状態更新
 */
export const updateUserStatus = async (
  userId: string,
  status: ChatUser['status'],
  statusMessage?: string
): Promise<{ error: string | null }> => {
  try {
    // userIdの検証 - より安全な方法
    if (!userId || typeof userId !== 'string') {
      return { error: 'Invalid user ID' };
    }

    const trimmedUserId = String(userId).trim();
    if (trimmedUserId === '') {
      return { error: 'Empty user ID' };
    }

    const updateData: any = {
      status,
      isOnline: status === 'online',
      lastSeen: serverTimestamp(),
    };

    if (statusMessage !== undefined) {
      updateData.statusMessage = statusMessage;
    }

    await updateDoc(doc(db, CHAT_COLLECTIONS.USERS, userId), updateData);
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating user status:', error);
    return { error: error.message };
  }
};

/**
 * オンラインユーザーをリアルタイムで監視
 */
export const subscribeToUsers = (
  callback: (users: ChatUser[]) => void
) => {
  const q = query(
    collection(db, CHAT_COLLECTIONS.USERS),
    orderBy('name', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatUser[];
    
    callback(users);
  }, (error) => {
    console.error('Error in users subscription:', error);
    callback([]);
  });
};

// =============================================================================
// SEARCH OPERATIONS
// =============================================================================

/**
 * メッセージ検索
 */
export const searchMessages = async (
  channelIds: string[],
  searchQuery: string,
  messageLimit: number = 50
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    if (!searchQuery.trim()) {
      return { data: [], error: null };
    }

    // 複数チャンネルで検索
    const allMessages: ChatMessage[] = [];
    
    for (const channelId of channelIds) {
      const q = query(
        collection(db, CHAT_COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'desc'),
        limit(messageLimit)
      );

      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      // クライアントサイドでコンテンツ検索（Firestoreの制限のため）
      const filteredMessages = messages.filter(message => 
        message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      allMessages.push(...filteredMessages);
    }

    // 時間順でソート
    allMessages.sort((a, b) => 
      new Date(b.timestamp?.toDate?.() || b.timestamp).getTime() - 
      new Date(a.timestamp?.toDate?.() || a.timestamp).getTime()
    );

    return { data: allMessages.slice(0, messageLimit), error: null };
  } catch (error: Error | unknown) {
    console.error('Error searching messages:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 特定チャンネルでのメッセージ検索
 */
export const searchChannelMessages = async (
  channelId: string,
  searchQuery: string,
  messageLimit: number = 50
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  return searchMessages([channelId], searchQuery, messageLimit);
};

// =============================================================================
// UNREAD COUNT OPERATIONS
// =============================================================================

/**
 * 未読数更新
 */
export const updateUnreadCount = async (
  userId: string,
  channelId: string,
  lastReadMessageId?: string
): Promise<{ error: string | null }> => {
  try {
    // パラメータの検証 - より安全な方法
    if (!userId || typeof userId !== 'string') {
      return { error: 'Invalid user ID' };
    }

    const trimmedUserId = String(userId).trim();
    if (trimmedUserId === '') {
      return { error: 'Empty user ID' };
    }

    if (!channelId || typeof channelId !== 'string') {
      return { error: 'Invalid channel ID' };
    }

    const trimmedChannelId = String(channelId).trim();
    if (trimmedChannelId === '') {
      return { error: 'Empty channel ID' };
    }

    const unreadId = `${userId}_${channelId}`;
    await setDoc(doc(db, CHAT_COLLECTIONS.UNREAD_COUNTS, unreadId), {
      userId,
      channelId,
      count: 0,
      lastReadMessageId: lastReadMessageId || '',
      lastReadAt: serverTimestamp(),
    });

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating unread count:', error);
    return { error: error.message };
  }
};

/**
 * 未読数をリアルタイムで監視
 */
export const subscribeToUnreadCounts = (
  userId: string,
  callback: (unreadCounts: UnreadCount[]) => void
) => {
  // userIdの検証 - より安全な方法
  if (!userId || typeof userId !== 'string') {
    callback([]);
    return () => {}; // 空のunsubscribe関数を返す
  }

  const trimmedUserId = String(userId).trim();
  if (trimmedUserId === '') {
    callback([]);
    return () => {}; // 空のunsubscribe関数を返す
  }

  const q = query(
    collection(db, CHAT_COLLECTIONS.UNREAD_COUNTS),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const unreadCounts = querySnapshot.docs.map(doc => ({
      ...doc.data()
    })) as UnreadCount[];
    
    callback(unreadCounts);
  }, (error) => {
    console.error('Error in unread counts subscription:', error);
    callback([]);
  });
};

// =============================================================================
// ENHANCED SEARCH OPERATIONS 
// =============================================================================

/**
 * 日付でメッセージを検索
 */
export const searchMessagesByDate = async (
  channelIds: string[],
  startDate: Date,
  endDate: Date,
  messageLimit: number = 50
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    const allMessages: ChatMessage[] = [];

    for (const channelId of channelIds) {
      // インデックス回避: シンプルなクエリ使用
      const q = query(
        collection(db, CHAT_COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'desc'),
        limit(messageLimit * 2) // 日付フィルタを考慮して多めに取得
      );

      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      // クライアントサイドで日付フィルタと削除メッセージを除外
      const filteredMessages = messages.filter(msg => {
        if (msg.isDeleted) return false;

        const msgDate = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
        return msgDate >= startDate && msgDate <= endDate;
      });

      allMessages.push(...filteredMessages);
    }

    // 時間順でソート
    allMessages.sort((a, b) =>
      new Date(b.timestamp?.toDate?.() || b.timestamp).getTime() -
      new Date(a.timestamp?.toDate?.() || a.timestamp).getTime()
    );

    return { data: allMessages.slice(0, messageLimit), error: null };
  } catch (error: Error | unknown) {
    console.error('Error searching messages by date:', error);
    return { data: [], error: error.message };
  }
};

/**
 * ユーザー別メッセージ検索
 */
export const searchMessagesByUser = async (
  channelIds: string[],
  authorId: string,
  messageLimit: number = 50
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    const allMessages: ChatMessage[] = [];
    
    for (const channelId of channelIds) {
      // インデックス回避: シンプルなクエリ使用
      const q = query(
        collection(db, CHAT_COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'desc'),
        limit(messageLimit * 2) // authorIdフィルタを考慮して多めに取得
      );

      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      // クライアントサイドでauthorIdフィルタと削除メッセージを除外
      const filteredMessages = messages.filter(msg => {
        return msg.authorId === authorId && !msg.isDeleted;
      });

      allMessages.push(...filteredMessages);
    }

    // 時間順でソート
    allMessages.sort((a, b) => 
      new Date(b.timestamp?.toDate?.() || b.timestamp).getTime() - 
      new Date(a.timestamp?.toDate?.() || a.timestamp).getTime()
    );

    return { data: allMessages.slice(0, messageLimit), error: null };
  } catch (error: Error | unknown) {
    console.error('Error searching messages by user:', error);
    return { data: [], error: error.message };
  }
};

// =============================================================================
// MENTION OPERATIONS
// =============================================================================

/**
 * メンションを解析してメッセージに追加
 */
export const parseMentions = (content: string, users: ChatUser[]): string[] => {
  const mentionRegex = /@([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionText = match[1];
    
    if (mentionText === 'everyone' || mentionText === 'here') {
      mentions.push(mentionText);
    } else {
      // ユーザー名で検索
      const user = users.find(u => 
        u.name.toLowerCase().includes(mentionText.toLowerCase()) ||
        u.email.toLowerCase().includes(mentionText.toLowerCase())
      );
      if (user) {
        mentions.push(user.id);
      }
    }
  }
  
  return [...new Set(mentions)]; // 重複を除去
};

/**
 * メンション通知を送信
 */
export const sendMentionNotifications = async (
  messageId: string,
  channelId: string,
  mentions: string[],
  fromUserId: string,
  fromUserName: string,
  content: string
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);
    
    for (const mentionedUserId of mentions) {
      if (mentionedUserId === 'everyone' || mentionedUserId === 'here') {
        // @everyone または @here の場合、全ユーザーに通知
        const usersQuery = query(collection(db, CHAT_COLLECTIONS.USERS));
        const usersSnapshot = await getDocs(usersQuery);
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          if (userId !== fromUserId) {
            const notificationData: Omit<ChatNotification, 'id'> = {
              userId,
              type: 'mention',
              title: `${fromUserName}があなたをメンションしました`,
              message: content.slice(0, 100),
              channelId,
              messageId,
              fromUserId,
              fromUserName,
              isRead: false,
              createdAt: serverTimestamp(),
            };
            
            const notificationRef = doc(collection(db, CHAT_COLLECTIONS.NOTIFICATIONS));
            batch.set(notificationRef, notificationData);
          }
        }
      } else {
        // 個別ユーザーへのメンション
        if (mentionedUserId !== fromUserId) {
          const notificationData: Omit<ChatNotification, 'id'> = {
            userId: mentionedUserId,
            type: 'mention',
            title: `${fromUserName}があなたをメンションしました`,
            message: content.slice(0, 100),
            channelId,
            messageId,
            fromUserId,
            fromUserName,
            isRead: false,
            createdAt: serverTimestamp(),
          };
          
          const notificationRef = doc(collection(db, CHAT_COLLECTIONS.NOTIFICATIONS));
          batch.set(notificationRef, notificationData);
        }
      }
    }
    
    await batch.commit();
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error sending mention notifications:', error);
    return { error: error.message };
  }
};

// =============================================================================
// THREAD OPERATIONS
// =============================================================================

/**
 * スレッド作成
 */
export const createThread = async (
  parentMessageId: string,
  channelId: string
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const threadData: Omit<Thread, 'id'> = {
      channelId,
      parentMessageId,
      messageCount: 0,
      participants: [],
      lastActivity: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, CHAT_COLLECTIONS.THREADS, parentMessageId), threadData);
    
    // 親メッセージをスレッドとしてマーク
    await updateDoc(doc(db, CHAT_COLLECTIONS.MESSAGES, parentMessageId), {
      isThread: true,
      threadCount: 0,
    });
    
    return { id: parentMessageId, error: null };
  } catch (error: Error | unknown) {
    console.error('Error creating thread:', error);
    return { id: null, error: error.message };
  }
};

/**
 * スレッドメッセージ送信
 */
export const sendThreadMessage = async (
  threadId: string,
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isDeleted' | 'threadId'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    // Firestore Timestamp を使用して正確な時刻を設定
    const currentTime = Timestamp.now();

    // undefinedフィールドを除去してメッセージを作成
    const messageWithThread = {
      ...messageData,
      threadId,
      timestamp: currentTime,
      isDeleted: false,
    };

    const cleanedMessage = removeUndefinedFields(messageWithThread);
    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.MESSAGES), cleanedMessage);

    // スレッド情報を更新
    const threadRef = doc(db, CHAT_COLLECTIONS.THREADS, threadId);
    const threadDoc = await getDoc(threadRef);

    if (threadDoc.exists()) {
      const threadData = threadDoc.data() as Thread;
      const participants = [...new Set([...threadData.participants, messageData.authorId])];

      await updateDoc(threadRef, {
        messageCount: threadData.messageCount + 1,
        participants,
        lastActivity: currentTime,
        updatedAt: currentTime,
      });

      // 親メッセージのスレッド数を更新
      await updateDoc(doc(db, CHAT_COLLECTIONS.MESSAGES, threadId), {
        threadCount: threadData.messageCount + 1,
      });
    }

    return { id: docRef.id, error: null };
  } catch (error: Error | unknown) {
    console.error('Error sending thread message:', error);
    return { id: null, error: error.message };
  }
};

/**
 * スレッドメッセージをリアルタイムで監視
 */
export const subscribeToThreadMessages = (
  threadId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
) => {
  const q = query(
    collection(db, CHAT_COLLECTIONS.MESSAGES),
    where('threadId', '==', threadId),
    where('isDeleted', '==', false),
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    
    callback(messages);
  }, (error) => {
    console.error('Error in thread messages subscription:', error);
    callback([]);
  });
};

// =============================================================================
// TYPING STATUS OPERATIONS
// =============================================================================

/**
 * タイピング状態を更新
 */
export const updateTypingStatus = async (
  userId: string,
  userName: string,
  channelId: string,
  isTyping: boolean
): Promise<{ error: string | null }> => {
  try {
    const typingId = `${userId}_${channelId}`;

    if (isTyping) {
      const currentTime = Timestamp.now();
      await setDoc(doc(db, CHAT_COLLECTIONS.TYPING_STATUS, typingId), {
        userId,
        userName,
        channelId,
        timestamp: currentTime,
      });
    } else {
      await deleteDoc(doc(db, CHAT_COLLECTIONS.TYPING_STATUS, typingId));
    }

    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating typing status:', error);
    return { error: error.message };
  }
};

/**
 * タイピング状態をリアルタイムで監視
 */
export const subscribeToTypingStatus = (
  channelId: string,
  callback: (typingUsers: TypingStatus[]) => void
) => {
  const q = query(
    collection(db, CHAT_COLLECTIONS.TYPING_STATUS),
    where('channelId', '==', channelId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const typingUsers = querySnapshot.docs.map(doc => doc.data()) as TypingStatus[];
    
    // 5秒以上前のタイピング状態を除外
    const now = new Date();
    const filteredTypingUsers = typingUsers.filter(typing => {
      const typingTime = typing.timestamp?.toDate?.() || new Date(typing.timestamp);
      return (now.getTime() - typingTime.getTime()) < 5000;
    });
    
    callback(filteredTypingUsers);
  }, (error) => {
    console.error('Error in typing status subscription:', error);
    callback([]);
  });
};

/**
 * ユーザーの最終アクティビティを更新
 */
export const updateUserActivity = async (
  userId: string
): Promise<{ error: string | null }> => {
  try {
    // userIdの検証 - より安全な方法
    if (!userId || typeof userId !== 'string') {
      return { error: 'Invalid user ID' };
    }

    const trimmedUserId = String(userId).trim();
    if (trimmedUserId === '') {
      return { error: 'Empty user ID' };
    }

    await updateDoc(doc(db, CHAT_COLLECTIONS.USERS, trimmedUserId), {
      lastActivity: serverTimestamp(),
    });
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating user activity:', error);
    return { error: error.message };
  }
};

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================

/**
 * 通知一覧取得
 */
export const getNotifications = async (
  userId: string,
  notificationLimit: number = 50
): Promise<{ data: ChatNotification[]; error: string | null }> => {
  try {
    const q = query(
      collection(db, CHAT_COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(notificationLimit)
    );
    
    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatNotification[];
    
    return { data: notifications, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting notifications:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 通知を既読にマーク
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, CHAT_COLLECTIONS.NOTIFICATIONS, notificationId), {
      isRead: true,
    });
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error marking notification as read:', error);
    return { error: error.message };
  }
};

/**
 * 通知をリアルタイムで監視
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: ChatNotification[]) => void
) => {
  const q = query(
    collection(db, CHAT_COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatNotification[];
    
    callback(notifications);
  }, (error) => {
    console.error('Error in notifications subscription:', error);
    callback([]);
  });
};

// =============================================================================
// SERVER OPERATIONS
// =============================================================================

export interface ServerInfo {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  isPrivate: boolean;
  ownerId: string;
  memberCount: number;
  createdAt: Timestamp;
  settings: {
    allowInvites: boolean;
    requireApproval: boolean;
    defaultRole: string;
    explicitContentFilter: string;
    verificationLevel: string;
  };
}

/**
 * サーバー情報を取得
 */
export const getServerInfo = async (
  serverId: string
): Promise<{ data: ServerInfo | null; error: string | null }> => {
  try {
    const docRef = doc(db, CHAT_COLLECTIONS.SERVERS, serverId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        data: { id: docSnap.id, ...docSnap.data() } as ServerInfo, 
        error: null 
      };
    } else {
      return { data: null, error: 'Server not found' };
    }
  } catch (error: Error | unknown) {
    console.error('Error getting server info:', error);
    return { data: null, error: error.message };
  }
};

/**
 * サーバー設定を更新
 */
export const updateServer = async (
  serverId: string,
  updates: Partial<ServerInfo>
): Promise<{ error: string | null }> => {
  try {
    const updateData = removeUndefinedFields(updates);
    await updateDoc(doc(db, CHAT_COLLECTIONS.SERVERS, serverId), {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error updating server:', error);
    return { error: error.message };
  }
};

/**
 * サーバーを削除
 */
export const deleteServer = async (
  serverId: string
): Promise<{ error: string | null }> => {
  try {
    // サーバーに関連するすべてのチャンネルを削除
    const channelsQuery = query(
      collection(db, CHAT_COLLECTIONS.CHANNELS),
      where('serverId', '==', serverId)
    );
    
    const channelDocs = await getDocs(channelsQuery);
    const batch = writeBatch(db);
    
    // チャンネルとその関連データを削除
    channelDocs.forEach((channelDoc) => {
      batch.delete(channelDoc.ref);
    });
    
    // サーバー自体を削除
    batch.delete(doc(db, CHAT_COLLECTIONS.SERVERS, serverId));
    
    await batch.commit();
    
    return { error: null };
  } catch (error: Error | unknown) {
    console.error('Error deleting server:', error);
    return { error: error.message };
  }
};

/**
 * サーバーメンバーを取得
 */
export const getServerMembers = async (
  serverId: string
): Promise<{ data: ChatUser[]; error: string | null }> => {
  try {
    const q = query(
      collection(db, CHAT_COLLECTIONS.USERS),
      where('serverId', '==', serverId)
    );
    
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatUser[];
    
    return { data: members, error: null };
  } catch (error: Error | unknown) {
    console.error('Error getting server members:', error);
    return { data: [], error: error.message };
  }
};