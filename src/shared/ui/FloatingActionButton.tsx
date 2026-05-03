import React, { memo, useCallback } from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface FABProps {
    onPress: () => void;
    icon: React.ReactNode;
    style?: ViewStyle;
    size?: number;
    colors?: [string, string];
}

export const FloatingActionButton = memo<FABProps>(
    ({
        onPress,
        icon,
        style,
        size = 60,
        colors = ['#00d4ff', '#0066cc'],
    }) => {
        const scale = useSharedValue(1);

        const animStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
        }));

        const handlePressIn = useCallback(() => {
            scale.value = withSpring(0.9, { damping: 12 });
        }, [scale]);

        const handlePressOut = useCallback(() => {
            scale.value = withSpring(1, { damping: 10 });
        }, [scale]);

        return (
            <AnimatedTouchable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.fab,
                    { width: size, height: size, borderRadius: size / 2 },
                    animStyle,
                    style,
                ]}
                activeOpacity={1}
            >
                <LinearGradient
                    colors={colors}
                    style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                {icon}
            </AnimatedTouchable>
        );
    }
);

const styles = StyleSheet.create({
    fab: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.neonBlue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 10,
        overflow: 'hidden',
    },
});
