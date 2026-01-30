import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Card, Badge } from '@/components/ui';
import { renovationApi } from '@/services/api';
import { format } from 'date-fns';

interface RenovationStep {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  orderIndex: number;
}

interface Renovation {
  id: string;
  title: string;
  description?: string;
  status: string;
  budget?: number;
  actualCost?: number;
  startDate?: string;
  endDate?: string;
  steps: RenovationStep[];
  property: {
    address: string;
    customer: {
      id: string;
      name: string;
    };
  };
}

export default function RenovationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [renovation, setRenovation] = useState<Renovation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenovation();
  }, [id]);

  const fetchRenovation = async () => {
    try {
      const response = await renovationApi.getById(id!);
      setRenovation(response.data.renovation);
    } catch (error) {
      console.error('Failed to fetch renovation:', error);
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
      case 'PLANNED':
        return <Badge text="Planned" variant="default" />;
      case 'IN_PROGRESS':
        return <Badge text="In Progress" variant="info" />;
      case 'COMPLETED':
        return <Badge text="Completed" variant="success" />;
      case 'CANCELLED':
        return <Badge text="Cancelled" variant="error" />;
      default:
        return null;
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { name: 'checkmark-circle' as const, color: theme.colors.success };
      case 'IN_PROGRESS':
        return { name: 'time' as const, color: theme.colors.info };
      case 'CANCELLED':
        return { name: 'close-circle' as const, color: theme.colors.error };
      default:
        return { name: 'ellipse-outline' as const, color: theme.colors.textTertiary };
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  if (!renovation) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Renovation not found</Text>
      </View>
    );
  }

  const completedSteps = renovation.steps.filter((s) => s.status === 'COMPLETED').length;
  const progress = renovation.steps.length > 0 
    ? (completedSteps / renovation.steps.length) * 100 
    : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {renovation.title}
        </Text>
        <Text style={[styles.propertyAddress, { color: theme.colors.textSecondary }]}>
          {renovation.property.address}
        </Text>
        <View style={styles.statusRow}>
          {getStatusBadge(renovation.status)}
        </View>
      </View>

      {/* Progress Card */}
      <Card variant="elevated" style={styles.progressCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Progress
        </Text>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {completedSteps} of {renovation.steps.length} steps completed
          </Text>
          <Text style={[styles.progressPercent, { color: theme.colors.text }]}>
            {progress.toFixed(0)}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.success,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      </Card>

      {/* Budget Info */}
      {(renovation.budget || renovation.actualCost) && (
        <Card variant="outlined" style={styles.budgetCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Budget
          </Text>
          <View style={styles.budgetRow}>
            {renovation.budget && (
              <View style={styles.budgetItem}>
                <Text style={[styles.budgetLabel, { color: theme.colors.textSecondary }]}>
                  Planned
                </Text>
                <Text style={[styles.budgetValue, { color: theme.colors.text }]}>
                  {formatCurrency(Number(renovation.budget))}
                </Text>
              </View>
            )}
            {renovation.actualCost && (
              <View style={styles.budgetItem}>
                <Text style={[styles.budgetLabel, { color: theme.colors.textSecondary }]}>
                  Actual
                </Text>
                <Text
                  style={[
                    styles.budgetValue,
                    {
                      color:
                        Number(renovation.actualCost) > Number(renovation.budget)
                          ? theme.colors.error
                          : theme.colors.success,
                    },
                  ]}
                >
                  {formatCurrency(Number(renovation.actualCost))}
                </Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Timeline */}
      {(renovation.startDate || renovation.endDate) && (
        <Card variant="outlined" style={styles.timelineCard}>
          <View style={styles.timelineRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.timelineText, { color: theme.colors.textSecondary }]}>
              {renovation.startDate && format(new Date(renovation.startDate), 'MMM d, yyyy')}
              {renovation.startDate && renovation.endDate && ' - '}
              {renovation.endDate && format(new Date(renovation.endDate), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Description */}
      {renovation.description && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>
            Description
          </Text>
          <Card variant="outlined">
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {renovation.description}
            </Text>
          </Card>
        </>
      )}

      {/* Steps */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>
        Steps
      </Text>
      {renovation.steps.length === 0 ? (
        <Card variant="outlined" style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No steps added yet
          </Text>
        </Card>
      ) : (
        renovation.steps
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((step, index) => {
            const icon = getStepIcon(step.status);
            const isLast = index === renovation.steps.length - 1;

            return (
              <View key={step.id} style={styles.stepContainer}>
                <View style={styles.stepTimeline}>
                  <Ionicons name={icon.name} size={24} color={icon.color} />
                  {!isLast && (
                    <View
                      style={[
                        styles.stepLine,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                  )}
                </View>
                <Card variant="outlined" style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                      {step.title}
                    </Text>
                    {getStatusBadge(step.status)}
                  </View>
                  {step.description && (
                    <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                      {step.description}
                    </Text>
                  )}
                  <View style={styles.stepFooter}>
                    {step.dueDate && (
                      <View style={styles.stepDate}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={theme.colors.textTertiary}
                        />
                        <Text style={[styles.stepDateText, { color: theme.colors.textTertiary }]}>
                          Due: {format(new Date(step.dueDate), 'MMM d, yyyy')}
                        </Text>
                      </View>
                    )}
                    {step.completedAt && (
                      <View style={styles.stepDate}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={14}
                          color={theme.colors.success}
                        />
                        <Text style={[styles.stepDateText, { color: theme.colors.success }]}>
                          Completed: {format(new Date(step.completedAt), 'MMM d, yyyy')}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </View>
            );
          })
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  propertyAddress: {
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
  progressCard: {
    marginBottom: spacing.md,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: fontSize.sm,
  },
  progressPercent: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetCard: {
    marginBottom: spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  budgetItem: {
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: fontSize.sm,
  },
  budgetValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  timelineCard: {
    marginBottom: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineText: {
    fontSize: fontSize.md,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  stepTimeline: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
  },
  stepCard: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  stepFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stepDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDateText: {
    fontSize: fontSize.xs,
  },
});
