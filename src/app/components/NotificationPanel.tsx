import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Bell, AtSign, MessageCircle, Zap } from 'lucide-react';

export interface NotificationDisplay {
  id: number;
  type: 'mention' | 'chat' | 'system';
  user: string;
  message: string;
  time: string;
  unread: boolean;
}

interface NotificationPanelProps {
  notifications: NotificationDisplay[];
  show: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: string) => {
  switch(type) {
    case 'mention': return <AtSign className="w-4 h-4 text-purple-500" />;
    case 'chat': return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'system': return <Zap className="w-4 h-4 text-green-500" />;
    default: return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

export default function NotificationPanel({ notifications, show, onClose }: NotificationPanelProps) {
  if (!show) return null;

  return (
    <div className="absolute top-20 right-6 w-80 max-h-96 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-white/30 overflow-hidden z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-800">通知</h3>
        <Button 
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 hover:bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto max-h-80 custom-scrollbar">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              notification.unread 
                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-start space-x-2">
              {getNotificationIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{notification.user}</p>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}