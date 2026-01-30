import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Button, Input, Card } from '@/components/ui';
import { invitationApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';

type InviteRole = 'EMPLOYEE' | 'CUSTOMER';

export default function InviteScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<{
    token: string;
    links: { app: string; web: string };
  } | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const handleInvite = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await invitationApi.create({ email, role });
      setInvitation({
        token: response.data.invitation.token,
        links: response.data.links,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!invitation) return;

    try {
      await Share.share({
        message: `You've been invited to join Od Sifra as a ${role.toLowerCase()}!\n\nClick this link to register: ${invitation.links.web}`,
        title: 'Od Sifra Invitation',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleSendAnother = () => {
    setEmail('');
    setInvitation(null);
  };

  if (invitation) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: theme.colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.colors.text }]}>
            Invitation Sent!
          </Text>
          <Text style={[styles.successText, { color: theme.colors.textSecondary }]}>
            An invitation has been created for {email}
          </Text>

          <Card variant="outlined" style={styles.linkCard}>
            <Text style={[styles.linkLabel, { color: theme.colors.textSecondary }]}>
              Invitation Link
            </Text>
            <Text
              style={[styles.linkText, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {invitation.links.web}
            </Text>
          </Card>

          <Button
            title="Share Invitation"
            onPress={handleShare}
            fullWidth
            style={styles.shareButton}
          />
          <Button
            title="Send Another Invitation"
            onPress={handleSendAnother}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Send Invitation
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Invite someone to join Od Sifra
        </Text>

        <Input
          label="Email Address"
          placeholder="Enter email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon="mail-outline"
        />

        {isAdmin && (
          <>
            <Text style={[styles.roleLabel, { color: theme.colors.text }]}>
              Select Role
            </Text>
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    borderColor:
                      role === 'CUSTOMER' ? theme.colors.secondary : theme.colors.border,
                    backgroundColor:
                      role === 'CUSTOMER'
                        ? `${theme.colors.secondary}10`
                        : 'transparent',
                  },
                ]}
                onPress={() => setRole('CUSTOMER')}
              >
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={
                    role === 'CUSTOMER'
                      ? theme.colors.secondary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.roleOptionText,
                    {
                      color:
                        role === 'CUSTOMER'
                          ? theme.colors.secondary
                          : theme.colors.text,
                    },
                  ]}
                >
                  Customer
                </Text>
                <Text
                  style={[styles.roleOptionDesc, { color: theme.colors.textSecondary }]}
                >
                  Can view properties and communicate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    borderColor:
                      role === 'EMPLOYEE' ? theme.colors.secondary : theme.colors.border,
                    backgroundColor:
                      role === 'EMPLOYEE'
                        ? `${theme.colors.secondary}10`
                        : 'transparent',
                  },
                ]}
                onPress={() => setRole('EMPLOYEE')}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={24}
                  color={
                    role === 'EMPLOYEE'
                      ? theme.colors.secondary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.roleOptionText,
                    {
                      color:
                        role === 'EMPLOYEE'
                          ? theme.colors.secondary
                          : theme.colors.text,
                    },
                  ]}
                >
                  Employee
                </Text>
                <Text
                  style={[styles.roleOptionDesc, { color: theme.colors.textSecondary }]}
                >
                  Can manage customers and properties
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Button
          title="Send Invitation"
          onPress={handleInvite}
          loading={loading}
          fullWidth
          style={styles.submitButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
  },
  roleLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  roleOptions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleOption: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  roleOptionDesc: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  successContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  linkCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  linkLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  linkText: {
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareButton: {
    marginBottom: spacing.md,
  },
});
