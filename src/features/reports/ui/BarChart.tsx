import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../../shared/theme';

interface BarData {
    day: string;
    seconds: number;
}

interface WeeklyBarChartProps {
    data: BarData[];
    width: number;
    height?: number;
    color?: string;
}

export const WeeklyBarChart = memo<WeeklyBarChartProps>(
    ({ data, width, height = 160, color = Colors.neonBlue }) => {
        const paddingH = 20;
        const paddingTop = 16;
        const paddingBottom = 28;
        const chartWidth = width - paddingH * 2;
        const chartHeight = height - paddingTop - paddingBottom;
        const barCount = data.length;
        const barGap = 6;
        const barWidth = (chartWidth - barGap * (barCount - 1)) / barCount;
        const maxSeconds = Math.max(...data.map((d) => d.seconds), 1);

        return (
            <View>
                <Svg width={width} height={height}>
                    <Defs>
                        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={color} stopOpacity="0.9" />
                            <Stop offset="1" stopColor={color} stopOpacity="0.2" />
                        </LinearGradient>
                    </Defs>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = paddingTop + chartHeight * (1 - ratio);
                        return (
                            <Line
                                key={ratio}
                                x1={paddingH}
                                y1={y}
                                x2={paddingH + chartWidth}
                                y2={y}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth={1}
                            />
                        );
                    })}
                    {/* Bars */}
                    {data.map((d, i) => {
                        const barH = Math.max((d.seconds / maxSeconds) * chartHeight, d.seconds > 0 ? 4 : 0);
                        const x = paddingH + i * (barWidth + barGap);
                        const y = paddingTop + chartHeight - barH;
                        return (
                            <React.Fragment key={d.day}>
                                <Rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barH}
                                    fill="url(#barGrad)"
                                    rx={4}
                                />
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={height - 6}
                                    textAnchor="middle"
                                    fill="rgba(255,255,255,0.45)"
                                    fontSize="10"
                                >
                                    {d.day}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>
            </View>
        );
    }
);

interface ProjectBreakdownProps {
    data: { name: string; seconds: number }[];
    totalSeconds: number;
}

export const ProjectBreakdown = memo<ProjectBreakdownProps>(
    ({ data, totalSeconds }) => {
        const colors = Colors.projectColors as unknown as string[];
        if (data.length === 0) return null;

        return (
            <View style={styles.breakdownContainer}>
                {data.slice(0, 6).map((item, i) => {
                    const pct = totalSeconds > 0 ? (item.seconds / totalSeconds) * 100 : 0;
                    const c = colors[i % colors.length];
                    return (
                        <View key={item.name} style={styles.breakdownRow}>
                            <View style={[styles.breakdownDot, { backgroundColor: c }]} />
                            <Text style={[Typography.bodySmall, styles.breakdownName]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={styles.breakdownBar}>
                                <View
                                    style={[
                                        styles.breakdownFill,
                                        { width: `${pct}%` as any, backgroundColor: c },
                                    ]}
                                />
                            </View>
                            <Text style={[Typography.bodySmall, { color: c, minWidth: 36, textAlign: 'right' }]}>
                                {pct.toFixed(0)}%
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    }
);

const styles = StyleSheet.create({
    breakdownContainer: {
        gap: Spacing.sm,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    breakdownDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    breakdownName: {
        flex: 1,
        maxWidth: 100,
    },
    breakdownBar: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    breakdownFill: {
        height: '100%',
        borderRadius: 3,
    },
});
