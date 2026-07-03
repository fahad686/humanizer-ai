'use client';

import type { DocumentDetectResult } from '@/types';
import type { ParsedDocument } from '@/types/document';
import { cn } from '@/lib/cn';
import { getBlockText } from '@/lib/document-utils';

function labelColor(label: string) {
  if (label === 'AI-like') return 'text-error border-error/30 bg-error-container/10';
  if (label === 'Mixed') return 'text-tertiary border-tertiary/30 bg-tertiary-container/10';
  return 'text-on-surface-variant border-outline-variant bg-surface-container-low';
}

export function BlockSelector({
  document,
  detection,
  selectedIds,
  onChange
}: {
  document: ParsedDocument;
  detection: DocumentDetectResult;
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  const detectMap = new Map(detection.blocks.map((b) => [b.blockId, b]));
  const selectable = document.blocks
    .map((block) => ({ block, detect: detectMap.get(block.id) }))
    .filter(
      ({ block, detect }) =>
        detect &&
        (detect.label === 'AI-like' || detect.label === 'Mixed') &&
        getBlockText(block).length >= 20
    );

  if (!selectable.length) return null;

  const allSelected = selectable.every(({ block }) => selectedIds.has(block.id));

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleAll() {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(selectable.map(({ block }) => block.id)));
    }
  }

  return (
    <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-h2 text-h2 text-on-surface mb-1">Select Blocks to Humanize</h3>
          <p className="text-sm text-on-surface-variant">
            Choose which AI-flagged sections to rewrite. Unselected blocks stay unchanged.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/30 self-start shrink-0">
          Phase 4
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-on-surface-variant">
          {selectedIds.size} of {selectable.length} selected
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm text-primary hover:underline min-h-[44px] px-2"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {selectable.map(({ block, detect }) => {
          const text = getBlockText(block);
          const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
          const checked = selectedIds.has(block.id);

          return (
            <li key={block.id}>
              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px]',
                  checked
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-outline-variant bg-surface-container-low hover:border-outline'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(block.id)}
                  className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wider text-on-surface-variant">
                      {block.type}
                    </span>
                    {detect && (
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded border',
                          labelColor(detect.label)
                        )}
                      >
                        {detect.label} · {detect.aiScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-2">{preview}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
