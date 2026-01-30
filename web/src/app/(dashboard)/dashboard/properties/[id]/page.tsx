'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  Building2,
  Hammer,
  CheckCircle,
  Clock,
  Circle,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { propertyApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Property {
  id: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  description?: string;
  purchaseCost: number;
  monthlyRent: number;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  rentalStart?: string;
  rentalEnd?: string;
  status: string;
  customer: { id: string; name: string; email: string };
  renovations: {
    id: string;
    title: string;
    status: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    steps: {
      id: string;
      title: string;
      status: string;
      dueDate?: string;
      completedAt?: string;
    }[];
  }[];
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await propertyApi.getById(id as string);
      setProperty(response.data.property);
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getRenovationStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <Badge text="Planned" variant="default" size="sm" />;
      case 'IN_PROGRESS':
        return <Badge text="In Progress" variant="info" size="sm" />;
      case 'COMPLETED':
        return <Badge text="Completed" variant="success" size="sm" />;
      default:
        return <Badge text={status} size="sm" />;
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-[var(--success)]" size={18} />;
      case 'IN_PROGRESS':
        return <Clock className="text-[var(--info)]" size={18} />;
      default:
        return <Circle className="text-[var(--text-tertiary)]" size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Property not found</p>
      </div>
    );
  }

  const annualIncome = Number(property.monthlyRent) * 12;
  const roi = ((annualIncome / Number(property.purchaseCost)) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/properties"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-2"
          >
            <ArrowLeft size={16} />
            Back to Properties
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text)]">{property.address}</h1>
          <p className="text-[var(--text-secondary)]">
            {property.city}, {property.postalCode} {property.country}
          </p>
        </div>
        {getStatusBadge(property.status)}
      </div>

      {/* Financial Card */}
      <Card variant="elevated">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Financial Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Purchase Cost</p>
            <p className="text-xl font-bold text-[var(--text)]">
              {formatCurrency(Number(property.purchaseCost))}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Monthly Rent</p>
            <p className="text-xl font-bold text-[var(--success)]">
              {formatCurrency(Number(property.monthlyRent))}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Annual Income</p>
            <p className="text-xl font-bold text-primary-dark">{formatCurrency(annualIncome)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">ROI</p>
            <p className="text-xl font-bold text-[var(--info)]">{roi}%</p>
          </div>
        </div>
      </Card>

      {/* Tenant Info */}
      {property.tenantName && (
        <Card variant="outlined">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-secondary" size={24} />
            <h2 className="text-lg font-semibold text-[var(--text)]">Current Tenant</h2>
          </div>
          <div className="space-y-2">
            <p className="text-[var(--text)] font-medium">{property.tenantName}</p>
            {property.tenantEmail && (
              <p className="text-sm text-[var(--text-secondary)]">{property.tenantEmail}</p>
            )}
            {property.tenantPhone && (
              <p className="text-sm text-[var(--text-secondary)]">{property.tenantPhone}</p>
            )}
          </div>
          {property.rentalStart && property.rentalEnd && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-[var(--surface-secondary)] text-sm text-[var(--text-secondary)]">
              <Calendar size={16} />
              <span>
                {formatDate(property.rentalStart)} - {formatDate(property.rentalEnd)}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Renovations */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Renovations</h2>
        {property.renovations.length === 0 ? (
          <Card variant="outlined" className="text-center py-8">
            <Hammer className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
            <p className="text-[var(--text-secondary)]">No renovations for this property</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {property.renovations.map((renovation) => {
              const completedSteps = renovation.steps.filter((s) => s.status === 'COMPLETED').length;
              const progress =
                renovation.steps.length > 0
                  ? (completedSteps / renovation.steps.length) * 100
                  : 0;

              return (
                <Card key={renovation.id} variant="outlined">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[var(--text)]">{renovation.title}</h3>
                      {renovation.budget && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Budget: {formatCurrency(Number(renovation.budget))}
                        </p>
                      )}
                    </div>
                    {getRenovationStatusBadge(renovation.status)}
                  </div>

                  {/* Progress Bar */}
                  {renovation.steps.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-secondary)]">
                          {completedSteps} of {renovation.steps.length} steps
                        </span>
                        <span className="text-[var(--text)]">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--success)] rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  {renovation.steps.length > 0 && (
                    <div className="space-y-2">
                      {renovation.steps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-secondary)]"
                        >
                          {getStepIcon(step.status)}
                          <span
                            className={`flex-1 ${
                              step.status === 'COMPLETED'
                                ? 'text-[var(--text-secondary)] line-through'
                                : 'text-[var(--text)]'
                            }`}
                          >
                            {step.title}
                          </span>
                          {step.dueDate && step.status !== 'COMPLETED' && (
                            <span className="text-xs text-[var(--text-tertiary)]">
                              Due: {formatDate(step.dueDate)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dates */}
                  {(renovation.startDate || renovation.endDate) && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-[var(--text-secondary)]">
                      <Calendar size={14} />
                      <span>
                        {renovation.startDate && formatDate(renovation.startDate)}
                        {renovation.startDate && renovation.endDate && ' - '}
                        {renovation.endDate && formatDate(renovation.endDate)}
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Description */}
      {property.description && (
        <Card variant="outlined">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Description</h2>
          <p className="text-[var(--text-secondary)]">{property.description}</p>
        </Card>
      )}
    </div>
  );
}
