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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Projects</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage property acquisition boards</p>
        </div>
        {isAdminOrEmployee && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            New Project
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">Total Projects</p>
          <p className="text-2xl font-bold text-[var(--text)]">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">Active</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.active}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">On Hold</p>
          <p className="text-2xl font-bold text-amber-500">{stats.onHold}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">Completed</p>
          <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search projects or customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
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
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] w-full max-w-lg shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]">Create New Project</h2>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-5 space-y-5">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Customer</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCreateMode('existing')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      createMode === 'existing'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'
                    }`}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('new')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      createMode === 'new'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'
                    }`}
                  >
                    + New Customer
                  </button>
                </div>

                {createMode === 'existing' ? (
                  <select
                    value={newProject.customerAccountId}
                    onChange={(e) => setNewProject({ ...newProject, customerAccountId: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required={createMode === 'existing'}
                  >
                    <option value="">Select customer...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3 p-4 rounded-lg bg-[var(--surface-hover)]">
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="Customer name *"
                      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      required={createMode === 'new'}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        placeholder="Email"
                        className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      />
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        placeholder="Phone"
                        className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., Miami Investment Properties"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                />
              </div>

              {/* Project Manager & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Project Manager</label>
                  <select
                    value={newProject.ownerId}
                    onChange={(e) => setNewProject({ ...newProject, ownerId: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  >
                    <option value="">Select manager...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Project notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>

              {/* Budget & Target */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Target Budget</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="number"
                      value={newProject.targetBudget}
                      onChange={(e) => setNewProject({ ...newProject, targetBudget: e.target.value })}
                      placeholder="0"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Target Properties</label>
                  <input
                    type="number"
                    value={newProject.targetProperties}
                    onChange={(e) => setNewProject({ ...newProject, targetProperties: e.target.value })}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowCreate(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={creating}>
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
            <FolderKanban className="text-[var(--primary)]" size={28} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
            {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
          </h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
            {projects.length === 0 
              ? 'Create your first project to start tracking property acquisitions for your clients.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {isAdminOrEmployee && projects.length === 0 && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 hover:border-[var(--text-muted)] hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
                  {project.name.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[project.status].color}`} />
                  <span className="text-xs text-[var(--text-tertiary)]">{STATUS_CONFIG[project.status].label}</span>
                </div>
              </div>

              {/* Title & Customer */}
              <h3 className="font-semibold text-[var(--text)] mb-1 group-hover:text-[var(--primary)] transition-colors">
                {project.name}
              </h3>
              {project.customerAccount && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] mb-3">
                  <Users size={14} />
                  <span>{project.customerAccount.name}</span>
                </div>
              )}

              {/* Owner */}
              {project.ownerName && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                  <User size={12} />
                  <span>Managed by {project.ownerName}</span>
                </div>
              )}

              {/* Stage progress */}
              <div className="flex gap-1 mb-4">
                {['SEARCHING', 'VIEWING', 'CONSIDERING', 'OFFER_MADE', 'UNDER_CONTRACT', 'CLOSING', 'PURCHASED', 'MANAGING'].map((stage) => (
                  <div
                    key={stage}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      (project.stageCounts?.[stage] || 0) > 0 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
                    title={`${STAGE_LABELS[stage]}: ${project.stageCounts?.[stage] || 0}`}
                  />
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Building2 size={14} />
                  <span>{project._count?.listings || 0} properties</span>
                </div>
                {project.targetBudget ? (
                  <span className="text-[var(--text-tertiary)]">{formatCurrency(project.targetBudget)}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
