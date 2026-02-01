'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  FolderKanban, 
  Building2, 
  DollarSign, 
  ArrowUpRight, 
  User, 
  X,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Users,
} from 'lucide-react';
import { Button, Card, Badge, Input } from '@/components/ui';
import { projectApi, customerAccountApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  ownerId?: string;
  ownerName?: string;
  targetBudget?: number;
  targetProperties?: number;
  startDate?: string;
  targetEndDate?: string;
  isActive: boolean;
  createdAt: string;
  customerAccount?: { id: string; name: string; email?: string; phone?: string };
  stageCounts: Record<string, number>;
  _count: { listings: number; activities: number };
}

interface CustomerAccount {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-500', variant: 'success' as const },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-500', variant: 'warning' as const },
  COMPLETED: { label: 'Completed', color: 'bg-blue-500', variant: 'info' as const },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-500', variant: 'default' as const },
};

const STAGE_LABELS: Record<string, string> = {
  SEARCHING: 'Searching',
  VIEWING: 'Viewing',
  CONSIDERING: 'Considering',
  OFFER_MADE: 'Offer Made',
  UNDER_CONTRACT: 'Under Contract',
  CLOSING: 'Closing',
  PURCHASED: 'Purchased',
  MANAGING: 'Managing',
};

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form state
  const [createMode, setCreateMode] = useState<'existing' | 'new'>('existing');
  const [newProject, setNewProject] = useState({
    name: '',
    customerAccountId: '',
    description: '',
    targetBudget: '',
    targetProperties: '',
    ownerId: '',
    status: 'ACTIVE',
  });
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [projectApi.getAll()];
      
      if (isAdminOrEmployee) {
        promises.push(customerAccountApi.getAll());
        promises.push(projectApi.getEmployees());
      }
      
      const results = await Promise.all(promises);
      setProjects(results[0].data.projects || []);
      
      if (isAdminOrEmployee) {
        setAccounts(results[1]?.data?.accounts || []);
        setEmployees(results[2]?.data?.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;
    
    // Validation
    if (createMode === 'existing' && !newProject.customerAccountId) {
      return;
    }
    if (createMode === 'new' && !newCustomer.name) {
      return;
    }

    try {
      setCreating(true);
      
      const payload: any = {
        name: newProject.name,
        description: newProject.description || undefined,
        targetBudget: newProject.targetBudget ? parseFloat(newProject.targetBudget) : undefined,
        targetProperties: newProject.targetProperties ? parseInt(newProject.targetProperties) : undefined,
        ownerId: newProject.ownerId || undefined,
        status: newProject.status,
      };

      if (createMode === 'existing') {
        payload.customerAccountId = newProject.customerAccountId;
      } else {
        payload.newCustomer = {
          name: newCustomer.name,
          email: newCustomer.email || undefined,
          phone: newCustomer.phone || undefined,
        };
      }

      await projectApi.create(payload);
      setShowCreate(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewProject({ name: '', customerAccountId: '', description: '', targetBudget: '', targetProperties: '', ownerId: '', status: 'ACTIVE' });
    setNewCustomer({ name: '', email: '', phone: '' });
    setCreateMode('existing');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = searchQuery === '' || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customerAccount?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'ACTIVE').length,
    onHold: projects.filter((p) => p.status === 'ON_HOLD').length,
    completed: projects.filter((p) => p.status === 'COMPLETED').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Projects</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Manage property acquisition boards</p>
        </div>
        {isAdminOrEmployee && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Project
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Active</p>
          <p className="text-2xl font-semibold text-[var(--success)]">{stats.active}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">On Hold</p>
          <p className="text-2xl font-semibold text-[var(--warning)]">{stats.onHold}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Completed</p>
          <p className="text-2xl font-semibold text-[var(--info)]">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search projects or customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">New Project</h2>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Customer</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode('existing')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                      createMode === 'existing'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('new')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                      createMode === 'new'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'
                    }`}
                  >
                    + New
                  </button>
                </div>

                {createMode === 'existing' ? (
                  <select
                    value={newProject.customerAccountId}
                    onChange={(e) => setNewProject({ ...newProject, customerAccountId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required={createMode === 'existing'}
                  >
                    <option value="">Select customer...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg bg-[var(--surface-hover)]">
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="Customer name *"
                      className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      required={createMode === 'new'}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        placeholder="Email"
                        className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      />
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        placeholder="Phone"
                        className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., Miami Investment Properties"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                />
              </div>

              {/* Project Manager & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Manager</label>
                  <select
                    value={newProject.ownerId}
                    onChange={(e) => setNewProject({ ...newProject, ownerId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  >
                    <option value="">Select...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Budget & Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Budget</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="number"
                      value={newProject.targetBudget}
                      onChange={(e) => setNewProject({ ...newProject, targetBudget: e.target.value })}
                      placeholder="0"
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5"># Properties</label>
                  <input
                    type="number"
                    value={newProject.targetProperties}
                    onChange={(e) => setNewProject({ ...newProject, targetProperties: e.target.value })}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowCreate(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={creating}>
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <FolderKanban className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {projects.length === 0 
              ? 'Create your first project to start tracking.'
              : 'Try adjusting your search or filter.'}
          </p>
          {isAdminOrEmployee && projects.length === 0 && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--text-muted)] transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-semibold text-sm">
                  {project.name.charAt(0)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[project.status].color}`} />
                  <span className="text-xs text-[var(--text-tertiary)]">{STATUS_CONFIG[project.status].label}</span>
                </div>
              </div>

              {/* Title & Customer */}
              <h3 className="font-medium text-sm text-[var(--text)] mb-0.5 group-hover:text-[var(--primary)] transition-colors">
                {project.name}
              </h3>
              {project.customerAccount && (
                <p className="text-xs text-[var(--text-tertiary)] mb-2">{project.customerAccount.name}</p>
              )}

              {/* Owner */}
              {project.ownerName && (
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  <User size={10} className="inline mr-1" />
                  {project.ownerName}
                </p>
              )}

              {/* Stage progress */}
              <div className="flex gap-0.5 mb-3">
                {['SEARCHING', 'VIEWING', 'CONSIDERING', 'OFFER_MADE', 'UNDER_CONTRACT', 'CLOSING', 'PURCHASED', 'MANAGING'].map((stage) => (
                  <div
                    key={stage}
                    className={`flex-1 h-1 rounded-full ${
                      (project.stageCounts?.[stage] || 0) > 0 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
                    title={`${STAGE_LABELS[stage]}: ${project.stageCounts?.[stage] || 0}`}
                  />
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>{project._count?.listings || 0} properties</span>
                {project.targetBudget ? (
                  <span>{formatCurrency(project.targetBudget)}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
