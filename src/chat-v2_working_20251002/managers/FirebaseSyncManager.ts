import { store } from '../store';
import { OptimisticUIManager } from './OptimisticUIManager';
import {
  setChannels,
  updateSyncStatus,
  setChannelSyncStatus,
} from '../store/slices/channelsSlice';
import {
  setMessages,
  replaceOptimisticMessage,
} from '../store/slices/messagesSlice';
import {
  setUsers,
  upsertUser,
  updateTypingStatus,
  updateConnectionStatus,
} from '../store/slices/usersSlice';
import {
  subscribeToChannels,
  subscribeToMessages,
  subscribeToUsers,
  subscribeToTypingStatus,
  type ChatChannel,
  type ChatMessage,
  type ChatUser,
  type TypingStatus,
} from '@/lib/firebase/chat';
import type { ChannelState, MessageState, UserState, SyncState } from '../store/types';

// =============================================================================
// Firebase同期管理システム
// 競合状態排除と確実なsubscribe/unsubscribe処理
// =============================================================================

interface SubscriptionInfo {
  unsubscribe: () => void;
  subscribedAt: Date;
  lastActivity: Date;
  status: 'active' | 'error' | 'reconnecting';
  errorCount: number;
}

export class FirebaseSyncManager {
  private static instance: FirebaseSyncManager;

  // サブスクリプション管理
  private subscriptions = new Map<string, SubscriptionInfo>();
  private channelSubscriptions = new Map<string, SubscriptionInfo>();

  // 同期状態管理
  private syncState: SyncState = {
    channels: {},
    connectionStatus: 'disconnected',
    retryAttempts: 0,
    pendingUpdates: {
      messages: [],
      channels: [],
      users: [],
    },
  };

  private optimisticUI: OptimisticUIManager;

  // 設定
  private config = {
    maxRetries: 5,
    retryDelay: 1000,
    heartbeatInterval: 30000, // 30秒
    subscriptionTimeout: 60000, // 1分
    batchUpdateDelay: 100, // 100ms
  };

  // タイマー管理
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchUpdateTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.optimisticUI = OptimisticUIManager.getInstance();

    // 接続状態監視
    this.setupConnectionMonitoring();

    // バッチ更新開始
    this.startBatchUpdates();

    // ハートビート開始
    this.startHeartbeat();
  }

  public static getInstance(): FirebaseSyncManager {
    if (!FirebaseSyncManager.instance) {
      FirebaseSyncManager.instance = new FirebaseSyncManager();
    }
    return FirebaseSyncManager.instance;
  }

  // =============================================================================
  // 基本同期制御
  // =============================================================================

  /**
   * 全体同期開始
   * @param userId ユーザーID
   */
  public async startSync(userId: string): Promise<void> {
    try {
      this.syncState.connectionStatus = 'connecting';

      // 1. チャンネル同期
      await this.subscribeToChannels();

      // 2. ユーザー同期
      await this.subscribeToUsers();

      // 3. 現在のユーザー設定
      store.dispatch(updateConnectionStatus({
        userId,
        connectionStatus: 'connected',
      }));

      this.syncState.connectionStatus = 'connected';
      this.syncState.retryAttempts = 0;

      console.log('[FirebaseSync] Sync started successfully');

    } catch (error) {
      console.error('[FirebaseSync] Failed to start sync:', error);
      this.handleSyncError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * 全体同期停止
   */
  public stopSync(): void {
    // 全サブスクリプション停止
    this.unsubscribeAll();

    // タイマー停止
    this.stopHeartbeat();
    this.stopBatchUpdates();

    // 状態リセット
    this.syncState = {
      channels: {},
      connectionStatus: 'disconnected',
      retryAttempts: 0,
      pendingUpdates: {
        messages: [],
        channels: [],
        users: [],
      },
    };

    console.log('[FirebaseSync] Sync stopped');
  }

  // =============================================================================
  // チャンネル同期
  // =============================================================================

  /**
   * チャンネル一覧の同期
   */
  private async subscribeToChannels(): Promise<void> {
    const subscriptionKey = 'channels';

    // 既存のサブスクリプションがあれば停止
    this.unsubscribe(subscriptionKey);

    try {
      const unsubscribe = subscribeToChannels(
        (channels: ChatChannel[]) => {
          this.handleChannelsUpdate(channels);
        },
        (error: Error) => {
          this.handleSubscriptionError(subscriptionKey, error);
        }
      );

      this.subscriptions.set(subscriptionKey, {
        unsubscribe,
        subscribedAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        errorCount: 0,
      });

      console.log('[FirebaseSync] Channels subscription started');

    } catch (error) {
      this.handleSubscriptionError(subscriptionKey, error as Error);
    }
  }

  /**
   * 特定チャンネルのメッセージ同期
   * @param channelId チャンネルID
   */
  public async subscribeToChannelMessages(channelId: string): Promise<void> {
    const subscriptionKey = `messages_${channelId}`;

    // 既存のサブスクリプションがあれば停止
    this.unsubscribeChannelMessages(channelId);

    try {
      // 同期状態初期化
      this.syncState.channels[channelId] = {
        isSubscribed: true,
        lastUpdate: new Date(),
      };

      store.dispatch(setChannelSyncStatus({
        channelId,
        syncStatus: 'syncing',
      }));

      const unsubscribe = subscribeToMessages(
        channelId,
        (messages: ChatMessage[]) => {
          this.handleMessagesUpdate(channelId, messages);
        },
        50, // 最大50件
        (error: Error) => {
          this.handleSubscriptionError(subscriptionKey, error);
        }
      );

      this.channelSubscriptions.set(channelId, {
        unsubscribe,
        subscribedAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        errorCount: 0,
      });

      // タイピング状態も同期
      await this.subscribeToTypingStatus(channelId);

      console.log(`[FirebaseSync] Messages subscription started for channel: ${channelId}`);

    } catch (error) {
      this.handleSubscriptionError(subscriptionKey, error as Error);

      store.dispatch(setChannelSyncStatus({
        channelId,
        syncStatus: 'error',
      }));
    }
  }

  /**
   * チャンネルメッセージ同期停止
   * @param channelId チャンネルID
   */
  public unsubscribeChannelMessages(channelId: string): void {
    const subscription = this.channelSubscriptions.get(channelId);

    if (subscription) {
      subscription.unsubscribe();
      this.channelSubscriptions.delete(channelId);

      // タイピング状態同期も停止
      this.unsubscribe(`typing_${channelId}`);

      // 同期状態更新
      if (this.syncState.channels[channelId]) {
        this.syncState.channels[channelId].isSubscribed = false;
      }

      console.log(`[FirebaseSync] Messages subscription stopped for channel: ${channelId}`);
    }
  }

  // =============================================================================
  // データ更新処理
  // =============================================================================

  /**
   * チャンネル情報更新処理
   * @param channels チャンネル配列
   */
  private handleChannelsUpdate(channels: ChatChannel[]): void {
    const channelStates: ChannelState[] = channels.map(channel => ({
      ...channel,
      syncStatus: 'synced',
      lastSync: new Date(),
      messagesPagination: {
        hasMore: true,
        loading: false,
      },
    }));

    store.dispatch(setChannels(channelStates));

    // バッチ更新キューに追加
    this.addToBatchQueue('channels', channels.map(ch => ch.id));
  }

  /**
   * メッセージ更新処理
   * @param channelId チャンネルID
   * @param messages メッセージ配列
   */
  private handleMessagesUpdate(channelId: string, messages: ChatMessage[]): void {
    const messageStates: MessageState[] = [];

    messages.forEach(message => {
      // 重複チェック（楽観的メッセージとの照合）
      if (this.optimisticUI.isDuplicateMessage(message)) {
        return;
      }

      // 楽観的メッセージとの置換チェック
      const state = store.getState();
      const channelMessages = state.messages.byChannel[channelId] || [];

      let replacedOptimistic = false;

      for (const messageId of channelMessages) {
        const existingMessage = state.messages.entities.byId[messageId];

        if (existingMessage && existingMessage.isOptimistic && existingMessage.localId) {
          // 類似性チェック
          if (this.isSimilarToOptimistic(existingMessage, message)) {
            // 楽観的メッセージを置換
            this.optimisticUI.confirmOptimisticMessage(existingMessage.localId, message);
            replacedOptimistic = true;
            break;
          }
        }
      }

      if (!replacedOptimistic) {
        // 通常のメッセージとして追加
        const messageState: MessageState = {
          ...message,
          optimisticStatus: 'synced',
          retryCount: 0,
          isOptimistic: false,
        };

        messageStates.push(messageState);
      }
    });

    if (messageStates.length > 0) {
      store.dispatch(setMessages({
        channelId,
        messages: messageStates,
        replace: false,
      }));

      // バッチ更新キューに追加
      this.addToBatchQueue('messages', messageStates.map(msg => msg.id));
    }

    // 同期状態更新
    store.dispatch(setChannelSyncStatus({
      channelId,
      syncStatus: 'synced',
    }));

    if (this.syncState.channels[channelId]) {
      this.syncState.channels[channelId].lastUpdate = new Date();
    }

    // サブスクリプション活動記録
    const subscription = this.channelSubscriptions.get(channelId);
    if (subscription) {
      subscription.lastActivity = new Date();
    }
  }

  /**
   * ユーザー情報更新処理
   * @param users ユーザー配列
   */
  private handleUsersUpdate(users: ChatUser[]): void {
    const userStates: UserState[] = users.map(user => ({
      ...user,
      connectionStatus: user.isOnline ? 'connected' : 'disconnected',
      presenceLastUpdate: new Date(),
    }));

    store.dispatch(setUsers(userStates));

    // バッチ更新キューに追加
    this.addToBatchQueue('users', users.map(u => u.id));
  }

  /**
   * タイピング状態更新処理
   * @param channelId チャンネルID
   * @param typingList タイピング状態配列
   */
  private handleTypingUpdate(channelId: string, typingList: TypingStatus[]): void {
    typingList.forEach(typing => {
      store.dispatch(updateTypingStatus({
        channelId,
        userId: typing.userId,
        userName: typing.userName,
        isTyping: typing.isTyping,
      }));
    });
  }

  // =============================================================================
  // ユーザー・タイピング同期
  // =============================================================================

  /**
   * ユーザー一覧の同期
   */
  private async subscribeToUsers(): Promise<void> {
    const subscriptionKey = 'users';

    this.unsubscribe(subscriptionKey);

    try {
      const unsubscribe = subscribeToUsers(
        (users: ChatUser[]) => {
          this.handleUsersUpdate(users);
        },
        (error: Error) => {
          this.handleSubscriptionError(subscriptionKey, error);
        }
      );

      this.subscriptions.set(subscriptionKey, {
        unsubscribe,
        subscribedAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        errorCount: 0,
      });

      console.log('[FirebaseSync] Users subscription started');

    } catch (error) {
      this.handleSubscriptionError(subscriptionKey, error as Error);
    }
  }

  /**
   * タイピング状態の同期
   * @param channelId チャンネルID
   */
  private async subscribeToTypingStatus(channelId: string): Promise<void> {
    const subscriptionKey = `typing_${channelId}`;

    this.unsubscribe(subscriptionKey);

    try {
      const unsubscribe = subscribeToTypingStatus(
        channelId,
        (typingList: TypingStatus[]) => {
          this.handleTypingUpdate(channelId, typingList);
        },
        (error: Error) => {
          this.handleSubscriptionError(subscriptionKey, error);
        }
      );

      this.subscriptions.set(subscriptionKey, {
        unsubscribe,
        subscribedAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        errorCount: 0,
      });

    } catch (error) {
      this.handleSubscriptionError(subscriptionKey, error as Error);
    }
  }

  // =============================================================================
  // エラー処理・再接続
  // =============================================================================

  /**
   * サブスクリプションエラー処理
   * @param subscriptionKey サブスクリプションキー
   * @param error エラー
   */
  private handleSubscriptionError(subscriptionKey: string, error: Error): void {
    console.error(`[FirebaseSync] Subscription error for ${subscriptionKey}:`, error);

    const subscription = this.subscriptions.get(subscriptionKey) ||
      this.channelSubscriptions.get(subscriptionKey.replace('messages_', ''));

    if (subscription) {
      subscription.status = 'error';
      subscription.errorCount += 1;

      // 一定回数エラーが続いた場合は再接続を試行
      if (subscription.errorCount >= 3) {
        this.scheduleReconnect(subscriptionKey);
      }
    }

    this.handleSyncError(`Subscription ${subscriptionKey}: ${error.message}`);
  }

  /**
   * 同期エラー処理
   * @param error エラーメッセージ
   */
  private handleSyncError(error: string): void {
    this.syncState.connectionStatus = 'error';
    this.syncState.retryAttempts += 1;

    if (this.syncState.retryAttempts < this.config.maxRetries) {
      this.scheduleReconnect('global');
    } else {
      console.error('[FirebaseSync] Max retry attempts reached');
      this.syncState.connectionStatus = 'disconnected';
    }
  }

  /**
   * 再接続スケジュール
   * @param context 再接続コンテキスト
   */
  private scheduleReconnect(context: string): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, this.syncState.retryAttempts),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect(context);
    }, delay);

    console.log(`[FirebaseSync] Reconnection scheduled for ${context} in ${delay}ms`);
  }

  /**
   * 再接続試行
   * @param context 再接続コンテキスト
   */
  private async attemptReconnect(context: string): Promise<void> {
    try {
      if (context === 'global') {
        // 全体再接続
        const state = store.getState();
        const currentUserId = state.users.currentUserId;

        if (currentUserId) {
          await this.startSync(currentUserId);
        }
      } else if (context.startsWith('messages_')) {
        // チャンネルメッセージ再接続
        const channelId = context.replace('messages_', '');
        await this.subscribeToChannelMessages(channelId);
      } else if (context === 'channels') {
        // チャンネル一覧再接続
        await this.subscribeToChannels();
      } else if (context === 'users') {
        // ユーザー一覧再接続
        await this.subscribeToUsers();
      }

      console.log(`[FirebaseSync] Reconnection successful for ${context}`);

    } catch (error) {
      console.error(`[FirebaseSync] Reconnection failed for ${context}:`, error);
      this.handleSyncError(`Reconnection failed: ${context}`);
    }
  }

  // =============================================================================
  // ユーティリティ
  // =============================================================================

  /**
   * 楽観的メッセージとの類似性判定
   * @param optimisticMessage 楽観的メッセージ
   * @param serverMessage サーバーメッセージ
   * @returns 類似しているかどうか
   */
  private isSimilarToOptimistic(optimisticMessage: MessageState, serverMessage: ChatMessage): boolean {
    // 内容チェック
    if (optimisticMessage.content !== serverMessage.content) {
      return false;
    }

    // 著者チェック
    if (optimisticMessage.authorId !== serverMessage.authorId) {
      return false;
    }

    // 時刻の近似チェック（±5秒）
    const optimisticTime = optimisticMessage.timestamp instanceof Date ?
      optimisticMessage.timestamp.getTime() :
      new Date(optimisticMessage.timestamp).getTime();

    const serverTime = serverMessage.timestamp instanceof Date ?
      serverMessage.timestamp.getTime() :
      new Date(serverMessage.timestamp).getTime();

    return Math.abs(optimisticTime - serverTime) <= 5000;
  }

  /**
   * サブスクリプション停止
   * @param subscriptionKey サブスクリプションキー
   */
  private unsubscribe(subscriptionKey: string): void {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * 全サブスクリプション停止
   */
  private unsubscribeAll(): void {
    // 一般サブスクリプション停止
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();

    // チャンネルサブスクリプション停止
    this.channelSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.channelSubscriptions.clear();
  }

  /**
   * バッチ更新キューに追加
   * @param type 更新タイプ
   * @param ids ID配列
   */
  private addToBatchQueue(type: keyof SyncState['pendingUpdates'], ids: string[]): void {
    this.syncState.pendingUpdates[type].push(...ids);
  }

  // =============================================================================
  // 定期処理
  // =============================================================================

  /**
   * ハートビート開始
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * ハートビート停止
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * ハートビート実行
   */
  private performHeartbeat(): void {
    const now = new Date();

    // サブスクリプションの健全性チェック
    this.subscriptions.forEach((subscription, key) => {
      const timeSinceActivity = now.getTime() - subscription.lastActivity.getTime();

      if (timeSinceActivity > this.config.subscriptionTimeout) {
        console.warn(`[FirebaseSync] Subscription ${key} seems inactive, reconnecting`);
        this.scheduleReconnect(key);
      }
    });
  }

  /**
   * バッチ更新開始
   */
  private startBatchUpdates(): void {
    this.batchUpdateTimer = setInterval(() => {
      this.processBatchUpdates();
    }, this.config.batchUpdateDelay);
  }

  /**
   * バッチ更新停止
   */
  private stopBatchUpdates(): void {
    if (this.batchUpdateTimer) {
      clearInterval(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }
  }

  /**
   * バッチ更新処理
   */
  private processBatchUpdates(): void {
    // 現在は簡単な実装、必要に応じて最適化
    this.syncState.pendingUpdates = {
      messages: [],
      channels: [],
      users: [],
    };
  }

  /**
   * 接続状態監視設定
   */
  private setupConnectionMonitoring(): void {
    // ネットワーク状態監視
    window.addEventListener('online', () => {
      console.log('[FirebaseSync] Network online detected');
      if (this.syncState.connectionStatus === 'disconnected') {
        const state = store.getState();
        const currentUserId = state.users.currentUserId;
        if (currentUserId) {
          this.startSync(currentUserId);
        }
      }
    });

    window.addEventListener('offline', () => {
      console.log('[FirebaseSync] Network offline detected');
      this.syncState.connectionStatus = 'disconnected';
    });
  }

  // =============================================================================
  // 外部API
  // =============================================================================

  /**
   * 統計情報取得
   */
  public getStats() {
    return {
      subscriptions: this.subscriptions.size,
      channelSubscriptions: this.channelSubscriptions.size,
      connectionStatus: this.syncState.connectionStatus,
      retryAttempts: this.syncState.retryAttempts,
      subscribedChannels: Object.keys(this.syncState.channels).length,
    };
  }

  /**
   * 現在の同期状態取得
   */
  public getSyncState(): SyncState {
    return { ...this.syncState };
  }
}