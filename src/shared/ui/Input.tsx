import React, { memo } from 'react';
import {
    TextInput,
    Text,
    View,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    leftIcon?: React.ReactNode;
}

export const Input = memo<InputProps>(
    ({ label, error, containerStyle, leftIcon, style, ...rest }) => (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[Typography.label, styles.label]}>{label}</Text>}
            <View style={[styles.inputRow, error ? styles.inputError : null]}>
                {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
                <TextInput
                    style={[styles.input, leftIcon ? styles.inputWithIcon : null, style]}
                    placeholderTextColor={Colors.textMuted}
                    selectionColor={Colors.neonBlue}
                    {...rest}
                />
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    )
);

const styles = StyleSheet.create({
    container: { marginBottom: Spacing.lg },
    label: { marginBottom: Spacing.xs },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    inputError: { borderColor: Colors.error },
    icon: { paddingLeft: Spacing.md },
    input: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: 15,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    inputWithIcon: { paddingLeft: Spacing.sm },
    error: { color: Colors.error, fontSize: 12, marginTop: 4 },
});
