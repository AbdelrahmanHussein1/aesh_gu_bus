import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { AppProvider } from '../src/app-context';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0b0f19' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0b0f19' },
          statusBarStyle: 'light',
          statusBarColor: '#0b0f19',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Bus Aesh' }} />
        <Stack.Screen name="scanner" options={{ title: 'QR Boarding Scanner' }} />
      </Stack>
    </AppProvider>
  );
}
