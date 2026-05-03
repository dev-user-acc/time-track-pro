import React, { memo, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    FlatList,
    ListRenderItemInfo,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { GlassCard } from '../../shared/ui';
import { userRepository } from '../../services/repositories/userRepository';
import { timeEntryRepository } from '../../services/repositories/timeEntryRepository';
import { formatHours } from '../../shared/utils/formatTime';
import { formatDateShort } from '../../shared/utils/dateUtils';
import type { User } from '../../entities/user/model/types';
import type { TimeEntry } from '../../entities/timeEntry/model/types';

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

interface TeamMemberRowProps {
    user: User;
    totalSeconds: number;
    entryCount: number;
}

const TeamMemberRow = memo<TeamMemberRowProps>(({ user, totalSeconds, entryCount }) => (
    <View style={styles.memberRow}>
        <View style={[styles.memberAvatar, { backgroundColor: user.avatarColor + '30', borderColor: user.avatarColor + '60' }]}>
            <Text style={[styles.memberAvatarText, { color: user.avatarColor }]}>
                {user.name.charAt(0).toUpperCase()}
            </Text>
        </View>
        <View style={styles.memberInfo}>
            <Text style={[Typography.body, { fontWeight: '600' }]} numberOfLines={1}>{user.name}</Text>
            <Text style={[Typography.caption, { color: ROLE_COLORS[user.role] ?? Colors.textMuted }]}>
                {ROLE_LABELS[user.role] ?? user.role}
            </Text>
        </View>
        <View style={styles.memberStats}>
            <Text style={[Typography.body, { color: Colors.neonBlue, fontWeight: '700' }]}>
                {formatHours(totalSeconds)}
            </Text>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                {entryCount} записей
            </Text>
        </View>
    </View>
));

interface ActivityItemProps {
    entry: TimeEntry;
    userName: string;
}

const ActivityItem = memo<ActivityItemProps>(({ entry, userName }) => (
    <View style={styles.activityItem}>
        <View style={[styles.activityBar, { backgroundColor: entry.projectColor }]} />
        <View style={styles.activityContent}>
            <View style={styles.activityHeader}>
                <Text style={[Typography.bodySmall, { fontWeight: '600' }]} numberOfLines={1}>
                    {entry.projectName}
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.neonBlue, fontWeight: '700' }]}>
                    {formatHours(entry.durationSeconds)}
                </Text>
            </View>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                {userName} • {formatDateShort(entry.startTime)}
            </Text>
        </View>
    </View>
));

export const ManagerTeamScreen = memo(() => {
    const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['team_users'],
        queryFn: () => userRepository.getAll(),
    });

    const { data: teamStatsArr = [], isLoading: statsLoading } = useQuery({
        queryKey: ['team_entry_stats'],
        queryFn: () => timeEntryRepository.getTeamStats(),
        enabled: users.length > 0,
    });

    const { data: recentEntries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
        queryKey: ['team_recent_entries'],
        queryFn: () => timeEntryRepository.getAllUsersEntries(30),
    });

    const isLoading = usersLoading || statsLoading || entriesLoading;

    const handleRefresh = useCallback(() => {
        refetchUsers();
        refetchEntries();
    }, [refetchUsers, refetchEntries]);

    const statsMap = useMemo(() => {
        const map: Record<string, { totalSeconds: number; entryCount: number }> = {};
        for (const s of teamStatsArr) {
            map[s.userId] = { totalSeconds: s.totalSeconds, entryCount: s.entryCount };
        }
        return map;
    }, [teamStatsArr]);

    const userMap = useMemo(() => {
        const map: Record<string, User> = {};
        for (const u of users) { map[u.id] = u; }
        return map;
    }, [users]);

    const teamEmployees = useMemo(
        () => users.filter((u) => u.role === 'employee'),
        [users]
    );

    const totalTeamSeconds = useMemo(
        () => teamStatsArr.reduce((acc, s) => acc + s.totalSeconds, 0),
        [teamStatsArr]
    );

    const renderMember = useCallback(({ item }: ListRenderItemInfo<User>) => {
        const s = statsMap[item.id];
        return (
            <TeamMemberRow
                user={item}
                totalSeconds={s?.totalSeconds ?? 0}
                entryCount={s?.entryCount ?? 0}
            />
        );
    }, [statsMap]);

    const renderActivity = useCallback(({ item }: ListRenderItemInfo<TimeEntry>) => (
        <ActivityItem
            entry={item}
            userName={userMap[item.userId]?.name ?? 'Неизвестен'}
        />
    ), [userMap]);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient colors={['#05050f', '#08081a']} style={StyleSheet.absoluteFill} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.neonBlue} />
                }
            >
                <View style={styles.pageHeader}>
                    <Text style={Typography.h2}>Команда</Text>
                    <Text style={Typography.bodySmall}>
                        {teamEmployees.length} сотрудников • {users.length} всего в системе
                    </Text>
                </View>

                {/* Summary Stats */}
                <View style={styles.statsRow}>
                    <GlassCard style={styles.statCard} gradient={[Colors.neonBlue + '20', Colors.neonBlue + '05']}>
                        <Ionicons name="people-outline" size={22} color={Colors.neonBlue} style={{ marginBottom: 4 }} />
                        <Text style={[Typography.h2, { color: Colors.neonBlue }]}>{users.length}</Text>
                        <Text style={[Typography.caption, { color: Colors.textMuted }]}>Пользователей</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard} gradient={[Colors.neonPurple + '20', Colors.neonPurple + '05']}>
                        <Ionicons name="time-outline" size={22} color={Colors.neonPurple} style={{ marginBottom: 4 }} />
                        <Text style={[Typography.h2, { color: Colors.neonPurple }]}>
                            {formatHours(totalTeamSeconds)}
                        </Text>
                        <Text style={[Typography.caption, { color: Colors.textMuted }]}>Суммарно</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard} gradient={[Colors.neonGreen + '20', Colors.neonGreen + '05']}>
                        <Ionicons name="bar-chart-outline" size={22} color={Colors.neonGreen} style={{ marginBottom: 4 }} />
                        <Text style={[Typography.h2, { color: Colors.neonGreen }]}>{recentEntries.length}</Text>
                        <Text style={[Typography.caption, { color: Colors.textMuted }]}>Записей</Text>
                    </GlassCard>
                </View>

                {/* Team members */}
                <GlassCard style={styles.section}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>УЧАСТНИКИ КОМАНДЫ</Text>
                    {usersLoading ? (
                        <ActivityIndicator color={Colors.neonBlue} />
                    ) : users.length === 0 ? (
                        <Text style={[Typography.bodySmall, { textAlign: 'center', padding: Spacing.lg }]}>
                            Нет пользователей
                        </Text>
                    ) : (
                        <FlatList
                            data={users}
                            renderItem={renderMember}
                            keyExtractor={(u) => u.id}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    )}
                </GlassCard>

                {/* Recent team activity */}
                <View style={styles.activitySection}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>ПОСЛЕДНЯЯ АКТИВНОСТЬ</Text>
                    {entriesLoading ? (
                        <ActivityIndicator color={Colors.neonBlue} style={{ marginTop: Spacing.lg }} />
                    ) : recentEntries.length === 0 ? (
                        <Text style={[Typography.bodySmall, { textAlign: 'center', padding: Spacing.lg, color: Colors.textMuted }]}>
                            Ещё нет активности в команде
                        </Text>
                    ) : (
                        <FlatList
                            data={recentEntries}
                            renderItem={renderActivity}
                            keyExtractor={(e) => e.id}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                <View style={{ height: Spacing.xxxl }} />
            </ScrollView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    pageHeader: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    section: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    sectionLabel: {
        color: Colors.textMuted,
        marginBottom: Spacing.md,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.separator,
        marginVertical: Spacing.sm,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    memberAvatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    memberInfo: {
        flex: 1,
    },
    memberStats: {
        alignItems: 'flex-end',
    },
    activitySection: {
        paddingHorizontal: Spacing.lg,
    },
    activityItem: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    activityBar: {
        width: 3,
        alignSelf: 'stretch',
    },
    activityContent: {
        flex: 1,
        padding: Spacing.md,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
});
