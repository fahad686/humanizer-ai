'use client';

import type { DocumentDetectResult } from '@/types';

import { cn } from '@/lib/cn';

function AiRing({ percent }: { percent: number }) {
  const dash = Math.max(0, Math.min(100, percent));

  return (
    <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-surface-container-high stroke-current"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
        <path
          className="text-error stroke-current"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeDasharray={`${dash}, 100`}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-lg sm:text-2xl text-error">{dash}%</div>
        <div className="text-[9px] sm:text-[10px] text-on-surface-variant uppercase tracking-wider">AI</div>
      </div>
    </div>
  );
}

export function AiDetectionPanel({
  detection,
  busy,
  onAnalyze
}: {
  detection: DocumentDetectResult | null;
  busy?: boolean;
  onAnalyze?: () => void;
}) {
  const aiBlocks = detection?.blocks.filter((b) => b.label === 'AI-like').length ?? 0;
  const mixedBlocks = detection?.blocks.filter((b) => b.label === 'Mixed').length ?? 0;
  const humanBlocks = detection?.blocks.filter((b) => b.label === 'Human').length ?? 0;
  const hfBlocks = detection?.blocks.filter((b) => b.method === 'huggingface').length ?? 0;

  return (
    <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {detection ? (
            <AiRing percent={detection.aiContentPercent} />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-3xl">query_stats</span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-h2 text-h2 text-on-surface mb-1">AI Content Analysis</h3>
            {detection ? (
              <>
                <p className="text-sm text-on-surface-variant mb-2">
                  <span className="text-error font-semibold">{detection.aiContentPercent}%</span> appears
                  AI-generated (word-weighted).
                </p>
                <p className="text-xs text-outline">
                  {detection.analyzedBlocks} analyzed · {detection.skippedBlocks} skipped
                  {hfBlocks > 0 ? ` · ${hfBlocks} via HF` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">
                Run per-block analysis to measure AI content in your document.
              </p>
            )}
          </div>
        </div>

        {onAnalyze && (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={busy}
            className={cn(
              'w-full sm:w-auto sm:self-end px-5 py-3 rounded-xl min-h-[48px]',
              'bg-gradient-to-b from-primary to-inverse-primary text-on-primary font-label-sm text-label-sm',
              'shadow-[0_0_15px_rgba(73,75,214,0.3)] hover:shadow-[0_0_20px_rgba(73,75,214,0.5)]',
              'transition-shadow disabled:opacity-60 flex items-center justify-center gap-2'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">
              {busy ? 'hourglass_top' : 'psychology'}
            </span>
            {busy ? 'Analyzing…' : detection ? 'Re-analyze' : 'Analyze AI Content'}
          </button>
        )}
      </div>

      {detection && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-outline-variant">
          <div className="rounded-lg bg-error-container/10 border border-error/20 p-2 sm:p-4 text-center">
            <div className="font-h2 text-lg sm:text-h2 text-error">{aiBlocks}</div>
            <div className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider mt-1">
              AI-like
            </div>
          </div>
          <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-2 sm:p-4 text-center">
            <div className="font-h2 text-lg sm:text-h2 text-secondary">{mixedBlocks}</div>
            <div className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider mt-1">
              Mixed
            </div>
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 sm:p-4 text-center">
            <div className="font-h2 text-lg sm:text-h2 text-primary">{humanBlocks}</div>
            <div className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider mt-1">
              Human
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
