'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: '📋',
  TASK_UPDATED: '✏️',
  TASK_COMMENT: '💬',
  MESSAGE_RECEIVED: '✉️',
  INVITE_RECEIVED: '📨',
  BOARD_SHARED: '📁',
  MENTION: '@',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
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

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Notifications</h1>
          <p className="text-xs sm:text-sm text-[var(--text-tertiary)] mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
          >
            <CheckCheck size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Mark all read</span>
            <span className="sm:hidden">Read all</span>
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 sm:mb-6 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] w-full sm:w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            filter === 'unread'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <Bell className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)]">
            {filter === 'unread'
              ? 'You\'re all caught up!'
              : 'You\'ll see notifications here when something happens.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 sm:p-4 transition-colors ${
                !notification.isRead ? 'border-l-2 border-l-[var(--primary)]' : ''
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                {/* Icon */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                  {TYPE_ICONS[notification.type] || '🔔'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs sm:text-sm font-medium ${!notification.isRead ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-[10px] sm:text-sm text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-[var(--text-muted)] flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 mt-2">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                        className="text-[10px] sm:text-xs text-[var(--primary)] hover:underline"
                      >
                        View
                      </Link>
                    )}
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-[10px] sm:text-xs text-[var(--text-tertiary)] hover:text-[var(--text)]"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-[10px] sm:text-xs text-[var(--text-tertiary)] hover:text-[var(--error)] ml-auto p-1"
                    >
                      <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
