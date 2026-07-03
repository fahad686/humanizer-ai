'use client';

import type { DocumentDetectResult } from '@/types';
import type { HumanizeMode } from '@/types';
import type { ParsedDocument } from '@/types/document';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export function HumanizeActionsPanel({
  document,
  detection,
  humanizedDocument,
  mode,
  busy,
  selectedCount,
  onModeChange,
  onHumanizeAiBlocks,
  onExport
}: {
  document: ParsedDocument;
  detection: DocumentDetectResult | null;
  humanizedDocument: ParsedDocument | null;
  mode: HumanizeMode;
  busy?: boolean;
  selectedCount?: number;
  onModeChange: (mode: HumanizeMode) => void;
  onHumanizeAiBlocks: () => void;
  onExport: (format: 'docx' | 'pdf' | 'txt') => void;
}) {
  const aiBlocks =
    detection?.blocks.filter((b) => b.label === 'AI-like' || b.label === 'Mixed').length ?? 0;
  const toHumanize = selectedCount ?? aiBlocks;
  const humanizedCount = humanizedDocument?.blocks.filter((b) => b.wasHumanized).length ?? 0;
  const exportDoc = humanizedDocument ?? document;
  const canExport = Boolean(humanizedDocument);

  return (
    <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-h2 text-h2 text-on-surface mb-1">Humanize In Place</h3>
          <p className="text-sm text-on-surface-variant">
            Rewrite selected AI-flagged blocks. Images and layout stay intact.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/30 self-start shrink-0">
          Phase 4
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-sm">
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4">
          <div className="text-on-surface-variant text-[10px] sm:text-xs uppercase tracking-wider mb-1">
            Selected
          </div>
          <div className="font-h2 text-xl sm:text-h2 text-error">{toHumanize}</div>
        </div>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4">
          <div className="text-on-surface-variant text-[10px] sm:text-xs uppercase tracking-wider mb-1">
            Humanized
          </div>
          <div className="font-h2 text-xl sm:text-h2 text-tertiary">{humanizedCount}</div>
        </div>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="text-on-surface-variant text-[10px] sm:text-xs uppercase tracking-wider mb-1">
            Preserved
          </div>
          <div className="font-h2 text-base sm:text-h2 text-primary">
            {exportDoc.metadata.imageCount} img · {exportDoc.metadata.tableCount} tbl
          </div>
        </div>
      </div>

      <div>
        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Tone</label>
        <div className="grid grid-cols-3 gap-2">
          {(['formal', 'simple', 'conversational'] as HumanizeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                'px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm capitalize min-h-[44px] transition-colors',
                m === mode
                  ? 'bg-indigo-500/10 border border-indigo-500/40 text-indigo-300'
                  : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:border-outline'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          disabled={busy || !detection || toHumanize === 0}
          onClick={onHumanizeAiBlocks}
          className="w-full min-h-[48px] text-sm sm:text-base"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          {busy ? 'Humanizing…' : `Humanize ${toHumanize} Selected Block${toHumanize === 1 ? '' : 's'}`}
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !canExport}
            onClick={() => onExport('docx')}
            className="min-h-[44px] text-xs sm:text-sm px-2"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            <span className="hidden sm:inline">DOCX</span>
            <span className="sm:hidden">Word</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !canExport}
            onClick={() => onExport('pdf')}
            className="min-h-[44px] text-xs sm:text-sm px-2"
            title="Clean PDF with humanized text, one page per original page"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !canExport}
            onClick={() => onExport('txt')}
            className="min-h-[44px] text-xs sm:text-sm px-2"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            TXT
          </Button>
        </div>
        {canExport && exportDoc.format === 'pdf' && (
          <p className="text-xs text-on-surface-variant">
            Export <strong className="text-on-surface">PDF</strong> to get a clean, readable book with humanized
            text grouped page by page. Illustrations are not embedded in this export.
          </p>
        )}
      </div>
    </section>
  );
}
