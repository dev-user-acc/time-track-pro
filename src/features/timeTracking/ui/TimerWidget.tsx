import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSpring,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/formatTime';
import { ActiveTimer } from '../../../entities/timeEntry/model/types';
import { isSmallDevice, moderateScale } from '../../../shared/utils/responsive';

interface TimerWidgetProps {
    activeTimer: ActiveTimer | null;
    isRunning: boolean;
    onStop: () => void;
}

export const TimerWidget = memo<TimerWidgetProps>(
    ({ activeTimer, isRunning, onStop }) => {
        const pulse = useSharedValue(0);
        const scale = useSharedValue(0.8);

        useEffect(() => {
            if (isRunning) {
                scale.value = withSpring(1, { damping: 10 });
                pulse.value = withRepeat(
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
                    -1,
                    true
                );
            } else {
                pulse.value = withTiming(0);
                scale.value = withSpring(0.8);
            }
        }, [isRunning, pulse, scale]);

        const pulseStyle = useAnimatedStyle(() => ({
            opacity: interpolate(pulse.value, [0, 1], [0.3, 0.8]),
            transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
        }));

        const containerStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
        }));

        if (!isRunning || !activeTimer) return null;

        return (
            <Animated.View style={[styles.container, containerStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.glow, pulseStyle]}>
                    <LinearGradient
                        colors={[activeTimer.projectColor + '30', activeTimer.projectColor + '08']}
                        style={styles.glowGradient}
                    />
                </Animated.View>
                <View style={styles.content}>
                    <View style={[styles.dot, { backgroundColor: activeTimer.projectColor }]} />
                    <View style={styles.info}>
                        <Text style={[Typography.caption, { color: Colors.textMuted }]}>В РАБОТЕ</Text>
                        <Text style={[Typography.h4, styles.projectName]} numberOfLines={1}>
                            {activeTimer.projectName}
                        </Text>
                        {activeTimer.description ? (
                            <Text style={[Typography.bodySmall, styles.desc]} numberOfLines={1}>
                                {activeTimer.description}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={[Typography.mono, { color: activeTimer.projectColor }]}>
                        {formatDuration(activeTimer.elapsedSeconds)}
                    </Text>
                    <TouchableOpacity onPress={onStop} style={styles.stopBtn} hitSlop={8}>
                        <View style={[styles.stopIcon, { borderColor: Colors.error }]} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        backgroundColor: Colors.card,
    },
    glow: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    glowGradient: {
        flex: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    info: {
        flex: 1,
    },
    projectName: {
        fontSize: moderateScale(14, 0.35),
        fontWeight: '600',
    },
    desc: {
        marginTop: 1,
        fontSize: moderateScale(11, 0.35),
    },
    stopBtn: {
        width: isSmallDevice ? 28 : 32,
        height: isSmallDevice ? 28 : 32,
        borderRadius: isSmallDevice ? 14 : 16,
        backgroundColor: Colors.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopIcon: {
        width: 12,
        height: 12,
        borderRadius: 2,
        borderWidth: 2,
    },
});
