'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Edit2, 
  X,
  Trash2,
  User,
  Users,
  Shield,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  totalCustomers?: number;
}

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getEmployees();
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;

    try {
      setSaving(true);
      await adminApi.createEmployee({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone || undefined,
      });
      closeModal();
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !form.name.trim()) return;

    try {
      setSaving(true);
      await adminApi.updateEmployee(editingEmployee.id, {
        name: form.name,
        phone: form.phone || undefined,
      });
      closeModal();
      fetchEmployees();
    } catch (error) {
      console.error('Failed to update employee:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      setDeleting(id);
      await adminApi.deleteEmployee(id);
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete employee');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      await adminApi.updateEmployee(emp.id, { isActive: !emp.isActive });
      fetchEmployees();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', phone: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    resetForm();
  };

  const openEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      email: emp.email,
      password: '',
      phone: emp.phone || '',
    });
    setEditingEmployee(emp);
    setShowModal(true);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) =>
    searchQuery === '' ||
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="text-center py-16">
          <Shield className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <p className="text-[var(--text-secondary)]">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Employees</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Manage team members</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{employees.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Active</p>
          <p className="text-2xl font-semibold text-[var(--success)]">{employees.filter((e) => e.isActive).length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Admins</p>
          <p className="text-2xl font-semibold text-[var(--primary)]">{employees.filter((e) => e.role === 'ADMIN').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editingEmployee ? handleUpdate : handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                  disabled={!!editingEmployee}
                />
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  {editingEmployee ? 'Save' : 'Create'}
                </Button>
              </div>
            </form>
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
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <Users className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {employees.length === 0 ? 'No employees yet' : 'No matching employees'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {employees.length === 0 ? 'Add your first team member.' : 'Try adjusting your search.'}
          </p>
          {employees.length === 0 && (
            <Button size="sm" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={14} />
              Add Employee
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--text-muted)] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {emp.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm text-[var(--text)]">{emp.name}</h3>
                    <Badge 
                      text={emp.role === 'ADMIN' ? 'Admin' : 'Employee'} 
                      variant={emp.role === 'ADMIN' ? 'info' : 'default'} 
                      size="xs" 
                    />
                    {!emp.isActive && <Badge text="Inactive" variant="warning" size="xs" />}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {emp.email}
                    </span>
                    {emp.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {emp.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {emp.id !== user?.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        emp.isActive 
                          ? 'text-[var(--warning)] hover:bg-[var(--warning-light)]' 
                          : 'text-[var(--success)] hover:bg-[var(--success-light)]'
                      }`}
                    >
                      {emp.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEdit(emp)}
                      className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      disabled={deleting === emp.id}
                      className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)] transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
