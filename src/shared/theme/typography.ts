import { StyleSheet } from 'react-native';
import { Colors } from './colors';
import { moderateScale } from '../utils/responsive';

export const Typography = StyleSheet.create({
    h1: {
        fontSize: moderateScale(32, 0.35),
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: moderateScale(24, 0.35),
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    h3: {
        fontSize: moderateScale(20, 0.35),
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    h4: {
        fontSize: moderateScale(17, 0.35),
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    body: {
        fontSize: moderateScale(15, 0.35),
        fontWeight: '400',
        color: Colors.textPrimary,
    },
    bodySmall: {
        fontSize: moderateScale(13, 0.35),
        fontWeight: '400',
        color: Colors.textSecondary,
    },
    caption: {
        fontSize: moderateScale(11, 0.35),
        fontWeight: '600',
        color: Colors.textMuted,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    label: {
        fontSize: moderateScale(14, 0.35),
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    mono: {
        fontSize: moderateScale(28, 0.35),
        fontWeight: '700',
        color: Colors.neonBlue,
        letterSpacing: 2,
    },
});
