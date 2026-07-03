import type { DocumentBlock, DocumentMetadata, ParsedDocument } from '@/types/document';

export function blockId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const TEXT_TYPES = new Set<DocumentBlock['type']>(['heading', 'paragraph', 'list-item']);

export function getBlockText(block: DocumentBlock): string {
  if (block.text?.trim()) return block.text.trim();
  if (block.type === 'table' && block.table) {
    return block.table.rows
      .flatMap((r) => r.cells.map((c) => c.text))
      .join(' ')
      .trim();
  }
  return '';
}

export function getBlockWordCount(block: DocumentBlock): number {
  const text = getBlockText(block);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function blocksToPlainText(blocks: DocumentBlock[]): string {
  return blocks
    .filter((b) => TEXT_TYPES.has(b.type) && b.text?.trim())
    .map((b) => b.text!.trim())
    .join('\n\n');
}

export function blocksToReadableText(blocks: DocumentBlock[]): string {
  return blocks
    .map((b) => getBlockText(b))
    .filter((t) => t.length > 0)
    .join('\n\n');
}

export function compareBlocksReadingOrder(a: DocumentBlock, b: DocumentBlock): number {
  const pageA = a.bbox?.page ?? 0;
  const pageB = b.bbox?.page ?? 0;
  if (pageA !== pageB) return pageA - pageB;

  const yA = a.bbox?.y ?? 0;
  const yB = b.bbox?.y ?? 0;
  if (yA !== yB) return yB - yA;

  return (a.bbox?.x ?? 0) - (b.bbox?.x ?? 0);
}

export function sortBlocksByReadingOrder(blocks: DocumentBlock[]): DocumentBlock[] {
  const sorted: DocumentBlock[] = [];
  let pageChunk: DocumentBlock[] = [];

  const flush = () => {
    if (!pageChunk.length) return;
    sorted.push(...[...pageChunk].sort(compareBlocksReadingOrder));
    pageChunk = [];
  };

  for (const block of blocks) {
    if (block.type === 'page-break') {
      flush();
      sorted.push(block);
      continue;
    }
    pageChunk.push(block);
  }

  flush();
  return sorted;
}

export function summarizeBlocks(blocks: DocumentBlock[]): DocumentMetadata {
  let wordCount = 0;
  let textBlockCount = 0;
  let imageCount = 0;
  let tableCount = 0;
  let headingCount = 0;

  for (const block of blocks) {
    if (block.type === 'image') imageCount++;
    if (block.type === 'table') tableCount++;
    if (block.type === 'heading') headingCount++;
    if (TEXT_TYPES.has(block.type) && block.text) {
      textBlockCount++;
      wordCount += block.text.split(/\s+/).filter(Boolean).length;
    }
    if (block.type === 'table' && block.table) {
      for (const row of block.table.rows) {
        for (const cell of row.cells) {
          wordCount += cell.text.split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }

  return { wordCount, textBlockCount, imageCount, tableCount, headingCount };
}

export function mergeDocuments(docs: ParsedDocument[]): ParsedDocument {
  const blocks: DocumentBlock[] = [];
  for (const doc of docs) {
    blocks.push(...doc.blocks);
  }

  const plainText = blocksToPlainText(blocks);
  const metadata = summarizeBlocks(blocks);

  return {
    filename: docs.length === 1 ? docs[0].filename : `${docs[0].filename} (+${docs.length - 1})`,
    format: docs[0].format,
    pageCount: docs.reduce((sum, d) => sum + d.pageCount, 0),
    blocks,
    metadata,
    plainText
  };
}
