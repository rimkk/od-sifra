import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Avatar, Badge, EmptyState, Card } from '@/components/ui';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  totalProperties: number;
  activeProperties: number;
  totalMonthlyRent: number;
  daysSinceOnboarding: number;
  assignedEmployee?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function CustomersScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = async () => {
    try {
      const response = await adminApi.getCustomers();
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <Card
      variant="outlined"
      style={styles.customerCard}
      onPress={() => router.push(`/customer/${item.id}`)}
    >
      <View style={styles.customerHeader}>
        <Avatar name={item.name} size={48} />
        <View style={styles.customerInfo}>
          <Text style={[styles.customerName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.customerEmail, { color: theme.colors.textSecondary }]}>
            {item.email}
          </Text>
        </View>
        <Badge
          text={item.isActive ? 'Active' : 'Inactive'}
          variant={item.isActive ? 'success' : 'default'}
          size="sm"
        />
      </View>

      <View style={styles.customerStats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {item.totalProperties}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Properties
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {formatCurrency(item.totalMonthlyRent)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Monthly Rent
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {item.daysSinceOnboarding}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Days
          </Text>
        </View>
      </View>

      {item.assignedEmployee && (
        <View style={[styles.assignedEmployee, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.assignedText, { color: theme.colors.textSecondary }]}>
            Managed by {item.assignedEmployee.name}
          </Text>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading customers...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {user?.role === 'ADMIN' && (
        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: theme.colors.secondary }]}
          onPress={() => router.push('/invite')}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.inviteButtonText}>Invite Customer</Text>
        </TouchableOpacity>
      )}

      {customers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Customers Yet"
          description="Customers will appear here once they're added."
          actionLabel="Invite Customer"
          onAction={() => router.push('/invite')}
        />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSize.md,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
  },
  customerCard: {
    marginBottom: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  customerEmail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E1E4E8',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  assignedEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  assignedText: {
    fontSize: fontSize.sm,
  },
});
