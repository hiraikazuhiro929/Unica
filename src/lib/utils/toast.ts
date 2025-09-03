// シンプルなトースト通知実装
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];
  private idCounter = 0;
  
  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }
  
  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // ユニークなIDを生成（時刻 + カウンター）
    const id = `${Date.now()}-${++this.idCounter}`;
    const toast: Toast = { id, message, type };
    
    this.toasts.push(toast);
    this.notify();
    
    // 3秒後に自動削除
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
      this.notify();
    }, 3000);
  }
  
  success(message: string) {
    this.show(message, 'success');
  }
  
  error(message: string) {
    this.show(message, 'error');
  }
  
  info(message: string) {
    this.show(message, 'info');
  }
}

// シングルトンインスタンス
export const toast = new ToastManager();