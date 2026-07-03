import { paraphraseWithFallback } from '@/lib/huggingface';
import { blocksToPlainText, getBlockText, summarizeBlocks } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument } from '@/types/document';
import type { DocumentDetectResult, HumanizeMode } from '@/types';

export type HumanizeTarget = 'ai-only' | 'ai-and-mixed';

export type HumanizeDocumentResult = {
  document: ParsedDocument;
  plainText: string;
  humanizedBlockCount: number;
  preservedBlockCount: number;
  failedBlockCount: number;
  errors: string[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function labelsForTarget(target: HumanizeTarget): Set<string> {
  return target === 'ai-only' ? new Set(['AI-like']) : new Set(['AI-like', 'Mixed']);
}

async function humanizeText(text: string, apiKey: string, signal: AbortSignal, mode: HumanizeMode) {
  const result = await paraphraseWithFallback({ text, apiKey, signal, mode });
  return result.text.trim();
}

async function humanizeTableBlock(
  block: DocumentBlock,
  apiKey: string,
  signal: AbortSignal,
  mode: HumanizeMode
): Promise<DocumentBlock> {
  if (!block.table) return block;

  let changed = false;
  const rows = [];

  for (const row of block.table.rows) {
    const cells = [];
    for (const cell of row.cells) {
      const cellText = cell.text?.trim() || '';
      const words = cellText.split(/\s+/).filter(Boolean).length;
      if (words < 8) {
        cells.push(cell);
        continue;
      }
      const rewritten = await humanizeText(cellText, apiKey, signal, mode);
      changed = true;
      cells.push({ ...cell, text: rewritten });
      await sleep(100);
    }
    rows.push({ cells });
  }

  if (!changed) return block;

  return {
    ...block,
    originalText: getBlockText(block),
    wasHumanized: true,
    table: { rows }
  };
}

async function humanizeTextBlock(
  block: DocumentBlock,
  apiKey: string,
  signal: AbortSignal,
  mode: HumanizeMode
): Promise<DocumentBlock> {
  const text = getBlockText(block);
  if (!text) return block;

  const rewritten = await humanizeText(text, apiKey, signal, mode);
  return {
    ...block,
    originalText: text,
    text: rewritten,
    wasHumanized: true
  };
}

export async function humanizeDocumentBlocks({
  document,
  detection,
  mode,
  apiKey,
  signal,
  target = 'ai-and-mixed',
  blockIds
}: {
  document: ParsedDocument;
  detection: DocumentDetectResult;
  mode: HumanizeMode;
  apiKey: string;
  signal: AbortSignal;
  target?: HumanizeTarget;
  blockIds?: string[];
}): Promise<HumanizeDocumentResult> {
  const detectMap = new Map(detection.blocks.map((b) => [b.blockId, b]));
  const labels = labelsForTarget(target);
  const selectedIds = blockIds ? new Set(blockIds) : null;
  const newBlocks: DocumentBlock[] = [];
  let humanizedBlockCount = 0;
  let preservedBlockCount = 0;
  let failedBlockCount = 0;
  const errors: string[] = [];

  for (const block of document.blocks) {
    if (block.type === 'image' || block.type === 'page-break') {
      newBlocks.push(block);
      preservedBlockCount++;
      continue;
    }

    const detect = detectMap.get(block.id);
    const matchesLabel = detect && labels.has(detect.label);
    const matchesSelection = !selectedIds || selectedIds.has(block.id);
    const shouldHumanize = selectedIds
      ? matchesSelection && getBlockText(block).length >= 20
      : matchesLabel && getBlockText(block).length >= 20;

    if (!shouldHumanize) {
      newBlocks.push(block);
      preservedBlockCount++;
      continue;
    }

    try {
      const updated =
        block.type === 'table'
          ? await humanizeTableBlock(block, apiKey, signal, mode)
          : await humanizeTextBlock(block, apiKey, signal, mode);

      if (updated.wasHumanized) {
        humanizedBlockCount++;
        newBlocks.push(updated);
      } else {
        preservedBlockCount++;
        newBlocks.push(block);
      }
    } catch (e: unknown) {
      failedBlockCount++;
      const message = e instanceof Error ? e.message : 'Humanization failed';
      if (errors.length < 3) errors.push(message);
      preservedBlockCount++;
      newBlocks.push(block);
    }

    await sleep(80);
  }

  const plainText = blocksToPlainText(newBlocks);
  const metadata = summarizeBlocks(newBlocks);

  const attempted = selectedIds?.size ?? detection.blocks.filter((b) => labels.has(b.label)).length;

  if (humanizedBlockCount === 0 && attempted > 0) {
    throw new Error(
      errors[0] ||
        'HuggingFace paraphrase failed for all selected blocks. Check Settings → API Status.'
    );
  }

  return {
    document: {
      ...document,
      blocks: newBlocks,
      metadata,
      plainText
    },
    plainText,
    humanizedBlockCount,
    preservedBlockCount,
    failedBlockCount,
    errors
  };
}
