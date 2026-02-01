'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Mail, Shield, User, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { workspaceApi, inviteApi } from '@/lib/api';

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    phone?: string;
    role: string;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  invitedBy: { name: string };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER_ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
  CUSTOMER: 'Customer',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER_ADMIN: 'bg-purple-500',
  EMPLOYEE: 'bg-blue-500',
  CUSTOMER: 'bg-gray-500',
};

export default function UsersPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'invites'>('members');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const isAdmin = user?.role === 'OWNER_ADMIN';

  useEffect(() => {
    if (currentWorkspace) {
      fetchData();
    }
  }, [currentWorkspace]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, invitesRes] = await Promise.all([
        workspaceApi.getMembers(currentWorkspace!.id),
        inviteApi.getByWorkspace(currentWorkspace!.id),
      ]);
      setMembers(membersRes.data.members || []);
      setInvites(invitesRes.data.invites || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await workspaceApi.removeMember(currentWorkspace!.id, userId);
      fetchData();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await inviteApi.cancel(inviteId);
      fetchData();
    } catch (error) {
      console.error('Failed to cancel invite:', error);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await inviteApi.resend(inviteId);
      fetchData();
      alert('Invite resent!');
    } catch (error) {
      console.error('Failed to resend invite:', error);
    }
  };

  const pendingInvites = invites.filter((i) => i.status === 'PENDING');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Team</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Manage workspace members and invitations
          </p>
        </div>
        <Link
          href="/admin/invite"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <UserPlus size={16} />
          Invite
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Members</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{members.length}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Employees</p>
          <p className="text-2xl font-semibold text-[var(--text)]">
            {members.filter((m) => m.role === 'EMPLOYEE' || m.role === 'OWNER_ADMIN').length}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Pending Invites</p>
          <p className="text-2xl font-semibold text-[var(--warning)]">{pendingInvites.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] w-fit">
        <button
          onClick={() => setTab('members')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'members'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setTab('invites')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'invites'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          Pending Invites ({pendingInvites.length})
        </button>
      </div>

      {/* Content */}
      {tab === 'members' ? (
        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
              <Users className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <h3 className="font-medium text-[var(--text)] mb-1">No members yet</h3>
              <p className="text-sm text-[var(--text-tertiary)]">Invite people to join this workspace.</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium">
                  {member.user.avatarUrl ? (
                    <img src={member.user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    member.user.name.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text)]">{member.user.name}</p>
                    {member.user.id === user?.id && (
                      <span className="text-xs text-[var(--text-muted)]">(You)</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-tertiary)]">{member.user.email}</p>
                </div>

                <div className={`px-2 py-1 rounded text-xs font-medium text-white ${ROLE_COLORS[member.role]}`}>
                  {ROLE_LABELS[member.role]}
                </div>

                {isAdmin && member.user.id !== user?.id && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuOpen === member.id && (
                      <div className="absolute top-full right-0 mt-1 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-10 py-1">
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            handleRemoveMember(member.user.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--surface-hover)]"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pendingInvites.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
              <Mail className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <h3 className="font-medium text-[var(--text)] mb-1">No pending invites</h3>
              <p className="text-sm text-[var(--text-tertiary)]">All invitations have been accepted or expired.</p>
            </div>
          ) : (
            pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)]">
                  <Mail size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text)]">{invite.email}</p>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    Invited by {invite.invitedBy.name}
                  </p>
                </div>

                <div className={`px-2 py-1 rounded text-xs font-medium text-white ${ROLE_COLORS[invite.role]}`}>
                  {ROLE_LABELS[invite.role]}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvite(invite.id)}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
