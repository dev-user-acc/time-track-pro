export interface TimeEntry {
    id: string;
    userId: string;
    projectId: string;
    projectName: string;
    projectColor: string;
    description: string;
    startTime: string;
    endTime: string | null;
    durationSeconds: number;
    createdAt: string;
}

export interface ActiveTimer {
    entryId: string;
    projectId: string;
    projectName: string;
    projectColor: string;
    description: string;
    startTime: string;
    elapsedSeconds: number;
}

export interface CreateTimeEntryData {
    projectId: string;
    description?: string;
    durationSeconds: number;
    startTime: string;
    endTime: string;
}
