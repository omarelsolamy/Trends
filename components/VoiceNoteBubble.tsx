'use client';

import { useState, useEffect, useRef } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

const WAVEFORM_BAR_COUNT = 24;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 20;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getBarHeights(seed: number): number[] {
  const heights: number[] = [];
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    const t = Math.sin(seed + i * 0.7) * 0.5 + 0.5;
    heights.push(MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
  }
  return heights;
}

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

export interface VoiceNoteBubbleProps {
  isUser: boolean;
  durationSeconds: number;
  messageId?: string;
  isRTL?: boolean;
  compact?: boolean;
  audioBase64?: string;
  currentPlayingId?: string | null;
  onPlay?: (id: string) => void;
}

export default function VoiceNoteBubble({
  isUser,
  durationSeconds,
  messageId = '',
  compact = false,
  audioBase64,
  currentPlayingId,
  onPlay,
}: VoiceNoteBubbleProps) {
  const t = useTranslations('Chat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);

  const seed = messageId ? [...messageId].reduce((a, c) => a + c.charCodeAt(0), 0) : (objectUrl ? [...objectUrl].reduce((a, c) => a + c.charCodeAt(0), 0) : 0);
  const barHeights = getBarHeights(seed);
  const progress = duration > 0 ? currentTime / duration : 0;
  const hasPlayback = Boolean(audioBase64 && audioBase64.length > 0);

  useEffect(() => {
    if (!hasPlayback) return;
    const raw = typeof audioBase64 === 'string' ? audioBase64 : '';
    if (!raw) return;
    try {
      const url = base64ToObjectUrl(raw, 'audio/webm');
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      };
    } catch (e) {
      console.error('VoiceNoteBubble: failed to decode audio', e);
      setObjectUrl(null);
    }
  }, [hasPlayback, audioBase64]);

  useEffect(() => {
    if (currentPlayingId && messageId && currentPlayingId !== messageId && isPlaying) {
      const el = audioRef.current;
      if (el) el.pause();
    }
  }, [currentPlayingId, messageId, isPlaying]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !objectUrl) return;
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
  }, [objectUrl]);

  const handlePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (hasPlayback) {
      if (el.paused) {
        if (onPlay && messageId) onPlay(messageId);
        el.play();
      } else {
        el.pause();
      }
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
    if (!hasPlayback || !(duration > 0)) return;
    isSeekingRef.current = true;
    handleSeek(getPercentFromEvent(e.clientX));
    const onMove = (e: PointerEvent) => handleSeek(getPercentFromEvent(e.clientX));
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

  const playIconColor = isUser ? '#FFFFFF' : '#135662';
  const playHoverClass = isUser ? 'hover:bg-white/10' : 'hover:bg-[#135662]/10';
  const barColor = isUser ? 'rgba(255,255,255,0.8)' : '#135662';
  const timeClass = isUser ? 'text-white/80' : 'text-[#828282]';

  return (
    <div
      className={`inline-flex items-center gap-3 min-w-[140px] max-w-[280px] sm:max-w-[320px] ${compact ? 'py-1' : 'py-1 sm:py-2'}`}
      role="article"
      aria-label={t('voiceNote.ariaBubble')}
    >
      {hasPlayback && objectUrl && <audio ref={audioRef} key={objectUrl} src={objectUrl} preload="metadata" className="hidden" aria-hidden />}
      <button
        type="button"
        onClick={handlePlayPause}
        className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 transition-colors ${playHoverClass}`}
        aria-label={isPlaying ? t('voiceNote.pause') : t('voiceNote.play')}
      >
        {isPlaying ? (
          <FiPause size={compact ? 20 : 22} color={playIconColor} />
        ) : (
          <FiPlay size={compact ? 20 : 22} color={playIconColor} className="ms-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div
          ref={waveformRef}
          role={hasPlayback ? 'slider' : undefined}
          aria-label={hasPlayback ? 'Seek' : undefined}
          aria-valuemin={hasPlayback ? 0 : undefined}
          aria-valuemax={hasPlayback ? 100 : undefined}
          aria-valuenow={hasPlayback && duration > 0 ? Math.round((currentTime / duration) * 100) : undefined}
          tabIndex={hasPlayback ? 0 : undefined}
          dir="ltr"
          onPointerDown={hasPlayback ? handleWaveformPointerDown : undefined}
          className={`flex items-center gap-0.5 h-6 sm:h-7 ${hasPlayback ? 'cursor-pointer touch-none select-none rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1' : ''}`}
          style={{ minWidth: 0 }}
        >
          {barHeights.map((h, i) => {
            const isFilled = hasPlayback ? (i / WAVEFORM_BAR_COUNT) < progress : false;
            return (
              <div
                key={i}
                className="w-1 rounded-full min-h-[4px] shrink-0 transition-[opacity] duration-75 pointer-events-none"
                style={{
                  height: `${h}px`,
                  backgroundColor: barColor,
                  opacity: hasPlayback ? (isFilled ? 1 : 0.35) : 0.6,
                }}
              />
            );
          })}
        </div>
        <span className={`shrink-0 tabular-nums ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'} ${timeClass}`}>
          {hasPlayback && duration > 0
            ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
            : formatDuration(durationSeconds)}
        </span>
      </div>
    </div>
  );
}
