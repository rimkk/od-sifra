'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, DollarSign, Users, Search, Hammer, Plus } from 'lucide-react';
import { Card, Badge, Input, Button } from '@/components/ui';
import { propertyApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface Property {
  id: string;
  address: string;
  city: string;
  monthlyRent: number;
  purchaseCost: number;
  status: string;
  tenantName?: string;
  renovations?: { id: string; title: string; status: string }[];
}

export default function PropertiesPage() {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canAddProperty = isAdmin || isEmployee;

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await propertyApi.getAll();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
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

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card variant="outlined" className="text-center py-12">
          <Building2 className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
          <p className="text-[var(--text-secondary)]">No properties found</p>
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
                      <span>{property.renovations.length} active renovation(s)</span>
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
