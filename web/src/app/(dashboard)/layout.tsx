'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  UserPlus,
  UserCog,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Avatar, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    ...(isAdmin || isEmployee
      ? [{ name: 'Customers', href: '/dashboard/customers', icon: Users }]
      : [{ name: 'Properties', href: '/dashboard/properties', icon: Building2 }]),
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  ];

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[var(--border)] bg-[var(--surface)]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-[var(--border)] px-4">
          <img src="/logo.png" alt="Od Sifra" className="h-8 w-8 rounded-lg" />
          <span className="text-base font-semibold text-[var(--text)]">Od Sifra</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]'
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}

          {(isAdmin || isEmployee) && (
            <>
              <div className="my-2 border-t border-[var(--border)]" />
              <Link
                href="/dashboard/invite"
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/dashboard/invite'
                    ? 'bg-primary/10 text-primary'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]'
                )}
              >
                <UserPlus size={18} />
                Invite User
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              href="/dashboard/users"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/dashboard/users'
                  ? 'bg-primary/10 text-primary'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]'
              )}
            >
              <UserCog size={18} />
              User Management
            </Link>
          )}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={user?.name || ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">{user?.name}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
            >
              {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
