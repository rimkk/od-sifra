'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ChevronRight, Search, UserPlus } from 'lucide-react';
import { Card, Badge, Avatar, Button, Input } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { formatCurrency, getDaysSince } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  totalProperties: number;
  activeProperties: number;
  totalMonthlyRent: number;
  daysSinceOnboarding: number;
  assignedEmployee?: { id: string; name: string; email: string };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await adminApi.getCustomers();
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Customers</h1>
        <Link href="/dashboard/invite">
          <Button>
            <UserPlus size={18} className="mr-2" />
            Invite Customer
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <Card variant="outlined" className="text-center py-12">
          <Users className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
          <p className="text-[var(--text-secondary)]">No customers found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => (
            <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}>
              <Card variant="outlined" className="hover:border-secondary transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={customer.name} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text)]">{customer.name}</h3>
                        <Badge
                          text={customer.isActive ? 'Active' : 'Inactive'}
                          variant={customer.isActive ? 'success' : 'default'}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{customer.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-[var(--text-tertiary)]" size={20} />
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border)]">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[var(--text)]">{customer.totalProperties}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Properties</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[var(--success)]">
                      {formatCurrency(customer.totalMonthlyRent)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Monthly Rent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[var(--text)]">{customer.daysSinceOnboarding}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {customer.assignedEmployee?.name || 'Unassigned'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Manager</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
