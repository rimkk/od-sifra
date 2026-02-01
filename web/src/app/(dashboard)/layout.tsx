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
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/components/providers/ThemeProvider';
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
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: Home },
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[var(--background-alt)] border-r border-[var(--border)]">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[var(--border)]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">OS</span>
          </div>
          <div>
            <h1 className="font-semibold text-[var(--text)]">Od Sifra</h1>
            <p className="text-xs text-[var(--text-tertiary)]">Property Management</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3">
          <p className="px-3 mb-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Menu</p>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                  )}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {(isAdmin || isEmployee) && (
            <>
              <div className="my-4 border-t border-[var(--border)]" />
              <p className="px-3 mb-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Admin</p>
              <nav className="space-y-1">
                <Link
                  href="/dashboard/invite"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    pathname === '/dashboard/invite'
                      ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                  )}
                >
                  <UserPlus size={18} strokeWidth={1.5} />
                  Invite User
                </Link>
                {isAdmin && (
                  <Link
                    href="/dashboard/users"
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      pathname === '/dashboard/users'
                        ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                    )}
                  >
                    <UserCog size={18} strokeWidth={1.5} />
                    User Management
                  </Link>
                )}
              </nav>
            </>
          )}
        </div>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[var(--border)] bg-[var(--background-alt)]">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-hover)]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">{user?.name}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-active)] transition-colors"
                title="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
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
