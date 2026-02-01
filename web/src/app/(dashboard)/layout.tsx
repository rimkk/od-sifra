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
  FolderKanban,
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
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
      <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-[var(--border)] bg-[var(--background)]">
        {/* Logo */}
        <div className="flex h-12 items-center gap-2.5 px-4">
          <img src="/logo.png" alt="Od Sifra" className="h-6 w-6 rounded" />
          <span className="text-sm font-semibold text-[var(--text)]">Od Sifra</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-px px-2 mt-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors',
                  isActive
                    ? 'bg-[var(--surface-secondary)] text-[var(--text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]'
                )}
              >
                <item.icon size={16} strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}

          {(isAdmin || isEmployee) && (
            <>
              <div className="my-2 mx-2.5 border-t border-[var(--border)]" />
              <Link
                href="/dashboard/invite"
                className={cn(
                  'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors',
                  pathname === '/dashboard/invite'
                    ? 'bg-[var(--surface-secondary)] text-[var(--text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]'
                )}
              >
                <UserPlus size={16} strokeWidth={1.5} />
                Invite User
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              href="/dashboard/users"
              className={cn(
                'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors',
                pathname === '/dashboard/users'
                  ? 'bg-[var(--surface-secondary)] text-[var(--text)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]'
              )}
            >
              <UserCog size={16} strokeWidth={1.5} />
              Users
            </Link>
          )}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] p-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
            <Avatar name={user?.name || ''} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[var(--text)] truncate">{user?.name}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                }}
                className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-tertiary)] transition-colors"
              >
                {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
