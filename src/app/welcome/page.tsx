"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Users, 
  Building2, 
  ArrowRight,
  CheckCircle,
  Sparkles,
  Factory,
  Settings,
  BarChart3,
  MessageCircle,
} from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 画面表示時にConfetti表示
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // ステップアニメーション
    const timer = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 4);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: BarChart3,
      title: "工程管理",
      description: "製造工程を見える化",
      color: "text-blue-500",
      bgColor: "bg-blue-100",
    },
    {
      icon: Users,
      title: "チーム連携",
      description: "メンバーとスムーズに情報共有",
      color: "text-green-500", 
      bgColor: "bg-green-100",
    },
    {
      icon: MessageCircle,
      title: "リアルタイム",
      description: "チャットで瞬時にやり取り",
      color: "text-purple-500",
      bgColor: "bg-purple-100",
    },
    {
      icon: Settings,
      title: "効率化",
      description: "日々の作業を自動化",
      color: "text-orange-500",
      bgColor: "bg-orange-100",
    },
  ];

  const steps = [
    "アカウント作成完了！",
    "組織を設定します",
    "メンバーを招待できます",
    "すぐに使い始められます"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10">
          <Factory className="w-32 h-32 text-blue-500 animate-pulse" />
        </div>
        <div className="absolute bottom-20 right-20">
          <Building2 className="w-24 h-24 text-indigo-500 animate-bounce" />
        </div>
        <div className="absolute top-1/2 left-1/4">
          <Settings className="w-16 h-16 text-purple-500 animate-spin" style={{animationDuration: '8s'}} />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
              className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
          </div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-bold text-gray-900 mb-4"
          >
            Unicaへようこそ！
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            {user?.name || 'あなた'}さん、製造業務をもっと効率的に。<br />
            チーム全体で情報を共有し、生産性を向上させましょう。
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="bg-white rounded-3xl p-8 shadow-xl mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            セットアップは簡単3ステップ
          </h2>
          
          <div className="flex justify-center items-center space-x-8">
            {steps.slice(0, 3).map((step, index) => (
              <div key={index} className="flex items-center">
                <motion.div
                  animate={{
                    backgroundColor: currentStep >= index ? "#10B981" : "#E5E7EB",
                    scale: currentStep === index ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                >
                  {currentStep > index ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-white font-bold">{index + 1}</span>
                  )}
                </motion.div>
                
                {index < 2 && (
                  <motion.div
                    animate={{
                      backgroundColor: currentStep > index ? "#10B981" : "#E5E7EB",
                    }}
                    className="w-16 h-1 mx-4 rounded-full"
                  />
                )}
              </div>
            ))}
          </div>
          
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-gray-600 mt-6"
          >
            {steps[currentStep]}
          </motion.p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="text-center space-y-4"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => router.push('/company/setup')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 text-lg rounded-2xl shadow-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              始めましょう
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/')}
            className="block mx-auto text-gray-500 hover:text-gray-700 transition-colors"
          >
            あとで設定する
          </motion.button>
        </motion.div>

        {/* Bottom Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="mt-16 text-center"
        >
          <div className="flex justify-center space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  delay: i * 0.2,
                }}
                className="w-3 h-3 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}