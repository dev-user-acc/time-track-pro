import React, { memo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { GlassCard, SkeletonCard } from '../../shared/ui';
import { useDashboard } from '../../features/reports/model/useReports';
import { useTimer } from '../../features/timeTracking/model/useTimeTracking';
import { TimerWidget } from '../../features/timeTracking/ui/TimerWidget';
import { TimeEntryList } from '../../features/timeTracking/ui/TimeEntryList';
import { useAuthStore } from '../../store/authStore';
import { formatHours } from '../../shared/utils/formatTime';
import type { UserRole } from '../../entities/user/model/types';

const { width } = Dimensions.get('window');

const StatCard = memo<{
    label: string;
    value: string;
    color: string;
    delay?: number;
}>(({ label, value, color, delay = 0 }) => {
    const translateY = useSharedValue(30);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withDelay(delay, withSpring(0, { damping: 12 }));
        opacity.value = withDelay(delay, withSpring(1));
    }, [delay, translateY, opacity]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[style, styles.statCard]}>
            <LinearGradient
                colors={[color + '20', color + '05']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={[styles.statAccent, { backgroundColor: color }]} />
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>{label}</Text>
            <Text style={[Typography.h2, { color, marginTop: 4 }]}>{value}</Text>
        </Animated.View>
    );
});

const ROLE_BANNER: Record<UserRole, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; hint: string }> = {
    admin: { icon: 'shield-checkmark-outline', label: 'Администратор', color: Colors.neonPink, hint: 'Управляйте пользователями и проектами во вкладке «Сотрудники»' },
    manager: { icon: 'people-outline', label: 'Менеджер', color: Colors.neonOrange, hint: 'Отслеживайте активность команды во вкладке «Команда»' },
    employee: { icon: 'person-outline', label: 'Сотрудник', color: Colors.neonBlue, hint: 'Запускайте таймер во вкладке «Трекер»' },
};

export const DashboardScreen = memo(() => {
    const user = useAuthStore((s) => s.user);
    const { data, isLoading, refetch } = useDashboard();
    const { activeTimer, isRunning, stop } = useTimer();

    const role = user?.role ?? 'employee';
    const banner = ROLE_BANNER[role];

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Доброе утро';
        if (h < 17) return 'Добрый день';
        return 'Добрый вечер';
    })();

    const handleStop = useCallback(() => { stop(); }, [stop]);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient
                colors={['#05050f', '#08081a']}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={refetch}
                        tintColor={Colors.neonBlue}
                    />
                }
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[Typography.caption]}>{greeting}</Text>
                        <Text style={Typography.h2}>{user?.name ?? 'Пользователь'} 👋</Text>
                    </View>
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? Colors.neonBlue }]}>
                        <Text style={styles.avatarText}>
                            {(user?.name ?? 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Role banner */}
                <View style={[styles.roleBanner, { borderColor: banner.color + '40', backgroundColor: banner.color + '10' }]}>
                    <Ionicons name={banner.icon} size={18} color={banner.color} />
                    <View style={styles.roleBannerText}>
                        <Text style={[Typography.bodySmall, { color: banner.color, fontWeight: '700' }]}>
                            {banner.label}
                        </Text>
                        <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                            {banner.hint}
                        </Text>
                    </View>
                </View>

                {/* Active timer banner */}
                <TimerWidget
                    activeTimer={activeTimer}
                    isRunning={isRunning}
                    onStop={handleStop}
                />

                {/* Stats */}
                {isLoading ? (
                    <View style={styles.statsRow}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                ) : (
                    <View style={styles.statsRow}>
                        <StatCard
                            label="СЕГОДНЯ"
                            value={formatHours(data?.todaySeconds ?? 0)}
                            color={Colors.neonBlue}
                            delay={0}
                        />
                        <StatCard
                            label="НЕДЕЛЯ"
                            value={formatHours(data?.weekSeconds ?? 0)}
                            color={Colors.neonPurple}
                            delay={80}
                        />
                    </View>
                )}

                {/* Active projects summary */}
                {!isLoading && (data?.projects?.length ?? 0) > 0 && (
                    <GlassCard style={styles.section}>
                        <Text style={[Typography.caption, styles.sectionLabel]}>
                            АКТИВНЫЕ ПРОЕКТЫ
                        </Text>
                        {data!.projects
                            .filter((p) => p.status === 'active')
                            .slice(0, 4)
                            .map((p) => (
                                <View key={p.id} style={styles.projectRow}>
                                    <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                                    <Text style={[Typography.body, { flex: 1 }]} numberOfLines={1}>
                                        {p.name}
                                    </Text>
                                    <Text style={[Typography.bodySmall, { color: p.color }]}>
                                        {formatHours(p.totalSeconds)}
                                    </Text>
                                </View>
                            ))}
                    </GlassCard>
                )}

                {/* Recent entries */}
                <View style={styles.section}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>
                        ПОСЛЕДНЯЯ АКТИВНОСТЬ
                    </Text>
                    {isLoading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        <TimeEntryList
                            entries={data?.recentEntries ?? []}
                            showDate
                        />
                    )}
                </View>

                <View style={{ height: Spacing.xxxl }} />
            </ScrollView>
        </SafeAreaView>
    );
});

const statW = (width - Spacing.lg * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    roleBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    roleBannerText: {
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 18,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    statCard: {
        width: statW,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        overflow: 'hidden',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    statAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    section: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        marginBottom: Spacing.md,
    },
    projectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.separator,
    },
    projectDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
