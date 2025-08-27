"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  MessageCircle, 
  AtSign, 
  Volume2, 
  VolumeX,
  Settings
} from "lucide-react";
import type { ChatNotification, ChatUser } from "@/lib/firebase/chat";
import { subscribeToNotifications, markNotificationAsRead } from "@/lib/firebase/chat";

interface NotificationSystemProps {
  users: ChatUser[];
  currentUserId: string;
}

interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  pending: boolean;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  users,
  currentUserId,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>({
    granted: false,
    denied: false,
    pending: false,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotificationTime, setLastNotificationTime] = useState<Date>(new Date());
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);

  // 通知権限の確認
  useEffect(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        pending: currentPermission === 'default',
      });
    }
  }, []);

  // Firebase通知を監視
  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = subscribeToNotifications(currentUserId, (newNotifications) => {
      setNotifications(newNotifications);
    });

    return unsubscribe;
  }, [currentUserId]);

  // 新しい通知があった場合の処理
  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    // 新しい通知があり、権限が許可されている場合
    if (unreadNotifications.length > 0 && permission.granted) {
      const latestNotification = unreadNotifications[0];
      
      // 最後の通知時刻より新しい場合のみ通知を表示
      const notificationTime = latestNotification.createdAt?.toDate?.() || new Date();
      if (notificationTime > lastNotificationTime) {
        showDesktopNotification(latestNotification);
        
        // 音声通知
        if (soundEnabled) {
          playNotificationSound();
        }
        
        setLastNotificationTime(notificationTime);
      }
    }
  }, [notifications, permission.granted, soundEnabled, lastNotificationTime]);

  // デスクトップ通知の表示
  const showDesktopNotification = (notification: ChatNotification) => {
    if (!('Notification' in window) || !permission.granted) return;

    const options: NotificationOptions = {
      body: notification.message.length > 100 
        ? notification.message.substring(0, 100) + '...'
        : notification.message,
      icon: '/favicon.ico', // アプリのアイコン
      badge: '/favicon.ico',
      tag: notification.id, // 同じIDの通知は置き換える
      requireInteraction: notification.type === 'mention', // メンションは手動で閉じる必要
      silent: !soundEnabled,
      data: {
        notificationId: notification.id,
        channelId: notification.channelId,
        messageId: notification.messageId,
      }
    };

    const desktopNotification = new Notification(
      getNotificationTitle(notification),
      options
    );

    // 通知クリック時の処理
    desktopNotification.onclick = () => {
      window.focus(); // ブラウザウィンドウにフォーカス
      handleMarkAsRead(notification.id);
      desktopNotification.close();
      
      // チャンネルに移動する処理（将来的に実装）
      // navigateToChannel(notification.channelId);
    };

    // 3秒後に自動的に閉じる（メンション以外）
    if (notification.type !== 'mention') {
      setTimeout(() => {
        desktopNotification.close();
      }, 3000);
    }
  };

  // 通知音の再生
  const playNotificationSound = () => {
    try {
      // Web Audio APIを使用した通知音生成
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('通知音の再生に失敗しました:', error);
    }
  };

  // 通知のタイトル生成
  const getNotificationTitle = (notification: ChatNotification): string => {
    switch (notification.type) {
      case 'mention':
        return `💬 ${notification.fromUserName}があなたをメンションしました`;
      case 'channel_message':
        return `📢 ${notification.title}`;
      case 'thread_reply':
        return `🧵 スレッドに返信がありました`;
      case 'reply':
        return `💬 返信がありました`;
      default:
        return 'Unica - 新しい通知';
    }
  };

  // 通知アイコンの取得
  const getNotificationIcon = (notification: ChatNotification) => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="w-4 h-4 text-blue-500" />;
      case 'thread_reply':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // 時間のフォーマット
  const formatTime = (timestamp: any): string => {
    const date = timestamp?.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  // 通知権限の要求
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザはデスクトップ通知をサポートしていません。');
      return;
    }

    setPermission(prev => ({ ...prev, pending: true }));
    
    try {
      const result = await Notification.requestPermission();
      setPermission({
        granted: result === 'granted',
        denied: result === 'denied',
        pending: false,
      });
    } catch (error) {
      setPermission(prev => ({ ...prev, pending: false }));
      console.error('通知権限の要求に失敗しました:', error);
    }
  };

  // 通知を既読にマーク
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('通知の既読マークに失敗:', error);
    }
  };

  // 全通知を既読にマーク
  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(unreadNotifications.map(n => markNotificationAsRead(n.id)));
    } catch (error) {
      console.error('全通知の既読マークに失敗:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 10); // 最新10件のみ表示

  return (
    <div className="relative">
      {/* 通知ベルボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* 通知パネル */}
      {isVisible && (
        <Card className="absolute top-full right-0 mt-2 w-96 max-h-96 overflow-hidden shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">通知</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 h-6 w-6"
                >
                  {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="p-1 h-6 w-6"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* 通知権限設定 */}
            {!permission.granted && (
              <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-yellow-800">
                    デスクトップ通知を有効にする
                  </div>
                  <Button
                    size="sm"
                    onClick={requestNotificationPermission}
                    disabled={permission.pending || permission.denied}
                    className="h-6 px-2 text-xs"
                  >
                    {permission.pending ? '要求中...' : '許可'}
                  </Button>
                </div>
              </div>
            )}

            {/* 全て既読ボタン */}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="w-full mt-2 h-6 text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                全て既読にする
              </Button>
            )}
          </div>

          <CardContent className="p-0 max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">新しい通知はありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.fromUserName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-800 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};