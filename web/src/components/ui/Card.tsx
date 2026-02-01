'use client';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-[var(--surface-secondary)]',
    outlined: 'bg-[var(--surface)] border border-[var(--border)]',
    elevated: 'bg-[var(--surface-secondary)]',
    ghost: 'bg-transparent',
  };

  return (
    <div
      className={cn(
        'rounded-lg p-4',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
