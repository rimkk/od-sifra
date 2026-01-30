import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing, fontSize } from '@/theme';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { invitationApi } from '@/services/api';

export default function RegisterScreen() {
  const theme = useTheme();
  const { register } = useAuthStore();
  const { token } = useLocalSearchParams<{ token?: string }>();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(!!token);
  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    inviterName: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await invitationApi.validate(token!);
      setInvitation(response.data.invitation);
      setEmail(response.data.invitation.email);
    } catch (error: any) {
      Alert.alert(
        'Invalid Invitation',
        error.response?.data?.error || 'This invitation is invalid or expired',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } finally {
      setValidatingToken(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        email,
        password,
        name,
        invitationToken: token,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Validating invitation...
        </Text>
      </View>
    );
  }

  if (!token && !invitation) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Invitation Required</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
          Registration is by invitation only. Please contact an administrator to get invited.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Button title="Back to Login" variant="outline" style={{ marginTop: spacing.lg }} onPress={() => {}} />
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
          {invitation && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Invited by {invitation.inviterName} as {invitation.role.toLowerCase()}
            </Text>
          )}
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            leftIcon="person-outline"
            error={errors.name}
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
            error={errors.email}
            editable={!invitation}
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Text style={[styles.link, { color: theme.colors.secondary }]}>
                Sign In
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.md,
  },
  link: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
