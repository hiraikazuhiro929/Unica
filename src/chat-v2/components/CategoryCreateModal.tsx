/**
 * CategoryCreateModal - Category Creation Modal Component
 * カテゴリ作成モーダルコンポーネント
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FolderPlus } from 'lucide-react';

type UserRole = 'admin' | 'manager' | 'leader' | 'worker';

interface CategoryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated: (data: {
    categoryName: string;
    permissions?: {
      viewRole?: string[];
      manageRole?: string[];
    };
  }) => Promise<void>;
}

export const CategoryCreateModal: React.FC<CategoryCreateModalProps> = ({
  open,
  onOpenChange,
  onCategoryCreated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [viewRoles, setViewRoles] = useState<UserRole[]>([]);
  const [manageRoles, setManageRoles] = useState<UserRole[]>([]);

  const availableRoles: UserRole[] = ['admin', 'manager', 'leader', 'worker'];
  const roleLabels: Record<UserRole, string> = {
    admin: '管理者',
    manager: 'マネージャー',
    leader: 'リーダー',
    worker: 'ワーカー',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション: 空白チェック
    if (!categoryName.trim()) {
      setError('カテゴリ名を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 管理権限を持つロールを閲覧権限に自動追加
      const finalViewRoles = [...new Set([...viewRoles, ...manageRoles])];

      // 権限が設定されている場合のみpermissionsオブジェクトを作成
      const permissions =
        finalViewRoles.length > 0 || manageRoles.length > 0
          ? {
              ...(finalViewRoles.length > 0 && { viewRole: finalViewRoles }),
              ...(manageRoles.length > 0 && { manageRole: manageRoles }),
            }
          : undefined;

      await onCategoryCreated({
        categoryName: categoryName.trim(),
        permissions,
      });

      // 成功時: フォームリセットとモーダルクローズ
      setCategoryName('');
      setViewRoles([]);
      setManageRoles([]);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create category:', err);
      setError('カテゴリの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCategoryName('');
    setError('');
    setViewRoles([]);
    setManageRoles([]);
    onOpenChange(false);
  };

  const handleViewRoleToggle = (role: UserRole) => {
    setViewRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleManageRoleToggle = (role: UserRole) => {
    setManageRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleCancel();
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <FolderPlus className="w-5 h-5" />
            カテゴリを作成
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            チャンネルを整理するための新しいカテゴリを作成します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="categoryName"
              className="text-gray-700 dark:text-gray-300"
            >
              カテゴリ名 *
            </Label>
            <Input
              id="categoryName"
              placeholder="例：開発チーム、営業部"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {error}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              チャンネルを整理するためのカテゴリ名を入力してください
            </p>
          </div>

          {/* 権限設定セクション */}
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                権限設定（オプション）
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                権限を設定しない場合、すべてのユーザーが閲覧・管理できます
              </p>
            </div>

            {/* 閲覧権限 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                閲覧権限
              </Label>
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <div key={`view-${role}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`view-${role}`}
                      checked={viewRoles.includes(role) || manageRoles.includes(role)}
                      onCheckedChange={() => handleViewRoleToggle(role)}
                      disabled={isLoading || manageRoles.includes(role)}
                      className="border-gray-300 dark:border-gray-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                    />
                    <label
                      htmlFor={`view-${role}`}
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    >
                      {roleLabels[role]}
                      {manageRoles.includes(role) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          (管理権限により自動付与)
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                選択したロールのユーザーのみがこのカテゴリを閲覧できます
              </p>
            </div>

            {/* 管理権限 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                管理権限
              </Label>
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <div key={`manage-${role}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`manage-${role}`}
                      checked={manageRoles.includes(role)}
                      onCheckedChange={() => handleManageRoleToggle(role)}
                      disabled={isLoading}
                      className="border-gray-300 dark:border-gray-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                    />
                    <label
                      htmlFor={`manage-${role}`}
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    >
                      {roleLabels[role]}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                選択したロールのユーザーがこのカテゴリを管理できます（閲覧権限も自動付与）
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !categoryName.trim()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            >
              {isLoading ? '作成中...' : 'カテゴリを作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
