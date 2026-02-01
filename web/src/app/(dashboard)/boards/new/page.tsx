'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Building2, FolderKanban, Users, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { boardApi } from '@/lib/api';

const BOARD_TYPES = [
  {
    id: 'GENERAL',
    name: 'General Board',
    description: 'A flexible board for any type of project',
    icon: LayoutGrid,
    color: 'bg-gray-500',
  },
  {
    id: 'PROPERTY',
    name: 'Property Board',
    description: 'Track properties, rent, tenants, and income',
    icon: Building2,
    color: 'bg-emerald-500',
  },
  {
    id: 'PROJECT',
    name: 'Project Board',
    description: 'Manage tasks, deadlines, and team assignments',
    icon: FolderKanban,
    color: 'bg-blue-500',
  },
  {
    id: 'CRM',
    name: 'CRM Board',
    description: 'Track leads, customers, and deals',
    icon: Users,
    color: 'bg-purple-500',
  },
];

export default function NewBoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useAuthStore();

  const preselectedType = searchParams.get('type');

  const [step, setStep] = useState(preselectedType ? 2 : 1);
  const [selectedType, setSelectedType] = useState(preselectedType || 'GENERAL');
  const [form, setForm] = useState({
    name: '',
    description: '',
    isPublic: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setStep(2);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !currentWorkspace) return;

    setError('');
    setLoading(true);

    try {
      const res = await boardApi.create({
        workspaceId: currentWorkspace.id,
        name: form.name.trim(),
        type: selectedType,
        description: form.description || undefined,
        isPublic: form.isPublic,
      });

      router.push(`/boards/${res.data.board.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create board');
      setLoading(false);
    }
  };

  const selectedTypeData = BOARD_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => (step === 2 && !preselectedType ? setStep(1) : router.back())}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              {step === 1 ? 'Choose Board Type' : 'Create Board'}
            </h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
              {step === 1
                ? 'Select a template that fits your needs'
                : `Creating a ${selectedTypeData?.name.toLowerCase()}`}
            </p>
          </div>
        </div>

        {step === 1 ? (
          /* Type Selection */
          <div className="grid gap-4 md:grid-cols-2">
            {BOARD_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 text-left hover:border-[var(--primary)] transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl ${type.color} flex items-center justify-center mb-4`}>
                  <type.icon size={24} className="text-white" />
                </div>
                <h3 className="font-medium text-[var(--text)] mb-1 group-hover:text-[var(--primary)]">
                  {type.name}
                </h3>
                <p className="text-sm text-[var(--text-tertiary)]">{type.description}</p>
              </button>
            ))}
          </div>
        ) : (
          /* Board Details Form */
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--error-light)] text-sm text-[var(--error)]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Selected Type Preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)]">
                {selectedTypeData && (
                  <>
                    <div className={`w-10 h-10 rounded-lg ${selectedTypeData.color} flex items-center justify-center`}>
                      <selectedTypeData.icon size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{selectedTypeData.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{selectedTypeData.description}</p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Q1 Properties, Marketing Campaign"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this board for?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label htmlFor="isPublic" className="text-sm text-[var(--text)]">
                  Make this board visible to all workspace members
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => (preselectedType ? router.back() : setStep(1))}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.name.trim()}
                  className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
