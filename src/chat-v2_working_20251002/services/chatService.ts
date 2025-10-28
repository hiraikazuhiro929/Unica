/**
 * Chat Service v2 - Firebase Integration
 * 既存のFirebase実装と統合されたチャットサービス
 */

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
  limitToLast,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp,
  startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CHAT_COLLECTIONS } from '@/lib/firebase/chat';
import {
  ChatMessage,
  ChatChannel,
  ChatUser,
  UnreadCount,
  ChatNotification,
  TypingStatus,
  ChannelId,
  MessageId,
  UserId,
  createChannelId,
  createMessageId,
  createUserId,
  MessageFormData,
  ApiResponse,
  MessageResponse,
} from '../types';
import UnifiedTimestamp from '../core/UnifiedTimestamp';

// =============================================================================
// COLLECTIONS - 既存のFirebase実装を使用
// =============================================================================

const COLLECTIONS = {
  CHANNELS: CHAT_COLLECTIONS.CHANNELS,
  MESSAGES: CHAT_COLLECTIONS.MESSAGES,
  USERS: CHAT_COLLECTIONS.USERS,
  UNREAD_COUNTS: CHAT_COLLECTIONS.UNREAD_COUNTS,
  NOTIFICATIONS: CHAT_COLLECTIONS.NOTIFICATIONS,
  TYPING_STATUS: CHAT_COLLECTIONS.TYPING_STATUS,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * タイムスタンプをDateに変換する（シンプル版）
 */
const convertTimestamp = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  console.log('🔄 [timestamp変換]:', {
    型: typeof timestamp,
    値: timestamp,
    hasToDate: timestamp.toDate && typeof timestamp.toDate === 'function',
    isDate: timestamp instanceof Date,
  });

  // Firestoreから取得したTimestamp型
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    const converted = timestamp.toDate();
    console.log('✅ [Timestamp→Date]:', converted);
    return converted;
  }

  // 既にDate型（送信時にnew Date()で保存したもの）
  if (timestamp instanceof Date) {
    console.log('✅ [既にDate型]:', timestamp);
    return timestamp;
  }

  // 壊れたデータ（空オブジェクト）の場合はnullを返す
  if (typeof timestamp === 'object' && Object.keys(timestamp).length === 0) {
    console.log('❌ [壊れたデータ]: 空オブジェクト → null');
    return null;
  }

  // その他は文字列やnumberとして扱う
  const converted = new Date(timestamp);
  if (isNaN(converted.getTime())) {
    console.log('❌ [変換失敗]: Invalid Date → null');
    return null;
  }
  console.log('⚠️ [その他→Date]:', converted);
  return converted;
};

/**
 * undefinedフィールドを除去する
 */
const removeUndefinedFields = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Date型はそのまま返す（再帰処理しない）
  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      // Date型はそのまま保持
      if (value instanceof Date) {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = removeUndefinedFields(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

/**
 * Firebase文書をChatMessageに変換
 */
const documentToChatMessage = (doc: any): ChatMessage => {
  const data = doc.data();


  const msg = {
    id: createMessageId(doc.id),
    channelId: createChannelId(data.channelId),
    content: data.content || '',
    authorId: createUserId(data.authorId),
    authorName: data.authorName || 'Unknown',
    authorAvatar: data.authorAvatar,
    authorRole: data.authorRole || 'User',
    timestamp: convertTimestamp(data.timestamp) || new Date(),
    editedAt: convertTimestamp(data.editedAt),
    type: data.type || 'message',
    priority: data.priority,
    attachments: data.attachments || [],
    reactions: data.reactions || [],
    mentions: data.mentions || [],
    replyTo: data.replyTo,
    threadId: data.threadId,
    isThread: data.isThread || false,
    threadCount: data.threadCount || 0,
    isDeleted: data.isDeleted || false,
    status: data.status || 'sent',
    localId: data.localId,
  };
  return msg;
};

/**
 * Firebase文書をChatChannelに変換
 */
const documentToChatChannel = (doc: any): ChatChannel => {
  const data = doc.data();

  // lastMessageのタイムスタンプも変換
  let lastMessage = data.lastMessage;
  if (lastMessage && lastMessage.timestamp) {
    lastMessage = {
      ...lastMessage,
      timestamp: convertTimestamp(lastMessage.timestamp),
    };
  }

  const convertedCreatedAt = convertTimestamp(data.createdAt) || new Date();
  const convertedUpdatedAt = convertTimestamp(data.updatedAt) || new Date();

  return {
    id: createChannelId(doc.id),
    name: data.name || 'Unknown Channel',
    description: data.description,
    topic: data.topic,
    type: data.type || 'text',
    categoryId: data.categoryId,
    position: data.position || 0,
    isPrivate: data.isPrivate || false,
    createdBy: createUserId(data.createdBy),
    createdAt: convertedCreatedAt,
    updatedAt: convertedUpdatedAt,
    memberCount: data.memberCount || 0,
    permissions: data.permissions,
    lastMessage: lastMessage,
  };
};

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

/**
 * メッセージ送信
 */
export const sendMessage = async (
  channelId: ChannelId,
  formData: MessageFormData,
  authorId: UserId,
  authorName: string,
  authorRole: string
): Promise<MessageResponse> => {
  try {
    console.log('📤', formData.content.substring(0, 15));

    // メンション解析
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionPattern.exec(formData.content)) !== null) {
      mentions.push(match[1]);
    }

    // 送信した瞬間の時刻をそのまま保存
    const now = new Date();

    const messageData = {
      channelId: channelId,
      content: formData.content,
      authorId: authorId,
      authorName: authorName,
      authorRole: authorRole,
      timestamp: now,
      type: 'message' as const,
      mentions: mentions.length > 0 ? mentions : undefined,
      replyTo: formData.replyTo,
      isDeleted: false,
      status: 'sent' as const,
    };

    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(messageData);
    console.log('📤 [送信直前] timestamp確認:', {
      型: typeof cleanedData.timestamp,
      値: cleanedData.timestamp,
      isDate: cleanedData.timestamp instanceof Date,
    });

    const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), cleanedData);
    console.log('✅ [保存完了] docId:', docRef.id);

    // チャンネルの最終メッセージを更新
    try {
      await updateDoc(doc(db, COLLECTIONS.CHANNELS, channelId), {
        lastMessage: {
          content: formData.content,
          authorName: authorName,
          timestamp: now,
        },
        updatedAt: now,
      });
    } catch (error) {
      console.warn('Failed to update channel last message:', error);
    }

    return { id: createMessageId(docRef.id), error: null };
  } catch (error: any) {
    console.error('❌ 送信エラー:', error);
    return { id: null, error: error.message || 'メッセージの送信に失敗しました' };
  }
};

/**
 * メッセージリアルタイム監視（最新N件）
 * Discord風に最新メッセージから順に取得
 */
export const subscribeToMessages = (
  channelId: ChannelId,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
) => {
  if (!channelId || typeof channelId !== 'string') {
    console.warn('Invalid channelId provided to subscribeToMessages:', channelId);
    callback([]);
    return () => {};
  }

  // 全メッセージを取得（昇順：古い→新しい）
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        const changes = querySnapshot.docChanges();
        if (changes.length > 0) {
          console.log('📥', changes.map(c => `${c.type}:${c.doc.data().content?.substring(0, 10)}`).join(', '));
        }

        const messages = querySnapshot.docs
          .map(doc => documentToChatMessage(doc))
          .filter(msg => !msg.isDeleted);

        // ID による重複除去
        const uniqueMessages = new Map<string, ChatMessage>();
        messages.forEach(msg => {
          uniqueMessages.set(msg.id, msg);
        });

        // 既に昇順で取得済みなので、そのまま配列化
        const deduplicatedMessages = Array.from(uniqueMessages.values());

        console.log('📊 全', deduplicatedMessages.length, '件');
        console.log('📍 全順序:', deduplicatedMessages.map((m, i) =>
          `[${i + 1}] ${m.content.substring(0, 8)} @${m.timestamp.toLocaleTimeString('ja-JP')}`
        ).join('\n'));

        callback(deduplicatedMessages);
      } catch (error) {
        console.error('Error processing messages:', error);
        callback([]);
      }
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
      callback([]);
    }
  );
};

/**
 * 過去のメッセージを追加読み込み（無限スクロール用）
 * 指定されたタイムスタンプより古いメッセージを取得
 */
export const loadMoreMessages = async (
  channelId: ChannelId,
  oldestTimestamp: Date,
  messageLimit: number = 50
): Promise<ApiResponse<ChatMessage[]>> => {
  try {
    if (!channelId || typeof channelId !== 'string') {
      return { data: [], error: 'Invalid channel ID' };
    }

    // oldestTimestampより古いメッセージを取得（降順でlimit）
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('channelId', '==', channelId),
      where('timestamp', '<', Timestamp.fromDate(oldestTimestamp)),
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    );

    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs
      .map(doc => documentToChatMessage(doc))
      .filter(msg => !msg.isDeleted);

    // 昇順に並び替え（古い→新しい）
    const sortedMessages = messages.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    return { data: sortedMessages, error: null };
  } catch (error: any) {
    console.error('Error loading more messages:', error);
    return { data: [], error: error.message || '過去のメッセージの取得に失敗しました' };
  }
};

/**
 * メッセージ編集
 */
export const updateMessage = async (
  messageId: MessageId,
  content: string
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), {
      content,
      editedAt: Timestamp.fromDate(new Date()),
    });
    return { error: null };
  } catch (error: any) {
    console.error('Error updating message:', error);
    return { error: error.message || 'メッセージの編集に失敗しました' };
  }
};

/**
 * メッセージ削除（論理削除）
 */
export const deleteMessage = async (
  messageId: MessageId
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), {
      isDeleted: true,
      content: '[削除されたメッセージ]',
    });
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return { error: error.message || 'メッセージの削除に失敗しました' };
  }
};

// =============================================================================
// CHANNEL OPERATIONS
// =============================================================================

/**
 * チャンネル一覧取得
 */
export const getChannels = async (
  userId?: UserId
): Promise<ApiResponse<ChatChannel[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CHANNELS),
      orderBy('position', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const channels = querySnapshot.docs.map(doc => documentToChatChannel(doc));

    return { data: channels, error: null };
  } catch (error: any) {
    console.error('Error getting channels:', error);
    return { data: [], error: error.message || 'チャンネルの取得に失敗しました' };
  }
};

/**
 * チャンネルリアルタイム監視
 */
export const subscribeToChannels = (
  callback: (channels: ChatChannel[]) => void,
  userId?: UserId
) => {
  const q = query(
    collection(db, COLLECTIONS.CHANNELS),
    orderBy('position', 'asc')
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        const channels = querySnapshot.docs.map(doc => documentToChatChannel(doc));
        callback(channels);
      } catch (error) {
        console.error('Error processing channels:', error);
        callback([]);
      }
    },
    (error) => {
      console.error('Error subscribing to channels:', error);
      callback([]);
    }
  );
};

/**
 * チャンネル作成
 */
export const createChannel = async (
  channelData: {
    name: string;
    description?: string;
    type: 'text' | 'voice' | 'announcement';
    isPrivate: boolean;
    categoryId?: string;
  },
  createdBy: UserId
): Promise<{ id: ChannelId | null; error: string | null }> => {
  try {
    const now = Timestamp.fromDate(new Date());
    const data = {
      ...channelData,
      position: Date.now(), // 簡易的な位置決め
      createdBy,
      createdAt: now,
      updatedAt: now,
      memberCount: 0,
    };

    const cleanedData = removeUndefinedFields(data);
    const docRef = await addDoc(collection(db, COLLECTIONS.CHANNELS), cleanedData);

    return { id: createChannelId(docRef.id), error: null };
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return { id: null, error: error.message || 'チャンネルの作成に失敗しました' };
  }
};

// =============================================================================
// USER OPERATIONS
// =============================================================================

/**
 * ユーザー作成・更新
 */
export const upsertUser = async (
  userData: {
    id: UserId;
    name: string;
    email: string;
    role: string;
    department: string;
    avatar?: string;
  }
): Promise<{ error: string | null }> => {
  try {
    const userDataToSave = {
      ...userData,
      isOnline: true,
      lastSeen: Timestamp.fromDate(new Date()),
      status: 'online' as const,
    };

    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(userDataToSave);

    await setDoc(
      doc(db, COLLECTIONS.USERS, userData.id),
      cleanedData,
      { merge: true }
    );

    return { error: null };
  } catch (error: any) {
    console.error('Error upserting user:', error);
    return { error: error.message || 'ユーザー情報の更新に失敗しました' };
  }
};

/**
 * ユーザー一覧監視
 */
export const subscribeToUsers = (
  callback: (users: ChatUser[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy('name', 'asc')
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        const users = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: createUserId(doc.id),
            name: data.name || 'Unknown',
            email: data.email || '',
            role: data.role || 'User',
            department: data.department || '',
            avatar: data.avatar,
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen || Timestamp.now(),
            status: data.status || 'offline',
            statusMessage: data.statusMessage,
            lastActivity: data.lastActivity,
            permissions: data.permissions,
          } as ChatUser;
        });

        callback(users);
      } catch (error) {
        console.error('Error processing users:', error);
        callback([]);
      }
    },
    (error) => {
      console.error('Error subscribing to users:', error);
      callback([]);
    }
  );
};

// =============================================================================
// REACTION OPERATIONS
// =============================================================================

/**
 * リアクション追加・削除
 */
export const toggleReaction = async (
  messageId: MessageId,
  emoji: string,
  userId: UserId
): Promise<{ error: string | null }> => {
  try {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { error: 'メッセージが見つかりません' };
    }

    const messageData = messageDoc.data();
    const reactions = messageData.reactions || [];

    // 既存のリアクションを探す
    const existingReactionIndex = reactions.findIndex((r: any) => r.emoji === emoji);

    if (existingReactionIndex >= 0) {
      // 既存のリアクションがある場合
      const reaction = reactions[existingReactionIndex];
      const userIndex = reaction.users.indexOf(userId);

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
        reaction.users.push(userId);
        reaction.count = reaction.users.length;
      }
    } else {
      // 新しいリアクション
      reactions.push({
        emoji,
        count: 1,
        users: [userId],
      });
    }

    await updateDoc(messageRef, { reactions });
    return { error: null };
  } catch (error: any) {
    console.error('Error toggling reaction:', error);
    return { error: error.message || 'リアクションの更新に失敗しました' };
  }
};

// =============================================================================
// TYPING STATUS OPERATIONS
// =============================================================================

/**
 * タイピング状態更新
 */
export const updateTypingStatus = async (
  userId: UserId,
  userName: string,
  channelId: ChannelId,
  isTyping: boolean
): Promise<{ error: string | null }> => {
  try {
    const typingId = `${userId}_${channelId}`;

    if (isTyping) {
      await setDoc(doc(db, COLLECTIONS.TYPING_STATUS, typingId), {
        userId,
        userName,
        channelId,
        timestamp: Timestamp.fromDate(new Date()),
      });
    } else {
      await deleteDoc(doc(db, COLLECTIONS.TYPING_STATUS, typingId));
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error updating typing status:', error);
    return { error: error.message || 'タイピング状態の更新に失敗しました' };
  }
};

/**
 * タイピング状態監視
 */
export const subscribeToTypingStatus = (
  channelId: ChannelId,
  callback: (typingUsers: TypingStatus[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.TYPING_STATUS),
    where('channelId', '==', channelId)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        const typingUsers = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            userId: createUserId(data.userId),
            channelId: createChannelId(data.channelId),
            userName: data.userName,
            timestamp: data.timestamp,
          } as TypingStatus;
        });

        // 5秒以上前のタイピング状態を除外
        const now = new Date();
        const filteredTypingUsers = typingUsers.filter(typing => {
          const typingTime = typing.timestamp?.toDate?.() || new Date(typing.timestamp);
          return (now.getTime() - typingTime.getTime()) < 5000;
        });

        callback(filteredTypingUsers);
      } catch (error) {
        console.error('Error processing typing status:', error);
        callback([]);
      }
    },
    (error) => {
      console.error('Error subscribing to typing status:', error);
      callback([]);
    }
  );
};

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { COLLECTIONS };
export default {
  // Messages
  sendMessage,
  subscribeToMessages,
  loadMoreMessages,
  updateMessage,
  deleteMessage,

  // Channels
  getChannels,
  subscribeToChannels,
  createChannel,

  // Users
  upsertUser,
  subscribeToUsers,

  // Reactions
  toggleReaction,

  // Typing
  updateTypingStatus,
  subscribeToTypingStatus,
};