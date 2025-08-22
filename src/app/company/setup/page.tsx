"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  ArrowRight, 
  Plus,
  Hash,
  Mail,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { 
  createCompany, 
  joinCompanyWithInvite,
  getUserCompanies,
} from '@/lib/firebase/company';

export default function CompanySetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 企業作成フォーム
  const [companyData, setCompanyData] = useState({
    name: '',
    nameKana: '',
    industry: '',
    description: '',
  });
  
  // 参加フォーム
  const [inviteCode, setInviteCode] = useState('');

  // 既に所属企業がある場合はリダイレクト
  useEffect(() => {
    checkExistingCompanies();
  }, [user]);

  const checkExistingCompanies = async () => {
    if (!user) return;
    
    try {
      const companies = await getUserCompanies(user.uid);
      if (companies.length > 0) {
        // 既に所属企業がある場合はダッシュボードへ
        router.push('/');
      }
    } catch (err) {
      console.error('Error checking companies:', err);
    }
  };

  // 企業を作成
  const handleCreateCompany = async () => {
    if (!user) return;
    
    if (!companyData.name.trim()) {
      setError('企業名を入力してください');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const company = await createCompany(user.uid, companyData);
      
      setSuccess('企業を作成しました！');
      
      // 少し待ってからリダイレクト
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating company:', err);
      setError('企業の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 招待コードで参加
  const handleJoinCompany = async () => {
    if (!user) return;
    
    if (!inviteCode.trim()) {
      setError('招待コードを入力してください');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await joinCompanyWithInvite(
        inviteCode.toUpperCase(),
        user.uid,
        {
          name: user.name || '',
          email: user.email || '',
        }
      );
      
      if (result.success) {
        setSuccess('企業に参加しました！');
        
        // 少し待ってからリダイレクト
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(result.error || '参加に失敗しました');
      }
      
    } catch (err: any) {
      console.error('Error joining company:', err);
      setError('参加処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            組織を設定しましょう
          </h1>
          <p className="text-gray-600">
            新しい組織を作成するか、既存の組織に参加してください
          </p>
        </div>

        {mode === 'choice' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 新規作成 */}
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500"
                  onClick={() => setMode('create')}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  新しい組織を作成
                </h2>
                <p className="text-gray-600">
                  あなたが管理者となって新しい組織を立ち上げます
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Building2 className="w-4 h-4 mr-2" />
                  組織を作成
                </Button>
              </div>
            </Card>

            {/* 既存に参加 */}
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500"
                  onClick={() => setMode('join')}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  既存の組織に参加
                </h2>
                <p className="text-gray-600">
                  招待コードを使用して既存の組織に参加します
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Hash className="w-4 h-4 mr-2" />
                  招待コードで参加
                </Button>
              </div>
            </Card>
          </div>
        )}

        {mode === 'create' && (
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => setMode('choice')}
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                ← 戻る
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              新しい企業を作成
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">企業名 *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="株式会社サンプル"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="nameKana">企業名（カナ）</Label>
                <Input
                  id="nameKana"
                  type="text"
                  placeholder="カブシキガイシャサンプル"
                  value={companyData.nameKana}
                  onChange={(e) => setCompanyData({...companyData, nameKana: e.target.value})}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="industry">業種</Label>
                <Input
                  id="industry"
                  type="text"
                  placeholder="製造業"
                  value={companyData.industry}
                  onChange={(e) => setCompanyData({...companyData, industry: e.target.value})}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="description">説明</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="企業の説明を入力..."
                  value={companyData.description}
                  onChange={(e) => setCompanyData({...companyData, description: e.target.value})}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  {success}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setMode('choice')}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleCreateCompany}
                  disabled={loading || !companyData.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      作成中...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4 mr-2" />
                      企業を作成
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {mode === 'join' && (
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => setMode('choice')}
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                ← 戻る
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              招待コードで参加
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="code">招待コード</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="ABCD1234"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="font-mono text-lg tracking-wider"
                  maxLength={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  企業の管理者から提供された8文字の招待コードを入力してください
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  {success}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setMode('choice')}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleJoinCompany}
                  disabled={loading || inviteCode.length !== 8}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      参加中...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      企業に参加
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}