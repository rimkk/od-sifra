'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--text)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'w-full h-10 rounded-lg border bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] shadow-sm transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]',
              'hover:border-[var(--text-muted)]',
              error ? 'border-[var(--error)] focus:ring-[var(--error)]/20 focus:border-[var(--error)]' : 'border-[var(--border)]',
              icon && 'pl-10',
              isPassword && 'pr-10',
              props.disabled && 'opacity-50 cursor-not-allowed bg-[var(--surface-hover)]',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-[var(--error)] flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--error)]" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
