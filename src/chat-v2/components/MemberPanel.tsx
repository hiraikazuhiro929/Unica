"use client";
import React, { useEffect, useState } from "react";
import { X, UserPlus, Search, Crown, Shield } from "lucide-react";
import { ChatUser, ChannelId, UserId } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MemberPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: ChannelId | null;
  members: ChatUser[];
  currentUserId: UserId | undefined;
  onUserClick: (userId: string) => void;
  onInviteClick?: () => void;
}

export const MemberPanel: React.FC<MemberPanelProps> = ({
  isOpen,
  onClose,
  members,
  currentUserId,
  onUserClick,
  onInviteClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<ChatUser[]>(members);

  // メンバー検索フィルタリング
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  // オンライン・オフライン別にソート
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // オンライン状態で優先ソート
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    // 名前でソート
    return a.name.localeCompare(b.name, "ja");
  });

  const onlineCount = members.filter((m) => m.isOnline).length;
  const totalCount = members.length;

  const getStatusColor = (user: ChatUser) => {
    if (!user.isOnline) return "bg-gray-400 dark:bg-gray-600";

    switch (user.status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
      case "administrator":
        return (
          <Badge variant="destructive" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            管理者
          </Badge>
        );
      case "manager":
        return (
          <Badge variant="default" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            マネージャー
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              メンバー
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-400">
              {onlineCount} オンライン / {totalCount} 人
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* 検索バー */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="メンバーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-blue-500 rounded-md focus:outline-none text-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* 招待ボタン（権限がある場合） */}
        {onInviteClick && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <Button
              onClick={onInviteClick}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              メンバーを招待
            </Button>
          </div>
        )}

        {/* メンバーリスト */}
        <div className="flex-1 overflow-y-auto">
          {sortedMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <Search className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                メンバーが見つかりませんでした
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {sortedMembers.map((member) => {
                const isCurrentUser = member.id === currentUserId;

                return (
                  <button
                    key={member.id}
                    onClick={() => onUserClick(member.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left group"
                  >
                    {/* アバター */}
                    <div className="relative flex-shrink-0">
                      {member.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* オンラインステータス */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${getStatusColor(
                          member
                        )}`}
                      />
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {member.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              (あなた)
                            </span>
                          )}
                        </p>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-400 truncate">
                        {member.department}
                      </p>
                      {member.statusMessage && (
                        <p className="text-xs text-gray-500 dark:text-slate-500 italic truncate mt-0.5">
                          &ldquo;{member.statusMessage}&rdquo;
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター統計 */}
        <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 bg-gray-50 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-4 text-center text-xs">
            <div>
              <div className="font-semibold text-green-600 dark:text-green-400">
                {onlineCount}
              </div>
              <div className="text-gray-600 dark:text-gray-400">オンライン</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600 dark:text-gray-400">
                {totalCount - onlineCount}
              </div>
              <div className="text-gray-600 dark:text-gray-400">オフライン</div>
            </div>
          </div>
        </div>
    </div>
  );
};
