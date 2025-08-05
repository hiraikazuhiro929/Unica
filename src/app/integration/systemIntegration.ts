// System Integration Hub - Manages data flow between Orders, Processes, Work Hours, and Daily Reports
// This module provides the central coordination for the enhanced manufacturing management system

import { OrderItem } from "../orders/page";

// Enhanced integration types
export interface SystemIntegrationData {
  orderId: string;
  orderData: OrderItem;
  connectedProcesses: ProcessIntegrationData[];
  connectedWorkHours: WorkHoursIntegrationData[];
  connectedDailyReports: DailyReportIntegrationData[];
  systemHealth: SystemHealthStatus;
  lastSyncTime: string;
}

export interface ProcessIntegrationData {
  id: string;
  orderId: string;
  status: string;
  progress: number;
  assignee: string;
  machineUtilization: number;
  plannedVsActual: {
    planned: number;
    actual: number;
    efficiency: number;
  };
}

export interface WorkHoursIntegrationData {
  id: string;
  orderId: string;
  processId: string;
  totalPlannedHours: number;
  totalActualHours: number;
  efficiency: number;
  costVariance: number;
  status: 'on-track' | 'over-budget' | 'under-budget';
}

export interface DailyReportIntegrationData {
  id: string;
  orderId: string;
  workerId: string;
  date: string;
  totalWorkMinutes: number;
  productivity: number;
  issues: string[];
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  ordersSync: boolean;
  processesSync: boolean;
  workHoursSync: boolean;
  dailyReportsSync: boolean;
  lastHealthCheck: string;
}

// Enhanced Order Management Integration Class
export class OrderSystemIntegration {
  private static instance: OrderSystemIntegration;
  private integrationData: Map<string, SystemIntegrationData> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicSync();
  }

  public static getInstance(): OrderSystemIntegration {
    if (!OrderSystemIntegration.instance) {
      OrderSystemIntegration.instance = new OrderSystemIntegration();
    }
    return OrderSystemIntegration.instance;
  }

  // Real-time order status tracking
  public async trackOrderStatus(orderId: string): Promise<SystemIntegrationData | null> {
    try {
      // In real implementation, this would connect to Firebase/backend
      const orderData = this.getOrderFromStorage(orderId);
      if (!orderData) return null;

      const processes = this.getConnectedProcesses(orderId);
      const workHours = this.getConnectedWorkHours(orderId);
      const dailyReports = this.getConnectedDailyReports(orderId);
      
      const integrationData: SystemIntegrationData = {
        orderId,
        orderData,
        connectedProcesses: processes,
        connectedWorkHours: workHours,
        connectedDailyReports: dailyReports,
        systemHealth: this.checkSystemHealth(orderId),
        lastSyncTime: new Date().toISOString(),
      };

      this.integrationData.set(orderId, integrationData);
      return integrationData;
    } catch (error) {
      console.error('Error tracking order status:', error);
      return null;
    }
  }

  // Enhanced process creation with better data mapping
  public async createEnhancedProcess(order: OrderItem): Promise<boolean> {
    try {
      const processTemplate = this.generateAdvancedProcessTemplate(order);
      const workHoursTemplate = this.generateWorkHoursTemplate(order, processTemplate);
      
      // Store in localStorage for demo (in real app, would be Firebase/backend)
      this.saveProcessData(processTemplate);
      this.saveWorkHoursData(workHoursTemplate);
      
      // Update order status and progress
      await this.updateOrderStatus(order.id, 'data-work', 15);
      
      // Trigger system sync
      await this.syncSystemData(order.id);
      
      return true;
    } catch (error) {
      console.error('Error creating enhanced process:', error);
      return false;
    }
  }

  // Cross-system data synchronization
  public async syncSystemData(orderId: string): Promise<boolean> {
    try {
      const integrationData = await this.trackOrderStatus(orderId);
      if (!integrationData) return false;

      // Sync processes → work hours
      for (const process of integrationData.connectedProcesses) {
        await this.syncProcessToWorkHours(process);
      }

      // Sync work hours → daily reports
      for (const workHour of integrationData.connectedWorkHours) {
        await this.syncWorkHoursToDailyReports(workHour);
      }

      // Update order progress based on connected systems
      await this.updateOrderProgressFromSystems(orderId);

      return true;
    } catch (error) {
      console.error('Error syncing system data:', error);
      return false;
    }
  }

  // Real-time dashboard metrics
  public getRealtimeDashboardMetrics(): {
    activeOrders: number;
    systemIntegrationHealth: number;
    avgProcessingTime: number;
    orderCompletionRate: number;
    criticalAlerts: string[];
  } {
    const orders = this.getAllOrders();
    const activeOrders = orders.filter(o => !['completed', 'delayed'].includes(o.status)).length;
    
    let healthyConnections = 0;
    let totalConnections = 0;
    const criticalAlerts: string[] = [];

    this.integrationData.forEach((data) => {
      totalConnections++;
      if (data.systemHealth.overall === 'healthy') healthyConnections++;
      if (data.systemHealth.overall === 'critical') {
        criticalAlerts.push(`Order ${data.orderData.managementNumber} has critical integration issues`);
      }
    });

    const systemIntegrationHealth = totalConnections > 0 ? (healthyConnections / totalConnections) * 100 : 100;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const orderCompletionRate = orders.length > 0 ? (completedOrders / orders.length) * 100 : 0;

    return {
      activeOrders,
      systemIntegrationHealth,
      avgProcessingTime: this.calculateAvgProcessingTime(),
      orderCompletionRate,
      criticalAlerts,
    };
  }

  // Advanced workflow visualization data
  public getWorkflowVisualizationData(orderId: string): {
    stages: Array<{
      name: string;
      status: 'completed' | 'active' | 'pending' | 'blocked';
      progress: number;
      estimatedCompletion: string;
      resources: string[];
    }>;
  } {
    const integrationData = this.integrationData.get(orderId);
    if (!integrationData) {
      return { stages: [] };
    }

    const stages = [
      {
        name: '受注・計画',
        status: 'completed' as const,
        progress: 100,
        estimatedCompletion: integrationData.orderData.orderDate,
        resources: [integrationData.orderData.createdBy || '営業'],
      },
      {
        name: 'データ作業',
        status: integrationData.orderData.status === 'data-work' ? 'active' as const : 
                integrationData.orderData.progress > 15 ? 'completed' as const : 'pending' as const,
        progress: Math.max(0, Math.min(100, (integrationData.orderData.progress - 0) * (100 / 30))),
        estimatedCompletion: this.estimateStageCompletion(integrationData, 'data-work'),
        resources: integrationData.connectedProcesses.map(p => p.assignee).filter(Boolean),
      },
      {
        name: '加工・製造',
        status: integrationData.orderData.status === 'processing' ? 'active' as const :
                integrationData.orderData.progress > 60 ? 'completed' as const : 'pending' as const,
        progress: Math.max(0, Math.min(100, (integrationData.orderData.progress - 30) * (100 / 50))),
        estimatedCompletion: this.estimateStageCompletion(integrationData, 'processing'),
        resources: integrationData.connectedWorkHours.map(w => `Process-${w.processId}`),
      },
      {
        name: '仕上げ・検査',
        status: integrationData.orderData.status === 'finishing' ? 'active' as const :
                integrationData.orderData.status === 'completed' ? 'completed' as const : 'pending' as const,
        progress: Math.max(0, Math.min(100, (integrationData.orderData.progress - 80) * (100 / 20))),
        estimatedCompletion: this.estimateStageCompletion(integrationData, 'finishing'),
        resources: ['品質管理担当'],
      },
      {
        name: '完了・納品',
        status: integrationData.orderData.status === 'completed' ? 'completed' as const : 'pending' as const,
        progress: integrationData.orderData.status === 'completed' ? 100 : 0,
        estimatedCompletion: integrationData.orderData.deliveryDate,
        resources: ['出荷担当'],
      },
    ];

    return { stages };
  }

  // Private helper methods
  private startPeriodicSync(): void {
    // Sync every 5 minutes in production, every 30 seconds in demo
    const interval = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 30 * 1000;
    
    this.syncInterval = setInterval(() => {
      this.integrationData.forEach(async (_, orderId) => {
        await this.syncSystemData(orderId);
      });
    }, interval);
  }

  private getOrderFromStorage(orderId: string): OrderItem | null {
    // In demo, we'll need to get this from the component state
    // In production, this would be from Firebase/backend
    return null;
  }

  private getConnectedProcesses(orderId: string): ProcessIntegrationData[] {
    const processes = JSON.parse(localStorage.getItem('processData') || '[]');
    return processes
      .filter((p: any) => p.orderId === orderId)
      .map((p: any) => ({
        id: p.id,
        orderId: p.orderId,
        status: p.status,
        progress: p.progress,
        assignee: p.assignee,
        machineUtilization: 85, // Mock data
        plannedVsActual: {
          planned: p.workDetails.setup + p.workDetails.machining + p.workDetails.finishing,
          actual: 0, // Would be calculated from actual time logs
          efficiency: 1.0,
        },
      }));
  }

  private getConnectedWorkHours(orderId: string): WorkHoursIntegrationData[] {
    const workHours = JSON.parse(localStorage.getItem('workHoursData') || '[]');
    return workHours
      .filter((w: any) => w.orderId === orderId)
      .map((w: any) => ({
        id: w.id,
        orderId: w.orderId,
        processId: w.processId,
        totalPlannedHours: w.plannedHours.total,
        totalActualHours: w.actualHours.total,
        efficiency: w.actualHours.total > 0 ? w.plannedHours.total / w.actualHours.total : 1.0,
        costVariance: 0, // Would be calculated
        status: 'on-track' as const,
      }));
  }

  private getConnectedDailyReports(orderId: string): DailyReportIntegrationData[] {
    const dailyReports = JSON.parse(localStorage.getItem('dailyReportsData') || '[]');
    return dailyReports
      .filter((r: any) => r.orderId === orderId)
      .map((r: any) => ({
        id: r.id,
        orderId: r.orderId,
        workerId: r.workerId,
        date: r.date,
        totalWorkMinutes: r.totalWorkMinutes,
        productivity: 85, // Mock calculation
        issues: [], // Would extract from report content
      }));
  }

  private getAllOrders(): OrderItem[] {
    // This would be passed from the component or fetched from backend
    return [];
  }

  private checkSystemHealth(orderId: string): SystemHealthStatus {
    // Mock health check - in production would check actual connections
    return {
      overall: 'healthy',
      ordersSync: true,
      processesSync: true,
      workHoursSync: true,
      dailyReportsSync: true,
      lastHealthCheck: new Date().toISOString(),
    };
  }

  private generateAdvancedProcessTemplate(order: OrderItem): any {
    // Enhanced process generation with better AI-driven estimates
    const today = new Date();
    const deliveryDate = new Date(order.deliveryDate);
    const totalDays = Math.floor((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // More sophisticated scheduling algorithm
    const complexity = this.calculateComplexity(order);
    const baseHours = this.estimateBaseHours(order, complexity);
    
    return {
      id: `${order.id}-process-${Date.now()}`,
      orderId: order.id,
      orderClient: order.client,
      lineNumber: "001",
      projectName: order.projectName,
      managementNumber: order.managementNumber,
      progress: 0,
      quantity: order.quantity,
      salesPerson: order.createdBy || "未割当",
      assignee: "未割当",
      fieldPerson: "未割当",
      assignedMachines: [],
      workDetails: baseHours,
      complexity,
      estimatedDuration: Math.ceil(totalDays * 0.7),
      riskFactors: this.identifyRiskFactors(order),
      // ... other process fields
    };
  }

  private generateWorkHoursTemplate(order: OrderItem, process: any): any {
    return {
      id: `${order.id}-hours-${Date.now()}`,
      orderId: order.id,
      processId: process.id,
      projectName: order.projectName,
      client: order.client,
      managementNumber: order.managementNumber,
      plannedHours: process.workDetails,
      actualHours: { setup: 0, machining: 0, finishing: 0, total: 0 },
      budget: this.calculateBudget(order, process.workDetails),
      status: "planning",
      integrationMetrics: {
        syncStatus: 'active',
        lastSync: new Date().toISOString(),
        dataQuality: 'high',
      },
    };
  }

  private calculateComplexity(order: OrderItem): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    // Quantity factor
    if (order.quantity > 100) complexityScore += 2;
    else if (order.quantity > 50) complexityScore += 1;
    
    // Value factor
    if ((order.estimatedAmount || 0) > 1000000) complexityScore += 2;
    else if ((order.estimatedAmount || 0) > 500000) complexityScore += 1;
    
    // Tag-based complexity
    const complexTags = ['高精度', '精密加工', '特殊材料'];
    const hasComplexTags = (order.tags || []).some(tag => 
      complexTags.some(ct => tag.includes(ct))
    );
    if (hasComplexTags) complexityScore += 2;
    
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private estimateBaseHours(order: OrderItem, complexity: string): any {
    const baseMultiplier = complexity === 'high' ? 1.5 : complexity === 'medium' ? 1.2 : 1.0;
    const quantityFactor = Math.min(2.0, 1 + (order.quantity / 100));
    
    return {
      setup: Math.ceil(4 * baseMultiplier),
      machining: Math.ceil(order.quantity * 0.5 * baseMultiplier * quantityFactor),
      finishing: Math.ceil(order.quantity * 0.3 * baseMultiplier),
      total: 0, // Will be calculated
    };
  }

  private identifyRiskFactors(order: OrderItem): string[] {
    const risks: string[] = [];
    
    const daysUntilDelivery = Math.ceil(
      (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilDelivery <= 7) risks.push('短納期');
    if ((order.estimatedAmount || 0) > 1000000) risks.push('高額案件');
    if (order.quantity > 200) risks.push('大量生産');
    
    return risks;
  }

  private calculateBudget(order: OrderItem, workDetails: any): any {
    const rates = { setup: 3000, machining: 4000, finishing: 3500 };
    
    return {
      estimatedAmount: order.estimatedAmount || 0,
      setupRate: rates.setup,
      machiningRate: rates.machining,
      finishingRate: rates.finishing,
      totalPlannedCost: 
        workDetails.setup * rates.setup +
        workDetails.machining * rates.machining +
        workDetails.finishing * rates.finishing,
      totalActualCost: 0,
    };
  }

  private calculateAvgProcessingTime(): number {
    // Mock calculation - would be based on historical data
    return 12.5; // days
  }

  private estimateStageCompletion(data: SystemIntegrationData, stage: string): string {
    // Estimate completion date based on current progress and historical data
    const today = new Date();
    const daysToAdd = stage === 'data-work' ? 3 : stage === 'processing' ? 7 : 2;
    const estimatedDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return estimatedDate.toISOString().split('T')[0];
  }

  private async syncProcessToWorkHours(process: ProcessIntegrationData): Promise<void> {
    // Sync process updates to work hours
    console.log(`Syncing process ${process.id} to work hours`);
  }

  private async syncWorkHoursToDailyReports(workHour: WorkHoursIntegrationData): Promise<void> {
    // Sync work hours to daily reports
    console.log(`Syncing work hours ${workHour.id} to daily reports`);
  }

  private async updateOrderStatus(orderId: string, status: string, progress: number): Promise<void> {
    // Update order status in storage/backend
    console.log(`Updating order ${orderId} status to ${status} with progress ${progress}%`);
  }

  private async updateOrderProgressFromSystems(orderId: string): Promise<void> {
    // Calculate and update order progress based on connected systems
    const integrationData = this.integrationData.get(orderId);
    if (!integrationData) return;
    
    // Calculate weighted progress from all connected systems
    let totalProgress = 0;
    let weights = 0;
    
    // Process progress (40% weight)
    integrationData.connectedProcesses.forEach(p => {
      totalProgress += p.progress * 0.4;
      weights += 0.4;
    });
    
    // Work hours progress (40% weight)
    integrationData.connectedWorkHours.forEach(w => {
      const hourProgress = w.totalActualHours > 0 ? 
        Math.min(100, (w.totalActualHours / w.totalPlannedHours) * 100) : 0;
      totalProgress += hourProgress * 0.4;
      weights += 0.4;
    });
    
    // Daily reports activity (20% weight)
    const recentReports = integrationData.connectedDailyReports.filter(r => {
      const reportDate = new Date(r.date);
      const daysDiff = (new Date().getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7; // Last week
    });
    
    if (recentReports.length > 0) {
      totalProgress += 20; // Active if reports exist
      weights += 0.2;
    }
    
    const calculatedProgress = weights > 0 ? totalProgress / weights : 0;
    
    // Update the integration data
    integrationData.orderData.progress = Math.round(calculatedProgress);
  }

  private saveProcessData(processData: any): void {
    const existing = JSON.parse(localStorage.getItem('processData') || '[]');
    localStorage.setItem('processData', JSON.stringify([...existing, processData]));
  }

  private saveWorkHoursData(workHoursData: any): void {
    const existing = JSON.parse(localStorage.getItem('workHoursData') || '[]');
    localStorage.setItem('workHoursData', JSON.stringify([...existing, workHoursData]));
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Export singleton instance
export const orderSystemIntegration = OrderSystemIntegration.getInstance();

// Export utility functions for use in components
export const useSystemIntegration = () => {
  return {
    trackOrderStatus: (orderId: string) => orderSystemIntegration.trackOrderStatus(orderId),
    createEnhancedProcess: (order: OrderItem) => orderSystemIntegration.createEnhancedProcess(order),
    syncSystemData: (orderId: string) => orderSystemIntegration.syncSystemData(orderId),
    getRealtimeDashboardMetrics: () => orderSystemIntegration.getRealtimeDashboardMetrics(),
    getWorkflowVisualizationData: (orderId: string) => orderSystemIntegration.getWorkflowVisualizationData(orderId),
  };
};