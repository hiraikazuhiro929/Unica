// React hook for order system integration
// Provides real-time order tracking, status updates, and cross-system synchronization

import { useState, useEffect, useCallback, useRef } from 'react';
import { orderSystemIntegration, SystemIntegrationData } from '@/app/integration/systemIntegration';
import { OrderItem } from '../page';

export interface OrderIntegrationState {
  integrationData: Map<string, SystemIntegrationData>;
  dashboardMetrics: {
    activeOrders: number;
    systemIntegrationHealth: number;
    avgProcessingTime: number;
    orderCompletionRate: number;
    criticalAlerts: string[];
  };
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}

export interface OrderIntegrationActions {
  trackOrder: (orderId: string) => Promise<void>;
  createEnhancedProcess: (order: OrderItem) => Promise<boolean>;
  syncAllData: () => Promise<void>;
  refreshDashboardMetrics: () => void;
  getWorkflowData: (orderId: string) => any;
  updateOrderStatus: (orderId: string, status: OrderItem['status'], progress?: number) => Promise<void>;
}

export const useOrderIntegration = (orders: OrderItem[]): [OrderIntegrationState, OrderIntegrationActions] => {
  const [state, setState] = useState<OrderIntegrationState>({
    integrationData: new Map(),
    dashboardMetrics: {
      activeOrders: 0,
      systemIntegrationHealth: 100,
      avgProcessingTime: 0,
      orderCompletionRate: 0,
      criticalAlerts: [],
    },
    isLoading: false,
    error: null,
    lastSyncTime: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ordersRef = useRef<OrderItem[]>(orders);

  // Update orders reference when orders change
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Initialize integration and start periodic sync
  useEffect(() => {
    initializeIntegration();
    startPeriodicSync();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Initialize integration for all orders
  const initializeIntegration = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const newIntegrationData = new Map<string, SystemIntegrationData>();
      
      for (const order of orders) {
        const data = await orderSystemIntegration.trackOrderStatus(order.id);
        if (data) {
          newIntegrationData.set(order.id, data);
        }
      }

      const metrics = orderSystemIntegration.getRealtimeDashboardMetrics();
      
      setState(prev => ({
        ...prev,
        integrationData: newIntegrationData,
        dashboardMetrics: metrics,
        isLoading: false,
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Integration initialization failed',
        isLoading: false,
      }));
    }
  };

  // Start periodic synchronization
  const startPeriodicSync = () => {
    // Sync every 30 seconds in development, 5 minutes in production
    const interval = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 30 * 1000;
    
    syncIntervalRef.current = setInterval(async () => {
      await syncAllData();
    }, interval);
  };

  // Track individual order
  const trackOrder = useCallback(async (orderId: string) => {
    try {
      const data = await orderSystemIntegration.trackOrderStatus(orderId);
      if (data) {
        setState(prev => ({
          ...prev,
          integrationData: new Map(prev.integrationData.set(orderId, data)),
          lastSyncTime: new Date(),
        }));
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to track order ${orderId}`,
      }));
    }
  }, []);

  // Create enhanced process with system integration
  const createEnhancedProcess = useCallback(async (order: OrderItem): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const success = await orderSystemIntegration.createEnhancedProcess(order);
      
      if (success) {
        // Refresh integration data for this order
        await trackOrder(order.id);
        
        // Refresh dashboard metrics
        const metrics = orderSystemIntegration.getRealtimeDashboardMetrics();
        setState(prev => ({
          ...prev,
          dashboardMetrics: metrics,
          isLoading: false,
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Error creating enhanced process:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create enhanced process',
        isLoading: false,
      }));
      return false;
    }
  }, [trackOrder]);

  // Sync all system data
  const syncAllData = useCallback(async () => {
    try {
      const currentOrders = ordersRef.current;
      
      for (const order of currentOrders) {
        await orderSystemIntegration.syncSystemData(order.id);
        await trackOrder(order.id);
      }

      const metrics = orderSystemIntegration.getRealtimeDashboardMetrics();
      setState(prev => ({
        ...prev,
        dashboardMetrics: {
          ...metrics,
          activeOrders: currentOrders.filter(o => !['completed', 'delayed'].includes(o.status)).length,
        },
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      console.error('Error syncing all data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to sync system data',
      }));
    }
  }, [trackOrder]);

  // Refresh dashboard metrics
  const refreshDashboardMetrics = useCallback(() => {
    try {
      const metrics = orderSystemIntegration.getRealtimeDashboardMetrics();
      const currentOrders = ordersRef.current;
      
      setState(prev => ({
        ...prev,
        dashboardMetrics: {
          ...metrics,
          activeOrders: currentOrders.filter(o => !['completed', 'delayed'].includes(o.status)).length,
        },
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      console.error('Error refreshing dashboard metrics:', error);
    }
  }, []);

  // Get workflow visualization data
  const getWorkflowData = useCallback((orderId: string) => {
    try {
      return orderSystemIntegration.getWorkflowVisualizationData(orderId);
    } catch (error) {
      console.error('Error getting workflow data:', error);
      return { stages: [] };
    }
  }, []);

  // Update order status with system propagation
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: OrderItem['status'], 
    progress?: number
  ) => {
    try {
      // This would normally update the backend/Firebase
      // For now, we'll just trigger a sync
      await orderSystemIntegration.syncSystemData(orderId);
      await trackOrder(orderId);
      
      // Refresh metrics
      refreshDashboardMetrics();
    } catch (error) {
      console.error('Error updating order status:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to update order ${orderId} status`,
      }));
    }
  }, [trackOrder, refreshDashboardMetrics]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Enhanced actions object
  const actions: OrderIntegrationActions = {
    trackOrder,
    createEnhancedProcess,
    syncAllData,
    refreshDashboardMetrics,
    getWorkflowData,
    updateOrderStatus,
  };

  return [state, actions];
};

// Additional hook for real-time order metrics
export const useOrderMetrics = (orders: OrderItem[]) => {
  const [metrics, setMetrics] = useState({
    totalValue: 0,
    averageProgress: 0,
    criticalOrders: 0,
    statusDistribution: {} as Record<string, number>,
    priorityDistribution: {} as Record<string, number>,
    deliveryPressure: 0, // Orders with delivery within 7 days
  });

  useEffect(() => {
    const calculateMetrics = () => {
      const totalValue = orders.reduce((sum, o) => sum + (o.estimatedAmount || 0), 0);
      const averageProgress = orders.length > 0 
        ? orders.reduce((sum, o) => sum + o.progress, 0) / orders.length 
        : 0;

      const now = new Date();
      const criticalOrders = orders.filter(o => {
        const deliveryDate = new Date(o.deliveryDate);
        const daysUntilDelivery = (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilDelivery <= 3 && o.status !== 'completed';
      }).length;

      const deliveryPressure = orders.filter(o => {
        const deliveryDate = new Date(o.deliveryDate);
        const daysUntilDelivery = (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilDelivery <= 7 && o.status !== 'completed';
      }).length;

      const statusDistribution = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityDistribution = orders.reduce((acc, o) => {
        acc[o.priority] = (acc[o.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setMetrics({
        totalValue,
        averageProgress,
        criticalOrders,
        statusDistribution,
        priorityDistribution,
        deliveryPressure,
      });
    };

    calculateMetrics();
  }, [orders]);

  return metrics;
};

// Hook for workflow stage management
export const useWorkflowStages = (orderId: string) => {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStages = useCallback(async () => {
    setLoading(true);
    try {
      const workflowData = orderSystemIntegration.getWorkflowVisualizationData(orderId);
      setStages(workflowData.stages);
    } catch (error) {
      console.error('Error refreshing workflow stages:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    refreshStages();
  }, [refreshStages]);

  return { stages, loading, refreshStages };
};