'use client';

import Link from 'next/link';

import { cn } from '@/lib/cn';
import { NAV_ITEMS, type NavActive } from '@/lib/nav';

export function WorkflowStepper({
  step
}: {
  step: 'upload' | 'analyze' | 'humanize' | 'export';
}) {
  const steps = [
    { id: 'upload', label: 'Upload', icon: 'upload_file' },
    { id: 'analyze', label: 'Analyze', icon: 'psychology' },
    { id: 'humanize', label: 'Humanize', icon: 'auto_awesome' },
    { id: 'export', label: 'Export', icon: 'download' }
  ] as const;

  const current = steps.findIndex((s) => s.id === step);

  return (
    <nav aria-label="Workflow progress" className="w-full overflow-x-auto">
      <ol className="flex items-center gap-1 sm:gap-2 min-w-max sm:min-w-0">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.id} className="flex items-center gap-1 sm:gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border text-xs sm:text-sm whitespace-nowrap',
                  active && 'bg-primary/15 border-primary/40 text-primary',
                  done && !active && 'bg-surface-container-high border-outline-variant text-on-surface-variant',
                  !active && !done && 'bg-surface-container-low border-outline-variant text-outline'
                )}
              >
                <span
                  className={cn(
                    'material-symbols-outlined text-[16px] sm:text-[18px]',
                    active && 'text-primary'
                  )}
                  style={active && s.id === 'humanize' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {done && !active ? 'check_circle' : s.icon}
                </span>
                <span className="font-label-sm text-label-sm hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <span className="w-3 sm:w-6 h-px bg-outline-variant shrink-0" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function MobileDrawer({
  open,
  active,
  onClose
}: {
  open: boolean;
  active: NavActive;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[min(100vw-3rem,280px)] bg-[#0F172A]/95 backdrop-blur-xl border-r border-slate-800/50 z-50 md:hidden flex flex-col p-4 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <span className="font-h2 text-h2 text-primary">Fahad AI</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg font-label-sm text-label-sm',
                active === item.id
                  ? 'text-indigo-400 bg-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <span
                className="material-symbols-outlined"
                style={item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
