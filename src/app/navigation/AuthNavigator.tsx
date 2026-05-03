import React, { memo } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../../screens/auth/LoginScreen';
import { RegisterScreen } from '../../screens/auth/RegisterScreen';
import type { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = memo(() => (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#05050f' } }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
));
