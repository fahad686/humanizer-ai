'use client';

import Link from 'next/link';
import type React from 'react';

import { cn } from '@/lib/cn';

function NavItem({
  href,
  active,
  icon,
  children
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
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
      {icon}
      {children}
    </Link>
  );
}

export function Sidebar({
  active
}: {
  active: 'dashboard' | 'humanizer' | 'history' | 'settings';
}) {
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
        <NavItem
          href="/dashboard"
          active={active === 'dashboard'}
          icon={<span className="material-symbols-outlined">dashboard</span>}
        >
          Dashboard
        </NavItem>
        <NavItem
          href="/process"
          active={active === 'humanizer'}
          icon={
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          }
        >
          Humanizer
        </NavItem>
        <NavItem
          href="/dashboard#history"
          active={active === 'history'}
          icon={<span className="material-symbols-outlined">history</span>}
        >
          History
        </NavItem>
        <NavItem
          href="/dashboard#settings"
          active={active === 'settings'}
          icon={<span className="material-symbols-outlined">tune</span>}
        >
          Settings
        </NavItem>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <button className="bg-gradient-to-b from-primary to-inverse-primary text-on-primary font-label-sm text-label-sm py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(73,75,214,0.3)] hover:shadow-[0_0_20px_rgba(73,75,214,0.5)] transition-shadow w-full flex justify-center items-center gap-2">
          <span className="material-symbols-outlined">workspace_premium</span>
          Upgrade to Pro
        </button>

        <div className="flex flex-col gap-1 border-t border-slate-800/50 pt-4">
          <a
            className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors font-label-sm text-label-sm tracking-tight"
            href="#"
          >
            <span className="material-symbols-outlined">help</span>
            Help Center
          </a>
          <a
            className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors font-label-sm text-label-sm tracking-tight"
            href="#"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </a>
        </div>
      </div>
    </nav>
  );
}
