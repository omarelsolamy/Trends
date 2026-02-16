'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FiSend, FiMic, FiBarChart2, FiExternalLink, FiFileText, FiSquare } from "react-icons/fi";
import { TbWindowMinimize } from "react-icons/tb";
import { sendChatMessage, sendVoiceMessage, sendInfographRequest, blobToBase64 } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import TypingIndicator from './TypingIndicator';
import VoiceNoteBubble from './VoiceNoteBubble';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import AssistantAudioPlayer from './AssistantAudioPlayer';
import InfographImage from './InfographImage';
import { saveMessagesToStorage } from '@/lib/chatStorage';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

interface MetaData {
  date: string;
  title: string;
  writer: string;
  url: string;
}

interface Message {
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
  meta?: MetaData[];
}

interface ChatFullScreenProps {
  onClose?: () => void; // Optional - kept for potential future use
  threadId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function ChatFullScreen({ threadId, messages, setMessages, isLoading, setIsLoading, error, setError }: ChatFullScreenProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Chat');
  const [inputValue, setInputValue] = useState('');
  const [requestInfograph, setRequestInfograph] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = (id: string) => {
    setPlayingId(id);
  };

  const isRTL = locale === 'ar';
  const timeLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 150;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (isRecording) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          const sh = textareaRef.current.scrollHeight;
          textareaRef.current.style.height = `${Math.min(sh, 150)}px`;
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    recordingIntervalRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    };
  }, [isRecording]);

  const startRecording = () => {
    if (isLoading) return;
    setRecordingSeconds(0);
    setIsRecording(true);
  };

  const cancelRecording = () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const sendVoiceNote = async (durationSeconds: number, audioBlob: Blob) => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    const userAudioBase64 = audioBlob.size > 0 ? await blobToBase64(audioBlob) : undefined;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: '',
      contentType: 'voice',
      durationSeconds,
      timestamp: new Date().toLocaleTimeString(timeLocale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
      ...(userAudioBase64 && { userAudioBase64 }),
    };
    setMessages((prev) => [...prev, userMessage]);
    if (audioBlob.size === 0) {
      setError(t('failedToGetResponse'));
      return;
    }
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await sendVoiceMessage(audioBlob, threadId, controller.signal);
      let metaArray: MetaData[] = [];
      if (Array.isArray(response.meta)) {
        metaArray = response.meta;
      } else if (response.meta && typeof response.meta === 'object') {
        metaArray = [response.meta];
      }
      const audioBase64Raw =
        (response as { audio_base64?: string; audioBase64?: string }).audio_base64 ??
        (response as { audioBase64?: string }).audioBase64;
      const audioBase64 =
        typeof audioBase64Raw === 'string' ? audioBase64Raw.trim() : '';
      if (process.env.NODE_ENV === 'development' && audioBase64.length > 0) {
        console.log('Voice response: audio_base64 length =', audioBase64.length);
      }
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: audioBase64.length > 0 ? '' : (response.answer ?? ''),
        timestamp: new Date().toLocaleTimeString(timeLocale, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        meta: metaArray,
        ...(audioBase64.length > 0 && { audioBase64 }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Voice API request was cancelled');
        return;
      }
      setError(t('failedToGetResponse'));
      console.error('Voice API error:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessageContent = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessageContent,
      timestamp: new Date().toLocaleTimeString(timeLocale, {
        hour: '2-digit',
        minute: '2-digit'
      }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const isInfograph = requestInfograph;

    try {
      if (isInfograph) {
        const response = await sendInfographRequest(userMessageContent, threadId, controller.signal);
        let metaArray: MetaData[] = [];
        if (Array.isArray(response.meta)) {
          metaArray = response.meta;
        } else if (response.meta && typeof response.meta === 'object') {
          metaArray = [response.meta];
        }
        const imageBase64 = typeof response.image_base64 === 'string' ? response.image_base64.trim() : '';
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString(timeLocale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          meta: metaArray,
          ...(imageBase64 && { imageBase64 }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const response = await sendChatMessage(userMessageContent, threadId, controller.signal);

        let metaArray: MetaData[] = [];
        if (Array.isArray(response.meta)) {
          metaArray = response.meta;
        } else if (response.meta && typeof response.meta === 'object') {
          metaArray = [response.meta];
        }

        const imageBase64 = response.image && response.image !== 'None' ? response.image.trim() : '';
        const content = imageBase64 && response.answer === 'None' ? '' : response.answer;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: content,
          timestamp: new Date().toLocaleTimeString(timeLocale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          meta: metaArray,
          ...(imageBase64 && { imageBase64 }),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('API request was cancelled');
        return;
      }
      setError(t('failedToGetResponse'));
      console.error(isInfograph ? 'Infograph API error:' : 'Chat API error:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white relative flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 h-[70px] sm:h-[80px] bg-[#FDFDFD] shadow-[0px_1px_8px_rgba(0,0,0,0.13)] px-4 sm:px-8 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center">
          <Image
            src={locale === 'ar' ? "/assets/TRENDS-Logo-text.png" : "/assets/nav-logo.png"}
            alt="TRENDS"
            width={163}
            height={51}
            className="w-[120px] sm:w-[163px] h-auto"
          />
        </div>

        <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
          <span className="text-xl font-semibold text-[#1F263D]">{t('smartAssistant')}</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-[#1F263D] leading-tight">{t('guest')}</span>
              <span className="text-[10px] text-[#828282]">
                {new Date().toLocaleDateString(dateLocale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <Image
              src="/assets/chat-avatar.png"
              alt="Guest User"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover object-[50%_10%] border border-gray-100"
            />
          </div>

          <div className="w-px h-6 bg-gray-200 hidden sm:block" />

          <button
            onClick={() => {
              if (isLoading) return;
              saveMessagesToStorage(messages);
              router.push('/');
            }}
            disabled={isLoading}
            className={`transition-all p-2 rounded-full hover:bg-gray-100 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isLoading ? t('pleaseWaitForAIResponse') : t('minimizeChat')}
          >
            <TbWindowMinimize size={24} color="#1F263D" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-10 pb-2 space-y-8">
        {messages.map((message) => (
          <div key={message.id} className={`flex w-full ${message.type === 'user' ? 'justify-start' : 'justify-end'} ${message.type === 'assistant' ? 'items-start gap-4' : ''}`}>
            <div className={`flex flex-col ${message.type === 'user' ? 'items-start' : 'items-end'} w-full max-w-full min-w-0 ${message.type === 'assistant' ? 'mt-5' : ''}`}>
              {message.type === 'user' ? (
                <>
                  {message.contentType === 'voice' && message.durationSeconds != null ? (
                    <div className={`bg-[#1F263D] text-white px-4 sm:px-6 py-3 rounded-2xl ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'} text-sm sm:text-base font-medium leading-relaxed max-w-[90vw] sm:max-w-[600px]`}>
                      <VoiceNoteBubble
                        isUser
                        durationSeconds={message.durationSeconds}
                        messageId={message.id}
                        isRTL={isRTL}
                        compact={false}
                        audioBase64={message.userAudioBase64}
                        // @ts-ignore
                        currentPlayingId={playingId}
                        // @ts-ignore
                        onPlay={handlePlay}
                      />
                    </div>
                  ) : (
                    <div className={`bg-[#1F263D] text-white px-5 sm:px-6 py-3 rounded-2xl ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'} text-sm sm:text-base font-medium leading-relaxed max-w-[90vw] sm:max-w-[600px]`}>
                      {message.content}
                    </div>
                  )}
                  <span className="text-xs text-[#828282] mt-2 leading-none px-1">
                    {message.timestamp}
                  </span>
                </>
              ) : (
                <>
                  {message.content ? (
                    <div className={`bg-gray-100 text-[#0D1019] text-sm sm:text-base font-medium leading-relaxed prose prose-sm sm:prose-base max-w-[90vw] sm:max-w-[760px] relative z-10 px-5 sm:px-6 py-3 rounded-2xl ${isRTL ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                      <ReactMarkdown
                        components={{
                          a: ({ href, children, ...props }) => {
                            if (!href) return <span>{children}</span>;
                            const isPlainUrl = typeof children === 'string' && (children.startsWith('http://') || children.startsWith('https://'));
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 ${isPlainUrl ? 'text-[#135662] hover:text-[#0d4248]' : 'text-[#135662] underline hover:text-[#0d4248]'} transition-colors cursor-pointer`}
                                onClick={(e) => e.stopPropagation()}
                                title={href}
                                {...props}
                              >
                                {isPlainUrl ? <FiExternalLink size={18} className="inline" /> : children}
                              </a>
                            );
                          },
                        }}
                      >
                        {message.content.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)')}
                      </ReactMarkdown>
                    </div>
                  ) : null}

                  {(() => {
                    const audioBase64 = message.audioBase64 ?? (message as any).audio_base64 ?? '';
                    if (!audioBase64) return null;
                    return (
                      <div className={`min-h-[60px] shrink-0 w-fit ${message.content ? 'mt-3' : ''}`}>
                        <AssistantAudioPlayer
                          audioBase64={audioBase64}
                          isRTL={isRTL}
                          compact={false}
                          className="max-w-[90vw]"
                          autoPlay={true}
                          // @ts-ignore
                          messageId={message.id}
                          // @ts-ignore
                          currentPlayingId={playingId}
                          // @ts-ignore
                          onPlay={handlePlay}
                        />
                      </div>
                    );
                  })()}

                  {message.imageBase64 && (
                    <div className="mt-4 w-full flex justify-end">
                      <InfographImage
                        imageBase64={message.imageBase64}
                        alt="Infograph"
                        className="max-w-full sm:max-w-[600px] w-full"
                      />
                    </div>
                  )}

                  {message.meta && message.meta.length > 0 && (
                    <div className="mt-5 w-full max-w-[600px]">
                      <div className="flex items-center gap-1.5 mb-3 px-1">
                        <FiFileText size={14} className="text-[#828282]" />
                        <span className="text-[#828282] text-xs font-semibold uppercase tracking-wider">{t('sources')}</span>
                      </div>
                      <div className="grid gap-3">
                        {message.meta
                          .filter((source) => source?.url)
                          .map((source, index) => (
                            <a
                              key={index}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block border border-gray-200 rounded-xl p-4 hover:border-[#135662] hover:bg-gray-50 transition-all group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[#1F263D] text-sm font-semibold leading-snug group-hover:text-[#135662] transition-colors line-clamp-2">
                                    {source.title || t('viewOnTrendsResearch')}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[#828282] text-[11px] mt-2">
                                    {source.writer && <span>{source.writer}</span>}
                                    {source.writer && source.date && <span>•</span>}
                                    {source.date && <span>{source.date}</span>}
                                  </div>
                                </div>
                                <FiExternalLink size={16} className="text-[#135662] shrink-0 mt-0.5" />
                              </div>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {message.type === 'assistant' && (
              <div className="shrink-0 pt-0.5">
                <Image
                  src="/assets/trends-logo.png"
                  alt="TRENDS Assistant"
                  width={54}
                  height={54}
                  className="w-10 h-10 sm:w-14 sm:h-14"
                />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-end items-center gap-4">
            <TypingIndicator />
            <div className="shrink-0">
              <Image
                src="/assets/trends-logo.png"
                alt="TRENDS Assistant"
                width={54}
                height={54}
                className="w-10 h-10 sm:w-14 sm:h-14"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm max-w-4xl mx-auto">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </main>

      <footer className="sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 sm:px-8 md:px-12 py-4 sm:py-6 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-[#EDEDED] rounded-2xl flex items-center gap-2 min-h-[50px] sm:min-h-[60px] px-4 sm:px-6 py-2">
            {isRecording ? (
              <VoiceNoteRecorder
                recordingSeconds={recordingSeconds}
                onCancel={cancelRecording}
                onSend={sendVoiceNote}
                disabled={isLoading}
                compact={false}
              />
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('askAnything')}
                  className="chat-textarea flex-1 bg-transparent text-sm sm:text-base text-[#0D1019] placeholder:text-[#777777] focus:outline-none resize-none overflow-y-auto max-h-[150px] leading-relaxed self-center"
                  disabled={isLoading}
                  rows={1}
                  style={{ minHeight: '24px' }}
                />
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isLoading}
                  className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-transparent text-[#1F263D] hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
                  title={t('voiceNote.record')}
                >
                  <FiMic size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setRequestInfograph((prev) => !prev)}
                  disabled={isLoading || !inputValue.trim()}
                  title={requestInfograph ? t('infograph.off') : t('infograph.on')}
                  className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${requestInfograph ? 'bg-[#135662] text-white hover:bg-[#0d4248]' : 'bg-transparent text-[#828282] hover:bg-black/5'}`}
                >
                  <FiBarChart2 size={22} />
                </button>
                <button
                  type="button"
                  onClick={isLoading ? handleStopResponse : handleSend}
                  disabled={!isLoading && !inputValue.trim()}
                  className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-colors cursor-pointer ${isLoading
                    ? 'bg-[#1F263D] hover:bg-[#2a3347]'
                    : 'bg-[#1F263D] hover:bg-[#2a3347] disabled:opacity-50'
                    }`}
                  aria-label={isLoading ? t('stopResponse') : t('sendMessage')}
                >
                  {isLoading ? (
                    <FiSquare size={18} color="#FFFFFF" />
                  ) : (
                    <FiSend size={20} color="#FFFFFF" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

