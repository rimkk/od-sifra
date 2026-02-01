'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LayoutGrid,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Users,
  UserPlus,
  ChevronDown,
  Building2,
  Check,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, currentWorkspace, isInitialized, fetchUser, logout, setCurrentWorkspace } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login?redirect=' + encodeURIComponent(pathname));
    }
  }, [isInitialized, user, pathname, router]);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const isAdmin = user.role === 'OWNER_ADMIN';
  const isEmployee = user.role === 'EMPLOYEE';
  const isCustomer = user.role === 'CUSTOMER';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Boards', href: '/boards', icon: LayoutGrid },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Notifications', href: '/notifications', icon: Bell },
  ];

  const adminNav = [
    { name: 'Team', href: '/admin/users', icon: Users },
    { name: 'Invite', href: '/admin/invite', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col fixed h-screen">
        {/* Workspace Selector */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-sm font-semibold">
                {currentWorkspace?.name.charAt(0) || 'W'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {currentWorkspace?.name || 'Select Workspace'}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] capitalize">
                  {currentWorkspace?.role?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
              <ChevronDown size={16} className="text-[var(--text-muted)]" />
            </button>

            {showWorkspaceMenu && user.workspaces.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1">
                {user.workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-hover)] text-left"
                  >
                    <div className="w-6 h-6 rounded bg-[var(--primary)] flex items-center justify-center text-white text-xs font-medium">
                      {ws.name.charAt(0)}
                    </div>
                    <span className="text-sm text-[var(--text)] flex-1 truncate">{ws.name}</span>
                    {ws.id === currentWorkspace?.id && (
                      <Check size={14} className="text-[var(--primary)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                )}
              >
                <item.icon size={18} strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}

          {(isAdmin || isEmployee) && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Admin</p>
              </div>
              {adminNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                    )}
                  >
                    <item.icon size={18} strokeWidth={1.5} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User & Settings */}
        <div className="p-3 border-t border-[var(--border)] space-y-1">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors"
          >
            {darkMode ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors"
          >
            <Settings size={18} strokeWidth={1.5} />
            Settings
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--error)] transition-colors"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-60">{children}</main>
    </div>
  );
}
