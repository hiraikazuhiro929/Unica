// オフライン機能管理 - 製造業現場対応
import React from 'react';
import { safeFirebaseOperation, saveToLocalStorage, loadFromLocalStorage } from './errorHandling';
import { log } from '@/lib/logger';

// =============================================================================
// オフライン状態管理
// =============================================================================

export interface OfflineStatus {
  isOnline: boolean;
  lastOnlineAt: string;
  pendingSyncCount: number;
  syncInProgress: boolean;
}

export interface OfflineData<T = any> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'orders' | 'processes' | 'work-hours' | 'daily-reports' | 'inventory' | 'other';
  data: T;
  timestamp: string;
  userId: string;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  needsConfirmation: boolean;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = navigator.onLine;
  private pendingOperations: OfflineData[] = [];
  private syncInProgress: boolean = false;
  private eventListeners: Set<(status: OfflineStatus) => void> = new Set();
  
  private constructor() {
    this.initialize();
  }
  
  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }
  
  private initialize(): void {
    // ブラウザのオンライン/オフライン状態を監視
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // 保存されたオフラインデータを読み込み
    this.loadPendingOperations();
    
    // 定期的な同期チェック
    setInterval(() => {
      if (this.isOnline && this.pendingOperations.length > 0 && !this.syncInProgress) {
        this.syncPendingOperations();
      }
    }, 30000); // 30秒毎
    
    log.info('OfflineManager initialized', { isOnline: this.isOnline }, 'OfflineManager');
  }
  
  private handleOnline(): void {
    this.isOnline = true;
    log.info('Connection restored - starting sync', undefined, 'OfflineManager');
    this.notifyListeners();
    
    // オンラインに戻ったら自動同期開始
    if (this.pendingOperations.length > 0) {
      setTimeout(() => this.syncPendingOperations(), 1000);
    }
  }
  
  private handleOffline(): void {
    this.isOnline = false;
    log.warn('Connection lost - offline mode activated', undefined, 'OfflineManager');
    this.notifyListeners();
  }
  
  // =============================================================================
  // ステータス管理
  // =============================================================================
  
  public getStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline,
      lastOnlineAt: this.isOnline ? new Date().toISOString() : (localStorage.getItem('lastOnlineAt') || ''),
      pendingSyncCount: this.pendingOperations.length,
      syncInProgress: this.syncInProgress
    };
  }
  
  public onStatusChange(callback: (status: OfflineStatus) => void): void {
    this.eventListeners.add(callback);
  }
  
  public removeStatusListener(callback: (status: OfflineStatus) => void): void {
    this.eventListeners.delete(callback);
  }
  
  private notifyListeners(): void {
    const status = this.getStatus();
    this.eventListeners.forEach(callback => callback(status));
  }
  
  // =============================================================================
  // オフラインデータ操作
  // =============================================================================
  
  public async queueOperation<T>(
    type: OfflineData['type'],
    entity: OfflineData['entity'],
    data: T,
    options: {
      priority?: OfflineData['priority'];
      needsConfirmation?: boolean;
      userId?: string;
    } = {}
  ): Promise<void> {
    const operation: OfflineData<T> = {
      id: this.generateId(),
      type,
      entity,
      data,
      timestamp: new Date().toISOString(),
      userId: options.userId || 'current-user',
      retryCount: 0,
      priority: options.priority || 'medium',
      needsConfirmation: options.needsConfirmation || false
    };
    
    this.pendingOperations.push(operation);
    this.savePendingOperations();
    this.notifyListeners();
    
    log.debug('Operation queued for offline sync', { type, entity, priority: operation.priority }, 'OfflineManager');
    
    // オンライン状態なら即座に同期を試行
    if (this.isOnline && !this.syncInProgress) {
      setTimeout(() => this.syncPendingOperations(), 100);
    }
  }
  
  // =============================================================================
  // データ同期
  // =============================================================================
  
  public async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.pendingOperations.length === 0) {
      return;
    }
    
    this.syncInProgress = true;
    this.notifyListeners();
    
    log.info('Starting offline data sync', { pendingCount: this.pendingOperations.length }, 'OfflineManager');
    
    // 優先度順にソート
    const sortedOperations = [...this.pendingOperations].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const operation of sortedOperations) {
      try {
        const success = await this.syncSingleOperation(operation);
        if (success) {
          results.successful++;
          this.removePendingOperation(operation.id);
        } else {
          results.failed++;
          operation.retryCount++;
        }
      } catch (error: any) {
        console.error('Sync operation failed:', error);
        results.failed++;
        results.errors.push(error.message);
        operation.retryCount++;
        
        // 最大リトライ回数を超えた場合は削除
        if (operation.retryCount > 5) {
          console.warn('Max retry count exceeded, removing operation:', operation);
          this.removePendingOperation(operation.id);
        }
      }
      
      // 同期間隔（製造業現場の負荷を考慮）
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.syncInProgress = false;
    this.savePendingOperations();
    this.notifyListeners();
    
    log.info('Offline sync completed', results, 'OfflineManager');
    
    if (this.isOnline) {
      localStorage.setItem('lastOnlineAt', new Date().toISOString());
    }
  }
  
  private async syncSingleOperation(operation: OfflineData): Promise<boolean> {
    log.debug(`Syncing ${operation.type} ${operation.entity}`, { id: operation.id }, 'OfflineManager');
    
    try {
      // エンティティタイプに基づいて適切なFirebase操作を実行
      switch (operation.entity) {
        case 'orders':
          return await this.syncOrderOperation(operation);
        case 'processes':
          return await this.syncProcessOperation(operation);
        case 'work-hours':
          return await this.syncWorkHoursOperation(operation);
        case 'daily-reports':
          return await this.syncDailyReportOperation(operation);
        case 'inventory':
          return await this.syncInventoryOperation(operation);
        default:
          console.warn('Unknown entity type for sync:', operation.entity);
          return false;
      }
    } catch (error) {
      console.error(`Sync failed for ${operation.entity}:`, error);
      return false;
    }
  }
  
  private async syncOrderOperation(operation: OfflineData): Promise<boolean> {
    // 受注データの同期ロジック
    return await safeFirebaseOperation(async () => {
      // ここで実際のFirebase操作を実行
      log.debug('Syncing order', operation.data, 'OfflineManager');
      return true;
    }).then(result => result.success);
  }
  
  private async syncProcessOperation(operation: OfflineData): Promise<boolean> {
    // 工程データの同期ロジック
    return await safeFirebaseOperation(async () => {
      log.debug('Syncing process', operation.data, 'OfflineManager');
      return true;
    }).then(result => result.success);
  }
  
  private async syncWorkHoursOperation(operation: OfflineData): Promise<boolean> {
    // 工数データの同期ロジック
    return await safeFirebaseOperation(async () => {
      log.debug('Syncing work hours', operation.data, 'OfflineManager');
      return true;
    }).then(result => result.success);
  }
  
  private async syncDailyReportOperation(operation: OfflineData): Promise<boolean> {
    // 日報データの同期ロジック
    return await safeFirebaseOperation(async () => {
      log.debug('Syncing daily report', operation.data, 'OfflineManager');
      return true;
    }).then(result => result.success);
  }
  
  private async syncInventoryOperation(operation: OfflineData): Promise<boolean> {
    // 在庫データの同期ロジック
    return await safeFirebaseOperation(async () => {
      log.debug('Syncing inventory', operation.data, 'OfflineManager');
      return true;
    }).then(result => result.success);
  }
  
  // =============================================================================
  // ローカルデータ管理
  // =============================================================================
  
  private savePendingOperations(): void {
    saveToLocalStorage('pending_offline_operations', this.pendingOperations);
  }
  
  private loadPendingOperations(): void {
    const saved = loadFromLocalStorage('pending_offline_operations');
    if (saved && Array.isArray(saved)) {
      this.pendingOperations = saved;
    }
  }
  
  private removePendingOperation(id: string): void {
    this.pendingOperations = this.pendingOperations.filter(op => op.id !== id);
  }
  
  public clearPendingOperations(): void {
    this.pendingOperations = [];
    localStorage.removeItem('pending_offline_operations');
    this.notifyListeners();
  }
  
  public getPendingOperations(): OfflineData[] {
    return [...this.pendingOperations];
  }
  
  // =============================================================================
  // キャッシュ管理
  // =============================================================================
  
  public async cacheData<T>(key: string, data: T, expiryHours: number = 24): Promise<void> {
    const cacheData = {
      data,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
    };
    
    saveToLocalStorage(`cache_${key}`, cacheData);
  }
  
  public getCachedData<T>(key: string): T | null {
    const cached = loadFromLocalStorage(`cache_${key}`);
    
    if (!cached) return null;
    
    // 期限切れチェック
    if (new Date(cached.expiresAt) < new Date()) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    return cached.data;
  }
  
  public clearCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
  
  // =============================================================================
  // ユーティリティ
  // =============================================================================
  
  private generateId(): string {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  public async forceSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    log.info('Force sync requested', undefined, 'OfflineManager');
    await this.syncPendingOperations();
  }
  
  // 製造現場向け：緊急データの優先同期
  public async syncCriticalData(): Promise<void> {
    if (!this.isOnline) return;
    
    const criticalOperations = this.pendingOperations.filter(
      op => op.priority === 'critical' || op.priority === 'high'
    );
    
    if (criticalOperations.length === 0) return;
    
    log.warn('Syncing critical manufacturing data', { count: criticalOperations.length }, 'OfflineManager');
    
    for (const operation of criticalOperations) {
      try {
        const success = await this.syncSingleOperation(operation);
        if (success) {
          this.removePendingOperation(operation.id);
        }
      } catch (error) {
        console.error('Critical sync failed:', error);
      }
    }
    
    this.savePendingOperations();
    this.notifyListeners();
  }
}

// =============================================================================
// オフライン対応コンポーネント用フック
// =============================================================================

export const useOfflineStatus = () => {
  const [status, setStatus] = React.useState<OfflineStatus>(() => 
    OfflineManager.getInstance().getStatus()
  );
  
  React.useEffect(() => {
    const manager = OfflineManager.getInstance();
    
    const handleStatusChange = (newStatus: OfflineStatus) => {
      setStatus(newStatus);
    };
    
    manager.onStatusChange(handleStatusChange);
    
    return () => {
      manager.removeStatusListener(handleStatusChange);
    };
  }, []);
  
  return status;
};

// =============================================================================
// エクスポート
// =============================================================================

// シングルトンインスタンスをエクスポート
export const offlineManager = OfflineManager.getInstance();