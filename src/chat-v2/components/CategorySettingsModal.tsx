/**
 * CategorySettingsModal - カテゴリ設定モーダル
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, Users, Eye, Shield } from 'lucide-react';
import { ChannelCategory, CategoryId, UserId } from '../types';

interface CategorySettingsModalProps {
  category: ChannelCategory | null;
  isOpen: boolean;
  currentUserRole: 'admin' | 'manager' | 'leader' | 'worker';
  onClose: () => void;
  onUpdate: (categoryId: CategoryId, updates: Partial<ChannelCategory>) => void;
  onDelete: (categoryId: CategoryId) => void;
}

export const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({
  category,
  isOpen,
  currentUserRole,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [viewRoles, setViewRoles] = useState<string[]>([]);
  const [manageRoles, setManageRoles] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // カテゴリが変更されたら状態を更新
  useEffect(() => {
    if (category) {
      setName(category.name);
      setViewRoles(category.permissions?.viewRole || []);
      setManageRoles(category.permissions?.manageRole || []);
      setShowDeleteConfirm(false);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const canDelete = currentUserRole === 'admin';
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleSave = () => {
    if (!category || !name.trim()) return;

    onUpdate(category.id, {
      name: name.trim(),
      permissions: {
        viewRole: viewRoles.length > 0 ? viewRoles : undefined,
        manageRole: manageRoles.length > 0 ? manageRoles : undefined,
      },
    });
    onClose();
  };

  const handleDelete = () => {
    if (!category) return;
    onDelete(category.id);
    onClose();
  };

  const toggleRole = (role: string, type: 'view' | 'manage') => {
    if (type === 'view') {
      setViewRoles(prev =>
        prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
      );
    } else {
      setManageRoles(prev =>
        prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
      );
    }
  };

  const availableRoles = ['admin', 'manager', 'leader', 'worker'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            カテゴリ設定
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* カテゴリ名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              カテゴリ名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="カテゴリ名を入力"
            />
          </div>

          {/* 閲覧権限 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                閲覧権限
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              未選択の場合は全員が閲覧可能です
            </p>
            <div className="grid grid-cols-2 gap-3">
              {availableRoles.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 p-3 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={viewRoles.includes(role)}
                    onChange={() => toggleRole(role, 'view')}
                    disabled={!canManage}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {role === 'admin' ? '管理者' : role === 'manager' ? 'マネージャー' : role === 'leader' ? 'リーダー' : 'ワーカー'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 管理権限 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                管理権限
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              カテゴリ設定の変更やチャンネルの追加/削除が可能
            </p>
            <div className="grid grid-cols-2 gap-3">
              {availableRoles.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 p-3 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={manageRoles.includes(role)}
                    onChange={() => toggleRole(role, 'manage')}
                    disabled={!canManage}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {role === 'admin' ? '管理者' : role === 'manager' ? 'マネージャー' : role === 'leader' ? 'リーダー' : 'ワーカー'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 削除セクション */}
          {canDelete && (
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="w-4 h-4 text-red-500" />
                <label className="text-sm font-medium text-red-600 dark:text-red-400">
                  危険な操作
                </label>
              </div>
              {showDeleteConfirm ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                    このカテゴリを削除してもよろしいですか？所属するチャンネルは「未分類」に移動されます。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      削除する
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-md transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  カテゴリを削除
                </button>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!canManage || !name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
