// 工数管理から機械情報を取得するユーティリティ関数
import { getMachines } from '@/lib/firebase/machines';

export const getMachinesFromWorkHours = async (processId: string): Promise<string[]> => {
  console.log('getMachinesFromWorkHours called with processId:', processId); // デバッグ用
  if (!processId) {
    console.log('processId is empty'); // デバッグ用
    return [];
  }

  try {
    // 機械マスタを取得
    const { data: machinesData, success } = await getMachines();
    console.log('機械マスタデータ:', machinesData); // デバッグ用
    if (!success || !machinesData) {
      console.log('機械マスタ取得失敗'); // デバッグ用
      return [];
    }

    // ローカルストレージから工数管理データを取得（実際はAPI呼び出し）
    const workHoursData = localStorage.getItem(`work-hours-${processId}`);
    if (workHoursData) {
      const data = JSON.parse(workHoursData);
      console.log('工数管理データ:', data); // デバッグ用
      const machineNames: string[] = [];

      // 各作業種別の機械情報を収集（新形式: machineId、旧形式: machine）
      if (data.setup?.machineId) {
        const machine = machinesData.find(m => m.id === data.setup.machineId);
        if (machine) machineNames.push(machine.name);
      } else if (data.setup?.machine) {
        // 旧形式の場合は直接機械名が保存されている
        machineNames.push(data.setup.machine);
      }

      if (data.machining?.machineId) {
        const machine = machinesData.find(m => m.id === data.machining.machineId);
        if (machine) machineNames.push(machine.name);
      } else if (data.machining?.machine) {
        machineNames.push(data.machining.machine);
      }

      if (data.finishing?.machineId) {
        const machine = machinesData.find(m => m.id === data.finishing.machineId);
        if (machine) machineNames.push(machine.name);
      } else if (data.finishing?.machine) {
        machineNames.push(data.finishing.machine);
      }

      // カスタムステップからも機械情報を収集
      if (data.customPlannedSteps && Array.isArray(data.customPlannedSteps)) {
        data.customPlannedSteps.forEach((step: any) => {
          if (step.machineId) {
            const machine = machinesData.find(m => m.id === step.machineId);
            if (machine) machineNames.push(machine.name);
          } else if (step.machine) {
            machineNames.push(step.machine);
          }
        });
      }

      if (data.customActualSteps && Array.isArray(data.customActualSteps)) {
        data.customActualSteps.forEach((step: any) => {
          if (step.machineId) {
            const machine = machinesData.find(m => m.id === step.machineId);
            if (machine) machineNames.push(machine.name);
          } else if (step.machine) {
            machineNames.push(step.machine);
          }
        });
      }

      // 重複を除去
      const result = [...new Set(machineNames)];
      console.log('取得した機械名:', result); // デバッグ用
      return result;
    } else {
      console.log(`工数管理データが見つかりません: work-hours-${processId}`); // デバッグ用
      return [];
    }
  } catch (error) {
    console.error('工数管理データの取得に失敗:', error);
  }

  return [];
};

// ProcessのassignedMachinesを工数管理データで更新
export const updateProcessAssignedMachines = async (process: any): Promise<any> => {
  try {
    console.log('updateProcessAssignedMachines for process:', process.id, process.projectName); // デバッグ用
    const machines = await getMachinesFromWorkHours(process.id);
    const result = {
      ...process,
      assignedMachines: machines.length > 0 ? machines : []
    };
    console.log('Updated assignedMachines:', result.assignedMachines); // デバッグ用
    return result;
  } catch (error) {
    console.error('機械情報の更新に失敗:', error);
    return {
      ...process,
      assignedMachines: ['未割り当て']
    };
  }
};