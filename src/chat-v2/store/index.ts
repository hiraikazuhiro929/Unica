/**
 * Redux Store Configuration for Chat System v2
 */

import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Firebase Timestampは非シリアライザブルなので除外
        ignoredActions: [
          'chat/addMessage',
          'chat/updateMessage',
          'chat/setMessages',
          'chat/addOptimisticMessage',
          'chat/confirmOptimisticMessage',
          'chat/setCurrentUser',
          'chat/addUser',
          'chat/updateUser',
          'chat/setUsers',
          'chat/addChannel',
          'chat/updateChannel',
          'chat/setChannels', // ADDED: Missing action that was causing the error
          'chat/addTypingUser',
          'chat/setTypingUsers',
          'chat/addNotification',
          'chat/setNotifications',
          'chat/updateUnreadCount',
          'chat/setUnreadCounts',
        ],
        ignoredActionsPaths: [
          'payload.timestamp',
          'payload.createdAt',
          'payload.updatedAt',
          'payload.lastSeen',
          'payload.lastActivity',
          'payload.editedAt',
          'payload.joinedAt',
          'payload.lastReadAt',
          // Handle array payloads (e.g., payload.0.createdAt, payload.1.updatedAt)
          'payload.0',
          'payload.1',
          'payload.2',
          'payload.3',
          'payload.4',
          'payload.5',
          'payload.6',
          'payload.7',
          'payload.8',
          'payload.9',
        ],
        ignoredPaths: [
          'chat.messages',
          'chat.channels',
          'chat.users',
          'chat.currentUser',
          'chat.notifications',
          'chat.unreadCounts',
          'chat.typingUsers',
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;