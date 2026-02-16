import React from 'react';
import { View, Modal, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';

interface InfographModalProps {
    visible: boolean;
    onClose: () => void;
    imageBase64: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function InfographModal({ visible, onClose, imageBase64 }: InfographModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/90 items-center justify-center p-4">
                <Pressable
                    onPress={onClose}
                    className="absolute top-12 right-6 z-10 w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                >
                    <Text style={{ color: 'white', fontSize: 24 }}>✕</Text>
                </Pressable>

                <Image
                    source={{ uri: `data:image/png;base64,${imageBase64}` }}
                    style={{ width: SCREEN_WIDTH - 40, height: SCREEN_HEIGHT * 0.7 }}
                    contentFit="contain"
                />
            </View>
        </Modal>
    );
}
