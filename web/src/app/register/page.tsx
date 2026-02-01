'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, CheckCircle, ArrowRight, Info } from 'lucide-react';
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
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[var(--success)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Account Created!</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Your account is pending approval. You&apos;ll receive an email once an administrator reviews your request.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full max-w-xs mx-auto">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--accent)] via-[#7C3AED] to-[var(--primary)] p-12 flex-col justify-between">
        <div>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-white font-bold text-xl">OS</span>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Join Our<br />Community
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Get started with the most powerful property management platform. Track investments and grow your portfolio.
          </p>
        </div>
        <div className="space-y-4">
          {['Real-time project tracking', 'Financial analytics', 'Team collaboration'].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 text-white/90">
              <CheckCircle size={20} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg mb-4">
              <span className="text-white font-bold text-xl">OS</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text)]">
              {invitation ? 'Complete your registration' : 'Create an account'}
            </h2>
            <p className="text-[var(--text-secondary)] mt-2">
              {invitation 
                ? `You've been invited by ${invitation.inviterName}` 
                : 'Sign up to get started with Od Sifra'}
            </p>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-xl p-8">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-[var(--error-light)] border border-[var(--error)]/20 text-[var(--error)] text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                {error}
              </div>
            )}

            {!invitation && (
              <div className="mb-6 p-4 rounded-lg bg-[var(--info-light)] border border-[var(--info)]/20 text-[var(--info)] text-sm flex items-start gap-3">
                <Info size={18} className="flex-shrink-0 mt-0.5" />
                <span>Your account will require admin approval before you can sign in.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User size={18} />}
                required
              />

              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                disabled={!!invitation}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                hint="Must be at least 8 characters"
                required
              />

              <Input
                label="Confirm password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
              />

              <Button type="submit" className="w-full h-11" loading={loading}>
                {invitation ? 'Create Account' : 'Request Access'}
                <ArrowRight size={18} />
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-[var(--text-tertiary)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
      </div>
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
