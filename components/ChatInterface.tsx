'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { TbWindowMaximize } from "react-icons/tb";
import { FiSend, FiMic, FiBarChart2, FiExternalLink, FiFileText, FiSquare } from "react-icons/fi";
import { sendChatMessage, sendVoiceMessage, sendInfographRequest, blobToBase64 } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import TypingIndicator from './TypingIndicator';
import VoiceNoteBubble from './VoiceNoteBubble';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import AssistantAudioPlayer from './AssistantAudioPlayer';
import InfographImage from './InfographImage';
import { saveMessagesToStorage, Message } from '@/lib/chatStorage';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

interface ChatInterfaceProps {
  onClose: () => void;
  onExpand: () => void;
  threadId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function ChatInterface({ onClose, onExpand, threadId, messages, setMessages, isLoading, setIsLoading, error, setError }: ChatInterfaceProps) {
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
      const maxHeight = 120; // Max height in pixels (about 5-6 lines)
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
          textareaRef.current.style.height = `${Math.min(sh, 120)}px`;
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
      timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
      let metaArray: Message['meta'] = [];
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
        timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
      timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
        let metaArray: Message['meta'] = [];
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
          timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
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

        let metaArray: Message['meta'] = [];
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
          timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
    <>
      {/* Transparent Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-label="Close chat"
      />

      {/* Chat Container*/}
      <div
        className="fixed bottom-4 sm:bottom-8 z-50 w-[calc(100vw-2rem)] sm:w-[401px] max-w-[401px] pointer-events-auto"
        style={{
          insetInlineEnd: 'clamp(1rem, 2vw, 2rem)',
        }}
      >
        <div className="bg-white rounded-[22px] shadow-[0px_1px_17.9px_1px_rgba(0,0,0,0.14)] flex flex-col h-[613px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex flex-col">
              <h2 className="text-[17px] font-semibold text-[#1F263D] leading-[26px]">
                {t('smartAssistant')}
              </h2>
              <p className="text-[11px] text-[#828282] leading-4">
                {t('alwaysHereToHelp')}
              </p>
            </div>
            <button
              onClick={() => {
                if (isLoading) return;
                saveMessagesToStorage(messages);
                router.push('/chat');
              }}
              disabled={isLoading}
              className={`flex items-center justify-center w-[35px] h-[35px] bg-[#1F263D] rounded-full transition-all duration-200 ${isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#2a3347] cursor-pointer'
                }`}
              aria-label={isLoading ? t('pleaseWaitForResponse') : t('expandChat')}
              title={isLoading ? t('pleaseWaitForAIResponse') : t('expandToFullScreen')}
            >
              <TbWindowMaximize size={22} color="#FFFFFF" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-[#E3E3E3]" />

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 pointer-events-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'} ${message.type === 'assistant' ? 'items-start gap-2' : ''}`}>
                <div className={`flex flex-col ${message.type === 'user' ? 'items-start' : 'items-end'} w-full max-w-full sm:max-w-[322px] min-w-0 ${message.type === 'assistant' ? 'mt-[13px] -ms-2' : ''}`}>
                  {message.type === 'user' ? (
                    <>
                      {message.contentType === 'voice' && message.durationSeconds != null ? (
                        <div className={`bg-[#1F263D] text-white px-4 py-2.5 rounded-2xl ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'} text-sm font-light leading-[21px]`}>
                          <VoiceNoteBubble
                            isUser
                            durationSeconds={message.durationSeconds}
                            messageId={message.id}
                            isRTL={isRTL}
                            compact
                            audioBase64={message.userAudioBase64}
                            currentPlayingId={playingId}
                            onPlay={handlePlay}
                          />
                        </div>
                      ) : (
                        <div className={`bg-[#1F263D] text-white px-4 py-2.5 rounded-2xl ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'} text-sm font-light leading-[21px]`}>
                          {message.content}
                        </div>
                      )}
                      <span className="text-[10px] text-[#828282] mt-1 leading-[15px] ms-0">
                        {message.timestamp}
                      </span>
                    </>
                  ) : (
                    <>
                      {message.content ? (
                        <div className={`bg-gray-100 text-[#0D1019] text-sm font-medium leading-[21px] prose prose-sm max-w-none pointer-events-auto relative z-20 wrap-break-word overflow-wrap-anywhere text-start px-4 py-2.5 rounded-2xl ${isRTL ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                          <ReactMarkdown
                            remarkPlugins={[]}
                            rehypePlugins={[]}
                            components={{
                              a: ({ href, children, ...props }: any) => {
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
                                    {isPlainUrl ? (
                                      <FiExternalLink size={16} className="inline" />
                                    ) : (
                                      children
                                    )}
                                  </a>
                                );
                              },
                            }}
                          >
                            {message.content.replace(
                              /(https?:\/\/[^\s]+)/g,
                              (url) => `[${url}](${url})`
                            )}
                          </ReactMarkdown>
                        </div>
                      ) : null}
                      {(() => {
                        const audioBase64 = message.audioBase64 ?? (message as { audio_base64?: string }).audio_base64 ?? '';
                        const isVoiceOnly = audioBase64.length > 0 && !message.content;
                        return audioBase64.length > 0 ? (
                          <div className={`min-h-[60px] shrink-0 ${isVoiceOnly ? 'w-fit' : 'w-full'} ${message.content ? 'mt-3' : ''}`} style={{ minHeight: 60 }}>
                            <AssistantAudioPlayer
                              audioBase64={audioBase64}
                              isRTL={isRTL}
                              compact
                              className="max-w-[280px]"
                              autoPlay={true}
                              messageId={message.id}
                              currentPlayingId={playingId}
                              onPlay={handlePlay}
                            />
                          </div>
                        ) : null;
                      })()}
                      {message.imageBase64 && (
                        <div className="mt-3 min-w-0 w-full max-w-full flex justify-end">
                          <InfographImage
                            imageBase64={message.imageBase64}
                            alt="Infograph"
                            className="max-w-[322px] w-full"
                          />
                        </div>
                      )}
                      {message.meta && Array.isArray(message.meta) && message.meta.length > 0 && (
                        <div className="mt-3 min-w-0 w-full max-w-[322px] overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-2">
                            <FiFileText size={14} className="text-[#828282] shrink-0" />
                            <span className="text-[#828282] text-[11px] font-medium uppercase tracking-wide">{t('sources')}</span>
                          </div>
                          <div className="space-y-2 min-w-0">
                            {message.meta
                              .filter((source) => source && source.url)
                              .map((source, index) => (
                                <a
                                  key={`meta-wrapper-${index}`}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block border border-gray-200 rounded-lg p-3 hover:border-[#135662] hover:bg-gray-50 transition-all cursor-pointer group min-w-0 overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <h4 className="text-[#1F263D] text-[13px] font-semibold leading-5 mb-1 group-hover:text-[#135662] transition-colors line-clamp-2 break-words overflow-wrap-anywhere">
                                        {source.title || t('viewOnTrendsResearch')}
                                      </h4>
                                      <div className="flex items-center gap-2 text-[#828282] text-[11px] mt-1 min-w-0 overflow-hidden">
                                        {source.writer && (
                                          <span className="truncate min-w-0">{source.writer}</span>
                                        )}
                                        {source.date && (
                                          <>
                                            {source.writer && <span className="shrink-0">•</span>}
                                            <span className="truncate min-w-0">{source.date}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <FiExternalLink size={16} className="text-[#135662] group-hover:text-[#0d4248] transition-colors shrink-0 mt-0.5 flex-shrink-0" />
                                  </div>
                                </a>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Avatar*/}
                {message.type === 'assistant' && (
                  <div className="shrink-0">
                    <Image
                      src="/assets/trends-logo.png"
                      alt="TRENDS Assistant"
                      width={39}
                      height={39}
                      className="w-[39px] h-[39px]"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-end items-center">
                <TypingIndicator />
                <div className="shrink-0 ms-3">
                  <Image
                    src="/assets/trends-logo.png"
                    alt="TRENDS Assistant"
                    width={39}
                    height={39}
                    className="w-[39px] h-[39px]"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-3 pb-4">
            <div className="relative bg-[#EDEDED] rounded-[14px] flex items-center gap-2 min-h-[50px] px-4 py-2">
              {isRecording ? (
                <VoiceNoteRecorder
                  recordingSeconds={recordingSeconds}
                  onCancel={cancelRecording}
                  onSend={sendVoiceNote}
                  disabled={isLoading}
                  compact
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
                    className="chat-textarea flex-1 bg-transparent text-sm text-[#0D1019] placeholder:text-[#777777] focus:outline-none resize-none overflow-y-auto max-h-[120px] leading-5 self-center"
                    disabled={isLoading}
                    rows={1}
                    style={{ minHeight: '20px' }}
                  />
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isLoading}
                    className="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-transparent text-[#1F263D] hover:bg-[#1F263D]/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label={t('voiceNote.record')}
                  >
                    <FiMic size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestInfograph((prev) => !prev)}
                    disabled={isLoading || !inputValue.trim()}
                    title={requestInfograph ? t('infograph.off') : t('infograph.on')}
                    className={`flex items-center justify-center w-[38px] h-[38px] rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${requestInfograph
                      ? 'bg-[#135662] text-white hover:bg-[#0d4248]'
                      : 'bg-transparent text-[#828282] hover:bg-[#E3E3E3]'
                      }`}
                    aria-label={t('infograph.aria')}
                    aria-pressed={requestInfograph}
                  >
                    <FiBarChart2 size={20} color={requestInfograph ? '#FFFFFF' : '#828282'} />
                  </button>
                  <button
                    onClick={isLoading ? handleStopResponse : handleSend}
                    disabled={!isLoading && !inputValue.trim()}
                    className={`flex items-center justify-center w-[38px] h-[38px] rounded-full transition-colors cursor-pointer shrink-0 ${isLoading
                      ? 'bg-[#1F263D] hover:bg-[#2a3347]'
                      : 'bg-[#1F263D] hover:bg-[#2a3347] disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    aria-label={isLoading ? t('stopResponse') : t('sendMessage')}
                  >
                    {isLoading ? (
                      <FiSquare size={16} color="#FFFFFF" />
                    ) : (
                      <FiSend size={20} color="#FFFFFF" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
