'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  Circle,
  Play,
  X,
  User,
  Package,
  Calendar,
  MoreHorizontal,
  Trash2,
  Edit2,
  ChevronDown,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { renovationTaskApi, contractorApi } from '@/lib/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  estimatedCost?: number;
  actualCost?: number;
  laborCost?: number;
  materialCost?: number;
  estimatedHours?: number;
  actualHours?: number;
  progress: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  contractor?: { id: string; name: string; specialty?: string };
  _count?: { materials: number; timeEntries: number };
}

interface Renovation {
  id: string;
  title: string;
  description?: string;
  status: string;
  budget?: number;
  actualCost?: number;
  property?: { id: string; address: string; city: string; customerAccount?: { name: string } };
}

interface Contractor {
  id: string;
  name: string;
  specialty?: string;
  hourlyRate?: number;
}

const STATUS_COLUMNS = [
  { key: 'PLANNED', label: 'Planned', icon: Circle, color: 'text-[var(--text-tertiary)]' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: Play, color: 'text-[var(--warning)]' },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: 'text-[var(--success)]' },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-gray-500' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-500' },
  HIGH: { label: 'High', color: 'bg-orange-500' },
  URGENT: { label: 'Urgent', color: 'bg-red-500' },
};

const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Flooring', 'Painting', 'Carpentry', 'Roofing', 'General'];

export default function RenovationBoardPage() {
  const params = useParams();
  const router = useRouter();
  const renovationId = params.id as string;

  const [renovation, setRenovation] = useState<Renovation | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, Task[]>>({});
  const [totals, setTotals] = useState<any>({});
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddTask, setShowAddTask] = useState(false);
  const [addingToStatus, setAddingToStatus] = useState<string>('PLANNED');
  const [saving, setSaving] = useState(false);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    contractorId: '',
    priority: 'MEDIUM',
    category: '',
    estimatedCost: '',
    estimatedHours: '',
    dueDate: '',
  });

  useEffect(() => {
    if (renovationId) {
      fetchData();
      fetchContractors();
    }
  }, [renovationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await renovationTaskApi.getByRenovation(renovationId);
      setRenovation(res.data.renovation);
      setTasks(res.data.tasks || []);
      setByStatus(res.data.byStatus || {});
      setTotals(res.data.totals || {});
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractors = async () => {
    try {
      const res = await contractorApi.getAll();
      setContractors(res.data.contractors || []);
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      setSaving(true);
      await renovationTaskApi.create({
        renovationId,
        title: taskForm.title,
        description: taskForm.description || undefined,
        contractorId: taskForm.contractorId || undefined,
        status: addingToStatus,
        priority: taskForm.priority,
        category: taskForm.category || undefined,
        estimatedCost: taskForm.estimatedCost ? parseFloat(taskForm.estimatedCost) : undefined,
        estimatedHours: taskForm.estimatedHours ? parseFloat(taskForm.estimatedHours) : undefined,
        dueDate: taskForm.dueDate || undefined,
      });
      setShowAddTask(false);
      resetTaskForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      await renovationTaskApi.move(taskId, newStatus);
      fetchData();
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await renovationTaskApi.delete(taskId);
      fetchData();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateProgress = async (taskId: string, progress: number) => {
    try {
      await renovationTaskApi.update(taskId, { progress });
      fetchData();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({ title: '', description: '', contractorId: '', priority: 'MEDIUM', category: '', estimatedCost: '', estimatedHours: '', dueDate: '' });
  };

  const openAddTask = (status: string) => {
    setAddingToStatus(status);
    resetTaskForm();
    setShowAddTask(true);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
        </div>
      </div>
    );
  }

  if (!renovation) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--text-secondary)]">Renovation not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-[var(--text)]">{renovation.title}</h1>
            {renovation.property && (
              <p className="text-sm text-[var(--text-tertiary)]">{renovation.property.address}, {renovation.property.city}</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">Budget:</span>
            <span className="font-medium text-[var(--text)]">{formatCurrency(Number(renovation.budget))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">Spent:</span>
            <span className="font-medium text-[var(--text)]">{formatCurrency(Number(totals.actualCost) + Number(totals.laborCost) + Number(totals.materialCost))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">Labor:</span>
            <span className="font-medium">{formatCurrency(Number(totals.laborCost))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">Materials:</span>
            <span className="font-medium">{formatCurrency(Number(totals.materialCost))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">Hours:</span>
            <span className="font-medium">{Number(totals.actualHours || 0).toFixed(1)}h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">Tasks:</span>
            <span className="font-medium">{tasks.length}</span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max h-full">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key} className="w-80 flex flex-col bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <col.icon size={16} className={col.color} />
                  <span className="font-medium text-sm text-[var(--text)]">{col.label}</span>
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-hover)] px-1.5 py-0.5 rounded">
                    {byStatus[col.key]?.length || 0}
                  </span>
                </div>
                <button
                  onClick={() => openAddTask(col.key)}
                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)]"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {(byStatus[col.key] || []).map((task) => (
                  <div key={task.id} className="bg-[var(--background)] rounded-lg border border-[var(--border)] p-3 hover:border-[var(--text-muted)] transition-colors">
                    {/* Task Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-[var(--text)] flex-1">{task.title}</h4>
                      <div className="flex items-center gap-1">
                        {col.key !== 'COMPLETED' && (
                          <button
                            onClick={() => handleMoveTask(task.id, col.key === 'PLANNED' ? 'IN_PROGRESS' : 'COMPLETED')}
                            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--success)] hover:bg-[var(--success-light)]"
                            title={col.key === 'PLANNED' ? 'Start' : 'Complete'}
                          >
                            {col.key === 'PLANNED' ? <Play size={14} /> : <CheckCircle size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {task.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
                          {task.category}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${PRIORITY_CONFIG[task.priority]?.color || 'bg-gray-500'}`}>
                        {task.priority}
                      </span>
                    </div>

                    {/* Contractor */}
                    {task.contractor && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--text-tertiary)]">
                        <User size={12} />
                        <span>{task.contractor.name}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {col.key === 'IN_PROGRESS' && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[var(--primary)] rounded-full transition-all" 
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <div className="flex gap-1 mt-1">
                          {[0, 25, 50, 75, 100].map((p) => (
                            <button
                              key={p}
                              onClick={() => handleUpdateProgress(task.id, p)}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${task.progress === p ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-active)]'}`}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      {task.estimatedCost && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} />
                          {formatCurrency(Number(task.estimatedCost))}
                        </span>
                      )}
                      {task.actualHours && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {Number(task.actualHours).toFixed(1)}h
                        </span>
                      )}
                      {task._count?.materials ? (
                        <span className="flex items-center gap-1">
                          <Package size={12} />
                          {task._count.materials}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {(!byStatus[col.key] || byStatus[col.key].length === 0) && (
                  <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">Add Task</h2>
              <button onClick={() => setShowAddTask(false)} className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Contractor</label>
                  <select
                    value={taskForm.contractorId}
                    onChange={(e) => setTaskForm({ ...taskForm, contractorId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  >
                    <option value="">Unassigned</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Category</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Est. Cost</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="number"
                      value={taskForm.estimatedCost}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedCost: e.target.value })}
                      placeholder="0"
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Est. Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Task details..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddTask(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>Add Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
