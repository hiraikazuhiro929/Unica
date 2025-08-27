"use client";
import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const handleLocalSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
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
          <div className="max-w-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">セキュリティ設定</h2>
              <p className="text-gray-600">アカウントのセキュリティを強化</p>
            </div>
            
            <div className="space-y-6">
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
                  変更を保存
                </Button>
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