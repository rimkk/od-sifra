'use client';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-[var(--surface)]',
    outlined: 'bg-[var(--surface)] border border-[var(--border)]',
    elevated: 'bg-[var(--surface)] shadow-lg dark:shadow-none dark:border dark:border-[var(--border)]',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-4',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
