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
      
      // If user has invitation, they're auto-approved and can go to dashboard
      if (token) {
        router.push('/dashboard');
      } else {
        // Self-registered users need approval
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Success state for self-registered users
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[var(--success)]" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text)] mb-2">Account Created</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Your account is pending approval. You&apos;ll receive a notification once an administrator reviews your request.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Od Sifra" 
              className="w-12 h-12 rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Create an account</h1>
          {invitation ? (
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Invited by {invitation.inviterName} as {invitation.role.toLowerCase()}
            </p>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Sign up to get started
            </p>
          )}
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
              {error}
            </div>
          )}

          {!invitation && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--info-bg)] text-[var(--info)] text-sm">
              Your account will need admin approval before you can sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User size={16} />}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              disabled={!!invitation}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock size={16} />}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              {invitation ? 'Create Account' : 'Request Access'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border)] text-center text-sm">
            <span className="text-[var(--text-secondary)]">Already have an account? </span>
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
