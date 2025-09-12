import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 環境変数を明示的に設定
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  
  // Webpack設定（パフォーマンス最適化）
  webpack: (config, { isServer, dev }) => {
    // 開発環境では高速化重視
    if (dev) {
      // メモリキャッシュを使用（ファイルシステムキャッシュの問題を回避）
      config.cache = {
        type: 'memory'
      };
      
      // 最適化を無効化（開発時の高速化）
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    
    // インフラログレベル調整
    config.infrastructureLogging = {
      level: 'warn',
    };
    
    return config;
  },
  
  // 実験的機能の設定
  experimental: {
    // SWC最適化
    forceSwcTransforms: true,
    // 並列化を無効化（日本語パス対策）
    workerThreads: false,
  },
  
  // 開発時のパフォーマンス最適化
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000, // 25秒に短縮
      pagesBufferLength: 2, // バッファサイズ削減
    },
    // 開発サーバー最適化
    compiler: {
      removeConsole: false,
    }
  }),
  
  // 全体的なパフォーマンス設定
  poweredByHeader: false,
  generateEtags: false,
};

export default nextConfig;
