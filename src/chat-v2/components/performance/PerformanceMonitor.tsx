import React, { Profiler, useCallback, useRef, useEffect, useState } from 'react';

// =============================================================================
// Performance Monitor Component - パフォーマンス監視
// =============================================================================

interface PerformanceMetrics {
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<string>;
}

interface PerformanceStats {
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  renderCount: number;
  totalTime: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface PerformanceMonitorProps {
  /** 監視対象のコンポーネント名 */
  componentName: string;
  /** 子コンポーネント */
  children: React.ReactNode;
  /** パフォーマンスメトリクスのコールバック */
  onMetrics?: (metrics: PerformanceMetrics) => void;
  /** 統計情報の表示 */
  showStats?: boolean;
  /** デバッグモードでのみ有効 */
  enableInProduction?: boolean;
  /** メトリクス収集間隔（ms） */
  metricsInterval?: number;
}

/**
 * React Profiler APIを使用したパフォーマンス監視コンポーネント
 *
 * 特徴:
 * - レンダリング時間の計測
 * - メモリ使用量の監視
 * - 統計情報の収集と表示
 * - プロダクション環境での無効化
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  children,
  onMetrics,
  showStats = process.env.NODE_ENV === 'development',
  enableInProduction = false,
  metricsInterval = 1000,
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    renderCount: 0,
    totalTime: 0,
  });

  const metricsRef = useRef<PerformanceMetrics[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  // プロダクション環境での制御
  const shouldProfile = process.env.NODE_ENV === 'development' || enableInProduction;

  // プロファイラーコールバック
  const onRenderCallback = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<string>
  ) => {
    const metrics: PerformanceMetrics = {
      componentName: id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
    };

    // メトリクスの保存
    metricsRef.current.push(metrics);

    // 外部コールバックの実行
    if (onMetrics) {
      onMetrics(metrics);
    }

    // 統計情報の更新
    setStats(prevStats => {
      const newRenderCount = prevStats.renderCount + 1;
      const newTotalTime = prevStats.totalTime + actualDuration;
      const newAverageRenderTime = newTotalTime / newRenderCount;
      const newMaxRenderTime = Math.max(prevStats.maxRenderTime, actualDuration);
      const newMinRenderTime = Math.min(prevStats.minRenderTime, actualDuration);

      return {
        averageRenderTime: newAverageRenderTime,
        maxRenderTime: newMaxRenderTime,
        minRenderTime: newMinRenderTime === Infinity ? actualDuration : newMinRenderTime,
        renderCount: newRenderCount,
        totalTime: newTotalTime,
        memoryUsage: getMemoryUsage(),
      };
    });
  }, [onMetrics]);

  // メモリ使用量の取得
  const getMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return undefined;
  }, []);

  // 定期的なメトリクス更新
  useEffect(() => {
    if (!shouldProfile || !showStats) return;

    intervalRef.current = setInterval(() => {
      setStats(prevStats => ({
        ...prevStats,
        memoryUsage: getMemoryUsage(),
      }));
    }, metricsInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [shouldProfile, showStats, metricsInterval, getMemoryUsage]);

  // メトリクスのリセット
  const resetMetrics = useCallback(() => {
    metricsRef.current = [];
    setStats({
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
      renderCount: 0,
      totalTime: 0,
      memoryUsage: getMemoryUsage(),
    });
  }, [getMemoryUsage]);

  // プロファイリングが無効な場合はそのまま返す
  if (!shouldProfile) {
    return <>{children}</>;
  }

  return (
    <>
      <Profiler id={componentName} onRender={onRenderCallback}>
        {children}
      </Profiler>

      {/* 統計情報の表示 */}
      {showStats && (
        <PerformanceStatsDisplay
          componentName={componentName}
          stats={stats}
          onReset={resetMetrics}
        />
      )}
    </>
  );
};

// =============================================================================
// Performance Stats Display Component
// =============================================================================

interface PerformanceStatsDisplayProps {
  componentName: string;
  stats: PerformanceStats;
  onReset: () => void;
}

const PerformanceStatsDisplay: React.FC<PerformanceStatsDisplayProps> = ({
  componentName,
  stats,
  onReset,
}) => {
  const formatTime = (time: number) => `${time.toFixed(2)}ms`;
  const formatMemory = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

  return (
    <div className="fixed top-4 right-4 z-50 bg-black bg-opacity-90 text-white text-xs p-3 rounded-lg shadow-lg font-mono max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-green-400">{componentName}</h3>
        <button
          onClick={onReset}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <span>Renders:</span>
          <span className="text-yellow-400">{stats.renderCount}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <span>Avg Time:</span>
          <span className="text-blue-400">{formatTime(stats.averageRenderTime)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <span>Max Time:</span>
          <span className="text-red-400">{formatTime(stats.maxRenderTime)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <span>Min Time:</span>
          <span className="text-green-400">{formatTime(stats.minRenderTime)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <span>Total Time:</span>
          <span className="text-purple-400">{formatTime(stats.totalTime)}</span>
        </div>

        {stats.memoryUsage && (
          <>
            <hr className="border-gray-700 my-2" />
            <div className="grid grid-cols-2 gap-2">
              <span>Memory:</span>
              <span className="text-orange-400">
                {formatMemory(stats.memoryUsage.usedJSHeapSize)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span>Limit:</span>
              <span className="text-gray-400">
                {formatMemory(stats.memoryUsage.jsHeapSizeLimit)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* パフォーマンス判定 */}
      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className={`text-xs px-2 py-1 rounded ${getPerformanceColor(stats.averageRenderTime)}`}>
          {getPerformanceLabel(stats.averageRenderTime)}
        </div>
      </div>
    </div>
  );
};

// パフォーマンス判定のヘルパー関数
const getPerformanceColor = (avgTime: number): string => {
  if (avgTime < 16) return 'bg-green-700 text-green-200'; // 60fps
  if (avgTime < 33) return 'bg-yellow-700 text-yellow-200'; // 30fps
  return 'bg-red-700 text-red-200'; // <30fps
};

const getPerformanceLabel = (avgTime: number): string => {
  if (avgTime < 16) return '⚡ Excellent (>60fps)';
  if (avgTime < 33) return '⚠️ Good (>30fps)';
  return '🐌 Needs Optimization (<30fps)';
};

PerformanceMonitor.displayName = 'PerformanceMonitor';

// =============================================================================
// Hooks for Performance Monitoring
// =============================================================================

/**
 * パフォーマンスメトリクスを管理するフック
 */
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);

  const addMetric = useCallback((metric: PerformanceMetrics) => {
    setMetrics(prev => [...prev.slice(-99), metric]); // 最新100件を保持
  }, []);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  const getAverageRenderTime = useCallback(() => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.actualDuration, 0);
    return total / metrics.length;
  }, [metrics]);

  return {
    metrics,
    addMetric,
    clearMetrics,
    getAverageRenderTime,
  };
};

// =============================================================================
// Export
// =============================================================================

export type { PerformanceMetrics, PerformanceStats, PerformanceMonitorProps };
export { usePerformanceMetrics };