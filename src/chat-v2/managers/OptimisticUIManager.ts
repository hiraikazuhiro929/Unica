import { store } from '../store';
import {
  addOptimisticMessage,
  replaceOptimisticMessage,
  markMessageFailed,
  removeMessage,
} from '../store/slices/messagesSlice';
import type { MessageState, QueuedMessage, OptimisticOperation } from '../store/types';
import type { ChatMessage } from '@/lib/firebase/chat';

// =============================================================================
// 楽観的UI管理システム
// 重複問題解決とシームレスなUX提供
// =============================================================================

export class OptimisticUIManager {
  private static instance: OptimisticUIManager;

  // 操作記録（ロールバック用）
  private operations = new Map<string, OptimisticOperation>();

  // localId → serverId マッピング（重複除去用）
  private idMapping = new Map<string, string>();

  // リトライタイマー
  private retryTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): OptimisticUIManager {
    if (!OptimisticUIManager.instance) {
      OptimisticUIManager.instance = new OptimisticUIManager();
    }
    return OptimisticUIManager.instance;
  }

  // =============================================================================
  // メッセージ送信の楽観的UI処理
  // =============================================================================

  /**
   * 楽観的メッセージを即座に表示
   * @param messageData メッセージデータ
   * @returns localId
   */
  public addOptimisticMessage(messageData: Omit<MessageState, 'id' | 'localId' | 'optimisticStatus' | 'retryCount' | 'isOptimistic'>): string {
    const localId = this.generateLocalId();
    const timestamp = new Date();

    // 楽観的操作記録
    const operation: OptimisticOperation = {
      id: localId,
      type: 'sendMessage',
      entityId: localId,
      timestamp,
      retryCount: 0,
      maxRetries: 3,
      originalData: messageData,
    };

    this.operations.set(localId, operation);

    // Reduxストアに楽観的メッセージを追加
    store.dispatch(addOptimisticMessage({
      message: {
        ...messageData,
        timestamp,
      },
      localId,
    }));

    return localId;
  }

  /**
   * サーバーメッセージで楽観的メッセージを置換（重複除去）
   * @param localId ローカルID
   * @param serverMessage サーバーから受信したメッセージ
   */
  public confirmOptimisticMessage(localId: string, serverMessage: ChatMessage): void {
    const operation = this.operations.get(localId);

    if (!operation) {
      console.warn(`[OptimisticUI] Unknown localId: ${localId}`);
      return;
    }

    // IDマッピング更新
    this.idMapping.set(localId, serverMessage.id);

    // 楽観的メッセージをサーバーメッセージで置換
    const messageState: MessageState = {
      ...serverMessage,
      optimisticStatus: 'synced',
      retryCount: 0,
      isOptimistic: false,
    };

    store.dispatch(replaceOptimisticMessage({
      localId,
      serverMessage: messageState,
    }));

    // 操作記録とタイマーをクリーンアップ
    this.cleanupOperation(localId);
  }

  /**
   * メッセージ送信失敗処理
   * @param localId ローカルID
   * @param error エラーメッセージ
   * @param shouldRetry リトライするかどうか
   */
  public handleMessageFailure(localId: string, error: string, shouldRetry: boolean = true): void {
    const operation = this.operations.get(localId);

    if (!operation) {
      console.warn(`[OptimisticUI] Unknown localId: ${localId}`);
      return;
    }

    // リトライ回数更新
    operation.retryCount += 1;

    // Reduxストアの状態更新
    store.dispatch(markMessageFailed({
      localId,
      error,
    }));

    // リトライ判定
    if (shouldRetry && operation.retryCount < operation.maxRetries) {
      this.scheduleRetry(localId, operation);
    } else {
      // 最大リトライ回数に達した場合は失敗状態で固定
      console.error(`[OptimisticUI] Message send failed permanently: ${localId}`, error);
    }
  }

  /**
   * 楽観的メッセージの手動削除（送信失敗時のユーザー操作）
   * @param localId ローカルID
   */
  public removeOptimisticMessage(localId: string): void {
    store.dispatch(removeMessage(localId));
    this.cleanupOperation(localId);
  }

  // =============================================================================
  // リトライ機能
  // =============================================================================

  /**
   * リトライスケジュール
   * @param localId ローカルID
   * @param operation 操作情報
   */
  private scheduleRetry(localId: string, operation: OptimisticOperation): void {
    // 既存のタイマーをクリア
    const existingTimer = this.retryTimers.get(localId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 指数バックオフでリトライ間隔を計算
    const retryDelay = Math.min(1000 * Math.pow(2, operation.retryCount), 30000);

    const timer = setTimeout(() => {
      this.executeRetry(localId, operation);
    }, retryDelay);

    this.retryTimers.set(localId, timer);
  }

  /**
   * リトライ実行（外部から実装される送信関数を呼び出し）
   * @param localId ローカルID
   * @param operation 操作情報
   */
  private async executeRetry(localId: string, operation: OptimisticOperation): Promise<void> {
    try {
      // 元のメッセージデータでリトライ
      const messageData = operation.originalData;

      if (!messageData) {
        throw new Error('No original data for retry');
      }

      // ここで実際の送信処理を呼び出す
      // MessageQueueを通じて再送信されることを想定
      console.log(`[OptimisticUI] Retrying message send: ${localId}`);

      // 送信状態を'sending'に戻す
      const state = store.getState();
      const message = state.messages.entities.byId[localId];

      if (message) {
        // sendingステータスに戻して再試行を表示
        // 実際の再送信はMessageQueueが処理
      }

    } catch (error) {
      console.error(`[OptimisticUI] Retry failed for ${localId}:`, error);
      this.handleMessageFailure(localId, error instanceof Error ? error.message : 'Retry failed', false);
    }
  }

  // =============================================================================
  // 重複検知・除去
  // =============================================================================

  /**
   * 受信メッセージの重複チェック
   * @param serverMessage サーバーから受信したメッセージ
   * @returns 重複していないかどうか
   */
  public isDuplicateMessage(serverMessage: ChatMessage): boolean {
    const state = store.getState();

    // 1. 既にストアに存在するかチェック
    if (state.messages.entities.byId[serverMessage.id]) {
      return true;
    }

    // 2. 楽観的メッセージとの重複チェック
    const channelMessages = state.messages.byChannel[serverMessage.channelId] || [];

    for (const messageId of channelMessages) {
      const existingMessage = state.messages.entities.byId[messageId];

      if (existingMessage && existingMessage.isOptimistic) {
        // コンテンツと時刻の近似チェック
        if (this.isSimilarMessage(existingMessage, serverMessage)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * メッセージ類似性判定
   * @param optimisticMessage 楽観的メッセージ
   * @param serverMessage サーバーメッセージ
   * @returns 類似しているかどうか
   */
  private isSimilarMessage(optimisticMessage: MessageState, serverMessage: ChatMessage): boolean {
    // 内容の一致チェック
    if (optimisticMessage.content !== serverMessage.content) {
      return false;
    }

    // 著者の一致チェック
    if (optimisticMessage.authorId !== serverMessage.authorId) {
      return false;
    }

    // 時刻の近似チェック（±5秒以内）
    const optimisticTime = optimisticMessage.timestamp instanceof Date ?
      optimisticMessage.timestamp.getTime() :
      new Date(optimisticMessage.timestamp).getTime();

    const serverTime = serverMessage.timestamp instanceof Date ?
      serverMessage.timestamp.getTime() :
      new Date(serverMessage.timestamp).getTime();

    const timeDiff = Math.abs(optimisticTime - serverTime);
    const timeThreshold = 5000; // 5秒

    if (timeDiff > timeThreshold) {
      return false;
    }

    return true;
  }

  // =============================================================================
  // 状態管理とクリーンアップ
  // =============================================================================

  /**
   * 操作のクリーンアップ
   * @param localId ローカルID
   */
  private cleanupOperation(localId: string): void {
    this.operations.delete(localId);

    const timer = this.retryTimers.get(localId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(localId);
    }
  }

  /**
   * 全操作のクリーンアップ（チャンネル切り替え時等）
   */
  public cleanupAllOperations(): void {
    this.operations.clear();

    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();

    this.idMapping.clear();
  }

  /**
   * 特定チャンネルの操作クリーンアップ
   * @param channelId チャンネルID
   */
  public cleanupChannelOperations(channelId: string): void {
    const state = store.getState();
    const channelMessages = state.messages.byChannel[channelId] || [];

    channelMessages.forEach(messageId => {
      const message = state.messages.entities.byId[messageId];
      if (message && message.isOptimistic && message.localId) {
        this.cleanupOperation(message.localId);
      }
    });
  }

  /**
   * 送信中メッセージの一覧取得
   * @returns 送信中のメッセージ配列
   */
  public getSendingMessages(): MessageState[] {
    const state = store.getState();
    return Object.values(state.messages.entities.byId)
      .filter(msg => msg.optimisticStatus === 'sending');
  }

  /**
   * 失敗メッセージの一覧取得
   * @returns 失敗したメッセージ配列
   */
  public getFailedMessages(): MessageState[] {
    const state = store.getState();
    return Object.values(state.messages.entities.byId)
      .filter(msg => msg.optimisticStatus === 'failed');
  }

  // =============================================================================
  // ユーティリティ
  // =============================================================================

  /**
   * ローカルID生成
   * @returns ユニークなローカルID
   */
  private generateLocalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `local_${timestamp}_${random}`;
  }

  /**
   * 統計情報取得
   * @returns 楽観的UI統計
   */
  public getStats() {
    const state = store.getState();
    const allMessages = Object.values(state.messages.entities.byId);

    return {
      totalOperations: this.operations.size,
      activeRetries: this.retryTimers.size,
      sendingMessages: allMessages.filter(msg => msg.optimisticStatus === 'sending').length,
      failedMessages: allMessages.filter(msg => msg.optimisticStatus === 'failed').length,
      idMappings: this.idMapping.size,
    };
  }
}