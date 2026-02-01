'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, LayoutGrid, Loader2, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { boardApi } from '@/lib/api';

interface Board {
  id: string;
  name: string;
  description?: string;
  type: string;
  color?: string;
  isPublic: boolean;
  taskCount: number;
  _count: { groups: number };
  createdAt: string;
}

const BOARD_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  PROPERTY: 'Property',
  PROJECT: 'Project',
  CRM: 'CRM',
};

const BOARD_TYPE_COLORS: Record<string, string> = {
  GENERAL: 'bg-gray-500',
  PROPERTY: 'bg-emerald-500',
  PROJECT: 'bg-blue-500',
  CRM: 'bg-purple-500',
};

export default function BoardsPage() {
  const router = useRouter();
  const { user, currentWorkspace } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const isAdmin = user?.role === 'OWNER_ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canCreate = isAdmin || isEmployee;

  useEffect(() => {
    if (currentWorkspace) {
      fetchBoards();
    }
  }, [currentWorkspace]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await boardApi.getByWorkspace(currentWorkspace!.id);
      setBoards(res.data.boards || []);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this board?')) return;

    try {
      await boardApi.delete(id);
      fetchBoards();
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  const filteredBoards = boards.filter((board) => {
    const matchesSearch = searchQuery === '' || 
      board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      board.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || board.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Boards</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Manage your projects and tasks
          </p>
        </div>
        {canCreate && (
          <Link
            href="/boards/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={16} />
            New Board
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        >
          <option value="all">All Types</option>
          <option value="GENERAL">General</option>
          <option value="PROPERTY">Property</option>
          <option value="PROJECT">Project</option>
          <option value="CRM">CRM</option>
        </select>
      </div>

      {/* Boards Grid */}
      {filteredBoards.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center">
          <LayoutGrid className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
          <h3 className="font-medium text-[var(--text)] mb-1">
            {boards.length === 0 ? 'No boards yet' : 'No matching boards'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {boards.length === 0
              ? 'Create your first board to start managing projects.'
              : 'Try adjusting your search or filters.'}
          </p>
          {canCreate && boards.length === 0 && (
            <Link
              href="/boards/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Plus size={16} />
              Create Board
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBoards.map((board) => (
            <div
              key={board.id}
              className="group bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors relative"
            >
              <Link href={`/boards/${board.id}`} className="block p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${board.color || BOARD_TYPE_COLORS[board.type]} flex items-center justify-center text-white text-lg font-semibold`}>
                    {board.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--text)] truncate group-hover:text-[var(--primary)]">
                      {board.name}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {BOARD_TYPE_LABELS[board.type] || board.type}
                      {board.isPublic && ' • Public'}
                    </p>
                  </div>
                </div>

                {board.description && (
                  <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                    {board.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                  <span>{board.taskCount} items</span>
                  <span>{board._count?.groups || 0} groups</span>
                </div>
              </Link>

              {canCreate && (
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(menuOpen === board.id ? null : board.id);
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {menuOpen === board.id && (
                    <div className="absolute top-full right-0 mt-1 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-10 py-1">
                      <Link
                        href={`/boards/${board.id}/settings`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-hover)]"
                        onClick={() => setMenuOpen(null)}
                      >
                        <Edit2 size={14} />
                        Edit Board
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(null);
                          handleDelete(board.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--surface-hover)]"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
