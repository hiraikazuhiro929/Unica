"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search,
  X,
  Calendar as CalendarIcon,
  User,
  Filter,
  MessageSquare,
  Hash
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { ChatMessage, ChatUser, ChatChannel } from "@/lib/firebase/chat";

interface SearchFilters {
  query: string;
  userId?: string;
  channelId?: string;
  startDate?: Date;
  endDate?: Date;
  type: 'all' | 'keyword' | 'user' | 'date' | 'channel';
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
  channels: ChatChannel[];
  onSearch: (filters: SearchFilters) => Promise<ChatMessage[]>;
  formatTimestamp: (timestamp: any) => string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  isOpen,
  onClose,
  users,
  channels,
  onSearch,
  formatTimestamp,
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
  });
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!filters.query.trim() && filters.type === 'all') return;
    
    setIsSearching(true);
    try {
      const searchResults = await onSearch(filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      type: 'all',
    });
    setResults([]);
  };

  const getSearchTypeLabel = (type: string) => {
    switch (type) {
      case 'keyword': return 'キーワード検索';
      case 'user': return 'ユーザー別検索';
      case 'date': return '日付検索';
      case 'channel': return 'チャンネル検索';
      default: return '全体検索';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[600px] flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">メッセージ検索</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 検索フォーム */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          {/* 検索タイプ選択 */}
          <div className="flex items-center space-x-2">
            <Select
              value={filters.type}
              onValueChange={(value: SearchFilters['type']) =>
                setFilters(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全体検索</SelectItem>
                <SelectItem value="keyword">キーワード</SelectItem>
                <SelectItem value="user">ユーザー別</SelectItem>
                <SelectItem value="date">日付範囲</SelectItem>
                <SelectItem value="channel">チャンネル</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              フィルター
            </Button>
          </div>

          {/* メイン検索入力 */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={
                  filters.type === 'keyword' ? 'キーワードを入力...' :
                  filters.type === 'user' ? 'ユーザー名を入力...' :
                  'メッセージを検索...'
                }
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? '検索中...' : '検索'}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              クリア
            </Button>
          </div>

          {/* フィルター詳細 */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              {/* ユーザー選択 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ユーザー</label>
                <Select
                  value={filters.userId || ''}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, userId: value || undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="すべてのユーザー" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">すべてのユーザー</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center space-x-2">
                          <User className="w-3 h-3" />
                          <span>{user.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* チャンネル選択 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">チャンネル</label>
                <Select
                  value={filters.channelId || ''}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, channelId: value || undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="すべてのチャンネル" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">すべてのチャンネル</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center space-x-2">
                          <Hash className="w-3 h-3" />
                          <span>{channel.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 日付範囲 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">日付範囲</label>
                <div className="flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-xs h-8 px-2"
                      >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {filters.startDate ? format(filters.startDate, "MM/dd", { locale: ja }) : "開始"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.startDate}
                        onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-gray-400">〜</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-xs h-8 px-2"
                      >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {filters.endDate ? format(filters.endDate, "MM/dd", { locale: ja }) : "終了"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.endDate}
                        onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 検索結果 */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-4">
                {results.length}件の結果が見つかりました
              </div>
              
              {results.map((message) => {
                const channel = channels.find(c => c.id === message.channelId);
                const user = users.find(u => u.id === message.authorId);
                
                return (
                  <div
                    key={message.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        <Hash className="w-3 h-3 mr-1" />
                        {channel?.name}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{message.authorName}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-800 break-words">
                      {message.content}
                    </div>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        {message.attachments.length}個の添付ファイル
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {isSearching ? '検索中...' : 'メッセージを検索してください'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;