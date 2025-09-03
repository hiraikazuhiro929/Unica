"use client";

import React, { useState } from "react";
import { MessageCircle, Send, Check, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addReplyToDailyReport, markReplyAsRead } from "@/lib/firebase/dailyReports";
import { DailyReportEntry } from "@/app/tasks/types";

interface ReplySectionProps {
  report: DailyReportEntry;
  isAdmin?: boolean;
  currentUser?: string;
  onReplyAdded?: () => void;
}

export const ReplySection: React.FC<ReplySectionProps> = ({
  report,
  isAdmin = false,
  currentUser = "会長",
  onReplyAdded,
}) => {
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  // 返信を送信
  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addReplyToDailyReport(report.id, {
        content: replyContent,
        repliedBy: currentUser,
      });

      if (result.success) {
        setReplyContent("");
        setShowReplyForm(false);
        onReplyAdded?.();
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 既読にする（作業者が開いた時）
  const handleMarkAsRead = async () => {
    if (!isAdmin && report.adminReply && !report.adminReply.isRead) {
      await markReplyAsRead(report.id);
      onReplyAdded?.(); // リフレッシュ
    }
  };

  // 作業者が開いた時に自動的に既読にする
  React.useEffect(() => {
    handleMarkAsRead();
  }, []);

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 mt-4 pt-4">
      {/* 既存の返信表示 */}
      {report.adminReply && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              {report.adminReply.repliedBy}からの返信
            </span>
            {!report.adminReply.isRead && !isAdmin && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                未読
              </span>
            )}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
              {report.adminReply.content}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(report.adminReply.repliedAt).toLocaleString("ja-JP")}
                </span>
              </div>
              {report.adminReply.isRead && (
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span>既読</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 管理者は返信を編集可能 */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setReplyContent(report.adminReply?.content || "");
                setShowReplyForm(true);
              }}
            >
              返信を編集
            </Button>
          )}
        </div>
      )}

      {/* 管理者用返信フォーム */}
      {isAdmin && (
        <div>
          {!showReplyForm && !report.adminReply ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              返信する
            </Button>
          ) : showReplyForm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {currentUser}として返信
                </span>
              </div>
              
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="返信内容を入力してください..."
                className="w-full min-h-[100px] p-3 border border-gray-200 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={isSubmitting}
              />
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {report.adminReply ? "返信を更新" : "返信を送信"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent("");
                  }}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 作業者向けの未読通知 */}
      {!isAdmin && report.adminReply && !report.adminReply.isRead && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              新しい返信があります
            </span>
          </div>
        </div>
      )}
    </div>
  );
};