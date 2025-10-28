# チャット機能移植 - 詳細調査レポート

作成日: 2025-10-02
バックアップ場所: `src/chat-v2_working_20251002`

---

## 1. コンポーネント間の依存関係調査

### 1.1 旧chat（chat_backup）の依存関係マップ

#### 主要コンポーネントとその依存関係

```
page.tsx (メインページ)
├── useChat フック ← 🔴 重要：すべてのデータ取得の中心
├── UserProfileModal
│   └── 依存: ChatUser型のみ（独立性高い）
├── MentionInput
│   └── 依存: ChatUser[] 配列
├── ThreadPanel
│   ├── 依存: ChatMessage[], ChatUser[], currentUser
│   └── コールバック: onSendReply, onUploadFile
├── SearchPanel
│   ├── 依存: ChatMessage[], ChatUser[], ChatChannel[]
│   └── コールバック: onSelectMessage
├── NotificationSystem
│   ├── 依存: ChatNotification[], ChatUser[]
│   └── Firebase直接アクセス: subscribeToNotifications, markNotificationAsRead
├── VirtualMessageList
│   ├── 依存: ChatMessage[], currentUserId
│   └── コールバック: onReply, onReaction, onEdit, onDelete
├── MessageContent
│   └── 依存: content文字列、mentions配列
└── その他モーダル類（設定系）
    ├── ChannelSettingsModal
    ├── ServerSettingsModal
    ├── RoleManagementModal
    └── InviteModal
```

### 1.2 依存関係の特徴

**✅ 独立性が高いコンポーネント（移植しやすい）**
1. **UserProfileModal** - ChatUser型のみ依存、propsのみで動作
2. **MessageContent** - 純粋な表示コンポーネント、外部依存なし
3. **TypingIndicator** - TypingStatus配列のみ依存
4. **UserPresence** - ChatUser配列のみ依存

**⚠️ 中程度の依存（調整が必要）**
5. **MentionInput** - users配列が必要、onChange/onSendコールバック
6. **ThreadPanel** - 複数のデータソースとコールバック、state管理あり
7. **SearchPanel** - 複数のデータソース、検索ロジック含む

**🔴 強依存（大幅な調整が必要）**
8. **NotificationSystem** - Firebase直接アクセス、独自のsubscribe
9. **ServerSettingsModal** - 複雑な状態管理、複数のFirebase操作
10. **RoleManagementModal** - 権限システム全体に関わる

---

## 2. データフローの詳細分析

### 2.1 旧chat（useChat フック）のデータフロー

```typescript
// データ取得
useChat(options) {
  // Firebase監視を直接実行
  subscribeToChannels() → setChannels()
  subscribeToMessages() → setMessages()
  subscribeToUsers() → setUsers()
  subscribeToNotifications() → setNotifications()

  // Stateをコンポーネントに返す
  return {
    channels, messages, users, notifications,
    sendNewMessage, editMessage, ...
  }
}

// コンポーネントでの使用
const chat = useChat({ userId, userName, ... });
<UserProfileModal user={chat.users.find(...)} />
```

**特徴**:
- ✅ シンプルで理解しやすい
- ✅ TypeScript型安全
- ❌ 再レンダリングが多い可能性
- ❌ グローバル状態管理なし

### 2.2 chat-v2（Redux store）のデータフロー

```typescript
// データ取得
ChatApp.tsx {
  useEffect(() => {
    // Firebase監視を実行
    chatService.subscribeToChannels((channels) => {
      dispatch(setChannels(channels)); // Redux storeに保存
    });
  }, []);

  // Redux storeから取得
  const channels = useAppSelector(state => state.chat.channels);
  const users = useAppSelector(state => state.chat.users);
}

// 子コンポーネントでの使用
const users = useAppSelector(state => state.chat.users);
<UserProfileModal user={users.find(...)} />
```

**特徴**:
- ✅ グローバル状態管理（どこからでもアクセス可能）
- ✅ パフォーマンス最適化しやすい
- ✅ Redux DevToolsでデバッグ可能
- ❌ Boilerplate多め
- ❌ 学習コスト

### 2.3 変換対応表

| 旧chat（useChat） | chat-v2（Redux） | 変換方法 |
|---|---|---|
| `const { channels } = useChat()` | `const channels = useAppSelector(state => state.chat.channels)` | useAppSelector |
| `const { messages } = useChat()` | `const messages = useAppSelector(state => state.chat.messages[channelId])` | channelId指定 |
| `const { users } = useChat()` | `const users = useAppSelector(state => state.chat.users)` | useAppSelector |
| `sendNewMessage(content)` | `await chatService.sendMessage(...)` | chatService直接呼び出し |
| `selectChannel(id)` | `dispatch(setCurrentChannel(id))` | dispatch |

---

## 3. 主要コンポーネントの実装詳細調査

### 3.1 UserProfileModal

**ファイル**: `chat_backup/components/UserProfileModal.tsx`
**サイズ**: 8.9KB
**依存関係**:
- `ChatUser` 型
- `@/components/ui/dialog` （shadcn/ui）
- `@/lib/utils/dateFormatter` （ユーティリティ）

**Props**:
```typescript
interface UserProfileModalProps {
  user: ChatUser | null;
  isOpen: boolean;
  onClose: () => void;
  onDirectMessage?: (userId: string) => void;
  onMention?: (userName: string) => void;
  currentUserId: string;
}
```

**実装の特徴**:
- ✅ **完全に独立したコンポーネント**
- ✅ 外部状態に依存しない（propsのみ）
- ✅ shadcn/ui DialogでUI実装
- ✅ ステータス表示（オンライン/離席/取り込み中/オフライン）
- ✅ 最終ログイン時刻表示（formatRelativeTime）
- ✅ DMボタン、メンションボタン

**移植難易度**: ⭐☆☆☆☆ (非常に簡単)

**移植手順**:
1. ファイルをそのまま `chat-v2/components/` にコピー
2. インポートパスを確認（shadcn/uiは共通なのでそのまま）
3. ChatApp.tsxまたはMessageItem.tsxにstate追加
   ```typescript
   const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
   const [showUserProfile, setShowUserProfile] = useState(false);
   ```
4. アバタークリック時のハンドラー追加
   ```typescript
   const handleUserClick = (userId: string) => {
     const user = users.find(u => u.id === userId);
     setSelectedUser(user);
     setShowUserProfile(true);
   };
   ```
5. モーダルをレンダリング
   ```tsx
   <UserProfileModal
     user={selectedUser}
     isOpen={showUserProfile}
     onClose={() => setShowUserProfile(false)}
     currentUserId={currentUser?.id}
   />
   ```

**注意点**:
- `onDirectMessage`機能は後回しでOK（未実装）
- `onMention`はMentionInput移植後に実装

---

### 3.2 MentionInput

**ファイル**: `chat_backup/components/MentionInput.tsx`
**サイズ**: 13.2KB
**依存関係**:
- `ChatUser[]` 配列
- `@/components/ui/input` （shadcn/ui）

**Props**:
```typescript
interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  users: ChatUser[];
  placeholder?: string;
  disabled?: boolean;
  onFileAttach?: () => void;
  isSending?: boolean;
}
```

**実装の特徴**:
- 🎯 **@でメンション候補表示**
- 🎯 **@everyone, @here 特殊メンション**
- 🎯 **キーボードナビゲーション**（↑↓でselect、Enterで確定）
- 🎯 **カーソル位置を認識して候補挿入**
- ✅ ファイル添付ボタン（onFileAttachコールバック）
- ✅ 送信中状態表示（isSending）

**内部ロジック**:
```typescript
// メンション検出
const detectMention = (text: string, cursorPos: number) => {
  // @の位置を検索
  const beforeCursor = text.slice(0, cursorPos);
  const match = beforeCursor.match(/@(\w*)$/);

  if (match) {
    const query = match[1]; // @の後の文字列
    // ユーザー候補をフィルタリング
    const suggestions = users.filter(u =>
      u.name.toLowerCase().includes(query.toLowerCase())
    );
    return suggestions;
  }
  return [];
};

// メンション挿入
const insertMention = (userName: string) => {
  // @query を @userName に置き換え
  const newText = text.replace(/@\w*$/, `@${userName} `);
  onChange(newText);
};
```

**移植難易度**: ⭐⭐⭐☆☆ (中程度)

**移植手順**:
1. ファイルを `chat-v2/components/` にコピー
2. **現在のMessageInput.tsxを置き換える**（または統合）
3. ChatApp.tsxで使用
   ```tsx
   // Before
   <MessageInput
     channelId={currentChannelId}
     onSendMessage={handleSendMessage}
   />

   // After
   <MentionInput
     value={messageContent}
     onChange={setMessageContent}
     onSend={() => handleSendMessage({ content: messageContent })}
     users={users}
     isSending={isSending}
   />
   ```
4. users配列をRedux storeから取得
   ```typescript
   const users = useAppSelector(state => state.chat.users);
   ```

**注意点**:
- 現在のMessageInput.tsxの機能（絵文字ピッカー、ファイル添付）を保持
- 返信機能との統合が必要

---

### 3.3 ThreadPanel

**ファイル**: `chat_backup/components/ThreadPanel.tsx`
**サイズ**: 13.2KB
**依存関係**:
- `ChatMessage[]`, `ChatUser[]`, `currentUser`
- コールバック: `onSendReply`, `onUploadFile`

**Props**:
```typescript
interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: ChatMessage | null;
  threadMessages: ChatMessage[];
  users: ChatUser[];
  currentUser: ChatUser;
  onSendReply: (content: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  onUploadFile?: (file: File) => Promise<ChatAttachment | null>;
  channelName?: string;
}
```

**実装の特徴**:
- 🎯 **スレッド返信機能**
- 🎯 **親メッセージ表示**
- 🎯 **スレッド内メッセージ一覧**
- 🎯 **スレッド専用の入力欄**
- ✅ ファイル添付対応
- ✅ 自動スクロール（最新メッセージ）

**移植難易度**: ⭐⭐⭐⭐☆ (やや難しい)

**移植手順**:
1. ファイルを `chat-v2/components/` にコピー
2. ChatApp.tsxにstate追加
   ```typescript
   const [selectedThread, setSelectedThread] = useState<ChatMessage | null>(null);
   const [showThreadPanel, setShowThreadPanel] = useState(false);
   ```
3. MessageItemに返信ボタン追加
   ```typescript
   const handleReply = (message: ChatMessage) => {
     setSelectedThread(message);
     setShowThreadPanel(true);
   };
   ```
4. Firebase関数追加（chatServiceに）
   ```typescript
   const sendThreadReply = async (threadId: string, content: string) => {
     // Firebase実装
   };
   ```
5. ThreadPanelをサイドパネルとして配置

**注意点**:
- Firestoreにthread機能の実装が必要
- `lib/firebase/chat.ts`の`sendThreadMessage`関数を確認

---

### 3.4 SearchPanel

**ファイル**: `chat_backup/components/SearchPanel.tsx`
**サイズ**: 12.5KB
**依存関係**:
- `ChatMessage[]`, `ChatUser[]`, `ChatChannel[]`
- コールバック: `onSelectMessage`

**実装の特徴**:
- 🎯 **全文検索**（メッセージ内容）
- 🎯 **日付範囲検索**
- 🎯 **ユーザー別検索**
- 🎯 **チャンネル別検索**
- 🎯 **検索結果ハイライト**

**移植難易度**: ⭐⭐⭐☆☆ (中程度)

**移植手順**:
1. ファイルを `chat-v2/components/` にコピー
2. ヘッダーに検索ボタン追加
3. ChatApp.tsxにstate追加
   ```typescript
   const [showSearchPanel, setShowSearchPanel] = useState(false);
   ```
4. 検索関数を実装（既にchatServiceにある）
   ```typescript
   const searchMessages = async (query: string) => {
     const result = await chatService.searchMessages(channelIds, query);
     return result.data;
   };
   ```

**注意点**:
- 検索結果クリック時、該当メッセージまでスクロール
- `searchMessages`関数は既に`lib/firebase/chat.ts`にある

---

### 3.5 NotificationSystem

**ファイル**: `chat_backup/components/NotificationSystem.tsx`
**サイズ**: 14.1KB
**依存関係**:
- `ChatNotification[]`, `ChatUser[]`
- Firebase直接アクセス: `subscribeToNotifications`, `markNotificationAsRead`

**実装の特徴**:
- 🎯 **メンション通知**
- 🎯 **チャンネル更新通知**
- 🎯 **通知バッジ表示**
- 🎯 **通知クリック→該当メッセージへ移動**
- ✅ 未読カウント

**移植難易度**: ⭐⭐⭐⭐☆ (やや難しい)

**移植手順**:
1. ファイルを `chat-v2/components/` にコピー
2. Redux storeに`notifications`追加（既にある）
3. ChatApp.tsxで監視開始
   ```typescript
   useEffect(() => {
     const unsubscribe = chatService.subscribeToNotifications(userId, (notifications) => {
       dispatch(setNotifications(notifications));
     });
     return unsubscribe;
   }, [userId]);
   ```
4. ヘッダーに通知アイコン追加
5. NotificationSystemコンポーネントを配置

**注意点**:
- 通知の既読管理が必要
- `lib/firebase/chat.ts`の関数を使用

---

## 4. 型定義の互換性確認

### 4.1 共通の型定義（両方で使用）

**ファイル**: `@/lib/firebase/chat.ts`

```typescript
// ✅ 完全に互換性あり
interface ChatMessage {
  id: string;
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  timestamp: Date | Timestamp;
  type: 'message' | 'system';
  attachments?: ChatAttachment[];
  reactions?: Reaction[];
  mentions?: string[];
  // ... その他
}

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  isOnline: boolean;
  lastSeen: Date | Timestamp;
  // ... その他
}

interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'voice';
  // ... その他
}
```

### 4.2 chat-v2独自の型定義

**ファイル**: `chat-v2/types.ts`

```typescript
// Branded types（型安全性向上）
type ChannelId = string & { __brand: 'ChannelId' };
type MessageId = string & { __brand: 'MessageId' };
type UserId = string & { __brand: 'UserId' };

// ヘルパー関数
const createChannelId = (id: string): ChannelId => id as ChannelId;
const createMessageId = (id: string): MessageId => id as MessageId;
const createUserId = (id: string): UserId => id as UserId;
```

**互換性**: ✅ 問題なし
- 実行時は通常の`string`として扱われる
- 型チェック時のみBranded typeとして機能
- 既存のコンポーネントはそのまま動作

### 4.3 型エラーが発生する可能性

**1. useChat返り値の型**
```typescript
// 旧chat
const { messages, users } = useChat(...);

// chat-v2（変換必要）
const messages = useAppSelector(state => state.chat.messages[channelId]);
const users = useAppSelector(state => state.chat.users);
```

**2. コールバック関数の型**
```typescript
// 旧chat
onSendMessage: (content: string) => Promise<boolean>

// chat-v2
onSendMessage: (data: MessageFormData) => void
```

**解決策**: アダプター関数を作成
```typescript
const handleSendMessage = async (content: string) => {
  await chatService.sendMessage(channelId, { content }, userId, userName, userRole);
};
```

---

## 5. 既存機能への影響範囲評価

### 5.1 影響度マトリクス

| 移植コンポーネント | 既存機能への影響 | リスクレベル | 理由 |
|---|---|---|---|
| UserProfileModal | 影響なし | 🟢 低 | 完全に独立、新規追加のみ |
| MessageContent | 影響なし | 🟢 低 | 表示コンポーネント、既存を置き換えない |
| TypingIndicator | 影響なし | 🟢 低 | 独立した表示コンポーネント |
| MentionInput | **MessageInputを置き換え** | 🟡 中 | 既存の入力機能を統合する必要 |
| ThreadPanel | 影響小 | 🟡 中 | 新規機能追加、既存メッセージ表示には影響なし |
| SearchPanel | 影響なし | 🟢 低 | 新規機能追加、既存に影響なし |
| NotificationSystem | 影響小 | 🟡 中 | Redux storeに通知データ追加 |
| ServerSettingsModal | **影響大** | 🔴 高 | 複数のFirebase操作、権限システム |
| RoleManagementModal | **影響大** | 🔴 高 | 権限システム全体に影響 |

### 5.2 リスク軽減策

**🟢 低リスクコンポーネント（Phase 1）**
- そのままコピー&ペーストで移植
- 既存機能と並行して動作可能
- 推奨順序: UserProfileModal → MessageContent → TypingIndicator

**🟡 中リスクコンポーネント（Phase 2）**
- 段階的に統合
- 既存機能のバックアップを確認してから
- テスト後に次へ進む
- 推奨順序: SearchPanel → ThreadPanel → NotificationSystem → MentionInput

**🔴 高リスクコンポーネント（Phase 3）**
- 最後に実装
- 十分なテスト期間を確保
- バックアップから復元できる状態を維持
- 推奨順序: ServerSettingsModal → RoleManagementModal

---

## 6. Firebase操作の比較分析

### 6.1 旧chat（useChat）のFirebase操作

```typescript
// hooks/useChat.ts
useEffect(() => {
  // Firestoreリアルタイム監視
  const unsubscribe = subscribeToMessages(channelId, (messages) => {
    setMessages(messages); // Local state更新
  });

  return unsubscribe;
}, [channelId]);

// メッセージ送信
const sendNewMessage = async (content: string) => {
  const result = await sendMessage({
    channelId,
    content,
    authorId: userId,
    authorName: userName,
    authorRole: userRole,
    // ...
  });

  return !result.error;
};
```

**特徴**:
- ✅ `@/lib/firebase/chat.ts`の関数を直接使用
- ✅ useEffectで監視、stateで管理
- ❌ コンポーネントごとに監視を設定（重複の可能性）

### 6.2 chat-v2のFirebase操作

```typescript
// ChatApp.tsx
useEffect(() => {
  // Firestoreリアルタイム監視
  const unsubscribe = chatService.subscribeToMessages(channelId, (messages) => {
    dispatch(setMessages({ channelId, messages })); // Redux store更新
  });

  return unsubscribe;
}, [channelId]);

// メッセージ送信
const handleSendMessage = async (formData: MessageFormData) => {
  const result = await chatService.sendMessage(
    channelId,
    formData,
    userId,
    userName,
    userRole
  );
  // Redux storeは自動更新（subscribeToMessagesで監視中）
};
```

**特徴**:
- ✅ `chatService`を経由（統一されたAPI）
- ✅ Redux storeで一元管理（どこからでもアクセス可能）
- ✅ 重複監視を防ぐ（ChatApp.tsxで一度だけ）

### 6.3 移植時の注意点

**1. 監視の重複を避ける**
```typescript
// ❌ ダメな例
// UserProfileModal.tsx
useEffect(() => {
  subscribeToUsers(setUsers); // 重複！
}, []);

// ✅ 良い例
// ChatApp.tsx（一箇所だけ）
useEffect(() => {
  const unsubscribe = chatService.subscribeToUsers((users) => {
    dispatch(setUsers(users)); // Redux storeに保存
  });
  return unsubscribe;
}, []);

// UserProfileModal.tsx（Redux storeから取得）
const users = useAppSelector(state => state.chat.users);
```

**2. Firebase関数の統一**
```typescript
// ❌ 直接呼び出し
import { sendMessage } from '@/lib/firebase/chat';
await sendMessage({ ... });

// ✅ chatService経由
import chatService from '../services/chatService';
await chatService.sendMessage(...);
```

**3. エラーハンドリング**
```typescript
// chatServiceの返り値
{
  data: ChatMessage | null,
  error: string | null
}

// 使用例
const result = await chatService.sendMessage(...);
if (result.error) {
  console.error('送信失敗:', result.error);
  // ユーザーに通知
}
```

---

## 7. 移植の推奨順序（優先度順）

### Phase 1: 低リスク・高価値（1-2日）

1. **UserProfileModal** ⭐⭐⭐⭐⭐
   - 影響: なし
   - 価値: 高（ユーザー情報表示は基本機能）
   - 難易度: 非常に低
   - 推定時間: 30分

2. **MessageContent** ⭐⭐⭐⭐☆
   - 影響: なし
   - 価値: 高（リッチテキスト表示）
   - 難易度: 低
   - 推定時間: 1時間

3. **TypingIndicator** ⭐⭐⭐☆☆
   - 影響: なし
   - 価値: 中（入力中表示）
   - 難易度: 低
   - 推定時間: 30分

### Phase 2: 中リスク・高価値（3-5日）

4. **SearchPanel** ⭐⭐⭐⭐☆
   - 影響: 小
   - 価値: 高（検索機能）
   - 難易度: 中
   - 推定時間: 3時間

5. **MentionInput** ⭐⭐⭐⭐⭐
   - 影響: 中（MessageInputを置き換え）
   - 価値: 非常に高（@メンション）
   - 難易度: 中
   - 推定時間: 4時間

6. **ThreadPanel** ⭐⭐⭐⭐☆
   - 影響: 小
   - 価値: 高（スレッド機能）
   - 難易度: やや高
   - 推定時間: 5時間

7. **NotificationSystem** ⭐⭐⭐⭐☆
   - 影響: 中
   - 価値: 高（通知機能）
   - 難易度: やや高
   - 推定時間: 4時間

### Phase 3: 高リスク・中価値（5-7日）

8. **ChannelSettingsModal** ⭐⭐⭐☆☆
   - 影響: 中
   - 価値: 中（チャンネル管理）
   - 難易度: 中
   - 推定時間: 3時間

9. **ServerSettingsModal** ⭐⭐⭐☆☆
   - 影響: 大
   - 価値: 中（サーバー管理）
   - 難易度: 高
   - 推定時間: 6時間

10. **RoleManagementModal** ⭐⭐☆☆☆
    - 影響: 大
    - 価値: 低（権限管理は後回しでも可）
    - 難易度: 高
    - 推定時間: 8時間

---

## 8. まとめ・推奨アクション

### 8.1 即座に移植可能なコンポーネント（Phase 1）

```bash
# 1. ファイルコピー
cp src/app/chat_backup_20250930_140057/components/UserProfileModal.tsx \
   src/chat-v2/components/

cp src/app/chat_backup_20250930_140057/components/MessageContent.tsx \
   src/chat-v2/components/

cp src/app/chat_backup_20250930_140057/components/TypingIndicator.tsx \
   src/chat-v2/components/

# 2. 型チェック
npm run type-check

# 3. 動作確認
npm run dev
```

**期待結果**: 型エラー0件、既存機能は正常動作

### 8.2 次のステップ（Phase 2）

**優先順位**:
1. MentionInput（@メンション機能）
2. SearchPanel（検索機能）
3. ThreadPanel（スレッド機能）

**理由**:
- MentionInput: ユーザー体験向上に直結
- SearchPanel: 過去メッセージ検索は必須
- ThreadPanel: 会話の整理に重要

### 8.3 リスク管理

**常にバックアップから復元可能**:
```bash
# 問題発生時
rm -rf src/chat-v2
cp -r src/chat-v2_working_20251002 src/chat-v2
npm run dev
```

**段階的テスト**:
- 各Phase完了後、必ず動作確認
- 型エラー0件を確認
- 既存機能が壊れていないか確認

### 8.4 最終目標

**完成形のイメージ**:
- ✅ アバタークリック → ユーザー情報モーダル
- ✅ @ 入力 → メンション候補表示
- ✅ メッセージ右クリック → スレッド返信
- ✅ ヘッダーの検索ボタン → メッセージ検索
- ✅ 通知アイコン → メンション通知
- ✅ リンク・コードブロック綺麗に表示

**達成目標**:
- 型エラー: 0件
- ビルド: 成功
- 既存機能: すべて正常動作
- 新機能: すべて動作確認済み

---

## 付録A: 各コンポーネントのファイルサイズ

| コンポーネント | サイズ | 行数（概算） |
|---|---|---|
| UserProfileModal.tsx | 8.9KB | 250行 |
| MentionInput.tsx | 13.2KB | 400行 |
| ThreadPanel.tsx | 13.2KB | 400行 |
| SearchPanel.tsx | 12.5KB | 380行 |
| NotificationSystem.tsx | 14.1KB | 420行 |
| MessageContent.tsx | 5.5KB | 160行 |
| ChannelSettingsModal.tsx | 14.2KB | 430行 |
| ServerSettingsModal.tsx | 28.3KB | 850行 |
| RoleManagementModal.tsx | 21.6KB | 650行 |
| InviteModal.tsx | 12.9KB | 390行 |

**合計**: 約144KB、4,330行

---

## 付録B: 必要なユーティリティ関数

### B.1 日付フォーマット

```typescript
// @/lib/utils/dateFormatter.ts
export const formatRelativeTime = (date: Date | Timestamp): string => {
  // "5分前"、"2時間前"、"昨日"等
};

export const formatChatTimestamp = (date: Date | Timestamp): string => {
  // "14:30"、"昨日 14:30"等
};
```

### B.2 メッセージサニタイズ

```typescript
// @/lib/utils/sanitization.ts
export const sanitizeMessageContent = (content: string): string => {
  // XSS対策
};

export const detectXssAttempt = (content: string): boolean => {
  // 不正なスクリプト検出
};
```

**状態**: 既に実装済み ✅

---

以上、詳細調査レポートでした。
