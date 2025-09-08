import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// CSVエクスポート用のヘルパー関数
export const exportToCSV = (
  data: any[],
  filename: string,
  headers?: { [key: string]: string }
) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // ヘッダー行の作成
  const keys = Object.keys(data[0]);
  const headerRow = headers 
    ? keys.map(key => headers[key] || key)
    : keys;

  // データ行の作成
  const csvContent = [
    headerRow.join(','),
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        // 値の処理（カンマや改行を含む場合は引用符で囲む）
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',')
    )
  ].join('\n');

  // BOMを追加（Excelで開いたときの文字化け対策）
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  
  saveAs(blob, `${filename}.csv`);
};

// Excelエクスポート用のヘルパー関数
export const exportToExcel = (
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1',
  headers?: { [key: string]: string }
) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // ヘッダーの変換
  const processedData = headers
    ? data.map(row => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          newRow[headers[key] || key] = row[key];
        });
        return newRow;
      })
    : data;

  // ワークブックの作成
  const worksheet = XLSX.utils.json_to_sheet(processedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 列幅の自動調整
  const maxWidth = 50;
  const cols = Object.keys(processedData[0]).map(key => ({
    wch: Math.min(maxWidth, Math.max(key.length, ...processedData.map(row => 
      String(row[key] || '').length
    )))
  }));
  worksheet['!cols'] = cols;

  // ファイルの書き出し
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// 日付範囲でデータをフィルタリング
export const filterByDateRange = <T extends { [key: string]: any }>(
  data: T[],
  dateField: string,
  startDate: Date,
  endDate: Date
): T[] => {
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= startDate && itemDate <= endDate;
  });
};

// ファイル名の生成（年月を含む）
export const generateFileName = (
  prefix: string,
  date: Date = new Date(),
  suffix?: string
): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const baseName = `${year}${month}${day}_${prefix}`;
  return suffix ? `${baseName}_${suffix}` : baseName;
};

// 日報用のエクスポート関数（詳細版）
export const exportDailyReports = (
  reports: any[],
  format: 'csv' | 'excel',
  dateRange?: { start: Date; end: Date }
) => {
  // フィルタリング
  const filteredData = dateRange
    ? filterByDateRange(reports, 'date', dateRange.start, dateRange.end)
    : reports;

  // データの整形（作業時間詳細も含む）
  const exportData: any[] = [];
  
  filteredData.forEach(report => {
    // 基本情報行
    const baseRow = {
      日付: report.date,
      作業者: report.workerName,
      総作業時間: `${Math.floor(report.totalWorkMinutes / 60)}時間${report.totalWorkMinutes % 60}分`,
      作業内容: '',
      開始時刻: '',
      終了時刻: '',
      作業時間: '',
      工程名: '',
      今日の目標: report.todaysGoals,
      今日の成果: report.todaysResults,
      うまくいったこと: report.whatWentWell,
      うまくいかなかったこと: report.whatDidntGoWell,
      管理への要望: report.requestsToManagement,
      提出状態: report.isSubmitted ? '提出済み' : '下書き',
      確認状態: report.approved ? '確認済み' : '未確認',
    };

    // 作業時間詳細がある場合
    if (report.workTimeEntries && report.workTimeEntries.length > 0) {
      report.workTimeEntries.forEach((entry: any, index: number) => {
        if (index === 0) {
          // 最初のエントリは基本情報と同じ行に
          exportData.push({
            ...baseRow,
            作業内容: entry.content,
            開始時刻: entry.startTime,
            終了時刻: entry.endTime,
            作業時間: `${entry.durationMinutes}分`,
            工程名: entry.processName || '',
          });
        } else {
          // 2番目以降は別行で
          exportData.push({
            日付: '',
            作業者: '',
            総作業時間: '',
            作業内容: entry.content,
            開始時刻: entry.startTime,
            終了時刻: entry.endTime,
            作業時間: `${entry.durationMinutes}分`,
            工程名: entry.processName || '',
            今日の目標: '',
            今日の成果: '',
            うまくいったこと: '',
            うまくいかなかったこと: '',
            管理への要望: '',
            提出状態: '',
            確認状態: '',
          });
        }
      });
    } else {
      // 作業時間詳細がない場合は基本情報のみ
      exportData.push(baseRow);
    }
  });

  const filename = generateFileName('日報', dateRange?.start);
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '日報一覧');
  }
};

// 受注案件用のエクスポート関数
export const exportOrders = (
  orders: any[],
  format: 'csv' | 'excel',
  dateRange?: { start: Date; end: Date }
) => {
  const filteredData = dateRange
    ? filterByDateRange(orders, 'orderDate', dateRange.start, dateRange.end)
    : orders;

  const exportData = filteredData.map(order => ({
    管理番号: order.managementNumber || '',
    受注日: order.orderDate || order.createdAt?.split('T')[0] || '',
    客先名: order.client || order.clientName || '',
    案件名: order.projectName || order.productName || '',
    数量: order.quantity || '',
    金額: order.totalAmount ? `¥${Number(order.totalAmount).toLocaleString()}` : '',
    納期: order.dueDate || order.deliveryDate || '',
    ステータス: order.status === 'planning' ? '計画中' : 
               order.status === 'data-work' ? 'データ作業中' :
               order.status === 'processing' ? '進行中' :
               order.status === 'completed' ? '完了' : order.status || '',
    優先度: order.priority === 'high' ? '高' : 
            order.priority === 'medium' ? '中' :
            order.priority === 'low' ? '低' : order.priority || '',
    担当者: order.assignee || '',
    備考: order.notes || '',
  }));

  const filename = generateFileName('受注案件', dateRange?.start);
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '受注案件一覧');
  }
};

// 工数管理用のエクスポート関数
export const exportWorkHours = (
  workHours: any[],
  format: 'csv' | 'excel',
  dateRange?: { start: Date; end: Date }
) => {
  const filteredData = dateRange
    ? filterByDateRange(workHours, 'date', dateRange.start, dateRange.end)
    : workHours;

  const exportData = filteredData.map(wh => ({
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
    ステータス: wh.status === 'planning' ? '計画中' :
                wh.status === 'in-progress' ? '進行中' :
                wh.status === 'completed' ? '完了' :
                wh.status === 'delayed' ? '遅延' :
                wh.status === 'on-hold' ? '一時停止' : wh.status || '',
    備考: wh.notes || wh.description || '',
  }));

  const filename = generateFileName('工数実績', dateRange?.start);
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '工数実績一覧');
  }
};

// 工程管理用のエクスポート関数
export const exportProcesses = (
  processes: any[],
  format: 'csv' | 'excel',
  dateRange?: { start: Date; end: Date }
) => {
  const filteredData = dateRange
    ? filterByDateRange(processes, 'startDate', dateRange.start, dateRange.end)
    : processes;

  const exportData = filteredData.map(process => ({
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
    ステータス: process.status === 'not-started' ? '未着手' :
                process.status === 'in-progress' ? '進行中' :
                process.status === 'completed' ? '完了' :
                process.status === 'on-hold' ? '保留' :
                process.status === 'delayed' ? '遅延' : process.status || '',
    優先度: process.priority === 'high' ? '高' :
            process.priority === 'medium' ? '中' :
            process.priority === 'low' ? '低' :
            process.priority === 'urgent' ? '緊急' : process.priority || '',
    予算: process.budget ? `¥${Number(process.budget).toLocaleString()}` : '',
    実績コスト: process.actualCost ? `¥${Number(process.actualCost).toLocaleString()}` : '',
    備考: process.notes || process.description || '',
  }));

  const filename = generateFileName('工程記録', dateRange?.start);
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '工程一覧');
  }
};

// 在庫管理用のエクスポート関数
export const exportInventory = (
  inventory: any[],
  format: 'csv' | 'excel',
  categoryFilter?: string,
  statusFilter?: string
) => {
  const exportData = inventory.map(item => ({
    名称: item.name || '',
    カテゴリ: item.category?.name || '',
    ブランド: item.brand || '',
    型番: item.model || '',
    シリアル番号: item.serialNumber || '',
    購入日: item.purchaseDate || '',
    購入価格: item.purchasePrice ? `¥${Number(item.purchasePrice).toLocaleString()}` : '',
    現在価値: item.currentValue ? `¥${Number(item.currentValue).toLocaleString()}` : '',
    状態: item.condition === 'excellent' ? '優良' :
          item.condition === 'good' ? '良好' :
          item.condition === 'fair' ? '普通' :
          item.condition === 'poor' ? '劣化' :
          item.condition === 'broken' ? '故障' : item.condition || '',
    ステータス: item.status === 'available' ? '利用可能' :
                item.status === 'in-use' ? '使用中' :
                item.status === 'maintenance' ? 'メンテナンス' :
                item.status === 'repair' ? '修理中' :
                item.status === 'retired' ? '廃棄' : item.status || '',
    保管場所: item.location || '',
    使用者: item.assignedTo || '',
    使用時間: item.usageHours ? `${item.usageHours}時間` : '',
    最終メンテナンス日: item.lastMaintenanceDate || '',
    次回メンテナンス予定日: item.nextMaintenanceDate || '',
    タグ: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    備考: item.notes || '',
  }));

  let filename = generateFileName('在庫一覧');
  
  // フィルター情報をファイル名に追加
  if (categoryFilter && categoryFilter !== 'all') {
    filename += `_${categoryFilter}`;
  }
  if (statusFilter && statusFilter !== 'all') {
    filename += `_${statusFilter}`;
  }
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '在庫一覧');
  }
};

// 取引先管理用のエクスポート関数
export const exportPartners = (
  partners: any[],
  format: 'csv' | 'excel',
  typeFilter?: string
) => {
  const exportData = partners.map(partner => ({
    会社名: partner.name || '',
    会社名カナ: partner.nameKana || '',
    種別: partner.type === 'customer' ? '顧客' :
          partner.type === 'supplier' ? '仕入先' :
          partner.type === 'both' ? '顧客・仕入先' : partner.type || '',
    業界: partner.businessInfo?.industry || '',
    代表者名: partner.businessInfo?.representativeName || '',
    代表者役職: partner.businessInfo?.representativeTitle || '',
    電話番号: partner.contactInfo?.phone || '',
    FAX: partner.contactInfo?.fax || '',
    メールアドレス: partner.contactInfo?.email || '',
    ウェブサイト: partner.contactInfo?.website || '',
    郵便番号: partner.address?.postalCode || '',
    都道府県: partner.address?.prefecture || '',
    市区町村: partner.address?.city || '',
    住所1: partner.address?.address1 || '',
    住所2: partner.address?.address2 || '',
    取引状況: partner.status === 'active' ? 'アクティブ' :
             partner.status === 'inactive' ? '非アクティブ' :
             partner.status === 'potential' ? '見込み' :
             partner.status === 'suspended' ? '停止中' : partner.status || '',
    優先度: partner.priority === 'vip' ? 'VIP' :
            partner.priority === 'high' ? '高' :
            partner.priority === 'normal' ? '普通' :
            partner.priority === 'low' ? '低' : partner.priority || '',
    支払条件: partner.financialInfo?.paymentTerms || '',
    与信限度額: partner.financialInfo?.creditLimit ? `¥${Number(partner.financialInfo.creditLimit).toLocaleString()}` : '',
    総売上: partner.financialInfo?.totalRevenue ? `¥${Number(partner.financialInfo.totalRevenue).toLocaleString()}` : '',
    総注文数: partner.financialInfo?.totalOrders || '',
    平均注文額: partner.financialInfo?.averageOrderValue ? `¥${Number(partner.financialInfo.averageOrderValue).toLocaleString()}` : '',
    従業員数: partner.businessInfo?.employeeCount || '',
    年間売上: partner.businessInfo?.annualRevenue ? `¥${Number(partner.businessInfo.annualRevenue).toLocaleString()}` : '',
    設立日: partner.businessInfo?.established ? partner.businessInfo.established.toLocaleDateString('ja-JP') : '',
    最終連絡日: partner.lastContactDate ? partner.lastContactDate.toLocaleDateString('ja-JP') : '',
    次回フォロー予定日: partner.nextFollowUpDate ? partner.nextFollowUpDate.toLocaleDateString('ja-JP') : '',
    タグ: Array.isArray(partner.tags) ? partner.tags.join(', ') : '',
  }));

  let filename = generateFileName('取引先一覧');
  
  if (typeFilter && typeFilter !== 'all') {
    filename += `_${typeFilter}`;
  }
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '取引先一覧');
  }
};

// 不具合報告用のエクスポート関数
export const exportDefectReports = (
  reports: any[],
  format: 'csv' | 'excel',
  statusFilter?: string,
  severityFilter?: string
) => {
  const exportData = reports.map(report => ({
    報告番号: report.reportNumber || '',
    タイトル: report.title || '',
    報告日: report.dateReported ? report.dateReported.toLocaleDateString('ja-JP') : '',
    不具合内容: report.description || '',
    重要度: report.severity === 'critical' ? '緊急' :
            report.severity === 'high' ? '高' :
            report.severity === 'medium' ? '中' :
            report.severity === 'low' ? '低' : report.severity || '',
    ステータス: report.status === 'open' ? '新規' :
                report.status === 'investigating' ? '調査中' :
                report.status === 'in_progress' ? '対応中' :
                report.status === 'resolved' ? '解決済' :
                report.status === 'closed' ? '完了' : report.status || '',
    分類: report.category === 'quality' ? '品質' :
          report.category === 'equipment' ? '設備' :
          report.category === 'process' ? '工程' :
          report.category === 'material' ? '材料' :
          report.category === 'safety' ? '安全' :
          report.category === 'other' ? 'その他' : report.category || '',
    報告者: report.reporter || '',
    担当者: report.assignee || '',
    部門: report.department || '',
    発生場所: report.location || '',
    解決予定日: report.estimatedResolution ? report.estimatedResolution.toLocaleDateString('ja-JP') : '',
    解決日: report.dateResolved ? report.dateResolved.toLocaleDateString('ja-JP') : '',
    推定費用: report.estimatedCost ? `¥${Number(report.estimatedCost).toLocaleString()}` : '',
    実際費用: report.actualCost ? `¥${Number(report.actualCost).toLocaleString()}` : '',
    是正措置: Array.isArray(report.correctionActions) ? report.correctionActions.join(', ') : '',
    予防措置: Array.isArray(report.preventiveActions) ? report.preventiveActions.join(', ') : '',
  }));

  let filename = generateFileName('不具合報告');
  
  if (statusFilter && statusFilter !== 'all') {
    filename += `_${statusFilter}`;
  }
  if (severityFilter && severityFilter !== 'all') {
    filename += `_${severityFilter}`;
  }
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, '不具合報告一覧');
  }
};