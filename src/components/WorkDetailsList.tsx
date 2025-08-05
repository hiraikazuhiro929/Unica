import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type WorkItem = {
  id: string;
  type: string; // 作業種別: 段取り, 仕上げ など
  hours: number;
};

type WorkDetailsListProps = {
  items: WorkItem[];
  isEditing: boolean;
  onChange: (updatedItems: WorkItem[]) => void;
};

const WorkDetailsList: React.FC<WorkDetailsListProps> = ({
  items,
  isEditing,
  onChange,
}) => {
  // 作業の追加
  const handleAdd = () => {
    const newItem: WorkItem = {
      id: crypto.randomUUID(),
      type: "",
      hours: 0,
    };
    onChange([...items, newItem]);
  };

  // 作業の削除
  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  // 作業の更新
  const handleUpdate = (
    id: string,
    field: keyof WorkItem,
    value: string | number
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  // 合計時間の計算
  const totalHours = items.reduce((sum, item) => sum + (item.hours || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">作業内容</h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm text-gray-600">工程名</Label>
              <Input
                value={item.type}
                onChange={(e) => handleUpdate(item.id, "type", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="w-32">
              <Label className="text-sm text-gray-600">時間 (h)</Label>
              <Input
                type="number"
                value={item.hours}
                onChange={(e) =>
                  handleUpdate(
                    item.id,
                    "hours",
                    parseFloat(e.target.value) || 0
                  )
                }
                disabled={!isEditing}
              />
            </div>
            {isEditing && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => handleDelete(item.id)}
              >
                🗑
              </Button>
            )}
          </div>
        ))}

        {isEditing && (
          <Button type="button" variant="outline" onClick={handleAdd}>
            ＋ 工程を追加
          </Button>
        )}
      </div>

      <div className="bg-gray-100 rounded-lg p-4 mt-4">
        <div className="text-lg font-semibold">
          合計工数：{totalHours.toFixed(2)} 時間
        </div>
      </div>
    </div>
  );
};

export default WorkDetailsList;
