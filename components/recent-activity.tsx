'use client';

import { useMemo } from 'react';

import type { HistoryItem } from '@/types';

function StatusChip({ score }: { score: number }) {
  const completed = score >= 60;
  return (
    <span
      className={
        completed
          ? 'px-2 py-1 bg-surface-container-high text-on-surface-variant text-xs rounded-full border border-outline-variant flex items-center gap-1'
          : 'px-2 py-1 bg-error-container text-on-error-container text-xs rounded-full border border-error/30 flex items-center gap-1'
      }
    >
      <span
        className={
          completed
            ? 'w-1.5 h-1.5 rounded-full bg-primary inline-block'
            : 'w-1.5 h-1.5 rounded-full bg-error inline-block'
        }
      />
      {completed ? 'Completed' : 'Failed'}
    </span>
  );
}

export function RecentActivity({ items }: { items: HistoryItem[] }) {
  const cards = useMemo(() => items.slice(0, 6), [items]);

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-h2 text-h2 text-on-surface">Recent Activity</h3>
        <a
          className="text-primary hover:text-inverse-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
          href="#history"
        >
          View All
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((item) => (
          <div
            key={item.id}
            className="bg-surface-container rounded-xl border border-outline-variant p-5 hover:border-outline hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">description</span>
                </div>
                <div>
                  <h4 className="font-label-sm text-label-sm text-on-surface truncate w-48">
                    {item.filename || 'pasted_text.txt'}
                  </h4>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <StatusChip score={item.detect?.score ?? 0} />
            </div>

            <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">group</span>
                Human confidence: {item.detect?.score ?? 0}%
              </div>
              <a
                href={`/process?hid=${encodeURIComponent(item.id)}`}
                className="text-on-surface-variant hover:text-primary transition-colors p-1"
                title="Open"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
