import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTrackingStore } from '../../../store/trackingStore';
import { useAuthStore } from '../../../store/authStore';
import { timeEntryRepository } from '../../../services/repositories/timeEntryRepository';
import { projectRepository } from '../../../services/repositories/projectRepository';
import { generateId } from '../../../shared/utils/uuid';

export const ENTRIES_KEY = 'timeEntries';

export const useTimeEntries = () => {
    const userId = useAuthStore((s) => s.user?.id ?? '');
    return useQuery({
        queryKey: [ENTRIES_KEY, userId],
        queryFn: () => timeEntryRepository.getByUser(userId),
        enabled: !!userId,
        staleTime: 15_000,
    });
};

export const useTimer = () => {
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { activeTimer, isRunning, startTimer, stopTimer, updateElapsed } = useTrackingStore();
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const qc = useQueryClient();

    useEffect(() => {
        if (isRunning && activeTimer) {
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor(
                    (Date.now() - new Date(activeTimer.startTime).getTime()) / 1000
                );
                updateElapsed(elapsed);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, activeTimer, updateElapsed]);

    const start = useCallback(
        (projectId: string, projectName: string, projectColor: string, description = '') => {
            const entryId = generateId();
            const startTime = new Date().toISOString();
            startTimer({
                entryId,
                projectId,
                projectName,
                projectColor,
                description,
                startTime,
                elapsedSeconds: 0,
            });
        },
        [startTimer]
    );

    const stop = useCallback(async () => {
        if (!activeTimer || !userId) return;
        const endTime = new Date().toISOString();
        const duration = activeTimer.elapsedSeconds;
        stopTimer();
        if (duration < 1) return;
        await timeEntryRepository.create(userId, {
            projectId: activeTimer.projectId,
            projectName: activeTimer.projectName,
            projectColor: activeTimer.projectColor,
            description: activeTimer.description,
            startTime: activeTimer.startTime,
            endTime,
            durationSeconds: duration,
        });
        await projectRepository.updateTotalSeconds(activeTimer.projectId, userId);
        qc.invalidateQueries({ queryKey: [ENTRIES_KEY, userId] });
        qc.invalidateQueries({ queryKey: ['projects', userId] });
        qc.invalidateQueries({ queryKey: ['dashboard', userId] });
    }, [activeTimer, userId, stopTimer, qc]);

    return { activeTimer, isRunning, start, stop };
};

export const useDeleteEntry = () => {
    const qc = useQueryClient();
    const userId = useAuthStore((s) => s.user?.id ?? '');
    return useMutation({
        mutationFn: (id: string) => timeEntryRepository.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [ENTRIES_KEY, userId] });
            qc.invalidateQueries({ queryKey: ['dashboard', userId] });
        },
    });
};
