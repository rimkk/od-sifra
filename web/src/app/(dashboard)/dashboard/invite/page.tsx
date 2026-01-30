'use client';

import { useState, useEffect } from 'react';
import { Mail, UserPlus, Briefcase, User, Check, Copy, Plus, X, Users, Building } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { invitationApi, customerAccountApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

type InviteRole = 'EMPLOYEE' | 'CUSTOMER';
type Tab = 'create-account' | 'invite-existing' | 'invite-employee';

interface CustomerAccount {
  id: string;
  name: string;
  description?: string;
  _count: { users: number; properties: number };
  users: { id: string; email: string; name: string }[];
}

export default function InvitePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('create-account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create Account State
  const [accountName, setAccountName] = useState('');
  const [accountDescription, setAccountDescription] = useState('');
  const [createWithUser, setCreateWithUser] = useState(true);
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPassword, setPrimaryPassword] = useState('');
  const [primaryName, setPrimaryName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  
  // Invite to Existing Account State
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
  const [inviteDirectly, setInviteDirectly] = useState(false);
  const [directUserPassword, setDirectUserPassword] = useState('');
  const [directUserName, setDirectUserName] = useState('');
  
  // Employee Invite State
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeInvitation, setEmployeeInvitation] = useState<{ token: string; links: { web: string } } | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadCustomerAccounts();
    }
  }, [isAdmin]);

  const loadCustomerAccounts = async () => {
    try {
      const response = await customerAccountApi.getAll();
      setCustomerAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Failed to load customer accounts:', err);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!accountName.trim()) {
      setError('Account name is required');
      return;
    }

    if (createWithUser) {
      if (!primaryEmail || !/\S+@\S+\.\S+/.test(primaryEmail)) {
        setError('Please enter a valid email address');
        return;
      }
      if (!primaryPassword || primaryPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (!primaryName.trim()) {
        setError('User name is required');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        accountName: accountName.trim(),
        description: accountDescription.trim() || undefined,
      };

      if (createWithUser) {
        payload.primaryUser = {
          email: primaryEmail.toLowerCase(),
          password: primaryPassword,
          name: primaryName.trim(),
          phone: primaryPhone.trim() || undefined,
        };
      }

      await customerAccountApi.create(payload);
      setSuccess(`Customer account "${accountName}" created successfully!`);
      
      // Reset form
      setAccountName('');
      setAccountDescription('');
      setPrimaryEmail('');
      setPrimaryPassword('');
      setPrimaryName('');
      setPrimaryPhone('');
      
      // Reload accounts
      loadCustomerAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteToAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!selectedAccountId) {
      setError('Please select a customer account');
      return;
    }

    const validEmails = inviteEmails.filter(email => email && /\S+@\S+\.\S+/.test(email));
    if (validEmails.length === 0) {
      setError('Please enter at least one valid email address');
      return;
    }

    setLoading(true);
    try {
      if (inviteDirectly && validEmails.length === 1) {
        // Create user directly
        if (!directUserPassword || directUserPassword.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!directUserName.trim()) {
          setError('User name is required');
          setLoading(false);
          return;
        }

        await customerAccountApi.addUser(selectedAccountId, {
          email: validEmails[0].toLowerCase(),
          password: directUserPassword,
          name: directUserName.trim(),
        });
        setSuccess(`User added to account successfully!`);
      } else {
        // Send invitations
        const result = await customerAccountApi.inviteUsers(selectedAccountId, validEmails);
        const successCount = result.data.invitations.filter((i: any) => !i.error).length;
        const failCount = result.data.invitations.filter((i: any) => i.error).length;
        
        if (successCount > 0 && failCount === 0) {
          setSuccess(`${successCount} invitation(s) sent successfully!`);
        } else if (successCount > 0) {
          setSuccess(`${successCount} invitation(s) sent. ${failCount} failed.`);
        } else {
          setError('All invitations failed. Check if emails are already registered.');
        }
      }

      // Reset form
      setInviteEmails(['']);
      setDirectUserPassword('');
      setDirectUserName('');
      setInviteDirectly(false);
      loadCustomerAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to invite users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!employeeEmail || !/\S+@\S+\.\S+/.test(employeeEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await invitationApi.create({ email: employeeEmail, role: 'EMPLOYEE' });
      setEmployeeInvitation({
        token: response.data.invitation.token,
        links: response.data.links,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeEmailField = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...inviteEmails];
    updated[index] = value;
    setInviteEmails(updated);
  };

  const handleCopy = async () => {
    if (employeeInvitation) {
      await navigator.clipboard.writeText(employeeInvitation.links.web);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetEmployeeInvite = () => {
    setEmployeeEmail('');
    setEmployeeInvitation(null);
  };

  // Success for employee invitation
  if (employeeInvitation) {
    return (
      <div className="max-w-lg mx-auto">
        <Card variant="elevated" className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-4">
            <Check className="text-[var(--success)]" size={32} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Invitation Sent!</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            An invitation has been created for {employeeEmail}
          </p>

          <div className="bg-[var(--surface-secondary)] rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Invitation Link</p>
            <p className="text-sm text-[var(--text)] font-mono break-all">{employeeInvitation.links.web}</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button className="flex-1" onClick={resetEmployeeInvite}>
              <UserPlus size={18} className="mr-2" />
              Invite Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Manage Users</h1>
      <p className="text-[var(--text-secondary)] mb-6">Create accounts or invite users to Od Sifra</p>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-2 mb-6 border-b border-[var(--border)] pb-4">
          <button
            onClick={() => setActiveTab('create-account')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'create-account'
                ? 'bg-secondary text-primary'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
            )}
          >
            <Building size={18} />
            Create Account
          </button>
          <button
            onClick={() => setActiveTab('invite-existing')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'invite-existing'
                ? 'bg-secondary text-primary'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
            )}
          >
            <Users size={18} />
            Add to Account
          </button>
          <button
            onClick={() => setActiveTab('invite-employee')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'invite-employee'
                ? 'bg-secondary text-primary'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
            )}
          >
            <Briefcase size={18} />
            Invite Employee
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--success-bg)] text-[var(--success)] text-sm">
          {success}
        </div>
      )}

      {/* Create Account Tab */}
      {activeTab === 'create-account' && (
        <Card variant="outlined">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Building size={20} />
            Create Customer Account
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Create a new customer account. You can optionally add the first user now or invite them later.
          </p>

          <form onSubmit={handleCreateAccount} className="space-y-6">
            <Input
              label="Account Name"
              placeholder="e.g., Smith Family, ABC Corp"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              icon={<Building size={18} />}
              required
            />

            <Input
              label="Description (optional)"
              placeholder="Brief description of the account"
              value={accountDescription}
              onChange={(e) => setAccountDescription(e.target.value)}
            />

            <div className="border-t border-[var(--border)] pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createWithUser}
                  onChange={(e) => setCreateWithUser(e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--border)] text-secondary focus:ring-secondary"
                />
                <span className="text-sm font-medium text-[var(--text)]">
                  Create first user now (set login credentials)
                </span>
              </label>
            </div>

            {createWithUser && (
              <div className="space-y-4 pl-4 border-l-2 border-secondary/30">
                <Input
                  label="Email"
                  type="email"
                  placeholder="user@example.com"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  icon={<Mail size={18} />}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={primaryPassword}
                  onChange={(e) => setPrimaryPassword(e.target.value)}
                  required
                />
                <Input
                  label="Full Name"
                  placeholder="John Smith"
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  icon={<User size={18} />}
                  required
                />
                <Input
                  label="Phone (optional)"
                  placeholder="+385 91 123 4567"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              <Plus size={18} className="mr-2" />
              Create Account
            </Button>
          </form>
        </Card>
      )}

      {/* Invite to Existing Account Tab */}
      {activeTab === 'invite-existing' && (
        <Card variant="outlined">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Users size={20} />
            Add Users to Account
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Add users to an existing customer account. Great for couples or families sharing the same properties.
          </p>

          <form onSubmit={handleInviteToAccount} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Select Customer Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              >
                <option value="">Choose an account...</option>
                {customerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account._count.users} user{account._count.users !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>

            {selectedAccountId && (
              <>
                <div className="bg-[var(--surface-secondary)] rounded-lg p-4">
                  <p className="text-sm text-[var(--text-secondary)] mb-2">Current users in this account:</p>
                  {customerAccounts.find(a => a.id === selectedAccountId)?.users.map(u => (
                    <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 mr-2 mb-1 text-xs bg-[var(--surface)] rounded">
                      {u.name} ({u.email})
                    </span>
                  ))}
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={inviteDirectly}
                      onChange={(e) => setInviteDirectly(e.target.checked)}
                      className="w-5 h-5 rounded border-[var(--border)] text-secondary focus:ring-secondary"
                    />
                    <span className="text-sm font-medium text-[var(--text)]">
                      Create user directly (set password now instead of sending invite)
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    Email Address{!inviteDirectly && 'es'}
                  </label>
                  {inviteEmails.map((email, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        icon={<Mail size={18} />}
                        className="flex-1"
                      />
                      {!inviteDirectly && inviteEmails.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeEmailField(index)}
                          className="px-3"
                        >
                          <X size={18} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!inviteDirectly && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addEmailField}
                      className="mt-2"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Another Email
                    </Button>
                  )}
                </div>

                {inviteDirectly && (
                  <div className="space-y-4 pl-4 border-l-2 border-secondary/30">
                    <Input
                      label="Full Name"
                      placeholder="John Smith"
                      value={directUserName}
                      onChange={(e) => setDirectUserName(e.target.value)}
                      icon={<User size={18} />}
                      required
                    />
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={directUserPassword}
                      onChange={(e) => setDirectUserPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="w-full" loading={loading} disabled={!selectedAccountId}>
              <UserPlus size={18} className="mr-2" />
              {inviteDirectly ? 'Add User' : 'Send Invitation(s)'}
            </Button>
          </form>
        </Card>
      )}

      {/* Invite Employee Tab */}
      {activeTab === 'invite-employee' && (
        <Card variant="outlined">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Briefcase size={20} />
            Invite Employee
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Send an invitation link to add a new employee to the system.
          </p>

          <form onSubmit={handleInviteEmployee} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="employee@example.com"
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              icon={<Mail size={18} />}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              <UserPlus size={18} className="mr-2" />
              Send Invitation
            </Button>
          </form>
        </Card>
      )}

      {/* For non-admin (employees), show simple customer invite */}
      {!isAdmin && (
        <Card variant="outlined">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Invite Customer</h3>
          <form onSubmit={handleInviteToAccount} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Select Customer Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              >
                <option value="">Choose an account...</option>
                {customerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="customer@example.com"
              value={inviteEmails[0] || ''}
              onChange={(e) => setInviteEmails([e.target.value])}
              icon={<Mail size={18} />}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              <UserPlus size={18} className="mr-2" />
              Send Invitation
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
