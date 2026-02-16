export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  contentType?: 'text' | 'voice';
  durationSeconds?: number;
  userAudioBase64?: string;
  voiceUrl?: string;
  audioBase64?: string;
  imageBase64?: string;
  meta?: {
    date: string;
    title: string;
    writer: string;
    url: string;
  }[];
}

const MESSAGES_STORAGE_KEY = 'trends_chat_messages';

export function saveMessagesToStorage(messages: Message[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages to storage:', error);
  }
}

export function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = sessionStorage.getItem(MESSAGES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load messages from storage:', error);
    return [];
  }
}

export function clearMessagesFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(MESSAGES_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear messages from storage:', error);
  }
}

