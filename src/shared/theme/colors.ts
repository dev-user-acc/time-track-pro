export const Colors = {
    background: '#05050f',
    surface: '#0d0d1a',
    card: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',

    neonBlue: '#00d4ff',
    neonPurple: '#8b5cf6',
    neonPink: '#f472b6',
    neonGreen: '#10b981',
    neonOrange: '#f59e0b',

    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.3)',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#00d4ff',

    separator: 'rgba(255, 255, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    white: '#ffffff',
    transparent: 'transparent',

    tabActive: '#00d4ff',
    tabInactive: 'rgba(255, 255, 255, 0.3)',

    projectColors: [
        '#00d4ff',
        '#8b5cf6',
        '#f472b6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#06b6d4',
        '#a855f7',
    ],
} as const;

export type ColorKey = keyof typeof Colors;
