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
      case "connected": return "text-green-600 bg-green-50";
      case "disconnected": return "text-gray-600 bg-gray-50";
      case "error": return "text-red-600 bg-red-50";
    }
  };

  const getStatusIcon = (status: Integration["status"]) => {
    switch (status) {
      case "connected": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "disconnected": return <Settings className="w-4 h-4 text-gray-600" />;
      case "error": return <AlertTriangle className="w-4 h-4 text-red-600" />;
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
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Zap className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">外部連携設定</h1>
                <p className="text-sm text-gray-600">
                  外部システムとの連携を管理します
                </p>
              </div>
            </div>
            
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6">
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
                  {getCategoryIcon(category as Integration["category"])}
                  <h2 className="text-xl font-semibold text-gray-900">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((integration) => {
                    const Icon = integration.icon;
                    return (
                      <Card key={integration.id} className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <Icon className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg text-gray-900">
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
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-600 mb-4">
                            {integration.description}
                          </p>
                          
                          {integration.lastSync && (
                            <div className="text-xs text-gray-500 mb-3">
                              最終同期: {integration.lastSync.toLocaleString("ja-JP")}
                            </div>
                          )}
                          
                          {integration.status === "connected" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">自動同期</span>
                                <Switch 
                                  checked={integration.settings?.autoSync || false}
                                  onCheckedChange={() => {}}
                                />
                              </div>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                              >
                                今すぐ同期
                              </Button>
                            </div>
                          )}
                          
                          {integration.status === "disconnected" && (
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                            >
                              接続設定
                            </Button>
                          )}
                          
                          {integration.status === "error" && (
                            <div className="space-y-2">
                              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                接続エラーが発生しています
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-red-600 border-red-300 hover:bg-red-50"
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
            <div className="border-t border-gray-200 pt-8">
              <div className="flex items-center space-x-2 mb-6">
                <Key className="w-5 h-5" />
                <h2 className="text-xl font-semibold text-gray-900">API設定</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">APIキー管理</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        マスターAPIキー
                      </label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="password" 
                          value="••••••••••••••••"
                          readOnly
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm">
                          更新
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhookエンドポイント
                      </label>
                      <Input 
                        value="https://your-domain.com/api/webhook"
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">セキュリティ設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">IP制限を有効化</span>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">ログ記録を有効化</span>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">レート制限</span>
                      <Switch defaultChecked />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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