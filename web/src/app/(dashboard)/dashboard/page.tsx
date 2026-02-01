'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutGrid, Plus, Users, MessageSquare, Bell, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { boardApi, notificationApi, threadApi } from '@/lib/api';

interface Board {
  id: string;
  name: string;
  type: string;
  color?: string;
  taskCount: number;
  _count: { groups: number };
}

export default function DashboardPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      fetchData();
    }
  }, [currentWorkspace]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boardsRes, notifRes, threadsRes] = await Promise.all([
        boardApi.getByWorkspace(currentWorkspace!.id),
        notificationApi.getAll(true),
        threadApi.getAll(),
      ]);

      setBoards(boardsRes.data.boards || []);
      setUnreadNotifications(notifRes.data.unreadCount || 0);
      
      const totalUnread = (threadsRes.data.threads || []).reduce(
        (sum: number, t: any) => sum + (t.unreadCount || 0),
        0
      );
      setUnreadMessages(totalUnread);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'OWNER_ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const boardTypeColor = (type: string) => {
    switch (type) {
      case 'PROPERTY': return 'bg-emerald-500';
      case 'PROJECT': return 'bg-blue-500';
      case 'CRM': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text)]">
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Here&apos;s what&apos;s happening in {currentWorkspace?.name}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
              <LayoutGrid size={18} className="text-[var(--primary)] sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text)]">{boards.length}</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] truncate">Active Boards</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--info)]/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={18} className="text-[var(--info)] sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text)]">{unreadMessages}</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] truncate">Unread Messages</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center flex-shrink-0">
              <Bell size={18} className="text-[var(--warning)] sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text)]">{unreadNotifications}</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] truncate">Notifications</p>
            </div>
          </div>
        </div>

        {(isAdmin || isEmployee) && (
          <Link href="/admin/users" className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4 hover:border-[var(--primary)] transition-colors">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-[var(--accent)] sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">Manage Team</p>
                <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] truncate">Invite & manage</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Boards Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text)]">Your Boards</h2>
          {(isAdmin || isEmployee) && (
            <Link
              href="/boards/new"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">New Board</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}
        </div>

        {boards.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
            <LayoutGrid className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
            <h3 className="font-medium text-[var(--text)] mb-1">No boards yet</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              {isAdmin || isEmployee
                ? 'Create your first board to get started.'
                : 'You haven\'t been added to any boards yet.'}
            </p>
            {(isAdmin || isEmployee) && (
              <Link
                href="/boards/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                <Plus size={16} />
                Create Board
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {boards.slice(0, 6).map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4 hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex items-start gap-3 mb-2 sm:mb-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${board.color || boardTypeColor(board.type)} flex items-center justify-center text-white text-base sm:text-lg font-semibold flex-shrink-0`}>
                    {board.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base text-[var(--text)] truncate group-hover:text-[var(--primary)]">
                      {board.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] capitalize">
                      {board.type.toLowerCase()} board
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-[var(--text-tertiary)]">
                  <span>{board.taskCount} items</span>
                  <span>{board._count?.groups || 0} groups</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {boards.length > 6 && (
          <Link
            href="/boards"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-[var(--primary)] hover:underline"
          >
            View all boards
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      {(isAdmin || isEmployee) && (
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/boards/new?type=PROPERTY"
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4 hover:border-emerald-500 transition-colors group"
            >
              <div className="flex sm:block items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center sm:mb-3 group-hover:bg-emerald-500/20 flex-shrink-0">
                  <Plus size={18} className="text-emerald-500 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[var(--text)] sm:mb-1">Property Board</h3>
                  <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">Track properties, rent, and tenants</p>
                </div>
              </div>
            </Link>

            <Link
              href="/boards/new?type=PROJECT"
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4 hover:border-blue-500 transition-colors group"
            >
              <div className="flex sm:block items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center sm:mb-3 group-hover:bg-blue-500/20 flex-shrink-0">
                  <Plus size={18} className="text-blue-500 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[var(--text)] sm:mb-1">Project Board</h3>
                  <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">Manage tasks and deadlines</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/invite"
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4 hover:border-purple-500 transition-colors group"
            >
              <div className="flex sm:block items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-500/10 flex items-center justify-center sm:mb-3 group-hover:bg-purple-500/20 flex-shrink-0">
                  <UserPlus size={18} className="text-purple-500 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[var(--text)] sm:mb-1">Invite Team</h3>
                  <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">Add employees or customers</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
