import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack設定
  webpack: (config, { isServer }) => {
    // 日本語パスによるキャッシュ問題を解決
    config.cache = {
      type: 'memory'
    };
    
    // ファイルシステムキャッシュを無効化（日本語パス対策）
    if (config.infrastructureLogging) {
      config.infrastructureLogging.level = 'error';
    }
    
    return config;
  },
  
  // 実験的機能の設定
  experimental: {
    // Fast Refreshの安定化
    forceSwcTransforms: true,
  },
  
  // 開発時のオプション
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    }
  })
};

export default nextConfig;
