'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSend, FiX } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

const RECORDING_BAR_COUNT = 12;
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 24;
const FFT_SIZE = 2048;
const SMOOTHING = 0.4;
const WAVEFORM_CENTRE = 128;
const MIC_GAIN = 4;
const FLOOR = 2;
const SILENCE_THRESHOLD = 10;

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function peaksToHeights(peaks: number[]): number[] {
  const maxPeak = Math.max(...peaks, FLOOR);
  const range = MAX_BAR_HEIGHT_PX - MIN_BAR_HEIGHT_PX;
  const heights = peaks.map((p) => {
    const t = Math.min(1, p / maxPeak);
    return MIN_BAR_HEIGHT_PX + t * range;
  });
  if (maxPeak < SILENCE_THRESHOLD) {
    const levelScale = maxPeak / SILENCE_THRESHOLD;
    return heights.map((h) =>
      Math.round(MIN_BAR_HEIGHT_PX + (h - MIN_BAR_HEIGHT_PX) * levelScale)
    );
  }
  return heights.map((h) => Math.round(h));
}

export interface VoiceNoteRecorderProps {
  recordingSeconds: number;
  onCancel: () => void;
  onSend: (durationSeconds: number, audioBlob: Blob) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function VoiceNoteRecorder({
  recordingSeconds,
  onCancel,
  onSend,
  disabled = false,
  compact = false,
}: VoiceNoteRecorderProps) {
  const t = useTranslations('Chat');
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array.from({ length: RECORDING_BAR_COUNT }, () => MIN_BAR_HEIGHT_PX)
  );
  const [micError, setMicError] = useState<string | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingSendRef = useRef(false);
  const lastDurationRef = useRef(0);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  useEffect(() => {
    let cancelled = false;

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        if (typeof MediaRecorder !== 'undefined') {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : '';
          const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          chunksRef.current = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size) chunksRef.current.push(e.data);
          };
          mediaRecorder.onstop = () => {
            if (pendingSendRef.current && chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, {
                type: mediaRecorder.mimeType || 'audio/webm',
              });
              onSendRef.current(lastDurationRef.current, blob);
            }
            pendingSendRef.current = false;
          };
          mediaRecorder.start();
          mediaRecorderRef.current = mediaRecorder;
        }

        const audioContext = new AudioContext();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContextRef.current = audioContext;
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        if (cancelled) return;

        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = MIC_GAIN;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SMOOTHING;
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        const groupSize = Math.floor(bufferLength / RECORDING_BAR_COUNT);

        const updateBars = () => {
          if (cancelled || !analyserRef.current || !dataArrayRef.current) return;
          const buf = dataArrayRef.current;
          analyserRef.current.getByteTimeDomainData(buf as unknown as Uint8Array<ArrayBuffer>);
          const peaks: number[] = [];
          for (let i = 0; i < RECORDING_BAR_COUNT; i++) {
            const start = i * groupSize;
            const end = i === RECORDING_BAR_COUNT - 1 ? bufferLength : start + groupSize;
            let peak = 0;
            for (let j = start; j < end; j++) {
              const amp = Math.abs(dataArrayRef.current[j] - WAVEFORM_CENTRE);
              if (amp > peak) peak = amp;
            }
            peaks.push(peak);
          }
          setBarHeights(peaksToHeights(peaks));
          rafRef.current = requestAnimationFrame(updateBars);
        };

        rafRef.current = requestAnimationFrame(updateBars);
      } catch (err) {
        if (!cancelled) {
          setMicError(err instanceof Error ? err.message : 'Microphone access denied');
        }
      }
    };

    startMic();

    return () => {
      cancelled = true;
      try {
        mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      analyserRef.current = null;
      try {
        audioContextRef.current?.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
      dataArrayRef.current = null;
    };
  }, []);

  const buttonSize = compact ? 'w-[38px] h-[38px]' : 'w-[38px] h-[38px] sm:w-[44px] sm:h-[44px]';
  const iconSize = compact ? 20 : 22;

  return (
    <div
      className="flex items-center gap-2 w-full"
      role="region"
      aria-label={t('voiceNote.recording')}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 min-h-0">
        <div
          className="flex items-center gap-0.5 shrink-0"
          style={{ height: MAX_BAR_HEIGHT_PX }}
          aria-hidden
        >
          {barHeights.map((height, i) => (
            <div
              key={i}
              className="flex items-center justify-center w-1 shrink-0"
              style={{ height: MAX_BAR_HEIGHT_PX }}
            >
              <div
                className="w-1 rounded-full bg-[#135662] transition-[height] duration-75 ease-out"
                style={{ height: `${height}px` }}
              />
            </div>
          ))}
        </div>
        <span className={`font-medium tabular-nums shrink-0 ${compact ? 'text-sm' : 'text-sm sm:text-base'}`} style={{ color: '#1F263D' }}>
          {formatRecordingTime(recordingSeconds)}
        </span>
        {micError && (
          <span className="text-xs shrink-0" style={{ color: '#828282' }} title={micError}>
            ({t('voiceNote.micError')})
          </span>
        )}
      </div>

      <div className={`flex items-center gap-1 sm:gap-2 shrink-0 ${compact ? 'gap-1' : 'gap-1 sm:gap-2'}`}>
        <button
          type="button"
          onClick={() => {
            mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
            onCancel();
          }}
          className={`flex items-center justify-center rounded-full bg-[#E3E3E3] hover:bg-[#d0d0d0] transition-colors cursor-pointer ${buttonSize}`}
          style={{ color: '#1F263D' }}
          aria-label={t('voiceNote.cancel')}
        >
          <FiX size={iconSize} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (disabled || recordingSeconds < 1) return;
            if (mediaRecorderRef.current?.state === 'recording') {
              pendingSendRef.current = true;
              lastDurationRef.current = recordingSeconds;
              mediaRecorderRef.current.stop();
            } else {
              onSend(recordingSeconds, new Blob());
            }
          }}
          disabled={disabled || recordingSeconds < 1}
          className={`flex items-center justify-center rounded-full bg-[#1F263D] text-white hover:bg-[#2a3347] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonSize}`}
          aria-label={t('voiceNote.send')}
        >
          <FiSend size={20} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
