'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Building2,
  DollarSign,
  MapPin,
  Bed,
  Bath,
  Square,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { projectApi, listingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const STAGES = [
  { key: 'SEARCHING', label: 'Searching', color: 'var(--text-tertiary)' },
  { key: 'VIEWING', label: 'Viewing', color: '#3B82F6' },
  { key: 'CONSIDERING', label: 'Considering', color: '#8B5CF6' },
  { key: 'OFFER_MADE', label: 'Offer Made', color: '#F59E0B' },
  { key: 'UNDER_CONTRACT', label: 'Under Contract', color: '#EC4899' },
  { key: 'CLOSING', label: 'Closing', color: '#14B8A6' },
  { key: 'PURCHASED', label: 'Purchased', color: '#10B981' },
  { key: 'MANAGING', label: 'Managing', color: '#22C55E' },
];

interface Listing {
  id: string;
  stage: string;
  orderIndex: number;
  address: string;
  city: string;
  state?: string;
  askingPrice?: number;
  purchasePrice?: number;
  estimatedRent?: number;
  actualRent?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  imageUrl?: string;
  listingUrl?: string;
  tasks: Array<{ id: string; title: string; status: string }>;
  _count: { comments: number; documents: number };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  targetBudget?: number;
  customerAccount?: { id: string; name: string };
  listings: Listing[];
}

interface Financials {
  totalListings: number;
  purchasedCount: number;
  totalAskingPrice: number;
  totalPurchasePrice: number;
  totalEstimatedRent: number;
  totalActualRent: number;
}

export default function ProjectBoardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddListing, setShowAddListing] = useState(false);
  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [newListing, setNewListing] = useState({
    address: '',
    city: '',
    state: '',
    askingPrice: '',
    estimatedRent: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    listingUrl: '',
    notes: '',
  });

  const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

  const fetchProject = useCallback(async () => {
    try {
      const response = await projectApi.getById(params.id as string);
      setProject(response.data.project);
      setFinancials(response.data.financials);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListing.address || !newListing.city || !addingToStage) return;

    try {
      await listingApi.create({
        projectId: params.id as string,
        address: newListing.address,
        city: newListing.city,
        state: newListing.state || undefined,
        stage: addingToStage,
        askingPrice: newListing.askingPrice ? parseFloat(newListing.askingPrice) : undefined,
        estimatedRent: newListing.estimatedRent ? parseFloat(newListing.estimatedRent) : undefined,
        propertyType: newListing.propertyType || undefined,
        bedrooms: newListing.bedrooms ? parseInt(newListing.bedrooms) : undefined,
        bathrooms: newListing.bathrooms ? parseFloat(newListing.bathrooms) : undefined,
        sqft: newListing.sqft ? parseInt(newListing.sqft) : undefined,
        listingUrl: newListing.listingUrl || undefined,
        notes: newListing.notes || undefined,
      });
      setShowAddListing(false);
      setAddingToStage(null);
      setNewListing({
        address: '',
        city: '',
        state: '',
        askingPrice: '',
        estimatedRent: '',
        propertyType: '',
        bedrooms: '',
        bathrooms: '',
        sqft: '',
        listingUrl: '',
        notes: '',
      });
      fetchProject();
    } catch (error) {
      console.error('Failed to add listing:', error);
    }
  };

  const handleMoveListing = async (listingId: string, newStage: string) => {
    try {
      await listingApi.move(listingId, newStage);
      fetchProject();
    } catch (error) {
      console.error('Failed to move listing:', error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getListingsByStage = (stage: string) => {
    return project?.listings.filter((l) => l.stage === stage) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--text-secondary)]">Project not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push('/dashboard/projects')} className="text-[var(--text-tertiary)] hover:text-[var(--text)]">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-medium text-[var(--text)]">{project.name}</h1>
            {project.customerAccount && (
              <p className="text-xs text-[var(--text-tertiary)]">{project.customerAccount.name}</p>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        {financials && (
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-[var(--text-tertiary)]">Properties: </span>
              <span className="text-[var(--text)]">{financials.totalListings}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Purchased: </span>
              <span className="text-[var(--success)]">{financials.purchasedCount}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Total Investment: </span>
              <span className="text-[var(--text)]">{formatCurrency(financials.totalPurchasePrice)}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Monthly Rent: </span>
              <span className="text-[var(--success)]">{formatCurrency(financials.totalActualRent || financials.totalEstimatedRent)}/mo</span>
            </div>
            {financials.totalPurchasePrice > 0 && (
              <div>
                <span className="text-[var(--text-tertiary)]">Annual ROI: </span>
                <span className="text-primary">
                  {(((financials.totalActualRent || financials.totalEstimatedRent) * 12) / financials.totalPurchasePrice * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full p-4 gap-3" style={{ minWidth: 'max-content' }}>
          {STAGES.map((stage) => {
            const listings = getListingsByStage(stage.key);
            return (
              <div
                key={stage.key}
                className="w-72 flex-shrink-0 flex flex-col bg-[var(--surface-secondary)] rounded-lg"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-medium text-[var(--text)]">{stage.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{listings.length}</span>
                  </div>
                  {isAdminOrEmployee && (
                    <button
                      onClick={() => {
                        setAddingToStage(stage.key);
                        setShowAddListing(true);
                      }}
                      className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-tertiary)]"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {listings.map((listing) => (
                    <div
                      key={listing.id}
                      className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:border-[var(--text-muted)] transition-colors"
                      onClick={() => router.push(`/dashboard/projects/${params.id}/listing/${listing.id}`)}
                    >
                      {/* Image */}
                      {listing.imageUrl && (
                        <div className="h-24 rounded overflow-hidden mb-2 -mx-1 -mt-1">
                          <img src={listing.imageUrl} alt={listing.address} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Address */}
                      <h4 className="text-sm text-[var(--text)] font-medium line-clamp-1">{listing.address}</h4>
                      <p className="text-xs text-[var(--text-tertiary)] mb-2">
                        {listing.city}{listing.state ? `, ${listing.state}` : ''}
                      </p>

                      {/* Price */}
                      <div className="flex items-center gap-2 mb-2">
                        {listing.purchasePrice ? (
                          <span className="text-xs font-medium text-[var(--success)]">
                            {formatCurrency(listing.purchasePrice)}
                          </span>
                        ) : listing.askingPrice ? (
                          <span className="text-xs text-[var(--text)]">
                            {formatCurrency(listing.askingPrice)}
                          </span>
                        ) : null}
                        {(listing.actualRent || listing.estimatedRent) && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {formatCurrency(listing.actualRent || listing.estimatedRent)}/mo
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        {listing.bedrooms && (
                          <span className="flex items-center gap-0.5">
                            <Bed size={10} /> {listing.bedrooms}
                          </span>
                        )}
                        {listing.bathrooms && (
                          <span className="flex items-center gap-0.5">
                            <Bath size={10} /> {listing.bathrooms}
                          </span>
                        )}
                        {listing.sqft && (
                          <span className="flex items-center gap-0.5">
                            <Square size={10} /> {listing.sqft.toLocaleString()}
                          </span>
                        )}
                        {listing.propertyType && (
                          <span>{listing.propertyType}</span>
                        )}
                      </div>

                      {/* Tasks indicator */}
                      {listing.tasks.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border)]">
                          <CheckCircle2 size={10} className="text-[var(--text-tertiary)]" />
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {listing.tasks.filter((t) => t.status === 'DONE').length}/{listing.tasks.length} tasks
                          </span>
                        </div>
                      )}

                      {/* Move buttons (for admin/employee) */}
                      {isAdminOrEmployee && (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--border)]">
                          {STAGES.map((s, idx) => {
                            const currentIdx = STAGES.findIndex((st) => st.key === listing.stage);
                            if (idx === currentIdx) return null;
                            if (idx !== currentIdx - 1 && idx !== currentIdx + 1) return null;
                            return (
                              <button
                                key={s.key}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveListing(listing.id, s.key);
                                }}
                                className="flex-1 py-1 rounded text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-secondary)] transition-colors"
                              >
                                {idx < currentIdx ? '←' : '→'} {s.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {listings.length === 0 && (
                    <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                      No properties
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Listing Modal */}
      {showAddListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] w-full max-w-md max-h-[90vh] overflow-y-auto p-4">
            <h2 className="text-base font-medium text-[var(--text)] mb-4">
              Add Property to {STAGES.find((s) => s.key === addingToStage)?.label}
            </h2>
            <form onSubmit={handleAddListing} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Address *</label>
                <input
                  type="text"
                  value={newListing.address}
                  onChange={(e) => setNewListing({ ...newListing, address: e.target.value })}
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">City *</label>
                  <input
                    type="text"
                    value={newListing.city}
                    onChange={(e) => setNewListing({ ...newListing, city: e.target.value })}
                    placeholder="Miami"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">State</label>
                  <input
                    type="text"
                    value={newListing.state}
                    onChange={(e) => setNewListing({ ...newListing, state: e.target.value })}
                    placeholder="FL"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Asking Price</label>
                  <input
                    type="number"
                    value={newListing.askingPrice}
                    onChange={(e) => setNewListing({ ...newListing, askingPrice: e.target.value })}
                    placeholder="$0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Est. Rent/mo</label>
                  <input
                    type="number"
                    value={newListing.estimatedRent}
                    onChange={(e) => setNewListing({ ...newListing, estimatedRent: e.target.value })}
                    placeholder="$0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Property Type</label>
                <select
                  value={newListing.propertyType}
                  onChange={(e) => setNewListing({ ...newListing, propertyType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                >
                  <option value="">Select type...</option>
                  <option value="Single Family">Single Family</option>
                  <option value="Multi-Family">Multi-Family</option>
                  <option value="Condo">Condo</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Duplex">Duplex</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Beds</label>
                  <input
                    type="number"
                    value={newListing.bedrooms}
                    onChange={(e) => setNewListing({ ...newListing, bedrooms: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Baths</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newListing.bathrooms}
                    onChange={(e) => setNewListing({ ...newListing, bathrooms: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Sqft</label>
                  <input
                    type="number"
                    value={newListing.sqft}
                    onChange={(e) => setNewListing({ ...newListing, sqft: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Listing URL</label>
                <input
                  type="url"
                  value={newListing.listingUrl}
                  onChange={(e) => setNewListing({ ...newListing, listingUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea
                  value={newListing.notes}
                  onChange={(e) => setNewListing({ ...newListing, notes: e.target.value })}
                  placeholder="Any notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowAddListing(false);
                    setAddingToStage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1">
                  Add Property
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
