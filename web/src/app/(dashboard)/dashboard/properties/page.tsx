'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Building2, 
  DollarSign,
  MapPin,
  Edit2, 
  X,
  Trash2,
  User,
  Home,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { propertyApi, customerAccountApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Property {
  id: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  purchaseCost: number;
  monthlyRent: number;
  status: string;
  tenantName?: string;
  tenantEmail?: string;
  customerAccount?: { id: string; name: string };
  createdAt: string;
}

interface CustomerAccount {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-500', variant: 'success' },
  VACANT: { label: 'Vacant', color: 'bg-amber-500', variant: 'warning' },
  RENOVATION: { label: 'Renovation', color: 'bg-blue-500', variant: 'info' },
  SOLD: { label: 'Sold', color: 'bg-gray-500', variant: 'default' },
};

export default function PropertiesPage() {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    customerAccountId: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'USA',
    purchaseCost: '',
    monthlyRent: '',
    status: 'VACANT',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
  });

  const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [propertyApi.getAll()];
      if (isAdminOrEmployee) {
        promises.push(customerAccountApi.getAll());
      }
      const [propertiesRes, customersRes] = await Promise.all(promises);
      setProperties(propertiesRes.data.properties || []);
      if (customersRes) {
        setCustomers(customersRes.data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerAccountId || !form.address || !form.city) return;

    try {
      setSaving(true);
      await propertyApi.create({
        customerAccountId: form.customerAccountId,
        address: form.address,
        city: form.city,
        postalCode: form.postalCode || undefined,
        country: form.country,
        purchaseCost: parseFloat(form.purchaseCost) || 0,
        monthlyRent: parseFloat(form.monthlyRent) || 0,
        status: form.status,
        tenantName: form.tenantName || undefined,
        tenantEmail: form.tenantEmail || undefined,
        tenantPhone: form.tenantPhone || undefined,
      });
      closeModal();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    try {
      setSaving(true);
      await propertyApi.update(editingProperty.id, {
        address: form.address,
        city: form.city,
        postalCode: form.postalCode || undefined,
        country: form.country,
        purchaseCost: parseFloat(form.purchaseCost) || 0,
        monthlyRent: parseFloat(form.monthlyRent) || 0,
        status: form.status,
        tenantName: form.tenantName || undefined,
        tenantEmail: form.tenantEmail || undefined,
        tenantPhone: form.tenantPhone || undefined,
      });
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to update property:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      setDeleting(id);
      await propertyApi.delete(id);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete property');
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setForm({
      customerAccountId: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'USA',
      purchaseCost: '',
      monthlyRent: '',
      status: 'VACANT',
      tenantName: '',
      tenantEmail: '',
      tenantPhone: '',
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
    resetForm();
  };

  const openEdit = (prop: Property) => {
    setForm({
      customerAccountId: prop.customerAccount?.id || '',
      address: prop.address,
      city: prop.city,
      postalCode: prop.postalCode || '',
      country: prop.country,
      purchaseCost: String(prop.purchaseCost),
      monthlyRent: String(prop.monthlyRent),
      status: prop.status,
      tenantName: prop.tenantName || '',
      tenantEmail: prop.tenantEmail || '',
      tenantPhone: '',
    });
    setEditingProperty(prop);
    setShowModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  // Filter properties
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch = searchQuery === '' ||
      prop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.customerAccount?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: properties.length,
    active: properties.filter((p) => p.status === 'ACTIVE').length,
    vacant: properties.filter((p) => p.status === 'VACANT').length,
    totalRent: properties.filter((p) => p.status === 'ACTIVE').reduce((sum, p) => sum + Number(p.monthlyRent), 0),
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Properties</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Manage owned properties</p>
        </div>
        {isAdminOrEmployee && (
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} />
            Add Property
          </Button>
        )}
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
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Vacant</p>
          <p className="text-2xl font-semibold text-[var(--warning)]">{stats.vacant}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Monthly Rent</p>
          <p className="text-2xl font-semibold text-[var(--primary)]">{formatCurrency(stats.totalRent)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="VACANT">Vacant</option>
          <option value="RENOVATION">Renovation</option>
          <option value="SOLD">Sold</option>
        </select>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--surface)] flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">
                {editingProperty ? 'Edit Property' : 'Add Property'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editingProperty ? handleUpdate : handleCreate} className="p-5 space-y-4">
              {!editingProperty && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Customer *</label>
                  <select
                    value={form.customerAccountId}
                    onChange={(e) => setForm({ ...form, customerAccountId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Miami"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Postal Code</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="33101"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Purchase Cost *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="number"
                      value={form.purchaseCost}
                      onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                      placeholder="0"
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Monthly Rent *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="number"
                      value={form.monthlyRent}
                      onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                      placeholder="0"
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                >
                  <option value="VACANT">Vacant</option>
                  <option value="ACTIVE">Active (Rented)</option>
                  <option value="RENOVATION">Renovation</option>
                  <option value="SOLD">Sold</option>
                </select>
              </div>

              {form.status === 'ACTIVE' && (
                <>
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase mb-3">Tenant Info</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Tenant Name</label>
                    <input
                      type="text"
                      value={form.tenantName}
                      onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Tenant Email</label>
                    <input
                      type="email"
                      value={form.tenantEmail}
                      onChange={(e) => setForm({ ...form, tenantEmail: e.target.value })}
                      placeholder="tenant@example.com"
                      className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  {editingProperty ? 'Save' : 'Create'}
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
      ) : filteredProperties.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <Home className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {properties.length === 0 ? 'No properties yet' : 'No matching properties'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {properties.length === 0 ? 'Add your first property.' : 'Try adjusting your search.'}
          </p>
          {properties.length === 0 && isAdminOrEmployee && (
            <Button size="sm" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={14} />
              Add Property
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProperties.map((prop) => (
            <div
              key={prop.id}
              className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--text-muted)] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-[var(--primary)]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm text-[var(--text)] truncate">{prop.address}</h3>
                    <Badge 
                      text={STATUS_CONFIG[prop.status]?.label || prop.status} 
                      variant={STATUS_CONFIG[prop.status]?.variant || 'default'} 
                      size="xs" 
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {prop.city}
                    </span>
                    {prop.customerAccount && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {prop.customerAccount.name}
                      </span>
                    )}
                    {prop.tenantName && (
                      <span>Tenant: {prop.tenantName}</span>
                    )}
                  </div>
                </div>

                {/* Financial */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{formatCurrency(Number(prop.monthlyRent))}/mo</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatCurrency(Number(prop.purchaseCost))} cost</p>
                </div>

                {/* Actions */}
                {isAdminOrEmployee && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(prop)}
                      className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(prop.id)}
                        disabled={deleting === prop.id}
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)] transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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
