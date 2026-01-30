'use client';

import { useState } from 'react';
import { User, Mail, Phone, Shield, Calendar, Save, Lock } from 'lucide-react';
import { Card, Button, Input, Avatar, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { userApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await userApi.updateProfile({ name, phone });
      setUser(response.data.user);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'EMPLOYEE':
        return 'Employee';
      case 'CUSTOMER':
        return 'Customer';
      default:
        return role;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Profile</h1>

      {/* Profile Overview */}
      <Card variant="elevated">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user?.name || ''} size="xl" />
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">{user?.name}</h2>
            <p className="text-[var(--text-secondary)]">{user?.email}</p>
            <Badge text={roleLabel(user?.role || '')} variant="info" className="mt-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-[var(--text-tertiary)]" />
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Email</p>
              <p className="text-[var(--text)]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-[var(--text-tertiary)]" />
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Role</p>
              <p className="text-[var(--text)]">{roleLabel(user?.role || '')}</p>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-[var(--success-bg)] text-[var(--success)] text-sm">
          {success}
        </div>
      )}

      {/* Update Profile */}
      <Card variant="outlined">
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <User size={20} />
          Update Profile
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User size={18} />}
            required
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone size={18} />}
            placeholder="+385 91 123 4567"
          />
          <Button type="submit" loading={loading}>
            <Save size={18} className="mr-2" />
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Change Password */}
      <Card variant="outlined">
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Lock size={20} />
          Change Password
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={passwordLoading} variant="outline">
            <Lock size={18} className="mr-2" />
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
