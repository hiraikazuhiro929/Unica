"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';

interface SettingsContextType {
  // テーマ設定
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  
  // 通知設定
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  notificationPermission: NotificationPermission;
  
  // セッション設定
  autoLogoutEnabled: boolean;
  setAutoLogoutEnabled: (enabled: boolean) => void;
  autoLogoutMinutes: number;
  setAutoLogoutMinutes: (minutes: number) => void;
  registerLogoutCallback: (callback: () => void) => void;
  
  // 言語設定
  language: string;
  setLanguage: (lang: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  
  // テーマ設定
  const [darkMode, setDarkModeState] = useState(true);
  
  // 通知設定
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // セッション設定
  const [autoLogoutEnabled, setAutoLogoutEnabledState] = useState(true);
  const [autoLogoutMinutes, setAutoLogoutMinutesState] = useState(60);
  
  // 言語設定
  const [language, setLanguageState] = useState('ja');
  
  // 自動ログアウト用の状態とタイマー
  const autoLogoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const logoutCallbackRef = useRef<(() => void) | null>(null);

  // 初期化: ローカルストレージから設定を読み込み
  useEffect(() => {
    // ダークモード
    const savedDarkMode = localStorage.getItem('unica-dark-mode');
    if (savedDarkMode) {
      setDarkModeState(JSON.parse(savedDarkMode));
    }
    
    // 通知設定
    const savedNotifications = localStorage.getItem('unica-notifications');
    if (savedNotifications) {
      setNotificationsEnabledState(JSON.parse(savedNotifications));
    }
    
    // セッション設定
    const savedAutoLogout = localStorage.getItem('unica-auto-logout');
    if (savedAutoLogout) {
      setAutoLogoutEnabledState(JSON.parse(savedAutoLogout));
    }
    
    const savedAutoLogoutMinutes = localStorage.getItem('unica-auto-logout-minutes');
    if (savedAutoLogoutMinutes) {
      setAutoLogoutMinutesState(parseInt(savedAutoLogoutMinutes));
    }
    
    // 言語設定
    const savedLanguage = localStorage.getItem('unica-language');
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
    
    // 通知許可状態を確認
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // ダークモード適用
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 設定変更ハンドラー
  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);
    localStorage.setItem('unica-dark-mode', JSON.stringify(enabled));
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setNotificationsEnabledState(enabled);
        localStorage.setItem('unica-notifications', JSON.stringify(enabled));
      }
    } else {
      setNotificationsEnabledState(enabled);
      localStorage.setItem('unica-notifications', JSON.stringify(enabled));
    }
  };

  const setAutoLogoutEnabled = (enabled: boolean) => {
    setAutoLogoutEnabledState(enabled);
    localStorage.setItem('unica-auto-logout', JSON.stringify(enabled));
  };

  const setAutoLogoutMinutes = (minutes: number) => {
    setAutoLogoutMinutesState(minutes);
    localStorage.setItem('unica-auto-logout-minutes', minutes.toString());
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('unica-language', lang);
    // HTMLのlang属性も更新
    document.documentElement.lang = lang;
  };

  // 自動ログアウトのリセット関数
  const resetAutoLogoutTimer = () => {
    if (!autoLogoutEnabled) return;
    
    lastActivityRef.current = Date.now();
    
    // 既存のタイマーをクリア
    if (autoLogoutTimerRef.current) {
      clearTimeout(autoLogoutTimerRef.current);
    }
    
    // 新しいタイマーを設定
    autoLogoutTimerRef.current = setTimeout(() => {
      if (logoutCallbackRef.current) {
        logoutCallbackRef.current();
      }
    }, autoLogoutMinutes * 60 * 1000); // 分を秒に変換
  };

  // ユーザー活動の検知
  const handleUserActivity = () => {
    if (autoLogoutEnabled) {
      resetAutoLogoutTimer();
    }
  };

  // 自動ログアウト機能の初期化
  useEffect(() => {
    if (!autoLogoutEnabled) {
      // 自動ログアウトが無効の場合、タイマーをクリア
      if (autoLogoutTimerRef.current) {
        clearTimeout(autoLogoutTimerRef.current);
        autoLogoutTimerRef.current = null;
      }
      return;
    }

    // イベントリスナーを追加（ユーザーの活動を監視）
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // 初期タイマーを設定
    resetAutoLogoutTimer();

    // クリーンアップ関数
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      if (autoLogoutTimerRef.current) {
        clearTimeout(autoLogoutTimerRef.current);
      }
    };
  }, [autoLogoutEnabled, autoLogoutMinutes]);

  // 自動ログアウト設定変更時にタイマーをリセット
  useEffect(() => {
    if (autoLogoutEnabled) {
      resetAutoLogoutTimer();
    }
  }, [autoLogoutMinutes]);

  // ログアウトコールバックの登録関数
  const registerLogoutCallback = (callback: () => void) => {
    logoutCallbackRef.current = callback;
  };

  const value: SettingsContextType = {
    darkMode,
    setDarkMode,
    notificationsEnabled,
    setNotificationsEnabled,
    notificationPermission,
    autoLogoutEnabled,
    setAutoLogoutEnabled,
    autoLogoutMinutes,
    setAutoLogoutMinutes,
    registerLogoutCallback,
    language,
    setLanguage,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};