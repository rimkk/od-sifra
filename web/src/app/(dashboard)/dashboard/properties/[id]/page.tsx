'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { Card, Badge, Button, Input } from '@/components/ui';
import { propertyApi, renovationApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

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
  customerAccount?: { id: string; name: string };
  renovations: {
    id: string;
    title: string;
    description?: string;
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
  const router = useRouter();
  const { user } = useAuthStore();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Renovation modal state
  const [showAddRenovation, setShowAddRenovation] = useState(false);
  const [renovationTitle, setRenovationTitle] = useState('');
  const [renovationDescription, setRenovationDescription] = useState('');
  const [renovationBudget, setRenovationBudget] = useState('');
  const [renovationStartDate, setRenovationStartDate] = useState('');
  const [renovationEndDate, setRenovationEndDate] = useState('');
  const [savingRenovation, setSavingRenovation] = useState(false);

  // Step modal state
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepDueDate, setStepDueDate] = useState('');
  const [savingStep, setSavingStep] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canEdit = isAdmin || isEmployee;
  const canDelete = isAdmin;

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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await propertyApi.delete(id as string);
      router.push('/dashboard/properties');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete property');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddRenovation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renovationTitle.trim()) return;

    setSavingRenovation(true);
    try {
      await renovationApi.create({
        propertyId: id,
        title: renovationTitle.trim(),
        description: renovationDescription.trim() || undefined,
        budget: renovationBudget ? parseFloat(renovationBudget) : undefined,
        startDate: renovationStartDate || undefined,
        endDate: renovationEndDate || undefined,
      });
      setShowAddRenovation(false);
      setRenovationTitle('');
      setRenovationDescription('');
      setRenovationBudget('');
      setRenovationStartDate('');
      setRenovationEndDate('');
      fetchProperty();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add renovation');
    } finally {
      setSavingRenovation(false);
    }
  };

  const handleAddStep = async (renovationId: string) => {
    if (!stepTitle.trim()) return;

    setSavingStep(true);
    try {
      await renovationApi.addStep(renovationId, {
        title: stepTitle.trim(),
        dueDate: stepDueDate || undefined,
      });
      setAddingStepTo(null);
      setStepTitle('');
      setStepDueDate('');
      fetchProperty();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add step');
    } finally {
      setSavingStep(false);
    }
  };

  const handleToggleStep = async (stepId: string, currentStatus: string) => {
    try {
      await renovationApi.updateStep(stepId, {
        status: currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED',
      });
      fetchProperty();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update step');
    }
  };

  const handleUpdateRenovationStatus = async (renovationId: string, status: string) => {
    try {
      await renovationApi.update(renovationId, { status });
      fetchProperty();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update renovation');
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
        <div className="flex items-center gap-3">
          {getStatusBadge(property.status)}
          {canEdit && (
            <Link href={`/dashboard/properties/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              className="text-[var(--error)] border-[var(--error)] hover:bg-[var(--error-bg)]"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Customer Account Info */}
      {property.customerAccount && (
        <Card variant="outlined">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-secondary" size={24} />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Assigned to Customer</p>
                <Link
                  href={`/dashboard/customers/${property.customerAccount.id}`}
                  className="text-lg font-semibold text-[var(--text)] hover:text-secondary flex items-center gap-1"
                >
                  {property.customerAccount.name}
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Renovations</h2>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowAddRenovation(true)}>
              <Plus size={16} className="mr-2" />
              Add Renovation
            </Button>
          )}
        </div>

        {/* Add Renovation Modal */}
        {showAddRenovation && (
          <Card variant="outlined" className="mb-4">
            <form onSubmit={handleAddRenovation} className="space-y-4">
              <h3 className="font-semibold text-[var(--text)]">New Renovation</h3>
              <Input
                label="Title"
                value={renovationTitle}
                onChange={(e) => setRenovationTitle(e.target.value)}
                placeholder="Kitchen Remodel"
                required
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Description
                </label>
                <textarea
                  value={renovationDescription}
                  onChange={(e) => setRenovationDescription(e.target.value)}
                  placeholder="Renovation details..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Budget (€)"
                  type="number"
                  value={renovationBudget}
                  onChange={(e) => setRenovationBudget(e.target.value)}
                  placeholder="10000"
                  min="0"
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={renovationStartDate}
                  onChange={(e) => setRenovationStartDate(e.target.value)}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={renovationEndDate}
                  onChange={(e) => setRenovationEndDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={savingRenovation}>
                  Add Renovation
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddRenovation(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {property.renovations.length === 0 ? (
          <Card variant="outlined" className="text-center py-8">
            <Hammer className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
            <p className="text-[var(--text-secondary)]">No renovations for this property</p>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddRenovation(true)}
              >
                <Plus size={16} className="mr-2" />
                Add First Renovation
              </Button>
            )}
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
                      {renovation.description && (
                        <p className="text-sm text-[var(--text-secondary)]">{renovation.description}</p>
                      )}
                      {renovation.budget && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Budget: {formatCurrency(Number(renovation.budget))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getRenovationStatusBadge(renovation.status)}
                      {canEdit && (
                        <select
                          value={renovation.status}
                          onChange={(e) => handleUpdateRenovationStatus(renovation.id, e.target.value)}
                          className="text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                        >
                          <option value="PLANNED">Planned</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      )}
                    </div>
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
                  <div className="space-y-2">
                    {renovation.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-secondary)]"
                      >
                        <button
                          onClick={() => canEdit && handleToggleStep(step.id, step.status)}
                          className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                        >
                          {getStepIcon(step.status)}
                        </button>
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

                    {/* Add Step Form */}
                    {addingStepTo === renovation.id ? (
                      <div className="flex gap-2 p-2">
                        <Input
                          placeholder="Step title..."
                          value={stepTitle}
                          onChange={(e) => setStepTitle(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="date"
                          value={stepDueDate}
                          onChange={(e) => setStepDueDate(e.target.value)}
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddStep(renovation.id)}
                          loading={savingStep}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingStepTo(null);
                            setStepTitle('');
                            setStepDueDate('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      canEdit && (
                        <button
                          onClick={() => setAddingStepTo(renovation.id)}
                          className="flex items-center gap-2 p-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]"
                        >
                          <Plus size={16} />
                          Add Step
                        </button>
                      )
                    )}
                  </div>

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
