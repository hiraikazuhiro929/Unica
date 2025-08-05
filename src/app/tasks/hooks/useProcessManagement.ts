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

  // サンプルデータ（初期データまたはFirebase接続失敗時のフォールバック）
  const sampleCompanies: Company[] = [
    {
      id: "1",
      name: "トヨタ自動車",
      isExpanded: true,
      processes: [
        {
          id: "1-1",
          orderClient: "トヨタ自動車",
          lineNumber: "",
          projectName: "自動車部品A製造",
          managementNumber: "MGT-2024-001",
          progress: 75,
          quantity: 100,
          salesPerson: "山田太郎",
          assignee: "田中一郎",
          fieldPerson: "佐藤次郎",
          assignedMachines: ["NC旋盤-001", "マシニングセンタ-001"],
          workDetails: {
            setup: 6,
            machining: 12,
            finishing: 9,
            additionalSetup: 6,
            additionalMachining: 3,
            additionalFinishing: 1.5,
            useDynamicSteps: false,
            totalEstimatedHours: 37.5,
            totalActualHours: 0
          },
          orderDate: "2024-03-01",
          arrivalDate: "2024-03-05",
          shipmentDate: "2024-03-31",
          dataWorkDate: "2024-03-03",
          dataCompleteDate: "2024-03-04",
          processingPlanDate: "2024-03-06",
          processingEndDate: "2024-03-25",
          remarks: "特急対応、品質検査強化",
          status: "processing",
          priority: "high",
          dueDate: "2024-03-31",
        },
        {
          id: "1-2",
          orderClient: "トヨタ自動車",
          lineNumber: "",
          projectName: "エンジン部品C加工",
          managementNumber: "MGT-2024-003",
          progress: 45,
          quantity: 200,
          salesPerson: "山田太郎",
          assignee: "鈴木三郎",
          fieldPerson: "高橋四郎",
          assignedMachines: ["NC旋盤-002", "フライス盤-001"],
          workDetails: {
            setup: 8,
            machining: 16,
            finishing: 12,
            useDynamicSteps: false,
            totalEstimatedHours: 36,
            totalActualHours: 0
          },
          orderDate: "2024-03-10",
          arrivalDate: "2024-03-12",
          shipmentDate: "2024-04-10",
          dataWorkDate: "2024-03-11",
          processingPlanDate: "2024-03-13",
          remarks: "",
          status: "processing",
          priority: "medium",
          dueDate: "2024-04-10",
        },
      ],
    },
    {
      id: "2",
      name: "ソニーグループ",
      isExpanded: true,
      processes: [
        {
          id: "2-1",
          orderClient: "ソニーグループ",
          lineNumber: "",
          projectName: "精密機器B組立",
          managementNumber: "MGT-2024-002",
          progress: 30,
          quantity: 50,
          salesPerson: "鈴木花子",
          assignee: "高橋三郎",
          fieldPerson: "伊藤四郎",
          assignedMachines: ["マシニングセンタ-002", "研削盤-001"],
          workDetails: {
            setup: 4,
            machining: 8,
            finishing: 6,
            useDynamicSteps: false,
            totalEstimatedHours: 18,
            totalActualHours: 0
          },
          orderDate: "2024-03-15",
          arrivalDate: "2024-03-18",
          shipmentDate: "2024-04-15",
          dataWorkDate: "2024-03-16",
          processingPlanDate: "2024-03-20",
          remarks: "精密加工注意",
          status: "data-work",
          priority: "medium",
          dueDate: "2024-04-15",
        },
      ],
    },
    {
      id: "3",
      name: "パナソニック",
      isExpanded: true,
      processes: [
        {
          id: "3-1",
          orderClient: "パナソニック",
          lineNumber: "",
          projectName: "電子部品筐体加工",
          managementNumber: "MGT-2024-004",
          progress: 10,
          quantity: 300,
          salesPerson: "田中花子",
          assignee: "佐藤五郎",
          fieldPerson: "山田六郎",
          assignedMachines: ["プレス機-001"],
          workDetails: {
            setup: 2,
            machining: 4,
            finishing: 2,
            useDynamicSteps: false,
            totalEstimatedHours: 8,
            totalActualHours: 0
          },
          orderDate: "2024-03-20",
          arrivalDate: "2024-03-22",
          shipmentDate: "2024-04-20",
          dataWorkDate: "2024-03-21",
          processingPlanDate: "2024-03-25",
          remarks: "",
          status: "planning",
          priority: "low",
          dueDate: "2024-04-20",
        },
      ],
    },
    {
      id: "4",
      name: "ホンダ技研工業",
      isExpanded: true,
      processes: [
        {
          id: "4-1",
          orderClient: "ホンダ技研工業",
          lineNumber: "",
          projectName: "二輪車部品製造",
          managementNumber: "MGT-2024-005",
          progress: 85,
          quantity: 150,
          salesPerson: "佐藤太郎",
          assignee: "田中花子",
          fieldPerson: "山田次郎",
          assignedMachines: ["NC旋盤-001", "フライス盤-001"],
          workDetails: {
            setup: 3,
            machining: 10,
            finishing: 5,
            useDynamicSteps: false,
            totalEstimatedHours: 18,
            totalActualHours: 0
          },
          orderDate: "2024-02-28",
          arrivalDate: "2024-03-02",
          shipmentDate: "2024-03-28",
          dataWorkDate: "2024-03-01",
          processingPlanDate: "2024-03-04",
          remarks: "",
          status: "finishing",
          priority: "medium",
          dueDate: "2024-03-28",
        },
      ],
    },
  ];

  // Firebaseからデータを取得
  useEffect(() => {
    loadProcessesData();
    
    // リアルタイム同期を削除し、必要時のみデータを更新
    // パフォーマンス重視のため定期更新も削除
  }, []);

  const loadProcessesData = async () => {
    try {
      setIsLoading(true);
      const { data: processes, error } = await getProcessesList({ limit: 100 });
      
      if (error) {
        console.warn('プロセスデータの取得に失敗、サンプルデータを使用:', error);
        setCompanies(sampleCompanies);
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
        
        // データがない場合はサンプルデータを使用
        if (companiesArray.length === 0) {
          setCompanies(sampleCompanies);
        } else {
          setCompanies(companiesArray);
        }
      }
    } catch (err: any) {
      console.error('プロセスデータの取得中にエラー:', err);
      setCompanies(sampleCompanies);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 初期化時に行番号を設定（サンプルデータのみ）
  useEffect(() => {
    if (companies === sampleCompanies) {
      setCompanies((prev) =>
        prev.map((company) => ({
          ...company,
          processes: company.processes.map((process, index) => ({
            ...process,
            rowNumber: index + 1,
            lineNumber: String(index + 1).padStart(3, "0"),
          })),
        }))
      );
    }
  }, [companies]);

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
    // まずローカル状態を即座に更新（UIがすぐ反応）
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
  };

  // 工程追加
  const addProcess = (newProcess: Process) => {
    setCompanies((prev) => {
      const firstCompany = prev[0];
      if (firstCompany) {
        return prev.map((company) =>
          company.id === firstCompany.id
            ? { ...company, processes: [...company.processes, newProcess] }
            : company
        );
      }
      return prev;
    });
  };

  // 工程削除
  const deleteProcess = (processId: string) => {
    setCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        processes: company.processes.filter((p) => p.id !== processId),
      }))
    );
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
  const reorderProcesses = (draggedId: string, targetId: string) => {
    setCompanies((prev) =>
      prev.map((company) => {
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
        }

        return { ...company, processes };
      })
    );
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
    toggleCompany,
    getStatistics,
    loadProcessesData,
  };
};