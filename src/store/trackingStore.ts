import { create } from 'zustand';
import { ActiveTimer } from '../entities/timeEntry/model/types';

interface TrackingState {
    activeTimer: ActiveTimer | null;
    isRunning: boolean;
}

interface TrackingActions {
    startTimer: (timer: ActiveTimer) => void;
    stopTimer: () => void;
    updateElapsed: (seconds: number) => void;
    setActiveTimer: (timer: ActiveTimer | null) => void;
}

export const useTrackingStore = create<TrackingState & TrackingActions>((set) => ({
    activeTimer: null,
    isRunning: false,

    startTimer: (timer) => set({ activeTimer: timer, isRunning: true }),

    stopTimer: () => set({ activeTimer: null, isRunning: false }),

    updateElapsed: (seconds) =>
        set((s) =>
            s.activeTimer
                ? { activeTimer: { ...s.activeTimer, elapsedSeconds: seconds } }
                : {}
        ),

    setActiveTimer: (activeTimer) =>
        set({ activeTimer, isRunning: !!activeTimer }),
}));

export const selectActiveTimer = (s: TrackingState) => s.activeTimer;
export const selectIsRunning = (s: TrackingState) => s.isRunning;
