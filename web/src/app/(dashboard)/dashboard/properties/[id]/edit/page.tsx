'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  MapPin,
  Users,
  Save,
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { propertyApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function EditPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
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
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await propertyApi.getById(id as string);
      const property = response.data.property;

      setAddress(property.address || '');
      setCity(property.city || '');
      setPostalCode(property.postalCode || '');
      setCountry(property.country || 'Croatia');
      setDescription(property.description || '');
      setPurchaseCost(property.purchaseCost?.toString() || '');
      setMonthlyRent(property.monthlyRent?.toString() || '');
      setStatus(property.status || 'VACANT');
      setTenantName(property.tenantName || '');
      setTenantEmail(property.tenantEmail || '');
      setTenantPhone(property.tenantPhone || '');
      setRentalStart(property.rentalStart ? property.rentalStart.split('T')[0] : '');
      setRentalEnd(property.rentalEnd ? property.rentalEnd.split('T')[0] : '');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load property');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim() || undefined,
        country: country.trim(),
        description: description.trim() || undefined,
        purchaseCost: parseFloat(purchaseCost),
        monthlyRent: parseFloat(monthlyRent),
        status,
        tenantName: tenantName.trim() || undefined,
        tenantEmail: tenantEmail.trim() || undefined,
        tenantPhone: tenantPhone.trim() || undefined,
        rentalStart: rentalStart || undefined,
        rentalEnd: rentalEnd || undefined,
      };

      await propertyApi.update(id as string, data);
      router.push(`/dashboard/properties/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update property');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && !isEmployee) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--error)]">You do not have permission to edit properties</p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/properties/${id}`}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-2"
        >
          <ArrowLeft size={16} />
          Back to Property
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text)]">Edit Property</h1>
        <p className="text-[var(--text-secondary)]">Update property details</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Tenant Info */}
        <Card variant="outlined">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Users size={18} />
            Tenant Information
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
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
