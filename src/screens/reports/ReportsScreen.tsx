import React, { memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography } from '../../shared/theme';
import { GlassCard, SkeletonCard } from '../../shared/ui';
import { WeeklyBarChart, ProjectBreakdown } from '../../features/reports/ui/BarChart';
import { useWeeklyReport } from '../../features/reports/model/useReports';
import { formatHoursDetailed } from '../../shared/utils/formatTime';
import { isSmallDevice, isTablet } from '../../shared/utils/responsive';

const { width } = Dimensions.get('window');
const chartWidth = width - Spacing.lg * 2 - Spacing.lg * 2; // card padding
const summaryCardWidth = isSmallDevice ? '48%' : isTablet ? '31%' : undefined;

export const ReportsScreen = memo(() => {
    const { data, isLoading, refetch } = useWeeklyReport();

    const daysTracked = data?.chartData?.filter((d) => d.seconds > 0).length ?? 0;
    const avgSeconds =
        daysTracked > 0 ? (data?.totalSeconds ?? 0) / daysTracked : 0;

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
                    <Text style={Typography.h2}>Отчеты</Text>
                    <Text style={Typography.bodySmall}>Сводка за последние 7 дней</Text>
                </View>

                {isLoading ? (
                    <View style={styles.content}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                ) : (
                    <View style={styles.content}>
                        {/* Summary stats */}
                        <View style={styles.summaryRow}>
                            <GlassCard
                                style={styles.summaryCard}
                                gradient={[Colors.neonBlue + '20', Colors.neonBlue + '05']}
                            >
                                <Text style={[Typography.caption]}>ИТОГО</Text>
                                <Text style={[Typography.h3, { color: Colors.neonBlue }]}>
                                    {formatHoursDetailed(data?.totalSeconds ?? 0)}
                                </Text>
                            </GlassCard>
                            <GlassCard
                                style={styles.summaryCard}
                                gradient={[Colors.neonPurple + '20', Colors.neonPurple + '05']}
                            >
                                <Text style={[Typography.caption]}>СРЕДНЕЕ В ДЕНЬ</Text>
                                <Text style={[Typography.h3, { color: Colors.neonPurple }]}>
                                    {formatHoursDetailed(avgSeconds)}
                                </Text>
                            </GlassCard>
                            <GlassCard
                                style={styles.summaryCard}
                                gradient={[Colors.neonGreen + '20', Colors.neonGreen + '05']}
                            >
                                <Text style={[Typography.caption]}>ДНИ</Text>
                                <Text style={[Typography.h3, { color: Colors.neonGreen }]}>
                                    {daysTracked}/7
                                </Text>
                            </GlassCard>
                        </View>

                        {/* Bar chart */}
                        <GlassCard style={styles.chartCard}>
                            <Text style={[Typography.caption, styles.cardLabel]}>
                                ПО ДНЯМ
                            </Text>
                            <WeeklyBarChart
                                data={data?.chartData ?? []}
                                width={chartWidth}
                                height={160}
                                color={Colors.neonBlue}
                            />
                        </GlassCard>

                        {/* Project breakdown */}
                        {(data?.projectBreakdown?.length ?? 0) > 0 && (
                            <GlassCard style={styles.chartCard}>
                                <Text style={[Typography.caption, styles.cardLabel]}>
                                    ПО ПРОЕКТАМ
                                </Text>
                                <ProjectBreakdown
                                    data={data?.projectBreakdown ?? []}
                                    totalSeconds={data?.totalSeconds ?? 0}
                                />
                            </GlassCard>
                        )}

                        {/* Per-day details */}
                        <GlassCard style={styles.chartCard}>
                            <Text style={[Typography.caption, styles.cardLabel]}>ДНЕВНОЙ ЖУРНАЛ</Text>
                            {(data?.chartData ?? []).map((d) => (
                                <View key={d.date.toISOString()} style={styles.dayRow}>
                                    <Text style={[Typography.body, styles.dayName]}>
                                        {d.date.toLocaleDateString('ru-RU', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </Text>
                                    <Text
                                        style={[
                                            Typography.body,
                                            {
                                                color: d.seconds > 0 ? Colors.neonBlue : Colors.textMuted,
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        {d.seconds > 0 ? formatHoursDetailed(d.seconds) : '—'}
                                    </Text>
                                </View>
                            ))}
                        </GlassCard>
                    </View>
                )}

                <View style={{ height: Spacing.xxxl }} />
            </ScrollView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    content: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: isSmallDevice ? 'wrap' : 'nowrap',
    },
    summaryCard: {
        flex: 1,
        minWidth: summaryCardWidth,
    },
    chartCard: {
        padding: Spacing.lg,
    },
    cardLabel: {
        marginBottom: Spacing.md,
    },
    dayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.separator,
    },
    dayName: {
        fontSize: 14,
        flex: 1,
    },
});
