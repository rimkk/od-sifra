'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Briefcase,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Home,
  ArrowUpRight,
  FolderKanban,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { adminApi, propertyApi } from '@/lib/api';
import { formatCurrency, formatDate, getDaysSince } from '@/lib/utils';

interface AdminOverview {
  totalCustomers: number;
  totalEmployees: number;
  totalProperties: number;
  activeProperties: number;
  vacantProperties: number;
  totalMonthlyRent: number;
  estimatedAnnualRevenue: number;
  recentCustomers: { id: string; name: string; email: string; createdAt: string }[];
}

interface Property {
  id: string;
  address: string;
  city: string;
  monthlyRent: number;
  status: string;
  tenantName?: string;
}

interface Financials {
  totalProperties: number;
  activeProperties: number;
  totalPurchaseCost: number;
  totalMonthlyRent: number;
  estimatedAnnualIncome: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const response = await adminApi.getOverview();
        setAdminOverview(response.data.overview);
      } else {
        const [propertiesRes, financialsRes] = await Promise.all([
          propertyApi.getAll(),
          isCustomer ? propertyApi.getFinancials(user!.id) : Promise.resolve(null),
        ]);
        setProperties(propertiesRes.data.properties || []);
        if (financialsRes) setFinancials(financialsRes.data.financials);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500';
      case 'VACANT': return 'bg-amber-500';
      case 'RENOVATION': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin && adminOverview) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm mb-1">
            <Sparkles size={16} />
            <span>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-[var(--text-secondary)] mt-1">Here&apos;s what&apos;s happening with your business today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">Total Customers</p>
                <p className="text-3xl font-bold text-[var(--text)]">{adminOverview.totalCustomers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users size={20} className="text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">Employees</p>
                <p className="text-3xl font-bold text-[var(--text)]">{adminOverview.totalEmployees}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Briefcase size={20} className="text-purple-500" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">Properties</p>
                <p className="text-3xl font-bold text-[var(--text)]">{adminOverview.totalProperties}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-emerald-500">{adminOverview.activeProperties} active</span>
                  <span className="text-xs text-[var(--text-muted)]">•</span>
                  <span className="text-xs text-amber-500">{adminOverview.vacantProperties} vacant</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Building2 size={20} className="text-emerald-500" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white border-0">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80 mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(adminOverview.totalMonthlyRent)}</p>
                <p className="text-sm text-white/70 mt-1">
                  {formatCurrency(adminOverview.estimatedAnnualRevenue)}/year
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions + Recent Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <h3 className="font-semibold text-[var(--text)] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/dashboard/projects" className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <FolderKanban size={18} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">View Projects</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Manage property boards</p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </Link>
              <Link href="/dashboard/invite" className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users size={18} className="text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">Invite User</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Add team members</p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </Link>
              <Link href="/dashboard/customers" className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity size={18} className="text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">Customer List</p>
                  <p className="text-xs text-[var(--text-tertiary)]">View all customers</p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </Link>
            </div>
          </Card>

          {/* Recent Customers */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text)]">Recent Customers</h3>
              <Link href="/dashboard/customers" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
                View all
                <ArrowUpRight size={14} />
              </Link>
            </div>
            {adminOverview.recentCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
                <p className="text-sm text-[var(--text-tertiary)]">No customers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminOverview.recentCustomers.slice(0, 5).map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/dashboard/customers/${customer.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-medium text-sm">
                      {getInitials(customer.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{customer.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{customer.email}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {getDaysSince(customer.createdAt)}d ago
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Customer/Employee Dashboard
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm mb-1">
          <Sparkles size={16} />
          <span>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-[var(--text-secondary)] mt-1">Track your property portfolio and investments.</p>
      </div>

      {/* Financial Summary for Customer */}
      {isCustomer && financials && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            <p className="text-sm text-[var(--text-secondary)] mb-1">Total Properties</p>
            <p className="text-3xl font-bold text-[var(--text)]">{financials.totalProperties}</p>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
            <p className="text-sm text-[var(--text-secondary)] mb-1">Monthly Income</p>
            <p className="text-3xl font-bold text-emerald-500">{formatCurrency(financials.totalMonthlyRent)}</p>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            <p className="text-sm text-[var(--text-secondary)] mb-1">Total Investment</p>
            <p className="text-3xl font-bold text-[var(--text)]">{formatCurrency(financials.totalPurchaseCost)}</p>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white border-0">
            <p className="text-sm text-white/80 mb-1">Annual Estimate</p>
            <p className="text-3xl font-bold">{formatCurrency(financials.estimatedAnnualIncome)}</p>
            {financials.totalPurchaseCost > 0 && (
              <p className="text-sm text-white/70 mt-1">
                {((financials.estimatedAnnualIncome / financials.totalPurchaseCost) * 100).toFixed(1)}% ROI
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Properties List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text)]">Your Properties</h3>
          <Link href="/dashboard/properties" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
            View all
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--surface-hover)] flex items-center justify-center">
              <Home className="text-[var(--text-muted)]" size={28} />
            </div>
            <p className="text-[var(--text-secondary)] mb-4">No properties in your portfolio yet</p>
            <Link href="/dashboard/projects">
              <Button>
                <FolderKanban size={16} />
                View Projects
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.slice(0, 5).map((property) => (
              <Link 
                key={property.id} 
                href={`/dashboard/properties/${property.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:border-[var(--text-muted)] hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center">
                  <Building2 size={20} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-[var(--text)] truncate">{property.address}</h4>
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(property.status)}`} />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">{property.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--text)]">{formatCurrency(Number(property.monthlyRent))}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">per month</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
