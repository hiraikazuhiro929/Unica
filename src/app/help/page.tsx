"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HelpCircle,
  Search,
  BookOpen,
  Video,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Settings,
  User,
  Zap,
  ChevronRight,
  ExternalLink,
  Download,
  Clock,
  CheckCircle,
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  type: "video" | "document" | "tutorial";
  duration?: string;
  category: string;
}

const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs: FAQ[] = [
    {
      id: "1",
      question: "工程管理の進捗率はどのように更新しますか？",
      answer: "工程リストページで該当する工程をクリックし、詳細画面で進捗率を入力または調整バーで設定してください。変更は自動的に保存されます。",
      category: "工程管理",
    },
    {
      id: "2",
      question: "受注案件を工程に変換するにはどうすればよいですか？",
      answer: "受注案件ページで該当案件の「工程作成」ボタンをクリックしてください。必要な情報が自動的に工程管理システムに引き継がれます。",
      category: "受注管理",
    },
    {
      id: "3",
      question: "通知設定を変更したいのですが？",
      answer: "右上のユーザーメニューから「設定」→「通知」タブで、メール通知、プッシュ通知などの設定を変更できます。",
      category: "設定",
    },
    {
      id: "4",
      question: "ファイルをアップロードできません",
      answer: "ファイルサイズが10MB以下であることを確認してください。対応形式：PDF, Excel, Word, 画像ファイル。問題が続く場合は管理者にお問い合わせください。",
      category: "ファイル管理",
    },
    {
      id: "5",
      question: "カレンダーとGoogleカレンダーを同期できますか？",
      answer: "はい、外部連携設定でGoogleカレンダーとの同期を有効にできます。管理者権限が必要です。",
      category: "カレンダー",
    },
  ];

  const guides: GuideItem[] = [
    {
      id: "1",
      title: "システム概要と基本操作",
      description: "Unicaシステムの全体像と基本的な操作方法を学びます",
      type: "video",
      duration: "15分",
      category: "基本操作",
    },
    {
      id: "2",
      title: "受注管理から工程作成まで",
      description: "受注案件の登録から工程管理への連携までの流れを解説",
      type: "tutorial",
      duration: "20分",
      category: "工程管理",
    },
    {
      id: "3",
      title: "日報作成と工数管理",
      description: "効率的な日報作成と工数管理の方法",
      type: "document",
      category: "日報管理",
    },
    {
      id: "4",
      title: "チーム間コミュニケーション",
      description: "チャット機能と通知システムの活用方法",
      type: "video",
      duration: "12分",
      category: "コミュニケーション",
    },
    {
      id: "5",
      title: "レポート作成とデータ分析",
      description: "各種レポートの生成と分析の方法",
      type: "document",
      category: "レポート",
    },
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = guides.filter(guide =>
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: GuideItem["type"]) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4 text-red-500" />;
      case "document": return <FileText className="w-4 h-4 text-blue-500" />;
      case "tutorial": return <BookOpen className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="ml-16 h-screen overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <HelpCircle className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ヘルプセンター</h1>
                <p className="text-sm text-gray-600">
                  使い方ガイドとよくある質問
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="ヘルプを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80"
                />
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="faq" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="faq" className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4" />
                <span>よくある質問</span>
              </TabsTrigger>
              <TabsTrigger value="guides" className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>使い方ガイド</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>お問い合わせ</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>システム情報</span>
              </TabsTrigger>
            </TabsList>

            {/* よくある質問 */}
            <TabsContent value="faq" className="space-y-4">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-16">
                  <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">該当するFAQが見つかりません</p>
                  <p className="text-gray-400">検索条件を変更してください</p>
                </div>
              ) : (
                filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 mb-2">
                            {faq.question}
                          </CardTitle>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {faq.category}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-700">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 使い方ガイド */}
            <TabsContent value="guides" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuides.map((guide) => (
                  <Card key={guide.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(guide.type)}
                          <CardTitle className="text-lg text-gray-900">
                            {guide.title}
                          </CardTitle>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                      {guide.duration && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{guide.duration}</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-600 mb-3">{guide.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          {guide.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {guide.type === "video" ? "ビデオ" :
                           guide.type === "document" ? "ドキュメント" : "チュートリアル"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* お問い合わせ */}
            <TabsContent value="contact" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                      <span>チャットサポート</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      リアルタイムでサポートチームとチャットできます
                    </p>
                    <div className="text-sm text-gray-500 mb-4">
                      営業時間: 平日 9:00-18:00
                    </div>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                      チャットを開始
                    </button>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-green-600" />
                      <span>メールサポート</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      詳細な問い合わせはメールでお送りください
                    </p>
                    <div className="text-sm text-gray-500 mb-4">
                      返信時間: 24時間以内
                    </div>
                    <a 
                      href="mailto:support@unica.com" 
                      className="block w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-center"
                    >
                      メールを送信
                    </a>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-orange-600" />
                      <span>電話サポート</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      緊急時は電話でお問い合わせください
                    </p>
                    <div className="text-sm text-gray-500 mb-2">
                      営業時間: 平日 9:00-18:00
                    </div>
                    <div className="font-semibold text-lg text-gray-900 mb-4">
                      03-1234-5678
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Download className="w-5 h-5 text-purple-600" />
                      <span>リモートサポート</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      画面共有でより詳細なサポートを受けられます
                    </p>
                    <div className="text-sm text-gray-500 mb-4">
                      事前予約制
                    </div>
                    <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md">
                      予約を申し込む
                    </button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* システム情報 */}
            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>システム情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">バージョン:</span>
                      <span className="font-medium">v1.0.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">最終更新:</span>
                      <span className="font-medium">2025-01-05</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">サーバー状態:</span>
                      <span className="font-medium text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        正常
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">データベース:</span>
                      <span className="font-medium">Firebase</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>更新履歴</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">v1.0.0 (2025-01-05)</div>
                      <ul className="text-gray-600 ml-4 list-disc">
                        <li>通知管理システムの改善</li>
                        <li>ファイル管理機能の統合</li>
                        <li>パフォーマンス向上</li>
                      </ul>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">v0.9.5 (2024-12-20)</div>
                      <ul className="text-gray-600 ml-4 list-disc">
                        <li>工程管理機能の追加</li>
                        <li>カレンダー連携機能</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm md:col-span-2">
                  <CardHeader>
                    <CardTitle>ブラウザ要件</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">Chrome</div>
                        <div className="text-gray-600">90+</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Firefox</div>
                        <div className="text-gray-600">88+</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Safari</div>
                        <div className="text-gray-600">14+</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Edge</div>
                        <div className="text-gray-600">90+</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;