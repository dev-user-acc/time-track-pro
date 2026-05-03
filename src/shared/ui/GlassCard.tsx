import React, { memo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing } from '../theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'neon' | 'elevated';
    neonColor?: string;
    padding?: number;
    gradient?: [string, string];
}

export const GlassCard = memo<GlassCardProps>(
    ({ children, style, variant = 'default', neonColor, padding, gradient }) => {
        const neon = neonColor ?? Colors.neonBlue;
        const extraStyle: ViewStyle =
            variant === 'neon'
                ? { borderColor: neon + '40', shadowColor: neon, shadowOpacity: 0.3 }
                : variant === 'elevated'
                    ? { borderColor: Colors.cardBorder, shadowOpacity: 0.5 }
                    : {};

        return (
            <View style={[styles.wrapper, extraStyle, style]}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                {gradient && (
                    <LinearGradient
                        colors={gradient}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )}
                <View style={[styles.inner, padding !== undefined ? { padding } : {}]}>
                    {children}
                </View>
            </View>
        );
    }
);

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    inner: {
        padding: Spacing.lg,
    },
});
