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
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary mb-4">
            <span className="text-3xl font-bold text-primary">OS</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Od Sifra</h1>
          <p className="text-[var(--text-secondary)] mt-1">Property Management</p>
        </div>

        {/* Form */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
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

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[var(--text-secondary)]">Have an invitation? </span>
            <Link href="/register" className="text-secondary font-medium hover:underline">
              Create Account
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
          <p className="text-sm font-medium text-[var(--text)] mb-2">Demo Credentials</p>
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p>Admin: admin@odsifra.com / admin123</p>
            <p>Employee: employee@odsifra.com / employee123</p>
            <p>Customer: customer@odsifra.com / customer123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
