import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { getBlockText } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawWrappedText({
  page,
  font,
  text,
  x,
  y,
  width,
  fontSize,
  lineHeight
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  lineHeight: number;
}) {
  const lines = wrapText(text, font, fontSize, width);
  let cursorY = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: cursorY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });
    cursorY -= lineHeight;
  }
}

export async function exportPdfOverlay(originalPdf: Buffer, document: ParsedDocument): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalPdf, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const humanizedBlocks = document.blocks.filter(
    (b) => b.wasHumanized && b.bbox && (b.type === 'heading' || b.type === 'paragraph' || b.type === 'list-item')
  );

  for (const block of humanizedBlocks) {
    const bbox = block.bbox!;
    const pageIndex = bbox.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const text = getBlockText(block);
    if (!text) continue;

    const fontSize = Math.max(8, Math.min(block.style?.fontSize || 11, 28));
    const lineHeight = fontSize * 1.25;
    const activeFont = block.type === 'heading' || block.style?.bold ? boldFont : font;
    const maxWidth = Math.max(bbox.width, page.getWidth() * 0.35);
    const padding = 2;

    page.drawRectangle({
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: maxWidth + padding * 2,
      height: Math.max(bbox.height, fontSize * 1.5) + padding * 2,
      color: rgb(1, 1, 1),
      borderWidth: 0
    });

    drawWrappedText({
      page,
      font: activeFont,
      text,
      x: bbox.x,
      y: bbox.y,
      width: maxWidth,
      fontSize,
      lineHeight
    });
  }

  return Buffer.from(await pdfDoc.save());
}

export function hasLayoutOverlaySupport(document: ParsedDocument): boolean {
  return document.format === 'pdf' && document.blocks.some((b) => b.wasHumanized && b.bbox);
}
