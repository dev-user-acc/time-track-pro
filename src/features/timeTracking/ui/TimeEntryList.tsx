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
import { TimeEntry } from '../../../entities/timeEntry/model/types';
import { formatDuration, formatTime } from '../../../shared/utils/formatTime';
import { formatDateShort } from '../../../shared/utils/dateUtils';

interface TimeEntryListProps {
    entries: TimeEntry[];
    onDelete?: (id: string) => void;
    showDate?: boolean;
}

const EntryItem = memo<{ item: TimeEntry; onDelete?: (id: string) => void; showDate: boolean }>(
    ({ item, onDelete, showDate }) => (
        <View style={styles.item}>
            <View style={[styles.colorBar, { backgroundColor: item.projectColor }]} />
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={[Typography.body, styles.projectName]} numberOfLines={1}>
                        {item.projectName}
                    </Text>
                    <Text style={[Typography.body, { color: Colors.neonBlue, fontWeight: '700' }]}>
                        {formatDuration(item.durationSeconds)}
                    </Text>
                </View>
                <View style={styles.itemMeta}>
                    <Text style={Typography.bodySmall}>
                        {showDate ? formatDateShort(item.startTime) : formatTime(item.startTime)}
                        {item.endTime ? ` – ${formatTime(item.endTime)}` : ''}
                    </Text>
                    {item.description ? (
                        <Text style={[Typography.bodySmall, styles.desc]} numberOfLines={1}>
                            {item.description}
                        </Text>
                    ) : null}
                </View>
            </View>
            {onDelete && (
                <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                >
                    <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    )
);

export const TimeEntryList = memo<TimeEntryListProps>(
    ({ entries, onDelete, showDate = false }) => {
        const renderItem = useCallback(
            ({ item }: ListRenderItemInfo<TimeEntry>) => (
                <EntryItem item={item} onDelete={onDelete} showDate={showDate} />
            ),
            [onDelete, showDate]
        );

        const keyExtractor = useCallback((item: TimeEntry) => item.id, []);

        if (entries.length === 0) {
            return (
                <View style={styles.empty}>
                    <Text style={[Typography.bodySmall, { textAlign: 'center' }]}>
                        Пока нет записей времени
                    </Text>
                </View>
            );
        }

        return (
            <FlatList
                data={entries}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
            />
        );
    }
);

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    colorBar: {
        width: 3,
        alignSelf: 'stretch',
    },
    itemContent: {
        flex: 1,
        padding: Spacing.md,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    projectName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginRight: Spacing.sm,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 8,
    },
    desc: {
        flex: 1,
        color: Colors.textMuted,
        fontSize: 11,
    },
    deleteBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    deleteText: {
        color: Colors.error,
        fontSize: 14,
    },
    empty: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
});
