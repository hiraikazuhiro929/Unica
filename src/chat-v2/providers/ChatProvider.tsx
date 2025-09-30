import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';

interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Chat V2 Redux Store Provider
 * アプリケーションのルートでこのプロバイダーでラップする
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

export default ChatProvider;