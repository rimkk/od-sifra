'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--primary)] via-[#7C3AED] to-[var(--accent)] p-12 flex-col justify-between">
        <div>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-white font-bold text-xl">OS</span>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Property Management<br />Made Simple
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Track property acquisitions, manage investments, and keep your clients updated in real-time.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'].map((color, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-white/30" style={{ backgroundColor: color }} />
            ))}
          </div>
          <p className="text-white/70 text-sm">Join 500+ property managers</p>
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
            <h2 className="text-2xl font-bold text-[var(--text)]">Welcome back</h2>
            <p className="text-[var(--text-secondary)] mt-2">Sign in to your account to continue</p>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-xl p-8">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-[var(--error-light)] border border-[var(--error)]/20 text-[var(--error)] text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
              />

              <Button type="submit" className="w-full h-11" loading={loading}>
                Sign in
                <ArrowRight size={18} />
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-[var(--text-tertiary)]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--primary)] font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
