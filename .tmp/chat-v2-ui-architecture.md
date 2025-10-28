# Chat V2 UI Architecture Design
## Phase 3: Discord風UIレイヤー設計書

### 🎯 設計原則

#### Container/Presenterパターン
- **Container**: ビジネスロジック、状態管理、useChatV2統合
- **Presenter**: 純粋なUI表示、プロパティ受け取り、イベント発生

#### React 18最適化
- **Concurrent Features**: Suspense、Transitions、useDeferredValue
- **Memoization**: useMemo、useCallback、React.memo
- **Virtual Scrolling**: @tanstack/react-virtual

#### アクセシビリティファースト
- **ARIA属性**: 適切なロール、ラベル、状態
- **キーボード操作**: Tab、Enter、Arrow Keys、Escape
- **スクリーンリーダー**: 読み上げ対応、フォーカス管理

### 📁 ディレクトリ構造

```
src/chat-v2/
├── components/
│   ├── containers/          # Container（データ・ロジック）
│   │   ├── ChatContainer.tsx
│   │   ├── MessageListContainer.tsx
│   │   ├── MessageInputContainer.tsx
│   │   ├── ChannelSidebarContainer.tsx
│   │   └── UserListContainer.tsx
│   │
│   ├── presenters/          # Presenter（UI表示）
│   │   ├── ChatPresenter.tsx
│   │   ├── MessageListPresenter.tsx
│   │   ├── MessageItemPresenter.tsx
│   │   ├── MessageInputPresenter.tsx
│   │   ├── ChannelSidebarPresenter.tsx
│   │   └── UserListPresenter.tsx
│   │
│   ├── shared/             # 共通UIコンポーネント
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── StatusIndicator.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── VirtualList.tsx
│   │
│   └── hooks/              # UIロジック専用フック
│       ├── useVirtualScroll.ts
│       ├── useAutoScroll.ts
│       ├── useKeyboardNavigation.ts
│       └── useMessageInteractions.ts
│
├── pages/                  # ページコンポーネント
│   └── ChatPage.tsx
│
└── styles/                 # スタイル定義
    ├── discord-theme.css
    └── accessibility.css
```

### 🎨 Discord風デザインシステム

#### カラーパレット
```css
:root {
  /* Background Colors */
  --discord-bg-primary: #36393f;
  --discord-bg-secondary: #2f3136;
  --discord-bg-tertiary: #202225;

  /* Text Colors */
  --discord-text-primary: #dcddde;
  --discord-text-secondary: #b9bbbe;
  --discord-text-muted: #72767d;

  /* Accent Colors */
  --discord-accent-primary: #5865f2;
  --discord-accent-hover: #4752c4;
  --discord-success: #3ba55c;
  --discord-warning: #faa61a;
  --discord-danger: #ed4245;

  /* Message Status Colors */
  --status-sending: #faa61a;
  --status-sent: #3ba55c;
  --status-failed: #ed4245;
}
```

#### レイアウト構成（3ペイン）
```
┌─────────────────────────────────────────────────────────┐
│ [Top Bar] - チャンネル名・検索・設定                           │
├──────────┬──────────────────────────────┬─────────────────┤
│          │                              │                 │
│ Channel  │      Message Area            │   User List     │
│ Sidebar  │                              │   (Optional)    │
│          │ ┌─────────────────────────────┐│                 │
│ - 一般    │ │ [Virtual Message List]     ││ - Online Users  │
│ - 開発    │ │ Message Item 1             ││ - Offline Users │
│ - 雑談    │ │ Message Item 2             ││                 │
│          │ │ Message Item 3             ││                 │
│ + 新規   │ │ ...                        ││                 │
│          │ └─────────────────────────────┘│                 │
│          │ ┌─────────────────────────────┐│                 │
│          │ │ [Message Input]            ││                 │
│          │ │ Type a message...          ││                 │
│          │ └─────────────────────────────┘│                 │
└──────────┴──────────────────────────────┴─────────────────┘
```

### 🧩 主要コンポーネント設計

#### 1. ChatContainer（メインコンテナ）
```tsx
interface ChatContainerProps {
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  userEmail: string;
}

// useChatV2統合、子コンポーネントへのプロパティ配布
// エラーハンドリング、初期化・接続管理
```

#### 2. MessageListContainer（メッセージリスト管理）
```tsx
interface MessageListContainerProps {
  channelId: string;
}

// 仮想スクロール制御、メッセージフィルタリング
// 新着メッセージ時の自動スクロール判定
// 「下へスクロール」ボタン表示制御
```

#### 3. MessageItemPresenter（個別メッセージUI）
```tsx
interface MessageItemPresenterProps {
  message: MessageState;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  isFirst: boolean; // 連続メッセージ判定
  onRetry?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReact?: (emoji: string) => void;
}

// 送信状態表示（sending/sent/failed）
// メンション検出・ハイライト
// 添付ファイル表示
// リアクション表示
```

#### 4. VirtualScrollMessageList（仮想スクロール）
```tsx
interface VirtualScrollMessageListProps {
  messages: MessageState[];
  renderMessage: (message: MessageState, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

// @tanstack/react-virtual使用
// 下から上への順序安定化
// スクロール位置保持
// 新着メッセージ自動スクロール制御
```

### 🚀 パフォーマンス最適化戦略

#### 1. メモ化戦略
```tsx
// メッセージコンポーネントのメモ化
const MessageItemMemo = React.memo(MessageItemPresenter, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.optimisticStatus === next.message.optimisticStatus &&
    prev.message.content === next.message.content
  );
});

// セレクターのメモ化
const selectChannelMessages = useMemo(() =>
  createSelector(
    [(state: RootState) => state.messages, (_, channelId: string) => channelId],
    (messages, channelId) =>
      messages.allIds
        .map(id => messages.byId[id])
        .filter(msg => msg.channelId === channelId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  ),
  [channelId]
);
```

#### 2. 仮想スクロール最適化
```tsx
// 固定サイズ・動的サイズ対応
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => scrollElementRef.current,
  estimateSize: useCallback((index) => {
    const message = messages[index];
    return estimateMessageHeight(message);
  }, [messages]),
  overscan: 5, // レンダリング範囲外のバッファ
});

// スクロール位置保持
const [shouldMaintainScrollPosition, setShouldMaintainScrollPosition] = useState(false);
```

#### 3. React 18 Concurrent Features
```tsx
// Suspense境界でのローディング状態管理
<Suspense fallback={<MessageListSkeleton />}>
  <MessageListContainer channelId={selectedChannelId} />
</Suspense>

// Transitionsで低優先度更新
const [isPending, startTransition] = useTransition();

const handleChannelSelect = (channelId: string) => {
  startTransition(() => {
    actions.selectChannel(channelId);
  });
};

// useDeferredValueで応答性維持
const deferredSearchQuery = useDeferredValue(searchQuery);
```

### ♿ アクセシビリティ実装

#### 1. キーボードナビゲーション
```tsx
// メッセージリストでのArrow Key操作
const useKeyboardNavigation = (messages: MessageState[]) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        setFocusedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        setFocusedIndex(prev => Math.min(messages.length - 1, prev + 1));
        break;
      case 'Enter':
        // メッセージ詳細表示・操作
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
    }
  }, [messages.length]);

  return { focusedIndex, handleKeyDown };
};
```

#### 2. ARIA属性・スクリーンリーダー対応
```tsx
// メッセージリスト
<div
  role="log"
  aria-live="polite"
  aria-label={`${selectedChannel?.name}チャンネルのメッセージ`}
>
  {messages.map((message, index) => (
    <div
      key={message.id}
      role="article"
      aria-labelledby={`message-author-${message.id}`}
      aria-describedby={`message-content-${message.id}`}
      tabIndex={focusedIndex === index ? 0 : -1}
    >
      <div id={`message-author-${message.id}`}>
        {message.authorName}
      </div>
      <div id={`message-content-${message.id}`}>
        {message.content}
      </div>
    </div>
  ))}
</div>

// 送信状態のスクリーンリーダー通知
<span className="sr-only" aria-live="assertive">
  {optimisticStatus === 'sending' && 'メッセージを送信中'}
  {optimisticStatus === 'sent' && 'メッセージを送信しました'}
  {optimisticStatus === 'failed' && 'メッセージの送信に失敗しました'}
</span>
```

### 🔧 実装順序

1. **共通UIコンポーネント** (Avatar, StatusIndicator, etc.)
2. **VirtualScrollMessageList** (仮想スクロール基盤)
3. **MessageItemPresenter** (個別メッセージUI)
4. **MessageListContainer** (メッセージリスト管理)
5. **MessageInputContainer & Presenter** (メッセージ入力)
6. **ChannelSidebarContainer & Presenter** (チャンネル一覧)
7. **ChatContainer & Presenter** (メイン統合)
8. **ChatPage** (ページレベル統合)
9. **アクセシビリティ・最適化**
10. **テスト・型チェック**

### 📊 パフォーマンス目標

- **初回レンダリング**: < 300ms
- **メッセージ送信**: < 100ms (楽観的UI)
- **チャンネル切り替え**: < 200ms
- **スクロール応答性**: 60 FPS維持
- **メモリ使用量**: < 50MB (1000メッセージ)

### 🧪 テスト戦略

- **Unit Tests**: 各Presenterコンポーネント
- **Integration Tests**: Container + Presenter組み合わせ
- **E2E Tests**: 実際のユーザーワークフロー
- **Accessibility Tests**: アクセシビリティ自動検証
- **Performance Tests**: レンダリング性能測定