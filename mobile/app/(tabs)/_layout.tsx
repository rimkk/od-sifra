import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useAuthStore } from '@/store/auth';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuthStore();
  const isDark = colorScheme === 'dark';
  
  const tabBarBackground = isDark ? colors.dark.surface : colors.light.surface;
  const tabBarBorder = isDark ? colors.dark.border : colors.light.border;
  const activeColor = colors.secondary;
  const inactiveColor = isDark ? colors.dark.textTertiary : colors.light.textTertiary;

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarBackground,
          borderTopColor: tabBarBorder,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerStyle: {
          backgroundColor: tabBarBackground,
        },
        headerTintColor: isDark ? colors.dark.text : colors.light.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin ? 'Dashboard' : 'Properties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isAdmin ? 'grid-outline' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      {(isAdmin || isEmployee) && (
        <Tabs.Screen
          name="customers"
          options={{
            title: 'Customers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
