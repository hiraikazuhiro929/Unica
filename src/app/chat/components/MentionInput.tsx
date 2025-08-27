"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, AtSign, Users } from "lucide-react";
import type { ChatUser } from "@/lib/firebase/chat";

interface MentionSuggestion {
  id: string;
  name: string;
  role: string;
  department: string;
  type: 'user' | 'everyone' | 'here';
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  users: ChatUser[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SPECIAL_MENTIONS: MentionSuggestion[] = [
  {
    id: '@everyone',
    name: 'everyone',
    role: '全員',
    department: '全部門',
    type: 'everyone'
  },
  {
    id: '@here',
    name: 'here',
    role: 'オンライン',
    department: '現在アクティブ',
    type: 'here'
  }
];

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSend,
  users,
  placeholder = "メッセージを入力...",
  disabled = false,
  className = "",
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // メンション候補を生成
  const generateSuggestions = useCallback((query: string): MentionSuggestion[] => {
    const normalizedQuery = query.toLowerCase();
    
    // ユーザー候補
    const userSuggestions = users
      .filter(user => 
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.department?.toLowerCase().includes(normalizedQuery)
      )
      .map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.department || '未設定',
        type: 'user' as const
      }));

    // 特殊メンション候補
    const specialSuggestions = SPECIAL_MENTIONS.filter(mention =>
      mention.name.toLowerCase().includes(normalizedQuery)
    );

    return [...specialSuggestions, ...userSuggestions].slice(0, 10);
  }, [users]);

  // テキスト変更処理
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // メンション検出ロジック
    const beforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      const newSuggestions = generateSuggestions(query);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
    }
  }, [onChange, generateSuggestions]);

  // メンション挿入
  const insertMention = useCallback((suggestion: MentionSuggestion) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    
    // @query を @username に置換
    const mentionRegex = /@\w*$/;
    const beforeMention = beforeCursor.replace(mentionRegex, '');
    const mentionText = suggestion.type === 'user' 
      ? `@${suggestion.name}` 
      : `@${suggestion.name}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterCursor;
    const newCursorPos = beforeMention.length + mentionText.length + 1;
    
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    
    // カーソル位置を更新
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  }, [value, cursorPosition, onChange]);

  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          Math.min(prev + 1, suggestions.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedSuggestionIndex]) {
          insertMention(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  }, [showSuggestions, suggestions, selectedSuggestionIndex, insertMention, onSend]);

  // クリック時にメンション候補を閉じる
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // メンション候補のアイコン
  const getSuggestionIcon = (suggestion: MentionSuggestion) => {
    switch (suggestion.type) {
      case 'everyone':
        return <Users className="w-4 h-4 text-red-500" />;
      case 'here':
        return <Users className="w-4 h-4 text-green-500" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
            {suggestion.name.charAt(0).toUpperCase()}
          </div>
        );
    }
  };

  // 入力値内のメンションをハイライト表示用に解析
  const renderInputValue = () => {
    const mentionRegex = /@(\w+)/g;
    const parts = value.split(mentionRegex);
    
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center px-3 text-transparent">
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            // メンション部分
            const user = users.find(u => u.name === part);
            const isSpecial = ['everyone', 'here'].includes(part);
            
            if (user || isSpecial) {
              return (
                <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded">
                  @{part}
                </span>
              );
            }
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          {/* メイン入力フィールド */}
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[44px] resize-none pr-20"
          />
          
          {/* メンション入力のヒント */}
          {!value && !showSuggestions && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center text-gray-400">
              <AtSign className="w-4 h-4 mr-1" />
              <span className="text-sm">@でメンション</span>
            </div>
          )}

          {/* メンション候補リスト */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
                  メンション候補
                </div>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                      index === selectedSuggestionIndex
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => insertMention(suggestion)}
                  >
                    {getSuggestionIcon(suggestion)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          @{suggestion.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {suggestion.department}
                      </div>
                    </div>
                    {suggestion.type === 'everyone' && (
                      <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                        全員通知
                      </Badge>
                    )}
                    {suggestion.type === 'here' && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                        オンライン
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 送信ボタン */}
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* 現在のメンション表示 */}
      {value && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from(value.matchAll(/@(\w+)/g)).map((match, index) => {
            const mentionName = match[1];
            const user = users.find(u => u.name === mentionName);
            const isSpecial = ['everyone', 'here'].includes(mentionName);
            
            if (user || isSpecial) {
              return (
                <Badge
                  key={`${mentionName}-${index}`}
                  variant={isSpecial ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  <AtSign className="w-3 h-3 mr-1" />
                  {mentionName}
                  {isSpecial && (
                    <span className="ml-1">
                      {mentionName === 'everyone' ? '(全員)' : '(オンライン)'}
                    </span>
                  )}
                </Badge>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};