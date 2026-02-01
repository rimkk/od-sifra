'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X,
  FolderKanban,
  User,
  ChevronRight,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { customerAccountApi, projectApi } from '@/lib/api';
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

export default function CustomersPage() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<CustomerAccount | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
  });

  const isAdmin = user?.role === 'ADMIN';

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
      await customerAccountApi.create({
        accountName: form.name,
        description: form.description || undefined,
      });
      setShowCreate(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit || !form.name.trim()) return;

    try {
      setSaving(true);
      await customerAccountApi.update(showEdit.id, {
        name: form.name,
        description: form.description || undefined,
      });
      setShowEdit(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', email: '', phone: '' });
  };

  const openEdit = (account: CustomerAccount) => {
    setForm({
      name: account.name,
      description: account.description || '',
      email: account.email || '',
      phone: account.phone || '',
    });
    setShowEdit(account);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) =>
    searchQuery === '' ||
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Customers</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage customer accounts</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          New Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">Total Customers</p>
          <p className="text-2xl font-bold text-[var(--text)]">{accounts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">Active</p>
          <p className="text-2xl font-bold text-emerald-500">{accounts.filter((a) => a.isActive).length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">With Projects</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {accounts.filter((a) => (a._count?.projects || 0) > 0).length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">Total Users</p>
          <p className="text-2xl font-bold text-[var(--text)]">
            {accounts.reduce((sum, a) => sum + (a._count?.users || 0), 0)}
          </p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
        />
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || showEdit) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {showEdit ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button
                onClick={() => { setShowCreate(false); setShowEdit(null); resetForm(); }}
                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={showEdit ? handleUpdate : handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Smith Family"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Notes about this customer..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@example.com"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => { setShowCreate(false); setShowEdit(null); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  {showEdit ? 'Save Changes' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Users className="text-[var(--primary)]" size={28} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
            {accounts.length === 0 ? 'No customers yet' : 'No matching customers'}
          </h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
            {accounts.length === 0 
              ? 'Add your first customer to start managing their property portfolios.'
              : 'Try adjusting your search criteria.'}
          </p>
          {accounts.length === 0 && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 hover:border-[var(--text-muted)] transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold">
                  {account.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-[var(--text)]">{account.name}</h3>
                    {account.isActive ? (
                      <Badge text="Active" variant="success" size="xs" />
                    ) : (
                      <Badge text="Inactive" variant="default" size="xs" />
                    )}
                  </div>

                  {account.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-1">{account.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {account.email && (
                      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                        <Mail size={14} />
                        <span>{account.email}</span>
                      </div>
                    )}
                    {account.phone && (
                      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                        <Phone size={14} />
                        <span>{account.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                      <FolderKanban size={14} />
                      <span>{account._count?.projects || 0} projects</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                      <User size={14} />
                      <span>{account._count?.users || 0} users</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
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
