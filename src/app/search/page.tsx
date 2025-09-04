"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, 
  Clock, 
  Users, 
  FileText, 
  Target, 
  ClipboardList,
  Building2,
  Calendar,
  StickyNote,
  ChevronRight,
  Filter,
  X,
  ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

// Firebase関数をインポート
import { getDailyReportsList } from "@/lib/firebase/dailyReports";
import { getWorkHoursList } from "@/lib/firebase/workHours";
import { getProcessesList } from "@/lib/firebase/processes";
import { getOrders } from "@/lib/firebase/orders";

// 検索結果の型定義
interface SearchResult {
  id: string;
  type: 'daily-report' | 'work-hours' | 'process' | 'order' | 'note' | 'calendar';
  title: string;
  subtitle: string;
  content: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

// データタイプの設定
const dataTypes = [
  { value: 'all', label: '全て', icon: Search },
  { value: 'daily-report', label: '日報', icon: FileText },
  { value: 'work-hours', label: '工数管理', icon: Clock },
  { value: 'process', label: '工程', icon: Target },
  { value: 'order', label: '受注案件', icon: ClipboardList },
  { value: 'note', label: 'メモ', icon: StickyNote },
  { value: 'calendar', label: 'カレンダー', icon: Calendar },
];

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isRealTimeSearching, setIsRealTimeSearching] = useState(false);
  const [popularSearches] = useState<string[]>([
    '工程',
    '日報',
    '受注案件',
    '工数',
    '進捗',
    '遅延',
    '完了',
    '予定',
    '実績',
    '機械',
    '作業者',
    '客先'
  ]);

  // ローカルストレージから最近の検索履歴を読み込み
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // 検索履歴を保存
  const saveSearchHistory = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // 候補を表示するかどうかを判定
  const shouldShowSuggestions = () => {
    return isInputFocused && !hasSearched && query.length < 2;
  };

  // debounced検索関数
  const debouncedSearch = useCallback((searchQuery: string, searchType: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsRealTimeSearching(true);
        setHasSearched(true);
        const results = await searchData(searchQuery, searchType);
        setResults(results);
        setIsRealTimeSearching(false);
      } else if (searchQuery.trim().length === 0) {
        setResults([]);
        setHasSearched(false);
      }
    }, 300); // 300msの遅延

    setDebounceTimer(timer);
  }, [debounceTimer]);

  // データを検索する関数
  const searchData = async (searchQuery: string, type: string = 'all') => {
    if (!searchQuery.trim()) return [];

    setIsLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // 日報検索
      if (type === 'all' || type === 'daily-report') {
        const { data: dailyReports } = await getDailyReportsList();
        if (dailyReports) {
          dailyReports
            .filter(report => 
              report.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              report.workContent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              report.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              report.achievements?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .forEach(report => {
              searchResults.push({
                id: report.id!,
                type: 'daily-report',
                title: `${report.workerName}の日報`,
                subtitle: `${report.date} - ${report.workContent || '作業内容未設定'}`,
                content: report.achievements || report.notes || '内容なし',
                url: `/daily-reports?id=${report.id}`,
                createdAt: report.createdAt,
                metadata: { 
                  worker: report.workerName, 
                  date: report.date,
                  workTime: report.workTimeEntries?.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0) || 0
                }
              });
            });
        }
      }

      // 工数管理検索
      if (type === 'all' || type === 'work-hours') {
        const { data: workHours } = await getWorkHoursList();
        if (workHours) {
          workHours
            .filter(wh => 
              wh.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              wh.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              wh.managementNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              wh.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .forEach(wh => {
              searchResults.push({
                id: wh.id!,
                type: 'work-hours',
                title: wh.projectName || '案件名未設定',
                subtitle: `${wh.client} - ${wh.managementNumber}`,
                content: `計画工数: ${wh.plannedHours?.total || 0}h / 実工数: ${wh.actualHours?.total || 0}h`,
                url: `/work-hours?id=${wh.id}`,
                createdAt: wh.createdAt,
                metadata: { 
                  client: wh.client, 
                  status: wh.status,
                  plannedHours: wh.plannedHours?.total || 0,
                  actualHours: wh.actualHours?.total || 0,
                  tags: wh.tags
                }
              });
            });
        }
      }

      // 工程検索
      if (type === 'all' || type === 'process') {
        const { data: processes } = await getProcessesList();
        if (processes) {
          processes
            .filter(process => 
              process.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              process.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              process.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .forEach(process => {
              searchResults.push({
                id: process.id!,
                type: 'process',
                title: process.title || '工程名未設定',
                subtitle: `担当: ${process.assignedTo || '未設定'} - ${process.status}`,
                content: process.description || '説明なし',
                url: `/tasks?id=${process.id}`,
                createdAt: process.createdAt,
                metadata: { 
                  assignedTo: process.assignedTo, 
                  status: process.status,
                  priority: process.priority,
                  startDate: process.startDate,
                  endDate: process.endDate
                }
              });
            });
        }
      }

      // 受注案件検索
      if (type === 'all' || type === 'order') {
        const { data: orders } = await getOrders();
        if (orders) {
          orders
            .filter(order => 
              order.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              order.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              order.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .forEach(order => {
              searchResults.push({
                id: order.id!,
                type: 'order',
                title: order.projectName || '案件名未設定',
                subtitle: `${order.client} - ${order.status}`,
                content: order.description || '説明なし',
                url: `/orders?id=${order.id}`,
                createdAt: order.createdAt,
                metadata: { 
                  client: order.client, 
                  status: order.status,
                  budget: order.estimatedAmount,
                  deadline: order.deliveryDate
                }
              });
            });
        }
      }

    } catch (error) {
      console.error('Search error:', error);
    }

    setIsLoading(false);
    return searchResults.sort((a, b) => 
      new Date(b.updatedAt || b.createdAt || '').getTime() - 
      new Date(a.updatedAt || a.createdAt || '').getTime()
    );
  };

  // 検索実行
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setHasSearched(true);
    setShowSuggestions(false);
    setIsInputFocused(false);
    saveSearchHistory(query.trim());
    const results = await searchData(query, selectedType);
    setResults(results);
  };

  // 候補クリック時の処理
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setIsInputFocused(false);
    setShowSuggestions(false);
    setTimeout(() => {
      handleSearchWithQuery(suggestion);
    }, 100);
  };

  // 指定されたクエリで検索実行
  const handleSearchWithQuery = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setHasSearched(true);
    saveSearchHistory(searchQuery.trim());
    const results = await searchData(searchQuery, selectedType);
    setResults(results);
  };

  // 入力変更時の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // リアルタイム検索を実行
    debouncedSearch(value, selectedType);
  };

  // フィルタータイプ変更時の処理
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    
    // 現在のクエリでリアルタイム検索を実行
    if (query.trim().length >= 2) {
      debouncedSearch(query, newType);
    }
  };

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 結果アイテムの色とアイコンを取得
  const getResultStyle = (type: string) => {
    switch (type) {
      case 'daily-report':
        return { 
          color: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: FileText
        };
      case 'work-hours':
        return { 
          color: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-700',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: Clock
        };
      case 'process':
        return { 
          color: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
          badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          icon: Target
        };
      case 'order':
        return { 
          color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          icon: ClipboardList
        };
      default:
        return { 
          color: 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
          badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          icon: Search
        };
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="ml-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-500">ログインが必要です</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="ml-16 p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">横断検索</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            システム全体からデータを検索できます
          </p>
        </div>

        {/* 検索フィールド */}
        <Card className="mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="検索キーワードを入力（自動検索）..."
                      value={query}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      onFocus={() => {
                        setIsInputFocused(true);
                        if (query.length === 0) {
                          setHasSearched(false);
                        }
                      }}
                      onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                      className="text-lg h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                    />
                    
                    {/* 候補表示 */}
                    {shouldShowSuggestions() && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 mt-1">
                        <div className="p-4">
                          {recentSearches.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                最近の検索
                              </h4>
                              <div className="space-y-1">
                                {recentSearches.map((search, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(search)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                                  >
                                    {search}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <Search className="w-4 h-4" />
                              よく使われる検索
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {popularSearches.map((search, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSuggestionClick(search)}
                                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 transition-colors"
                                >
                                  {search}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-48 h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleSearch}
                  disabled={!query.trim() || isLoading || isRealTimeSearching}
                  className="h-12 px-6"
                >
                  {isLoading || isRealTimeSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      検索
                    </>
                  )}
                </Button>
              </div>

              {/* フィルター情報 */}
              {selectedType !== 'all' && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    フィルター: {dataTypes.find(t => t.value === selectedType)?.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTypeChange('all')}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 検索結果 */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                検索結果
                {results.length > 0 && !isRealTimeSearching && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({results.length}件見つかりました)
                  </span>
                )}
                {isRealTimeSearching && (
                  <span className="ml-2 text-sm font-normal text-gray-500 flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                    検索中...
                  </span>
                )}
              </h2>
            </div>

            {results.length === 0 && !isRealTimeSearching ? (
              <Card className="text-center py-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent>
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    検索結果が見つかりませんでした
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    別のキーワードで検索してみてください
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {results.map((result) => {
                  const style = getResultStyle(result.type);
                  const Icon = style.icon;
                  
                  return (
                    <Card 
                      key={result.id}
                      className={`${style.color} hover:shadow-md transition-all duration-200 cursor-pointer`}
                      onClick={() => router.push(result.url)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${style.badgeColor} text-xs`}>
                                {dataTypes.find(t => t.value === result.type)?.label}
                              </Badge>
                              {result.createdAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(result.createdAt).toLocaleDateString('ja-JP')}
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                              {result.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">
                              {result.subtitle}
                            </p>
                            
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                              {result.content}
                            </p>
                            
                            {/* メタデータ（コンパクト表示） */}
                            {result.metadata && (
                              <div className="flex items-center gap-2 text-xs">
                                {result.type === 'work-hours' && result.metadata.tags && (
                                  <div className="flex gap-1">
                                    {result.metadata.tags.slice(0, 2).map((tag: string, index: number) => (
                                      <span key={index} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                                        #{tag}
                                      </span>
                                    ))}
                                    {result.metadata.tags.length > 2 && (
                                      <span className="text-gray-500 dark:text-gray-400">+{result.metadata.tags.length - 2}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-shrink-0">
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 初期状態のヘルプ */}
        {!hasSearched && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                システム横断検索
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto text-sm">
                日報、工数管理、工程、受注案件など、システム全体からデータを検索できます。
              </p>
              
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
                {dataTypes.slice(1).map(type => {
                  const Icon = type.icon;
                  return (
                    <div key={type.value} className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                      <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 mb-1" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {type.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}