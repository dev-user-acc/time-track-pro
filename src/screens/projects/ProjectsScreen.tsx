import React, { memo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Colors, Spacing, Typography } from '../../shared/theme';
import { SkeletonCard } from '../../shared/ui';
import { FloatingActionButton } from '../../shared/ui/FloatingActionButton';
import { ProjectList } from '../../features/projects/ui/ProjectList';
import { CreateProjectModal } from '../../features/projects/ui/CreateProjectModal';
import { useProjects, useDeleteProject } from '../../features/projects/model/useProjects';
import { useProjectStore, selectProjects } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { Project } from '../../entities/project/model/types';
import type { ProjectStackParamList } from '../../app/navigation/types';
import { Ionicons } from '@expo/vector-icons';

type Nav = StackNavigationProp<ProjectStackParamList, 'ProjectsHome'>;

export const ProjectsScreen = memo(() => {
    const navigation = useNavigation<Nav>();
    const tabBarHeight = useBottomTabBarHeight();
    const [showCreate, setShowCreate] = useState(false);
    const { isLoading, refetch } = useProjects();
    const projects = useProjectStore(selectProjects);
    const { mutate: deleteProject } = useDeleteProject();
    const userRole = useAuthStore((s) => s.user?.role ?? 'employee');

    // Only admin and manager can create/delete projects
    const canManage = userRole === 'admin' || userRole === 'manager';

    const handleProjectPress = useCallback(
        (project: Project) => {
            navigation.navigate('ProjectDetail', { project });
        },
        [navigation]
    );

    const handleLongPress = useCallback(
        (project: Project) => {
            if (!canManage) return;
            Alert.alert(
                project.name,
                'Что сделать с проектом?',
                [
                    {
                        text: 'Удалить',
                        style: 'destructive',
                        onPress: () =>
                            Alert.alert('Удаление проекта', 'Будут удалены и все записи времени. Продолжить?', [
                                { text: 'Отмена', style: 'cancel' },
                                {
                                    text: 'Удалить',
                                    style: 'destructive',
                                    onPress: () => deleteProject(project.id),
                                },
                            ]),
                    },
                    { text: 'Отмена', style: 'cancel' },
                ]
            );
        },
        [deleteProject, canManage]
    );

    const activeCount = projects.filter((p) => p.status === 'active').length;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient colors={['#05050f', '#08081a']} style={StyleSheet.absoluteFill} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={refetch}
                        tintColor={Colors.neonBlue}
                    />
                }
            >
                <View style={styles.header}>
                    <View>
                        <Text style={Typography.h2}>Проекты</Text>
                        <Text style={Typography.bodySmall}>
                            {activeCount} активных • {projects.length} всего
                        </Text>
                    </View>
                    {!canManage && (
                        <View style={styles.viewOnlyBadge}>
                            <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.viewOnlyText}>Только просмотр</Text>
                        </View>
                    )}
                </View>

                <View style={styles.list}>
                    {isLoading && projects.length === 0 ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        <ProjectList
                            projects={projects}
                            onPressProject={handleProjectPress}
                            onLongPressProject={canManage ? handleLongPress : undefined}
                        />
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {canManage && (
                <FloatingActionButton
                    onPress={() => setShowCreate(true)}
                    icon={<Ionicons name="add" size={28} color="#000" />}
                    style={StyleSheet.flatten([styles.fab, { bottom: tabBarHeight + Spacing.md }])}
                    colors={['#00d4ff', '#0066cc']}
                />
            )}

            <CreateProjectModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
            />
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    list: {
        paddingHorizontal: Spacing.lg,
    },
    fab: {
        position: 'absolute',
        right: Spacing.xl,
        zIndex: 100,
        elevation: 20,
    },
    viewOnlyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.card,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    viewOnlyText: {
        fontSize: 11,
        color: Colors.textMuted,
        fontWeight: '500',
    },
});
