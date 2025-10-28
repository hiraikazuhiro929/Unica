/**
 * ChannelCreateModal - チャンネル作成モーダル
 */

import React, { useState } from 'react';
import { X, Hash, Volume2, Megaphone } from 'lucide-react';
import { CategoryId } from '../types';

interface ChannelCreateModalProps {
  isOpen: boolean;
  categoryId: CategoryId;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    type: 'text' | 'voice' | 'announcement';
    categoryId: CategoryId;
    description?: string;
    topic?: string;
    isPrivate: boolean;
  }) => void;
}

export const ChannelCreateModal: React.FC<ChannelCreateModalProps> = ({
  isOpen,
  categoryId,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice' | 'announcement'>('text');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;

    onCreate({
      name: name.trim(),
      type,
      categoryId,
      description: description.trim() || undefined,
      topic: topic.trim() || undefined,
      isPrivate,
    });

    // リセット
    setName('');
    setType('text');
    setDescription('');
    setTopic('');
    setIsPrivate(false);
    onClose();
  };

  const getTypeIcon = (channelType: 'text' | 'voice' | 'announcement') => {
    switch (channelType) {
      case 'text':
        return <Hash className="w-5 h-5" />;
      case 'voice':
        return <Volume2 className="w-5 h-5" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            チャンネルを作成
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4 space-y-4">
          {/* チャンネル名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              チャンネル名 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: general"
              autoFocus
            />
          </div>

          {/* チャンネルタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              チャンネルタイプ
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['text', 'announcement'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-2 p-3 border rounded-md transition-colors ${
                    type === t
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {getTypeIcon(t)}
                  <span className="text-sm capitalize">
                    {t === 'text' ? 'テキスト' : 'お知らせ'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* トピック */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              トピック
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="チャンネルのトピック"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="チャンネルの説明"
              rows={3}
            />
          </div>

          {/* プライベート設定 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              プライベートチャンネル
            </label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
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
            onClick={handleSubmit}
            disabled={!name.trim() || !categoryId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
};
