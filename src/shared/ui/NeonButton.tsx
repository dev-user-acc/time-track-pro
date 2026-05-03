import React, { memo, useCallback } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, Typography } from '../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface NeonButtonProps {
    onPress: () => void;
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
    neonColor?: string;
}

const VARIANTS = {
    primary: { colors: ['#00d4ff', '#0066cc'] as [string, string], text: '#000' },
    secondary: { colors: ['#8b5cf6', '#6d28d9'] as [string, string], text: '#fff' },
    danger: { colors: ['#ef4444', '#b91c1c'] as [string, string], text: '#fff' },
    ghost: { colors: null, text: Colors.neonBlue },
};

const SIZES = {
    sm: { height: 36, px: Spacing.md, fontSize: 13 },
    md: { height: 48, px: Spacing.xl, fontSize: 15 },
    lg: { height: 56, px: Spacing.xxl, fontSize: 17 },
};

export const NeonButton = memo<NeonButtonProps>(
    ({
        onPress,
        label,
        variant = 'primary',
        size = 'md',
        loading = false,
        disabled = false,
        style,
        textStyle,
        fullWidth = false,
        neonColor,
    }) => {
        const scale = useSharedValue(1);
        const opacity = useSharedValue(1);

        const animStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        }));

        const handlePressIn = useCallback(() => {
            scale.value = withSpring(0.95, { damping: 15 });
            opacity.value = withTiming(0.85, { duration: 80 });
        }, [scale, opacity]);

        const handlePressOut = useCallback(() => {
            scale.value = withSpring(1, { damping: 12 });
            opacity.value = withTiming(1, { duration: 100 });
        }, [scale, opacity]);

        const v = VARIANTS[variant];
        const s = SIZES[size];
        const neon = neonColor ?? Colors.neonBlue;

        const content = loading ? (
            <ActivityIndicator color={v.text} size="small" />
        ) : (
            <Text
                style={[
                    styles.label,
                    { color: v.text, fontSize: s.fontSize },
                    variant === 'ghost' && { color: neon },
                    textStyle,
                ]}
            >
                {label}
            </Text>
        );

        return (
            <AnimatedTouchable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                style={[
                    animStyle,
                    styles.base,
                    { height: s.height, paddingHorizontal: s.px },
                    fullWidth && styles.fullWidth,
                    (disabled || loading) && styles.disabled,
                    variant === 'ghost' && [styles.ghost, { borderColor: neon + '60' }],
                    style,
                ]}
                activeOpacity={1}
            >
                {v.colors ? (
                    <LinearGradient
                        colors={disabled ? ['#333', '#222'] : v.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFill, styles.gradient]}
                    />
                ) : null}
                {content}
            </AnimatedTouchable>
        );
    }
);

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
        shadowColor: Colors.neonBlue,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    ghost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    gradient: {
        borderRadius: BorderRadius.full,
    },
    label: {
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
