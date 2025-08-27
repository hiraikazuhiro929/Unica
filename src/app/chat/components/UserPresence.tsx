"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Wifi, WifiOff, Pause, AlertCircle } from "lucide-react";
import type { ChatUser } from "@/lib/firebase/chat";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface UserPresenceProps {
  user: ChatUser;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserPresence: React.FC<UserPresenceProps> = ({
  user,
  showDetails = false,
  size = 'md',
  className = "",
}) => {
  const getStatusColor = (status: string, isOnline: boolean) => {
    if (!isOnline) return "bg-gray-400";
    
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string, isOnline: boolean) => {
    if (!isOnline) return WifiOff;
    
    switch (status) {
      case "online":
        return Wifi;
      case "away":
        return Pause;
      case "busy":
        return AlertCircle;
      case "offline":
        return WifiOff;
      default:
        return WifiOff;
    }
  };

  const getStatusLabel = (status: string, isOnline: boolean) => {
    if (!isOnline) return "オフライン";
    
    switch (status) {
      case "online":
        return "オンライン";
      case "away":
        return "離席中";
      case "busy":
        return "取り込み中";
      case "offline":
        return "オフライン";
      default:
        return "不明";
    }
  };

  const formatLastSeen = (lastSeen: any, lastActivity: any) => {
    const lastSeenDate = lastSeen?.toDate?.() || new Date(lastSeen || 0);
    const lastActivityDate = lastActivity?.toDate?.() || new Date(lastActivity || 0);
    const latestDate = lastActivityDate > lastSeenDate ? lastActivityDate : lastSeenDate;
    
    if (!latestDate || latestDate.getTime() === 0) {
      return "不明";
    }

    try {
      return formatDistanceToNow(latestDate, { 
        addSuffix: true, 
        locale: ja 
      });
    } catch {
      return "不明";
    }
  };

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const StatusIcon = getStatusIcon(user.status, user.isOnline);
  const statusColor = getStatusColor(user.status, user.isOnline);
  const statusLabel = getStatusLabel(user.status, user.isOnline);

  if (showDetails) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="relative">
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs`}>
            {user.name?.charAt(0) || "?"}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor}`}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 truncate">{user.name}</span>
            <Badge variant="outline" className="text-xs">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusLabel}
            </Badge>
          </div>
          
          <div className="text-sm text-gray-500 truncate">
            {user.department}
          </div>
          
          {user.statusMessage && (
            <div className="text-xs text-gray-400 italic truncate">
              {user.statusMessage}
            </div>
          )}
          
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatLastSeen(user.lastSeen, user.lastActivity)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative inline-block ${className}`}>
            <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs`}>
              {user.name?.charAt(0) || "?"}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor}`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-gray-300">{user.department}</div>
            <div className="flex items-center space-x-1 text-sm">
              <StatusIcon className="w-3 h-3" />
              <span>{statusLabel}</span>
            </div>
            {user.statusMessage && (
              <div className="text-xs italic">{user.statusMessage}</div>
            )}
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatLastSeen(user.lastSeen, user.lastActivity)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UserPresence;