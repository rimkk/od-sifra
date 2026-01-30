'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  UserPlus,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import { adminApi, customerAccountApi } from '@/lib/api';
import { formatCurrency, formatDate, getDaysSince } from '@/lib/utils';

interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  status: string;
  monthlyRent: number;
  purchaseCost: number;
  tenantName?: string;
  renovations: any[];
}

interface CustomerDetails {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  users: CustomerUser[];
  properties: Property[];
  assignedEmployee?: {
    id: string;
    name: string;
    email: string;
  };
  stats: {
    totalProperties: number;
    activeProperties: number;
    totalPurchaseCost: number;
    totalMonthlyRent: number;
    estimatedAnnualIncome: number;
  };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchCustomerDetails();
    }
  }, [params.id]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await adminApi.getCustomerDetails(params.id as string);
      setCustomer(response.data.customer || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--error)] mb-4">{error || 'Customer not found'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft size={18} className="mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'VACANT':
        return 'warning';
      case 'RENOVATION':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text)]">{customer.name}</h1>
            <Badge
              text={customer.isActive ? 'Active' : 'Inactive'}
              variant={customer.isActive ? 'success' : 'default'}
            />
          </div>
          {customer.description && (
            <p className="text-[var(--text-secondary)] mt-1">{customer.description}</p>
          )}
        </div>
        <Link href={`/dashboard/invite?accountId=${customer.id}`}>
          <Button>
            <UserPlus size={18} className="mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="outlined">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--info-bg)]">
              <Building2 size={20} className="text-[var(--info)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">{customer.stats.totalProperties}</p>
              <p className="text-sm text-[var(--text-secondary)]">Properties</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--success-bg)]">
              <DollarSign size={20} className="text-[var(--success)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--success)]">
                {formatCurrency(customer.stats.totalMonthlyRent)}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">Monthly Rent</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--warning-bg)]">
              <DollarSign size={20} className="text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">
                {formatCurrency(customer.stats.totalPurchaseCost)}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">Total Investment</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Users size={20} className="text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text)]">{customer.users.length}</p>
              <p className="text-sm text-[var(--text-secondary)]">Account Users</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Users & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Users */}
          <Card variant="outlined">
            <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Users size={18} />
              Account Users
            </h3>
            <div className="space-y-3">
              {customer.users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <Avatar name={user.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text)] truncate">{user.name}</p>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{user.email}</p>
                  </div>
                  <Badge
                    text={user.isActive ? 'Active' : 'Inactive'}
                    variant={user.isActive ? 'success' : 'default'}
                    size="sm"
                  />
                </div>
              ))}
              {customer.users.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  No users in this account
                </p>
              )}
            </div>
          </Card>

          {/* Account Info */}
          <Card variant="outlined">
            <h3 className="font-semibold text-[var(--text)] mb-4">Account Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Created</p>
                  <p className="text-[var(--text)]">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Days Active</p>
                  <p className="text-[var(--text)]">{getDaysSince(customer.createdAt)} days</p>
                </div>
              </div>
              {customer.assignedEmployee && (
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-[var(--text-tertiary)]" />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Assigned Manager</p>
                    <p className="text-[var(--text)]">{customer.assignedEmployee.name}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Properties */}
        <div className="lg:col-span-2">
          <Card variant="outlined">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                <Building2 size={18} />
                Properties
              </h3>
            </div>
            {customer.properties.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
                <p className="text-[var(--text-secondary)]">No properties yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.properties.map((property) => (
                  <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)] hover:border-secondary transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-[var(--text)]">{property.address}</h4>
                          <Badge
                            text={property.status}
                            variant={statusVariant(property.status)}
                            size="sm"
                          />
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">{property.city}</p>
                        {property.tenantName && (
                          <p className="text-sm text-[var(--text-secondary)]">
                            Tenant: {property.tenantName}
                          </p>
                        )}
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold text-[var(--success)]">
                          {formatCurrency(property.monthlyRent)}/mo
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {formatCurrency(property.purchaseCost)} value
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-[var(--text-tertiary)]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
