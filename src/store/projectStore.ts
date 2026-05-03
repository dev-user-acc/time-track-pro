import { create } from 'zustand';
import { Project } from '../entities/project/model/types';

interface ProjectState {
    projects: Project[];
    selectedProjectId: string | null;
}

interface ProjectActions {
    setProjects: (projects: Project[]) => void;
    addProject: (project: Project) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    removeProject: (id: string) => void;
    setSelectedProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
    projects: [],
    selectedProjectId: null,

    setProjects: (projects) => set({ projects }),

    addProject: (project) =>
        set((s) => ({ projects: [project, ...s.projects] })),

    updateProject: (id, updates) =>
        set((s) => ({
            projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

    removeProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

    setSelectedProject: (selectedProjectId) => set({ selectedProjectId }),
}));

export const selectProjects = (s: ProjectState) => s.projects;
export const selectActiveProjects = (s: ProjectState) =>
    s.projects.filter((p) => p.status === 'active');
export const selectSelectedProjectId = (s: ProjectState) => s.selectedProjectId;
