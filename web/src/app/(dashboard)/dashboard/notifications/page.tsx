'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  MessageSquare,
  RefreshCw,
  Calendar,
  Hammer,
  Info,
  Check,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { notificationApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type NotificationType =
  | 'STATUS_CHANGE'
  | 'VISIT_SCHEDULED'
  | 'VISIT_COMPLETED'
  | 'MESSAGE'
  | 'RENOVATION_UPDATE'
  | 'SYSTEM';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationApi.getAll();
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return RefreshCw;
      case 'VISIT_SCHEDULED':
      case 'VISIT_COMPLETED':
        return Calendar;
      case 'MESSAGE':
        return MessageSquare;
      case 'RENOVATION_UPDATE':
        return Hammer;
      default:
        return Info;
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'text-[var(--info)] bg-[var(--info-bg)]';
      case 'VISIT_SCHEDULED':
      case 'VISIT_COMPLETED':
        return 'text-[var(--warning)] bg-[var(--warning-bg)]';
      case 'MESSAGE':
        return 'text-[var(--success)] bg-[var(--success-bg)]';
      case 'RENOVATION_UPDATE':
        return 'text-primary-dark bg-primary/20';
      default:
        return 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check size={16} className="mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card variant="outlined" className="text-center py-12">
          <Bell className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
          <p className="text-[var(--text-secondary)]">No notifications yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
              <Card
                key={notification.id}
                variant="outlined"
                className={cn(
                  'flex items-start gap-4 cursor-pointer transition-colors',
                  !notification.isRead && 'bg-[var(--surface-secondary)]'
                )}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className={cn('p-2 rounded-lg', getIconColor(notification.type))}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={cn(
                          'text-[var(--text)]',
                          !notification.isRead && 'font-semibold'
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {notification.body}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
