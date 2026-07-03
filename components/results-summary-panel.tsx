'use client';

import type { DocumentDetectResult } from '@/types';
import type { ParsedDocument } from '@/types/document';
import { cn } from '@/lib/cn';

function DeltaBadge({ before, after, invert }: { before: number; after: number; invert?: boolean }) {
  const delta = after - before;
  const improved = invert ? delta < 0 : delta > 0;
  const flat = delta === 0;

  return (
    <span
      className={cn(
        'text-xs font-bold px-2 py-0.5 rounded border',
        flat && 'text-on-surface-variant border-outline-variant',
        !flat && improved && 'text-tertiary border-tertiary/30 bg-tertiary-container/10',
        !flat && !improved && 'text-error border-error/30 bg-error-container/10'
      )}
    >
      {delta > 0 ? '+' : ''}
      {delta}%
    </span>
  );
}

export function ResultsSummaryPanel({
  detectionBefore,
  detectionAfter,
  humanizedDocument
}: {
  detectionBefore: DocumentDetectResult | null;
  detectionAfter: DocumentDetectResult | null;
  humanizedDocument: ParsedDocument | null;
}) {
  if (!detectionBefore || !detectionAfter || !humanizedDocument) return null;

  const humanizedCount = humanizedDocument.blocks.filter((b) => b.wasHumanized).length;
  const aiBefore = detectionBefore.aiContentPercent;
  const aiAfter = detectionAfter.aiContentPercent;
  const humanBefore = detectionBefore.humanContentPercent;
  const humanAfter = detectionAfter.humanContentPercent;

  return (
    <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-h2 text-h2 text-on-surface mb-1">Before & After</h3>
          <p className="text-sm text-on-surface-variant">
            AI detection improvement after selective humanization.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-xs font-bold border border-tertiary/30 self-start">
          Phase 4
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            AI before
          </div>
          <div className="font-h2 text-xl text-error">{aiBefore}%</div>
        </div>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            AI after
          </div>
          <div className="flex items-center gap-2">
            <span className="font-h2 text-xl text-tertiary">{aiAfter}%</span>
            <DeltaBadge before={aiBefore} after={aiAfter} invert />
          </div>
        </div>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            Human before
          </div>
          <div className="font-h2 text-xl text-on-surface">{humanBefore}%</div>
        </div>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            Human after
          </div>
          <div className="flex items-center gap-2">
            <span className="font-h2 text-xl text-primary">{humanAfter}%</span>
            <DeltaBadge before={humanBefore} after={humanAfter} />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-surface-container-low border border-outline-variant p-4 text-sm text-on-surface-variant">
        <span className="text-on-surface font-medium">{humanizedCount}</span> blocks rewritten ·{' '}
        <span className="text-on-surface font-medium">
          {aiBefore - aiAfter > 0 ? aiBefore - aiAfter : 0}
        </span>{' '}
        point reduction in AI content score
      </div>
    </section>
  );
}
