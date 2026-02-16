import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';

interface TypingIndicatorProps {
    isRTL?: boolean;
}

export default function TypingIndicator({ isRTL = false }: TypingIndicatorProps) {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (value: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(value, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.delay(1400 - 800 - delay),
                ])
            );
        };

        Animated.parallel([
            animate(dot1, 0),
            animate(dot2, 200),
            animate(dot3, 400),
        ]).start();
    }, []);

    const getStyle = (value: Animated.Value) => ({
        transform: [
            {
                translateY: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -6],
                }),
            },
        ],
    });

    const Avatar = () => (
        <View style={styles.avatarContainer}>
            <Image
                source={require('@/assets/images/logo-round.png')}
                style={styles.avatar}
                contentFit="contain"
            />
        </View>
    );

    const containerJustify = isRTL ? styles.justifyStart : styles.justifyEnd;

    return (
        <View style={[styles.container, containerJustify]}>
            {isRTL ? (
                <>
                    <Avatar />
                    <View style={[styles.dotsContainer, styles.rtlDots]}>
                        <Animated.View style={[styles.dot, getStyle(dot3)]} />
                        <Animated.View style={[styles.dot, getStyle(dot2)]} />
                        <Animated.View style={[styles.dot, getStyle(dot1)]} />
                    </View>
                </>
            ) : (
                <>
                    <View style={[styles.dotsContainer, styles.ltrDots]}>
                        <Animated.View style={[styles.dot, getStyle(dot1)]} />
                        <Animated.View style={[styles.dot, getStyle(dot2)]} />
                        <Animated.View style={[styles.dot, getStyle(dot3)]} />
                    </View>
                    <Avatar />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    justifyEnd: {
        justifyContent: 'flex-end',
    },
    justifyStart: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 42,
        height: 42,
    },
    avatar: {
        width: 42,
        height: 42,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
    },
    ltrDots: {
        marginRight: 12,
    },
    rtlDots: {
        marginLeft: 12,
    },
    dot: {
        width: 8,
        height: 8,
        backgroundColor: '#828282',
        borderRadius: 4,
        marginHorizontal: 3,
    },
});
