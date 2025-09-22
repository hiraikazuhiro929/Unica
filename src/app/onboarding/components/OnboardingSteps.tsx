"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { 
  Building2,
  Users,
  Hash,
  Sparkles,
  Target,
  Factory,
  Zap,
  Check,
} from 'lucide-react';

interface FormData {
  purpose: string;
  companyName: string;
  industry: string;
  teamSize: string;
  inviteCode: string;
}

interface StepProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
}

// Step 1: Purpose Selection
export const PurposeStep: React.FC<StepProps> = ({ formData, updateFormData }) => (
  <div className="text-center space-y-8">
    <div className="space-y-4">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-gray-900"
      >
        新しい組織を作成
      </motion.h1>
      <p className="text-gray-600 text-lg">
        チームでの製造業務管理を始めましょう
      </p>
    </div>

    <div className="grid gap-4 max-w-md mx-auto">
      {[
        {
          id: 'create',
          icon: Building2,
          title: '新しいチームを作る',
          subtitle: 'あなたが管理者として始める',
          color: 'blue',
        },
      ].map((option) => {
        const Icon = option.icon;
        const isSelected = formData.purpose === option.id;
        
        return (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateFormData({ purpose: option.id })}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              isSelected
                ? `border-${option.color}-500 bg-${option.color}-50`
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isSelected 
                  ? `bg-${option.color}-500 text-white`
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {option.subtitle}
                </p>
              </div>
              {isSelected && (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  </div>
);

// Step 2: Company Creation
export const CompanyStep: React.FC<StepProps> = ({ formData, updateFormData }) => (
  <div className="max-w-md mx-auto space-y-8">
    <div className="text-center space-y-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto"
      >
        <Factory className="w-8 h-8 text-blue-600" />
      </motion.div>
      <h1 className="text-3xl font-bold text-gray-900">
        組織を作成しましょう
      </h1>
      <p className="text-gray-600">
        あなたのチーム情報を教えてください
      </p>
    </div>

    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          組織名 <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="株式会社サンプル"
          value={formData.companyName}
          onChange={(e) => updateFormData({ companyName: e.target.value })}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          業種
        </label>
        <select
          value={formData.industry}
          onChange={(e) => updateFormData({ industry: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 appearance-none"
        >
          <option value="">選択してください</option>
          <option value="manufacturing">製造業</option>
          <option value="construction">建設業</option>
          <option value="automotive">自動車</option>
          <option value="electronics">電子機器</option>
          <option value="food">食品加工</option>
          <option value="other">その他</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          チームサイズ
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: '1-5', label: '1-5人' },
            { value: '6-20', label: '6-20人' },
            { value: '21-50', label: '21-50人' },
            { value: '50+', label: '50人以上' },
          ].map((size) => (
            <button
              key={size.value}
              onClick={() => updateFormData({ teamSize: size.value })}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                formData.teamSize === size.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Step 3: Join with Code
export const JoinStep: React.FC<StepProps> = ({ formData, updateFormData }) => (
  <div className="max-w-md mx-auto space-y-8">
    <div className="text-center space-y-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto"
      >
        <Hash className="w-8 h-8 text-green-600" />
      </motion.div>
      <h1 className="text-3xl font-bold text-gray-900">
        招待コードを入力
      </h1>
      <p className="text-gray-600">
        チーム管理者から受け取った招待コードを入力してください
      </p>
    </div>

    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          招待コード
        </label>
        <Input
          type="text"
          placeholder="ABCD1234"
          value={formData.inviteCode}
          onChange={(e) => updateFormData({ inviteCode: e.target.value.toUpperCase() })}
          className="w-full text-center font-mono text-lg tracking-widest"
          maxLength={8}
        />
        <p className="text-xs text-gray-500 mt-1">
          8文字の英数字コード
        </p>
      </div>
    </div>
  </div>
);

// Step 4: Success
export const SuccessStep: React.FC<StepProps> = () => (
  <div className="text-center space-y-8">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
    >
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="w-10 h-10 text-green-600" />
      </div>
    </motion.div>

    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-gray-900">
        🎉 セットアップ完了！
      </h1>
      <p className="text-gray-600 text-lg">
        Unicaを使い始める準備ができました
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
      {[
        { icon: Target, label: '工程管理' },
        { icon: Users, label: 'チーム連携' },
        { icon: Zap, label: 'リアルタイム' },
        { icon: Factory, label: '効率化' },
      ].map((feature, index) => {
        const Icon = feature.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="p-4 bg-gray-50 rounded-xl text-center"
          >
            <Icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {feature.label}
            </p>
          </motion.div>
        );
      })}
    </div>
  </div>
);