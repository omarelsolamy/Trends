'use client';

import { useState, useEffect } from 'react';
import ChatFullScreen from '@/components/ChatFullScreen';
import { loadMessagesFromStorage, saveMessagesToStorage, Message } from '@/lib/chatStorage';
import { useRouter } from '@/i18n/routing';

export const runtime = 'edge';

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

export default function ChatPage() {
  const router = useRouter();
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

  const handleClose = () => {
    router.push('/');
  };

  return (
    <ChatFullScreen
      onClose={handleClose}
      threadId={threadId}
      messages={messages}
      setMessages={setMessages}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      error={error}
      setError={setError}
    />
  );
}

