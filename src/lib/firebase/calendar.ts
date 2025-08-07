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