export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatarColor: string;
    createdAt: string;
}

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}
