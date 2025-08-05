// Integration Test Suite for Manufacturing Management System
// Tests the cross-system data flow between Orders, Processes, Work Hours, and Daily Reports

import { OrderItem } from "../orders/page";
import { orderSystemIntegration } from "./systemIntegration";

export interface IntegrationTestResult {
  testName: string;
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

export class IntegrationTester {
  private testResults: IntegrationTestResult[] = [];

  async runAllTests(): Promise<IntegrationTestResult[]> {
    console.log('🚀 Starting Manufacturing System Integration Tests...');
    
    this.testResults = [];
    
    // Test 1: Order Creation and Process Generation
    await this.testOrderToProcessFlow();
    
    // Test 2: Process to Work Hours Integration
    await this.testProcessToWorkHoursFlow();
    
    // Test 3: Work Hours to Daily Reports Integration
    await this.testWorkHoursToDailyReportsFlow();
    
    // Test 4: Real-time Status Tracking
    await this.testRealtimeStatusTracking();
    
    // Test 5: Cross-system Data Synchronization
    await this.testCrossSystemSync();
    
    // Test 6: Dashboard Metrics Calculation
    await this.testDashboardMetrics();
    
    // Test 7: Workflow Visualization Data
    await this.testWorkflowVisualization();
    
    // Test 8: Error Handling and Recovery
    await this.testErrorHandling();

    this.printTestSummary();
    return this.testResults;
  }

  private async testOrderToProcessFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Order → Process Integration';
    
    try {
      // Create test order
      const testOrder: OrderItem = {
        id: 'test-order-001',
        managementNumber: 'TEST-2025-001',
        projectName: 'Integration Test Project',
        client: 'Test Client Co.',
        quantity: 10,
        unit: '個',
        orderDate: '2025-01-30',
        deliveryDate: '2025-02-15',
        description: 'Test order for integration verification',
        estimatedAmount: 100000,
        status: 'planning',
        priority: 'medium',
        progress: 0,
        lastUpdated: new Date().toISOString(),
        createdBy: 'Integration Tester',
        tags: ['test', 'integration'],
      };

      // Test enhanced process creation
      const success = await orderSystemIntegration.createEnhancedProcess(testOrder);
      
      if (success) {
        // Verify process was created in localStorage
        const processes = JSON.parse(localStorage.getItem('processData') || '[]');
        const createdProcess = processes.find((p: any) => p.orderId === testOrder.id);
        
        if (createdProcess) {
          this.addTestResult({
            testName,
            success: true,
            message: '✅ Order successfully created process with enhanced data mapping',
            duration: Date.now() - startTime,
            details: {
              orderId: testOrder.id,
              processId: createdProcess.id,
              workDetails: createdProcess.workDetails,
              complexity: createdProcess.complexity
            }
          });
        } else {
          throw new Error('Process not found in storage after creation');
        }
      } else {
        throw new Error('Enhanced process creation returned false');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Order → Process integration failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testProcessToWorkHoursFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Process → Work Hours Integration';
    
    try {
      // Get the test process created in previous test
      const processes = JSON.parse(localStorage.getItem('processData') || '[]');
      const testProcess = processes.find((p: any) => p.orderId === 'test-order-001');
      
      if (!testProcess) {
        throw new Error('Test process not found for work hours integration test');
      }

      // Verify work hours data was created
      const workHours = JSON.parse(localStorage.getItem('workHoursData') || '[]');
      const relatedWorkHours = workHours.find((w: any) => w.orderId === 'test-order-001');
      
      if (relatedWorkHours) {
        // Test work hours structure
        const hasPlannedHours = relatedWorkHours.plannedHours && 
                               typeof relatedWorkHours.plannedHours.setup === 'number';
        const hasBudget = relatedWorkHours.budget && 
                         typeof relatedWorkHours.budget.totalPlannedCost === 'number';
        
        if (hasPlannedHours && hasBudget) {
          this.addTestResult({
            testName,
            success: true,
            message: '✅ Process data successfully mapped to work hours with budget calculations',
            duration: Date.now() - startTime,
            details: {
              processId: testProcess.id,
              workHoursId: relatedWorkHours.id,
              plannedHours: relatedWorkHours.plannedHours,
              budget: relatedWorkHours.budget
            }
          });
        } else {
          throw new Error('Work hours data structure is incomplete');
        }
      } else {
        throw new Error('Work hours data not found for test process');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Process → Work Hours integration failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testWorkHoursToDailyReportsFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Work Hours → Daily Reports Integration';
    
    try {
      // Create mock daily report data linked to test order
      const mockDailyReport = {
        id: 'test-daily-report-001',
        orderId: 'test-order-001',
        workerId: 'test-worker-001',
        workerName: 'Test Worker',
        date: '2025-01-30',
        totalWorkMinutes: 480, // 8 hours
        workTimeEntries: [
          {
            id: 'entry-001',
            startTime: '09:00',
            endTime: '17:00',
            productionNumber: 'TEST-2025-001',
            workContentId: '1',
            workContentName: 'データ',
            durationMinutes: 480
          }
        ],
        isSubmitted: true,
        approved: false
      };

      // Store mock daily report
      const existingReports = JSON.parse(localStorage.getItem('dailyReportsData') || '[]');
      localStorage.setItem('dailyReportsData', JSON.stringify([...existingReports, mockDailyReport]));

      // Test integration tracking
      const integrationData = await orderSystemIntegration.trackOrderStatus('test-order-001');
      
      if (integrationData) {
        const hasConnectedReports = integrationData.connectedDailyReports.length > 0;
        
        if (hasConnectedReports) {
          this.addTestResult({
            testName,
            success: true,
            message: '✅ Work hours successfully linked to daily reports with activity tracking',
            duration: Date.now() - startTime,
            details: {
              orderId: 'test-order-001',
              connectedReports: integrationData.connectedDailyReports.length,
              reportData: integrationData.connectedDailyReports[0]
            }
          });
        } else {
          throw new Error('Daily reports not linked to work hours data');
        }
      } else {
        throw new Error('Integration data not available for tracking test');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Work Hours → Daily Reports integration failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testRealtimeStatusTracking(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Real-time Status Tracking';
    
    try {
      // Test order status tracking
      const integrationData = await orderSystemIntegration.trackOrderStatus('test-order-001');
      
      if (integrationData) {
        const hasOrderData = integrationData.orderData !== null;
        const hasSystemHealth = integrationData.systemHealth !== null;
        const hasLastSyncTime = integrationData.lastSyncTime !== null;
        
        const healthCheck = integrationData.systemHealth.overall === 'healthy' &&
                           integrationData.systemHealth.ordersSync &&
                           integrationData.systemHealth.processesSync;
        
        if (hasOrderData && hasSystemHealth && hasLastSyncTime && healthCheck) {
          this.addTestResult({
            testName,
            success: true,
            message: '✅ Real-time status tracking operational with system health monitoring',
            duration: Date.now() - startTime,
            details: {
              orderId: integrationData.orderId,
              systemHealth: integrationData.systemHealth,
              connectedSystems: {
                processes: integrationData.connectedProcesses.length,
                workHours: integrationData.connectedWorkHours.length,
                dailyReports: integrationData.connectedDailyReports.length
              }
            }
          });
        } else {
          throw new Error('Real-time tracking data incomplete or system health check failed');
        }
      } else {
        throw new Error('Real-time status tracking returned null data');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Real-time status tracking failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testCrossSystemSync(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Cross-system Data Synchronization';
    
    try {
      // Test system-wide sync
      const syncSuccess = await orderSystemIntegration.syncSystemData('test-order-001');
      
      if (syncSuccess) {
        // Verify data consistency across systems
        const processes = JSON.parse(localStorage.getItem('processData') || '[]');
        const workHours = JSON.parse(localStorage.getItem('workHoursData') || '[]');
        const dailyReports = JSON.parse(localStorage.getItem('dailyReportsData') || '[]');
        
        const testProcess = processes.find((p: any) => p.orderId === 'test-order-001');
        const testWorkHours = workHours.find((w: any) => w.orderId === 'test-order-001');
        const testReports = dailyReports.filter((r: any) => r.orderId === 'test-order-001');
        
        const dataConsistency = testProcess && testWorkHours && testReports.length > 0 &&
                               testProcess.orderId === testWorkHours.orderId;
        
        if (dataConsistency) {
          this.addTestResult({
            testName,
            success: true,
            message: '✅ Cross-system synchronization maintains data consistency',
            duration: Date.now() - startTime,
            details: {
              syncedSystems: ['orders', 'processes', 'workHours', 'dailyReports'],
              dataConsistency: true,
              orderId: 'test-order-001'
            }
          });
        } else {
          throw new Error('Data consistency check failed after sync');
        }
      } else {
        throw new Error('Cross-system sync returned false');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Cross-system synchronization failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testDashboardMetrics(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Dashboard Metrics Calculation';
    
    try {
      const metrics = orderSystemIntegration.getRealtimeDashboardMetrics();
      
      const hasRequiredMetrics = typeof metrics.activeOrders === 'number' &&
                                typeof metrics.systemIntegrationHealth === 'number' &&
                                typeof metrics.avgProcessingTime === 'number' &&
                                typeof metrics.orderCompletionRate === 'number' &&
                                Array.isArray(metrics.criticalAlerts);
      
      if (hasRequiredMetrics) {
        this.addTestResult({
          testName,
          success: true,
          message: '✅ Dashboard metrics calculated successfully with all required data points',
          duration: Date.now() - startTime,
          details: {
            metrics: {
              activeOrders: metrics.activeOrders,
              systemHealth: `${metrics.systemIntegrationHealth}%`,
              avgProcessingTime: `${metrics.avgProcessingTime} days`,
              completionRate: `${metrics.orderCompletionRate}%`,
              alertCount: metrics.criticalAlerts.length
            }
          }
        });
      } else {
        throw new Error('Dashboard metrics missing required data points');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Dashboard metrics calculation failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testWorkflowVisualization(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Workflow Visualization Data';
    
    try {
      const workflowData = orderSystemIntegration.getWorkflowVisualizationData('test-order-001');
      
      const hasStages = Array.isArray(workflowData.stages) && workflowData.stages.length > 0;
      
      if (hasStages) {
        const stagesValid = workflowData.stages.every(stage => 
          typeof stage.name === 'string' &&
          ['completed', 'active', 'pending', 'blocked'].includes(stage.status) &&
          typeof stage.progress === 'number' &&
          typeof stage.estimatedCompletion === 'string' &&
          Array.isArray(stage.resources)
        );
        
        if (stagesValid) {
          this.addTestResult({
            testName,
            success: true,
            message: '✅ Workflow visualization data generated with all manufacturing stages',
            duration: Date.now() - startTime,
            details: {
              stageCount: workflowData.stages.length,
              stages: workflowData.stages.map(s => ({
                name: s.name,
                status: s.status,
                progress: `${s.progress}%`
              }))
            }
          });
        } else {
          throw new Error('Workflow stages data structure validation failed');
        }
      } else {
        throw new Error('Workflow visualization data missing or empty stages');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Workflow visualization data generation failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Error Handling and Recovery';
    
    try {
      // Test with invalid order ID
      const invalidResult = await orderSystemIntegration.trackOrderStatus('invalid-order-id');
      
      // Should return null for invalid order
      if (invalidResult === null) {
        // Test with malformed data
        const originalData = localStorage.getItem('processData');
        localStorage.setItem('processData', 'invalid-json');
        
        try {
          const workflowData = orderSystemIntegration.getWorkflowVisualizationData('test-order-001');
          // Should return empty stages array for error case
          if (Array.isArray(workflowData.stages)) {
            // Restore original data
            if (originalData) localStorage.setItem('processData', originalData);
            
            this.addTestResult({
              testName,
              success: true,
              message: '✅ Error handling works correctly with graceful degradation',
              duration: Date.now() - startTime,
              details: {
                invalidOrderHandling: 'null returned as expected',
                malformedDataHandling: 'empty array returned as expected',
                systemRecovery: 'data restored successfully'
              }
            });
          } else {
            throw new Error('Error handling did not return expected fallback data');
          }
        } catch (innerError) {
          // Restore original data even if test fails
          if (originalData) localStorage.setItem('processData', originalData);
          throw innerError;
        }
      } else {
        throw new Error('Invalid order ID should return null');
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `❌ Error handling test failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private addTestResult(result: IntegrationTestResult): void {
    this.testResults.push(result);
  }

  private printTestSummary(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 MANUFACTURING SYSTEM INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('='.repeat(80));
    
    this.testResults.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.testName} (${result.duration}ms)`);
      console.log(`   ${result.message.replace(/^[✅❌]\s*/, '')}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');
    });
    
    if (failedTests === 0) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED! System is ready for production.');
    } else {
      console.log(`⚠️  ${failedTests} tests failed. Please review and fix issues before deployment.`);
    }
    console.log('='.repeat(80));
  }

  // Cleanup test data
  async cleanup(): Promise<void> {
    try {
      // Remove test data from localStorage
      const processes = JSON.parse(localStorage.getItem('processData') || '[]');
      const workHours = JSON.parse(localStorage.getItem('workHoursData') || '[]');
      const dailyReports = JSON.parse(localStorage.getItem('dailyReportsData') || '[]');
      
      const cleanProcesses = processes.filter((p: any) => p.orderId !== 'test-order-001');
      const cleanWorkHours = workHours.filter((w: any) => w.orderId !== 'test-order-001');
      const cleanDailyReports = dailyReports.filter((r: any) => r.orderId !== 'test-order-001');
      
      localStorage.setItem('processData', JSON.stringify(cleanProcesses));
      localStorage.setItem('workHoursData', JSON.stringify(cleanWorkHours));
      localStorage.setItem('dailyReportsData', JSON.stringify(cleanDailyReports));
      
      console.log('🧹 Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Error during test cleanup:', error);
    }
  }
}

// Export test runner function
export const runIntegrationTests = async (): Promise<IntegrationTestResult[]> => {
  const tester = new IntegrationTester();
  const results = await tester.runAllTests();
  await tester.cleanup();
  return results;
};