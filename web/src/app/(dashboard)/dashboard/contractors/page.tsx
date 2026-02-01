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
  Wrench,
  DollarSign,
  Clock,
  Building,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { contractorApi } from '@/lib/api';

interface Contractor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  specialty?: string;
  hourlyRate?: number;
  notes?: string;
  isActive: boolean;
  totalHours?: number;
  totalEarnings?: number;
  _count?: { tasks: number; timeEntries: number };
}

const SPECIALTIES = [
  'General', 'Plumbing', 'Electrical', 'HVAC', 'Roofing', 
  'Flooring', 'Painting', 'Carpentry', 'Masonry', 'Landscaping'
];

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    specialty: '',
    hourlyRate: '',
    notes: '',
  });

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const res = await contractorApi.getAll();
      setContractors(res.data.contractors || []);
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      const data = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        specialty: form.specialty || undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        notes: form.notes || undefined,
      };

      if (editingContractor) {
        await contractorApi.update(editingContractor.id, data);
      } else {
        await contractorApi.create(data);
      }
      closeModal();
      fetchContractors();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save contractor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contractor?')) return;

    try {
      setDeleting(id);
      await contractorApi.delete(id);
      fetchContractors();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async (c: Contractor) => {
    try {
      await contractorApi.update(c.id, { isActive: !c.isActive });
      fetchContractors();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', company: '', specialty: '', hourlyRate: '', notes: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContractor(null);
    resetForm();
  };

  const openEdit = (c: Contractor) => {
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      specialty: c.specialty || '',
      hourlyRate: c.hourlyRate ? String(c.hourlyRate) : '',
      notes: c.notes || '',
    });
    setEditingContractor(c);
    setShowModal(true);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const filteredContractors = contractors.filter((c) =>
    searchQuery === '' ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: contractors.length,
    active: contractors.filter((c) => c.isActive).length,
    totalHours: contractors.reduce((sum, c) => sum + Number(c.totalHours || 0), 0),
    totalEarnings: contractors.reduce((sum, c) => sum + Number(c.totalEarnings || 0), 0),
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Contractors</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Manage renovation team members</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} />
          Add Contractor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Active</p>
          <p className="text-2xl font-semibold text-[var(--success)]">{stats.active}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Hours</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{stats.totalHours.toFixed(1)}h</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Paid</p>
          <p className="text-2xl font-semibold text-[var(--primary)]">{formatCurrency(stats.totalEarnings)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search contractors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">
                {editingContractor ? 'Edit Contractor' : 'Add Contractor'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="ABC Contractors"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Specialty</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  >
                    <option value="">Select...</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Hourly Rate</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="number"
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  {editingContractor ? 'Save' : 'Create'}
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
      ) : filteredContractors.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <Wrench className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {contractors.length === 0 ? 'No contractors yet' : 'No matching contractors'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {contractors.length === 0 ? 'Add your first contractor.' : 'Try adjusting your search.'}
          </p>
          {contractors.length === 0 && (
            <Button size="sm" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={14} />
              Add Contractor
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContractors.map((c) => (
            <div key={c.id} className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--text-muted)] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-semibold text-sm">
                  {c.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm text-[var(--text)]">{c.name}</h3>
                    {c.specialty && <Badge text={c.specialty} variant="info" size="xs" />}
                    {!c.isActive && <Badge text="Inactive" variant="warning" size="xs" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                    {c.company && <span className="flex items-center gap-1"><Building size={12} />{c.company}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                    {c.hourlyRate && <span className="flex items-center gap-1"><DollarSign size={12} />{c.hourlyRate}/hr</span>}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{Number(c.totalHours || 0).toFixed(1)}h</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatCurrency(Number(c.totalEarnings || 0))}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(c)}
                    className={`px-2 py-1 rounded text-xs font-medium ${c.isActive ? 'text-[var(--warning)] hover:bg-[var(--warning-light)]' : 'text-[var(--success)] hover:bg-[var(--success-light)]'}`}
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]">
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)] disabled:opacity-50"
                  >
                    <Trash2 size={16} />
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
