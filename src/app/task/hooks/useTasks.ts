import { useState, useEffect, useCallback } from 'react';
import {
  PersonalTask,
  CompanyTask,
  createPersonalTask,
  updatePersonalTask,
  deletePersonalTask,
  createCompanyTask,
  updateCompanyTask,
  deleteCompanyTask,
  subscribeToPersonalTasks,
  subscribeToCompanyTasks,
  getPersonalTasks,
  getCompanyTasks,
  getTasksStatistics,
} from '@/lib/firebase/tasks';

export interface UseTasksOptions {
  userId: string;
  userName: string;
  enableRealtime?: boolean;
  limit?: number;
}

export interface UseTasksReturn {
  // データ
  personalTasks: PersonalTask[];
  companyTasks: CompanyTask[];
  isLoading: boolean;
  error: string | null;
  
  // 統計
  stats: {
    personal: {
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
      overdue: number;
      byCategory: Record<string, number>;
      byPriority: Record<string, number>;
    };
    company: {
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
      overdue: number;
      byCategory: Record<string, number>;
      byPriority: Record<string, number>;
    };
  };
  
  // 個人タスクアクション
  createPersonalTaskAction: (taskData: Partial<PersonalTask>) => Promise<boolean>;
  updatePersonalTaskAction: (taskId: string, updates: Partial<PersonalTask>) => Promise<boolean>;
  deletePersonalTaskAction: (taskId: string) => Promise<boolean>;
  
  // 会社タスクアクション
  createCompanyTaskAction: (taskData: Partial<CompanyTask>) => Promise<boolean>;
  updateCompanyTaskAction: (taskId: string, updates: Partial<CompanyTask>) => Promise<boolean>;
  deleteCompanyTaskAction: (taskId: string) => Promise<boolean>;
  
  // ユーティリティ
  toggleTaskStatus: (task: PersonalTask | CompanyTask, newStatus?: PersonalTask['status']) => Promise<boolean>;
  sharePersonalTask: (personalTask: PersonalTask, assignee?: string, assigneeId?: string) => Promise<boolean>;
  getTasksByFilter: (filters: TaskFilters) => (PersonalTask | CompanyTask)[];
  
  // リフレッシュ
  refreshTasks: () => Promise<void>;
}

export interface TaskFilters {
  type?: 'personal' | 'company' | 'all';
  status?: PersonalTask['status'] | 'all';
  priority?: PersonalTask['priority'] | 'all';
  category?: string | 'all';
  assigneeId?: string;
  searchQuery?: string;
  dueDate?: {
    from?: string;
    to?: string;
    overdue?: boolean;
  };
}

export const useTasks = ({
  userId,
  userName,
  enableRealtime = true,
  limit = 100,
}: UseTasksOptions): UseTasksReturn => {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [companyTasks, setCompanyTasks] = useState<CompanyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // リアルタイム購読またはワンタイム取得
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (enableRealtime) {
      // 個人タスクのリアルタイム購読
      const unsubscribePersonal = subscribeToPersonalTasks(
        { userId, limit },
        (data) => {
          setPersonalTasks(data);
          setIsLoading(false);
        }
      );

      // 会社タスクのリアルタイム購読
      const unsubscribeCompany = subscribeToCompanyTasks(
        { limit },
        (data) => {
          setCompanyTasks(data);
        }
      );

      return () => {
        unsubscribePersonal();
        unsubscribeCompany();
      };
    } else {
      // ワンタイム取得
      const fetchTasks = async () => {
        try {
          const [personalResult, companyResult] = await Promise.all([
            getPersonalTasks({ userId, limit }),
            getCompanyTasks({ limit }),
          ]);

          if (personalResult.error) {
            setError(personalResult.error);
          } else {
            setPersonalTasks(personalResult.data);
          }

          if (companyResult.error) {
            setError(companyResult.error);
          } else {
            setCompanyTasks(companyResult.data);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setIsLoading(false);
        }
      };

      fetchTasks();
    }
  }, [userId, enableRealtime, limit]);

  // 統計計算
  const stats = useCallback(() => {
    const calculateTaskStats = (tasks: (PersonalTask | CompanyTask)[]) => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const inProgress = tasks.filter(t => t.status === 'progress').length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      
      const overdue = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date(t.dueDate) < new Date();
      }).length;

      const byCategory: Record<string, number> = {};
      const byPriority: Record<string, number> = {};

      tasks.forEach(task => {
        byCategory[task.category] = (byCategory[task.category] || 0) + 1;
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      });

      return {
        total,
        completed,
        inProgress,
        pending,
        overdue,
        byCategory,
        byPriority,
      };
    };

    return {
      personal: calculateTaskStats(personalTasks),
      company: calculateTaskStats(companyTasks),
    };
  }, [personalTasks, companyTasks]);

  // 個人タスク作成
  const createPersonalTaskAction = useCallback(async (taskData: Partial<PersonalTask>): Promise<boolean> => {
    try {
      const fullTaskData = {
        title: taskData.title || '無題のタスク',
        description: taskData.description,
        category: taskData.category || ('work' as PersonalTask['category']),
        priority: taskData.priority || ('medium' as PersonalTask['priority']),
        status: taskData.status || ('pending' as PersonalTask['status']),
        userId,
        ...(taskData.dueDate && { dueDate: taskData.dueDate }),
        ...(taskData.relatedProcessId && { relatedProcessId: taskData.relatedProcessId }),
      };

      const result = await createPersonalTask(fullTaskData);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '個人タスクの作成に失敗しました');
      return false;
    }
  }, [userId]);

  // 個人タスク更新
  const updatePersonalTaskAction = useCallback(async (taskId: string, updates: Partial<PersonalTask>): Promise<boolean> => {
    try {
      const result = await updatePersonalTask(taskId, updates);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '個人タスクの更新に失敗しました');
      return false;
    }
  }, []);

  // 個人タスク削除
  const deletePersonalTaskAction = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const result = await deletePersonalTask(taskId);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '個人タスクの削除に失敗しました');
      return false;
    }
  }, []);

  // 会社タスク作成
  const createCompanyTaskAction = useCallback(async (taskData: Partial<CompanyTask>): Promise<boolean> => {
    try {
      const fullTaskData = {
        title: taskData.title || '無題のタスク',
        description: taskData.description,
        category: taskData.category || ('general' as CompanyTask['category']),
        priority: taskData.priority || ('medium' as CompanyTask['priority']),
        status: taskData.status || ('pending' as CompanyTask['status']),
        assignee: taskData.assignee || userName,
        assigneeId: taskData.assigneeId || userId,
        createdBy: userName,
        createdById: userId,
        ...(taskData.dueDate && { dueDate: taskData.dueDate }),
        ...(taskData.relatedProcessId && { relatedProcessId: taskData.relatedProcessId }),
      };

      const result = await createCompanyTask(fullTaskData);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社タスクの作成に失敗しました');
      return false;
    }
  }, [userId, userName]);

  // 会社タスク更新
  const updateCompanyTaskAction = useCallback(async (taskId: string, updates: Partial<CompanyTask>): Promise<boolean> => {
    try {
      const result = await updateCompanyTask(taskId, updates);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社タスクの更新に失敗しました');
      return false;
    }
  }, []);

  // 会社タスク削除
  const deleteCompanyTaskAction = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const result = await deleteCompanyTask(taskId);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社タスクの削除に失敗しました');
      return false;
    }
  }, []);

  // タスクステータス切り替え
  const toggleTaskStatus = useCallback(async (
    task: PersonalTask | CompanyTask, 
    newStatus?: PersonalTask['status']
  ): Promise<boolean> => {
    const targetStatus = newStatus || (task.status === 'completed' ? 'pending' : 'completed');
    
    if ('userId' in task) {
      return updatePersonalTaskAction(task.id, { status: targetStatus });
    } else {
      return updateCompanyTaskAction(task.id, { status: targetStatus });
    }
  }, [updatePersonalTaskAction, updateCompanyTaskAction]);

  // 個人タスクを会社タスクとして共有
  const sharePersonalTask = useCallback(async (
    personalTask: PersonalTask,
    assignee?: string,
    assigneeId?: string
  ): Promise<boolean> => {
    try {
      const companyTaskData = {
        title: personalTask.title,
        description: personalTask.description,
        category: 'general' as CompanyTask['category'], // マッピングが必要
        priority: personalTask.priority,
        status: personalTask.status,
        assignee: assignee || userName,
        assigneeId: assigneeId || userId,
        createdBy: userName,
        createdById: userId,
        dueDate: personalTask.dueDate,
        relatedProcessId: personalTask.relatedProcessId,
      };

      const success = await createCompanyTaskAction(companyTaskData);
      
      if (success) {
        // 元の個人タスクを削除するかどうかはオプション
        // await deletePersonalTaskAction(personalTask.id);
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの共有に失敗しました');
      return false;
    }
  }, [userId, userName, createCompanyTaskAction]);

  // フィルタリング
  const getTasksByFilter = useCallback((filters: TaskFilters): (PersonalTask | CompanyTask)[] => {
    let tasks: (PersonalTask | CompanyTask)[] = [];

    // タスクタイプ選択
    if (filters.type === 'personal') {
      tasks = [...personalTasks];
    } else if (filters.type === 'company') {
      tasks = [...companyTasks];
    } else {
      tasks = [...personalTasks, ...companyTasks];
    }

    return tasks.filter(task => {
      // ステータスフィルター
      if (filters.status && filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      // 優先度フィルター
      if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // カテゴリーフィルター
      if (filters.category && filters.category !== 'all' && task.category !== filters.category) {
        return false;
      }

      // 担当者フィルター（会社タスクのみ）
      if (filters.assigneeId && 'assigneeId' in task && task.assigneeId !== filters.assigneeId) {
        return false;
      }

      // 検索クエリフィルター
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query) || false;
        
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      // 期限フィルター
      if (filters.dueDate) {
        if (filters.dueDate.overdue) {
          if (!task.dueDate || task.status === 'completed') return false;
          if (new Date(task.dueDate) >= new Date()) return false;
        }
        
        if (filters.dueDate.from) {
          if (!task.dueDate || new Date(task.dueDate) < new Date(filters.dueDate.from)) {
            return false;
          }
        }
        
        if (filters.dueDate.to) {
          if (!task.dueDate || new Date(task.dueDate) > new Date(filters.dueDate.to)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [personalTasks, companyTasks]);

  // リフレッシュ
  const refreshTasks = useCallback(async (): Promise<void> => {
    if (!enableRealtime) {
      setIsLoading(true);
      try {
        const [personalResult, companyResult] = await Promise.all([
          getPersonalTasks({ userId, limit }),
          getCompanyTasks({ limit }),
        ]);

        if (personalResult.error) {
          setError(personalResult.error);
        } else {
          setPersonalTasks(personalResult.data);
          setError(null);
        }

        if (companyResult.error) {
          setError(companyResult.error);
        } else {
          setCompanyTasks(companyResult.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    }
  }, [userId, limit, enableRealtime]);

  return {
    // データ
    personalTasks,
    companyTasks,
    isLoading,
    error,
    
    // 統計
    stats: stats(),
    
    // 個人タスクアクション
    createPersonalTaskAction,
    updatePersonalTaskAction,
    deletePersonalTaskAction,
    
    // 会社タスクアクション
    createCompanyTaskAction,
    updateCompanyTaskAction,
    deleteCompanyTaskAction,
    
    // ユーティリティ
    toggleTaskStatus,
    sharePersonalTask,
    getTasksByFilter,
    
    // リフレッシュ
    refreshTasks,
  };
};