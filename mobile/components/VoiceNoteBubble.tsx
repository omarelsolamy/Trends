import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Feather } from '@expo/vector-icons';

interface VoiceNoteBubbleProps {
    isUser: boolean;
    audioBase64?: string;
    audioUri?: string;
    durationSeconds: number;
    messageId?: string;
    currentPlayingId?: string | null;
    onPlay?: (id: string) => void;
}

const WAVEFORM_BAR_COUNT = 35;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 16;

export default function VoiceNoteBubble({
    isUser,
    audioBase64,
    audioUri,
    durationSeconds,
    messageId,
    currentPlayingId,
    onPlay,
}: VoiceNoteBubbleProps) {
    const playerSource = useMemo(() => {
        if (audioUri) return { uri: audioUri };
        if (audioBase64) return { uri: `data:audio/mp3;base64,${audioBase64}` };
        return null;
    }, [audioBase64, audioUri]);

    const player = useAudioPlayer(playerSource);
    const status = useAudioPlayerStatus(player);

    const isPlaying = status.playing;
    const isLoading = !status.isLoaded;
    const position = status.currentTime * 1000;
    const duration = (status.duration || durationSeconds) * 1000;

    // Handle automatic reset when audio finishes
    useEffect(() => {
        if (status.didJustFinish) {
            player.pause();
            player.seekTo(0);
        }
    }, [status.didJustFinish]);

    useEffect(() => {
        if (currentPlayingId && messageId && currentPlayingId !== messageId && isPlaying) {
            player.pause();
        }
    }, [currentPlayingId, messageId, isPlaying]);

    async function handlePlayPause() {
        if (isPlaying) {
            player.pause();
        } else {
            // Explicitly seek to 0 if we're at the end (for robustness)
            if (status.currentTime >= (status.duration || durationSeconds)) {
                player.seekTo(0);
            }
            if (onPlay && messageId) onPlay(messageId);
            player.play();
        }
    }

    const formatTime = (millis: number) => {
        const totalSeconds = millis / 1000;
        const m = Math.floor(totalSeconds / 60);
        const s = Math.floor(totalSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const barColor = isUser ? 'rgba(255,255,255,0.8)' : '#135662';
    const progress = duration > 0 ? position / duration : 0;

    const [width, setWidth] = useState(0);

    const handleSeek = (locationX: number) => {
        const totalDuration = status.duration || durationSeconds;
        if (width > 0 && totalDuration > 0) {
            const percentage = Math.max(0, Math.min(1, locationX / width));
            player.seekTo(percentage * totalDuration);
        }
    };

    return (
        <View className="flex-row items-center justify-between w-full">
            <Pressable
                onPress={handlePlayPause}
                style={{ width: 34, height: 34 }}
                className={`rounded-full items-center justify-center shrink-0 ${isUser ? 'active:bg-white/10' : 'active:bg-black/5'}`}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isUser ? 'white' : '#135662'} />
                ) : (
                    <Feather
                        name={isPlaying ? "pause" : "play"}
                        size={18}
                        color={isUser ? 'white' : '#135662'}
                        style={!isPlaying ? { marginLeft: 2 } : {}}
                    />
                )}
            </Pressable>

            <View
                className="flex-row items-center gap-[1.5px] flex-1 justify-center mx-2"
                style={{ height: MAX_BAR_HEIGHT }}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => handleSeek(e.nativeEvent.locationX)}
                onResponderMove={(e) => handleSeek(e.nativeEvent.locationX)}
            >
                {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => {
                    const t = Math.sin(i * 0.7) * 0.5 + 0.5;
                    const h = MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
                    const isFilled = (i / WAVEFORM_BAR_COUNT) < progress;
                    return (
                        <View
                            key={i}
                            style={{
                                height: h,
                                width: 3.5,
                                backgroundColor: barColor,
                                borderRadius: 1.5,
                                opacity: isFilled ? 1 : 0.35,
                            }}
                            className="shrink-0"
                        />
                    );
                })}
            </View>

            <Text
                style={{ fontFamily: 'Cairo_400Regular' }}
                className={`tabular-nums text-[10px] shrink-0 ${isUser ? 'text-white/80' : 'text-[#828282]'}`}
            >
                {formatTime(position)} / {formatTime(duration)}
            </Text>
        </View>
    );
}
