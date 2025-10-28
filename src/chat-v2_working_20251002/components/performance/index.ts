// =============================================================================
// Performance Components - Main Export
// React 18最適化とパフォーマンス監視
// =============================================================================

// Performance Monitoring
export {
  PerformanceMonitor,
  usePerformanceMetrics,
} from './PerformanceMonitor';
export type {
  PerformanceMetrics,
  PerformanceStats,
  PerformanceMonitorProps,
} from './PerformanceMonitor';

// React 18 Optimizations
export {
  useOptimizedMessageSending,
  useOptimizedSearch,
  useOptimizedMessageList,
  useOptimizedTypingIndicator,
  OptimizedSuspense,
  HighFrequencyUpdateWrapper,
  OptimizedVirtualScroll,
  executeNonBlocking,
  useMemoryMonitoring,
  useRenderCount,
} from './React18Optimizations';
export type {
  OptimizedSuspenseProps,
  HighFrequencyUpdateWrapperProps,
  OptimizedVirtualScrollProps,
} from './React18Optimizations';

// =============================================================================
// Performance Configuration
// =============================================================================

/**
 * パフォーマンス監視の設定
 */
export const PERFORMANCE_CONFIG = {
  // React Profiler設定
  profiler: {
    enableInProduction: false,
    metricsInterval: 1000,
    maxMetricsHistory: 100,
  },

  // React 18最適化設定
  optimization: {
    messageListVisibleCount: 50,
    searchDebounceMs: 300,
    typingIndicatorDebounceMs: 500,
    scrollDebounceMs: 100,
  },

  // パフォーマンス閾値
  thresholds: {
    renderTime: {
      excellent: 16, // >60fps
      good: 33,      // >30fps
      poor: 100,     // <10fps
    },
    memoryUsage: {
      warning: 50 * 1024 * 1024,   // 50MB
      critical: 100 * 1024 * 1024, // 100MB
    },
  },

  // メトリクス収集設定
  metrics: {
    enableInDevelopment: true,
    enableInProduction: false,
    enableMemoryMonitoring: true,
    enableRenderCounting: true,
  },
} as const;

/**
 * パフォーマンス最適化の推奨設定
 */
export const OPTIMIZATION_PRESETS = {
  // 高パフォーマンス設定（デスクトップ向け）
  high: {
    messageListVisibleCount: 100,
    searchDebounceMs: 200,
    typingIndicatorDebounceMs: 300,
    scrollDebounceMs: 50,
    enableVirtualization: true,
    enableConcurrentFeatures: true,
  },

  // 標準設定（バランス重視）
  standard: {
    messageListVisibleCount: 50,
    searchDebounceMs: 300,
    typingIndicatorDebounceMs: 500,
    scrollDebounceMs: 100,
    enableVirtualization: true,
    enableConcurrentFeatures: true,
  },

  // 低性能デバイス向け設定
  low: {
    messageListVisibleCount: 25,
    searchDebounceMs: 500,
    typingIndicatorDebounceMs: 1000,
    scrollDebounceMs: 200,
    enableVirtualization: true,
    enableConcurrentFeatures: false,
  },
} as const;

// =============================================================================
// Performance Utilities
// =============================================================================

/**
 * パフォーマンスレベルの判定
 */
export const getPerformanceLevel = (avgRenderTime: number): 'excellent' | 'good' | 'poor' => {
  if (avgRenderTime < PERFORMANCE_CONFIG.thresholds.renderTime.excellent) return 'excellent';
  if (avgRenderTime < PERFORMANCE_CONFIG.thresholds.renderTime.good) return 'good';
  return 'poor';
};

/**
 * メモリ使用量レベルの判定
 */
export const getMemoryUsageLevel = (usedBytes: number): 'normal' | 'warning' | 'critical' => {
  if (usedBytes < PERFORMANCE_CONFIG.thresholds.memoryUsage.warning) return 'normal';
  if (usedBytes < PERFORMANCE_CONFIG.thresholds.memoryUsage.critical) return 'warning';
  return 'critical';
};

/**
 * デバイス性能の自動判定
 */
export const detectDevicePerformance = (): keyof typeof OPTIMIZATION_PRESETS => {
  if (typeof window === 'undefined') return 'standard';

  // ハードウェア情報の取得
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as any).deviceMemory || 4;

  // 接続情報の取得（利用可能な場合）
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || '4g';

  // パフォーマンススコアの計算
  let score = 0;
  score += hardwareConcurrency >= 8 ? 3 : hardwareConcurrency >= 4 ? 2 : 1;
  score += deviceMemory >= 8 ? 3 : deviceMemory >= 4 ? 2 : 1;
  score += effectiveType === '4g' ? 2 : effectiveType === '3g' ? 1 : 0;

  // 設定の決定
  if (score >= 7) return 'high';
  if (score >= 4) return 'standard';
  return 'low';
};

/**
 * パフォーマンス最適化設定の適用
 */
export const applyPerformanceOptimizations = (
  level: keyof typeof OPTIMIZATION_PRESETS = 'standard'
) => {
  const config = OPTIMIZATION_PRESETS[level];

  // React DevToolsへの設定適用（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot?.(
      null,
      null,
      null,
      config
    );
  }

  return config;
};

// =============================================================================
// Component Collections
// =============================================================================

/**
 * パフォーマンス監視コンポーネント集
 */
export const PerformanceComponents = {
  PerformanceMonitor,
  OptimizedSuspense,
  HighFrequencyUpdateWrapper,
  OptimizedVirtualScroll,
} as const;

/**
 * パフォーマンス最適化フック集
 */
export const PerformanceHooks = {
  useOptimizedMessageSending,
  useOptimizedSearch,
  useOptimizedMessageList,
  useOptimizedTypingIndicator,
  usePerformanceMetrics,
  useMemoryMonitoring,
  useRenderCount,
} as const;

// =============================================================================
// Version Information
// =============================================================================

export const PERFORMANCE_LAYER_VERSION = '1.0.0';
export const PERFORMANCE_LAYER_BUILD_DATE = new Date().toISOString();

// =============================================================================
// Development Tools
// =============================================================================

/**
 * 開発用パフォーマンス分析ツール
 */
export const DevPerformanceTools = {
  /**
   * パフォーマンス情報をコンソールに出力
   */
  logPerformanceInfo: () => {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('🔧 Chat V2 Performance Info');
    console.log('Performance Config:', PERFORMANCE_CONFIG);
    console.log('Device Performance Level:', detectDevicePerformance());
    console.log('Optimization Preset:', OPTIMIZATION_PRESETS[detectDevicePerformance()]);

    if (typeof window !== 'undefined' && 'performance' in window) {
      const memory = (window.performance as any).memory;
      if (memory) {
        console.log('Memory Usage:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    }
    console.groupEnd();
  },

  /**
   * React DevToolsのProfilerを自動開始
   */
  startProfiling: () => {
    if (process.env.NODE_ENV !== 'development') return;

    const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (devtools?.reactDevtoolsAgent?.startProfiling) {
      devtools.reactDevtoolsAgent.startProfiling();
      console.log('🔍 React DevTools profiling started');
    }
  },

  /**
   * React DevToolsのProfilerを停止
   */
  stopProfiling: () => {
    if (process.env.NODE_ENV !== 'development') return;

    const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (devtools?.reactDevtoolsAgent?.stopProfiling) {
      devtools.reactDevtoolsAgent.stopProfiling();
      console.log('⏹️ React DevTools profiling stopped');
    }
  },
} as const;

// 開発環境での自動パフォーマンス情報出力
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // DOM読み込み完了後にパフォーマンス情報を出力
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => DevPerformanceTools.logPerformanceInfo(), 1000);
  });
}