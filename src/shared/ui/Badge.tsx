import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../theme';

interface BadgeProps {
    label: string;
    color?: string;
    style?: ViewStyle;
    size?: 'sm' | 'md';
}

export const Badge = memo<BadgeProps>(
    ({ label, color = Colors.neonBlue, style, size = 'md' }) => (
        <View
            style={[
                styles.badge,
                size === 'sm' && styles.sm,
                { backgroundColor: color + '25', borderColor: color + '50' },
                style,
            ]}
        >
            <Text style={[styles.text, size === 'sm' && styles.textSm, { color }]}>
                {label}
            </Text>
        </View>
    )
);

const styles = StyleSheet.create({
    badge: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    sm: { paddingHorizontal: 6, paddingVertical: 2 },
    text: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
    textSm: { fontSize: 10 },
});
