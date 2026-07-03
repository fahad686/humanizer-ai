'use client';

import { cn } from '@/lib/cn';

export function RingGauge({ score }: { score: number }) {
  const dash = Math.max(0, Math.min(100, score));

  return (
    <div className="glass-panel rounded-xl p-4 sm:p-6 flex items-center justify-between shadow-[0_4px_10px_rgba(0,0,0,0.2)] gap-4">
      <div className="min-w-0">
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
          Human Confidence
        </h3>
        <div className="font-display text-3xl sm:text-display text-primary flex items-baseline gap-1">
          {dash}
          <span className="text-xl sm:text-2xl text-on-surface-variant">%</span>
        </div>
      </div>
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-surface-container-high stroke-current"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
          />
          <path
            className="text-primary stroke-current"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeDasharray={`${dash}, 100`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <span
          className="absolute material-symbols-outlined text-primary text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          colors_spark
        </span>
      </div>
    </div>
  );
}

export function BarCard({
  title,
  value,
  color
}: {
  title: string;
  value: number;
  color: 'error' | 'tertiary';
}) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className="glass-panel rounded-xl p-4 sm:p-6 flex flex-col justify-center shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
      <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{title}</span>
        <span className={cn('font-h2 text-lg sm:text-h2 shrink-0', color === 'error' ? 'text-error' : 'text-tertiary')}>
          {color === 'tertiary' ? `+${safe}%` : `${safe}%`}
        </span>
      </div>
      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
        <div
          className={
            color === 'error'
              ? 'bg-gradient-to-r from-error to-error-container h-full rounded-full'
              : 'bg-gradient-to-r from-tertiary-container to-tertiary h-full rounded-full'
          }
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
