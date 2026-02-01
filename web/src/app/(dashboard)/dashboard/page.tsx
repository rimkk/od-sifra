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
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { Card, Badge, Avatar } from '@/components/ui';
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
  renovations?: { id: string; title: string; status: string }[];
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge text="Active" variant="success" size="xs" dot />;
      case 'VACANT':
        return <Badge text="Vacant" variant="warning" size="xs" dot />;
      case 'RENOVATION':
        return <Badge text="Renovation" variant="info" size="xs" dot />;
      default:
        return <Badge text={status} size="xs" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin && adminOverview) {
    return (
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-[var(--text)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Welcome back, {user?.name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-tertiary)]">Customers</span>
              <Users size={14} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--text)]">{adminOverview.totalCustomers}</p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-tertiary)]">Employees</span>
              <Briefcase size={14} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--text)]">{adminOverview.totalEmployees}</p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-tertiary)]">Properties</span>
              <Building2 size={14} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--text)]">{adminOverview.totalProperties}</p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-tertiary)]">Monthly Revenue</span>
              <DollarSign size={14} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--text)]">{formatCurrency(adminOverview.totalMonthlyRent)}</p>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="p-4 rounded-lg bg-[var(--surface-secondary)] mb-6">
          <h2 className="text-sm font-medium text-[var(--text)] mb-4">Overview</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Active</p>
              <p className="text-lg font-semibold text-[var(--success)]">{adminOverview.activeProperties}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Vacant</p>
              <p className="text-lg font-semibold text-[var(--warning)]">{adminOverview.vacantProperties}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Annual Est.</p>
              <p className="text-lg font-semibold text-[var(--text)]">{formatCurrency(adminOverview.estimatedAnnualRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[var(--text)]">Recent Customers</h2>
            <Link href="/dashboard/customers" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
              View all
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {adminOverview.recentCustomers.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
                No customers yet
              </div>
            ) : (
              adminOverview.recentCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between p-3 hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={customer.name} size="sm" />
                    <div>
                      <p className="text-sm text-[var(--text)]">{customer.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{customer.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{getDaysSince(customer.createdAt)}d ago</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Customer/Employee Dashboard
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-[var(--text)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Welcome back, {user?.name}</p>
      </div>

      {/* Financial Summary for Customer */}
      {isCustomer && financials && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Properties</p>
            <p className="text-xl font-semibold text-[var(--text)]">{financials.totalProperties}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Monthly</p>
            <p className="text-xl font-semibold text-[var(--success)]">{formatCurrency(financials.totalMonthlyRent)}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Investment</p>
            <p className="text-xl font-semibold text-[var(--text)]">{formatCurrency(financials.totalPurchaseCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Annual Est.</p>
            <p className="text-xl font-semibold text-[var(--text)]">{formatCurrency(financials.estimatedAnnualIncome)}</p>
          </div>
        </div>
      )}

      {/* Properties List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--text)]">Properties</h2>
          <Link href="/dashboard/properties" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
            View all
            <ArrowUpRight size={12} />
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] p-12 text-center">
            <Home className="mx-auto text-[var(--text-muted)] mb-3" size={32} strokeWidth={1.5} />
            <p className="text-sm text-[var(--text-tertiary)]">No properties yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {properties.slice(0, 5).map((property) => (
              <Link 
                key={property.id} 
                href={`/dashboard/properties/${property.id}`}
                className="block p-3 hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm text-[var(--text)]">{property.address}</h3>
                    <p className="text-xs text-[var(--text-tertiary)]">{property.city}</p>
                  </div>
                  {getStatusBadge(property.status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                  <span>{formatCurrency(Number(property.monthlyRent))}/mo</span>
                  {property.tenantName && <span>{property.tenantName}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
