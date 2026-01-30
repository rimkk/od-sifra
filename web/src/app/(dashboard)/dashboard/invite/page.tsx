'use client';

import { useState } from 'react';
import { Mail, UserPlus, Briefcase, User, Check, Copy, Share2 } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { invitationApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

type InviteRole = 'EMPLOYEE' | 'CUSTOMER';

export default function InvitePage() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<{
    token: string;
    links: { app: string; web: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await invitationApi.create({ email, role });
      setInvitation({
        token: response.data.invitation.token,
        links: response.data.links,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (invitation) {
      await navigator.clipboard.writeText(invitation.links.web);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setEmail('');
    setInvitation(null);
    setError('');
  };

  if (invitation) {
    return (
      <div className="max-w-lg mx-auto">
        <Card variant="elevated" className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-4">
            <Check className="text-[var(--success)]" size={32} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Invitation Sent!</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            An invitation has been created for {email}
          </p>

          <div className="bg-[var(--surface-secondary)] rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Invitation Link</p>
            <p className="text-sm text-[var(--text)] font-mono break-all">{invitation.links.web}</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button className="flex-1" onClick={handleReset}>
              <UserPlus size={18} className="mr-2" />
              Invite Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Send Invitation</h1>
      <p className="text-[var(--text-secondary)] mb-6">Invite someone to join Od Sifra</p>

      <Card variant="outlined">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            required
          />

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-3">
                Select Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-center transition-colors',
                    role === 'CUSTOMER'
                      ? 'border-secondary bg-secondary/5'
                      : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  <User
                    size={24}
                    className={cn(
                      'mx-auto mb-2',
                      role === 'CUSTOMER' ? 'text-secondary' : 'text-[var(--text-secondary)]'
                    )}
                  />
                  <p
                    className={cn(
                      'font-medium',
                      role === 'CUSTOMER' ? 'text-secondary' : 'text-[var(--text)]'
                    )}
                  >
                    Customer
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Can view properties and communicate
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('EMPLOYEE')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-center transition-colors',
                    role === 'EMPLOYEE'
                      ? 'border-secondary bg-secondary/5'
                      : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  <Briefcase
                    size={24}
                    className={cn(
                      'mx-auto mb-2',
                      role === 'EMPLOYEE' ? 'text-secondary' : 'text-[var(--text-secondary)]'
                    )}
                  />
                  <p
                    className={cn(
                      'font-medium',
                      role === 'EMPLOYEE' ? 'text-secondary' : 'text-[var(--text)]'
                    )}
                  >
                    Employee
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Can manage customers and properties
                  </p>
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            <UserPlus size={18} className="mr-2" />
            Send Invitation
          </Button>
        </form>
      </Card>
    </div>
  );
}
