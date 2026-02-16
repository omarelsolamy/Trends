'use client';

import { useState, useEffect } from 'react';
import { RiChatAiLine } from "react-icons/ri";
import ChatInterface from './ChatInterface';
import { Message, loadMessagesFromStorage, saveMessagesToStorage } from '@/lib/chatStorage';

// Generate UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
}

// Get or create thread ID from sessionStorage
function getOrCreateThreadId(): string {
  const STORAGE_KEY = 'trends_chat_thread_id';
  
  if (typeof window === 'undefined') {
    return '';
  }

  let threadId = sessionStorage.getItem(STORAGE_KEY);
  
  if (!threadId) {
    threadId = generateUUID();
    sessionStorage.setItem(STORAGE_KEY, threadId);
  }
  
  return threadId;
}

export default function ChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize thread ID and load messages on mount
  useEffect(() => {
    setThreadId(getOrCreateThreadId());
    setMessages(loadMessagesFromStorage());
  }, []);

  // Save messages to storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleExpandChat = () => {
    // This will be handled by ChatInterface navigation
  };

  return (
    <>
      {/* Floating Chat Button - Hide when chat is open */}
      {!isChatOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-4 sm:bottom-8 z-50 flex items-center justify-center w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] bg-[#1F263D] rounded-[46px] shadow-[0px_0px_24.2px_8px_rgba(19,86,98,0.43)] transition-transform hover:scale-110 animate-pulse-slow cursor-pointer"
          style={{ 
            insetInlineEnd: 'clamp(1rem, 2vw, 2rem)',
          }}
          aria-label="Open chat"
        >
          <span className="relative z-10">
            <RiChatAiLine size={26} color="#FFFFFF" />
          </span>
        </button>
      )}

      {/* Chat Interface */}
      {isChatOpen && threadId && (
        <ChatInterface
          onClose={handleCloseChat}
          onExpand={handleExpandChat}
          threadId={threadId}
          messages={messages}
          setMessages={setMessages}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          error={error}
          setError={setError}
        />
      )}
    </>
  );
}
