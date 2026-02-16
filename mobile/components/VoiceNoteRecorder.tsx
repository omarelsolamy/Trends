import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';
import { Feather } from '@expo/vector-icons';

const RECORDING_BAR_COUNT = 12;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 24;

interface VoiceNoteRecorderProps {
    recordingSeconds: number;
    onCancel: () => void;
    onSend: (durationSeconds: number, audioUri: string) => void;
    disabled?: boolean;
}

export default function VoiceNoteRecorder({
    recordingSeconds,
    onCancel,
    onSend,
    disabled = false,
}: VoiceNoteRecorderProps) {
    const [barHeights, setBarHeights] = useState<number[]>(
        Array.from({ length: RECORDING_BAR_COUNT }, () => MIN_BAR_HEIGHT)
    );

    const recordingOptions = useMemo(() => ({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
    }), []);

    const recorder = useAudioRecorder(recordingOptions);
    const state = useAudioRecorderState(recorder, 100);

    // Update metering visualization
    useEffect(() => {
        if (state.isRecording && state.metering !== undefined) {
            // metering is in dB, usually -160 to 0
            const level = Math.max(0, (state.metering + 60) / 60); // Normalize -60 to 0 into 0 to 1
            setBarHeights(prev => {
                const next = [...prev.slice(1), MIN_BAR_HEIGHT + level * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT)];
                return next;
            });
        }
    }, [state.metering, state.isRecording]);

    useEffect(() => {
        let isActive = true;

        async function start() {
            const { status } = await getRecordingPermissionsAsync();
            if (status !== 'granted') {
                const { granted } = await requestRecordingPermissionsAsync();
                if (!granted || !isActive) return;
            }

            try {
                await recorder.prepareToRecordAsync();
                if (isActive) {
                    recorder.record();
                }
            } catch (err) {
                console.error('Failed to start recording', err);
            }
        }

        start();

        return () => {
            isActive = false;
        };
    }, [recorder]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSend = async () => {
        if (!state.isRecording || disabled || recordingSeconds < 1) return;

        const uri = recorder.uri;
        await recorder.stop();

        if (uri) {
            onSend(recordingSeconds, uri);
        }
    };

    const handleCancel = async () => {
        if (state.isRecording) {
            await recorder.stop();
        }
        onCancel();
    };

    return (
        <View className="flex-row items-center gap-2 flex-1">
            <View className="flex-1 flex-row items-center gap-2 min-w-0">
                <View className="flex-row items-center gap-[2px]" style={{ height: MAX_BAR_HEIGHT }}>
                    {barHeights.map((h, i) => (
                        <View
                            key={i}
                            style={{
                                height: h,
                                width: 4,
                                backgroundColor: '#135662',
                                borderRadius: 2
                            }}
                        />
                    ))}
                </View>
                <Text
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                    className="text-[#1F263D] tabular-nums text-sm ml-1 shrink-0"
                >
                    {formatTime(recordingSeconds)}
                </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
                <Pressable
                    onPress={handleCancel}
                    className="w-10 h-10 bg-[#E3E3E3] rounded-full items-center justify-center active:bg-gray-200"
                >
                    <Feather name="x" size={22} color="#1F263D" />
                </Pressable>
                <Pressable
                    onPress={handleSend}
                    disabled={disabled || recordingSeconds < 1}
                    className="w-10 h-10 bg-[#1F263D] rounded-full items-center justify-center active:bg-[#2a3347] disabled:opacity-50"
                >
                    <Feather name="send" size={20} color="white" />
                </Pressable>
            </View>
        </View>
    );
}
