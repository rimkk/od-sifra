'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ text, variant = 'default', size = 'sm', dot = false }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]',
    success: 'bg-[var(--success-bg)] text-[var(--success)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    error: 'bg-[var(--error-bg)] text-[var(--error)]',
    info: 'bg-[var(--info-bg)] text-[var(--info)]',
  };

  const dotColors = {
    default: 'bg-[var(--text-tertiary)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    error: 'bg-[var(--error)]',
    info: 'bg-[var(--info)]',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md font-medium', variants[variant], sizes[size])}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {text}
    </span>
  );
}
