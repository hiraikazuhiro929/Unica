"use client";
import React from "react";
import type { ChatUser } from "@/lib/firebase/chat";
import { sanitizeMessageContent, sanitizeUrl, sanitizeUsername } from "@/lib/utils/sanitization";

interface MessageContentProps {
  content: string;
  mentions?: string[];
  users: ChatUser[];
  currentUserId?: string;
  onUserClick?: (user: ChatUser) => void;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  mentions = [],
  users,
  currentUserId,
  onUserClick,
}) => {
  
  // メンションをハイライト表示する関数
  const renderMessageWithMentions = (text: string): React.ReactNode => {
    // まず入力をサニタイズ
    const sanitizedText = sanitizeMessageContent(text);

    // テキスト内の@mentionを直接解析してハイライト表示する
    // （mentionsフィールドが空でも動作する）

    // @username パターンでメンションを検出（日本語も対応）
    const mentionPattern = /@([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(sanitizedText)) !== null) {
      const mentionedUsername = match[1];
      const mentionStart = match.index;
      const mentionEnd = match.index + match[0].length;

      // メンション前のテキスト
      if (mentionStart > lastIndex) {
        parts.push(sanitizedText.slice(lastIndex, mentionStart));
      }

      // メンションされたユーザーを検索（ユーザー名もサニタイズ）
      const sanitizedMentionedUsername = sanitizeUsername(mentionedUsername);
      const mentionedUser = users.find(user => {
        const sanitizedUserName = sanitizeUsername(user.name);
        return sanitizedUserName === sanitizedMentionedUsername ||
               sanitizedUserName.toLowerCase() === sanitizedMentionedUsername.toLowerCase();
      });

      // 現在のユーザーかどうかチェック
      const isCurrentUserMentioned = 
        mentionedUser?.id === currentUserId ||
        mentionedUser?.name === currentUserId; // ユーザー名でも判定

      // Discord風のインラインメンション（背景なし、文字色のみ）
      parts.push(
        <span
          key={`mention-${mentionStart}`}
          className={`cursor-pointer transition-colors ${
            mentionedUser 
              ? 'text-[#5865f2] hover:underline' // Discord風の青色リンク
              : 'text-gray-500' // 存在しないユーザー
          }`}
          onClick={() => {
            if (mentionedUser && onUserClick) {
              onUserClick(mentionedUser);
            }
          }}
          title={mentionedUser ? `${sanitizeUsername(mentionedUser.name)} (${sanitizeUsername(mentionedUser.role)})` : sanitizedMentionedUsername}
        >
          @{sanitizedMentionedUsername}
        </span>
      );

      lastIndex = mentionEnd;
    }

    // 残りのテキスト
    if (lastIndex < sanitizedText.length) {
      parts.push(sanitizedText.slice(lastIndex));
    }

    // メンションが見つからなかった場合はサニタイズされたテキストを返す
    return parts.length > 0 ? parts : sanitizedText;
  };

  // URLリンクを検出してクリック可能にする関数
  const renderWithLinks = (node: React.ReactNode): React.ReactNode => {
    if (typeof node !== 'string') return node;
    
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = urlPattern.exec(node)) !== null) {
      const url = match[1];
      const sanitizedUrl = sanitizeUrl(url);
      const urlStart = match.index;
      const urlEnd = match.index + match[0].length;

      // URLが無効またはセキュリティリスクがある場合はスキップ
      if (!sanitizedUrl) {
        continue;
      }

      // URL前のテキスト
      if (urlStart > lastIndex) {
        parts.push(node.slice(lastIndex, urlStart));
      }

      // セキュアなURLリンク
      parts.push(
        <a
          key={`url-${urlStart}`}
          href={sanitizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {sanitizedUrl}
        </a>
      );

      lastIndex = urlEnd;
    }

    // 残りのテキスト
    if (lastIndex < node.length) {
      parts.push(node.slice(lastIndex));
    }

    return parts;
  };

  // 改行を処理する関数
  const renderWithLineBreaks = (content: React.ReactNode[]): React.ReactNode => {
    const result: React.ReactNode[] = [];
    
    content.forEach((part, index) => {
      if (typeof part === 'string') {
        const lines = part.split('\n');
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            result.push(<br key={`br-${index}-${lineIndex}`} />);
          }
          if (line) {
            result.push(renderWithLinks(line));
          }
        });
      } else {
        result.push(part);
      }
    });

    return result;
  };

  // メンション処理
  const mentionedContent = renderMessageWithMentions(content);
  
  // 配列の場合は改行とリンク処理を適用
  if (Array.isArray(mentionedContent)) {
    return <>{renderWithLineBreaks(mentionedContent)}</>;
  }
  
  // 文字列の場合はリンク処理のみ適用
  return <>{renderWithLinks(mentionedContent)}</>;
};