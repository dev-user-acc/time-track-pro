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
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../shared/theme';
import { GlassCard, Badge } from '../../shared/ui';
import { TimeEntryList } from '../../features/timeTracking/ui/TimeEntryList';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntryRepository } from '../../services/repositories/timeEntryRepository';
import { useAuthStore } from '../../store/authStore';
import { useUpdateProject, useDeleteProject } from '../../features/projects/model/useProjects';
import { formatHoursDetailed } from '../../shared/utils/formatTime';
import type { ProjectStackParamList } from '../../app/navigation/types';
import { Ionicons } from '@expo/vector-icons';

type Route = RouteProp<ProjectStackParamList, 'ProjectDetail'>;

const STATUS_LABELS = {
    active: 'Активный',
    paused: 'Пауза',
    completed: 'Завершен',
    archived: 'Архив',
};

const STATUS_COLORS = {
    active: Colors.neonGreen,
    paused: Colors.neonOrange,
    completed: Colors.neonPurple,
    archived: Colors.textMuted,
};

export const ProjectDetailScreen = memo(() => {
    const route = useRoute<Route>();
    const navigation = useNavigation();
    const { project } = route.params;
    const user = useAuthStore((s) => s.user);
    const userId = user?.id ?? '';
    const userRole = user?.role ?? 'employee';
    const canManage = userRole === 'admin' || userRole === 'manager';
    const queryClient = useQueryClient();

    const { data: entries, isLoading } = useQuery({
        queryKey: ['project_entries', project.id, userId],
        queryFn: () => timeEntryRepository.getByProject(project.id, userId),
        enabled: !!userId,
    });

    const { mutate: deleteProject } = useDeleteProject();
    const { mutate: updateProject } = useUpdateProject();

    const { mutate: deleteEntry } = useMutation({
        mutationFn: (id: string) => timeEntryRepository.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_entries', project.id] });
        },
    });

    const handleDeleteEntry = useCallback(
        (id: string) => {
            Alert.alert('Удалить запись?', 'Это действие нельзя отменить.', [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Удалить', style: 'destructive', onPress: () => deleteEntry(id) },
            ]);
        },
        [deleteEntry]
    );

    const handleDelete = useCallback(() => {
        Alert.alert(
            'Удаление проекта',
            'Все записи времени будут удалены. Это действие нельзя отменить.',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => {
                        deleteProject(project.id, {
                            onSuccess: () => navigation.goBack(),
                        });
                    },
                },
            ]
        );
    }, [project.id, deleteProject, navigation]);

    const toggleStatus = useCallback(() => {
        const next = project.status === 'active' ? 'paused' : 'active';
        updateProject({ id: project.id, updates: { status: next } });
    }, [project.id, project.status, updateProject]);

    const totalSeconds = entries?.reduce((acc, e) => acc + e.durationSeconds, 0) ?? 0;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient colors={['#05050f', '#08081a']} style={StyleSheet.absoluteFill} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                        <Ionicons name="chevron-back" size={24} color={Colors.neonBlue} />
                    </TouchableOpacity>
                    {canManage && (
                        <TouchableOpacity onPress={handleDelete} hitSlop={12}>
                            <Ionicons name="trash-outline" size={22} color={Colors.error} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Project info */}
                <View style={[styles.colorBand, { backgroundColor: project.color + '30' }]}>
                    <LinearGradient
                        colors={[project.color + '40', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                    <View style={[styles.projectIcon, { backgroundColor: project.color + '30', borderColor: project.color + '60' }]}>
                        <View style={[styles.projectIconDot, { backgroundColor: project.color }]} />
                    </View>
                    <Text style={Typography.h2}>{project.name}</Text>
                    {project.description ? (
                        <Text style={[Typography.bodySmall, styles.desc]}>{project.description}</Text>
                    ) : null}
                    <View style={styles.statusRow}>
                        <Badge
                            label={STATUS_LABELS[project.status]}
                            color={STATUS_COLORS[project.status]}
                        />
                        {canManage && (
                            <TouchableOpacity
                                onPress={toggleStatus}
                                style={[styles.toggleBtn, { borderColor: project.color + '50' }]}
                            >
                                <Text style={[Typography.bodySmall, { color: project.color }]}>
                                    {project.status === 'active' ? 'Пауза' : 'Возобновить'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <GlassCard style={styles.statCard} gradient={[project.color + '20', project.color + '05']}>
                        <Text style={[Typography.caption]}>ОБЩЕЕ ВРЕМЯ</Text>
                        <Text style={[Typography.h2, { color: project.color }]}>
                            {formatHoursDetailed(totalSeconds)}
                        </Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard} gradient={[Colors.neonPurple + '20', Colors.neonPurple + '05']}>
                        <Text style={[Typography.caption]}>ЗАПИСИ</Text>
                        <Text style={[Typography.h2, { color: Colors.neonPurple }]}>
                            {entries?.length ?? 0}
                        </Text>
                    </GlassCard>
                </View>

                {/* Entries */}
                <View style={styles.entriesSection}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>ЗАПИСИ ВРЕМЕНИ</Text>
                    <TimeEntryList
                        entries={entries ?? []}
                        showDate
                        onDelete={handleDeleteEntry}
                    />
                </View>

                <View style={{ height: Spacing.xxxl }} />
            </ScrollView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
    },
    colorBand: {
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    projectIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    projectIconDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    desc: {
        marginTop: Spacing.xs,
        lineHeight: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    toggleBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    statCard: {
        flex: 1,
    },
    entriesSection: {
        paddingHorizontal: Spacing.lg,
    },
    sectionLabel: {
        marginBottom: Spacing.md,
    },
});
