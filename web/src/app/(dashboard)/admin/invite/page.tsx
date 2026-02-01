'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Shield, User, CheckCircle, Loader2, Copy, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { inviteApi } from '@/lib/api';

const ROLES = [
  {
    id: 'EMPLOYEE',
    name: 'Employee',
    description: 'Can manage boards, tasks, and invite customers',
    icon: Shield,
    color: 'bg-blue-500',
  },
  {
    id: 'CUSTOMER',
    name: 'Customer',
    description: 'Can view assigned boards and tasks only',
    icon: User,
    color: 'bg-gray-500',
  },
];

export default function InvitePage() {
  const router = useRouter();
  const { user, currentWorkspace } = useAuthStore();

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ email: string; token: string } | null>(null);

  const isAdmin = user?.role === 'OWNER_ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace) return;

    setError('');
    setLoading(true);

    try {
      const res = await inviteApi.create({
        workspaceId: currentWorkspace.id,
        email: email.trim().toLowerCase(),
        role: selectedRole,
      });

      setSuccess({ email: email.trim(), token: res.data.invite.token });
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = success ? `${window.location.origin}/register?invite=${success.token}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
  };

  if (success) {
    return (
      <div className="p-6 lg:p-8 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-[var(--success)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Invitation Sent!</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            An invite has been created for {success.email}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">Share this invite link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="h-10 px-3 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-hover)] text-xs text-[var(--text-tertiary)]">
            The invite will expire in 7 days. You can resend or cancel it from the Team page.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSuccess(null)}
              className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--surface-hover)] transition-colors"
            >
              Invite Another
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors"
            >
              View Team
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Invite Team Member</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Add employees or customers to {currentWorkspace?.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--error-light)] text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Role
            </label>
            <div className="space-y-2">
              {ROLES.map((role) => {
                // Only admins can invite employees
                if (role.id === 'EMPLOYEE' && !isAdmin) return null;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      selectedRole === role.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center mt-0.5`}>
                        <role.icon size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text)]">{role.name}</p>
                        <p className="text-sm text-[var(--text-tertiary)]">{role.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === role.id
                          ? 'border-[var(--primary)] bg-[var(--primary)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {selectedRole === role.id && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Mail size={16} />
                Send Invitation
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
