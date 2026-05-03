export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
    id: string;
    name: string;
    description: string;
    color: string;
    status: ProjectStatus;
    ownerId: string;
    totalSeconds: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProjectData {
    name: string;
    description?: string;
    color: string;
}
