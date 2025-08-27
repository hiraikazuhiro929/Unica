"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Calendar,
  Mail,
  Database,
  Cloud,
  Settings,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Key,
  Globe,
  Smartphone,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: "connected" | "disconnected" | "error";
  category: "calendar" | "communication" | "erp" | "cloud" | "api" | "mobile";
  lastSync?: Date;
  settings?: Record<string, any>;
}

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "google-calendar",
      name: "Google カレンダー",
      description: "工程スケジュールとGoogleカレンダーを同期",
      icon: Calendar,
      status: "connected",
      category: "calendar",
      lastSync: new Date(Date.now() - 300000),
      settings: {
        calendarId: "manufacturing@company.com",
        syncDirection: "bidirectional",
        autoSync: true,
      },
    },
    {
      id: "slack",
      name: "Slack",
      description: "通知とアラートをSlackチャンネルに送信",
      icon: Mail,
      status: "connected",
      category: "communication",
      lastSync: new Date(Date.now() - 60000),
      settings: {
        webhook: "https://hooks.slack.com/services/...",
        channels: ["#manufacturing", "#alerts"],
      },
    },
    {
      id: "erp-system",
      name: "基幹システム",
      description: "既存ERPシステムとの受注データ連携",
      icon: Database,
      status: "error",
      category: "erp",
      settings: {
        endpoint: "https://erp.company.com/api",
        authMethod: "oauth2",
      },
    },
    {
      id: "cloud-storage",
      name: "クラウドストレージ",
      description: "ファイルをクラウドストレージに自動バックアップ",
      icon: Cloud,
      status: "disconnected",
      category: "cloud",
      settings: {
        provider: "aws-s3",
        bucket: "manufacturing-backup",
      },
    },
    {
      id: "mobile-app",
      name: "モバイルアプリ",
      description: "スマートフォンアプリとの連携設定",
      icon: Smartphone,
      status: "connected",
      category: "mobile",
      lastSync: new Date(Date.now() - 1800000),
    },
  ]);

  const getStatusColor = (status: Integration["status"]) => {
    switch (status) {
      case "connected": return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
      case "disconnected": return "text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/50";
      case "error": return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
    }
  };

  const getStatusIcon = (status: Integration["status"]) => {
    switch (status) {
      case "connected": return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "disconnected": return <Settings className="w-4 h-4 text-gray-600 dark:text-slate-400" />;
      case "error": return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    }
  };

  const getCategoryIcon = (category: Integration["category"]) => {
    switch (category) {
      case "calendar": return <Calendar className="w-5 h-5" />;
      case "communication": return <Mail className="w-5 h-5" />;
      case "erp": return <Database className="w-5 h-5" />;
      case "cloud": return <Cloud className="w-5 h-5" />;
      case "api": return <Globe className="w-5 h-5" />;
      case "mobile": return <Smartphone className="w-5 h-5" />;
    }
  };

  const categorizedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) acc[integration.category] = [];
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  const categoryLabels = {
    calendar: "カレンダー連携",
    communication: "コミュニケーション",
    erp: "基幹システム",
    cloud: "クラウドサービス",
    api: "API連携",
    mobile: "モバイル",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">外部連携設定</h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  外部システムとの連携を管理します
                </p>
              </div>
            </div>
            
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium px-6">
              <Plus className="w-4 h-4 mr-2" />
              新規連携追加
            </Button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-8">
            {Object.entries(categorizedIntegrations).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600 dark:text-blue-400">
                    {getCategoryIcon(category as Integration["category"])}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((integration) => {
                    const Icon = integration.icon;
                    return (
                      <Card key={integration.id} className="border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <CardTitle className="text-lg text-gray-900 dark:text-white">
                                  {integration.name}
                                </CardTitle>
                                <div className="flex items-center space-x-2 mt-1">
                                  {getStatusIcon(integration.status)}
                                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(integration.status)}`}>
                                    {integration.status === "connected" ? "接続済み" :
                                     integration.status === "disconnected" ? "未接続" : "エラー"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                            {integration.description}
                          </p>
                          
                          {integration.lastSync && (
                            <div className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                              最終同期: {integration.lastSync.toLocaleString("ja-JP")}
                            </div>
                          )}
                          
                          {integration.status === "connected" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-slate-300">自動同期</span>
                                <Switch 
                                  checked={integration.settings?.autoSync || false}
                                  onCheckedChange={() => {}}
                                />
                              </div>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                              >
                                今すぐ同期
                              </Button>
                            </div>
                          )}
                          
                          {integration.status === "disconnected" && (
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                              size="sm"
                            >
                              接続設定
                            </Button>
                          )}
                          
                          {integration.status === "error" && (
                            <div className="space-y-2">
                              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                接続エラーが発生しています
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                エラー詳細
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* API設定セクション */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
              <div className="flex items-center space-x-2 mb-6">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API設定</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">APIキー管理</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        マスターAPIキー
                      </label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="password" 
                          value="••••••••••••••••"
                          readOnly
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                          更新
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Webhookエンドポイント
                      </label>
                      <Input 
                        value="https://your-domain.com/api/webhook"
                        readOnly
                        className="bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">セキュリティ設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-slate-300">IP制限を有効化</span>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-slate-300">ログ記録を有効化</span>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-slate-300">レート制限</span>
                      <Switch defaultChecked />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        許可IPアドレス
                      </label>
                      <Input 
                        placeholder="192.168.1.0/24"
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;