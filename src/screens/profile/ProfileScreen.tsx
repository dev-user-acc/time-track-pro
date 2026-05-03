import React, { memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { GlassCard, Badge } from '../../shared/ui';
import { NeonButton } from '../../shared/ui/NeonButton';
import { useAuthStore } from '../../store/authStore';

const ROLE_COLORS: Record<string, string> = {
    admin: Colors.neonPink,
    manager: Colors.neonOrange,
    employee: Colors.neonBlue,
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Администратор',
    manager: 'Менеджер',
    employee: 'Сотрудник',
};

const InfoRow = memo<{ label: string; value: string }>(({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={Typography.label}>{label}</Text>
        <Text style={[Typography.body, { fontWeight: '600' }]}>{value}</Text>
    </View>
));

export const ProfileScreen = memo(() => {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    const handleLogout = useCallback(() => {
        Alert.alert('Выход', 'Вы уверены, что хотите выйти из аккаунта?', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Выйти', style: 'destructive', onPress: logout },
        ]);
    }, [logout]);

    if (!user) return null;

    const joinDate = new Date(user.createdAt).toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient colors={['#05050f', '#08081a']} style={StyleSheet.absoluteFill} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar + name */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={[user.avatarColor + '30', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    />
                    <View style={[styles.avatarLg, { backgroundColor: user.avatarColor + '30', borderColor: user.avatarColor + '60' }]}>
                        <Text style={[styles.avatarText, { color: user.avatarColor }]}>
                            {user.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={[Typography.h2, styles.userName]}>{user.name}</Text>
                    <Text style={[Typography.bodySmall, styles.userEmail]}>{user.email}</Text>
                    <Badge
                        label={user.role.toUpperCase()}
                        color={ROLE_COLORS[user.role] ?? Colors.neonBlue}
                        style={styles.roleBadge}
                    />
                </View>

                {/* Account info */}
                <GlassCard style={styles.card}>
                    <Text style={[Typography.caption, styles.cardTitle]}>ДАННЫЕ АККАУНТА</Text>
                    <InfoRow label="Имя" value={user.name} />
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Роль" value={ROLE_LABELS[user.role] ?? user.role} />
                    <InfoRow label="С нами с" value={joinDate} />
                </GlassCard>

                {/* App info */}
                <GlassCard style={styles.card}>
                    <Text style={[Typography.caption, styles.cardTitle]}>О ПРИЛОЖЕНИИ</Text>
                    <InfoRow label="Версия" value="1.0.0" />
                    <InfoRow label="Архитектура" value="Feature-based" />
                    <InfoRow label="Фреймворк" value="React Native + Expo" />
                    <InfoRow label="Хранилище" value="SQLite (local)" />
                </GlassCard>

                {/* Sign out */}
                <View style={styles.logoutSection}>
                    <NeonButton
                        onPress={handleLogout}
                        label="Выйти"
                        variant="danger"
                        fullWidth
                    />
                </View>

                <View style={{ height: Spacing.xxxl }} />
            </ScrollView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    heroSection: {
        alignItems: 'center',
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xxl,
        overflow: 'hidden',
    },
    avatarLg: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '900',
    },
    userName: {
        marginBottom: Spacing.xs,
    },
    userEmail: {
        marginBottom: Spacing.md,
    },
    roleBadge: {
        alignSelf: 'center',
    },
    card: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    cardTitle: {
        marginBottom: Spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.separator,
    },
    logoutSection: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
});
