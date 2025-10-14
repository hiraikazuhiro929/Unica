/**
 * UserSelectModal - ユーザー選択モーダル（新規DM開始用）
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, X } from 'lucide-react';
import type { ChatUser, UserId } from '../types';

interface UserSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
  currentUserId: UserId;
  onSelectUser: (userId: UserId) => void;
}

export const UserSelectModal: React.FC<UserSelectModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 自分以外のユーザーをフィルタリング
  const availableUsers = useMemo(() => {
    return users.filter(user => user.id !== currentUserId);
  }, [users, currentUserId]);

  // 検索フィルタリング
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;

    const query = searchQuery.toLowerCase();
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const handleSelectUser = (userId: UserId) => {
    onSelectUser(userId);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'オンライン';
      case 'away': return '離席中';
      case 'busy': return '取り込み中';
      default: return 'オフライン';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <MessageCircle className="w-5 h-5" />
            新しいダイレクトメッセージ
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            メッセージを送信するユーザーを選択してください
          </DialogDescription>
        </DialogHeader>

        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="ユーザー名、メールアドレス、部署で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-10 bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ユーザーリスト */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 dark:border-slate-700 rounded-lg">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">
                {searchQuery ? '該当するユーザーが見つかりません' : 'ユーザーがいません'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  {/* アバター */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {/* オンライン状態 */}
                    <div className={`absolute bottom-0 right-0 w-4 h-4 ${getStatusColor(user.status)} border-2 border-white dark:border-slate-800 rounded-full`}></div>
                  </div>

                  {/* ユーザー情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        user.status === 'online'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </div>
                    {user.email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    )}
                    {user.department && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                        {user.department}
                      </p>
                    )}
                  </div>

                  {/* アイコン */}
                  <MessageCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredUsers.length}人のユーザー
          </p>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-300 dark:border-slate-600"
          >
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
