import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export function useActivityTracking() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (!user || !currentCompany) return;

    // ページ遷移を記録
    const trackPageView = async () => {
      try {
        await addDoc(collection(db, 'activityLogs'), {
          type: 'page_view',
          page: pathname,
          userId: user.uid,
          userName: user.name || user.email,
          userRole: user.role,
          companyId: currentCompany.id,
          timestamp: serverTimestamp(),
          metadata: {
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
          }
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [pathname, user, currentCompany]);

  // 特定のアクションを記録する関数
  const trackAction = async (
    actionType: string,
    details: Record<string, any> = {}
  ) => {
    if (!user || !currentCompany) return;

    try {
      await addDoc(collection(db, 'activityLogs'), {
        type: actionType,
        page: pathname,
        userId: user.uid,
        userName: user.name || user.email,
        userRole: user.role,
        companyId: currentCompany.id,
        timestamp: serverTimestamp(),
        details,
      });
    } catch (error) {
      console.error('Failed to track action:', error);
    }
  };

  return { trackAction };
}