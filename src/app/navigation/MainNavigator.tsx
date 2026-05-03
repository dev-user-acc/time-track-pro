import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../shared/theme';
import { DashboardScreen } from '../../screens/dashboard/DashboardScreen';
import { TrackingScreen } from '../../screens/tracking/TrackingScreen';
import { ProjectsScreen } from '../../screens/projects/ProjectsScreen';
import { ProjectDetailScreen } from '../../screens/projects/ProjectDetailScreen';
import { ReportsScreen } from '../../screens/reports/ReportsScreen';
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { AdminUsersScreen } from '../../screens/admin/AdminUsersScreen';
import { ManagerTeamScreen } from '../../screens/manager/ManagerTeamScreen';
import { useTrackingStore, selectIsRunning } from '../../store/trackingStore';
import { useAuthStore } from '../../store/authStore';
import type {
    ProjectStackParamList,
    AdminStackParamList,
    EmployeeTabParamList,
    ManagerTabParamList,
    AdminTabParamList,
} from './types';
import { isSmallDevice, isTablet } from '../../shared/utils/responsive';

const ProjectStack = createStackNavigator<ProjectStackParamList>();
const AdminStack = createStackNavigator<AdminStackParamList>();
const EmployeeTab = createBottomTabNavigator<EmployeeTabParamList>();
const ManagerTab = createBottomTabNavigator<ManagerTabParamList>();
const AdminTabNav = createBottomTabNavigator<AdminTabParamList>();

const ProjectStackNavigator = memo(() => (
    <ProjectStack.Navigator screenOptions={{ headerShown: false }}>
        <ProjectStack.Screen name="ProjectsHome" component={ProjectsScreen} />
        <ProjectStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </ProjectStack.Navigator>
));

const AdminStackNavigator = memo(() => (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
        <AdminStack.Screen name="AdminUsers" component={AdminUsersScreen} />
    </AdminStack.Navigator>
));

// Shared tab bar appearance
const TAB_BAR_STYLE = {
    position: 'absolute' as const,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: 'transparent',
    elevation: 0,
    height: isTablet ? 92 : isSmallDevice ? 72 : 80,
    paddingBottom: isTablet ? 18 : isSmallDevice ? 10 : 16,
};

type TabConfig = { icon: keyof typeof Ionicons.glyphMap; label: string; activeColor?: string };

const makeScreenOptions =
    (tabConfig: Record<string, TabConfig>, isRunning: boolean) =>
        ({ route }: { route: { name: string } }) => {
            const config = tabConfig[route.name];
            return {
                headerShown: false,
                tabBarStyle: TAB_BAR_STYLE,
                tabBarBackground: () => (
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                ),
                tabBarActiveTintColor: config?.activeColor ?? Colors.tabActive,
                tabBarInactiveTintColor: Colors.tabInactive,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({
                    color,
                    size,
                    focused,
                }: {
                    color: string;
                    size: number;
                    focused: boolean;
                }) => {
                    const iconName = focused
                        ? (config?.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) ?? config?.icon
                        : config?.icon;
                    return (
                        <View style={focused ? styles.activeIconWrapper : undefined}>
                            <Ionicons name={iconName} size={size} color={color} />
                            {route.name === 'Tracking' && isRunning && (
                                <View style={styles.trackingDot} />
                            )}
                        </View>
                    );
                },
                tabBarLabel: config?.label,
            };
        };

// ── Employee Navigator ───────────────────────────────────────────────────────
const EMPLOYEE_TABS: Record<string, TabConfig> = {
    Dashboard: { icon: 'grid-outline', label: 'Главная' },
    Tracking: { icon: 'timer-outline', label: 'Трекер' },
    Projects: { icon: 'folder-outline', label: 'Проекты' },
    Reports: { icon: 'bar-chart-outline', label: 'Отчеты' },
    Profile: { icon: 'person-outline', label: 'Профиль' },
};

const EmployeeNavigator = memo(() => {
    const isRunning = useTrackingStore(selectIsRunning);
    return (
        <EmployeeTab.Navigator screenOptions={makeScreenOptions(EMPLOYEE_TABS, isRunning)}>
            <EmployeeTab.Screen name="Dashboard" component={DashboardScreen} />
            <EmployeeTab.Screen name="Tracking" component={TrackingScreen} />
            <EmployeeTab.Screen name="Projects" component={ProjectStackNavigator} options={{ title: 'Проекты' }} />
            <EmployeeTab.Screen name="Reports" component={ReportsScreen} />
            <EmployeeTab.Screen name="Profile" component={ProfileScreen} />
        </EmployeeTab.Navigator>
    );
});

// ── Manager Navigator ────────────────────────────────────────────────────────
const MANAGER_TABS: Record<string, TabConfig> = {
    Dashboard: { icon: 'grid-outline', label: 'Главная' },
    Tracking: { icon: 'timer-outline', label: 'Трекер' },
    Projects: { icon: 'folder-outline', label: 'Проекты' },
    Team: { icon: 'people-outline', label: 'Команда', activeColor: Colors.neonOrange },
    Profile: { icon: 'person-outline', label: 'Профиль' },
};

const ManagerNavigator = memo(() => {
    const isRunning = useTrackingStore(selectIsRunning);
    return (
        <ManagerTab.Navigator screenOptions={makeScreenOptions(MANAGER_TABS, isRunning)}>
            <ManagerTab.Screen name="Dashboard" component={DashboardScreen} />
            <ManagerTab.Screen name="Tracking" component={TrackingScreen} />
            <ManagerTab.Screen name="Projects" component={ProjectStackNavigator} options={{ title: 'Проекты' }} />
            <ManagerTab.Screen name="Team" component={ManagerTeamScreen} />
            <ManagerTab.Screen name="Profile" component={ProfileScreen} />
        </ManagerTab.Navigator>
    );
});

// ── Admin Navigator ──────────────────────────────────────────────────────────
const ADMIN_TABS: Record<string, TabConfig> = {
    Dashboard: { icon: 'grid-outline', label: 'Главная' },
    Projects: { icon: 'folder-outline', label: 'Проекты' },
    Users: { icon: 'people-circle-outline', label: 'Сотрудники', activeColor: Colors.neonPink },
    Reports: { icon: 'bar-chart-outline', label: 'Отчеты' },
    Profile: { icon: 'person-outline', label: 'Профиль' },
};

const AdminNavigatorComponent = memo(() => {
    const isRunning = useTrackingStore(selectIsRunning);
    return (
        <AdminTabNav.Navigator screenOptions={makeScreenOptions(ADMIN_TABS, isRunning)}>
            <AdminTabNav.Screen name="Dashboard" component={DashboardScreen} />
            <AdminTabNav.Screen name="Projects" component={ProjectStackNavigator} options={{ title: 'Проекты' }} />
            <AdminTabNav.Screen name="Users" component={AdminStackNavigator} options={{ title: 'Сотрудники' }} />
            <AdminTabNav.Screen name="Reports" component={ReportsScreen} />
            <AdminTabNav.Screen name="Profile" component={ProfileScreen} />
        </AdminTabNav.Navigator>
    );
});

// ── Root export ──────────────────────────────────────────────────────────────
export const MainNavigator = memo(() => {
    const role = useAuthStore((s) => s.user?.role ?? 'employee');
    if (role === 'admin') return <AdminNavigatorComponent />;
    if (role === 'manager') return <ManagerNavigator />;
    return <EmployeeNavigator />;
});

const styles = StyleSheet.create({
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    activeIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackingDot: {
        position: 'absolute',
        top: -2,
        right: -4,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: Colors.neonGreen,
    },
});
