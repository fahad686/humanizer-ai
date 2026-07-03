import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { compareBlocksReadingOrder, getBlockText } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

const DEFAULT_PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const BLOCK_GAP = 10;

function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function blocksOnPage(document: ParsedDocument, pageNum: number): DocumentBlock[] {
  return document.blocks
    .filter((b) => b.type !== 'page-break' && b.bbox?.page === pageNum)
    .sort(compareBlocksReadingOrder);
}

function pickFont(
  block: DocumentBlock,
  font: PDFFont,
  boldFont: PDFFont,
  italicFont: PDFFont,
  boldItalicFont: PDFFont
): PDFFont {
  const bold = block.type === 'heading' || block.style?.bold;
  const italic = block.style?.italic;
  if (bold && italic) return boldItalicFont;
  if (bold) return boldFont;
  if (italic) return italicFont;
  return font;
}

function headingSize(block: DocumentBlock): number {
  const level = block.style?.headingLevel ?? 2;
  if (level <= 1) return 22;
  if (level === 2) return 18;
  if (level === 3) return 15;
  return 13;
}

function drawTextBlock(
  page: PDFPage,
  block: DocumentBlock,
  fonts: { font: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont },
  x: number,
  maxWidth: number,
  startY: number
): number {
  const text = sanitizePdfText(getBlockText(block));
  if (!text) return startY;

  const fontSize =
    block.type === 'heading'
      ? headingSize(block)
      : Math.max(9, Math.min(block.style?.fontSize || 11, 14));
  const activeFont = pickFont(block, fonts.font, fonts.bold, fonts.italic, fonts.boldItalic);
  const lineHeight = fontSize * 1.45;
  const indent = block.type === 'list-item' ? (block.listLevel ?? 0) * 14 + 14 : 0;
  const prefix =
    block.type === 'list-item' ? (block.ordered ? '1. ' : '• ') : block.type === 'heading' ? '' : '';
  const lines = wrapText(`${prefix}${text}`, activeFont, fontSize, maxWidth - indent);

  let cursorY = startY;
  for (const line of lines) {
    cursorY -= lineHeight;
    page.drawText(line, {
      x: x + indent,
      y: cursorY,
      size: fontSize,
      font: activeFont,
      color: rgb(0.08, 0.08, 0.08)
    });
  }

  return cursorY - BLOCK_GAP;
}

function drawTableBlock(
  page: PDFPage,
  block: DocumentBlock,
  font: PDFFont,
  x: number,
  maxWidth: number,
  startY: number
): number {
  if (!block.table?.rows.length) return startY;

  const fontSize = 10;
  const lineHeight = fontSize * 1.4;
  let cursorY = startY;

  for (const row of block.table.rows) {
    const rowText = sanitizePdfText(row.cells.map((c) => c.text).join(' · '));
    if (!rowText) continue;
    const lines = wrapText(rowText, font, fontSize, maxWidth);
    for (const line of lines) {
      cursorY -= lineHeight;
      page.drawText(line, { x, y: cursorY, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
    }
    cursorY -= 4;
  }

  return cursorY - BLOCK_GAP;
}

function drawImagePlaceholder(
  page: PDFPage,
  block: DocumentBlock,
  font: PDFFont,
  x: number,
  maxWidth: number,
  startY: number
): number {
  const label = sanitizePdfText(block.image?.alt || 'Illustration');
  const fontSize = 10;
  const lineHeight = fontSize * 1.5;
  const lines = wrapText(`[${label}]`, font, fontSize, maxWidth);
  let cursorY = startY - 6;

  for (const line of lines) {
    cursorY -= lineHeight;
    page.drawText(line, {
      x,
      y: cursorY,
      size: fontSize,
      font,
      color: rgb(0.45, 0.45, 0.45)
    });
  }

  return cursorY - BLOCK_GAP;
}

export async function exportPdfPageWise(document: ParsedDocument): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const fonts = { font, bold: boldFont, italic: italicFont, boldItalic: boldItalicFont };

  const pageCount = Math.max(1, document.pageCount);
  const title = sanitizePdfText(document.metadata.title || document.filename.replace(/\.[^.]+$/, ''));

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const size = document.pageSizes?.[pageNum] ?? DEFAULT_PAGE;
    const page = pdfDoc.addPage([size.width, size.height]);
    const contentWidth = size.width - MARGIN * 2;
    let cursorY = size.height - MARGIN;

    if (pageNum === 1 && title) {
      const titleLines = wrapText(title, boldFont, 16, contentWidth);
      for (const line of titleLines) {
        cursorY -= 20;
        page.drawText(line, { x: MARGIN, y: cursorY, size: 16, font: boldFont, color: rgb(0, 0, 0) });
      }
      cursorY -= 16;
    }

    const blocks = blocksOnPage(document, pageNum);

    for (const block of blocks) {
      if (cursorY < MARGIN + 24) break;

      if (block.type === 'image') {
        cursorY = drawImagePlaceholder(page, block, font, MARGIN, contentWidth, cursorY);
        continue;
      }

      if (block.type === 'table') {
        cursorY = drawTableBlock(page, block, font, MARGIN, contentWidth, cursorY);
        continue;
      }

      if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'list-item') {
        cursorY = drawTextBlock(page, block, fonts, MARGIN, contentWidth, cursorY);
      }
    }

    const footer = `Page ${pageNum} of ${pageCount}`;
    page.drawText(footer, {
      x: size.width / 2 - font.widthOfTextAtSize(footer, 9) / 2,
      y: MARGIN / 2,
      size: 9,
      font,
      color: rgb(0.55, 0.55, 0.55)
    });
  }

  return Buffer.from(await pdfDoc.save());
}
