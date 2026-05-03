import React, { memo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30_000,
        },
        mutations: {
            retry: 0,
        },
    },
});

interface AppProvidersProps {
    children: React.ReactNode;
}

export const AppProviders = memo<AppProvidersProps>(({ children }) => (
    <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </SafeAreaProvider>
    </GestureHandlerRootView>
));

const styles = StyleSheet.create({
    root: { flex: 1 },
});
