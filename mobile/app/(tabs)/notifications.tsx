import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { EmptyState, Button } from '@/components/ui';
import { useNotificationStore, Notification, NotificationType } from '@/store/notifications';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
  const theme = useTheme();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'swap-horizontal-outline';
      case 'VISIT_SCHEDULED':
      case 'VISIT_COMPLETED':
        return 'calendar-outline';
      case 'MESSAGE':
        return 'chatbubble-outline';
      case 'RENOVATION_UPDATE':
        return 'construct-outline';
      case 'SYSTEM':
      default:
        return 'information-circle-outline';
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return theme.colors.info;
      case 'VISIT_SCHEDULED':
      case 'VISIT_COMPLETED':
        return theme.colors.warning;
      case 'MESSAGE':
        return theme.colors.success;
      case 'RENOVATION_UPDATE':
        return theme.colors.primary;
      case 'SYSTEM':
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.isRead ? 'transparent' : theme.colors.surfaceSecondary,
          borderBottomColor: theme.colors.border,
        },
      ]}
      onPress={() => !item.isRead && markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${getNotificationColor(item.type)}20` },
        ]}
      >
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={20}
          color={getNotificationColor(item.type)}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text
          style={[
            styles.notificationTitle,
            {
              color: theme.colors.text,
              fontWeight: item.isRead ? '400' : '600',
            },
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.notificationBody, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text style={[styles.timestamp, { color: theme.colors.textTertiary }]}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      {!item.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.secondary }]} />
      )}
    </TouchableOpacity>
  );

  if (isLoading && notifications.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="notifications-outline"
          title="No Notifications"
          description="You're all caught up! New notifications will appear here."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {unreadCount > 0 && (
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.unreadText, { color: theme.colors.textSecondary }]}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllRead, { color: theme.colors.secondary }]}>
              Mark all as read
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  unreadText: {
    fontSize: fontSize.sm,
  },
  markAllRead: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  notificationBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
    alignSelf: 'center',
  },
});
