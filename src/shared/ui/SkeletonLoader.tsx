import React, { memo, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolateColor,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '../theme';

interface SkeletonBlockProps {
    width: number | string;
    height: number;
    radius?: number;
    style?: ViewStyle;
}

export const SkeletonBlock = memo<SkeletonBlockProps>(
    ({ width, height, radius = BorderRadius.md, style }) => {
        const progress = useSharedValue(0);

        useEffect(() => {
            progress.value = withRepeat(
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            );
        }, [progress]);

        const animStyle = useAnimatedStyle(() => {
            const bg = interpolateColor(
                progress.value,
                [0, 1],
                ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.10)']
            );
            return { backgroundColor: bg };
        });

        return (
            <Animated.View
                style={[
                    {
                        width: width as number,
                        height,
                        borderRadius: radius,
                    },
                    animStyle,
                    style,
                ]}
            />
        );
    }
);

export const SkeletonCard = memo(() => (
    <View style={skStyles.card}>
        <View style={skStyles.row}>
            <SkeletonBlock width={40} height={40} radius={20} />
            <View style={skStyles.col}>
                <SkeletonBlock width={120} height={14} />
                <SkeletonBlock width={80} height={10} style={skStyles.mt4} />
            </View>
        </View>
        <SkeletonBlock width="100%" height={12} style={skStyles.mt12} />
        <SkeletonBlock width="70%" height={12} style={skStyles.mt6} />
    </View>
));

const skStyles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.xl,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        marginBottom: 12,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    col: { flex: 1, marginLeft: 12 },
    mt4: { marginTop: 4 },
    mt6: { marginTop: 6 },
    mt12: { marginTop: 12 },
});
