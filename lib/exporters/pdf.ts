import { jsPDF } from 'jspdf';

import { getBlockText } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

const PAGE_HEIGHT = 792;
const MARGIN = 48;
const LINE_HEIGHT = 16;

function parseDataUrl(src: string) {
  const match = src.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

function imageFormat(mime: string): 'JPEG' | 'PNG' {
  return mime.includes('png') ? 'PNG' : 'JPEG';
}

export function exportToPdf(document: ParsedDocument): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeLines = (lines: string[], fontSize: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }
  };

  for (const block of document.blocks) {
    if (block.type === 'page-break') {
      doc.addPage();
      y = MARGIN;
      continue;
    }

    if (block.type === 'image') {
      const src = block.image?.src;
      const parsed = src ? parseDataUrl(src) : null;
      if (parsed) {
        const imgWidth = Math.min(block.image?.width || 280, width);
        const imgHeight = block.image?.height || imgWidth * 0.6;
        ensureSpace(imgHeight + LINE_HEIGHT);
        try {
          doc.addImage(parsed.data, imageFormat(parsed.mime), MARGIN, y, imgWidth, imgHeight);
          y += imgHeight + LINE_HEIGHT;
        } catch {
          writeLines([`[Image: ${block.image?.alt || 'embedded'}]`], 11);
        }
      } else {
        writeLines([`[Image: ${block.image?.alt || 'embedded'}]`], 11);
      }
      continue;
    }

    if (block.type === 'table' && block.table) {
      for (const row of block.table.rows) {
        const rowText = row.cells.map((c) => c.text || '').join(' | ');
        writeLines(doc.splitTextToSize(rowText, width) as string[], 10);
      }
      y += 8;
      continue;
    }

    const text = getBlockText(block);
    if (!text) continue;

    if (block.type === 'heading') {
      const size = block.style?.headingLevel === 1 ? 18 : block.style?.headingLevel === 2 ? 15 : 13;
      y += 6;
      writeLines(doc.splitTextToSize(text, width) as string[], size, 'bold');
      y += 4;
      continue;
    }

    if (block.type === 'list-item') {
      const prefix = block.ordered ? '1. ' : '• ';
      writeLines(doc.splitTextToSize(`${prefix}${text}`, width) as string[], 11);
      continue;
    }

    writeLines(doc.splitTextToSize(text, width) as string[], 11);
    y += 4;
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
