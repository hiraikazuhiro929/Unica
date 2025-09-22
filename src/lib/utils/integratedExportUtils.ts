import { exportToCSV, exportToExcel, generateFileName } from './exportUtils';
import { getOrders } from '@/lib/firebase/orders';
import { getProcessesList } from '@/lib/firebase/processes';
import { getWorkHoursList } from '@/lib/firebase/workHours';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface IntegratedExportOptions {
  dateRange?: DateRange;
  includeDrafts?: boolean;
  includeCompleted?: boolean;
  includeActive?: boolean;
}

// 統合データエクスポート（案件・工程・工数を1つのExcelファイルに）
export const exportIntegratedData = async (
  format: 'csv' | 'excel',
  options: IntegratedExportOptions = {}
) => {
  try {
    console.log('🔄 統合データエクスポート開始...');

    // 認証チェック（必要に応じて）
    if (typeof window !== 'undefined') {
      const { auth } = await import('@/lib/firebase/config');
      if (!auth.currentUser) {
        throw new Error('認証が必要です');
      }
    }

    // 各データを個別取得（デバッグのため）
    console.log('📦 受注案件データ取得中...');
    const ordersResult = await getOrders({ limit: 1000 });
    console.log('📦 Orders result:', ordersResult);

    console.log('📦 工程データ取得中...');
    const processesResult = await getProcessesList({ limit: 1000 });
    console.log('📦 Processes result:', processesResult);

    console.log('📦 工数データ取得中...');
    const workHoursResult = await getWorkHoursList({ limit: 1000 });
    console.log('📦 WorkHours result:', workHoursResult);

    // Orders result check
    if (!ordersResult.success) {
      throw new Error(`受注案件データの取得に失敗しました: ${ordersResult.error}`);
    }

    // Processes result check (different format)
    if (processesResult.error) {
      throw new Error(`工程データの取得に失敗しました: ${processesResult.error}`);
    }

    // Work hours result check (different format)
    if (workHoursResult.error) {
      throw new Error(`工数データの取得に失敗しました: ${workHoursResult.error}`);
    }

    let orders = ordersResult.data || [];
    let processes = processesResult.data || [];
    let workHours = workHoursResult.data || [];

    // 期間フィルタリング
    if (options.dateRange) {
      const { start, end } = options.dateRange;

      orders = orders.filter(item => {
        const date = new Date(item.orderDate || item.createdAt);
        return date >= start && date <= end;
      });

      processes = processes.filter(item => {
        const date = new Date(item.startDate || item.createdAt);
        return date >= start && date <= end;
      });

      workHours = workHours.filter(item => {
        const date = new Date(item.date || item.createdAt);
        return date >= start && date <= end;
      });
    }

    // ステータスフィルタリング
    if (!options.includeCompleted) {
      orders = orders.filter(item => item.status !== 'completed');
      processes = processes.filter(item => item.status !== 'completed');
      workHours = workHours.filter(item => item.status !== 'completed');
    }

    if (!options.includeActive) {
      orders = orders.filter(item => item.status === 'completed');
      processes = processes.filter(item => item.status === 'completed');
      workHours = workHours.filter(item => item.status === 'completed');
    }

    // データ整形
    const exportData = {
      orders: formatOrdersForExport(orders),
      processes: formatProcessesForExport(processes),
      workHours: formatWorkHoursForExport(workHours)
    };

    // ファイル名生成
    const filePrefix = options.includeCompleted && options.includeActive ? '統合データ' :
                      options.includeCompleted ? '完了済み統合データ' :
                      options.includeActive ? '稼働中統合データ' : '統合データ';

    const filename = generateFileName(filePrefix, options.dateRange?.start);

    if (format === 'csv') {
      // CSVの場合は3つのファイルを生成
      exportToCSV(exportData.orders, `${filename}_受注案件`);
      exportToCSV(exportData.processes, `${filename}_工程管理`);
      exportToCSV(exportData.workHours, `${filename}_工数管理`);
    } else {
      // Excelの場合は3つのシートを持つ1つのファイル
      exportIntegratedExcel(exportData, filename);
    }

    console.log('✅ 統合データエクスポート完了');
    return {
      success: true,
      message: `${format.toUpperCase()}形式でエクスポートしました`,
      counts: {
        orders: exportData.orders.length,
        processes: exportData.processes.length,
        workHours: exportData.workHours.length
      }
    };

  } catch (error) {
    console.error('❌ 統合データエクスポートエラー:', error);
    return {
      success: false,
      message: 'エクスポートに失敗しました',
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};

// 受注案件データの整形
const formatOrdersForExport = (orders: any[]) => {
  return orders.map(order => ({
    管理番号: order.managementNumber || '',
    受注日: order.orderDate || order.createdAt?.split('T')[0] || '',
    客先名: order.client || order.clientName || '',
    案件名: order.projectName || order.productName || '',
    数量: order.quantity || '',
    金額: order.estimatedAmount ? `¥${Number(order.estimatedAmount).toLocaleString()}` : '',
    納期: order.deliveryDate || order.dueDate || '',
    ステータス: getStatusText(order.status, 'order'),
    優先度: getPriorityText(order.priority),
    担当者: order.assignee || '',
    備考: order.notes || '',
    作成日時: order.createdAt || '',
    更新日時: order.updatedAt || ''
  }));
};

// 工程管理データの整形
const formatProcessesForExport = (processes: any[]) => {
  return processes.map(process => ({
    行番号: process.lineNumber || '',
    管理番号: process.managementNumber || '',
    工程名: process.name || '',
    客先: process.companyName || process.client || '',
    案件名: process.projectName || '',
    開始予定日: process.startDate || '',
    完了予定日: process.endDate || process.dueDate || '',
    実開始日: process.actualStartDate || '',
    実完了日: process.actualEndDate || '',
    担当者: process.assignee || '',
    使用機械: process.machineName || process.machine || '',
    予定工数: process.plannedHours ? `${process.plannedHours}時間` : '',
    実績工数: process.actualHours ? `${process.actualHours}時間` : '',
    進捗率: process.progress ? `${process.progress}%` : '',
    ステータス: getStatusText(process.status, 'process'),
    優先度: getPriorityText(process.priority),
    予算: process.budget ? `¥${Number(process.budget).toLocaleString()}` : '',
    実績コスト: process.actualCost ? `¥${Number(process.actualCost).toLocaleString()}` : '',
    備考: process.notes || process.description || '',
    作成日時: process.createdAt || '',
    更新日時: process.updatedAt || ''
  }));
};

// 工数管理データの整形
const formatWorkHoursForExport = (workHours: any[]) => {
  return workHours.map(wh => ({
    日付: wh.date || wh.createdAt?.split('T')[0] || '',
    管理番号: wh.managementNumber || '',
    案件名: wh.projectName || '',
    客先: wh.client || wh.clientName || '',
    工程名: wh.processName || wh.name || '',
    作業者: wh.assignee || wh.workerName || '',
    機械: wh.machineName || '',
    予定工数: wh.plannedHours ? `${wh.plannedHours}時間` : '',
    実績工数: wh.actualHours ? `${wh.actualHours}時間` : '',
    進捗率: wh.progress ? `${wh.progress}%` : wh.progressRate ? `${wh.progressRate}%` : '',
    予定コスト: wh.plannedCost ? `¥${Number(wh.plannedCost).toLocaleString()}` : '',
    実績コスト: wh.actualCost ? `¥${Number(wh.actualCost).toLocaleString()}` : '',
    ステータス: getStatusText(wh.status, 'work'),
    備考: wh.notes || wh.description || '',
    作成日時: wh.createdAt || '',
    更新日時: wh.updatedAt || ''
  }));
};

// ステータステキスト変換
const getStatusText = (status: string, type: 'order' | 'process' | 'work') => {
  const statusMap: Record<string, Record<string, string>> = {
    order: {
      'completed': '完了',
      'processing': '進行中',
      'planning': '計画中',
      'data-work': 'データ作業中'
    },
    process: {
      'not-started': '未着手',
      'in-progress': '進行中',
      'completed': '完了',
      'on-hold': '保留',
      'delayed': '遅延'
    },
    work: {
      'planning': '計画中',
      'in-progress': '進行中',
      'completed': '完了',
      'delayed': '遅延',
      'on-hold': '一時停止'
    }
  };

  return statusMap[type]?.[status] || status || '';
};

// 優先度テキスト変換
const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低',
    'urgent': '緊急',
    'vip': 'VIP'
  };

  return priorityMap[priority] || priority || '';
};

// Excel統合ファイル生成
const exportIntegratedExcel = (data: any, filename: string) => {
  // XLSXライブラリを動的インポート
  import('xlsx').then(XLSX => {
    // ワークブック作成
    const workbook = XLSX.utils.book_new();

    // 各シートを追加
    const ordersSheet = XLSX.utils.json_to_sheet(data.orders);
    const processesSheet = XLSX.utils.json_to_sheet(data.processes);
    const workHoursSheet = XLSX.utils.json_to_sheet(data.workHours);

    XLSX.utils.book_append_sheet(workbook, ordersSheet, '受注案件');
    XLSX.utils.book_append_sheet(workbook, processesSheet, '工程管理');
    XLSX.utils.book_append_sheet(workbook, workHoursSheet, '工数管理');

    // 列幅の自動調整
    [ordersSheet, processesSheet, workHoursSheet].forEach(sheet => {
      if (sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const cols = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxWidth = 10;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            if (cell && cell.v) {
              const cellLength = String(cell.v).length;
              maxWidth = Math.max(maxWidth, Math.min(cellLength, 50));
            }
          }
          cols[C] = { wch: maxWidth };
        }
        sheet['!cols'] = cols;
      }
    });

    // ファイル保存
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  });
};

// 期間エクスポート用のユーティリティ
export const exportByPeriod = async (
  period: 'month' | 'quarter' | 'year',
  targetDate: Date = new Date(),
  format: 'csv' | 'excel' = 'excel'
) => {
  const dateRange = getDateRangeForPeriod(period, targetDate);

  return await exportIntegratedData(format, {
    dateRange,
    includeCompleted: true,
    includeActive: true
  });
};

// 期間の計算
const getDateRangeForPeriod = (period: 'month' | 'quarter' | 'year', targetDate: Date): DateRange => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  switch (period) {
    case 'month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59)
      };

    case 'quarter':
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, quarterStartMonth, 1),
        end: new Date(year, quarterStartMonth + 3, 0, 23, 59, 59)
      };

    case 'year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59)
      };
  }
};

// 完了データのみエクスポート
export const exportCompletedData = async (
  dateRange?: DateRange,
  format: 'csv' | 'excel' = 'excel'
) => {
  return await exportIntegratedData(format, {
    dateRange,
    includeCompleted: true,
    includeActive: false
  });
};

// 稼働中データのみエクスポート
export const exportActiveData = async (
  format: 'csv' | 'excel' = 'excel'
) => {
  return await exportIntegratedData(format, {
    includeCompleted: false,
    includeActive: true
  });
};