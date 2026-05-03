import { Project } from '../../entities/project/model/types';
import { User } from '../../entities/user/model/types';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type ProjectStackParamList = {
    ProjectsHome: undefined;
    ProjectDetail: { project: Project };
};

export type AdminStackParamList = {
    AdminUsers: undefined;
    AdminUserDetail: { user: User };
};

// Employee tabs
export type EmployeeTabParamList = {
    Dashboard: undefined;
    Tracking: undefined;
    Projects: NavigatorScreenParams<ProjectStackParamList> | undefined;
    Reports: undefined;
    Profile: undefined;
};

// Manager tabs
export type ManagerTabParamList = {
    Dashboard: undefined;
    Tracking: undefined;
    Projects: NavigatorScreenParams<ProjectStackParamList> | undefined;
    Team: undefined;
    Profile: undefined;
};

// Admin tabs
export type AdminTabParamList = {
    Dashboard: undefined;
    Projects: NavigatorScreenParams<ProjectStackParamList> | undefined;
    Users: NavigatorScreenParams<AdminStackParamList> | undefined;
    Reports: undefined;
    Profile: undefined;
};

// Generic alias used by shared screens
export type MainTabParamList = EmployeeTabParamList;

export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};
