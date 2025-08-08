import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Bell, AtSign, MessageCircle, Zap, Check } from 'lucide-react';
import { markNotificationAsRead } from '@/lib/firebase/notifications';

export interface NotificationDisplay {
  id: number;
  type: 'mention' | 'chat' | 'system';
  user: string;
  message: string;
  time: string;
  unread: boolean;
  originalId?: string; // Firebase IDを保持
}

interface NotificationPanelProps {
  notifications: NotificationDisplay[];
  show: boolean;
  onClose: () => void;
  onNotificationRead?: (id: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch(type) {
    case 'mention': return <AtSign className="w-4 h-4 text-purple-500" />;
    case 'chat': return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'system': return <Zap className="w-4 h-4 text-green-500" />;
    default: return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

export default function NotificationPanel({ notifications, show, onClose, onNotificationRead }: NotificationPanelProps) {
  if (!show) return null;

  const handleNotificationClick = async (notification: NotificationDisplay) => {
    if (notification.unread && notification.originalId) {
      try {
        await markNotificationAsRead(notification.originalId);
        onNotificationRead?.(notification.originalId);
      } catch (error) {
        console.error('通知の既読化に失敗:', error);
      }
    }
  };

  return (
    <div className="absolute top-20 right-6 w-80 max-h-96 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-white/30 overflow-hidden z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-800">通知</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {notifications.filter(n => n.unread).length}件未読
          </span>
          <Button 
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto max-h-80 custom-scrollbar">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`p-3 rounded-lg border transition-all cursor-pointer group ${
              notification.unread 
                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-2">
              {getNotificationIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{notification.user}</p>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
              </div>
              {notification.unread && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-blue-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(notification);
                    }}
                  >
                    <Check className="w-3 h-3 text-blue-600" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}