/**
 * Chat System v2 - Main Export
 * 新しいチャットシステムのメインエクスポート
 */

// メインコンポーネント
export { default as ChatApp } from './ChatApp';

// 型定義
export * from './types';

// コンポーネント
export { default as MessageItem } from './components/MessageItem';
export { default as MessageList } from './components/MessageList';
export { default as MessageInput } from './components/MessageInput';
export { default as ChannelList } from './components/ChannelList';

// Redux
export { store, useAppDispatch, useAppSelector } from './store';
export * from './store/chatSlice';

// サービス
export { default as chatService } from './services/chatService';

// コアクラス
export { default as UnifiedTimestamp } from './core/UnifiedTimestamp';

// 使用例とドキュメント
export const ChatSystemV2Info = {
  version: '2.0.0',
  description: 'Rebuilt chat system with improved reliability and Discord-like UI',
  features: [
    'Unified timestamp handling',
    'Discord-style message UI',
    'Real-time synchronization',
    'Optimistic UI updates',
    'Type-safe Redux state management',
    'Mention support',
    'Reaction system',
    'Typing indicators',
    'Message threads (planned)',
    'File attachments (planned)',
  ],
  improvements: [
    'Fixed "時刻不明" timestamp errors',
    'Eliminated message duplication',
    'Simplified Firebase integration',
    'Better error handling',
    'Cleaner component architecture',
    'Enhanced type safety with brand types',
  ],
  usage: `
import { ChatApp } from '@/chat-v2';

// Basic usage
<ChatApp />

// With custom props (planned)
<ChatApp
  theme="dark"
  userId="user_123"
  channels={customChannels}
/>
  `,
};