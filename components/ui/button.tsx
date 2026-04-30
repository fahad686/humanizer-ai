'use client';

import type React from 'react';

import { cn } from '@/lib/cn';

export function Button({
  className,
  variant = 'solid',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-label-sm text-label-sm transition-all active:scale-[0.99]',
        size === 'sm' ? 'px-3 py-2' : 'px-4 py-2',
        variant === 'solid' &&
          'bg-gradient-to-b from-primary-container to-inverse-primary text-on-primary-container hover:shadow-[0_0_15px_rgba(128,131,255,0.4)]',
        variant === 'outline' &&
          'border border-outline-variant text-on-surface hover:bg-surface-container',
        variant === 'ghost' &&
          'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant',
        className
      )}
      {...props}
    />
  );
}
