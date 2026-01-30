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
        return <Badge text="Active" variant="success" size="sm" />;
      case 'VACANT':
        return <Badge text="Vacant" variant="warning" size="sm" />;
      case 'RENOVATION':
        return <Badge text="Renovation" variant="info" size="sm" />;
      default:
        return <Badge text={status} size="sm" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin && adminOverview) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Welcome, {user?.name}</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="outlined" className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--info-bg)]">
              <Users className="text-[var(--info)]" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">{adminOverview.totalCustomers}</p>
              <p className="text-sm text-[var(--text-secondary)]">Customers</p>
            </div>
          </Card>

          <Card variant="outlined" className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--warning-bg)]">
              <Briefcase className="text-[var(--warning)]" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">{adminOverview.totalEmployees}</p>
              <p className="text-sm text-[var(--text-secondary)]">Employees</p>
            </div>
          </Card>

          <Card variant="outlined" className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--success-bg)]">
              <Building2 className="text-[var(--success)]" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">{adminOverview.totalProperties}</p>
              <p className="text-sm text-[var(--text-secondary)]">Properties</p>
            </div>
          </Card>

          <Card variant="outlined" className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <DollarSign className="text-secondary" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(adminOverview.totalMonthlyRent)}</p>
              <p className="text-sm text-[var(--text-secondary)]">Monthly Rent</p>
            </div>
          </Card>
        </div>

        {/* Revenue Overview */}
        <Card variant="elevated">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Revenue Overview</h2>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Active Properties</p>
              <p className="text-2xl font-bold text-[var(--success)]">{adminOverview.activeProperties}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Vacant Properties</p>
              <p className="text-2xl font-bold text-[var(--warning)]">{adminOverview.vacantProperties}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Estimated Annual Revenue</p>
              <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(adminOverview.estimatedAnnualRevenue)}</p>
            </div>
          </div>
        </Card>

        {/* Recent Customers */}
        <Card variant="outlined">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">Recent Customers</h2>
            <Link href="/dashboard/customers" className="text-sm text-secondary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {adminOverview.recentCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/dashboard/customers/${customer.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={customer.name} size="md" />
                  <div>
                    <p className="font-medium text-[var(--text)]">{customer.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <span className="text-sm">{getDaysSince(customer.createdAt)} days ago</span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Customer/Employee Dashboard
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Welcome, {user?.name}</h1>

      {/* Financial Summary for Customer */}
      {isCustomer && financials && (
        <Card variant="elevated">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Financial Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total Properties</p>
              <p className="text-2xl font-bold text-[var(--text)]">{financials.totalProperties}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Monthly Income</p>
              <p className="text-2xl font-bold text-[var(--success)]">{formatCurrency(financials.totalMonthlyRent)}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total Investment</p>
              <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(financials.totalPurchaseCost)}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Annual Estimate</p>
              <p className="text-2xl font-bold text-primary-dark">{formatCurrency(financials.estimatedAnnualIncome)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Properties List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Your Properties</h2>
          <Link href="/dashboard/properties" className="text-sm text-secondary hover:underline">
            View all
          </Link>
        </div>

        {properties.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <Home className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
            <p className="text-[var(--text-secondary)]">No properties yet</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {properties.slice(0, 5).map((property) => (
              <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                <Card variant="outlined" className="hover:border-secondary transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--text)]">{property.address}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">{property.city}</p>
                    </div>
                    {getStatusBadge(property.status)}
                  </div>
                  <div className="flex items-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <DollarSign size={16} />
                      <span>{formatCurrency(Number(property.monthlyRent))}/mo</span>
                    </div>
                    {property.tenantName && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Users size={16} />
                        <span>{property.tenantName}</span>
                      </div>
                    )}
                  </div>
                  {property.renovations && property.renovations.length > 0 && (
                    <div className="mt-4 px-3 py-2 rounded-lg bg-[var(--info-bg)] text-[var(--info)] text-sm">
                      {property.renovations.length} active renovation(s)
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
