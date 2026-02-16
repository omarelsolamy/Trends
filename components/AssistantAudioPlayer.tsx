'use client';

import { useEffect, useState, useRef } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

function normalizeBase64(input: string): string {
  const trimmed = input.trim();
  const dataUrlMatch = trimmed.match(/^data:audio\/[^;]+;base64,(.+)$/i);
  const raw = dataUrlMatch ? dataUrlMatch[1] : trimmed;
  return raw.replace(/\s/g, '');
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const normalized = normalizeBase64(base64);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const WAVEFORM_BAR_COUNT = 24;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 20;

function getBarHeights(seed: number): number[] {
  const heights: number[] = [];
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    const t = Math.sin(seed + i * 0.7) * 0.5 + 0.5;
    heights.push(MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
  }
  return heights;
}

interface AssistantAudioPlayerProps {
  audioBase64: string;
  audioUrl?: string;
  mimeType?: string;
  className?: string;
  isRTL?: boolean;
  compact?: boolean;
  autoPlay?: boolean;
  messageId?: string;
  currentPlayingId?: string | null;
  onPlay?: (id: string) => void;
}

const bubbleBase = 'bg-gray-100 text-[#0D1019] px-4 py-2.5 rounded-2xl min-h-[48px]';
const PLAY_ICON_COLOR = '#135662';
const BAR_COLOR = '#135662';

// Global tracking for auto-played messages to prevent re-play on remount (minimize/expand)
const globalPlayedMessageIds = new Set<string>();

export default function AssistantAudioPlayer({
  audioBase64: audioBase64Prop,
  audioUrl,
  mimeType = 'audio/wav',
  className = '',
  isRTL = false,
  compact = false,
  autoPlay = false,
  messageId,
  currentPlayingId,
  onPlay,
}: AssistantAudioPlayerProps) {
  const t = useTranslations('Chat');
  const audioBase64 = typeof audioBase64Prop === 'string' ? audioBase64Prop : String(audioBase64Prop ?? '');
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);
  const cornerClass = isRTL ? 'rounded-tl-none' : 'rounded-tr-none';

  const seed = audioSrc ? [...audioSrc].reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  const barHeights = getBarHeights(seed);
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    if (audioUrl) {
      setError(null);
      setAudioSrc(audioUrl);
      return;
    }
    if (!audioBase64 || audioBase64.length === 0) {
      setAudioSrc(null);
      return;
    }
    setError(null);
    try {
      const url = base64ToObjectUrl(audioBase64, mimeType);
      setAudioSrc(url);
      return () => {
        URL.revokeObjectURL(url);
        setAudioSrc(null);
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to decode audio';
      console.error('AssistantAudioPlayer:', msg, e);
      setError(msg);
      setAudioSrc(null);
    }
  }, [audioBase64, audioUrl, mimeType]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioSrc) return;
    const onLoadedMetadata = () => setDuration(el.duration);
    const onTimeUpdate = () => {
      if (!isSeekingRef.current) setCurrentTime(el.currentTime);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    if (el.duration && !Number.isNaN(el.duration)) setDuration(el.duration);
    return () => {
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  useEffect(() => {
    if (currentPlayingId && messageId && currentPlayingId !== messageId && isPlaying) {
      const el = audioRef.current;
      if (el) el.pause();
    }
  }, [currentPlayingId, messageId, isPlaying]);

  // Static set to track messages that have already auto-played in this session
  // This prevents audio from re-playing when the component remounts (e.g. resize/expand)
  const playedMessageIds = useRef(new Set<string>());

  const hasAutoPlayed = useRef(false);
  useEffect(() => {
    // If we have a messageId, check if it's already been played globally (pseudo-global via module scope if we moved it out, 
    // but here we can't easily share state without context. 
    // Actually, a simple module-level Set outside the component is better.)
    if (autoPlay && audioSrc && audioRef.current && !hasAutoPlayed.current) {
      if (messageId && globalPlayedMessageIds.has(messageId)) {
        hasAutoPlayed.current = true;
        return;
      }

      const el = audioRef.current;
      const playAudio = () => {
        el.play().catch(err => {
          console.warn('AssistantAudioPlayer: Autoplay blocked.', err);
        });
        hasAutoPlayed.current = true;
        if (messageId) globalPlayedMessageIds.add(messageId);
        if (onPlay && messageId) onPlay(messageId);
      };

      if (el.readyState >= 3) { // HAVE_FUTURE_DATA
        playAudio();
      } else {
        el.addEventListener('canplay', playAudio, { once: true });
      }
    }
  }, [audioSrc, autoPlay, messageId, onPlay]);

  const handlePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      if (onPlay && messageId) onPlay(messageId);
      el.play();
    } else {
      el.pause();
    }
  };

  const handleSeek = (percent: number) => {
    const el = audioRef.current;
    if (!el || !(duration > 0)) return;
    const time = (percent / 100) * duration;
    el.currentTime = time;
    setCurrentTime(time);
  };

  const getPercentFromEvent = (clientX: number): number => {
    const el = waveformRef.current;
    if (!el || !(duration > 0)) return 0;
    const rect = el.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(rect.right, clientX));
    return ((x - rect.left) / rect.width) * 100;
  };

  const handleWaveformPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!(duration > 0)) return;
    isSeekingRef.current = true;
    handleSeek(getPercentFromEvent(e.clientX));
    const onMove = (e: PointerEvent) => {
      handleSeek(getPercentFromEvent(e.clientX));
    };
    const onUp = () => {
      isSeekingRef.current = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  if (error) {
    return (
      <div className={`text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl ${cornerClass} px-4 py-3 mt-2 min-h-[48px] flex items-center ${className}`} role="status">
        Audio could not be loaded: {error}
      </div>
    );
  }

  if (!audioSrc) {
    return (
      <div className={`text-sm text-[#135662] ${bubbleBase} ${cornerClass} mt-2 flex items-center ${className}`} role="status">
        <span className="animate-pulse">Loading audio…</span>
      </div>
    );
  }

  return (
    <div className={`${bubbleBase} ${cornerClass} py-2 sm:py-2.5 w-fit max-w-full ${compact ? 'px-3' : 'px-4 sm:px-6'} ${className}`} style={{ minHeight: 52 }}>
      <audio ref={audioRef} key={audioSrc} src={audioSrc ?? undefined} preload="metadata" className="hidden" aria-hidden />
      <div className="flex flex-col gap-2 w-full min-w-[140px] max-w-[280px] sm:max-w-[320px]" role="article" aria-label={t('voiceNote.ariaBubble')}>
        <div className="inline-flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={handlePlayPause}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 transition-colors hover:bg-[#135662]/10"
            aria-label={isPlaying ? t('voiceNote.pause') : t('voiceNote.play')}
          >
            {isPlaying ? (
              <FiPause size={compact ? 20 : 22} color={PLAY_ICON_COLOR} />
            ) : (
              <FiPlay size={compact ? 20 : 22} color={PLAY_ICON_COLOR} className="ms-0.5" />
            )}
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div
              ref={waveformRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
              tabIndex={0}
              dir="ltr"
              onPointerDown={handleWaveformPointerDown}
              onKeyDown={(e) => {
                if (!(duration > 0)) return;
                const step = 5;
                const pct = (currentTime / duration) * 100;
                if (e.key === 'ArrowLeft' || e.key === 'Home') {
                  e.preventDefault();
                  handleSeek(e.key === 'Home' ? 0 : Math.max(0, pct - step));
                } else if (e.key === 'ArrowRight' || e.key === 'End') {
                  e.preventDefault();
                  handleSeek(e.key === 'End' ? 100 : Math.min(100, pct + step));
                }
              }}
              className="flex items-center gap-0.5 h-6 sm:h-7 cursor-pointer touch-none select-none rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#135662] focus-visible:ring-offset-1"
              style={{ minWidth: 0 }}
            >
              {barHeights.map((h, i) => {
                const isFilled = (i / WAVEFORM_BAR_COUNT) < progress;
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full min-h-[4px] shrink-0 transition-[opacity] duration-75 pointer-events-none"
                    style={{
                      height: `${h}px`,
                      backgroundColor: BAR_COLOR,
                      opacity: isFilled ? 1 : 0.35,
                    }}
                  />
                );
              })}
            </div>
            <span className={`text-[#828282] shrink-0 tabular-nums ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
              {duration > 0 ? `${formatDuration(currentTime)} / ${formatDuration(duration)}` : '0:00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
