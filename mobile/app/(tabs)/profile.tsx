import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Avatar, Card, Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Administrator', color: theme.colors.error };
      case 'EMPLOYEE':
        return { label: 'Employee', color: theme.colors.warning };
      case 'CUSTOMER':
        return { label: 'Customer', color: theme.colors.success };
      default:
        return { label: role, color: theme.colors.textSecondary };
    }
  };

  const roleBadge = getRoleBadge(user?.role || '');

  const MenuSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
      <Card variant="outlined" style={styles.menuCard}>
        {children}
      </Card>
    </View>
  );

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    showArrow = true,
    rightElement,
    destructive = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={destructive ? theme.colors.error : theme.colors.icon}
        />
        <Text
          style={[
            styles.menuItemLabel,
            { color: destructive ? theme.colors.error : theme.colors.text },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && (
          <Text style={[styles.menuItemValue, { color: theme.colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {rightElement}
        {showArrow && onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textTertiary}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <Avatar name={user?.name || ''} imageUrl={user?.avatarUrl} size={80} />
        <Text style={[styles.userName, { color: theme.colors.text }]}>
          {user?.name}
        </Text>
        <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
          {user?.email}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}20` }]}>
          <Text style={[styles.roleText, { color: roleBadge.color }]}>
            {roleBadge.label}
          </Text>
        </View>
      </View>

      {/* Account Section */}
      <MenuSection title="Account">
        <MenuItem
          icon="person-outline"
          label="Edit Profile"
          onPress={() => {}}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => {}}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label="Privacy & Security"
          onPress={() => {}}
        />
      </MenuSection>

      {/* Preferences Section */}
      <MenuSection title="Preferences">
        <MenuItem
          icon="notifications-outline"
          label="Push Notifications"
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.secondary,
              }}
            />
          }
        />
        <MenuItem
          icon="moon-outline"
          label="Appearance"
          value="System"
          onPress={() => {}}
        />
        <MenuItem
          icon="language-outline"
          label="Language"
          value="English"
          onPress={() => {}}
        />
      </MenuSection>

      {/* Admin/Employee Actions */}
      {(user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') && (
        <MenuSection title="Actions">
          <MenuItem
            icon="person-add-outline"
            label="Invite User"
            onPress={() => router.push('/invite')}
          />
          {user?.role === 'ADMIN' && (
            <MenuItem
              icon="people-outline"
              label="Manage Users"
              onPress={() => {}}
            />
          )}
        </MenuSection>
      )}

      {/* Support Section */}
      <MenuSection title="Support">
        <MenuItem
          icon="help-circle-outline"
          label="Help Center"
          onPress={() => {}}
        />
        <MenuItem
          icon="chatbubble-ellipses-outline"
          label="Contact Support"
          onPress={() => {}}
        />
        <MenuItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => {}}
        />
        <MenuItem
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => {}}
        />
      </MenuSection>

      {/* Sign Out */}
      <MenuSection title="">
        <MenuItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleLogout}
          showArrow={false}
          destructive
        />
      </MenuSection>

      {/* App Version */}
      <Text style={[styles.version, { color: theme.colors.textTertiary }]}>
        Od Sifra v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuItemLabel: {
    fontSize: fontSize.md,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemValue: {
    fontSize: fontSize.md,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
  },
});
