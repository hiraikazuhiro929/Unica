"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, GripVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WorkContentType } from "@/app/tasks/types";

// デフォルトの作業内容データ
const defaultWorkContentTypes: WorkContentType[] = [
  {
    id: "1",
    name: "data",
    nameJapanese: "データ",
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "chamfering",
    nameJapanese: "面取り",
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "finishing",
    nameJapanese: "仕上げ",
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "machining",
    nameJapanese: "機械加工",
    isActive: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "others",
    nameJapanese: "その他",
    isActive: true,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function WorkContentSettingsPage() {
  const [workContentTypes, setWorkContentTypes] = useState<WorkContentType[]>(defaultWorkContentTypes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkContentType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameJapanese: "",
    isActive: true,
  });

  const handleSaveItem = () => {
    if (!formData.name.trim() || !formData.nameJapanese.trim()) return;

    if (editingItem) {
      // 編集モード
      setWorkContentTypes(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                name: formData.name,
                nameJapanese: formData.nameJapanese,
                isActive: formData.isActive,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } else {
      // 新規作成モード
      const newItem: WorkContentType = {
        id: Date.now().toString(),
        name: formData.name,
        nameJapanese: formData.nameJapanese,
        isActive: formData.isActive,
        order: workContentTypes.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWorkContentTypes(prev => [...prev, newItem]);
    }

    // フォームリセット
    setFormData({ name: "", nameJapanese: "", isActive: true });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEditItem = (item: WorkContentType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      nameJapanese: item.nameJapanese,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("この作業内容を削除しますか？")) {
      setWorkContentTypes(prev => prev.filter(item => item.id !== id));
    }
  };

  const toggleItemStatus = (id: string) => {
    setWorkContentTypes(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              isActive: !item.isActive,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const currentIndex = workContentTypes.findIndex(item => item.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === workContentTypes.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const newWorkContentTypes = [...workContentTypes];
    [newWorkContentTypes[currentIndex], newWorkContentTypes[newIndex]] = 
    [newWorkContentTypes[newIndex], newWorkContentTypes[currentIndex]];

    // order値を更新
    newWorkContentTypes.forEach((item, index) => {
      item.order = index + 1;
      item.updatedAt = new Date().toISOString();
    });

    setWorkContentTypes(newWorkContentTypes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">作業内容設定</h1>
              <p className="text-gray-600">日報で使用する作業内容の種類を管理します</p>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">
                作業内容一覧
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 shadow-md"
                    onClick={() => {
                      setEditingItem(null);
                      setFormData({ name: "", nameJapanese: "", isActive: true });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新規追加
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "作業内容を編集" : "新しい作業内容を追加"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">英語名</Label>
                      <Input
                        id="name"
                        placeholder="例: setup, inspection"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nameJapanese">日本語名</Label>
                      <Input
                        id="nameJapanese"
                        placeholder="例: 段取り, 検査"
                        value={formData.nameJapanese}
                        onChange={(e) => setFormData(prev => ({ ...prev, nameJapanese: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive">有効</Label>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingItem(null);
                          setFormData({ name: "", nameJapanese: "", isActive: true });
                        }}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleSaveItem}
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                        disabled={!formData.name.trim() || !formData.nameJapanese.trim()}
                      >
                        {editingItem ? "更新" : "追加"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {workContentTypes.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors ${
                    !item.isActive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => moveItem(item.id, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="w-3 h-3 text-gray-400" />
                      </button>
                      <button
                        onClick={() => moveItem(item.id, "down")}
                        disabled={index === workContentTypes.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.nameJapanese}</div>
                      <div className="text-sm text-gray-500">{item.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => toggleItemStatus(item.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 注意事項 */}
        <Card className="mt-6 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 mb-2">使用上の注意</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 作業内容の順序は、日報作成時のドロップダウンでの表示順序に反映されます</li>
              <li>• 無効にした作業内容は、新しい日報では選択できなくなります</li>
              <li>• 既存の日報で使用されている作業内容は、削除しても過去データは保持されます</li>
              <li>• 英語名は内部的な識別に使用され、日本語名が実際の表示名として使用されます</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}