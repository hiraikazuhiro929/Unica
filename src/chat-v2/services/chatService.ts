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
  CATEGORIES: CHAT_COLLECTIONS.CATEGORIES,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * タイムスタンプをDateに変換する（シンプル版）
 */
const convertTimestamp = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  // Firestoreから取得したTimestamp型
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // 既にDate型（送信時にnew Date()で保存したもの）
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // 壊れたデータ（空オブジェクト）の場合はnullを返す
  if (typeof timestamp === 'object' && Object.keys(timestamp).length === 0) {
    return null;
  }

  // その他は文字列やnumberとして扱う
  const converted = new Date(timestamp);
  if (isNaN(converted.getTime())) {
    return null;
  }
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
const documentToChatChannel = (doc: any): ChatChannel | null => {
  try {
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

    const channel = {
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

    return channel;
  } catch (error) {
    return null;
  }
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
      attachments: formData.attachments || [],
      parentMessageId: formData.parentMessageId, // スレッド返信の場合
      isDeleted: false,
      status: 'sent' as const,
    };

    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(messageData);

    const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), cleanedData);

    // スレッド返信の場合、親メッセージのthreadCountを更新
    if (formData.parentMessageId) {
      try {
        const parentRef = doc(db, COLLECTIONS.MESSAGES, formData.parentMessageId);
        const parentDoc = await getDoc(parentRef);
        if (parentDoc.exists()) {
          const currentThreadCount = parentDoc.data().threadCount || 0;
          await updateDoc(parentRef, {
            isThread: true,
            threadCount: currentThreadCount + 1,
          });
        }
      } catch (error) {
        console.warn('Failed to update parent message thread count:', error);
      }
    }

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
// NOTIFICATION OPERATIONS
// =============================================================================

/**
 * ブラウザ通知の権限をリクエスト
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

/**
 * ブラウザ通知を表示
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions
): Notification | null => {
  if (!('Notification' in window)) {
    return null;
  }

  if (Notification.permission === 'granted') {
    return new Notification(title, options);
  }

  return null;
};

/**
 * メンション通知を作成
 */
export const createMentionNotification = async (
  messageId: MessageId,
  mentionedUserId: UserId,
  channelId: ChannelId,
  authorName: string,
  content: string
): Promise<{ error: string | null }> => {
  try {
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      type: 'mention',
      messageId,
      userId: mentionedUserId,
      channelId,
      authorName,
      content: content.substring(0, 100), // 最初の100文字のみ
      isRead: false,
      createdAt: Timestamp.fromDate(new Date()),
    });
    return { error: null };
  } catch (error: any) {
    console.error('Error creating mention notification:', error);
    return { error: error.message || '通知の作成に失敗しました' };
  }
};

/**
 * 通知を既読にする
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
      isRead: true,
      readAt: Timestamp.fromDate(new Date()),
    });
    return { error: null };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { error: error.message || '通知の既読処理に失敗しました' };
  }
};

/**
 * ユーザーの未読通知を取得
 */
export const getUnreadNotifications = async (
  userId: UserId
): Promise<ApiResponse<ChatNotification[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatNotification[];
    return { data: notifications, error: null };
  } catch (error: any) {
    console.error('Error getting unread notifications:', error);
    return { data: null, error: error.message || '通知の取得に失敗しました' };
  }
};

/**
 * 通知のリアルタイム監視
 */
export const subscribeToNotifications = (
  userId: UserId,
  callback: (notifications: ChatNotification[]) => void
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatNotification[];
    callback(notifications);
  });
};

// =============================================================================
// PIN OPERATIONS
// =============================================================================

/**
 * メッセージをピン留め
 */
export const pinMessage = async (
  messageId: MessageId,
  userId: UserId
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), {
      isPinned: true,
      pinnedBy: userId,
      pinnedAt: Timestamp.fromDate(new Date()),
    });
    return { error: null };
  } catch (error: any) {
    console.error('Error pinning message:', error);
    return { error: error.message || 'メッセージのピン留めに失敗しました' };
  }
};

/**
 * メッセージのピン留めを解除
 */
export const unpinMessage = async (
  messageId: MessageId
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), {
      isPinned: false,
      pinnedBy: null,
      pinnedAt: null,
    });
    return { error: null };
  } catch (error: any) {
    console.error('Error unpinning message:', error);
    return { error: error.message || 'ピン留め解除に失敗しました' };
  }
};

/**
 * チャンネルのピン留めメッセージ取得
 */
export const getPinnedMessages = async (
  channelId: ChannelId
): Promise<ApiResponse<ChatMessage[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('channelId', '==', channelId),
      where('isPinned', '==', true),
      orderBy('pinnedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: createMessageId(doc.id),
        channelId: createChannelId(data.channelId),
        authorId: createUserId(data.authorId),
        timestamp: data.timestamp || Timestamp.now(),
      } as ChatMessage;
    });
    return { data: messages, error: null };
  } catch (error: any) {
    console.error('Error getting pinned messages:', error);
    return { data: null, error: error.message || 'ピン留めメッセージの取得に失敗しました' };
  }
};

// =============================================================================
// THREAD OPERATIONS
// =============================================================================

/**
 * スレッドメッセージ取得
 */
export const getThreadMessages = async (
  parentMessageId: MessageId
): Promise<ApiResponse<ChatMessage[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('parentMessageId', '==', parentMessageId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: createMessageId(doc.id),
        channelId: createChannelId(data.channelId),
        authorId: createUserId(data.authorId),
        timestamp: data.timestamp || Timestamp.now(),
      } as ChatMessage;
    });
    return { data: messages, error: null };
  } catch (error: any) {
    console.error('Error getting thread messages:', error);
    return { data: null, error: error.message || 'スレッドメッセージの取得に失敗しました' };
  }
};

/**
 * スレッドメッセージリスナー
 */
export const subscribeToThread = (
  parentMessageId: MessageId,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('parentMessageId', '==', parentMessageId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: createMessageId(doc.id),
        channelId: createChannelId(data.channelId),
        authorId: createUserId(data.authorId),
        timestamp: data.timestamp || Timestamp.now(),
      } as ChatMessage;
    });
    callback(messages);
  });
};

// =============================================================================
// CHANNEL OPERATIONS
// =============================================================================

/**
 * チャンネル一覧取得（カテゴリ順にソート）
 */
export const getChannels = async (
  userId?: UserId
): Promise<ApiResponse<ChatChannel[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CHANNELS)
    );

    const querySnapshot = await getDocs(q);

    // 変換エラーが発生してもスキップして他のチャンネルは表示
    const channels = querySnapshot.docs
      .map(doc => documentToChatChannel(doc))
      .filter((channel): channel is ChatChannel => channel !== null)
      .sort((a, b) => {
        // カテゴリIDでグループ化、その後position順
        if (a.categoryId !== b.categoryId) {
          return (a.categoryId || '').localeCompare(b.categoryId || '');
        }
        return a.position - b.position;
      });

    return { data: channels, error: null };
  } catch (error: any) {
    console.error('❌ [getChannels] エラー:', error);
    return { data: [], error: error.message || 'チャンネルの取得に失敗しました' };
  }
};

/**
 * チャンネルリアルタイム監視
 */
export const subscribeToChannels = (
  callback: (channels: ChatChannel[]) => void,
  userId?: UserId
)  => {
  const q = query(
    collection(db, COLLECTIONS.CHANNELS)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        // 変換エラーが発生してもスキップして他のチャンネルは表示
        const channels = querySnapshot.docs
          .map(doc => documentToChatChannel(doc))
          .filter((channel): channel is ChatChannel => channel !== null);

        callback(channels);
      } catch (error) {
        console.error('❌ [subscribeToChannels] 処理エラー:', error);
        callback([]);
      }
    },
    (error) => {
      console.error('❌ [subscribeToChannels] 監視エラー:', error);
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
    // categoryIdバリデーション: 必須チェック
    if (!channelData.categoryId) {
      return { id: null, error: 'カテゴリが選択されていません。チャンネルはカテゴリ内に作成する必要があります。' };
    }

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

/**
 * チャンネル更新
 */
export const updateChannel = async (
  channelId: ChannelId,
  updates: Partial<ChatChannel>
): Promise<{ error: string | null }> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(updateData);

    await updateDoc(doc(db, COLLECTIONS.CHANNELS, channelId), cleanedData);

    return { error: null };
  } catch (error: any) {
    console.error('Error updating channel:', error);
    return { error: error.message || 'チャンネルの更新に失敗しました' };
  }
};

/**
 * チャンネル削除
 * - 権限チェック（admin/managerのみ）
 * - チャンネル内の全メッセージ削除
 * - 未読カウント削除
 * - トランザクション処理で安全に削除
 */
export const deleteChannel = async (
  channelId: ChannelId,
  userId: UserId
): Promise<ApiResponse<void>> => {
  try {
    // 権限チェック（ユーザー情報取得して権限確認）
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return { data: null, error: '権限がありません' };
    }
    const userRole = userDoc.data().role;
    if (!canDeleteChannel(userRole)) {
      return { data: null, error: 'チャンネル削除権限がありません（管理者またはマネージャーのみ）' };
    }

    const batch = writeBatch(db);

    // チャンネル内の全メッセージを削除
    const messagesQuery = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('channelId', '==', channelId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    messagesSnapshot.docs.forEach(messageDoc => {
      batch.delete(messageDoc.ref);
    });

    // 未読カウントを削除
    const unreadQuery = query(
      collection(db, COLLECTIONS.UNREAD_COUNTS),
      where('channelId', '==', channelId)
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    unreadSnapshot.docs.forEach(unreadDoc => {
      batch.delete(unreadDoc.ref);
    });

    // 通知を削除
    const notificationsQuery = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('channelId', '==', channelId)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    notificationsSnapshot.docs.forEach(notifDoc => {
      batch.delete(notifDoc.ref);
    });

    // チャンネル自体を削除
    batch.delete(doc(db, COLLECTIONS.CHANNELS, channelId));

    await batch.commit();

    return { data: undefined, error: null };
  } catch (error: any) {
    console.error('Error deleting channel:', error);
    return { data: null, error: error.message || 'チャンネルの削除に失敗しました' };
  }
};

/**
 * チャンネルのメンバー取得
 * 注: 現在の実装では全ユーザーを返す（簡易版）
 * 本格実装では channel_members コレクションを作成して管理
 */
export const getChannelMembers = async (
  channelId: ChannelId
): Promise<ApiResponse<ChatUser[]>> => {
  try {
    // 簡易実装: 全ユーザーを取得
    // TODO: 実際にはchannel_membersコレクションから取得
    const q = query(
      collection(db, COLLECTIONS.USERS),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
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

    return { data: users, error: null };
  } catch (error: any) {
    console.error('Error getting channel members:', error);
    return { data: [], error: error.message || 'メンバーの取得に失敗しました' };
  }
};

/**
 * チャンネルから退出
 * 注: 現在の実装では論理的な退出のみ（簡易版）
 * 本格実装では channel_members コレクションから削除
 */
export const leaveChannel = async (
  channelId: ChannelId,
  userId: UserId
): Promise<{ error: string | null }> => {
  try {
    // TODO: channel_membersコレクションから該当ユーザーを削除
    // 現在は簡易実装のため、何もしない

    // メンバー数を減らす
    const channelRef = doc(db, COLLECTIONS.CHANNELS, channelId);
    const channelDoc = await getDoc(channelRef);

    if (channelDoc.exists()) {
      const currentCount = channelDoc.data().memberCount || 0;
      await updateDoc(channelRef, {
        memberCount: Math.max(0, currentCount - 1),
        updatedAt: Timestamp.fromDate(new Date()),
      });
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error leaving channel:', error);
    return { error: error.message || 'チャンネルの退出に失敗しました' };
  }
};

// =============================================================================
// CATEGORY OPERATIONS
// =============================================================================

/**
 * カテゴリ一覧取得
 */
export const getCategories = async (): Promise<ApiResponse<import('../types').ChannelCategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CATEGORIES),
      orderBy('position', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id as import('../types').CategoryId, // ドキュメントIDを使用
        createdBy: createUserId(data.createdBy),
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now(),
      } as import('../types').ChannelCategory;
    });

    return { data: categories, error: null };
  } catch (error: any) {
    console.error('Error getting categories:', error);
    return { data: [], error: error.message || 'カテゴリの取得に失敗しました' };
  }
};

/**
 * カテゴリリアルタイム監視
 */
export const subscribeToCategories = (
  callback: (categories: import('../types').ChannelCategory[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.CATEGORIES),
    orderBy('position', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id as import('../types').CategoryId, // ドキュメントIDを使用
        createdBy: createUserId(data.createdBy),
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now(),
      } as import('../types').ChannelCategory;
    });
    callback(categories);
  });
};

/**
 * カテゴリ作成
 */
export const createCategory = async (
  name: string,
  position: number,
  userId: UserId,
  permissions?: {
    viewRole?: string[];
    manageRole?: string[];
  }
): Promise<ApiResponse<import('../types').CategoryId>> => {
  try {
    const categoryRef = doc(collection(db, COLLECTIONS.CATEGORIES));
    const categoryId = categoryRef.id;

    await setDoc(categoryRef, {
      id: categoryId,
      name,
      position,
      isCollapsed: false,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...(permissions && { permissions }),
    });

    return { data: categoryId as import('../types').CategoryId, error: null };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { data: null, error: error.message || 'カテゴリの作成に失敗しました' };
  }
};

/**
 * カテゴリ名更新
 */
export const updateCategoryName = async (
  categoryId: import('../types').CategoryId,
  name: string
): Promise<{ error: string | null }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId), {
      name,
      updatedAt: Timestamp.now(),
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error updating category name:', error);
    return { error: error.message || 'カテゴリ名の更新に失敗しました' };
  }
};

/**
 * カテゴリ更新（名前と権限）
 */
export const updateCategory = async (
  categoryId: import('../types').CategoryId,
  updates: {
    name?: string;
    permissions?: {
      viewRole?: string[];
      manageRole?: string[];
    };
  }
): Promise<{ error: string | null }> => {
  try {
    const updateData: {
      name?: string;
      permissions?: {
        viewRole?: string[];
        manageRole?: string[];
      };
      updatedAt: Timestamp;
    } = {
      updatedAt: Timestamp.now(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.permissions !== undefined) {
      updateData.permissions = updates.permissions;
    }

    await updateDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId), updateData);

    return { error: null };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { error: error.message || 'カテゴリの更新に失敗しました' };
  }
};

/**
 * カテゴリ並び替え
 */
export const reorderCategories = async (
  categoryIds: import('../types').CategoryId[]
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);

    categoryIds.forEach((categoryId, index) => {
      const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
      batch.update(categoryRef, {
        position: index,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Error reordering categories:', error);
    return { error: error.message || 'カテゴリの並び替えに失敗しました' };
  }
};

/**
 * カテゴリ削除（カスケード削除）
 */
export const deleteCategory = async (
  categoryId: import('../types').CategoryId
): Promise<{ error: string | null }> => {
  try {
    const batch = writeBatch(db);

    // 1. カテゴリに属するチャンネルを全て取得
    const channelsQuery = query(
      collection(db, COLLECTIONS.CHANNELS),
      where('categoryId', '==', categoryId)
    );
    const channelsSnapshot = await getDocs(channelsQuery);

    // 2. 各チャンネルのメッセージも削除
    for (const channelDoc of channelsSnapshot.docs) {
      const channelId = channelDoc.id;

      // チャンネル内のメッセージを削除
      const messagesQuery = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      messagesSnapshot.docs.forEach(messageDoc => {
        batch.delete(messageDoc.ref);
      });

      // 未読カウントを削除
      const unreadQuery = query(
        collection(db, COLLECTIONS.UNREAD_COUNTS),
        where('channelId', '==', channelId)
      );
      const unreadSnapshot = await getDocs(unreadQuery);
      unreadSnapshot.docs.forEach(unreadDoc => {
        batch.delete(unreadDoc.ref);
      });

      // 通知を削除
      const notificationsQuery = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('channelId', '==', channelId)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.docs.forEach(notifDoc => {
        batch.delete(notifDoc.ref);
      });

      // チャンネル自体を削除
      batch.delete(channelDoc.ref);
    }

    // 3. カテゴリを削除
    batch.delete(doc(db, COLLECTIONS.CATEGORIES, categoryId));

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('カテゴリ削除エラー:', error);
    return { error: error.message || 'カテゴリの削除に失敗しました' };
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
// SEARCH OPERATIONS
// =============================================================================

/**
 * メッセージ検索（複数チャンネル対応）
 */
export const searchMessages = async (
  channelIds: ChannelId[],
  searchQuery: string,
  maxResults: number = 100
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    if (!searchQuery.trim()) {
      return { data: [], error: null };
    }

    const allMessages: ChatMessage[] = [];

    // 各チャンネルを検索
    for (const channelId of channelIds) {
      const q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id as MessageId,
            channelId: data.channelId,
            content: data.content,
            authorId: data.authorId,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar,
            authorRole: data.authorRole,
            timestamp: convertTimestamp(data.timestamp),
            mentions: data.mentions || [],
            attachments: data.attachments || [],
            reactions: data.reactions || [],
            editedAt: convertTimestamp(data.editedAt),
            isDeleted: data.isDeleted || false,
            type: data.type || 'user',
          } as ChatMessage;
        })
        .filter(msg =>
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

      allMessages.push(...messages);
    }

    // 時間順にソートして制限
    const sortedMessages = allMessages
      .sort((a, b) => {
        const timeA = a.timestamp?.getTime() || 0;
        const timeB = b.timestamp?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, maxResults);

    return { data: sortedMessages, error: null };
  } catch (error: any) {
    console.error('Error searching messages:', error);
    return { data: [], error: error.message };
  }
};

/**
 * チャンネル内メッセージ検索
 */
export const searchChannelMessages = async (
  channelId: ChannelId,
  searchQuery: string,
  maxResults: number = 100
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  return searchMessages([channelId], searchQuery, maxResults);
};

/**
 * 日付範囲でメッセージ検索
 */
export const searchMessagesByDate = async (
  channelIds: ChannelId[],
  startDate: Date,
  endDate: Date,
  maxResults: number = 100
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    const allMessages: ChatMessage[] = [];

    for (const channelId of channelIds) {
      const q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id as MessageId,
          channelId: data.channelId,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          authorAvatar: data.authorAvatar,
          authorRole: data.authorRole,
          timestamp: convertTimestamp(data.timestamp),
          mentions: data.mentions || [],
          attachments: data.attachments || [],
          reactions: data.reactions || [],
          editedAt: convertTimestamp(data.editedAt),
          isDeleted: data.isDeleted || false,
          type: data.type || 'user',
        } as ChatMessage;
      });

      allMessages.push(...messages);
    }

    const sortedMessages = allMessages
      .sort((a, b) => {
        const timeA = a.timestamp?.getTime() || 0;
        const timeB = b.timestamp?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, maxResults);

    return { data: sortedMessages, error: null };
  } catch (error: any) {
    console.error('Error searching messages by date:', error);
    return { data: [], error: error.message };
  }
};

/**
 * ユーザー別メッセージ検索
 */
export const searchMessagesByUser = async (
  channelIds: ChannelId[],
  authorId: UserId,
  maxResults: number = 100
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    const allMessages: ChatMessage[] = [];

    for (const channelId of channelIds) {
      const q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('channelId', '==', channelId),
        where('authorId', '==', authorId),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id as MessageId,
          channelId: data.channelId,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          authorAvatar: data.authorAvatar,
          authorRole: data.authorRole,
          timestamp: convertTimestamp(data.timestamp),
          mentions: data.mentions || [],
          attachments: data.attachments || [],
          reactions: data.reactions || [],
          editedAt: convertTimestamp(data.editedAt),
          isDeleted: data.isDeleted || false,
          type: data.type || 'user',
        } as ChatMessage;
      });

      allMessages.push(...messages);
    }

    const sortedMessages = allMessages
      .sort((a, b) => {
        const timeA = a.timestamp?.getTime() || 0;
        const timeB = b.timestamp?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, maxResults);

    return { data: sortedMessages, error: null };
  } catch (error: any) {
    console.error('Error searching messages by user:', error);
    return { data: [], error: error.message };
  }
};

// =============================================================================
// UTILITY OPERATIONS
// =============================================================================

/**
 * 重複チャンネルのクリーンアップ（デバッグ用）
 */
export const cleanupDuplicateChannels = async (): Promise<void> => {
  try {
    const channelsSnapshot = await getDocs(collection(db, COLLECTIONS.CHANNELS));
    const channelsByName = new Map<string, any[]>();

    // 名前でグループ化
    channelsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = data.name;
      if (!channelsByName.has(name)) {
        channelsByName.set(name, []);
      }
      channelsByName.get(name)!.push({ id: doc.id, data, createdAt: data.createdAt });
    });

    // 重複を削除（最古のものを残す）
    const batch = writeBatch(db);
    let deleteCount = 0;

    channelsByName.forEach((channels, name) => {
      if (channels.length > 1) {
        // 作成日時でソート（最古を残す）
        channels.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });

        // 最古以外を削除
        for (let i = 1; i < channels.length; i++) {
          batch.delete(doc(db, COLLECTIONS.CHANNELS, channels[i].id));
          deleteCount++;
        }
      }
    });

    if (deleteCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
  }
};

// グローバル公開（ブラウザコンソールで実行可能）
if (typeof window !== 'undefined') {
  (window as any).cleanupDuplicateChannels = cleanupDuplicateChannels;
}

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

  // Notifications
  requestNotificationPermission,
  showBrowserNotification,
  createMentionNotification,
  markNotificationAsRead,
  getUnreadNotifications,
  subscribeToNotifications,

  // Pins
  pinMessage,
  unpinMessage,
  getPinnedMessages,

  // Threads
  getThreadMessages,
  subscribeToThread,

  // Channels
  getChannels,
  subscribeToChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelMembers,
  leaveChannel,

  // Categories
  getCategories,
  subscribeToCategories,
  createCategory,
  updateCategoryName,
  updateCategory,
  reorderCategories,
  deleteCategory,

  // Users
  upsertUser,
  subscribeToUsers,

  // Reactions
  toggleReaction,

  // Typing
  updateTypingStatus,
  subscribeToTypingStatus,

  // Search
  searchMessages,
  searchChannelMessages,
  searchMessagesByDate,
  searchMessagesByUser,

  // Permissions
  canCreateChannel,
  canDeleteChannel,
  canDeleteMessage,
  canManageChannel,
};

// =============================================================================
// PERMISSION HELPERS
// =============================================================================

/**
 * チャンネル作成権限チェック
 */
export function canCreateChannel(userRole: 'admin' | 'manager' | 'leader' | 'worker'): boolean {
  return userRole === 'admin' || userRole === 'manager';
}

/**
 * チャンネル削除権限チェック
 */
export function canDeleteChannel(userRole: 'admin' | 'manager' | 'leader' | 'worker'): boolean {
  return userRole === 'admin';
}

/**
 * メッセージ削除権限チェック
 */
export function canDeleteMessage(
  userRole: 'admin' | 'manager' | 'leader' | 'worker',
  messageAuthorId: string,
  currentUserId: string
): boolean {
  // 管理者またはマネージャーは全て削除可能
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }
  // 自分のメッセージのみ削除可能
  return messageAuthorId === currentUserId;
}

/**
 * チャンネル管理権限チェック（設定変更など）
 */
export function canManageChannel(userRole: 'admin' | 'manager' | 'leader' | 'worker'): boolean {
  return userRole === 'admin' || userRole === 'manager';
}