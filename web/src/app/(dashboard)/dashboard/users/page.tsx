'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, Users, UserCheck, UserX, Search } from 'lucide-react';
import { Button, Card } from '@/components/ui';
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
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success-bg)] text-[var(--success)]">
            <UserCheck size={12} />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning-bg)] text-[var(--warning)]">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error-bg)] text-[var(--error)]">
            <UserX size={12} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-500/10 text-purple-500',
      EMPLOYEE: 'bg-blue-500/10 text-blue-500',
      CUSTOMER: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || colors.CUSTOMER}`}>
        {role.charAt(0) + role.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text)]">User Management</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Approve new users and manage existing accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--warning-bg)]">
              <Clock className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--text)]">{pendingUsers.length}</p>
              <p className="text-sm text-[var(--text-secondary)]">Pending Approval</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--success-bg)]">
              <UserCheck className="w-5 h-5 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--text)]">
                {allUsers.filter((u) => u.approvalStatus === 'APPROVED').length}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">Approved Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--surface-secondary)]">
              <Users className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--text)]">{allUsers.length}</p>
              <p className="text-sm text-[var(--text-secondary)]">Total Users</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-primary text-white'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Pending ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-primary text-white'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          All Users ({allUsers.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : activeTab === 'pending' ? (
        <div className="space-y-3">
          {pendingUsers.length === 0 ? (
            <Card className="p-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-[var(--text-tertiary)]" />
              <p className="text-[var(--text-secondary)]">No pending approval requests</p>
            </Card>
          ) : (
            pendingUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--text)]">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text)]">{user.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Requested {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(user.id)}
                      loading={actionLoading === user.id}
                      className="text-[var(--error)] border-[var(--error)] hover:bg-[var(--error-bg)]"
                    >
                      <X size={16} className="mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                      loading={actionLoading === user.id}
                    >
                      <Check size={16} className="mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* User list */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-secondary)]"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center">
                            <span className="text-xs font-medium text-[var(--text)]">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text)]">{user.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                      <td className="py-3 px-4">{getStatusBadge(user.approvalStatus)}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
