import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/app/providers/AppProviders';
import { AppNavigator } from './src/app/navigation/AppNavigator';

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <AppNavigator />
    </AppProviders>
  );
}
