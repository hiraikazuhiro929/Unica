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
  CHANNELS: 'chatChannels',
  MESSAGES: 'chatMessages',
  USERS: 'chatUsers',
  USER_STATUSES: 'userStatuses',
  CHANNEL_MEMBERS: 'channelMembers',
  UNREAD_COUNTS: 'unreadCounts',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'announcement';
  category?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  memberCount: number;
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
  editedAt?: any;
  type: 'message' | 'system' | 'announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  replyTo?: {
    messageId: string;
    content: string;
    authorName: string;
  };
  isDeleted: boolean;
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
    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.CHANNELS), {
      ...channelData,
      memberCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return { id: null, error: error.message };
  }
};

/**
 * チャンネル一覧取得
 */
export const getChannels = async (
  userId?: string
): Promise<{ data: ChatChannel[]; error: string | null }> => {
  try {
    let q = query(
      collection(db, CHAT_COLLECTIONS.CHANNELS),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const channels = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatChannel[];

    return { data: channels, error: null };
  } catch (error: any) {
    console.error('Error getting channels:', error);
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
  let q = query(
    collection(db, CHAT_COLLECTIONS.CHANNELS),
    orderBy('name', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const channels = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatChannel[];
    
    callback(channels);
  }, (error) => {
    console.error('Error in channels subscription:', error);
    callback([]);
  });
};

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

/**
 * メッセージ送信
 */
export const sendMessage = async (
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isDeleted'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.MESSAGES), {
      ...messageData,
      timestamp: serverTimestamp(),
      isDeleted: false,
    });

    // チャンネルの最終メッセージ更新
    await updateDoc(doc(db, CHAT_COLLECTIONS.CHANNELS, messageData.channelId), {
      lastMessage: {
        content: messageData.content,
        authorName: messageData.authorName,
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error sending message:', error);
    return { id: null, error: error.message };
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
  const q = query(
    collection(db, CHAT_COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
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
    console.error('Error in messages subscription:', error);
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
    await updateDoc(doc(db, CHAT_COLLECTIONS.MESSAGES, messageId), {
      content,
      editedAt: serverTimestamp(),
    });

    return { error: null };
  } catch (error: any) {
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
  } catch (error: any) {
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
    // ファイルサイズ制限（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { url: null, attachment: null, error: 'ファイルサイズが10MBを超えています' };
    }

    // ファイルタイプ判定
    let fileType: ChatAttachment['type'] = 'document';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type.startsWith('audio/')) fileType = 'audio';

    // Storage参照作成
    const fileName = `${Date.now()}_${file.name}`;
    const fileRef = ref(storage, `chat/${channelId}/${fileName}`);

    // アップロード
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const attachment: ChatAttachment = {
      id: Date.now().toString(),
      name: file.name,
      url: downloadURL,
      type: fileType,
      size: file.size,
      mimeType: file.type,
    };

    return { url: downloadURL, attachment, error: null };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return { url: null, attachment: null, error: error.message };
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
        where('isDeleted', '==', false),
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
  } catch (error: any) {
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
    const unreadId = `${userId}_${channelId}`;
    await setDoc(doc(db, CHAT_COLLECTIONS.UNREAD_COUNTS, unreadId), {
      userId,
      channelId,
      count: 0,
      lastReadMessageId: lastReadMessageId || '',
      lastReadAt: serverTimestamp(),
    });

    return { error: null };
  } catch (error: any) {
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