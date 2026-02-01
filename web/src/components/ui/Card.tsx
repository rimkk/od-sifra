'use client';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  hover?: boolean;
}

export function Card({ className, variant = 'default', hover = false, children, ...props }: CardProps) {
  const variants = {
    default: 'bg-[var(--surface)] border border-[var(--border)] shadow-sm',
    outlined: 'bg-[var(--surface)] border border-[var(--border)]',
    elevated: 'bg-[var(--surface)] border border-[var(--border)] shadow-md',
    ghost: 'bg-transparent',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-5',
        variants[variant],
        hover && 'transition-all duration-200 hover:shadow-md hover:border-[var(--text-muted)] cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
