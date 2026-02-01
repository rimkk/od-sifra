'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';

export default function SetupPage() {
  const router = useRouter();
  const { setup, isLoading } = useAuthStore();
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    workspaceName: '',
    workspaceSlug: '',
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const res = await authApi.getSetupStatus();
      if (!res.data.setupRequired) {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Failed to check setup status');
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!form.name || !form.email || !form.password) {
        setError('Please fill in all fields');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.workspaceName || !form.workspaceSlug) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await setup({
        email: form.email,
        password: form.password,
        name: form.name,
        workspaceName: form.workspaceName,
        workspaceSlug: form.workspaceSlug,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--primary)] flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Welcome to Od Sifra</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-2">
            {step === 1 ? 'Create your admin account' : 'Set up your workspace'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
        </div>

        {/* Form */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-light)] text-sm text-[var(--error)]">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@company.com"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Workspace Name</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={form.workspaceName}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        workspaceName: e.target.value,
                        workspaceSlug: generateSlug(e.target.value),
                      });
                    }}
                    placeholder="My Company"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Workspace URL</label>
                <div className="flex items-center">
                  <span className="h-10 px-3 flex items-center text-sm text-[var(--text-tertiary)] bg-[var(--surface-hover)] border border-r-0 border-[var(--border)] rounded-l-lg">
                    odsifra.com/
                  </span>
                  <input
                    type="text"
                    value={form.workspaceSlug}
                    onChange={(e) => setForm({ ...form, workspaceSlug: generateSlug(e.target.value) })}
                    placeholder="my-company"
                    className="flex-1 h-10 px-3 rounded-r-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[var(--text-tertiary)] mt-6">
          Step {step} of 2
        </p>
      </div>
    </div>
  );
}
