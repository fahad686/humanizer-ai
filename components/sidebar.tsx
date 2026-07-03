'use client';

import { useState } from 'react';
import Link from 'next/link';
import type React from 'react';

import { cn } from '@/lib/cn';
import { NAV_ITEMS, type NavActive } from '@/lib/nav';

import { MobileDrawer } from './mobile-nav';

function NavItem({
  href,
  active,
  icon,
  filled,
  children
}: {
  href: string;
  active?: boolean;
  icon: string;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-label-sm text-label-sm tracking-tight',
        active
          ? 'text-indigo-400 bg-indigo-500/10 border-r-2 border-indigo-500'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      )}
    >
      <span
        className="material-symbols-outlined"
        style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      {children}
    </Link>
  );
}

export function Sidebar({ active }: { active: NavActive }) {
  return (
    <nav className="hidden md:flex bg-[#0F172A]/90 backdrop-blur-lg fixed left-0 top-0 h-full flex-col p-4 z-40 border-r border-slate-800/50 shadow-2xl w-64">
      <div className="flex items-center gap-3 mb-8 px-4">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
        <div>
          <h1 className="font-display text-h2 text-primary tracking-tighter">Fahad AI System</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Digital Alchemy</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            href={item.href}
            active={active === item.id}
            icon={item.icon}
            filled={item.filled}
          >
            {item.label}
          </NavItem>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <button
          type="button"
          className="bg-gradient-to-b from-primary to-inverse-primary text-on-primary font-label-sm text-label-sm py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(73,75,214,0.3)] hover:shadow-[0_0_20px_rgba(73,75,214,0.5)] transition-shadow w-full flex justify-center items-center gap-2 min-h-[44px]"
        >
          <span className="material-symbols-outlined">workspace_premium</span>
          Upgrade to Pro
        </button>
      </div>
    </nav>
  );
}

export function MobileTopbar({ active }: { active: NavActive }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="bg-[#020617]/90 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 w-full z-40 flex justify-between items-center px-4 h-14 md:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link href="/dashboard" className="truncate">
            <span className="text-base font-bold bg-gradient-to-r from-indigo-500 to-violet-400 bg-clip-text text-transparent">
              Fahad AI
            </span>
          </Link>
        </div>
        <Link
          href="/process"
          className={cn(
            'p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center',
            active === 'humanizer' ? 'text-primary bg-primary/10' : 'text-slate-400'
          )}
          aria-label="Humanizer"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </Link>
      </header>
      <MobileDrawer open={open} active={active} onClose={() => setOpen(false)} />
    </>
  );
}
