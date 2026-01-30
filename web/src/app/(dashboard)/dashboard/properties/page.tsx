'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, DollarSign, Users, Search, Hammer, Plus, ChevronRight } from 'lucide-react';
import { Card, Badge, Input, Button } from '@/components/ui';
import { propertyApi, customerAccountApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type Tab = 'all' | 'by-customer';

interface Property {
  id: string;
  address: string;
  city: string;
  monthlyRent: number;
  purchaseCost: number;
  status: string;
  tenantName?: string;
  customerAccount?: {
    id: string;
    name: string;
  };
  renovations?: { id: string; title: string; status: string }[];
}

interface CustomerAccount {
  id: string;
  name: string;
  description?: string;
  properties: Property[];
  _count?: {
    properties: number;
    users: number;
  };
}

export default function PropertiesPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canAddProperty = isAdmin || isEmployee;
  const showTabs = isAdmin || isEmployee;

  useEffect(() => {
    if (activeTab === 'all') {
      fetchProperties();
    } else {
      fetchCustomerAccounts();
    }
  }, [activeTab]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await propertyApi.getAll();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAccounts = async () => {
    setLoading(true);
    try {
      const response = await customerAccountApi.getAll();
      setCustomerAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch customer accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAccounts = customerAccounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.properties?.some(
        (p) =>
          p.address.toLowerCase().includes(search.toLowerCase()) ||
          p.city.toLowerCase().includes(search.toLowerCase())
      )
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge text="Active" variant="success" />;
      case 'VACANT':
        return <Badge text="Vacant" variant="warning" />;
      case 'RENOVATION':
        return <Badge text="Renovation" variant="info" />;
      case 'SOLD':
        return <Badge text="Sold" variant="default" />;
      default:
        return <Badge text={status} />;
    }
  };

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
        <h1 className="text-2xl font-bold text-[var(--text)]">Properties</h1>
        {canAddProperty && (
          <Link href="/dashboard/properties/new">
            <Button>
              <Plus size={18} className="mr-2" />
              Add Property
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      {showTabs && (
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'all'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Building2 size={16} className="inline mr-2" />
            All Properties
          </button>
          <button
            onClick={() => setActiveTab('by-customer')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'by-customer'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Users size={16} className="inline mr-2" />
            By Customer
          </button>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder={activeTab === 'all' ? 'Search properties...' : 'Search customers or properties...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {/* All Properties View */}
      {activeTab === 'all' && (
        <>
          {filteredProperties.length === 0 ? (
            <Card variant="outlined" className="text-center py-12">
              <Building2 className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
              <p className="text-[var(--text-secondary)]">No properties found</p>
              {canAddProperty && (
                <Link href="/dashboard/properties/new" className="mt-4 inline-block">
                  <Button variant="outline">
                    <Plus size={16} className="mr-2" />
                    Add Your First Property
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map((property) => (
                <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                  <Card variant="outlined" className="h-full hover:border-secondary transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">{property.address}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{property.city}</p>
                      </div>
                      {getStatusBadge(property.status)}
                    </div>

                    {property.customerAccount && (
                      <div className="mb-3 pb-3 border-b border-[var(--border)]">
                        <p className="text-xs text-[var(--text-tertiary)]">Customer</p>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {property.customerAccount.name}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-secondary)] flex items-center gap-2">
                          <DollarSign size={16} />
                          Monthly Rent
                        </span>
                        <span className="font-medium text-[var(--success)]">
                          {formatCurrency(Number(property.monthlyRent))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-secondary)] flex items-center gap-2">
                          <Building2 size={16} />
                          Purchase Cost
                        </span>
                        <span className="font-medium text-[var(--text)]">
                          {formatCurrency(Number(property.purchaseCost))}
                        </span>
                      </div>

                      {property.tenantName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text-secondary)] flex items-center gap-2">
                            <Users size={16} />
                            Tenant
                          </span>
                          <span className="font-medium text-[var(--text)]">{property.tenantName}</span>
                        </div>
                      )}
                    </div>

                    {property.renovations && property.renovations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm text-[var(--info)]">
                          <Hammer size={16} />
                          <span>{property.renovations.length} renovation(s)</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* By Customer View */}
      {activeTab === 'by-customer' && (
        <>
          {filteredAccounts.length === 0 ? (
            <Card variant="outlined" className="text-center py-12">
              <Users className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
              <p className="text-[var(--text-secondary)]">No customer accounts found</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredAccounts.map((account) => {
                const totalRent = account.properties?.reduce(
                  (sum, p) => sum + Number(p.monthlyRent || 0),
                  0
                ) || 0;
                const totalValue = account.properties?.reduce(
                  (sum, p) => sum + Number(p.purchaseCost || 0),
                  0
                ) || 0;

                return (
                  <Card key={account.id} variant="outlined">
                    {/* Account Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Link
                          href={`/dashboard/customers/${account.id}`}
                          className="text-lg font-semibold text-[var(--text)] hover:text-secondary flex items-center gap-2"
                        >
                          {account.name}
                          <ChevronRight size={18} />
                        </Link>
                        {account.description && (
                          <p className="text-sm text-[var(--text-secondary)]">{account.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[var(--text-secondary)]">
                          {account.properties?.length || 0} properties
                        </p>
                        <p className="text-sm font-medium text-[var(--success)]">
                          {formatCurrency(totalRent)}/mo
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-[var(--surface-secondary)] mb-4">
                      <div>
                        <p className="text-xs text-[var(--text-tertiary)]">Properties</p>
                        <p className="text-lg font-bold text-[var(--text)]">
                          {account.properties?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-tertiary)]">Monthly Income</p>
                        <p className="text-lg font-bold text-[var(--success)]">
                          {formatCurrency(totalRent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-tertiary)]">Total Investment</p>
                        <p className="text-lg font-bold text-[var(--text)]">
                          {formatCurrency(totalValue)}
                        </p>
                      </div>
                    </div>

                    {/* Properties List */}
                    {account.properties && account.properties.length > 0 ? (
                      <div className="space-y-2">
                        {account.properties.map((property) => (
                          <Link
                            key={property.id}
                            href={`/dashboard/properties/${property.id}`}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="text-[var(--text-tertiary)]" size={20} />
                              <div>
                                <p className="font-medium text-[var(--text)]">{property.address}</p>
                                <p className="text-sm text-[var(--text-secondary)]">{property.city}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getStatusBadge(property.status)}
                              <span className="text-sm font-medium text-[var(--success)]">
                                {formatCurrency(Number(property.monthlyRent))}/mo
                              </span>
                              <ChevronRight className="text-[var(--text-tertiary)]" size={18} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-[var(--text-secondary)]">
                        No properties assigned to this account
                      </div>
                    )}

                    {/* Add Property Button */}
                    {canAddProperty && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <Link href={`/dashboard/properties/new?accountId=${account.id}`}>
                          <Button variant="ghost" size="sm" className="w-full">
                            <Plus size={16} className="mr-2" />
                            Add Property to {account.name}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
