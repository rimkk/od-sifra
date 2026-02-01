'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Mail, 
  Phone, 
  Edit2, 
  X,
  FolderKanban,
  User,
  UserPlus,
  Send,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { customerAccountApi, projectApi, invitationApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface CustomerAccount {
  id: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  users?: { id: string; name: string; email: string }[];
  _count?: { projects: number; properties: number; users: number };
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

type ModalStep = 'details' | 'invite';

export default function CustomersPage() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('details');
  const [editingAccount, setEditingAccount] = useState<CustomerAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  
  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteAccountId, setInviteAccountId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsRes, employeesRes] = await Promise.all([
        customerAccountApi.getAll(),
        projectApi.getEmployees(),
      ]);
      setAccounts(accountsRes.data.accounts || []);
      setEmployees(employeesRes.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      const result = await customerAccountApi.create({
        accountName: form.name,
        description: form.description || undefined,
      });
      setCreatedAccountId(result.data.customerAccount?.id || null);
      setModalStep('invite');
      fetchData();
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !form.name.trim()) return;

    try {
      setSaving(true);
      await customerAccountApi.update(editingAccount.id, {
        name: form.name,
        description: form.description || undefined,
      });
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    const accountId = inviteAccountId || createdAccountId;
    if (!accountId || !inviteEmails.trim()) return;

    const emails = inviteEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return;

    try {
      setInviting(true);
      await customerAccountApi.inviteUsers(accountId, emails);
      setInviteSuccess(true);
      setTimeout(() => {
        if (showInviteModal) {
          closeInviteModal();
        } else {
          closeModal();
        }
        fetchData();
      }, 1500);
    } catch (error) {
      console.error('Failed to invite users:', error);
    } finally {
      setInviting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', email: '', phone: '' });
    setModalStep('details');
    setCreatedAccountId(null);
    setInviteEmails('');
    setInviteSuccess(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    resetForm();
  };

  const openEdit = (account: CustomerAccount) => {
    setForm({
      name: account.name,
      description: account.description || '',
      email: account.email || '',
      phone: account.phone || '',
    });
    setEditingAccount(account);
    setShowModal(true);
  };

  const openInvite = (account: CustomerAccount) => {
    setInviteAccountId(account.id);
    setInviteEmails('');
    setInviteSuccess(false);
    setShowInviteModal(true);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteAccountId(null);
    setInviteEmails('');
    setInviteSuccess(false);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) =>
    searchQuery === '' ||
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Customers</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Manage customer accounts</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{accounts.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Active</p>
          <p className="text-2xl font-semibold text-[var(--success)]">{accounts.filter((a) => a.isActive).length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">With Projects</p>
          <p className="text-2xl font-semibold text-[var(--primary)]">
            {accounts.filter((a) => (a._count?.projects || 0) > 0).length}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Users</p>
          <p className="text-2xl font-semibold text-[var(--text)]">
            {accounts.reduce((sum, a) => sum + (a._count?.users || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">
                {editingAccount ? 'Edit Customer' : modalStep === 'details' ? 'Add Customer' : 'Invite Users'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {modalStep === 'details' ? (
                <form onSubmit={editingAccount ? handleUpdate : handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Smith Family"
                      className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Notes about this customer..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" loading={saving}>
                      {editingAccount ? 'Save' : 'Continue'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {inviteSuccess ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--success-light)] flex items-center justify-center">
                        <Check className="w-6 h-6 text-[var(--success)]" />
                      </div>
                      <p className="text-sm text-[var(--text)]">Invitations sent successfully!</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-lg bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>Invite users to access this customer account. They&apos;ll receive an email to set up their account.</span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email addresses</label>
                        <textarea
                          value={inviteEmails}
                          onChange={(e) => setInviteEmails(e.target.value)}
                          placeholder="Enter email addresses (one per line or comma-separated)"
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                          autoFocus
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                          Skip for now
                        </Button>
                        <Button onClick={handleInvite} className="flex-1" loading={inviting} disabled={!inviteEmails.trim()}>
                          <Send size={14} />
                          Send Invites
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal (for existing accounts) */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">Invite Users</h2>
              <button
                onClick={closeInviteModal}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {inviteSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--success-light)] flex items-center justify-center">
                    <Check className="w-6 h-6 text-[var(--success)]" />
                  </div>
                  <p className="text-sm text-[var(--text)]">Invitations sent successfully!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email addresses</label>
                    <textarea
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="Enter email addresses (one per line or comma-separated)"
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeInviteModal}>
                      Cancel
                    </Button>
                    <Button onClick={handleInvite} className="flex-1" loading={inviting} disabled={!inviteEmails.trim()}>
                      <Send size={14} />
                      Send Invites
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <Users className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {accounts.length === 0 ? 'No customers yet' : 'No matching customers'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {accounts.length === 0 
              ? 'Add your first customer to start managing their portfolios.'
              : 'Try adjusting your search criteria.'}
          </p>
          {accounts.length === 0 && (
            <Button size="sm" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={14} />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--text-muted)] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {account.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm text-[var(--text)]">{account.name}</h3>
                    {!account.isActive && (
                      <Badge text="Inactive" variant="default" size="xs" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                    {account.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {account.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FolderKanban size={12} />
                      {account._count?.projects || 0} projects
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {account._count?.users || 0} users
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openInvite(account)}
                    className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    title="Invite users"
                  >
                    <UserPlus size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(account)}
                    className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
