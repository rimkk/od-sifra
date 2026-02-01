'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Info, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { inviteApi } from '@/lib/api';

interface Invite {
  id: string;
  email: string;
  role: string;
  workspace: { id: string; name: string; logoUrl?: string };
  invitedBy: { name: string };
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isLoading, user, isInitialized, fetchUser } = useAuthStore();
  
  const inviteToken = searchParams.get('invite');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(!!inviteToken);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (inviteToken) {
      loadInvite();
    }
    fetchUser();
  }, [inviteToken]);

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/dashboard');
    }
  }, [isInitialized, user, router]);

  const loadInvite = async () => {
    try {
      const res = await inviteApi.getByToken(inviteToken!);
      setInvite(res.data.invite);
      setForm((f) => ({ ...f, email: res.data.invite.email }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired invite');
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        inviteToken: inviteToken || undefined,
      });

      if (invite) {
        router.push('/dashboard');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Account Created</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Your account is pending approval. You&apos;ll be notified once an admin approves your access.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--surface-hover)] transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {invite?.workspace?.logoUrl ? (
            <img src={invite.workspace.logoUrl} alt={invite.workspace.name} className="w-12 h-12 mx-auto mb-4 rounded-xl" />
          ) : (
            <img src="/logo.png" alt="Od Sifra" className="w-12 h-12 mx-auto mb-4 rounded-xl" />
          )}
          <h1 className="text-xl font-semibold text-[var(--text)]">
            {invite ? 'Complete Registration' : 'Create an account'}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {invite ? `Join ${invite.workspace.name}` : 'Sign up to get started'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-light)] text-sm text-[var(--error)]">
              {error}
            </div>
          )}

          {invite && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--primary)]/10 text-sm text-[var(--primary)]">
              Invited by {invite.invitedBy.name} as {invite.role.toLowerCase().replace('_', ' ')}
            </div>
          )}

          {!invite && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>Self-registration requires admin approval before you can access the workspace.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="you@example.com"
                  disabled={!!invite}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] disabled:opacity-50"
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
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : (invite ? 'Create Account' : 'Request Access')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--text-tertiary)] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
