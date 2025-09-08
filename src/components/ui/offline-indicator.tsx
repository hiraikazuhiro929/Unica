"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useOfflineStatus, offlineManager } from '@/lib/utils/offlineManager';

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showDetails?: boolean;
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'top',
  showDetails = false,
  className = ''
}) => {
  const status = useOfflineStatus();
  const [syncing, setSyncing] = React.useState(false);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await offlineManager.forceSync();
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCritical = async () => {
    setSyncing(true);
    try {
      await offlineManager.syncCriticalData();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (status.syncInProgress || syncing) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (!status.isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }
    
    if (status.pendingSyncCount > 0) {
      return <CloudOff className="w-4 h-4" />;
    }
    
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (!status.isOnline) return 'destructive';
    if (status.pendingSyncCount > 0) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (status.syncInProgress || syncing) return '同期中...';
    if (!status.isOnline) return 'オフライン';
    if (status.pendingSyncCount > 0) return `${status.pendingSyncCount}件の未同期データ`;
    return 'オンライン';
  };

  const formatLastOnline = (timestamp: string) => {
    if (!timestamp) return '不明';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '今';
    if (minutes < 60) return `${minutes}分前`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  // オンライン状態で同期データがない場合は表示しない
  if (status.isOnline && status.pendingSyncCount === 0 && !showDetails) {
    return null;
  }

  const positionClass = position === 'top' 
    ? 'top-4' 
    : 'bottom-4';

  return (
    <div className={`fixed right-4 ${positionClass} z-50 max-w-md ${className}`}>
      <Alert variant={getStatusColor()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="font-medium">
              {getStatusText()}
            </span>
          </div>
          
          {status.pendingSyncCount > 0 && (
            <Badge variant={getStatusColor()} className="ml-2">
              {status.pendingSyncCount}
            </Badge>
          )}
        </div>

        {showDetails && (
          <AlertDescription className="mt-2 space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {!status.isOnline ? (
                <>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>最終接続: {formatLastOnline(status.lastOnlineAt)}</span>
                  </div>
                  <div className="mt-1">
                    製造データはローカルに保存され、接続回復時に自動同期されます
                  </div>
                </>
              ) : (
                <>
                  {status.pendingSyncCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>未同期のデータがあります</span>
                    </div>
                  )}
                  {status.syncInProgress && (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>データを同期しています...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {status.isOnline && status.pendingSyncCount > 0 && (
              <div className="flex space-x-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncNow}
                  disabled={syncing || status.syncInProgress}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      同期中
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 mr-1" />
                      今すぐ同期
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleSyncCritical}
                  disabled={syncing || status.syncInProgress}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      緊急同期中
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      緊急データのみ
                    </>
                  )}
                </Button>
              </div>
            )}
          </AlertDescription>
        )}
      </Alert>
    </div>
  );
};

// コンパクト版 - ナビゲーションバー等で使用
export const OfflineStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const status = useOfflineStatus();

  if (status.isOnline && status.pendingSyncCount === 0) {
    return (
      <Badge variant="success" className={`flex items-center space-x-1 ${className}`}>
        <Wifi className="w-3 h-3" />
        <span>オンライン</span>
      </Badge>
    );
  }

  if (!status.isOnline) {
    return (
      <Badge variant="destructive" className={`flex items-center space-x-1 ${className}`}>
        <WifiOff className="w-3 h-3" />
        <span>オフライン</span>
      </Badge>
    );
  }

  if (status.pendingSyncCount > 0) {
    return (
      <Badge variant="warning" className={`flex items-center space-x-1 ${className}`}>
        <CloudOff className="w-3 h-3" />
        <span>{status.pendingSyncCount}件未同期</span>
      </Badge>
    );
  }

  return null;
};

// システム全体での使用を想定したプロバイダー
export const OfflineStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useOfflineStatus();

  React.useEffect(() => {
    // ページタイトルにオフライン状態を反映（製造現場での視認性向上）
    const originalTitle = document.title;
    
    if (!status.isOnline) {
      document.title = `[オフライン] ${originalTitle}`;
    } else if (status.pendingSyncCount > 0) {
      document.title = `[${status.pendingSyncCount}件未同期] ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [status.isOnline, status.pendingSyncCount]);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
};

export default OfflineIndicator;