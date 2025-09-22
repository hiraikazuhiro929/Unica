import { exportToExcel, generateFileName } from './exportUtils';
import { getOrders } from '@/lib/firebase/orders';
import { getProcessesList } from '@/lib/firebase/processes';
import { getWorkHoursList } from '@/lib/firebase/workHours';

export interface ComprehensiveExportOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeCompleted?: boolean;
  includeActive?: boolean;
  orderIds?: string[];
}

// 案件ベースの包括的エクスポート
export const exportComprehensiveProjectData = async (
  format: 'csv' | 'excel' = 'excel',
  options: ComprehensiveExportOptions = {}
) => {
  try {
    console.log('🔄 包括的プロジェクトデータエクスポート開始...');

    // 各データを取得
    const [ordersResult, processesResult, workHoursResult] = await Promise.all([
      getOrders({ limit: 1000 }),
      getProcessesList({ limit: 1000 }),
      getWorkHoursList({ limit: 1000 })
    ]);

    if (!ordersResult.success) {
      throw new Error(`受注案件データの取得に失敗: ${ordersResult.error}`);
    }
    if (processesResult.error) {
      throw new Error(`工程データの取得に失敗: ${processesResult.error}`);
    }
    if (workHoursResult.error) {
      throw new Error(`工数データの取得に失敗: ${workHoursResult.error}`);
    }

    let orders = ordersResult.data || [];
    const processes = processesResult.data || [];
    const workHours = workHoursResult.data || [];

    // フィルタリング
    if (options.dateRange) {
      const { start, end } = options.dateRange;
      orders = orders.filter(order => {
        const date = new Date(order.orderDate || order.createdAt);
        return date >= start && date <= end;
      });
    }

    if (options.orderIds && options.orderIds.length > 0) {
      orders = orders.filter(order => options.orderIds!.includes(order.id!));
    }

    // 完了済みデータのみをエクスポート（過去の記録目的）
    orders = orders.filter(order => order.status === 'completed');

    if (orders.length === 0) {
      throw new Error('完了済みの案件がありません。アーカイブデータはありません。');
    }

    // 案件ベースでデータを結合
    const comprehensiveData = await buildComprehensiveProjectData(orders, processes, workHours);

    // エクスポート実行
    const filename = generateFileName('包括的プロジェクトデータ', options.dateRange?.start);

    if (format === 'excel') {
      await exportComprehensiveExcel(comprehensiveData, filename);
    } else {
      // CSV版は簡略化したデータ
      exportToExcel(comprehensiveData.summary, filename, '包括的データ');
    }

    console.log('✅ 包括的プロジェクトデータエクスポート完了');
    return {
      success: true,
      message: `包括的プロジェクトデータを${format.toUpperCase()}形式でエクスポートしました`,
      projectCount: comprehensiveData.summary.length
    };

  } catch (error) {
    console.error('❌ 包括的エクスポートエラー:', error);
    return {
      success: false,
      message: 'エクスポートに失敗しました',
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};

// 案件ベースの包括データ構築
const buildComprehensiveProjectData = async (orders: any[], processes: any[], workHours: any[]) => {
  const comprehensiveData = {
    summary: [] as any[],
    detailed: [] as any[],
    timeline: [] as any[]
  };

  for (const order of orders) {
    // この案件に関連する工程を取得
    const relatedProcesses = processes.filter(process =>
      process.managementNumber === order.managementNumber ||
      process.orderId === order.id ||
      process.projectName === order.projectName
    );

    // この案件に関連する工数を取得
    const relatedWorkHours = workHours.filter(wh =>
      wh.managementNumber === order.managementNumber ||
      wh.orderId === order.id ||
      wh.projectName === order.projectName
    );

    // 工程に紐づく工数も取得
    const processWorkHours = relatedProcesses.flatMap(process =>
      workHours.filter(wh => wh.processId === process.id)
    );

    const allRelatedWorkHours = [...relatedWorkHours, ...processWorkHours]
      .filter((wh, index, self) => self.findIndex(w => w.id === wh.id) === index); // 重複除去

    // 集計データ（数値変換付き）
    const totalPlannedHours = relatedProcesses.reduce((sum, p) => {
      return sum + parseNumericValue(p.plannedHours);
    }, 0);

    const totalActualHours = allRelatedWorkHours.reduce((sum, wh) => {
      return sum + parseNumericValue(wh.actualHours);
    }, 0);

    const totalPlannedCost = relatedProcesses.reduce((sum, p) => {
      return sum + parseNumericValue(p.budget);
    }, 0);

    const totalActualCost = allRelatedWorkHours.reduce((sum, wh) => {
      return sum + parseNumericValue(wh.actualCost);
    }, 0);

    // 開始・終了日の算出
    const processStartDates = relatedProcesses
      .map(p => p.actualStartDate || p.startDate)
      .filter(Boolean)
      .map(d => new Date(d));
    const processEndDates = relatedProcesses
      .map(p => p.actualEndDate || p.endDate)
      .filter(Boolean)
      .map(d => new Date(d));

    const actualStartDate = processStartDates.length > 0 ?
      new Date(Math.min(...processStartDates.map(d => d.getTime()))) : null;
    const actualEndDate = processEndDates.length > 0 ?
      new Date(Math.max(...processEndDates.map(d => d.getTime()))) : null;

    // サマリーデータ
    comprehensiveData.summary.push({
      管理番号: order.managementNumber,
      案件名: order.projectName,
      客先名: order.client,
      受注日: order.orderDate,
      納期: order.deliveryDate,
      受注金額: order.estimatedAmount ? `¥${Number(order.estimatedAmount).toLocaleString()}` : '',
      案件ステータス: getOrderStatusText(order.status),

      // 工程情報
      工程数: relatedProcesses.length,
      完了工程数: relatedProcesses.filter(p => p.status === 'completed').length,

      // 作業実績
      実作業開始日: actualStartDate ? actualStartDate.toLocaleDateString('ja-JP') : '',
      実作業終了日: actualEndDate ? actualEndDate.toLocaleDateString('ja-JP') : '',

      // 工数情報
      予定工数: `${totalPlannedHours}時間`,
      実績工数: `${totalActualHours}時間`,
      工数差異: `${totalActualHours - totalPlannedHours}時間`,
      工数効率: totalPlannedHours > 0 && totalActualHours > 0 ?
        `${((totalPlannedHours / totalActualHours) * 100).toFixed(1)}%` : '',

      // コスト情報
      予定コスト: totalPlannedCost > 0 ? `¥${totalPlannedCost.toLocaleString()}` : '',
      実績コスト: totalActualCost > 0 ? `¥${totalActualCost.toLocaleString()}` : '',
      コスト差異: `¥${(totalActualCost - totalPlannedCost).toLocaleString()}`,

      // 収益性
      粗利: order.estimatedAmount && totalActualCost > 0 ?
        `¥${(Number(order.estimatedAmount) - totalActualCost).toLocaleString()}` : '',
      粗利率: order.estimatedAmount && totalActualCost > 0 ?
        `${(((Number(order.estimatedAmount) - totalActualCost) / Number(order.estimatedAmount)) * 100).toFixed(1)}%` : '',

      作成日: order.createdAt,
      更新日: order.updatedAt
    });

    // 詳細データ（工程別）
    relatedProcesses.forEach(process => {
      const processWorkHours = allRelatedWorkHours.filter(wh => wh.processId === process.id);
      const processActualHours = processWorkHours.reduce((sum, wh) => {
        return sum + parseNumericValue(wh.actualHours);
      }, 0);
      const processActualCost = processWorkHours.reduce((sum, wh) => {
        return sum + parseNumericValue(wh.actualCost);
      }, 0);

      const plannedHours = parseNumericValue(process.plannedHours);
      const plannedCost = parseNumericValue(process.budget);

      comprehensiveData.detailed.push({
        管理番号: order.managementNumber,
        案件名: order.projectName,
        客先名: order.client,

        // 工程情報
        工程名: process.name,
        工程ステータス: getProcessStatusText(process.status),
        担当者: process.assignee,
        使用機械: process.machineName || process.machine,

        // 予定情報
        開始予定日: process.startDate,
        完了予定日: process.endDate,
        予定工数: plannedHours > 0 ? `${plannedHours}時間` : '',
        予定コスト: plannedCost > 0 ? `¥${plannedCost.toLocaleString()}` : '',

        // 実績情報
        実開始日: process.actualStartDate,
        実完了日: process.actualEndDate,
        実績工数: `${processActualHours}時間`,
        実績コスト: processActualCost > 0 ? `¥${processActualCost.toLocaleString()}` : '',

        // 差異分析
        工数差異: `${processActualHours - plannedHours}時間`,
        コスト差異: `¥${(processActualCost - plannedCost).toLocaleString()}`,
        進捗率: process.progress ? `${process.progress}%` : '',

        備考: process.notes || process.description
      });
    });

    // タイムラインデータ（作業履歴）
    allRelatedWorkHours.forEach(wh => {
      const actualHours = parseNumericValue(wh.actualHours);
      const actualCost = parseNumericValue(wh.actualCost);

      comprehensiveData.timeline.push({
        管理番号: order.managementNumber,
        案件名: order.projectName,
        客先名: order.client,

        // 作業情報
        作業日: wh.date,
        工程名: wh.processName || wh.name,
        作業者: wh.assignee || wh.workerName,
        機械: wh.machineName,

        // 時間情報
        作業時間: actualHours > 0 ? `${actualHours}時間` : '',
        作業コスト: actualCost > 0 ? `¥${actualCost.toLocaleString()}` : '',

        // 詳細
        作業内容: wh.description || wh.notes,
        ステータス: getWorkHoursStatusText(wh.status),

        記録日時: wh.createdAt
      });
    });
  }

  return comprehensiveData;
};

// Excel出力（複数シート）
const exportComprehensiveExcel = async (data: any, filename: string) => {
  const XLSX = await import('xlsx');

  // ワークブック作成
  const workbook = XLSX.utils.book_new();

  // 1. サマリーシート
  const summarySheet = XLSX.utils.json_to_sheet(data.summary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '案件サマリー');

  // 2. 詳細シート（工程別）
  const detailedSheet = XLSX.utils.json_to_sheet(data.detailed);
  XLSX.utils.book_append_sheet(workbook, detailedSheet, '工程詳細');

  // 3. タイムラインシート（作業履歴）
  const timelineSheet = XLSX.utils.json_to_sheet(data.timeline);
  XLSX.utils.book_append_sheet(workbook, timelineSheet, '作業履歴');

  // 列幅自動調整
  [summarySheet, detailedSheet, timelineSheet].forEach(sheet => {
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
};

// ステータステキスト変換関数
const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'planning': '計画中',
    'data-work': 'データ作業中',
    'processing': '進行中',
    'completed': '完了',
    'delayed': '遅延'
  };
  return statusMap[status] || status || '';
};

const getProcessStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'not-started': '未着手',
    'in-progress': '進行中',
    'completed': '完了',
    'on-hold': '保留',
    'delayed': '遅延'
  };
  return statusMap[status] || status || '';
};

const getWorkHoursStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'planning': '計画中',
    'in-progress': '進行中',
    'completed': '完了',
    'delayed': '遅延',
    'on-hold': '一時停止'
  };
  return statusMap[status] || status || '';
};

// 数値解析関数（文字列から数値を抽出）
const parseNumericValue = (value: any): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // "123時間", "¥1,234", "123.45", "1,234円" など様々な形式に対応
    const cleanValue = value
      .replace(/[¥,円時間分]/g, '') // 通貨記号、単位、カンマを除去
      .replace(/\s+/g, '') // 空白除去
      .trim();

    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? 0 : numValue;
  }

  return 0;
};