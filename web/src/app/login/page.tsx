'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, user, isInitialized, fetchUser } = useAuthStore();
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    checkSetupAndAuth();
  }, []);

  const checkSetupAndAuth = async () => {
    try {
      // Check if setup is required
      const setupRes = await authApi.getSetupStatus();
      if (setupRes.data.setupRequired) {
        router.replace('/setup');
        return;
      }

      // Check if already logged in
      await fetchUser();
    } catch (error) {
      console.error('Init error:', error);
    } finally {
      setCheckingSetup(false);
    }
  };

  useEffect(() => {
    if (isInitialized && user && !checkingSetup) {
      router.replace(redirectTo);
    }
  }, [isInitialized, user, checkingSetup, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(form.email, form.password);
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  if (checkingSetup || (isInitialized && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Od Sifra" className="w-12 h-12 mx-auto mb-4 rounded-xl" />
          <h1 className="text-xl font-semibold text-[var(--text)]">Sign in to Od Sifra</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Project management made simple</p>
        </div>

        {/* Form */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-light)] text-sm text-[var(--error)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--text-tertiary)] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[var(--primary)] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
