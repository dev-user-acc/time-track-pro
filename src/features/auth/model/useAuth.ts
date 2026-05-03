import { useMutation } from '@tanstack/react-query';
import { userRepository } from '../../../services/repositories/userRepository';
import { useAuthStore } from '../../../store/authStore';
import { AuthCredentials, RegisterData } from '../../../entities/user/model/types';

export const useLogin = () => {
    const setUser = useAuthStore((s) => s.setUser);

    return useMutation({
        mutationFn: (creds: AuthCredentials) => userRepository.login(creds),
        onSuccess: (user) => setUser(user),
    });
};

export const useRegister = () => {
    const setUser = useAuthStore((s) => s.setUser);

    return useMutation({
        mutationFn: (data: RegisterData) => userRepository.register(data),
        onSuccess: (user) => setUser(user),
    });
};
