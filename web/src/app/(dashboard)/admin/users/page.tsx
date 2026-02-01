'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Mail, Shield, User, MoreHorizontal, Trash2, Loader2, X, Edit2, Phone, Lock, CheckCircle, Copy } from 'lucide-react';
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
  token: string;
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
  CUSTOMER: 'bg-emerald-500',
};

export default function UsersPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'invites'>('members');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  
  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', role: 'CUSTOMER', password: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState<{ name: string; email: string; password: string } | null>(null);
  
  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const isAdmin = user?.role === 'OWNER_ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canManageMembers = isAdmin || isEmployee;

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) {
      setAddError('No workspace selected');
      return;
    }
    
    if (!addForm.name.trim() || !addForm.email.trim()) {
      setAddError('Name and email are required');
      return;
    }
    
    setAddError('');
    setAddLoading(true);
    
    try {
      console.log('Adding member:', { workspaceId: currentWorkspace.id, ...addForm });
      const res = await workspaceApi.addMember(currentWorkspace.id, {
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        phone: addForm.phone.trim() || undefined,
        role: addForm.role,
        password: addForm.password || undefined,
      });
      
      console.log('Add member response:', res.data);
      
      setAddSuccess({
        name: addForm.name,
        email: addForm.email,
        password: addForm.password || 'Welcome123!',
      });
      setAddForm({ name: '', email: '', phone: '', role: 'CUSTOMER', password: '' });
      fetchData();
    } catch (err: any) {
      console.error('Add member error:', err.response?.data || err);
      setAddError(err.response?.data?.error || err.message || 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember || !currentWorkspace) return;
    
    setEditLoading(true);
    try {
      await workspaceApi.updateMember(currentWorkspace.id, editingMember.user.id, { role: editRole });
      setEditingMember(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update role');
    } finally {
      setEditLoading(false);
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

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(url);
    alert('Invite link copied!');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({ name: '', email: '', phone: '', role: 'CUSTOMER', password: '' });
    setAddError('');
    setAddSuccess(null);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Team</h1>
          <p className="text-xs sm:text-sm text-[var(--text-tertiary)] mt-0.5">
            Manage workspace members and invitations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <UserPlus size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </button>
          <Link
            href="/admin/invite"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-xs sm:text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors"
          >
            <Mail size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Send Invite</span>
            <span className="sm:hidden">Invite</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] mb-1">Total Members</p>
          <p className="text-xl sm:text-2xl font-semibold text-[var(--text)]">{members.length}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] mb-1">Customers</p>
          <p className="text-xl sm:text-2xl font-semibold text-emerald-500">
            {members.filter((m) => m.role === 'CUSTOMER').length}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] mb-1">Pending</p>
          <p className="text-xl sm:text-2xl font-semibold text-[var(--warning)]">{pendingInvites.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 sm:mb-6 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] w-full sm:w-fit">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            tab === 'members'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setTab('invites')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            tab === 'invites'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          Invites ({pendingInvites.length})
        </button>
      </div>

      {/* Content */}
      {tab === 'members' ? (
        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 sm:p-12 text-center">
              <Users className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <h3 className="font-medium text-[var(--text)] mb-1">No members yet</h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">Add customers or employees to this workspace.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
              >
                <UserPlus size={16} />
                Add Member
              </button>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium flex-shrink-0">
                  {member.user.avatarUrl ? (
                    <img src={member.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    member.user.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm sm:text-base text-[var(--text)] truncate">{member.user.name}</p>
                    {member.user.id === user?.id && (
                      <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">(You)</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-tertiary)] truncate">{member.user.email}</p>
                </div>

                <div className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium text-white ${ROLE_COLORS[member.role]} flex-shrink-0`}>
                  {ROLE_LABELS[member.role]}
                </div>

                {isAdmin && member.user.id !== user?.id && member.role !== 'OWNER_ADMIN' && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuOpen === member.id && (
                      <div className="absolute top-full right-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-10 py-1">
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            setEditingMember(member);
                            setEditRole(member.role);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-hover)]"
                        >
                          <Edit2 size={14} />
                          Change Role
                        </button>
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
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 sm:p-12 text-center">
              <Mail className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <h3 className="font-medium text-[var(--text)] mb-1">No pending invites</h3>
              <p className="text-sm text-[var(--text-tertiary)]">All invitations have been accepted or expired.</p>
            </div>
          ) : (
            pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 sm:p-4"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
                    <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-[var(--text)] truncate">{invite.email}</p>
                    <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">
                      by {invite.invitedBy.name}
                    </p>
                  </div>

                  <div className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium text-white ${ROLE_COLORS[invite.role]} flex-shrink-0`}>
                    {ROLE_LABELS[invite.role]}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => copyInviteLink(invite.token)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded border border-[var(--border)]"
                  >
                    <Copy size={12} />
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleResendInvite(invite.id)}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface)]">
              <div>
                <h2 className="font-semibold text-[var(--text)]">Add Member</h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Create account directly</p>
              </div>
              <button onClick={closeAddModal} className="p-2 rounded-lg hover:bg-[var(--surface-hover)]">
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {addSuccess ? (
              <div className="p-5 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-medium text-[var(--text)] mb-1">Member Added!</h3>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {addSuccess.name} has been added to the workspace.
                </p>
                
                <div className="bg-[var(--surface-hover)] rounded-lg p-4 text-left mb-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">Login Credentials:</p>
                  <p className="text-sm text-[var(--text)]"><strong>Email:</strong> {addSuccess.email}</p>
                  <p className="text-sm text-[var(--text)]"><strong>Password:</strong> {addSuccess.password}</p>
                </div>

                <button
                  onClick={closeAddModal}
                  className="w-full h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddMember} className="p-5 space-y-4">
                {addError && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-sm text-red-500">
                    {addError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="John Smith"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Phone (optional)
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="tel"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Password (optional)
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="Leave empty for default: Welcome123!"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Default password: Welcome123!</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'CUSTOMER', label: 'Customer', desc: 'View assigned boards', color: 'emerald' },
                      { id: 'EMPLOYEE', label: 'Employee', desc: 'Manage boards & tasks', color: 'blue', adminOnly: true },
                    ].map((role) => {
                      if (role.adminOnly && !isAdmin) return null;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setAddForm({ ...addForm, role: role.id })}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            addForm.role === role.id
                              ? `border-${role.color}-500 bg-${role.color}-500/10`
                              : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          <p className={`font-medium text-sm ${addForm.role === role.id ? `text-${role.color}-500` : 'text-[var(--text)]'}`}>
                            {role.label}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">{role.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading || !addForm.name || !addForm.email}
                    className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] disabled:opacity-50 flex items-center justify-center"
                  >
                    {addLoading ? <Loader2 size={16} className="animate-spin" /> : 'Add Member'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text)]">Change Role</h2>
              <button onClick={() => setEditingMember(null)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)]">
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--surface-hover)] rounded-lg">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium">
                  {editingMember.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[var(--text)]">{editingMember.user.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{editingMember.user.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">New Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingMember(null)}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  disabled={editLoading || editRole === editingMember.role}
                  className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {editLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
