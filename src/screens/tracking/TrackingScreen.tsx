import React, { memo, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    FlatList,
    ListRenderItemInfo,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { GlassCard, NeonButton, Input, SkeletonCard } from '../../shared/ui';
import { FloatingActionButton } from '../../shared/ui/FloatingActionButton';
import { useTimer, useTimeEntries, useDeleteEntry } from '../../features/timeTracking/model/useTimeTracking';
import { TimerWidget } from '../../features/timeTracking/ui/TimerWidget';
import { TimeEntryList } from '../../features/timeTracking/ui/TimeEntryList';
import { useProjectStore, selectProjects } from '../../store/projectStore';
import { useProjects } from '../../features/projects/model/useProjects';
import { Project } from '../../entities/project/model/types';
import { formatDuration } from '../../shared/utils/formatTime';
import { isSmallDevice, isTablet, moderateScale, verticalScale } from '../../shared/utils/responsive';

const ProjectPickerItem = memo<{
    project: Project;
    selected: boolean;
    onSelect: (p: Project) => void;
}>(({ project, selected, onSelect }) => (
    <TouchableOpacity
        onPress={() => onSelect(project)}
        style={[styles.pickerItem, selected && { borderColor: project.color, backgroundColor: project.color + '15' }]}
    >
        <View style={[styles.pickerDot, { backgroundColor: project.color }]} />
        <Text style={[Typography.body, { flex: 1 }]} numberOfLines={1}>
            {project.name}
        </Text>
        {selected && <Text style={{ color: project.color, fontSize: 16 }}>✓</Text>}
    </TouchableOpacity>
));

export const TrackingScreen = memo(() => {
    const { activeTimer, isRunning, start, stop } = useTimer();
    const { data: entries, isLoading: entriesLoading } = useTimeEntries();
    const { mutate: deleteEntry } = useDeleteEntry();
    const projects = useProjectStore(selectProjects);
    const activeProjects = useMemo(
        () => projects.filter((p) => p.status === 'active'),
        [projects]
    );
    const { isLoading: projectsLoading } = useProjects();

    const [showPicker, setShowPicker] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [description, setDescription] = useState('');

    const handleStart = useCallback(() => {
        if (!selectedProject) {
            setShowPicker(true);
            return;
        }
        start(selectedProject.id, selectedProject.name, selectedProject.color, description);
    }, [selectedProject, description, start]);

    const handleStop = useCallback(async () => {
        await stop();
        setDescription('');
    }, [stop]);

    const handlePickProject = useCallback((p: Project) => {
        setSelectedProject(p);
        setShowPicker(false);
        if (!isRunning) {
            start(p.id, p.name, p.color, description);
        }
    }, [description, isRunning, start]);

    const handleDeleteEntry = useCallback((id: string) => {
        Alert.alert('Удалить запись?', 'Это действие нельзя отменить.', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Удалить', style: 'destructive', onPress: () => deleteEntry(id) },
        ]);
    }, [deleteEntry]);

    const renderPickerItem = useCallback(
        ({ item }: ListRenderItemInfo<Project>) => (
            <ProjectPickerItem
                project={item}
                selected={selectedProject?.id === item.id}
                onSelect={handlePickProject}
            />
        ),
        [selectedProject, handlePickProject]
    );

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <LinearGradient colors={['#05050f', '#08081a']} style={StyleSheet.absoluteFill} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.pageHeader}>
                    <Text style={Typography.h2}>Трекер времени</Text>
                    <Text style={Typography.bodySmall}>Фиксируйте время точно и удобно</Text>
                </View>

                {/* Timer display */}
                <GlassCard
                    style={styles.timerCard}
                    variant={isRunning ? 'neon' : 'default'}
                    neonColor={activeTimer?.projectColor ?? Colors.neonBlue}
                >
                    <View style={styles.timerCenter}>
                        {isRunning && activeTimer ? (
                            <>
                                <View style={[styles.activeIndicator, { backgroundColor: activeTimer.projectColor }]} />
                                <Text style={[Typography.caption, { color: activeTimer.projectColor }]}>
                                    В РАБОТЕ — {activeTimer.projectName}
                                </Text>
                            </>
                        ) : (
                            <Text style={[Typography.caption]}>ГОТОВО К СТАРТУ</Text>
                        )}
                        <Text style={[styles.bigTimer, { color: isRunning ? (activeTimer?.projectColor ?? Colors.neonBlue) : Colors.textMuted }]}>
                            {formatDuration(isRunning ? (activeTimer?.elapsedSeconds ?? 0) : 0)}
                        </Text>
                        {!isRunning && (
                            <Input
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Над чем вы работаете? (необязательно)"
                                containerStyle={styles.descInput}
                            />
                        )}
                    </View>
                    {isRunning ? (
                        <NeonButton
                            onPress={handleStop}
                            label="Остановить"
                            variant="danger"
                            fullWidth
                        />
                    ) : (
                        <>
                            <View style={styles.startRow}>
                                <TouchableOpacity
                                    style={[styles.projectChip,
                                    selectedProject
                                        ? { borderColor: selectedProject.color, backgroundColor: selectedProject.color + '20' }
                                        : {}
                                    ]}
                                    onPress={() => setShowPicker(true)}
                                >
                                    {selectedProject && (
                                        <View style={[styles.chipDot, { backgroundColor: selectedProject.color }]} />
                                    )}
                                    <Text style={[Typography.bodySmall, selectedProject ? { color: selectedProject.color } : {}]}>
                                        {selectedProject?.name ?? 'Выбрать проект'}
                                    </Text>
                                </TouchableOpacity>
                                <NeonButton
                                    onPress={handleStart}
                                    label="Старт"
                                    size="md"
                                    style={styles.startBtn}
                                />
                            </View>
                            <Text style={[Typography.bodySmall, styles.geoNotice]}>
                                При старте будет передаваться геолокация
                            </Text>
                        </>
                    )}
                </GlassCard>

                {/* Recent entries */}
                <View style={styles.section}>
                    <Text style={[Typography.caption, styles.sectionLabel]}>ПОСЛЕДНИЕ ЗАПИСИ</Text>
                    {entriesLoading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        <TimeEntryList entries={entries ?? []} showDate onDelete={handleDeleteEntry} />
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Project picker modal */}
            <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(false)}
                />
                <View style={styles.pickerSheet}>
                    <Text style={[Typography.h3, styles.pickerTitle]}>Выберите проект</Text>
                    {projectsLoading ? (
                        <SkeletonCard />
                    ) : activeProjects.length === 0 ? (
                        <Text style={[Typography.bodySmall, { textAlign: 'center', padding: Spacing.xl }]}>
                            Нет активных проектов. Сначала создайте проект.
                        </Text>
                    ) : (
                        <FlatList
                            data={activeProjects}
                            renderItem={renderPickerItem}
                            keyExtractor={(p) => p.id}
                            style={{ maxHeight: 320 }}
                        />
                    )}
                </View>
            </Modal>
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
    timerCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    timerCenter: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: Spacing.sm,
    },
    bigTimer: {
        fontSize: moderateScale(isTablet ? 60 : isSmallDevice ? 42 : 56, 0.2),
        fontWeight: '700',
        letterSpacing: isSmallDevice ? 2 : 4,
        marginVertical: Spacing.lg,
        fontVariant: ['tabular-nums'],
    },
    descInput: {
        width: '100%',
        marginBottom: 0,
    },
    startRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    projectChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        backgroundColor: Colors.card,
    },
    chipDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    startBtn: {
        paddingHorizontal: Spacing.xl,
    },
    geoNotice: {
        marginTop: Spacing.sm,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: Spacing.lg,
    },
    sectionLabel: {
        marginBottom: Spacing.md,
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    pickerSheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        maxHeight: verticalScale(isTablet ? 560 : isSmallDevice ? 500 : 540),
        borderTopWidth: 1,
        borderColor: Colors.cardBorder,
    },
    pickerTitle: {
        marginBottom: Spacing.lg,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        marginBottom: Spacing.sm,
    },
    pickerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});
