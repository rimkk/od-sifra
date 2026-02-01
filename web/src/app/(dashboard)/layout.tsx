'use client';

import { useEffect, useState, useRef } from 'react';
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
  ChevronDown,
  Search,
  Eye,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/components/providers/ThemeProvider';
import { customerAccountApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CustomerAccount {
  id: string;
  name: string;
  email?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  
  // Customer selector state
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch customers for admin/employee
  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') {
      customerAccountApi.getAll()
        .then((res) => setCustomers(res.data.accounts || []))
        .catch(() => {});
    }
  }, [user?.role]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { name: 'Properties', href: '/dashboard/properties', icon: Building2 },
    ...(isAdmin || isEmployee
      ? [{ name: 'Customers', href: '/dashboard/customers', icon: Users }]
      : []),
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
        <div className="h-14 flex items-center gap-3 px-4 border-b border-[var(--border)]">
          <img src="/logo.png" alt="Od Sifra" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="font-semibold text-[var(--text)] text-sm">Od Sifra</h1>
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
              
              {/* Customer Quick Access */}
              <div className="relative mb-4" ref={dropdownRef}>
                <p className="px-3 mb-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">View As Customer</p>
                <button
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-secondary)] hover:border-[var(--text-muted)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Eye size={14} />
                    <span>Select customer...</span>
                  </span>
                  <ChevronDown size={14} className={cn('transition-transform', showCustomerDropdown && 'rotate-180')} />
                </button>
                
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-[var(--border)]">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search customers..."
                          className="w-full h-8 pl-8 pr-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Customer List */}
                    <div className="overflow-y-auto max-h-48">
                      {customers
                        .filter((c) => 
                          customerSearch === '' || 
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                        )
                        .map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              router.push(`/dashboard/customers/${customer.id}`);
                              setShowCustomerDropdown(false);
                              setCustomerSearch('');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <div className="w-6 h-6 rounded-md bg-[var(--primary)] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {customer.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-[var(--text)] truncate">{customer.name}</p>
                              {customer.email && (
                                <p className="text-[10px] text-[var(--text-tertiary)] truncate">{customer.email}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      {customers.length === 0 && (
                        <p className="px-3 py-4 text-xs text-[var(--text-tertiary)] text-center">No customers yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="px-3 mb-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Admin</p>
              <nav className="space-y-1">
                {isAdmin && (
                  <Link
                    href="/dashboard/employees"
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      pathname === '/dashboard/employees'
                        ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                    )}
                  >
                    <Briefcase size={18} strokeWidth={1.5} />
                    Employees
                  </Link>
                )}
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
