import { OptimisticUIManager } from '../managers/OptimisticUIManager';
import { sendMessage } from '@/lib/firebase/chat';
import type { QueuedMessage } from '../store/types';
import type { ChatMessage, ChatAttachment } from '@/lib/firebase/chat';

// =============================================================================
// メッセージキューシステム
// 堅牢な非同期送信とオフライン対応
// =============================================================================

interface QueueConfig {
  maxRetries: number;
  retryDelay: number;
  maxConcurrent: number;
  batchSize: number;
  offlineRetentionTime: number; // ミリ秒
}

export class MessageQueue {
  private static instance: MessageQueue;

  private queue: QueuedMessage[] = [];
  private processing = new Set<string>(); // 処理中のlocalId
  private failures = new Map<string, { count: number; lastAttempt: Date }>(); // 失敗記録

  private config: QueueConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    maxConcurrent: 3,
    batchSize: 5,
    offlineRetentionTime: 24 * 60 * 60 * 1000, // 24時間
  };

  private optimisticUI: OptimisticUIManager;

  // タイマー管理
  private processingTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  // オフライン状態管理
  private isOnline = navigator.onLine;
  private pendingOfflineMessages: QueuedMessage[] = [];

  private constructor() {
    this.optimisticUI = OptimisticUIManager.getInstance();

    // オンライン状態監視
    this.setupOnlineListeners();

    // 定期処理開始
    this.startProcessing();
    this.startCleanup();

    // ページ離脱時の保存
    this.setupBeforeUnload();
  }

  public static getInstance(): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue();
    }
    return MessageQueue.instance;
  }

  // =============================================================================
  // メッセージ送信API
  // =============================================================================

  /**
   * メッセージをキューに追加して送信
   * @param messageData メッセージデータ
   * @returns localId
   */
  public async enqueueMessage(messageData: {
    channelId: string;
    content: string;
    attachments: ChatAttachment[];
    authorId: string;
    authorName: string;
    authorRole: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<string> {
    // 楽観的UIで即座に表示
    const localId = this.optimisticUI.addOptimisticMessage({
      channelId: messageData.channelId,
      content: messageData.content,
      authorId: messageData.authorId,
      authorName: messageData.authorName,
      authorRole: messageData.authorRole,
      type: 'message',
      priority: messageData.priority || 'normal',
      attachments: messageData.attachments,
      reactions: [],
      isDeleted: false,
      timestamp: new Date(),
    });

    // キューアイテム作成
    const queuedMessage: QueuedMessage = {
      localId,
      channelId: messageData.channelId,
      content: messageData.content,
      attachments: messageData.attachments,
      authorId: messageData.authorId,
      authorName: messageData.authorName,
      authorRole: messageData.authorRole,
      timestamp: new Date(),
      retryCount: 0,
      priority: messageData.priority || 'normal',
    };

    // オフライン時は特別な処理
    if (!this.isOnline) {
      this.pendingOfflineMessages.push(queuedMessage);
      this.saveOfflineMessages();
      return localId;
    }

    // 優先度に応じてキューに挿入
    this.insertIntoQueue(queuedMessage);

    // 即座に処理開始
    this.processQueue();

    return localId;
  }

  /**
   * 特定メッセージの送信再試行
   * @param localId ローカルID
   */
  public async retryMessage(localId: string): Promise<boolean> {
    // 失敗記録から探す
    const failure = this.failures.get(localId);

    if (!failure) {
      console.warn(`[MessageQueue] No failure record for ${localId}`);
      return false;
    }

    // 楽観的UIから元データを取得
    const optimisticManager = this.optimisticUI;
    const failedMessages = optimisticManager.getFailedMessages();
    const message = failedMessages.find(msg => msg.localId === localId);

    if (!message) {
      console.warn(`[MessageQueue] Failed message not found: ${localId}`);
      return false;
    }

    // キューアイテム再生成
    const queuedMessage: QueuedMessage = {
      localId,
      channelId: message.channelId,
      content: message.content,
      attachments: message.attachments || [],
      authorId: message.authorId,
      authorName: message.authorName,
      authorRole: message.authorRole,
      timestamp: new Date(),
      retryCount: failure.count,
      priority: message.priority || 'normal',
    };

    // キューに再追加
    this.insertIntoQueue(queuedMessage);
    this.processQueue();

    return true;
  }

  /**
   * 失敗メッセージの削除
   * @param localId ローカルID
   */
  public removeMessage(localId: string): void {
    // キューから削除
    this.queue = this.queue.filter(msg => msg.localId !== localId);

    // 処理中から削除
    this.processing.delete(localId);

    // 失敗記録から削除
    this.failures.delete(localId);

    // 楽観的UIからも削除
    this.optimisticUI.removeOptimisticMessage(localId);
  }

  // =============================================================================
  // キュー処理
  // =============================================================================

  /**
   * 優先度に応じたキュー挿入
   * @param message キューアイテム
   */
  private insertIntoQueue(message: QueuedMessage): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const messagePriority = priorityOrder[message.priority];

    // 優先度順で挿入位置を決定
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority];
      if (messagePriority > queuePriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
  }

  /**
   * キュー処理のメインループ
   */
  private async processQueue(): Promise<void> {
    if (!this.isOnline) {
      return; // オフライン時は処理停止
    }

    const availableSlots = this.config.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) {
      return; // 同時実行数上限に達している
    }

    const batch = this.queue
      .filter(msg => !this.processing.has(msg.localId))
      .slice(0, Math.min(availableSlots, this.config.batchSize));

    if (batch.length === 0) {
      return; // 処理するメッセージがない
    }

    // バッチ処理
    const promises = batch.map(message => this.processMessage(message));
    await Promise.allSettled(promises);
  }

  /**
   * 個別メッセージ処理
   * @param message キューアイテム
   */
  private async processMessage(message: QueuedMessage): Promise<void> {
    const { localId } = message;

    // 処理中フラグ設定
    this.processing.add(localId);

    try {
      // Firebase送信
      const result = await sendMessage({
        channelId: message.channelId,
        content: message.content,
        authorId: message.authorId,
        authorName: message.authorName,
        authorRole: message.authorRole,
        type: 'message',
        priority: message.priority,
        attachments: message.attachments,
        reactions: [],
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // 送信成功
      this.handleSendSuccess(localId, result.id);

    } catch (error) {
      // 送信失敗
      this.handleSendFailure(localId, message, error instanceof Error ? error.message : 'Unknown error');

    } finally {
      // 処理中フラグクリア
      this.processing.delete(localId);
    }
  }

  /**
   * 送信成功処理
   * @param localId ローカルID
   * @param serverId サーバーID
   */
  private handleSendSuccess(localId: string, serverId: string): void {
    // キューから削除
    this.queue = this.queue.filter(msg => msg.localId !== localId);

    // 失敗記録削除
    this.failures.delete(localId);

    // 楽観的UIに成功通知
    // サーバーメッセージはFirebaseリアルタイムリスナーで受信される想定
    console.log(`[MessageQueue] Message sent successfully: ${localId} -> ${serverId}`);
  }

  /**
   * 送信失敗処理
   * @param localId ローカルID
   * @param message 元メッセージ
   * @param error エラーメッセージ
   */
  private handleSendFailure(localId: string, message: QueuedMessage, error: string): void {
    const retryCount = message.retryCount + 1;

    // 失敗記録更新
    this.failures.set(localId, {
      count: retryCount,
      lastAttempt: new Date(),
    });

    // 楽観的UIに失敗通知
    this.optimisticUI.handleMessageFailure(localId, error, retryCount < this.config.maxRetries);

    if (retryCount < this.config.maxRetries) {
      // リトライ
      const retryMessage: QueuedMessage = {
        ...message,
        retryCount,
        timestamp: new Date(),
      };

      // 指数バックオフでリトライ
      const delay = this.config.retryDelay * Math.pow(2, retryCount - 1);

      setTimeout(() => {
        this.insertIntoQueue(retryMessage);
        this.processQueue();
      }, delay);

    } else {
      // 最大リトライ回数に達した場合はキューから削除
      this.queue = this.queue.filter(msg => msg.localId !== localId);
      console.error(`[MessageQueue] Message send failed permanently: ${localId}`, error);
    }
  }

  // =============================================================================
  // オフライン対応
  // =============================================================================

  /**
   * オンライン状態監視のセットアップ
   */
  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      console.log('[MessageQueue] Coming back online');
      this.isOnline = true;
      this.handleComingOnline();
    });

    window.addEventListener('offline', () => {
      console.log('[MessageQueue] Going offline');
      this.isOnline = false;
      this.handleGoingOffline();
    });
  }

  /**
   * オンライン復帰時の処理
   */
  private async handleComingOnline(): Promise<void> {
    // オフライン中のメッセージをキューに移動
    this.pendingOfflineMessages.forEach(message => {
      this.insertIntoQueue(message);
    });

    this.pendingOfflineMessages = [];
    this.clearOfflineStorage();

    // キュー処理再開
    this.processQueue();
  }

  /**
   * オフライン移行時の処理
   */
  private handleGoingOffline(): void {
    // 現在のキューをオフライン保存
    this.saveOfflineMessages();
  }

  /**
   * オフラインメッセージの保存
   */
  private saveOfflineMessages(): void {
    const offlineData = {
      messages: this.pendingOfflineMessages,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem('chat_offline_messages', JSON.stringify(offlineData));
    } catch (error) {
      console.warn('[MessageQueue] Failed to save offline messages:', error);
    }
  }

  /**
   * オフラインメッセージの復元
   */
  private loadOfflineMessages(): void {
    try {
      const stored = localStorage.getItem('chat_offline_messages');
      if (!stored) return;

      const data = JSON.parse(stored);
      const age = Date.now() - data.timestamp;

      // 保持期間内のメッセージのみ復元
      if (age < this.config.offlineRetentionTime) {
        this.pendingOfflineMessages = data.messages || [];
      } else {
        this.clearOfflineStorage();
      }

    } catch (error) {
      console.warn('[MessageQueue] Failed to load offline messages:', error);
      this.clearOfflineStorage();
    }
  }

  /**
   * オフライン保存データクリア
   */
  private clearOfflineStorage(): void {
    try {
      localStorage.removeItem('chat_offline_messages');
    } catch (error) {
      console.warn('[MessageQueue] Failed to clear offline storage:', error);
    }
  }

  // =============================================================================
  // 定期処理とクリーンアップ
  // =============================================================================

  /**
   * キュー処理の定期実行開始
   */
  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, 5000); // 5秒間隔
  }

  /**
   * クリーンアップの定期実行開始
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // 1分間隔
  }

  /**
   * 古いデータのクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1時間

    // 古い失敗記録を削除
    for (const [localId, failure] of this.failures.entries()) {
      const age = now - failure.lastAttempt.getTime();
      if (age > maxAge) {
        this.failures.delete(localId);
      }
    }

    // 処理中で止まっているものをリセット
    this.processing.clear();
  }

  /**
   * ページ離脱時の保存設定
   */
  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      if (this.pendingOfflineMessages.length > 0) {
        this.saveOfflineMessages();
      }
    });
  }

  // =============================================================================
  // 外部API
  // =============================================================================

  /**
   * キュー統計取得
   */
  public getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      failures: this.failures.size,
      pendingOffline: this.pendingOfflineMessages.length,
      isOnline: this.isOnline,
    };
  }

  /**
   * 設定更新
   * @param newConfig 新しい設定
   */
  public updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * キューリセット
   */
  public reset(): void {
    this.queue = [];
    this.processing.clear();
    this.failures.clear();
    this.pendingOfflineMessages = [];
    this.clearOfflineStorage();
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.reset();
  }
}