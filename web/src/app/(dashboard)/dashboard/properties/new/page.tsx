'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  MapPin,
  Users,
  Save,
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { propertyApi, customerAccountApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface CustomerAccount {
  id: string;
  name: string;
}

function NewPropertyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);

  // Pre-select account from URL if provided
  const preselectedAccountId = searchParams.get('accountId') || '';

  // Form state
  const [customerAccountId, setCustomerAccountId] = useState(preselectedAccountId);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Croatia');
  const [description, setDescription] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [status, setStatus] = useState('VACANT');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [rentalStart, setRentalStart] = useState('');
  const [rentalEnd, setRentalEnd] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  useEffect(() => {
    if (isAdmin || isEmployee) {
      loadCustomerAccounts();
    }
  }, [isAdmin, isEmployee]);

  const loadCustomerAccounts = async () => {
    try {
      const response = await customerAccountApi.getAll();
      setCustomerAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Failed to load customer accounts:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerAccountId) {
      setError('Please select a customer account');
      return;
    }

    if (!address.trim() || !city.trim()) {
      setError('Address and city are required');
      return;
    }

    if (!purchaseCost || !monthlyRent) {
      setError('Purchase cost and monthly rent are required');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        customerAccountId,
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim() || undefined,
        country: country.trim(),
        description: description.trim() || undefined,
        purchaseCost: parseFloat(purchaseCost),
        monthlyRent: parseFloat(monthlyRent),
        status,
      };

      if (tenantName.trim()) {
        data.tenantName = tenantName.trim();
        data.tenantEmail = tenantEmail.trim() || undefined;
        data.tenantPhone = tenantPhone.trim() || undefined;
        data.rentalStart = rentalStart || undefined;
        data.rentalEnd = rentalEnd || undefined;
      }

      await propertyApi.create(data);
      router.push('/dashboard/properties');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && !isEmployee) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--error)]">You do not have permission to add properties</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/properties"
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-2"
        >
          <ArrowLeft size={16} />
          Back to Properties
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text)]">Add New Property</h1>
        <p className="text-[var(--text-secondary)]">Create a new property for a customer account</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Account Selection */}
        <Card variant="outlined">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Users size={18} />
            Customer Account
          </h3>
          <select
            value={customerAccountId}
            onChange={(e) => setCustomerAccountId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          >
            <option value="">Select a customer account...</option>
            {customerAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Card>

        {/* Property Details */}
        <Card variant="outlined">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <MapPin size={18} />
            Property Location
          </h3>
          <div className="space-y-4">
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Zagreb"
                required
              />
              <Input
                label="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="10000"
              />
            </div>
            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Croatia"
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Property description..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Financial Details */}
        <Card variant="outlined">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <DollarSign size={18} />
            Financial Details
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Purchase Cost (€)"
                type="number"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="150000"
                min="0"
                step="0.01"
                required
              />
              <Input
                label="Monthly Rent (€)"
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="800"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="VACANT">Vacant</option>
                <option value="ACTIVE">Active (Rented)</option>
                <option value="RENOVATION">Under Renovation</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Tenant Info (optional) */}
        <Card variant="outlined">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Users size={18} />
            Tenant Information (Optional)
          </h3>
          <div className="space-y-4">
            <Input
              label="Tenant Name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="John Doe"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tenant Email"
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                placeholder="tenant@example.com"
              />
              <Input
                label="Tenant Phone"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                placeholder="+385 91 123 4567"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Rental Start"
                type="date"
                value={rentalStart}
                onChange={(e) => setRentalStart(e.target.value)}
              />
              <Input
                label="Rental End"
                type="date"
                value={rentalEnd}
                onChange={(e) => setRentalEnd(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            <Save size={18} className="mr-2" />
            Create Property
          </Button>
        </div>
      </form>
    </div>
  );
}

function NewPropertyLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<NewPropertyLoading />}>
      <NewPropertyForm />
    </Suspense>
  );
}
