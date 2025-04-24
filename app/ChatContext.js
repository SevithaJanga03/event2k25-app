// app/ChatContext.js
import React, { createContext, useState } from 'react';

// Create a context with messages + setter
export const ChatContext = createContext({
  messages: [],
  setMessages: () => {},
});

// Wrap your whole app in this provider to persist chat state
export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! Ask me about events.' },
  ]);

  return (
    <ChatContext.Provider value={{ messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
}
