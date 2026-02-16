import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Feather } from '@expo/vector-icons';

interface AssistantAudioPlayerProps {
    audioBase64: string;
    autoPlay?: boolean;
    isRTL?: boolean;
    messageId?: string;
    currentPlayingId?: string | null;
    onPlay?: (id: string) => void;
}

const WAVEFORM_BAR_COUNT = 35;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 16;

function getBarHeights(seed: number): number[] {
    const heights: number[] = [];
    for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
        const t = Math.sin(seed + i * 0.7) * 0.5 + 0.5;
        heights.push(MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
    }
    return heights;
}

export default function AssistantAudioPlayer({
    audioBase64,
    autoPlay = false,
    isRTL = false,
    messageId,
    currentPlayingId,
    onPlay,
}: AssistantAudioPlayerProps) {
    const playerSource = useMemo(() => ({
        uri: `data:audio/mp3;base64,${audioBase64}`,
    }), [audioBase64]);

    const player = useAudioPlayer(playerSource);
    const status = useAudioPlayerStatus(player);
    const isPlaying = status.playing; // Moved up
    const playedOnceRef = useRef(false);

    useEffect(() => {
        if (autoPlay && !playedOnceRef.current && status.isLoaded) {
            player.play();
            playedOnceRef.current = true;
            if (onPlay && messageId) onPlay(messageId);
        }
    }, [status.isLoaded, autoPlay, messageId, onPlay]); // Added deps

    useEffect(() => {
        if (currentPlayingId && messageId && currentPlayingId !== messageId && isPlaying) {
            player.pause();
        }
    }, [currentPlayingId, messageId, isPlaying]);

    useEffect(() => {
        if (currentPlayingId && messageId && currentPlayingId !== messageId && isPlaying) {
            player.pause();
        }
    }, [currentPlayingId, messageId, isPlaying]);

    // Handle automatic reset when audio finishes
    useEffect(() => {
        if (status.didJustFinish) {
            player.pause();
            player.seekTo(0);
        }
    }, [status.didJustFinish]);

    // const isPlaying = status.playing; // Moved up
    const isLoading = !status.isLoaded;
    const position = status.currentTime * 1000;
    const duration = status.duration * 1000;

    const formatTime = (millis: number) => {
        const totalSeconds = millis / 1000;
        const m = Math.floor(totalSeconds / 60);
        const s = Math.floor(totalSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const seed = useMemo(() => {
        return audioBase64.slice(-10).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    }, [audioBase64]);

    const barHeights = getBarHeights(seed);
    const progress = duration > 0 ? position / duration : 0;

    const cornerRadius = isRTL ? 'rounded-tl-none' : 'rounded-tr-none';

    const [width, setWidth] = React.useState(0);

    const handleSeek = (locationX: number) => {
        if (width > 0 && status.isLoaded && status.duration > 0) {
            const percentage = Math.max(0, Math.min(1, locationX / width));
            player.seekTo(percentage * status.duration);
        }
    };

    return (
        <View className={`flex-row items-center justify-between bg-gray-100 rounded-2xl ${cornerRadius} py-2 px-4 border border-gray-100 shadow-sm w-full`}>
            <Pressable
                onPress={() => {
                    if (isPlaying) {
                        player.pause();
                    } else {
                        if (onPlay && messageId) onPlay(messageId);
                        player.play();
                    }
                }}
                style={{ width: 34, height: 34 }}
                className="rounded-full items-center justify-center shrink-0 active:bg-black/5"
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#135662" />
                ) : (
                    <Feather
                        name={isPlaying ? "pause" : "play"}
                        size={18}
                        color="#135662"
                        // style={!isPlaying ? { marginLeft: 2 } : {}}
                        style={!isPlaying && !isRTL ? { marginLeft: 2 } : {}}
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
                {barHeights.map((h, i) => {
                    const isFilled = (i / WAVEFORM_BAR_COUNT) < progress;
                    return (
                        <View
                            key={i}
                            style={{
                                height: h,
                                width: 3.5,
                                backgroundColor: '#135662',
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
                className="tabular-nums text-[10px] text-[#828282] shrink-0"
            >
                {formatTime(position)} / {formatTime(duration)}
            </Text>
        </View>
    );
}
