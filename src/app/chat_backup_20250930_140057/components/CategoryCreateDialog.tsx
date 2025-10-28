"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, FolderPlus } from "lucide-react";

interface CategoryCreateDialogProps {
  onCreateCategory: (categoryData: {
    name: string;
    position: number;
    isCollapsed?: boolean;
  }) => Promise<void>;
  trigger?: React.ReactNode;
  currentPosition?: number;
}

export const CategoryCreateDialog: React.FC<CategoryCreateDialogProps> = ({
  onCreateCategory,
  trigger,
  currentPosition = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    isPrivate: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      await onCreateCategory({
        name: formData.name.trim().toUpperCase(),
        position: currentPosition,
        isCollapsed: false,
      });
      
      // フォームリセット
      setFormData({
        name: "",
        isPrivate: false,
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error("カテゴリー作成エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
            <FolderPlus className="w-4 h-4 mr-2" />
            カテゴリーを作成
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            カテゴリーを作成
          </DialogTitle>
          <DialogDescription>
            チャンネルを整理するための新しいカテゴリーを作成します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">カテゴリー名 *</Label>
            <Input
              id="name"
              placeholder="例：開発チーム、営業部"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              カテゴリー名は自動的に大文字になります
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-2">
                プライベートカテゴリー
              </Label>
              <p className="text-xs text-gray-500">
                特定のロールのみアクセス可能
              </p>
            </div>
            <Switch
              checked={formData.isPrivate}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPrivate: checked }))
              }
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? "作成中..." : "カテゴリーを作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};