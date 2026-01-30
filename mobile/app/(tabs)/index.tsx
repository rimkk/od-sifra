import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Card, Badge, EmptyState } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { propertyApi, adminApi } from '@/services/api';

interface Property {
  id: string;
  address: string;
  city: string;
  monthlyRent: number;
  purchaseCost: number;
  tenantName?: string;
  rentalStart?: string;
  rentalEnd?: string;
  status: 'ACTIVE' | 'VACANT' | 'RENOVATION' | 'SOLD';
  renovations?: { id: string; title: string; status: string }[];
}

interface AdminOverview {
  totalCustomers: number;
  totalEmployees: number;
  totalProperties: number;
  activeProperties: number;
  vacantProperties: number;
  totalMonthlyRent: number;
  estimatedAnnualRevenue: number;
  recentCustomers: { id: string; name: string; email: string; createdAt: string }[];
}

export default function HomeScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const response = await adminApi.getOverview();
        setAdminOverview(response.data.overview);
      } else {
        const [propertiesRes, financialsRes] = await Promise.all([
          propertyApi.getAll(),
          isCustomer ? propertyApi.getFinancials(user!.id) : Promise.resolve(null),
        ]);
        setProperties(propertiesRes.data.properties || []);
        if (financialsRes) setFinancials(financialsRes.data.financials);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge text="Active" variant="success" size="sm" />;
      case 'VACANT':
        return <Badge text="Vacant" variant="warning" size="sm" />;
      case 'RENOVATION':
        return <Badge text="Renovation" variant="info" size="sm" />;
      case 'SOLD':
        return <Badge text="Sold" variant="default" size="sm" />;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Admin Dashboard
  if (isAdmin && adminOverview) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.greeting, { color: theme.colors.text }]}>
          Welcome, {user?.name}
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard} variant="outlined">
            <Ionicons name="people" size={24} color={theme.colors.info} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {adminOverview.totalCustomers}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Customers
            </Text>
          </Card>
          <Card style={styles.statCard} variant="outlined">
            <Ionicons name="briefcase" size={24} color={theme.colors.warning} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {adminOverview.totalEmployees}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Employees
            </Text>
          </Card>
          <Card style={styles.statCard} variant="outlined">
            <Ionicons name="home" size={24} color={theme.colors.success} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {adminOverview.totalProperties}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Properties
            </Text>
          </Card>
          <Card style={styles.statCard} variant="outlined">
            <Ionicons name="cash" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(adminOverview.totalMonthlyRent)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Monthly Rent
            </Text>
          </Card>
        </View>

        {/* Revenue Card */}
        <Card variant="elevated" style={styles.revenueCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Revenue Overview
          </Text>
          <View style={styles.revenueRow}>
            <View>
              <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>
                Active Properties
              </Text>
              <Text style={[styles.revenueValue, { color: theme.colors.success }]}>
                {adminOverview.activeProperties}
              </Text>
            </View>
            <View>
              <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>
                Vacant
              </Text>
              <Text style={[styles.revenueValue, { color: theme.colors.warning }]}>
                {adminOverview.vacantProperties}
              </Text>
            </View>
            <View>
              <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>
                Est. Annual
              </Text>
              <Text style={[styles.revenueValue, { color: theme.colors.text }]}>
                {formatCurrency(adminOverview.estimatedAnnualRevenue)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Recent Customers */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Recent Customers
        </Text>
        {adminOverview.recentCustomers.map((customer) => (
          <Card
            key={customer.id}
            variant="outlined"
            style={styles.customerCard}
            onPress={() => router.push(`/customer/${customer.id}`)}
          >
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: theme.colors.text }]}>
                {customer.name}
              </Text>
              <Text style={[styles.customerEmail, { color: theme.colors.textSecondary }]}>
                {customer.email}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </Card>
        ))}
      </ScrollView>
    );
  }

  // Customer/Employee Properties View
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.greeting, { color: theme.colors.text }]}>
        Welcome, {user?.name}
      </Text>

      {/* Financials Summary for Customer */}
      {isCustomer && financials && (
        <Card variant="elevated" style={styles.financialsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Financial Summary
          </Text>
          <View style={styles.financialsGrid}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                Total Properties
              </Text>
              <Text style={[styles.financialValue, { color: theme.colors.text }]}>
                {financials.totalProperties}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                Monthly Income
              </Text>
              <Text style={[styles.financialValue, { color: theme.colors.success }]}>
                {formatCurrency(financials.totalMonthlyRent)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                Total Investment
              </Text>
              <Text style={[styles.financialValue, { color: theme.colors.text }]}>
                {formatCurrency(financials.totalPurchaseCost)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                Annual Estimate
              </Text>
              <Text style={[styles.financialValue, { color: theme.colors.primary }]}>
                {formatCurrency(financials.estimatedAnnualIncome)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Properties List */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Your Properties
      </Text>

      {properties.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="No Properties Yet"
          description="Your properties will appear here once added."
        />
      ) : (
        properties.map((property) => (
          <Card
            key={property.id}
            variant="outlined"
            style={styles.propertyCard}
            onPress={() => router.push(`/property/${property.id}`)}
          >
            <View style={styles.propertyHeader}>
              <View style={styles.propertyInfo}>
                <Text style={[styles.propertyAddress, { color: theme.colors.text }]}>
                  {property.address}
                </Text>
                <Text style={[styles.propertyCity, { color: theme.colors.textSecondary }]}>
                  {property.city}
                </Text>
              </View>
              {getStatusBadge(property.status)}
            </View>

            <View style={styles.propertyDetails}>
              <View style={styles.propertyDetail}>
                <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.propertyDetailText, { color: theme.colors.text }]}>
                  {formatCurrency(Number(property.monthlyRent))}/mo
                </Text>
              </View>
              {property.tenantName && (
                <View style={styles.propertyDetail}>
                  <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.propertyDetailText, { color: theme.colors.text }]}>
                    {property.tenantName}
                  </Text>
                </View>
              )}
            </View>

            {property.renovations && property.renovations.length > 0 && (
              <View style={[styles.renovationBanner, { backgroundColor: theme.colors.infoBg }]}>
                <Ionicons name="construct-outline" size={14} color={theme.colors.info} />
                <Text style={[styles.renovationText, { color: theme.colors.info }]}>
                  {property.renovations.length} active renovation(s)
                </Text>
              </View>
            )}
          </Card>
        ))
      )}
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
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  revenueCard: {
    marginBottom: spacing.lg,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  revenueLabel: {
    fontSize: fontSize.sm,
  },
  revenueValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  customerEmail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  financialsCard: {
    marginBottom: spacing.lg,
  },
  financialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  financialItem: {
    width: '50%',
    marginBottom: spacing.md,
  },
  financialLabel: {
    fontSize: fontSize.sm,
  },
  financialValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  propertyCard: {
    marginBottom: spacing.md,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  propertyInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  propertyAddress: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  propertyCity: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  propertyDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  propertyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  propertyDetailText: {
    fontSize: fontSize.sm,
  },
  renovationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  renovationText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
