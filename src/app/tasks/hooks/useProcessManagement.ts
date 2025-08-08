import { useState, useEffect } from "react";
import { Process, Company } from "@/app/tasks/types";
import { calculateTotalHours } from "@/app/tasks/constants";
import { 
  getProcessesList, 
  subscribeToProcessesList,
  createProcess as createProcessInFirebase,
  updateProcess as updateProcessInFirebase,
  deleteProcess as deleteProcessInFirebase
} from "@/lib/firebase/processes";

export const useProcessManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companySortOrder, setCompanySortOrder] = useState<'name' | 'processCount' | 'totalHours' | 'custom'>('custom');
  const [customCompanyOrder, setCustomCompanyOrder] = useState<string[]>([]);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // LocalStorageから設定を読み込み
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('unica-company-order');
      const savedSortOrder = localStorage.getItem('unica-company-sort-order');
      
      if (savedOrder) {
        setCustomCompanyOrder(JSON.parse(savedOrder));
      }
      if (savedSortOrder) {
        setCompanySortOrder(savedSortOrder as typeof companySortOrder);
      }
      setIsSettingsLoaded(true);
    } catch (error) {
      console.warn('設定の読み込みに失敗:', error);
      setIsSettingsLoaded(true);
    }
  }, []);

  // 設定をLocalStorageに保存
  const saveCustomOrder = (order: string[]) => {
    try {
      localStorage.setItem('unica-company-order', JSON.stringify(order));
      setCustomCompanyOrder(order);
    } catch (error) {
      console.warn('設定の保存に失敗:', error);
    }
  };

  const saveSortOrder = (sortOrder: typeof companySortOrder) => {
    try {
      localStorage.setItem('unica-company-sort-order', sortOrder);
      setCompanySortOrder(sortOrder);
    } catch (error) {
      console.warn('ソート順の保存に失敗:', error);
    }
  };

  // 会社の並び替え関数
  const sortCompanies = (companies: Company[], sortOrder: typeof companySortOrder) => {
    return [...companies].sort((a, b) => {
      switch (sortOrder) {
        case 'name':
          return a.name.localeCompare(b.name, 'ja');
        case 'processCount':
          return b.processes.length - a.processes.length;
        case 'totalHours':
          const totalHoursA = a.processes.reduce((sum, p) => sum + calculateTotalHours(p.workDetails), 0);
          const totalHoursB = b.processes.reduce((sum, p) => sum + calculateTotalHours(p.workDetails), 0);
          return totalHoursB - totalHoursA;
        case 'custom':
          // カスタム順序を適用
          if (customCompanyOrder.length > 0) {
            const indexA = customCompanyOrder.indexOf(a.name);
            const indexB = customCompanyOrder.indexOf(b.name);
            
            // 両方とも保存済み順序にある場合
            if (indexA !== -1 && indexB !== -1) {
              return indexA - indexB;
            }
            // Aのみ保存済み順序にある場合（Aを上位）
            if (indexA !== -1) return -1;
            // Bのみ保存済み順序にある場合（Bを上位）
            if (indexB !== -1) return 1;
          }
          // 保存済み順序がない場合は名前順
          return a.name.localeCompare(b.name, 'ja');
        default:
          return a.name.localeCompare(b.name, 'ja');
      }
    });
  };

  // 会社の並び順を変更
  const changeCompanySortOrder = (sortOrder: typeof companySortOrder) => {
    saveSortOrder(sortOrder);
    const sortedCompanies = sortCompanies(companies, sortOrder);
    setCompanies(sortedCompanies);
  };

  // 会社の順序を手動で変更（ドラッグ&ドロップ用）
  const reorderCompanies = (draggedCompanyId: string, targetCompanyId: string) => {
    setCompanies((prev) => {
      const companies = [...prev];
      const draggedIndex = companies.findIndex((c) => c.id === draggedCompanyId);
      const targetIndex = companies.findIndex((c) => c.id === targetCompanyId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedItem] = companies.splice(draggedIndex, 1);
        companies.splice(targetIndex, 0, draggedItem);
        
        // 新しい順序を保存
        const newOrder = companies.map(c => c.name);
        saveCustomOrder(newOrder);
        saveSortOrder('custom');
      }

      return companies;
    });
  };

  // Firebaseからデータを取得（LocalStorage読み込み後）
  useEffect(() => {
    if (isSettingsLoaded) {
      loadProcessesData();
    }
    
    // リアルタイム同期を削除し、必要時のみデータを更新
    // パフォーマンス重視のため定期更新も削除
  }, [isSettingsLoaded]);

  const loadProcessesData = async () => {
    try {
      setIsLoading(true);
      const { data: processes, error } = await getProcessesList({ limit: 100 });
      
      if (error) {
        console.warn('プロセスデータの取得に失敗:', error);
        setCompanies([]);
        setError(error);
      } else {
        // プロセスを会社ごとにグループ化
        const companiesMap = new Map<string, Company>();
        
        processes.forEach(process => {
          const companyName = process.orderClient || '未分類';
          if (!companiesMap.has(companyName)) {
            companiesMap.set(companyName, {
              id: companyName.toLowerCase().replace(/\s/g, '-'),
              name: companyName,
              isExpanded: true,
              processes: []
            });
          }
          companiesMap.get(companyName)!.processes.push(process);
        });
        
        const companiesArray = Array.from(companiesMap.values());
        const sortedCompanies = sortCompanies(companiesArray, companySortOrder);
        const companiesWithLineNumbers = updateLineNumbers(sortedCompanies);
        setCompanies(companiesWithLineNumbers);
        setError(null);
      }
    } catch (err: any) {
      console.error('プロセスデータの取得中にエラー:', err);
      setCompanies([]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  // 行番号を正しく設定する関数
  const updateLineNumbers = (companies: Company[]) => {
    return companies.map((company) => ({
      ...company,
      processes: company.processes.map((process, index) => ({
        ...process,
        rowNumber: index + 1,
        lineNumber: String(index + 1).padStart(3, "0"),
      })),
    }));
  };


  // 行番号を自動生成する関数
  const generateLineNumber = (orderClient: string) => {
    const clientProcesses = companies
      .flatMap((c) => c.processes)
      .filter((p) => p.orderClient === orderClient);

    const nextNumber = clientProcesses.length + 1;
    return String(nextNumber).padStart(3, "0");
  };

  // 新規工程テンプレート作成
  const createNewProcess = (): Process => ({
    id: Date.now().toString(),
    orderClient: "",
    lineNumber: "",
    projectName: "",
    managementNumber: "",
    progress: 0,
    quantity: 0,
    salesPerson: "",
    assignee: "",
    fieldPerson: "",
    assignedMachines: [],
    workDetails: {
      setup: 0,
      machining: 0,
      finishing: 0,
      useDynamicSteps: false,
      totalEstimatedHours: 0,
      totalActualHours: 0
    },
    orderDate: new Date().toISOString().split("T")[0],
    arrivalDate: "",
    shipmentDate: "",
    dataWorkDate: "",
    processingPlanDate: "",
    remarks: "",
    status: "planning",
    priority: "medium",
    dueDate: "",
  });

  // 工程更新（ローカル更新 + Firebase保存）
  const updateProcess = async (updatedProcess: Process) => {
    try {
      // Firebaseに保存
      if (updatedProcess.id) {
        const { error } = await updateProcessInFirebase(updatedProcess.id, updatedProcess);
        if (error) {
          console.error('工程の更新に失敗しました:', error);
          alert('工程の更新に失敗しました: ' + error);
          return;
        }
      }

      // ローカル状態を更新（UIがすぐ反応）
      setCompanies((prev) => {
      // 既存のプロセスの会社とインデックスを記録
      let oldCompanyId: string | null = null;
      let oldIndex: number = -1;
      
      prev.forEach((company) => {
        const index = company.processes.findIndex((p) => p.id === updatedProcess.id);
        if (index !== -1) {
          oldCompanyId = company.id;
          oldIndex = index;
        }
      });

      // 会社が変更されない場合は、同じ位置で更新
      if (oldCompanyId !== null) {
        const oldCompany = prev.find((c) => c.id === oldCompanyId);
        if (oldCompany && oldCompany.name === updatedProcess.orderClient) {
          // 同じ会社内での更新：位置を保持
          return prev.map((company) => {
            if (company.id === oldCompanyId) {
              const newProcesses = [...company.processes];
              newProcesses[oldIndex] = updatedProcess;
              return { ...company, processes: newProcesses };
            }
            return company;
          });
        }
      }

      // 会社が変更される場合のみ、古い処理を実行
      const withoutOldProcess = prev.map((company) => ({
        ...company,
        processes: company.processes.filter((p) => p.id !== updatedProcess.id),
      }));

      // 新しい会社を探すか作成
      const targetCompany = withoutOldProcess.find(
        (c) => c.name === updatedProcess.orderClient
      );

      if (targetCompany) {
        // 既存の会社に追加
        return withoutOldProcess.map((company) =>
          company.name === updatedProcess.orderClient
            ? { ...company, processes: [...company.processes, updatedProcess] }
            : company
        );
      } else {
        // 新しい会社を作成
        return [
          ...withoutOldProcess,
          {
            id: Date.now().toString(),
            name: updatedProcess.orderClient,
            processes: [updatedProcess],
            isExpanded: true,
          },
        ];
      }
    });
    } catch (error: any) {
      console.error('工程更新エラー:', error);
      alert('工程の更新中にエラーが発生しました: ' + error.message);
    }
  };

  // 工程追加（Firebase連携）
  const addProcess = async (newProcess: Process) => {
    try {
      // Firebaseに保存
      const processData = { ...newProcess };
      delete (processData as any).id; // idを除去してFirebaseに送信
      
      const { id, error } = await createProcessInFirebase(processData);
      if (error || !id) {
        console.error('工程の作成に失敗しました:', error);
        alert('工程の作成に失敗しました: ' + error);
        return;
      }

      // 作成されたIDを設定
      const createdProcess = { ...newProcess, id };

      // ローカル状態を更新
      setCompanies((prev) => {
        const firstCompany = prev[0];
        if (firstCompany) {
          const updatedCompanies = prev.map((company) =>
            company.id === firstCompany.id
              ? { ...company, processes: [...company.processes, createdProcess] }
              : company
          );
          return updateLineNumbers(updatedCompanies);
        }
        return prev;
      });
    } catch (error: any) {
      console.error('工程追加エラー:', error);
      alert('工程の追加中にエラーが発生しました: ' + error.message);
    }
  };

  // 工程削除（Firebase連携）
  const deleteProcess = async (processId: string) => {
    try {
      // Firebaseから削除
      const { error } = await deleteProcessInFirebase(processId);
      if (error) {
        console.error('工程の削除に失敗しました:', error);
        alert('工程の削除に失敗しました: ' + error);
        return;
      }

      // ローカル状態からも削除
      setCompanies((prev) => {
        const updatedCompanies = prev.map((company) => ({
          ...company,
          processes: company.processes.filter((p) => p.id !== processId),
        }));
        return updateLineNumbers(updatedCompanies);
      });
    } catch (error: any) {
      console.error('工程削除エラー:', error);
      alert('工程の削除中にエラーが発生しました: ' + error.message);
    }
  };

  // 工程複製
  const duplicateProcess = (originalProcess: Process) => {
    const duplicatedProcess = {
      ...originalProcess,
      id: Date.now().toString(),
      managementNumber: originalProcess.managementNumber + "-copy",
      projectName: originalProcess.projectName + " (複製)",
      progress: 0,
      status: "planning" as const,
    };

    setCompanies((prev) =>
      prev.map((company) =>
        company.processes.some((p) => p.id === originalProcess.id)
          ? { ...company, processes: [...company.processes, duplicatedProcess] }
          : company
      )
    );
  };

  // 進捗更新
  const updateProgress = (processId: string, progress: number) => {
    setCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        processes: company.processes.map((p) =>
          p.id === processId ? { ...p, progress } : p
        ),
      }))
    );
  };

  // ステータス更新
  const updateStatus = (processId: string, newStatus: Process["status"]) => {
    setCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        processes: company.processes.map((p) =>
          p.id === processId ? { ...p, status: newStatus } : p
        ),
      }))
    );
  };

  // 日付更新
  const updateDate = (
    companyId: string,
    processId: string,
    key: keyof Process,
    date: Date | undefined
  ) => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id !== companyId
          ? company
          : {
              ...company,
              processes: company.processes.map((p) =>
                p.id !== processId
                  ? p
                  : {
                      ...p,
                      [key]: date
                        ? `${date.getFullYear()}-${String(
                            date.getMonth() + 1
                          ).padStart(2, "0")}-${String(date.getDate()).padStart(
                            2,
                            "0"
                          )}`
                        : "",
                    }
              ),
            }
      )
    );
  };

  // 並び替え
  const reorderProcesses = async (draggedId: string, targetId: string) => {
    setCompanies((prev) => {
      const updatedCompanies = prev.map((company) => {
        const processes = [...company.processes];
        const draggedIndex = processes.findIndex((p) => p.id === draggedId);
        const targetIndex = processes.findIndex((p) => p.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedItem] = processes.splice(draggedIndex, 1);
          processes.splice(targetIndex, 0, draggedItem);

          // 行番号を再割り当て
          processes.forEach((process, index) => {
            process.rowNumber = index + 1;
            process.lineNumber = String(index + 1).padStart(3, "0");
          });

          return { ...company, processes };
        }

        return company;
      });

      return updatedCompanies;
    });
  };

  // 会社の展開/折りたたみ
  const toggleCompany = (companyId: string) => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === companyId
          ? { ...company, isExpanded: !company.isExpanded }
          : company
      )
    );
  };

  // 統計情報計算
  const getStatistics = () => {
    const allProcesses = companies.flatMap((company) => company.processes);
    const total = allProcesses.length;
    const byStatus = {
      planning: allProcesses.filter((p) => p.status === "planning").length,
      "data-work": allProcesses.filter((p) => p.status === "data-work").length,
      processing: allProcesses.filter((p) => p.status === "processing").length,
      finishing: allProcesses.filter((p) => p.status === "finishing").length,
      completed: allProcesses.filter((p) => p.status === "completed").length,
      delayed: allProcesses.filter((p) => p.status === "delayed").length,
    };
    const totalHours = allProcesses.reduce(
      (sum, p) => sum + calculateTotalHours(p.workDetails),
      0
    );
    const avgProgress =
      total > 0
        ? allProcesses.reduce((sum, p) => sum + p.progress, 0) / total
        : 0;

    return { total, byStatus, totalHours, avgProgress };
  };

  return {
    companies,
    isLoading,
    error,
    companySortOrder,
    generateLineNumber,
    createNewProcess,
    updateProcess,
    addProcess,
    deleteProcess,
    duplicateProcess,
    updateProgress,
    updateStatus,
    updateDate,
    reorderProcesses,
    reorderCompanies,
    changeCompanySortOrder,
    toggleCompany,
    getStatistics,
    loadProcessesData,
  };
};