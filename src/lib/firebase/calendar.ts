import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';

// =============================================================================
// FIREBASE COLLECTIONS
// =============================================================================

export const CALENDAR_COLLECTIONS = {
  EVENTS: 'calendarEvents',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  date: string; // YYYY-MM-DD format
  location?: string;
  type: 'meeting' | 'maintenance' | 'inspection' | 'training' | 'deadline' | 'personal' | 'company';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color: string; // bg-color class
  attendees?: string[]; // User IDs or names
  createdBy: string;
  createdById: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  relatedEntityType?: 'process' | 'task' | 'order' | 'maintenance';
  relatedEntityId?: string;
  reminderMinutes?: number; // 何分前にリマインド
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

// =============================================================================
// CALENDAR EVENT OPERATIONS
// =============================================================================

/**
 * カレンダーイベントを作成
 */
export const createCalendarEvent = async (
  eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    const docRef = await addDoc(collection(db, CALENDAR_COLLECTIONS.EVENTS), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return { id: null, error: error.message };
  }
};

/**
 * カレンダーイベントのリストを取得
 */
export const getCalendarEvents = async (filters?: {
  date?: string; // YYYY-MM-DD format
  dateRange?: { start: string; end: string };
  type?: CalendarEvent['type'];
  createdBy?: string;
  isActive?: boolean;
  limit?: number;
}): Promise<{ data: CalendarEvent[]; error: string | null }> => {
  try {
    let q = collection(db, CALENDAR_COLLECTIONS.EVENTS);
    const constraints: QueryConstraint[] = [];

    // 単一フィルタのみ適用（複合インデックス回避）
    if (filters?.date) {
      constraints.push(where('date', '==', filters.date));
    } else if (filters?.dateRange) {
      constraints.push(where('date', '>=', filters.dateRange.start));
      constraints.push(where('date', '<=', filters.dateRange.end));
    } else if (filters?.type) {
      constraints.push(where('type', '==', filters.type));
    } else if (filters?.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy));
    } else if (filters?.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    } else {
      constraints.push(orderBy('date', 'asc'));
      constraints.push(orderBy('startTime', 'asc'));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CalendarEvent[];

    // クライアントサイドで追加フィルタリング
    if (filters) {
      if (filters.type && !constraints.some(c => c.toString().includes('type'))) {
        data = data.filter(event => event.type === filters.type);
      }
      if (filters.isActive !== undefined && !constraints.some(c => c.toString().includes('isActive'))) {
        data = data.filter(event => event.isActive === filters.isActive);
      }
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error getting calendar events:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 特定の日のイベントを取得
 */
export const getEventsForDate = async (
  date: string // YYYY-MM-DD format
): Promise<{ data: CalendarEvent[]; error: string | null }> => {
  return getCalendarEvents({ date, isActive: true });
};

/**
 * 今日の予定を取得
 */
export const getTodayEvents = async (): Promise<{ data: CalendarEvent[]; error: string | null }> => {
  const today = new Date().toISOString().split('T')[0];
  return getEventsForDate(today);
};

/**
 * 今月のイベントを取得
 */
export const getMonthEvents = async (
  year: number,
  month: number // 0-11
): Promise<{ data: CalendarEvent[]; error: string | null }> => {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  
  return getCalendarEvents({
    dateRange: { start: startDate, end: endDate },
    isActive: true
  });
};

/**
 * カレンダーイベントを更新
 */
export const updateCalendarEvent = async (
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, CALENDAR_COLLECTIONS.EVENTS, eventId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    return { error: error.message };
  }
};

/**
 * カレンダーイベントを削除
 */
export const deleteCalendarEvent = async (
  eventId: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, CALENDAR_COLLECTIONS.EVENTS, eventId);
    await deleteDoc(docRef);
    
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return { error: error.message };
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

/**
 * カレンダーイベントの変更をリアルタイムで監視
 */
export const subscribeToCalendarEvents = (
  filters: Parameters<typeof getCalendarEvents>[0],
  callback: (data: CalendarEvent[]) => void
): (() => void) => {
  let q = collection(db, CALENDAR_COLLECTIONS.EVENTS);
  const constraints: QueryConstraint[] = [];

  // 単一フィルタのみ適用
  if (filters?.date) {
    constraints.push(where('date', '==', filters.date));
  } else if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  } else if (filters?.isActive !== undefined) {
    constraints.push(where('isActive', '==', filters.isActive));
  } else {
    constraints.push(orderBy('date', 'asc'));
  }

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return onSnapshot(query(q, ...constraints), (querySnapshot) => {
    let data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CalendarEvent[];

    // クライアントサイドフィルタリング
    if (filters) {
      if (filters.type && !constraints.some(c => c.toString().includes('type'))) {
        data = data.filter(event => event.type === filters.type);
      }
      if (filters.isActive !== undefined && !constraints.some(c => c.toString().includes('isActive'))) {
        data = data.filter(event => event.isActive === filters.isActive);
      }
    }

    callback(data);
  }, (error) => {
    console.error('Error in calendar events subscription:', error);
    callback([]);
  });
};

/**
 * 今日のイベントをリアルタイムで監視
 */
export const subscribeToTodayEvents = (
  callback: (data: CalendarEvent[]) => void
): (() => void) => {
  const today = new Date().toISOString().split('T')[0];
  return subscribeToCalendarEvents({ date: today, isActive: true }, callback);
};

// =============================================================================
// GOOGLE CALENDAR INTEGRATION
// =============================================================================

export interface GoogleCalendarConfig {
  clientId: string;
  apiKey: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Google Calendar OAuth認証を開始
 */
export const initializeGoogleCalendarAuth = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔧 Google API初期化開始...');
    
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    console.log('📋 環境変数チェック:', {
      clientId: GOOGLE_CLIENT_ID ? '設定済み' : '未設定',
      apiKey: GOOGLE_API_KEY ? '設定済み' : '未設定'
    });
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      throw new Error(`Google Calendar API credentials not configured: clientId=${!!GOOGLE_CLIENT_ID}, apiKey=${!!GOOGLE_API_KEY}`);
    }

    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined') {
      throw new Error('Google Calendar auth can only be initialized in browser');
    }

    console.log('🌐 Google APIスクリプト読み込み確認...');
    // Google API ライブラリが読み込まれているかチェック
    if (typeof window.gapi === 'undefined') {
      console.log('📥 Google APIスクリプトを動的読み込み中...');
      await loadGoogleAPIScript();
      console.log('✅ Google APIスクリプト読み込み完了');
    }

    console.log('🔗 Google API client読み込み中...');
    // Google API初期化（auth2は使わない）
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: () => {
          console.log('✅ client 読み込み完了');
          resolve();
        },
        onerror: (error) => {
          console.error('❌ client 読み込み失敗:', error);
          reject(new Error('Failed to load Google API client'));
        }
      });
    });

    console.log('⚙️ Google API client初期化中...');
    await window.gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
    });

    console.log('🔐 Google Identity Services初期化中...');
    // 新しいGoogle Identity Servicesを初期化
    if (typeof window.google?.accounts?.oauth2 === 'undefined') {
      throw new Error('Google Identity Services not loaded');
    }

    // 保存されたアクセストークンを復元
    console.log('💾 保存されたトークンをチェック中...');
    const savedToken = localStorage.getItem('google_access_token');
    const tokenTimestamp = localStorage.getItem('google_token_timestamp');
    
    if (savedToken && tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      const oneHour = 60 * 60 * 1000; // 1時間をミリ秒で
      
      if (tokenAge < oneHour) {
        // トークンが1時間以内なら復元
        console.log('✅ 保存されたトークンを復元しました');
        window.gapi.client.setToken({ access_token: savedToken });
      } else {
        // 古いトークンは削除
        console.log('⏰ 保存されたトークンが期限切れのため削除');
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_timestamp');
      }
    } else {
      console.log('ℹ️ 保存されたトークンはありません');
    }

    console.log('🎉 Google Calendar API初期化完了');
    return { success: true };
  } catch (error: any) {
    console.error('💥 Google Calendar auth initialization failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Google API スクリプトを動的読み込み（新しいGoogle Identity Services使用）
 */
const loadGoogleAPIScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Google APIスクリプトを読み込み
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      // Google Identity Servicesスクリプトも読み込み
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => resolve();
      gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(gisScript);
    };
    gapiScript.onerror = () => reject(new Error('Failed to load Google API script'));
    document.head.appendChild(gapiScript);
  });
};

/**
 * Googleカレンダーからイベントを同期
 */
export const syncGoogleCalendarEvents = async (
  calendarId: string = 'primary'
): Promise<{ 
  synced: number; 
  error?: string; 
  events?: any[] 
}> => {
  try {
    // 認証チェック（新しいGoogle Identity Services対応）
    if (typeof window === 'undefined' || !window.gapi?.client) {
      throw new Error('Google API not initialized');
    }

    // アクセストークンの存在確認
    const token = window.gapi.client.getToken();
    if (!token || !token.access_token) {
      throw new Error('Not signed in to Google - please click the "連携" button first');
    }

    console.log('Google Calendar同期開始:', calendarId);

    // 今後30日間のイベントを取得
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await window.gapi.client.calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const googleEvents = response.result.items || [];
    console.log(`${googleEvents.length}件のイベントを取得`);

    // Firebaseに保存
    let syncedCount = 0;
    for (const googleEvent of googleEvents) {
      // 既存のGoogleイベントかチェック（重複回避）
      const existingEvents = await getCalendarEvents({ 
        createdBy: 'Google Calendar' 
      });
      
      const isDuplicate = existingEvents.data.some(event => 
        event.title === googleEvent.summary &&
        event.date === (googleEvent.start.date || googleEvent.start.dateTime?.split('T')[0])
      );

      if (isDuplicate) continue;

      const isAllDay = !!googleEvent.start.date; // 終日イベントは date プロパティを持つ
      const startDate = isAllDay ? 
        googleEvent.start.date : 
        new Date(googleEvent.start.dateTime).toISOString().split('T')[0];
      
      const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        title: googleEvent.summary || '(タイトルなし)',
        description: googleEvent.description ? `${googleEvent.description}\n\n(Google Calendar同期)` : '(Google Calendar同期)',
        startTime: isAllDay ? '00:00' : 
          new Date(googleEvent.start.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        endTime: isAllDay ? '23:59' :
          new Date(googleEvent.end.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        date: startDate,
        location: googleEvent.location || '', // undefinedを空文字に変換
        type: 'meeting',
        priority: 'medium',
        color: 'bg-green-500',
        createdBy: 'Google Calendar',
        createdById: 'google_sync',
        isAllDay: isAllDay,
        isRecurring: false,
        reminderMinutes: 15,
        isActive: true
      };

      const result = await createCalendarEvent(eventData);
      if (result.id) {
        syncedCount++;
        console.log(`✅ イベント保存成功: ${googleEvent.summary} (ID: ${result.id})`);
      } else {
        console.log(`❌ イベント保存失敗: ${googleEvent.summary}`, result.error);
      }
    }

    return { 
      synced: syncedCount, 
      events: googleEvents 
    };
  } catch (error: any) {
    console.error('Google Calendar sync failed:', error);
    return { 
      synced: 0, 
      error: error.message 
    };
  }
};

/**
 * Googleカレンダーにイベントを追加
 */
export const createGoogleCalendarEvent = async (
  event: CalendarEvent
): Promise<{ success: boolean; googleEventId?: string; error?: string }> => {
  try {
    // Google Calendar API でイベントを作成
    // 実際の実装では gapi.client.calendar.events.insert() を使用
    
    console.log('Google Calendarにイベント作成:', event.title);
    
    // 模擬的な作成処理
    const mockGoogleEventId = `google_${Date.now()}`;
    
    return { 
      success: true, 
      googleEventId: mockGoogleEventId 
    };
  } catch (error: any) {
    console.error('Google Calendar event creation failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Google アカウントにサインイン（新しいGoogle Identity Services使用）
 */
export const signInToGoogle = async (): Promise<{ 
  success: boolean; 
  userEmail?: string;
  error?: string 
}> => {
  try {
    if (typeof window === 'undefined' || typeof window.google?.accounts?.oauth2 === 'undefined') {
      throw new Error('Google Identity Services not initialized');
    }

    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    console.log('🔐 Google OAuth2認証開始...');
    
    return new Promise((resolve) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (response: any) => {
          if (response.error) {
            console.error('❌ OAuth2 認証失敗:', response.error);
            resolve({ 
              success: false, 
              error: response.error 
            });
          } else {
            console.log('✅ OAuth2 認証成功');
            // アクセストークンをローカルストレージに保存（永続化）
            localStorage.setItem('google_access_token', response.access_token);
            localStorage.setItem('google_token_timestamp', Date.now().toString());
            
            // gapiクライアントにもトークンを設定
            window.gapi.client.setToken({ access_token: response.access_token });
            
            resolve({ 
              success: true, 
              userEmail: 'authenticated@user.com' // 実際のメールアドレスは別途取得が必要
            });
          }
        },
      });
      
      client.requestAccessToken();
    });
  } catch (error: any) {
    console.error('Google sign-in failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Google アカウントからサインアウト（新しいGoogle Identity Services対応）
 */
export const signOutFromGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // ローカルストレージからトークンを削除
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_timestamp');
    
    // gapiクライアントからトークンを削除
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    
    console.log('✅ Google sign-out successful');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Google sign-out failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Google Calendar認証状態をチェック（新しいGoogle Identity Services使用）
 */
export const checkGoogleCalendarAuth = async (): Promise<{ 
  isAuthenticated: boolean; 
  userEmail?: string;
  error?: string 
}> => {
  try {
    if (typeof window === 'undefined' || !window.gapi?.client) {
      return { isAuthenticated: false };
    }

    // アクセストークンが存在するかチェック
    const token = window.gapi.client.getToken();
    if (!token || !token.access_token) {
      return { isAuthenticated: false };
    }

    // トークンの有効性を確認（簡易版）
    try {
      // 簡単なAPI呼び出しでトークンをテスト
      await window.gapi.client.calendar.calendarList.list();
      return { 
        isAuthenticated: true, 
        userEmail: 'authenticated@user.com' 
      };
    } catch (authError) {
      // トークンが無効または期限切れ
      return { isAuthenticated: false };
    }
  } catch (error: any) {
    console.error('Google Calendar auth check failed:', error);
    return { 
      isAuthenticated: false, 
      error: error.message 
    };
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 工程データからカレンダーイベントを自動生成
 */
export const createEventFromProcess = async (process: {
  id: string;
  projectName: string;
  orderClient: string;
  assignee: string;
  dueDate?: string;
  processingPlanDate?: string;
  processingEndDate?: string;
}): Promise<{ id: string | null; error: string | null }> => {
  if (!process.dueDate) {
    return { id: null, error: 'Due date is required' };
  }

  const dueDate = new Date(process.dueDate);
  const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
    title: `${process.projectName} 締切`,
    description: `${process.orderClient} - 担当: ${process.assignee}`,
    startTime: '09:00',
    endTime: '17:00',
    date: dueDate.toISOString().split('T')[0],
    type: 'deadline',
    priority: 'high',
    color: 'bg-red-500',
    createdBy: 'system',
    createdById: 'system',
    isAllDay: false,
    isRecurring: false,
    relatedEntityType: 'process',
    relatedEntityId: process.id,
    reminderMinutes: 60,
    isActive: true
  };

  return createCalendarEvent(eventData);
};

/**
 * 便利関数: 会議イベントを作成
 */
export const createMeetingEvent = async (data: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  description?: string;
  createdBy: string;
  createdById: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createCalendarEvent({
    ...data,
    type: 'meeting',
    priority: 'medium',
    color: 'bg-blue-500',
    isAllDay: false,
    isRecurring: false,
    reminderMinutes: 15,
    isActive: true
  });
};

/**
 * 便利関数: 設備点検イベントを作成
 */
export const createMaintenanceEvent = async (data: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  createdBy: string;
  createdById: string;
}): Promise<{ id: string | null; error: string | null }> => {
  return createCalendarEvent({
    ...data,
    type: 'maintenance',
    priority: 'high',
    color: 'bg-orange-500',
    isAllDay: false,
    isRecurring: false,
    reminderMinutes: 30,
    isActive: true
  });
};