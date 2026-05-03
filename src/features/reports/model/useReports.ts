import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { timeEntryRepository } from '../../../services/repositories/timeEntryRepository';
import { projectRepository } from '../../../services/repositories/projectRepository';
import { getLast7Days, toISODateString } from '../../../shared/utils/dateUtils';

export const useDashboard = () => {
    const userId = useAuthStore((s) => s.user?.id ?? '');
    return useQuery({
        queryKey: ['dashboard', userId],
        queryFn: async () => {
            const [todaySeconds, weekSeconds, entries, projects] = await Promise.all([
                timeEntryRepository.getTodaySeconds(userId),
                timeEntryRepository.getWeekSeconds(userId),
                timeEntryRepository.getByUser(userId, 5),
                projectRepository.getAll(userId),
            ]);
            return { todaySeconds, weekSeconds, recentEntries: entries, projects };
        },
        enabled: !!userId,
        staleTime: 20_000,
    });
};

export const useWeeklyReport = () => {
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const last7 = getLast7Days();
    const dayStrings = last7.map(toISODateString);

    return useQuery({
        queryKey: ['weeklyReport', userId, dayStrings[0]],
        queryFn: async () => {
            const daily = await timeEntryRepository.getDailySeconds(userId, dayStrings);
            const entries = await timeEntryRepository.getByUser(userId, 100);
            const projectMap: Record<string, number> = {};
            for (const e of entries) {
                const start = e.startTime.split('T')[0];
                const weekAgo = toISODateString(last7[0]);
                if (start >= weekAgo) {
                    projectMap[e.projectName] = (projectMap[e.projectName] ?? 0) + e.durationSeconds;
                }
            }
            const chartData = last7.map((d, i) => ({
                date: d,
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                seconds: daily[dayStrings[i]] ?? 0,
            }));
            const totalSeconds = Object.values(daily).reduce((a, b) => a + b, 0);
            const projectBreakdown = Object.entries(projectMap)
                .sort((a, b) => b[1] - a[1])
                .map(([name, seconds]) => ({ name, seconds }));
            return { chartData, totalSeconds, projectBreakdown };
        },
        enabled: !!userId,
        staleTime: 30_000,
    });
};
