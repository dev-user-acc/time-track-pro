import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../entities/user/model/types';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthActions {
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    restoreSession: () => Promise<void>;
}

const SESSION_KEY = 'tt_session';

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) => {
        set({ user, isAuthenticated: !!user });
        if (user) {
            SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user)).catch(() => { });
        }
    },

    setLoading: (isLoading) => set({ isLoading }),

    logout: async () => {
        await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => { });
        set({ user: null, isAuthenticated: false });
    },

    restoreSession: async () => {
        try {
            const stored = await SecureStore.getItemAsync(SESSION_KEY);
            if (stored) {
                const user: User = JSON.parse(stored);
                set({ user, isAuthenticated: true, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },
}));

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectAuthLoading = (s: AuthState) => s.isLoading;
