'use client';

import type React from 'react';

import { cn } from '@/lib/cn';

import { MobileTopbar } from './mobile-topbar';
import { Sidebar } from './sidebar';

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
    <div className={cn('min-h-screen flex bg-background text-on-background', className)}>
      <Sidebar active={active} />
      <div className="flex-1 flex flex-col md:ml-64 w-full min-h-screen">
        <MobileTopbar />
        {children}
      </div>
    </div>
  );
}
