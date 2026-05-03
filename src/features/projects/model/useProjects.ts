import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectRepository } from '../../../services/repositories/projectRepository';
import { useProjectStore } from '../../../store/projectStore';
import { useAuthStore } from '../../../store/authStore';
import { CreateProjectData } from '../../../entities/project/model/types';

export const PROJECTS_KEY = 'projects';

export const useProjects = () => {
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const setProjects = useProjectStore((s) => s.setProjects);

    return useQuery({
        queryKey: [PROJECTS_KEY, userId],
        queryFn: async () => {
            const list = await projectRepository.getAll(userId);
            setProjects(list);
            return list;
        },
        enabled: !!userId,
        staleTime: 30_000,
    });
};

export const useCreateProject = () => {
    const qc = useQueryClient();
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const addProject = useProjectStore((s) => s.addProject);

    return useMutation({
        mutationFn: (data: CreateProjectData) => projectRepository.create(userId, data),
        onSuccess: (project) => {
            addProject(project);
            qc.invalidateQueries({ queryKey: [PROJECTS_KEY, userId] });
        },
    });
};

export const useDeleteProject = () => {
    const qc = useQueryClient();
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const removeProject = useProjectStore((s) => s.removeProject);

    return useMutation({
        mutationFn: (id: string) => projectRepository.delete(id),
        onSuccess: (_, id) => {
            removeProject(id);
            qc.invalidateQueries({ queryKey: [PROJECTS_KEY, userId] });
        },
    });
};

export const useUpdateProject = () => {
    const qc = useQueryClient();
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const updateProject = useProjectStore((s) => s.updateProject);

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof projectRepository.update>[1] }) =>
            projectRepository.update(id, updates),
        onSuccess: (_, { id, updates }) => {
            updateProject(id, updates);
            qc.invalidateQueries({ queryKey: [PROJECTS_KEY, userId] });
        },
    });
};
