'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Check,
  X,
  User,
  Calendar,
  DollarSign,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { boardApi, groupApi, taskApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface Column {
  id: string;
  name: string;
  type: string;
  width?: number;
  settings?: any;
  position: number;
}

interface Task {
  id: string;
  name: string;
  position: number;
  fieldValues: { id: string; columnId: string; value: any }[];
  assignments: { user: { id: string; name: string; avatarUrl?: string } }[];
  _count: { comments: number; subTasks: number };
}

interface Group {
  id: string;
  name: string;
  color?: string;
  collapsed: boolean;
  position: number;
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  type: string;
  description?: string;
  columns: Column[];
  groups: Group[];
  workspace: { members: { user: { id: string; name: string; avatarUrl?: string; role: string } }[] };
}

const STATUS_COLORS: Record<string, string> = {
  '1': '#6B7280',
  '2': '#3B82F6',
  '3': '#F59E0B',
  '4': '#10B981',
  '5': '#EF4444',
};

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<{ groupId: string; taskId?: string; name: string } | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
  const [addingTask, setAddingTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');

  useEffect(() => {
    if (boardId) {
      fetchBoard();
    }
  }, [boardId]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await boardApi.getById(boardId);
      setBoard(res.data.board);
      setCanEdit(res.data.canEdit);
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!canEdit) return;
    try {
      await groupApi.create({ boardId, name: 'New Group' });
      fetchBoard();
    } catch (error) {
      console.error('Failed to add group:', error);
    }
  };

  const handleUpdateGroup = async (id: string, data: any) => {
    try {
      await groupApi.update(id, data);
      setEditingGroup(null);
      fetchBoard();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group and all its tasks?')) return;
    try {
      await groupApi.delete(id);
      fetchBoard();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const handleToggleCollapse = async (group: Group) => {
    try {
      await groupApi.update(group.id, { collapsed: !group.collapsed });
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) =>
            g.id === group.id ? { ...g, collapsed: !g.collapsed } : g
          ),
        };
      });
    } catch (error) {
      console.error('Failed to toggle collapse:', error);
    }
  };

  const handleAddTask = async (groupId: string) => {
    if (!newTaskName.trim()) {
      setAddingTask(null);
      return;
    }
    try {
      await taskApi.create({ groupId, name: newTaskName.trim() });
      setNewTaskName('');
      setAddingTask(null);
      fetchBoard();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleUpdateTask = async (id: string, data: any) => {
    try {
      await taskApi.update(id, data);
      setEditingTask(null);
      fetchBoard();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskApi.delete(id);
      fetchBoard();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateField = async (taskId: string, columnId: string, value: any) => {
    try {
      await taskApi.updateField(taskId, columnId, value);
      // Optimistically update
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) => ({
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const existingIdx = t.fieldValues.findIndex((fv) => fv.columnId === columnId);
              const newFieldValues = [...t.fieldValues];
              if (existingIdx >= 0) {
                newFieldValues[existingIdx] = { ...newFieldValues[existingIdx], value };
              } else {
                newFieldValues.push({ id: 'temp', columnId, value });
              }
              return { ...t, fieldValues: newFieldValues };
            }),
          })),
        };
      });
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const getFieldValue = (task: Task, columnId: string) => {
    const fv = task.fieldValues.find((v) => v.columnId === columnId);
    return fv?.value;
  };

  const renderCell = (task: Task, column: Column) => {
    const value = getFieldValue(task, column.id);

    switch (column.type) {
      case 'STATUS':
        const options = column.settings?.options || [];
        const selectedOption = options.find((o: any) => o.id === value);
        return (
          <select
            value={value || ''}
            onChange={(e) => handleUpdateField(task.id, column.id, e.target.value)}
            disabled={!canEdit}
            className="w-full h-full px-2 bg-transparent border-0 text-xs cursor-pointer focus:outline-none"
            style={{ backgroundColor: selectedOption ? selectedOption.color + '20' : 'transparent', color: selectedOption?.color }}
          >
            <option value="">Select...</option>
            {options.map((opt: any) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        );

      case 'PERSON':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleUpdateField(task.id, column.id, e.target.value)}
            disabled={!canEdit}
            className="w-full h-full px-2 bg-transparent border-0 text-xs cursor-pointer focus:outline-none"
          >
            <option value="">Assign...</option>
            {board?.workspace.members.map((m) => (
              <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
            ))}
          </select>
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value ? value.substring(0, 10) : ''}
            onChange={(e) => handleUpdateField(task.id, column.id, e.target.value || null)}
            disabled={!canEdit}
            className="w-full h-full px-2 bg-transparent border-0 text-xs focus:outline-none"
          />
        );

      case 'MONEY':
      case 'NUMBER':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleUpdateField(task.id, column.id, e.target.value ? parseFloat(e.target.value) : null)}
            disabled={!canEdit}
            placeholder="0"
            className="w-full h-full px-2 bg-transparent border-0 text-xs text-right focus:outline-none"
          />
        );

      case 'CHECKBOX':
        return (
          <div className="flex items-center justify-center h-full">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleUpdateField(task.id, column.id, e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleUpdateField(task.id, column.id, e.target.value)}
            disabled={!canEdit}
            placeholder="..."
            className="w-full h-full px-2 bg-transparent border-0 text-xs focus:outline-none"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[var(--text-secondary)]">Board not found</p>
      </div>
    );
  }

  const filteredGroups = board.groups.map((g) => ({
    ...g,
    tasks: g.tasks.filter((t) =>
      searchQuery === '' || t.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text)]">{board.name}</h1>
              {board.description && (
                <p className="text-xs text-[var(--text-tertiary)]">{board.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 h-8 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredGroups.map((group) => (
          <div key={group.id} className="mb-6">
            {/* Group Header */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => handleToggleCollapse(group)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                {group.collapsed ? (
                  <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
                )}
              </button>

              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color || 'var(--primary)' }}
              />

              {editingGroup?.id === group.id ? (
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  onBlur={() => handleUpdateGroup(group.id, { name: editingGroup.name })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateGroup(group.id, { name: editingGroup.name });
                    if (e.key === 'Escape') setEditingGroup(null);
                  }}
                  autoFocus
                  className="px-2 py-1 text-sm font-medium bg-transparent border border-[var(--primary)] rounded focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => canEdit && setEditingGroup({ id: group.id, name: group.name })}
                  className="text-sm font-medium text-[var(--text)] hover:text-[var(--primary)]"
                >
                  {group.name}
                </button>
              )}

              <span className="text-xs text-[var(--text-muted)]">
                {group.tasks.length} items
              </span>

              {canEdit && (
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-hover)] ml-auto"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Table */}
            {!group.collapsed && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface)]">
                {/* Header Row */}
                <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface-hover)]">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex-1 min-w-[200px] px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
                    Item
                  </div>
                  {board.columns.map((col) => (
                    <div
                      key={col.id}
                      style={{ width: col.width || 150 }}
                      className="flex-shrink-0 px-2 py-2 text-xs font-medium text-[var(--text-tertiary)] border-l border-[var(--border)]"
                    >
                      {col.name}
                    </div>
                  ))}
                  <div className="w-10 flex-shrink-0" />
                </div>

                {/* Task Rows */}
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-hover)] group"
                  >
                    <div className="w-8 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <GripVertical size={14} className="text-[var(--text-muted)]" />
                    </div>

                    {/* Task Name */}
                    <div className="flex-1 min-w-[200px] px-3 py-2">
                      {editingTask?.taskId === task.id ? (
                        <input
                          type="text"
                          value={editingTask.name}
                          onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                          onBlur={() => handleUpdateTask(task.id, { name: editingTask.name })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateTask(task.id, { name: editingTask.name });
                            if (e.key === 'Escape') setEditingTask(null);
                          }}
                          autoFocus
                          className="w-full px-2 py-1 text-sm bg-transparent border border-[var(--primary)] rounded focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => canEdit && setEditingTask({ groupId: group.id, taskId: task.id, name: task.name })}
                          className="text-sm text-[var(--text)] hover:text-[var(--primary)] text-left"
                        >
                          {task.name}
                        </button>
                      )}
                    </div>

                    {/* Field Cells */}
                    {board.columns.map((col) => (
                      <div
                        key={col.id}
                        style={{ width: col.width || 150 }}
                        className="flex-shrink-0 h-9 border-l border-[var(--border)]"
                      >
                        {renderCell(task, col)}
                      </div>
                    ))}

                    {/* Actions */}
                    <div className="w-10 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-hover)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Task Row */}
                {canEdit && (
                  <div className="flex items-center">
                    <div className="w-8 flex-shrink-0" />
                    {addingTask === group.id ? (
                      <div className="flex-1 px-3 py-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          onBlur={() => handleAddTask(group.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTask(group.id);
                            if (e.key === 'Escape') {
                              setNewTaskName('');
                              setAddingTask(null);
                            }
                          }}
                          placeholder="Enter item name..."
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm bg-transparent border border-[var(--primary)] rounded focus:outline-none"
                        />
                        <button
                          onClick={() => { setNewTaskName(''); setAddingTask(null); }}
                          className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingTask(group.id)}
                        className="flex-1 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] text-left flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Add item
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add Group */}
        {canEdit && (
          <button
            onClick={handleAddGroup}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--primary)] hover:bg-[var(--surface)] rounded-lg"
          >
            <Plus size={16} />
            Add new group
          </button>
        )}
      </div>
    </div>
  );
}
