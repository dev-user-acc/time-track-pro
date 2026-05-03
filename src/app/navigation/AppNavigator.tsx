import React, { memo, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthStore, selectIsAuthenticated, selectAuthLoading } from '../../store/authStore';
import { Colors } from '../../shared/theme';
import type { RootStackParamList } from './types';

const Root = createStackNavigator<RootStackParamList>();

const LoadingScreen = memo(() => (
    <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.neonBlue} />
    </View>
));

export const AppNavigator = memo(() => {
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const isLoading = useAuthStore(selectAuthLoading);
    const restoreSession = useAuthStore((s) => s.restoreSession);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    if (isLoading) return <LoadingScreen />;

    return (
        <NavigationContainer>
            <Root.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.background } }}>
                {isAuthenticated ? (
                    <Root.Screen name="Main" component={MainNavigator} />
                ) : (
                    <Root.Screen name="Auth" component={AuthNavigator} />
                )}
            </Root.Navigator>
        </NavigationContainer>
    );
});

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
