import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Card, Badge, Button } from '@/components/ui';
import { propertyApi } from '@/services/api';
import { format } from 'date-fns';

interface Property {
  id: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  description?: string;
  purchaseCost: number;
  monthlyRent: number;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  rentalStart?: string;
  rentalEnd?: string;
  status: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  renovations: {
    id: string;
    title: string;
    status: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    steps: {
      id: string;
      title: string;
      status: string;
      dueDate?: string;
    }[];
  }[];
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await propertyApi.getById(id!);
      setProperty(response.data.property);
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge text="Active" variant="success" />;
      case 'VACANT':
        return <Badge text="Vacant" variant="warning" />;
      case 'RENOVATION':
        return <Badge text="Renovation" variant="info" />;
      case 'SOLD':
        return <Badge text="Sold" variant="default" />;
      default:
        return null;
    }
  };

  const getRenovationStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <Badge text="Planned" variant="default" size="sm" />;
      case 'IN_PROGRESS':
        return <Badge text="In Progress" variant="info" size="sm" />;
      case 'COMPLETED':
        return <Badge text="Completed" variant="success" size="sm" />;
      case 'CANCELLED':
        return <Badge text="Cancelled" variant="error" size="sm" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Property not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.address, { color: theme.colors.text }]}>
          {property.address}
        </Text>
        <Text style={[styles.location, { color: theme.colors.textSecondary }]}>
          {property.city}, {property.postalCode} {property.country}
        </Text>
        <View style={styles.statusRow}>
          {getStatusBadge(property.status)}
        </View>
      </View>

      {/* Financials Card */}
      <Card variant="elevated" style={styles.financialsCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Financial Details
        </Text>
        <View style={styles.financialsGrid}>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
              Purchase Cost
            </Text>
            <Text style={[styles.financialValue, { color: theme.colors.text }]}>
              {formatCurrency(Number(property.purchaseCost))}
            </Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
              Monthly Rent
            </Text>
            <Text style={[styles.financialValue, { color: theme.colors.success }]}>
              {formatCurrency(Number(property.monthlyRent))}
            </Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
              Annual Income
            </Text>
            <Text style={[styles.financialValue, { color: theme.colors.primary }]}>
              {formatCurrency(Number(property.monthlyRent) * 12)}
            </Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
              ROI
            </Text>
            <Text style={[styles.financialValue, { color: theme.colors.info }]}>
              {((Number(property.monthlyRent) * 12 / Number(property.purchaseCost)) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Tenant Info */}
      {property.tenantName && (
        <Card variant="outlined" style={styles.tenantCard}>
          <View style={styles.tenantHeader}>
            <Ionicons name="person" size={24} color={theme.colors.secondary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: spacing.sm }]}>
              Current Tenant
            </Text>
          </View>
          <View style={styles.tenantInfo}>
            <Text style={[styles.tenantName, { color: theme.colors.text }]}>
              {property.tenantName}
            </Text>
            {property.tenantEmail && (
              <Text style={[styles.tenantContact, { color: theme.colors.textSecondary }]}>
                {property.tenantEmail}
              </Text>
            )}
            {property.tenantPhone && (
              <Text style={[styles.tenantContact, { color: theme.colors.textSecondary }]}>
                {property.tenantPhone}
              </Text>
            )}
          </View>
          {property.rentalStart && property.rentalEnd && (
            <View style={[styles.rentalPeriod, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.rentalPeriodText, { color: theme.colors.textSecondary }]}>
                {format(new Date(property.rentalStart), 'MMM d, yyyy')} - {format(new Date(property.rentalEnd), 'MMM d, yyyy')}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Renovations */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>
        Renovations
      </Text>
      {property.renovations.length === 0 ? (
        <Card variant="outlined" style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No renovations for this property
          </Text>
        </Card>
      ) : (
        property.renovations.map((renovation) => (
          <Card
            key={renovation.id}
            variant="outlined"
            style={styles.renovationCard}
            onPress={() => router.push(`/renovation/${renovation.id}`)}
          >
            <View style={styles.renovationHeader}>
              <View style={styles.renovationInfo}>
                <Text style={[styles.renovationTitle, { color: theme.colors.text }]}>
                  {renovation.title}
                </Text>
                {renovation.budget && (
                  <Text style={[styles.renovationBudget, { color: theme.colors.textSecondary }]}>
                    Budget: {formatCurrency(Number(renovation.budget))}
                  </Text>
                )}
              </View>
              {getRenovationStatusBadge(renovation.status)}
            </View>

            {renovation.steps.length > 0 && (
              <View style={styles.stepsPreview}>
                <Text style={[styles.stepsCount, { color: theme.colors.textSecondary }]}>
                  {renovation.steps.filter((s) => s.status === 'COMPLETED').length} / {renovation.steps.length} steps completed
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.colors.success,
                        width: `${(renovation.steps.filter((s) => s.status === 'COMPLETED').length / renovation.steps.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {renovation.startDate && renovation.endDate && (
              <View style={styles.renovationDates}>
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.renovationDateText, { color: theme.colors.textSecondary }]}>
                  {format(new Date(renovation.startDate), 'MMM d')} - {format(new Date(renovation.endDate), 'MMM d, yyyy')}
                </Text>
              </View>
            )}
          </Card>
        ))
      )}

      {property.description && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>
            Description
          </Text>
          <Card variant="outlined">
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {property.description}
            </Text>
          </Card>
        </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  address: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  location: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  financialsCard: {
    marginBottom: spacing.md,
  },
  financialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  tenantCard: {
    marginBottom: spacing.md,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tenantInfo: {
    marginBottom: spacing.md,
  },
  tenantName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  tenantContact: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  rentalPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  rentalPeriodText: {
    fontSize: fontSize.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  renovationCard: {
    marginBottom: spacing.md,
  },
  renovationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  renovationInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  renovationTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  renovationBudget: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  stepsPreview: {
    marginTop: spacing.md,
  },
  stepsCount: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E1E4E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  renovationDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  renovationDateText: {
    fontSize: fontSize.sm,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
});
