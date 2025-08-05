"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ToolsPage() {
  const router = useRouter();

  useEffect(() => {
    // 工具管理は /files ページに統合されたため、リダイレクト
    router.replace('/files');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">工具管理ページに移動中...</p>
      </div>
    </div>
  );
}