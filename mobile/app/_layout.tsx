// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Root Layout & Providers
// ---------------------------------------------------------------------------

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { AppProvider } from '../src/context/AppContext';
import { LoadingView } from '../src/components/LoadingView';

function RootNavigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!isAuthenticated && !inAuthGroup) {
      // Direct unauthenticated users to login
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Direct authenticated users to main app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return <LoadingView message="Initializing Pocket Ledger..." />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/transaction"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Transaction',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="modal/wallet"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Manage Account',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="modal/budget"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Monthly Budget',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="modal/csv"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Import Statement',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="modal/category"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Custom Category',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <RootNavigation />
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
