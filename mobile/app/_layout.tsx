import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="menu/[id]" />
          <Stack.Screen name="saved" />
          <Stack.Screen name="profile" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
