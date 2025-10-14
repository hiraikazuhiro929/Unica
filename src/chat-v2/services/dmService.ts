/**
 * dmService - Direct Message Firestore Operations
 * ダイレクトメッセージのFirestore操作
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  DirectMessageChannel,
  DirectMessageId,
  UserId,
  ChatMessage,
  ChatAttachment,
  MessageId,
} from '../types';
import { createDirectMessageId, createMessageId, createUserId } from '../types';

// =============================================================================
// COLLECTIONS
// =============================================================================

const COLLECTIONS = {
  DIRECT_MESSAGES: 'direct_messages',
  MESSAGES: 'messages',
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * undefinedフィールドを除去する
 */
const removeUndefinedFields = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Date型はそのまま返す（再帰処理しない）
  if (obj instanceof Date) {
    return obj as Partial<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item as Record<string, unknown>)) as unknown as Partial<T>;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      // Date型はそのまま保持
      if (value instanceof Date) {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = removeUndefinedFields(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
};

// =============================================================================
// DM OPERATIONS
// =============================================================================

/**
 * DM ID生成（participantsをソートして一意性を保証）
 */
export const generateDmId = (userId1: UserId, userId2: UserId): DirectMessageId => {
  const sorted = [userId1, userId2].sort();
  return createDirectMessageId(`dm_${sorted[0]}_${sorted[1]}`);
};

/**
 * DMチャンネル取得または作成
 */
export const getOrCreateDM = async (
  currentUserId: UserId,
  targetUserId: UserId
): Promise<{ data: DirectMessageChannel | null; error: string | null }> => {
  try {
    const dmId = generateDmId(currentUserId, targetUserId);
    const dmRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId);
    const dmSnap = await getDoc(dmRef);

    if (dmSnap.exists()) {
      const data = dmSnap.data();
      return {
        data: {
          id: createDirectMessageId(dmSnap.id),
          participants: data.participants as [UserId, UserId],
          createdAt: data.createdAt as Timestamp,
          updatedAt: data.updatedAt as Timestamp,
          lastMessage: data.lastMessage,
        },
        error: null,
      };
    }

    // 新規DM作成
    const newDM: Omit<DirectMessageChannel, 'lastMessage'> = {
      id: dmId,
      participants: [currentUserId, targetUserId].sort() as [UserId, UserId],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(dmRef, newDM);
    return { data: newDM, error: null };
  } catch (error) {
    console.error('Error getting or creating DM:', error);
    const errorMessage = error instanceof Error ? error.message : 'DMの取得に失敗しました';
    return { data: null, error: errorMessage };
  }
};

/**
 * ユーザーのDM一覧取得
 */
export const getUserDMs = async (
  userId: UserId
): Promise<{ data: DirectMessageChannel[]; error: string | null }> => {
  try {
    const dmsRef = collection(db, COLLECTIONS.DIRECT_MESSAGES);
    const q = query(
      dmsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const dms = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: createDirectMessageId(docSnap.id),
        participants: data.participants as [UserId, UserId],
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
        lastMessage: data.lastMessage,
      } as DirectMessageChannel;
    });

    return { data: dms, error: null };
  } catch (error) {
    console.error('Error getting user DMs:', error);
    const errorMessage = error instanceof Error ? error.message : 'DM一覧の取得に失敗しました';
    return { data: [], error: errorMessage };
  }
};

/**
 * DMメッセージ送信
 */
export const sendDMMessage = async (
  dmId: DirectMessageId,
  senderId: UserId,
  content: string,
  attachments?: readonly ChatAttachment[]
): Promise<{ data: ChatMessage | null; error: string | null }> => {
  try {
    const messagesRef = collection(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES);
    const messageRef = doc(messagesRef);

    const now = new Date();

    const message: Omit<ChatMessage, 'id'> = {
      channelId: dmId as unknown as import('../types').ChannelId,
      content,
      authorId: senderId,
      authorName: '', // Should be populated from user data
      authorRole: 'member',
      timestamp: Timestamp.fromDate(now),
      type: 'message',
      isDeleted: false,
      status: 'sent',
      attachments: attachments ? [...attachments] : [],
      reactions: [],
      mentions: [],
    };

    const cleanedMessage = removeUndefinedFields(message);
    await setDoc(messageRef, cleanedMessage);

    // DM最終メッセージ更新
    const dmRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId);
    await updateDoc(dmRef, {
      lastMessage: {
        content,
        senderId,
        timestamp: Timestamp.fromDate(now),
        isRead: false,
      },
      updatedAt: Timestamp.fromDate(now),
    });

    const savedMessage: ChatMessage = {
      ...message,
      id: createMessageId(messageRef.id),
      timestamp: Timestamp.fromDate(now),
    };

    return { data: savedMessage, error: null };
  } catch (error) {
    console.error('Error sending DM message:', error);
    const errorMessage = error instanceof Error ? error.message : 'メッセージの送信に失敗しました';
    return { data: null, error: errorMessage };
  }
};

/**
 * DMメッセージリアルタイム購読
 */
export const subscribeToDMMessages = (
  dmId: DirectMessageId,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const messagesRef = collection(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      try {
        const messages = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: createMessageId(docSnap.id),
            channelId: dmId as unknown as import('../types').ChannelId,
            content: data.content || '',
            authorId: createUserId(data.authorId),
            authorName: data.authorName || 'Unknown',
            authorAvatar: data.authorAvatar,
            authorRole: data.authorRole || 'member',
            timestamp: data.timestamp as Timestamp,
            editedAt: data.editedAt as Timestamp | undefined,
            type: data.type || 'message',
            priority: data.priority,
            attachments: data.attachments || [],
            reactions: data.reactions || [],
            mentions: data.mentions || [],
            replyTo: data.replyTo,
            isDeleted: data.isDeleted || false,
            status: data.status || 'sent',
          } as ChatMessage;
        });
        onMessages(messages);
      } catch (error) {
        console.error('Error processing DM messages:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    (error) => {
      console.error('Error subscribing to DM messages:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

/**
 * DM既読マーク
 */
export const markDMAsRead = async (
  dmId: DirectMessageId,
  userId: UserId
): Promise<{ error: string | null }> => {
  try {
    const dmRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId);
    const dmSnap = await getDoc(dmRef);

    if (!dmSnap.exists()) {
      return { error: 'DMが見つかりません' };
    }

    const data = dmSnap.data();
    if (data.lastMessage && data.lastMessage.senderId !== userId) {
      await updateDoc(dmRef, {
        'lastMessage.isRead': true,
      });
    }

    return { error: null };
  } catch (error) {
    console.error('Error marking DM as read:', error);
    const errorMessage = error instanceof Error ? error.message : '既読マークに失敗しました';
    return { error: errorMessage };
  }
};

/**
 * DMリアルタイム購読
 */
export const subscribeToDMs = (
  userId: UserId,
  onDMs: (dms: DirectMessageChannel[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const dmsRef = collection(db, COLLECTIONS.DIRECT_MESSAGES);
  const q = query(
    dmsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      try {
        const dms = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: createDirectMessageId(docSnap.id),
            participants: data.participants as [UserId, UserId],
            createdAt: data.createdAt as Timestamp,
            updatedAt: data.updatedAt as Timestamp,
            lastMessage: data.lastMessage,
          } as DirectMessageChannel;
        });
        onDMs(dms);
      } catch (error) {
        console.error('Error processing DMs:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    (error) => {
      console.error('Error subscribing to DMs:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

/**
 * DMメッセージ編集
 */
export const updateDMMessage = async (
  dmId: DirectMessageId,
  messageId: MessageId,
  content: string
): Promise<{ error: string | null }> => {
  try {
    const messageRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      content,
      editedAt: Timestamp.fromDate(new Date()),
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating DM message:', error);
    const errorMessage = error instanceof Error ? error.message : 'DMメッセージの編集に失敗しました';
    return { error: errorMessage };
  }
};

/**
 * DMメッセージ削除（論理削除）
 */
export const deleteDMMessage = async (
  dmId: DirectMessageId,
  messageId: MessageId
): Promise<{ error: string | null }> => {
  try {
    const messageRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      isDeleted: true,
      content: '[削除されたメッセージ]',
    });
    return { error: null };
  } catch (error) {
    console.error('Error deleting DM message:', error);
    const errorMessage = error instanceof Error ? error.message : 'DMメッセージの削除に失敗しました';
    return { error: errorMessage };
  }
};

/**
 * DMメッセージリアクション追加・削除
 */
export const toggleDMReaction = async (
  dmId: DirectMessageId,
  messageId: MessageId,
  emoji: string,
  userId: UserId
): Promise<{ error: string | null }> => {
  try {
    const messageRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES, messageId);
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
  } catch (error) {
    console.error('Error toggling DM reaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'リアクションの更新に失敗しました';
    return { error: errorMessage };
  }
};

/**
 * DMメッセージをピン留め
 */
export const pinDMMessage = async (
  dmId: DirectMessageId,
  messageId: MessageId,
  userId: UserId
): Promise<{ error: string | null }> => {
  try {
    const messageRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      isPinned: true,
      pinnedBy: userId,
      pinnedAt: Timestamp.fromDate(new Date()),
    });
    return { error: null };
  } catch (error) {
    console.error('Error pinning DM message:', error);
    const errorMessage = error instanceof Error ? error.message : 'DMメッセージのピン留めに失敗しました';
    return { error: errorMessage };
  }
};

/**
 * DMメッセージのピン留めを解除
 */
export const unpinDMMessage = async (
  dmId: DirectMessageId,
  messageId: MessageId
): Promise<{ error: string | null }> => {
  try {
    const messageRef = doc(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      isPinned: false,
      pinnedBy: null,
      pinnedAt: null,
    });
    return { error: null };
  } catch (error) {
    console.error('Error unpinning DM message:', error);
    const errorMessage = error instanceof Error ? error.message : 'ピン留め解除に失敗しました';
    return { error: errorMessage };
  }
};

/**
 * DMのピン留めメッセージ取得
 */
export const getPinnedDMMessages = async (
  dmId: DirectMessageId
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    const messagesRef = collection(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES);
    const q = query(
      messagesRef,
      where('isPinned', '==', true),
      orderBy('pinnedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: createMessageId(docSnap.id),
        channelId: dmId as unknown as import('../types').ChannelId,
        content: data.content || '',
        authorId: createUserId(data.authorId),
        authorName: data.authorName || 'Unknown',
        authorAvatar: data.authorAvatar,
        authorRole: data.authorRole || 'member',
        timestamp: data.timestamp as Timestamp,
        editedAt: data.editedAt as Timestamp | undefined,
        type: data.type || 'message',
        priority: data.priority,
        attachments: data.attachments || [],
        reactions: data.reactions || [],
        mentions: data.mentions || [],
        replyTo: data.replyTo,
        isDeleted: data.isDeleted || false,
        status: data.status || 'sent',
        isPinned: data.isPinned || false,
        pinnedBy: data.pinnedBy ? createUserId(data.pinnedBy) : undefined,
        pinnedAt: data.pinnedAt as Timestamp | undefined,
      } as ChatMessage;
    });
    return { data: messages, error: null };
  } catch (error) {
    console.error('Error getting pinned DM messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'ピン留めメッセージの取得に失敗しました';
    return { data: [], error: errorMessage };
  }
};

/**
 * DMメッセージ検索
 */
export const searchDMMessages = async (
  dmId: DirectMessageId,
  searchQuery: string
): Promise<{ data: ChatMessage[]; error: string | null }> => {
  try {
    // Firestoreの制限により、完全なテキスト検索は不可能
    // 全メッセージを取得してクライアント側でフィルタリング
    const messagesRef = collection(db, COLLECTIONS.DIRECT_MESSAGES, dmId, COLLECTIONS.MESSAGES);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const allMessages = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: createMessageId(docSnap.id),
        channelId: dmId as unknown as import('../types').ChannelId,
        content: data.content || '',
        authorId: createUserId(data.authorId),
        authorName: data.authorName || 'Unknown',
        authorAvatar: data.authorAvatar,
        authorRole: data.authorRole || 'member',
        timestamp: data.timestamp as Timestamp,
        editedAt: data.editedAt as Timestamp | undefined,
        type: data.type || 'message',
        priority: data.priority,
        attachments: data.attachments || [],
        reactions: data.reactions || [],
        mentions: data.mentions || [],
        replyTo: data.replyTo,
        isDeleted: data.isDeleted || false,
        status: data.status || 'sent',
      } as ChatMessage;
    });

    // クライアント側でフィルタリング
    const filteredMessages = allMessages.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.authorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return { data: filteredMessages, error: null };
  } catch (error) {
    console.error('Error searching DM messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'メッセージ検索に失敗しました';
    return { data: [], error: errorMessage };
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

const dmService = {
  generateDmId,
  getOrCreateDM,
  getUserDMs,
  sendDMMessage,
  subscribeToDMMessages,
  subscribeToDMs,
  markDMAsRead,
  updateDMMessage,
  deleteDMMessage,
  toggleDMReaction,
  pinDMMessage,
  unpinDMMessage,
  getPinnedDMMessages,
  searchDMMessages,
};

export default dmService;
