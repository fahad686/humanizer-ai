'use client';

import type React from 'react';

import { cn } from '@/lib/cn';

import { MobileTopbar, Sidebar } from './sidebar';

export function AppShell({
  active,
  children,
  className
}: {
  active: 'dashboard' | 'humanizer' | 'history' | 'settings';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-h-screen flex bg-background text-on-background overflow-x-hidden', className)}>
      <Sidebar active={active} />
      <div className="flex-1 flex flex-col md:ml-64 w-full min-h-screen min-w-0">
        <MobileTopbar active={active} />
        {children}
      </div>
    </div>
  );
}
