"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeliveryNotesPage() {
  const router = useRouter();

  useEffect(() => {
    // 納品書管理は /files ページに統合されたため、リダイレクト
    router.replace('/files');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 dark:text-slate-300">納品書管理ページに移動中...</p>
      </div>
    </div>
  );
}