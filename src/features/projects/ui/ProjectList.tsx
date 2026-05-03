import React, { memo, useCallback } from 'react';
import {
    FlatList,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ListRenderItemInfo,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../shared/theme';
import { Project } from '../../../entities/project/model/types';
import { formatHoursDetailed } from '../../../shared/utils/formatTime';
import { Badge } from '../../../shared/ui/Badge';

interface ProjectCardProps {
    project: Project;
    onPress: (project: Project) => void;
    onLongPress?: (project: Project) => void;
}

const STATUS_COLORS: Record<Project['status'], string> = {
    active: Colors.neonGreen,
    paused: Colors.neonOrange,
    completed: Colors.neonPurple,
    archived: Colors.textMuted,
};

const STATUS_LABELS: Record<Project['status'], string> = {
    active: 'Активный',
    paused: 'Пауза',
    completed: 'Завершен',
    archived: 'Архив',
};

export const ProjectCard = memo<ProjectCardProps>(({ project, onPress, onLongPress }) => (
    <TouchableOpacity
        onPress={() => onPress(project)}
        onLongPress={() => onLongPress?.(project)}
        style={styles.card}
        activeOpacity={0.75}
    >
        <View style={[styles.colorAccent, { backgroundColor: project.color }]} />
        <View style={styles.body}>
            <View style={styles.header}>
                <View style={[styles.dot, { backgroundColor: project.color }]} />
                <Text style={[Typography.h4, styles.name]} numberOfLines={1}>
                    {project.name}
                </Text>
                <Badge
                    label={STATUS_LABELS[project.status]}
                    color={STATUS_COLORS[project.status]}
                    size="sm"
                />
            </View>
            {project.description ? (
                <Text style={[Typography.bodySmall, styles.desc]} numberOfLines={2}>
                    {project.description}
                </Text>
            ) : null}
            <View style={styles.footer}>
                <Text style={[Typography.caption]}>Всего времени</Text>
                <Text style={[Typography.body, { color: project.color, fontWeight: '700' }]}>
                    {formatHoursDetailed(project.totalSeconds)}
                </Text>
            </View>
        </View>
    </TouchableOpacity>
));

interface ProjectListProps {
    projects: Project[];
    onPressProject: (project: Project) => void;
    onLongPressProject?: (project: Project) => void;
}

export const ProjectList = memo<ProjectListProps>(
    ({ projects, onPressProject, onLongPressProject }) => {
        const renderItem = useCallback(
            ({ item }: ListRenderItemInfo<Project>) => (
                <ProjectCard
                    project={item}
                    onPress={onPressProject}
                    onLongPress={onLongPressProject}
                />
            ),
            [onPressProject, onLongPressProject]
        );
        const keyExtractor = useCallback((item: Project) => item.id, []);

        return (
            <FlatList
                data={projects}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                removeClippedSubviews
                maxToRenderPerBatch={8}
                windowSize={5}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={[Typography.bodySmall, { textAlign: 'center' }]}>
                            Пока нет проектов. Нажмите + чтобы создать.
                        </Text>
                    </View>
                }
            />
        );
    }
);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },
    colorAccent: {
        width: 4,
    },
    body: {
        flex: 1,
        padding: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    name: {
        flex: 1,
        fontSize: 15,
    },
    desc: {
        marginBottom: Spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    empty: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
});
