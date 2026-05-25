import React, { memo, useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Modal,
    Alert,
    FlatList,
    ListRenderItemInfo,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { GlassCard, Badge } from '../../shared/ui';
import { userRepository } from '../../services/repositories/userRepository';
import { timeEntryRepository } from '../../services/repositories/timeEntryRepository';
import { useAuthStore } from '../../store/authStore';
import { formatDuration, formatHours } from '../../shared/utils/formatTime';
import { formatDateShort } from '../../shared/utils/dateUtils';
import type { User, UserRole } from '../../entities/user/model/types';
import type { TimeEntry } from '../../entities/timeEntry/model/types';
import { getMapsUrl, resolveEntryLocation } from '../../shared/utils/location';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: string; description: string }> = {
    admin: {
        label: 'Администратор',
        color: Colors.neonPink,
        icon: '👑',
        description: 'Полный доступ: управление пользователями, проектами, отчётами',
    },
    manager: {
        label: 'Менеджер',
        color: Colors.neonOrange,
        icon: '🏆',
        description: 'Управление проектами и командой, просмотр командных отчётов',
    },
    employee: {
        label: 'Сотрудник',
        color: Colors.neonBlue,
        icon: '👤',
        description: 'Трекинг времени, просмотр проектов и личных отчётов',
    },
};

interface UserCardProps {
    user: User;
    totalSeconds: number;
    projectCount: number;
    currentUserId: string;
    onChangeRole: (user: User) => void;
}

const UserCard = memo<UserCardProps>(({ user, totalSeconds, projectCount, currentUserId, onChangeRole }) => {
    const cfg = ROLE_CONFIG[user.role];
    const isMe = user.id === currentUserId;

    return (
        <GlassCard style={styles.userCard}>
            <View style={styles.userCardRow}>
                <View style={[styles.avatar, { backgroundColor: user.avatarColor + '30', borderColor: user.avatarColor + '60' }]}>
                    <Text style={[styles.avatarText, { color: user.avatarColor }]}>
                        {user.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[Typography.body, styles.userName]} numberOfLines={1}>
                            {user.name} {isMe ? '(Вы)' : ''}
                        </Text>
                        <Badge label={cfg.label} color={cfg.color} />
                    </View>
                    <Text style={[Typography.bodySmall, styles.email]} numberOfLines={1}>{user.email}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Ionicons name="time-outline" size={12} color={Colors.neonBlue} />
                            <Text style={[Typography.caption, { color: Colors.neonBlue, marginLeft: 4 }]}>
                                {formatHours(totalSeconds)}
                            </Text>
                        </View>
                        <View style={styles.statChip}>
                            <Ionicons name="folder-outline" size={12} color={Colors.neonPurple} />
                            <Text style={[Typography.caption, { color: Colors.neonPurple, marginLeft: 4 }]}>
                                {projectCount} проектов
                            </Text>
                        </View>
                    </View>
                </View>
                {!isMe && (
                    <TouchableOpacity
                        onPress={() => onChangeRole(user)}
                        style={styles.editBtn}
                        hitSlop={8}
                    >
                        <Ionicons name="create-outline" size={20} color={Colors.neonBlue} />
                    </TouchableOpacity>
                )}
            </View>
        </GlassCard>
    );
});

interface RolePickerModalProps {
    user: User | null;
    visible: boolean;
    onClose: () => void;
    onSelect: (role: UserRole) => void;
    isPending: boolean;
}

const RolePickerModal = memo<RolePickerModalProps>(({ user, visible, onClose, onSelect, isPending }) => {
    if (!user) return null;
    const roles: UserRole[] = ['admin', 'manager', 'employee'];
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                        <Text style={Typography.h3}>Изменить роль</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <Ionicons name="close" size={22} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[Typography.bodySmall, styles.modalSubtitle]}>
                        Пользователь: <Text style={{ color: Colors.neonBlue }}>{user.name}</Text>
                    </Text>
                    {roles.map((role) => {
                        const cfg = ROLE_CONFIG[role];
                        const isSelected = user.role === role;
                        return (
                            <TouchableOpacity
                                key={role}
                                onPress={() => !isPending && onSelect(role)}
                                style={[
                                    styles.roleOption,
                                    isSelected && { borderColor: cfg.color, backgroundColor: cfg.color + '15' },
                                ]}
                                disabled={isPending}
                            >
                                <Text style={styles.roleIcon}>{cfg.icon}</Text>
                                <View style={styles.roleText}>
                                    <Text style={[Typography.body, { color: isSelected ? cfg.color : Colors.textPrimary, fontWeight: '600' }]}>
                                        {cfg.label}
                                    </Text>
                                    <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                                        {cfg.description}
                                    </Text>
                                </View>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={20} color={cfg.color} />
                                )}
                                {isPending && isSelected && <ActivityIndicator size="small" color={cfg.color} style={{ marginLeft: 8 }} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </Modal>
    );
});

export const AdminUsersScreen = memo(() => {
    const currentUser = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showRolePicker, setShowRolePicker] = useState(false);

    const { data: users = [], isLoading, refetch } = useQuery({
        queryKey: ['admin_users'],
        queryFn: () => userRepository.getAll(),
    });

    const { data: teamStats = [] } = useQuery({
        queryKey: ['team_stats'],
        queryFn: async () => {
            const stats: Record<string, { totalSeconds: number; projectCount: number }> = {};
            for (const u of users) {
                stats[u.id] = await userRepository.getUserStats(u.id);
            }
            return stats;
        },
        enabled: users.length > 0,
    });

    const { data: recentEntries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
        queryKey: ['admin_recent_entries'],
        queryFn: () => timeEntryRepository.getAllUsersEntries(40),
    });

    const { mutate: updateRole, isPending } = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
            userRepository.updateRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
            setShowRolePicker(false);
            setSelectedUser(null);
            Alert.alert('Готово', 'Роль пользователя обновлена');
        },
        onError: (err: Error) => Alert.alert('Ошибка', err.message),
    });

    const handleChangeRole = useCallback((user: User) => {
        setSelectedUser(user);
        setShowRolePicker(true);
    }, []);

    const handleRoleSelect = useCallback((role: UserRole) => {
        if (!selectedUser) return;
        if (role === selectedUser.role) {
            setShowRolePicker(false);
            return;
        }
        updateRole({ userId: selectedUser.id, role });
    }, [selectedUser, updateRole]);

    const roleCounts = users.reduce<Record<UserRole, number>>(
        (acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; },
        { admin: 0, manager: 0, employee: 0 }
    );

    const usersById = useMemo(() => {
        const map: Record<string, User> = {};
        for (const user of users) {
            map[user.id] = user;
        }
        return map;
    }, [users]);

    const handleRefresh = useCallback(() => {
        refetch();
        refetchEntries();
    }, [refetch, refetchEntries]);

    const openInMaps = useCallback(async (entry: TimeEntry) => {
        const location = resolveEntryLocation(entry);
        const url = getMapsUrl(location.latitude, location.longitude, location.label);

        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert('Карты недоступны', 'Не удалось открыть ссылку карт на этом устройстве.');
                return;
            }
            await Linking.openURL(url);
        } catch {
            Alert.alert('Ошибка', 'Не удалось открыть локацию в картах.');
        }
    }, []);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<User>) => {
        const stats = (teamStats as Record<string, { totalSeconds: number; projectCount: number }>)[item.id];
        return (
            <UserCard
                user={item}
                totalSeconds={stats?.totalSeconds ?? 0}
                projectCount={stats?.projectCount ?? 0}
                currentUserId={currentUser?.id ?? ''}
                onChangeRole={handleChangeRole}
            />
        );
    }, [teamStats, currentUser, handleChangeRole]);

    const renderWorkItem = useCallback(({ item }: ListRenderItemInfo<TimeEntry>) => {
        const worker = usersById[item.userId];
        const location = resolveEntryLocation(item);

        return (
            <GlassCard style={styles.workItem}>
                <View style={styles.workHeader}>
                    <Text style={[Typography.bodySmall, styles.workProject]} numberOfLines={1}>
                        {item.projectName}
                    </Text>
                    <Text style={[Typography.bodySmall, { color: Colors.neonBlue, fontWeight: '700' }]}>
                        {formatDuration(item.durationSeconds)}
                    </Text>
                </View>

                <Text style={[Typography.caption, styles.workMeta]} numberOfLines={2}>
                    {worker?.name ?? 'Неизвестный сотрудник'} • {formatDateShort(item.startTime)}
                </Text>
                <Text style={[Typography.caption, styles.workMeta]} numberOfLines={2}>
                    Локация: {location.label}, {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </Text>

                <TouchableOpacity onPress={() => openInMaps(item)} style={styles.mapBtn}>
                    <Ionicons name="map-outline" size={14} color={Colors.neonBlue} />
                    <Text style={[Typography.caption, { color: Colors.neonBlue }]}>Открыть в картах</Text>
                </TouchableOpacity>
            </GlassCard>
        );
    }, [usersById, openInMaps]);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient colors={['#05050f', '#08081a']} style={StyleSheet.absoluteFill} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading || entriesLoading} onRefresh={handleRefresh} tintColor={Colors.neonBlue} />
                }
            >
                <View style={styles.pageHeader}>
                    <Text style={Typography.h2}>Пользователи</Text>
                    <Text style={Typography.bodySmall}>{users.length} аккаунтов в системе</Text>
                </View>

                {/* Role summary */}
                <View style={styles.summaryRow}>
                    {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
                        <GlassCard key={role} style={styles.summaryCard} gradient={[cfg.color + '20', cfg.color + '05']}>
                            <Text style={styles.summaryIcon}>{cfg.icon}</Text>
                            <Text style={[Typography.h3, { color: cfg.color }]}>{roleCounts[role]}</Text>
                            <Text style={[Typography.caption, { color: Colors.textMuted, textAlign: 'center' }]}>
                                {cfg.label.split(' ')[0]}
                            </Text>
                        </GlassCard>
                    ))}
                </View>

                {/* Users list */}
                <View style={styles.listSection}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>ВСЕ ПОЛЬЗОВАТЕЛИ</Text>
                    {isLoading ? (
                        <ActivityIndicator color={Colors.neonBlue} style={{ marginTop: 32 }} />
                    ) : (
                        <FlatList
                            data={users}
                            renderItem={renderItem}
                            keyExtractor={(u) => u.id}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                <View style={styles.workSection}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>ДЕТАЛИЗАЦИЯ РАБОТЫ</Text>
                    {entriesLoading ? (
                        <ActivityIndicator color={Colors.neonBlue} style={{ marginTop: Spacing.md }} />
                    ) : recentEntries.length === 0 ? (
                        <Text style={[Typography.bodySmall, styles.emptyWorkText]}>
                            Пока нет записей с детализацией времени и локаций.
                        </Text>
                    ) : (
                        <FlatList
                            data={recentEntries}
                            renderItem={renderWorkItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                <View style={{ height: Spacing.xxxl }} />
            </ScrollView>

            <RolePickerModal
                user={selectedUser}
                visible={showRolePicker}
                onClose={() => { setShowRolePicker(false); setSelectedUser(null); }}
                onSelect={handleRoleSelect}
                isPending={isPending}
            />
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
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    summaryIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    listSection: {
        paddingHorizontal: Spacing.lg,
    },
    workSection: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
    },
    sectionLabel: {
        marginBottom: Spacing.md,
        color: Colors.textMuted,
    },
    emptyWorkText: {
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
    workItem: {
        marginBottom: Spacing.sm,
    },
    workHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    workProject: {
        flex: 1,
        fontWeight: '700',
    },
    workMeta: {
        marginTop: 4,
        color: Colors.textMuted,
    },
    mapBtn: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        alignSelf: 'flex-start',
    },
    userCard: {
        marginBottom: Spacing.sm,
    },
    userCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
        flexShrink: 0,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    userName: {
        fontWeight: '600',
        flexShrink: 1,
    },
    email: {
        color: Colors.textMuted,
        marginTop: 2,
        marginBottom: 6,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    editBtn: {
        padding: Spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: Spacing.lg,
    },
    modalSheet: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    modalSubtitle: {
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        marginBottom: Spacing.sm,
    },
    roleIcon: {
        fontSize: 24,
        marginRight: Spacing.md,
    },
    roleText: {
        flex: 1,
    },
});
