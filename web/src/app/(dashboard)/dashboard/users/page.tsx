'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, Users, UserCheck, UserX, Search } from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { userApi } from '@/lib/api';

interface PendingUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  isActive: boolean;
  approvalStatus: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes] = await Promise.all([
        userApi.getPending(),
        userApi.getAll(),
      ]);
      setPendingUsers(pendingRes.data.users);
      setAllUsers(allRes.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);
      await userApi.approve(userId);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to approve user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setActionLoading(userId);
      await userApi.reject(userId);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to reject user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-[var(--success-bg)] text-[var(--success)]',
      PENDING: 'bg-[var(--warning-bg)] text-[var(--warning)]',
      REJECTED: 'bg-[var(--error-bg)] text-[var(--error)]',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status] || ''}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'text-purple-500',
      EMPLOYEE: 'text-blue-500',
      CUSTOMER: 'text-[var(--text-tertiary)]',
    };
    return (
      <span className={`text-xs ${styles[role] || styles.CUSTOMER}`}>
        {role.charAt(0) + role.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-[var(--text)]">Users</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Manage user access and approvals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Pending</p>
          <p className="text-xl font-semibold text-[var(--warning)]">{pendingUsers.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Approved</p>
          <p className="text-xl font-semibold text-[var(--success)]">
            {allUsers.filter((u) => u.approvalStatus === 'APPROVED').length}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total</p>
          <p className="text-xl font-semibold text-[var(--text)]">{allUsers.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[var(--surface-secondary)] w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-[var(--background)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text)]'
          }`}
        >
          Pending ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-[var(--background)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text)]'
          }`}
        >
          All ({allUsers.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : activeTab === 'pending' ? (
        <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
          {pendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)]" strokeWidth={1.5} />
              <p className="text-sm text-[var(--text-tertiary)]">No pending requests</p>
            </div>
          ) : (
            pendingUsers.map((user) => (
              <div key={user.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={user.name} size="sm" />
                  <div>
                    <p className="text-sm text-[var(--text)]">{user.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={actionLoading === user.id}
                    className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={actionLoading === user.id}
                    className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--success)] hover:bg-[var(--success-bg)] transition-colors disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-tertiary)]"
            />
          </div>

          {/* User list */}
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={user.name} size="sm" />
                  <div>
                    <p className="text-sm text-[var(--text)]">{user.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.approvalStatus)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
