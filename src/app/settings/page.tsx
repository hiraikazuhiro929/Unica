"use client";
import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enhancedArchiveManager, type ArchiveSettings } from "@/lib/utils/enhancedArchiveManager";
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Clock,
  Save,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Download,
  Upload,
  HardDrive,
  Wifi,
  Archive,
  AlertTriangle,
  Trash2,
  Calendar,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  
  // 実際のSettingsContextから設定を取得
  const {
    darkMode,
    setDarkMode,
    notificationsEnabled,
    setNotificationsEnabled,
    notificationPermission,
    autoLogoutEnabled,
    setAutoLogoutEnabled,
    autoLogoutMinutes,
    setAutoLogoutMinutes,
    language,
    setLanguage,
  } = useSettings();
  
  // その他の設定（まだContextに含まれていないもの）
  const [localSettings, setLocalSettings] = useState({
    compactView: false,
    animations: true,
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
    emailNotifications: true,
    smsNotifications: false,
    soundEnabled: true,
    notificationFrequency: 'realtime',
    twoFactorAuth: false,
    loginAlerts: true,
    passwordExpiry: '90d',
    autoBackup: true,
    logCollection: true,
    performanceMode: 'balanced',
    cacheSize: '1GB',
    autoUpdates: true,
  });

  // アーカイブ設定
  const [archiveSettings, setArchiveSettings] = useState<ArchiveSettings>({
    globalRetentionDays: 180,
    warningDays: [30, 7, 1],
    requireExportBeforeDeletion: true,
    autoExportEnabled: false,
    exportFormat: 'excel',
    notificationSettings: {
      email: true,
      browser: true,
      showInDashboard: true
    }
  });

  const [archiveSettingsLoading, setArchiveSettingsLoading] = useState(false);

  const handleLocalSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // アーカイブ設定の初期読み込み
  React.useEffect(() => {
    const loadArchiveSettings = async () => {
      try {
        const settings = await enhancedArchiveManager.getArchiveSettings();
        if (settings) {
          setArchiveSettings(settings);
        }
      } catch (error) {
        console.error('アーカイブ設定読み込みエラー:', error);
      }
    };
    loadArchiveSettings();
  }, []);

  // アーカイブ設定の変更処理
  const handleArchiveSettingChange = (key: keyof ArchiveSettings, value: any) => {
    setArchiveSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleArchiveNotificationChange = (key: string, value: boolean) => {
    setArchiveSettings(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [key]: value
      }
    }));
  };

  // アーカイブ設定の保存
  const saveArchiveSettings = async () => {
    setArchiveSettingsLoading(true);
    try {
      const success = await enhancedArchiveManager.saveArchiveSettings(archiveSettings);
      if (success) {
        alert('✅ アーカイブ設定を保存しました');
      } else {
        alert('❌ アーカイブ設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('アーカイブ設定保存エラー:', error);
      alert('❌ アーカイブ設定の保存中にエラーが発生しました');
    } finally {
      setArchiveSettingsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 ml-0 md:ml-16 flex transition-colors duration-300">
      {/* 左サイドバー */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 transition-colors duration-300">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">システム設定</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">アプリケーションの設定を管理</p>
        </div>
        
        <nav className="space-y-2">
          <button
            onClick={() => setActiveSection('general')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'general'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-3" />
              一般設定
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('appearance')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'appearance'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Palette className="w-4 h-4 mr-3" />
              表示設定
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'notifications'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Bell className="w-4 h-4 mr-3" />
              通知設定
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('security')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'security'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-3" />
              セキュリティ
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('system')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'system'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Database className="w-4 h-4 mr-3" />
              システム
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('archive')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'archive'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Archive className="w-4 h-4 mr-3" />
              アーカイブ設定
            </div>
          </button>

          <button
            onClick={() => setActiveSection('advanced')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'advanced'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-700 dark:border-blue-400'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              <Monitor className="w-4 h-4 mr-3" />
              詳細設定
            </div>
          </button>
        </nav>
      </div>

      {/* 右メインコンテンツ */}
      <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        {/* 一般設定セクション */}
        {activeSection === 'general' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">一般設定</h2>
              <p className="text-gray-600 dark:text-slate-400">基本的なアプリケーション設定</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">言語</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">タイムゾーン</Label>
                <Select value={localSettings.timezone} onValueChange={(value) => handleLocalSettingChange('timezone', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">日付形式</Label>
                <Select value={localSettings.dateFormat} onValueChange={(value) => handleLocalSettingChange('dateFormat', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YYYY/MM/DD">2025/01/01</SelectItem>
                    <SelectItem value="MM/DD/YYYY">01/01/2025</SelectItem>
                    <SelectItem value="DD/MM/YYYY">01/01/2025</SelectItem>
                    <SelectItem value="YYYY-MM-DD">2025-01-01</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">時刻形式</Label>
                <Select value={localSettings.timeFormat} onValueChange={(value) => handleLocalSettingChange('timeFormat', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24時間 (15:30)</SelectItem>
                    <SelectItem value="12h">12時間 (3:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  変更を保存
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 表示設定セクション */}
        {activeSection === 'appearance' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">表示設定</h2>
              <p className="text-gray-600 dark:text-slate-400">アプリケーションの外観とテーマ設定</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">ダークモード</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">暗いテーマを使用</p>
                </div>
                <Switch 
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">コンパクトビュー</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">より狭い間隔で表示</p>
                </div>
                <Switch 
                  checked={localSettings.compactView}
                  onCheckedChange={(checked) => handleLocalSettingChange('compactView', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">アニメーション</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">画面遷移のアニメーション効果</p>
                </div>
                <Switch 
                  checked={localSettings.animations}
                  onCheckedChange={(checked) => handleLocalSettingChange('animations', checked)}
                />
              </div>

              <div className="pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  変更を保存
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 通知設定セクション */}
        {activeSection === 'notifications' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">通知設定</h2>
              <p className="text-gray-600 dark:text-slate-400">各種通知の設定を管理</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">メール通知</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">重要な更新をメールで受信</p>
                </div>
                <Switch 
                  checked={localSettings.emailNotifications}
                  onCheckedChange={(checked) => handleLocalSettingChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">ブラウザ通知</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">ブラウザプッシュ通知 {notificationPermission !== 'granted' && notificationPermission !== 'default' ? '(許可が必要)' : ''}</p>
                </div>
                <Switch 
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  disabled={notificationPermission === 'denied'}
                />
              </div>

              {notificationPermission === 'denied' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    ブラウザ通知が拒否されています。ブラウザの設定から通知を許可してください。
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">通知音</Label>
                  <p className="text-sm text-gray-500">通知時の音声</p>
                </div>
                <Switch 
                  checked={localSettings.soundEnabled}
                  onCheckedChange={(checked) => handleLocalSettingChange('soundEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">通知頻度</Label>
                <Select value={localSettings.notificationFrequency} onValueChange={(value) => handleLocalSettingChange('notificationFrequency', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">リアルタイム</SelectItem>
                    <SelectItem value="hourly">1時間ごと</SelectItem>
                    <SelectItem value="daily">1日1回</SelectItem>
                    <SelectItem value="weekly">1週間1回</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  変更を保存
                </Button>
              </div>
            </div>
          </div>
        )}


        {/* セキュリティセクション */}
        {activeSection === 'security' && (
          <div className="max-w-4xl">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">セキュリティ・権限設定</h2>
              <p className="text-gray-600 dark:text-slate-400">アカウントのセキュリティと権限を管理</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* セキュリティ設定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">セキュリティ設定</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">二段階認証</Label>
                  <p className="text-sm text-gray-500">追加のセキュリティ層を追加</p>
                </div>
                <Switch 
                  checked={localSettings.twoFactorAuth}
                  onCheckedChange={(checked) => handleLocalSettingChange('twoFactorAuth', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">ログインアラート</Label>
                  <p className="text-sm text-gray-500">新しいデバイスからのログインを通知</p>
                </div>
                <Switch 
                  checked={localSettings.loginAlerts}
                  onCheckedChange={(checked) => handleLocalSettingChange('loginAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">自動ログアウト</Label>
                  <p className="text-sm text-gray-500">一定時間後に自動ログアウト</p>
                </div>
                <Switch 
                  checked={autoLogoutEnabled}
                  onCheckedChange={setAutoLogoutEnabled}
                />
              </div>

              {autoLogoutEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">自動ログアウト時間（分）</Label>
                  <Select 
                    value={autoLogoutMinutes.toString()} 
                    onValueChange={(value) => setAutoLogoutMinutes(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15分</SelectItem>
                      <SelectItem value="30">30分</SelectItem>
                      <SelectItem value="60">1時間</SelectItem>
                      <SelectItem value="120">2時間</SelectItem>
                      <SelectItem value="240">4時間</SelectItem>
                      <SelectItem value="480">8時間</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">パスワード有効期限</Label>
                <Select value={localSettings.passwordExpiry} onValueChange={(value) => handleLocalSettingChange('passwordExpiry', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">30日</SelectItem>
                    <SelectItem value="90d">90日</SelectItem>
                    <SelectItem value="180d">180日</SelectItem>
                    <SelectItem value="365d">1年</SelectItem>
                    <SelectItem value="never">無制限</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                <div className="pt-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                    <Save className="w-4 h-4 mr-2" />
                    セキュリティ設定を保存
                  </Button>
                </div>
              </div>

              {/* 権限管理設定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">権限管理</h3>
                
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900 dark:text-white">現在の権限</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">日報確認権限</span>
                      <span className="text-green-600 font-medium">有効</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">日報返信権限</span>
                      <span className="text-green-600 font-medium">有効</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">全日報閲覧権限</span>
                      <span className="text-green-600 font-medium">有効</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">ユーザー管理権限</span>
                      <span className="text-green-600 font-medium">有効</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">権限の変更について</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        権限の変更は管理者のみが行えます。権限の変更が必要な場合は、管理者にご連絡ください。
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                        管理者の方は、メンバー管理画面から各ユーザーの権限を設定できます。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => window.open('/company/members', '_blank')}
                    className="w-full"
                  >
                    <User className="w-4 h-4 mr-2" />
                    メンバー管理画面を開く
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* システムセクション */}
        {activeSection === 'system' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">システム設定</h2>
              <p className="text-gray-600">システムの動作とパフォーマンス設定</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">自動バックアップ</Label>
                  <p className="text-sm text-gray-500">データの定期的なバックアップ</p>
                </div>
                <Switch 
                  checked={localSettings.autoBackup}
                  onCheckedChange={(checked) => handleLocalSettingChange('autoBackup', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">ログ収集</Label>
                  <p className="text-sm text-gray-500">システムログの自動収集</p>
                </div>
                <Switch 
                  checked={localSettings.logCollection}
                  onCheckedChange={(checked) => handleLocalSettingChange('logCollection', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">自動更新</Label>
                  <p className="text-sm text-gray-500">アプリケーションの自動更新</p>
                </div>
                <Switch 
                  checked={localSettings.autoUpdates}
                  onCheckedChange={(checked) => handleLocalSettingChange('autoUpdates', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">パフォーマンスモード</Label>
                <Select value={localSettings.performanceMode} onValueChange={(value) => handleLocalSettingChange('performanceMode', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power_save">省電力</SelectItem>
                    <SelectItem value="balanced">バランス</SelectItem>
                    <SelectItem value="performance">高性能</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">キャッシュサイズ</Label>
                <Select value={localSettings.cacheSize} onValueChange={(value) => handleLocalSettingChange('cacheSize', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="256MB">256MB</SelectItem>
                    <SelectItem value="512MB">512MB</SelectItem>
                    <SelectItem value="1GB">1GB</SelectItem>
                    <SelectItem value="2GB">2GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 space-y-3">
                <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Save className="w-4 h-4 mr-2" />
                  変更を保存
                </Button>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    データベースバックアップ
                  </Button>
                  <Button variant="outline" className="w-full">
                    <HardDrive className="w-4 h-4 mr-2" />
                    キャッシュクリア
                  </Button>
                  <Button variant="outline" className="w-full text-red-600 border-red-300 hover:bg-red-50">
                    <Download className="w-4 h-4 mr-2" />
                    システムログダウンロード
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* アーカイブ設定セクション */}
        {activeSection === 'archive' && (
          <div className="max-w-4xl">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">アーカイブ設定</h2>
              <p className="text-gray-600 dark:text-slate-400">データ保持期間とエクスポートに関する設定</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* データ保持設定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">データ保持設定</h3>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    グローバル保持期間（日数）
                  </Label>
                  <Select
                    value={archiveSettings.globalRetentionDays.toString()}
                    onValueChange={(value) => handleArchiveSettingChange('globalRetentionDays', parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30日</SelectItem>
                      <SelectItem value="60">60日</SelectItem>
                      <SelectItem value="90">90日</SelectItem>
                      <SelectItem value="180">180日</SelectItem>
                      <SelectItem value="365">365日</SelectItem>
                      <SelectItem value="730">2年</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    完了済みデータの自動削除までの期間を設定します
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    警告タイミング
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 7, 1].map(days => (
                      <div key={days} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`warning-${days}`}
                          checked={archiveSettings.warningDays.includes(days)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleArchiveSettingChange('warningDays', [...archiveSettings.warningDays, days]);
                            } else {
                              handleArchiveSettingChange('warningDays', archiveSettings.warningDays.filter(d => d !== days));
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`warning-${days}`} className="text-sm">
                          {days}日前
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    削除前に警告を表示するタイミング
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      削除前の必須エクスポート
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      データ削除前にエクスポートを必須とする
                    </p>
                  </div>
                  <Switch
                    checked={archiveSettings.requireExportBeforeDeletion}
                    onCheckedChange={(checked) => handleArchiveSettingChange('requireExportBeforeDeletion', checked)}
                  />
                </div>
              </div>

              {/* エクスポート設定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">エクスポート設定</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      自動エクスポート
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      削除対象データを自動的にエクスポート
                    </p>
                  </div>
                  <Switch
                    checked={archiveSettings.autoExportEnabled}
                    onCheckedChange={(checked) => handleArchiveSettingChange('autoExportEnabled', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    エクスポート形式
                  </Label>
                  <Select
                    value={archiveSettings.exportFormat}
                    onValueChange={(value: 'csv' | 'excel' | 'zip') => handleArchiveSettingChange('exportFormat', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel形式 (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV形式 (.csv)</SelectItem>
                      <SelectItem value="zip">ZIP圧縮 (複数ファイル)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">通知設定</h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        メール通知
                      </Label>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        アーカイブ警告をメールで受信
                      </p>
                    </div>
                    <Switch
                      checked={archiveSettings.notificationSettings.email}
                      onCheckedChange={(checked) => handleArchiveNotificationChange('email', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        ブラウザ通知
                      </Label>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        ブラウザプッシュ通知で警告を表示
                      </p>
                    </div>
                    <Switch
                      checked={archiveSettings.notificationSettings.browser}
                      onCheckedChange={(checked) => handleArchiveNotificationChange('browser', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        ダッシュボード表示
                      </Label>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        ダッシュボードに警告を表示
                      </p>
                    </div>
                    <Switch
                      checked={archiveSettings.notificationSettings.showInDashboard}
                      onCheckedChange={(checked) => handleArchiveNotificationChange('showInDashboard', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 危険な操作 */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                      アーカイブ管理について
                    </h4>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                      <p>
                        • 削除されたデータは復旧できません。重要なデータは事前にエクスポートしてください。
                      </p>
                      <p>
                        • 保持期間の短縮は既存の警告スケジュールに影響する場合があります。
                      </p>
                      <p>
                        • 自動エクスポートを有効にすると、システムリソースを消費する場合があります。
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => window.open('/archives', '_blank')}
                        variant="outline"
                        size="sm"
                        className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        アーカイブ状況を確認
                      </Button>
                      <Button
                        onClick={() => window.open('/archive-management', '_blank')}
                        variant="outline"
                        size="sm"
                        className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        詳細管理画面
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <Button
                onClick={saveArchiveSettings}
                disabled={archiveSettingsLoading}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {archiveSettingsLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    アーカイブ設定を保存
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 詳細設定セクション */}
        {activeSection === 'advanced' && (
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">詳細設定</h2>
              <p className="text-gray-600">高度なシステム設定（上級者向け）</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">システム情報</h3>
                <div className="space-y-3 text-sm bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">バージョン:</span>
                    <span className="font-medium text-gray-900 dark:text-white">v1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">最終更新:</span>
                    <span className="font-medium text-gray-900 dark:text-white">2025-01-22</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">データベース:</span>
                    <span className="font-medium text-gray-900 dark:text-white">Firebase</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">サーバー状態:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">正常</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">接続状態:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">接続済み</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">開発者オプション</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full">
                    <Monitor className="w-4 h-4 mr-2" />
                    パフォーマンス診断
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Database className="w-4 h-4 mr-2" />
                    データベース最適化
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Wifi className="w-4 h-4 mr-2" />
                    接続テスト
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">危険な操作</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Database className="w-4 h-4 mr-2" />
                    全データリセット
                  </Button>
                  <Button variant="outline" className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Settings className="w-4 h-4 mr-2" />
                    設定を初期化
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}