"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight,
} from 'lucide-react';
import { createCompany, joinCompanyWithInvite } from '@/lib/firebase/company';
import { 
  PurposeStep,
  CompanyStep,
  JoinStep,
  SuccessStep 
} from './components/OnboardingSteps';

interface StepInfo {
  id: string;
  title: string;
  subtitle: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshCompanyData } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    purpose: '',
    companyName: '',
    industry: '',
    teamSize: '',
    inviteCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期チェック: 既に企業に所属している場合はダッシュボードへ
  useEffect(() => {
    const checkExistingMembership = async () => {
      if (!user) return;
      
      try {
        const { getUserCompanies } = await import('@/lib/firebase/company');
        const existingCompanies = await getUserCompanies(user.uid);
        
        if (existingCompanies.length > 0) {
          console.log('🔄 User already has companies, redirecting to dashboard...');
          await refreshCompanyData();
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking existing membership:', err);
      }
    };
    
    checkExistingMembership();
  }, [user, router, refreshCompanyData]);

  // フォームデータ更新ハンドラーを最適化
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // ステップ情報を動的に生成（メタデータのみ）
  const getStepInfo = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return { id: 'purpose', title: 'ようこそ', subtitle: '使用目的を選択' };
      case 1:
        return {
          id: formData.purpose === 'create' ? 'company' : 'join',
          title: formData.purpose === 'create' ? '組織作成' : 'チーム参加',
          subtitle: formData.purpose === 'create' ? '組織情報を入力' : '招待コードを入力',
        };
      case 2:
        return { id: 'success', title: '完了', subtitle: 'セットアップ完了' };
      default:
        return { id: 'purpose', title: 'ようこそ', subtitle: '使用目的を選択' };
    }
  };

  const steps = [getStepInfo(0), getStepInfo(1), getStepInfo(2)];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!formData.purpose;
      case 1:
        if (formData.purpose === 'create') {
          return !!formData.companyName.trim();
        } else {
          return formData.inviteCode.length === 8;
        }
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && formData.purpose === 'create') {
      // 企業作成処理
      await handleCreateCompany();
    } else if (currentStep === 1 && formData.purpose === 'join') {
      // 参加処理
      await handleJoinCompany();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleCreateCompany = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 既に企業に所属しているかチェック
      const { getUserCompanies } = await import('@/lib/firebase/company');
      const existingCompanies = await getUserCompanies(user.uid);
      
      if (existingCompanies.length > 0) {
        console.log('⚠️ User already belongs to companies:', existingCompanies);
        setError('既に企業に所属しています。最初の企業に移動します。');
        await refreshCompanyData();
        router.push('/');
        return;
      }
      
      console.log('🏭 Creating company with data:', {
        userId: user.uid,
        name: formData.companyName,
        industry: formData.industry,
      });
      
      const company = await createCompany(user.uid, {
        name: formData.companyName,
        industry: formData.industry,
      });
      
      console.log('✅ Company created:', company);
      
      // 企業作成後、CompanyContextを更新
      console.log('🔄 Refreshing company data...');
      await refreshCompanyData();
      console.log('✅ Company data refreshed');
      
      // 直接確認してみる
      console.log('🔍 Direct check: getting user companies...');
      const { getUserCompanies } = await import('@/lib/firebase/company');
      const directCheck = await getUserCompanies(user.uid);
      console.log('📊 Direct getUserCompanies result:', directCheck);
      
      setCurrentStep(2); // Success step
      
    } catch (err: any) {
      console.error('Error creating company:', err);
      setError('組織の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await joinCompanyWithInvite(
        formData.inviteCode,
        user.uid,
        { name: user.name || '', email: user.email || '' }
      );
      
      if (result.success) {
        // 企業参加後、CompanyContextを更新
        await refreshCompanyData();
        setCurrentStep(2); // Success step
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

  const handleFinish = () => {
    router.push('/');
  };

  // 現在のステップに応じてコンポーネントを直接描画
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <PurposeStep formData={formData} updateFormData={updateFormData} />;
      case 1:
        return formData.purpose === 'create' 
          ? <CompanyStep formData={formData} updateFormData={updateFormData} />
          : <JoinStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <SuccessStep formData={formData} updateFormData={updateFormData} />;
      default:
        return <PurposeStep formData={formData} updateFormData={updateFormData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">U</span>
              </div>
              <span className="font-semibold text-gray-900">Unica</span>
            </div>
            <div className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
          
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg text-center"
            >
              {error}
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleFinish}
              className="bg-blue-600 hover:bg-blue-700 flex items-center"
            >
              始める
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="bg-blue-600 hover:bg-blue-700 flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  処理中...
                </>
              ) : (
                <>
                  次へ
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}