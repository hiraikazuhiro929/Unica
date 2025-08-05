import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, RefreshCw, ExternalLink, Plus } from 'lucide-react';

interface Schedule {
  id: number;
  time: string;
  endTime: string;
  title: string;
  location: string;
  color: string;
}

interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  provider: 'google' | 'outlook' | null;
}

interface MiniCalendarProps {
  scheduledDays?: number[];
  todaySchedule: Schedule[];
  currentTime: Date;
  monthSchedule?: { day: number; schedules: { color: string; title: string }[] }[];
  onSync?: () => void;
  syncStatus?: SyncStatus;
}

export default function MiniCalendar({ 
  scheduledDays = [], 
  todaySchedule, 
  currentTime, 
  monthSchedule = [],
  onSync,
  syncStatus = { isConnected: false, lastSync: null, provider: null }
}: MiniCalendarProps) {
  const [isSync, setIsSync] = useState(false);
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  // カレンダー用の日付計算
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  // デモ用の月間予定データ
  const demoMonthSchedule = monthSchedule.length > 0 ? monthSchedule : [
    { day: 3, schedules: [{ color: 'bg-blue-500', title: '会議' }] },
    { day: 5, schedules: [{ color: 'bg-green-500', title: '作業' }, { color: 'bg-red-500', title: '締切' }] },
    { day: 8, schedules: [{ color: 'bg-purple-500', title: 'イベント' }] },
    { day: 12, schedules: [{ color: 'bg-yellow-500', title: '打合せ' }, { color: 'bg-blue-500', title: '会議' }, { color: 'bg-green-500', title: '作業' }] },
    { day: 15, schedules: [{ color: 'bg-red-500', title: '締切' }] },
    { day: 18, schedules: [{ color: 'bg-purple-500', title: 'イベント' }, { color: 'bg-yellow-500', title: '打合せ' }] },
    { day: 22, schedules: [{ color: 'bg-blue-500', title: '会議' }] },
    { day: 25, schedules: [{ color: 'bg-green-500', title: '作業' }, { color: 'bg-purple-500', title: 'イベント' }] },
    { day: 28, schedules: [{ color: 'bg-red-500', title: '締切' }, { color: 'bg-blue-500', title: '会議' }] },
  ];

  const handleSync = async () => {
    setIsSync(true);
    try {
      if (onSync) {
        await onSync();
      }
      // シミュレーション
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsSync(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return '未同期';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}時間前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 同期状態表示とコントロール */}
      <div className="mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">カレンダー</span>
          </div>
          <div className="flex items-center space-x-2">
            {syncStatus.isConnected && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {syncStatus.provider === 'google' ? 'Google' : 'Outlook'}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSync}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`w-3 h-3 ${isSync ? 'animate-spin' : ''} text-gray-600`} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            最終同期: {formatLastSync(syncStatus.lastSync)}
          </span>
          {!syncStatus.isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSyncOptions(!showSyncOptions)}
              className="h-5 text-xs text-blue-600 hover:text-blue-700 p-0"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              連携設定
            </Button>
          )}
        </div>

        {/* 連携設定オプション */}
        {showSyncOptions && !syncStatus.isConnected && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">外部カレンダーと連携</p>
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-6 text-xs justify-start"
                onClick={() => {
                  // Google Calendar連携処理をここに実装
                  console.log('Google Calendar連携');
                }}
              >
                Google Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-6 text-xs justify-start"
                onClick={() => {
                  // Outlook連携処理をここに実装
                  console.log('Outlook連携');
                }}
              >
                Outlook Calendar
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* カレンダー - コンパクト版 */}
      <div className="mb-2">
        <div className="text-center font-medium text-gray-700 mb-2 text-xs">
          {currentYear}年 {monthNames[currentMonth]}
        </div>
       
        
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {dayNames.map((day, index) => (
            <div key={day} className={`text-center text-[10px] font-medium p-0.5 ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* カレンダーの日付 - コンパクト */}
        <div className="grid grid-cols-7 gap-0">
          {/* 月の最初の日より前の空白 */}
          {Array.from({ length: startingDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="h-6"></div>
          ))}
          
          {/* 日付 */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate();
            const dayOfWeek = (startingDayOfWeek + i) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // その日の予定を探す
            const daySchedule = demoMonthSchedule.find(s => s.day === day);
            const hasSchedule = !!daySchedule;
            const schedules = daySchedule?.schedules || [];
            
            return (
              <div
                key={day}
                className={`h-6 flex flex-col items-center justify-center text-[11px] cursor-pointer transition-all relative px-0.5 ${
                  isToday
                    ? 'bg-blue-500 text-white font-bold rounded'
                    : isWeekend
                    ? dayOfWeek === 0 ? 'text-red-500' : 'text-blue-500'
                    : 'text-gray-700 hover:bg-gray-100 rounded'
                }`}
              >
                {/* 日付 */}
                <span className={`${hasSchedule && !isToday ? 'font-semibold' : ''} leading-none`}>
                  {day}
                </span>
                
                {/* 予定インジケーター */}
                {hasSchedule && schedules.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                    {schedules.slice(0, 3).map((schedule, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-1 ${schedule.color} rounded-full ${
                          isToday ? 'bg-white' : ''
                        }`}
                        title={schedule.title}
                      />
                    ))}
                    {/* 3個以上の予定がある場合は「+」表示 */}
                    {schedules.length > 3 && (
                      <div className="text-[8px] leading-none font-bold">+</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 本日の予定（メイン） */}
      <div className="pt-3 border-t border-gray-100 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">本日の予定</h4>
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">
              {todaySchedule.length}件
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => {
                // 新しい予定追加処理
                console.log('新しい予定を追加');
              }}
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </Button>
          </div>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {todaySchedule.length > 0 ? (
  todaySchedule.map((schedule) => {
    const [hour, minute] = schedule.time.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    const scheduleStart = hour * 60 + minute;
    const scheduleEnd = endHour * 60 + endMinute;
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const isPast = scheduleEnd < currentTimeMinutes;
    const isCurrent = scheduleStart <= currentTimeMinutes && currentTimeMinutes < scheduleEnd;

    return (
      <div
        key={schedule.id}
        className={`group flex items-center space-x-3 p-2 rounded-lg transition-all cursor-pointer ${
          isCurrent 
            ? 'bg-blue-50 border border-blue-200' 
            : isPast 
            ? 'opacity-60 hover:opacity-80' 
            : 'hover:bg-gray-50'
        }`}
      >
        {/* 色バーとステータス */}
        <div className="flex flex-col items-center">
          <div className={`w-2 h-8 ${schedule.color} rounded flex-shrink-0`}></div>
          {isCurrent && (
            <div className="w-1 h-1 bg-blue-500 rounded-full mt-1 animate-pulse"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* 時間 */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold text-gray-900">
              {schedule.time}-{schedule.endTime}
            </span>
            {isCurrent && (
              <Badge className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0">
                進行中
              </Badge>
            )}
          </div>
          
          {/* タイトルと場所 */}
          <div className="text-sm font-medium text-gray-900 truncate mb-1">
            {schedule.title}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {schedule.location}
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </div>
      </div>
    );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarDays className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 mb-2">今日の予定はありません</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-700 h-6"
                onClick={() => {
                  console.log('新しい予定を追加');
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                予定を追加
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}