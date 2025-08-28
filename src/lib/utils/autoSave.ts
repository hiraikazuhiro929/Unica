// 自動保存・バックアップ機能
import { debounce } from './debounce';

// 自動保存の設定
export interface AutoSaveConfig {
  key: string;                // ローカルストレージのキー
  interval?: number;          // 自動保存間隔（ミリ秒）
  maxBackups?: number;        // 最大バックアップ数
  onSave?: () => void;        // 保存時のコールバック
  onRestore?: (data: any) => void; // 復元時のコールバック
}

// 自動保存クラス
export class AutoSave {
  private config: Required<AutoSaveConfig>;
  private saveTimer: NodeJS.Timeout | null = null;
  private backupIndex: number = 0;
  
  constructor(config: AutoSaveConfig) {
    this.config = {
      key: config.key,
      interval: config.interval || 5000, // デフォルト5秒
      maxBackups: config.maxBackups || 5, // デフォルト5件
      onSave: config.onSave || (() => {}),
      onRestore: config.onRestore || (() => {})
    };
  }
  
  // データを保存
  save(data: any, immediate: boolean = false) {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    const doSave = () => {
      try {
        // 現在のデータを保存
        const saveData = {
          data,
          timestamp: new Date().toISOString(),
          version: 1
        };
        
        localStorage.setItem(this.config.key, JSON.stringify(saveData));
        
        // バックアップも作成
        this.createBackup(data);
        
        // コールバック実行
        this.config.onSave();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };
    
    if (immediate) {
      doSave();
    } else {
      this.saveTimer = setTimeout(doSave, this.config.interval);
    }
  }
  
  // バックアップ作成
  private createBackup(data: any) {
    try {
      const backupKey = `${this.config.key}_backup_${this.backupIndex}`;
      localStorage.setItem(backupKey, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
      
      // インデックスを循環
      this.backupIndex = (this.backupIndex + 1) % this.config.maxBackups;
    } catch (error) {
      console.error('Backup creation failed:', error);
    }
  }
  
  // データを復元
  restore(): any | null {
    try {
      const saved = localStorage.getItem(this.config.key);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      
      // 24時間以内のデータのみ復元
      const age = Date.now() - new Date(parsed.timestamp).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        this.clear();
        return null;
      }
      
      this.config.onRestore(parsed.data);
      return parsed.data;
    } catch (error) {
      console.error('Restore failed:', error);
      return null;
    }
  }
  
  // バックアップ一覧取得
  getBackups(): Array<{ data: any; timestamp: string }> {
    const backups = [];
    
    for (let i = 0; i < this.config.maxBackups; i++) {
      try {
        const backupKey = `${this.config.key}_backup_${i}`;
        const saved = localStorage.getItem(backupKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          backups.push(parsed);
        }
      } catch (error) {
        console.error('Failed to load backup:', error);
      }
    }
    
    // 新しい順にソート
    return backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  // 特定のバックアップを復元
  restoreBackup(timestamp: string): any | null {
    const backups = this.getBackups();
    const backup = backups.find(b => b.timestamp === timestamp);
    
    if (backup) {
      this.config.onRestore(backup.data);
      return backup.data;
    }
    
    return null;
  }
  
  // データとバックアップをクリア
  clear() {
    try {
      localStorage.removeItem(this.config.key);
      
      for (let i = 0; i < this.config.maxBackups; i++) {
        const backupKey = `${this.config.key}_backup_${i}`;
        localStorage.removeItem(backupKey);
      }
    } catch (error) {
      console.error('Clear failed:', error);
    }
  }
  
  // クリーンアップ
  destroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

// React Hook用のユーティリティ
export const useAutoSave = (
  key: string,
  data: any,
  options?: Partial<AutoSaveConfig>
) => {
  const autoSaveRef = React.useRef<AutoSave | null>(null);
  
  React.useEffect(() => {
    autoSaveRef.current = new AutoSave({
      key,
      ...options
    });
    
    // 初回マウント時に復元を試みる
    const restored = autoSaveRef.current.restore();
    if (restored && options?.onRestore) {
      options.onRestore(restored);
    }
    
    return () => {
      autoSaveRef.current?.destroy();
    };
  }, [key]);
  
  React.useEffect(() => {
    if (autoSaveRef.current && data) {
      autoSaveRef.current.save(data);
    }
  }, [data]);
  
  const manualSave = React.useCallback(() => {
    if (autoSaveRef.current && data) {
      autoSaveRef.current.save(data, true);
    }
  }, [data]);
  
  const getBackups = React.useCallback(() => {
    return autoSaveRef.current?.getBackups() || [];
  }, []);
  
  const restoreBackup = React.useCallback((timestamp: string) => {
    return autoSaveRef.current?.restoreBackup(timestamp);
  }, []);
  
  const clearAll = React.useCallback(() => {
    autoSaveRef.current?.clear();
  }, []);
  
  return {
    manualSave,
    getBackups,
    restoreBackup,
    clearAll
  };
};

// debounce helper（別ファイルに移動可能）
function debounceHelper<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Reactのインポート（必要な場合）
import * as React from 'react';