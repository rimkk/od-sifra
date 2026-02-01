'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-6">
          <img 
            src="/logo.png" 
            alt="Od Sifra" 
            className="w-10 h-10 mx-auto mb-4 rounded-lg"
          />
          <h1 className="text-lg font-medium text-[var(--text)]">Sign in to Od Sifra</h1>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-[var(--border)] p-4">
          {error && (
            <div className="mb-3 p-2.5 rounded-md bg-[var(--error-bg)] text-[var(--error)] text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[var(--text-secondary)] hover:text-[var(--text)]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
