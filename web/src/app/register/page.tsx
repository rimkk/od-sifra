'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { invitationApi } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { register } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!token);
  const [invitation, setInvitation] = useState<{ email: string; role: string; inviterName: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await invitationApi.validate(token!);
      setInvitation(response.data.invitation);
      setEmail(response.data.invitation.email);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired invitation');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await register({ email, password, name, invitationToken: token || undefined });
      
      if (token) {
        router.push('/dashboard');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
        <div className="w-full max-w-xs text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[var(--success)]" />
          </div>
          <h1 className="text-lg font-medium text-[var(--text)] mb-2">Account Created</h1>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            Your account is pending approval. You&apos;ll be notified once approved.
          </p>
          <Link href="/login">
            <Button variant="outline" size="sm" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <img 
            src="/logo.png" 
            alt="Od Sifra" 
            className="w-10 h-10 mx-auto mb-4 rounded-lg"
          />
          <h1 className="text-lg font-medium text-[var(--text)]">
            {invitation ? 'Complete Registration' : 'Create an account'}
          </h1>
          {invitation && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Invited as {invitation.role.toLowerCase()}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          {error && (
            <div className="mb-3 p-2.5 rounded-md bg-[var(--error-bg)] text-[var(--error)] text-xs">
              {error}
            </div>
          )}

          {!invitation && (
            <div className="mb-3 p-2.5 rounded-md bg-[var(--surface-secondary)] text-xs text-[var(--text-tertiary)]">
              Account requires admin approval
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitation}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              {invitation ? 'Create Account' : 'Request Access'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--text-secondary)] hover:text-[var(--text)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
