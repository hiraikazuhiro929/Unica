"use client";
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';
import { toast as toastManager } from '@/lib/utils/toast';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg
              animate-in slide-in-from-right duration-300
              ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200' : ''}
              ${toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200' : ''}
              ${toast.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}