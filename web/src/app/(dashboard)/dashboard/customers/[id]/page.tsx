'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  FolderKanban,
  Building2,
  User,
  Calendar,
  Edit2,
  UserPlus,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { customerAccountApi, projectApi } from '@/lib/api';

interface CustomerAccount {
  id: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  users?: { id: string; name: string; email: string; role: string }[];
  properties?: { id: string; address: string; city: string; status: string; monthlyRent: number }[];
  _count?: { projects: number; properties: number; users: number };
}

interface Project {
  id: string;
  name: string;
  status: string;
  ownerName?: string;
  _count?: { listings: number };
  stageCounts?: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-500' },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-500' },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-500' },
};

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [customerRes, projectsRes] = await Promise.all([
        customerAccountApi.getById(customerId),
        projectApi.getAll(),
      ]);
      setCustomer(customerRes.data.account);
      // Filter projects for this customer
      const customerProjects = (projectsRes.data.projects || []).filter(
        (p: any) => p.customerAccount?.id === customerId
      );
      setProjects(customerProjects);
    } catch (error) {
      console.error('Failed to fetch customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="text-center py-16">
          <p className="text-[var(--text-secondary)]">Customer not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft size={16} />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalProperties = projects.reduce((sum, p) => sum + (p._count?.listings || 0), 0);
  const purchasedCount = projects.reduce((sum, p) => {
    const purchased = (p.stageCounts?.PURCHASED || 0) + (p.stageCounts?.MANAGING || 0);
    return sum + purchased;
  }, 0);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text)]">{customer.name}</h1>
              <p className="text-sm text-[var(--text-tertiary)]">Customer Profile</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Edit2 size={14} />
          Edit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Projects</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{projects.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Properties</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{totalProperties}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Purchased</p>
          <p className="text-2xl font-semibold text-[var(--success)]">{purchasedCount}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Users</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{customer._count?.users || 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-[var(--text)]">Projects</h2>
              <Link href="/dashboard/projects">
                <Button variant="ghost" size="xs">View All</Button>
              </Link>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="mx-auto text-[var(--text-muted)] mb-2" size={24} />
                <p className="text-sm text-[var(--text-tertiary)]">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                      <FolderKanban size={16} className="text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)]">{project.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{project._count?.listings || 0} properties</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[project.status]?.color || 'bg-gray-500'}`} />
                      <span className="text-xs text-[var(--text-tertiary)]">{STATUS_CONFIG[project.status]?.label || project.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Users in Account */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-[var(--text)]">Account Users</h2>
              <Button variant="ghost" size="xs">
                <UserPlus size={14} />
                Invite
              </Button>
            </div>
            
            {!customer.users || customer.users.length === 0 ? (
              <div className="text-center py-8">
                <User className="mx-auto text-[var(--text-muted)] mb-2" size={24} />
                <p className="text-sm text-[var(--text-tertiary)]">No users in this account</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)]">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-medium">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)]">{u.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="font-medium text-[var(--text)] mb-4">Contact Info</h2>
            <div className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-[var(--text-tertiary)]" />
                  <a href={`mailto:${customer.email}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[var(--text-tertiary)]" />
                  <a href={`tel:${customer.phone}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
                    {customer.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-[var(--text-tertiary)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Joined {formatDate(customer.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {customer.description && (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
              <h2 className="font-medium text-[var(--text)] mb-3">Notes</h2>
              <p className="text-sm text-[var(--text-secondary)]">{customer.description}</p>
            </div>
          )}

          {/* Status */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="font-medium text-[var(--text)] mb-3">Status</h2>
            <Badge 
              text={customer.isActive ? 'Active' : 'Inactive'} 
              variant={customer.isActive ? 'success' : 'default'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
