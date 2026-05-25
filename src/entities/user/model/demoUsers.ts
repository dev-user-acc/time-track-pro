import { UserRole } from './types';

export interface DemoUserSeed {
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    avatarColor: string;
}

export const DEMO_USERS: DemoUserSeed[] = [
    {
        id: 'demo-admin-001',
        email: 'admin@timetrack.demo',
        password: 'Admin123',
        name: 'Алексей Админ',
        role: 'admin',
        avatarColor: '#f472b6',
    },
    {
        id: 'demo-manager-001',
        email: 'manager@timetrack.demo',
        password: 'Manager123',
        name: 'Марина Менеджер',
        role: 'manager',
        avatarColor: '#f59e0b',
    },
    {
        id: 'demo-employee-001',
        email: 'employee@timetrack.demo',
        password: 'Employee123',
        name: 'Егор Сотрудник',
        role: 'employee',
        avatarColor: '#00d4ff',
    },
];
