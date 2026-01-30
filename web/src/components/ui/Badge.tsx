'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ text, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
    success: 'bg-[var(--success-bg)] text-[var(--success)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    error: 'bg-[var(--error-bg)] text-[var(--error)]',
    info: 'bg-[var(--info-bg)] text-[var(--info)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size])}>
      {text}
    </span>
  );
}
