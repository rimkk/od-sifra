'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Hammer,
  Building2,
  DollarSign,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { renovationApi, propertyApi } from '@/lib/api';

interface Renovation {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  budget?: number;
  actualCost?: number;
  startDate?: string;
  endDate?: string;
  property?: { id: string; address: string; city: string; customerAccount?: { name: string } };
  _count?: { tasks: number };
}

interface Property {
  id: string;
  address: string;
  city: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  PLANNED: { label: 'Planned', variant: 'default' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

export default function RenovationsPage() {
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [form, setForm] = useState({
    propertyId: '',
    title: '',
    description: '',
    budget: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [renovationsRes, propertiesRes] = await Promise.all([
        renovationApi.getByProperty('all'), // Get all renovations
        propertyApi.getAll(),
      ]);
      setRenovations(renovationsRes.data.renovations || []);
      setProperties(propertiesRes.data.properties || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId || !form.title) return;

    try {
      setCreating(true);
      await renovationApi.create({
        propertyId: form.propertyId,
        title: form.title,
        description: form.description || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
      });
      setShowCreate(false);
      setForm({ propertyId: '', title: '', description: '', budget: '', priority: 'MEDIUM' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create renovation');
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const filteredRenovations = renovations.filter((r) => {
    const matchesSearch = searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.property?.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: renovations.length,
    planned: renovations.filter((r) => r.status === 'PLANNED').length,
    inProgress: renovations.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: renovations.filter((r) => r.status === 'COMPLETED').length,
    totalBudget: renovations.reduce((sum, r) => sum + Number(r.budget || 0), 0),
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Renovations</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Manage renovation projects</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Renovation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Planned</p>
          <p className="text-2xl font-semibold text-[var(--text-secondary)]">{stats.planned}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">In Progress</p>
          <p className="text-2xl font-semibold text-[var(--warning)]">{stats.inProgress}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Completed</p>
          <p className="text-2xl font-semibold text-[var(--success)]">{stats.completed}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Budget</p>
          <p className="text-2xl font-semibold text-[var(--primary)]">{formatCurrency(stats.totalBudget)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search renovations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)]"
        >
          <option value="all">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">New Renovation</h2>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Property *</label>
                <select
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  required
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Kitchen Remodel"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Budget</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="0"
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the renovation..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={creating}>Create</Button>
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
      ) : filteredRenovations.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <Hammer className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {renovations.length === 0 ? 'No renovations yet' : 'No matching renovations'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Create a renovation project to start tracking tasks.
          </p>
          {renovations.length === 0 && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New Renovation
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredRenovations.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/renovations/${r.id}`}
              className="group bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--text-muted)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Hammer size={18} className="text-[var(--primary)]" />
                </div>
                <Badge text={STATUS_CONFIG[r.status]?.label || r.status} variant={STATUS_CONFIG[r.status]?.variant || 'default'} size="xs" />
              </div>

              <h3 className="font-medium text-sm text-[var(--text)] mb-1 group-hover:text-[var(--primary)]">{r.title}</h3>
              
              {r.property && (
                <p className="text-xs text-[var(--text-tertiary)] mb-3 flex items-center gap-1">
                  <Building2 size={12} />
                  {r.property.address}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>{r._count?.tasks || 0} tasks</span>
                {r.budget && <span>{formatCurrency(Number(r.budget))}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
