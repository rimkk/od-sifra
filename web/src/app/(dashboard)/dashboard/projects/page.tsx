'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FolderKanban, Building2, DollarSign, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { projectApi, customerAccountApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Project {
  id: string;
  name: string;
  description?: string;
  targetBudget?: number;
  targetProperties?: number;
  isActive: boolean;
  createdAt: string;
  customerAccount?: { id: string; name: string };
  stageCounts: Record<string, number>;
  _count: { listings: number; activities: number };
}

interface CustomerAccount {
  id: string;
  name: string;
}

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
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    customerAccountId: '',
    description: '',
    targetBudget: '',
    targetProperties: '',
  });

  const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, accountsRes] = await Promise.all([
        projectApi.getAll(),
        isAdminOrEmployee ? customerAccountApi.getAll() : Promise.resolve({ data: { accounts: [] } }),
      ]);
      setProjects(projectsRes.data.projects || []);
      setAccounts(accountsRes.data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.customerAccountId) return;

    try {
      setCreating(true);
      await projectApi.create({
        name: newProject.name,
        customerAccountId: newProject.customerAccountId,
        description: newProject.description || undefined,
        targetBudget: newProject.targetBudget ? parseFloat(newProject.targetBudget) : undefined,
        targetProperties: newProject.targetProperties ? parseInt(newProject.targetProperties) : undefined,
      });
      setShowCreate(false);
      setNewProject({ name: '', customerAccountId: '', description: '', targetBudget: '', targetProperties: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-8">
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] w-full max-w-md p-4">
            <h2 className="text-base font-medium text-[var(--text)] mb-4">Create Project</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Customer Account</label>
                <select
                  value={newProject.customerAccountId}
                  onChange={(e) => setNewProject({ ...newProject, customerAccountId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  required
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., Miami Investment Properties"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Description (optional)</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Project notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Target Budget</label>
                  <input
                    type="number"
                    value={newProject.targetBudget}
                    onChange={(e) => setNewProject({ ...newProject, targetBudget: e.target.value })}
                    placeholder="$0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Target Properties</label>
                  <input
                    type="number"
                    value={newProject.targetProperties}
                    onChange={(e) => setNewProject({ ...newProject, targetProperties: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1" loading={creating}>
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
            <FolderKanban className="text-[var(--primary)]" size={28} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No projects yet</h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
            Create your first project to start tracking property acquisitions for your clients.
          </p>
          {isAdminOrEmployee && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 hover:border-[var(--text-muted)] hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
                  {project.name.charAt(0)}
                </div>
                <ArrowUpRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              </div>

              <h3 className="font-semibold text-[var(--text)] mb-1">{project.name}</h3>
              {project.customerAccount && (
                <p className="text-sm text-[var(--text-tertiary)] mb-4">{project.customerAccount.name}</p>
              )}

              {/* Stage progress */}
              <div className="flex gap-1 mb-4">
                {['SEARCHING', 'VIEWING', 'CONSIDERING', 'OFFER_MADE', 'UNDER_CONTRACT', 'CLOSING', 'PURCHASED', 'MANAGING'].map((stage) => (
                  <div
                    key={stage}
                    className={`flex-1 h-1.5 rounded-full ${
                      (project.stageCounts?.[stage] || 0) > 0 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
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
