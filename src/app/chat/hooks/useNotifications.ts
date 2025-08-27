import { useEffect, useCallback, useRef, useState } from 'react';
import { ChatNotification } from '@/lib/firebase/chat';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface UseNotificationsOptions {
  enableDesktop?: boolean;
  enableSound?: boolean;
  soundUrl?: string;
}

interface UseNotificationsReturn {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: NotificationOptions) => void;
  playNotificationSound: () => void;
  isSupported: boolean;
  unreadCount: number;
  updateUnreadCount: (count: number) => void;
}

export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const {
    enableDesktop = true,
    enableSound = true,
    soundUrl = '/notification-sound.mp3', // 実際のサウンドファイルのパス
  } = options;

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied'
  );
  const [unreadCount, setUnreadCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // オーディオの初期化
  useEffect(() => {
    if (enableSound && typeof window !== 'undefined') {
      audioRef.current = new Audio(soundUrl);
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.5;
      
      // エラーハンドリング
      audioRef.current.onerror = (e) => {
        console.warn('Notification sound failed to load:', e);
      };
    }
  }, [enableSound, soundUrl]);

  // 権限要求
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setPermission('denied');
      return 'denied';
    }
  }, [isSupported]);

  // デスクトップ通知表示
  const showNotification = useCallback((notificationOptions: NotificationOptions) => {
    if (!enableDesktop || !isSupported || permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(notificationOptions.title, {
        body: notificationOptions.body,
        icon: notificationOptions.icon || '/icon-192x192.png',
        badge: notificationOptions.badge || '/icon-192x192.png',
        tag: notificationOptions.tag,
        requireInteraction: notificationOptions.requireInteraction || false,
        silent: notificationOptions.silent || false,
      });

      // 通知をクリックした時の処理
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 5秒後に自動で閉じる
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [enableDesktop, isSupported, permission]);

  // 通知音再生
  const playNotificationSound = useCallback(() => {
    if (!enableSound || !audioRef.current) {
      return;
    }

    try {
      // 前の音声を停止して最初から再生
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Failed to play notification sound:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [enableSound]);

  // 未読数更新
  const updateUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
    
    // ファビコンのバッジ更新（オプション）
    if (typeof window !== 'undefined' && count > 0) {
      document.title = count > 0 ? `(${count}) Unica Chat` : 'Unica Chat';
    }
  }, []);

  // 権限状態の監視
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  return {
    permission,
    requestPermission,
    showNotification,
    playNotificationSound,
    isSupported,
    unreadCount,
    updateUnreadCount,
  };
};

// 通知用のヘルパー関数
export const createChatNotification = (notification: ChatNotification): NotificationOptions => {
  return {
    title: notification.title,
    body: notification.message,
    tag: `chat-${notification.channelId}-${notification.messageId}`,
    requireInteraction: notification.type === 'mention',
  };
};

// メンション通知の作成
export const createMentionNotification = (
  fromUserName: string,
  channelName: string,
  message: string
): NotificationOptions => {
  return {
    title: `${fromUserName}があなたをメンションしました`,
    body: `#${channelName}: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}`,
    requireInteraction: true,
    tag: 'mention',
  };
};

// 新規メッセージ通知の作成
export const createMessageNotification = (
  fromUserName: string,
  channelName: string,
  message: string
): NotificationOptions => {
  return {
    title: `#${channelName}`,
    body: `${fromUserName}: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}`,
    tag: `channel-${channelName}`,
  };
};

// スレッド返信通知の作成
export const createThreadReplyNotification = (
  fromUserName: string,
  originalMessage: string
): NotificationOptions => {
  return {
    title: `${fromUserName}がスレッドに返信しました`,
    body: `返信先: ${originalMessage.slice(0, 50)}${originalMessage.length > 50 ? '...' : ''}`,
    tag: 'thread-reply',
  };
};