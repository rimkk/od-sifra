import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme';
import { initializeSocket, disconnectSocket } from '@/services/socket';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoading, isAuthenticated, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initializeSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? colors.dark.background : colors.light.background;
  const headerBackground = isDark ? colors.dark.surface : colors.light.surface;
  const textColor = isDark ? colors.dark.text : colors.light.text;

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: headerBackground,
          },
          headerTintColor: textColor,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="property/[id]"
          options={{
            title: 'Property Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="renovation/[id]"
          options={{
            title: 'Renovation Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="chat/[userId]"
          options={{
            title: 'Chat',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="invite"
          options={{
            title: 'Send Invitation',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
