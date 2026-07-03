'use client';

import type { BlockDetectResult, DocumentDetectResult } from '@/types';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

function BlockTypeBadge({ type }: { type: DocumentBlock['type'] }) {
  const colors: Record<DocumentBlock['type'], string> = {
    heading: 'bg-primary/15 text-primary border-primary/30',
    paragraph: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    image: 'bg-secondary/15 text-secondary border-secondary/30',
    table: 'bg-tertiary/15 text-tertiary border-tertiary/30',
    'list-item': 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    'page-break': 'bg-surface-container-lowest text-outline border-outline-variant',
    unknown: 'bg-surface-container-high text-on-surface-variant border-outline-variant'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[type]}`}>
      {type.replace('-', ' ')}
    </span>
  );
}

function AiScoreBadge({ detect }: { detect?: BlockDetectResult }) {
  if (!detect) return null;

  const colors =
    detect.label === 'AI-like'
      ? 'bg-error-container/20 text-error border-error/30'
      : detect.label === 'Mixed'
        ? 'bg-secondary/15 text-secondary border-secondary/30'
        : 'bg-primary/10 text-primary border-primary/30';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors}`}>
      {detect.aiScore}% AI
    </span>
  );
}

function blockBorderClass(detect?: BlockDetectResult) {
  if (!detect) return 'border-outline-variant';
  if (detect.label === 'AI-like') return 'border-error/50 bg-error-container/5';
  if (detect.label === 'Mixed') return 'border-secondary/40 bg-secondary/5';
  return 'border-primary/30 bg-primary/5';
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-surface-container-low rounded-lg border border-outline-variant p-3 sm:p-4">
      <div className="flex items-center gap-2 text-on-surface-variant mb-1">
        <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{icon}</span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="font-h2 text-lg sm:text-h2 text-on-surface truncate">{value}</div>
    </div>
  );
}

function BlockPreview({
  block,
  detect
}: {
  block: DocumentBlock;
  detect?: BlockDetectResult;
}) {
  if (block.type === 'page-break') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-outline-variant" />
        <span className="text-xs text-outline uppercase tracking-wider">Page {block.bbox?.page ?? '—'}</span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border ${blockBorderClass(detect)}`}
      >
        <BlockTypeBadge type="image" />
        <div className="flex-1 min-w-0">
          {block.image?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.image.src}
              alt={block.image.alt || 'Document image'}
              className="max-h-24 rounded border border-outline-variant object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">image</span>
              {block.image?.alt || 'Embedded image'}
              {block.bbox?.page ? ` (page ${block.bbox.page})` : ''}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === 'table' && block.table) {
    return (
      <div className={`p-3 rounded-lg border overflow-x-auto ${blockBorderClass(detect)}`}>
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <BlockTypeBadge type="table" />
          <AiScoreBadge detect={detect} />
        </div>
        <table className="w-full text-xs text-on-surface-variant border-collapse">
          <tbody>
            {block.table.rows.slice(0, 4).map((row, ri) => (
              <tr key={ri}>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="border border-outline-variant px-2 py-1 align-top">
                    {cell.text || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {block.table.rows.length > 4 && (
          <div className="text-[10px] text-outline mt-1">+{block.table.rows.length - 4} more rows</div>
        )}
      </div>
    );
  }

  const text = block.text || '';
  const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text;

  return (
    <div className={`p-3 rounded-lg border ${blockBorderClass(detect)}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <BlockTypeBadge type={block.type} />
        <AiScoreBadge detect={detect} />
        {block.style?.headingLevel && (
          <span className="text-[10px] text-outline">H{block.style.headingLevel}</span>
        )}
        {block.bbox?.page && <span className="text-[10px] text-outline">p.{block.bbox.page}</span>}
        {detect?.method === 'huggingface' && (
          <span className="text-[10px] text-outline">HF</span>
        )}
        {block.wasHumanized && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-tertiary/15 text-tertiary border-tertiary/30">
            HUMANIZED
          </span>
        )}
      </div>
      <p
        className={
          block.type === 'heading'
            ? 'text-sm font-semibold text-on-surface'
            : 'text-sm text-on-surface-variant leading-relaxed'
        }
      >
        {preview || '—'}
      </p>
    </div>
  );
}

export function DocumentStructurePreview({
  document,
  detection
}: {
  document: ParsedDocument;
  detection?: DocumentDetectResult | null;
}) {
  const { metadata } = document;
  const detectMap = new Map(detection?.blocks.map((b) => [b.blockId, b]));
  const previewBlocks = document.blocks.filter((b) => b.type !== 'page-break');

  return (
    <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)] space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-h2 text-h2 text-on-surface mb-1">Document Structure</h3>
          <p className="text-xs sm:text-sm text-on-surface-variant truncate">
            {document.filename} · {document.format.toUpperCase()} · {document.pageCount} page
            {document.pageCount === 1 ? '' : 's'}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/30">
          {detection
            ? document.blocks.some((b) => b.wasHumanized)
              ? 'Phase 3 · Humanized'
              : 'Phase 2 · AI Analyzed'
            : 'Phase 1 · Structured Parse'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard label="Words" value={metadata.wordCount} icon="text_fields" />
        <StatCard label="Text blocks" value={metadata.textBlockCount} icon="subject" />
        <StatCard label="Headings" value={metadata.headingCount} icon="title" />
        <StatCard label="Images" value={metadata.imageCount} icon="image" />
        <StatCard label="Tables" value={metadata.tableCount} icon="table" />
        <StatCard
          label="AI content"
          value={detection ? `${detection.aiContentPercent}%` : '—'}
          icon="smart_toy"
        />
      </div>

      {detection && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border border-error/50 bg-error-container/10" /> AI-like
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border border-secondary/40 bg-secondary/5" /> Mixed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border border-primary/30 bg-primary/5" /> Human
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-label-sm text-label-sm text-on-surface">Content blocks</h4>
          <span className="text-xs text-on-surface-variant">
            Showing {Math.min(previewBlocks.length, 40)} of {previewBlocks.length}
          </span>
        </div>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {previewBlocks.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No structured blocks found.</p>
          ) : (
            previewBlocks.slice(0, 40).map((block) => (
              <BlockPreview key={block.id} block={block} detect={detectMap.get(block.id)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
