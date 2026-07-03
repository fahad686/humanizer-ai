import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { getBlockText } from '@/lib/document-utils';
import { getPdfJs } from '@/lib/pdfjs-server';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

const RENDER_SCALE = 1.5;

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

type BlockLayout = {
  rectBottom: number;
  coverHeight: number;
  coverWidth: number;
  rectX: number;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  activeFont: PDFFont;
  lines: string[];
  textStartY: number;
};

function layoutHumanizedBlock(
  page: PDFPage,
  block: DocumentBlock,
  font: PDFFont,
  boldFont: PDFFont
): BlockLayout | null {
  const bbox = block.bbox;
  if (!bbox) return null;

  const text = sanitizePdfText(getBlockText(block));
  if (!text) return null;

  const fontSize = Math.max(9, Math.min(block.style?.fontSize || 11, 24));
  const lineHeight = fontSize * 1.35;
  const activeFont = block.type === 'heading' || block.style?.bold ? boldFont : font;
  const pageWidth = page.getWidth();
  const maxWidth = Math.min(pageWidth - bbox.x - 16, Math.max(bbox.width * 1.2, pageWidth * 0.62));

  const newLines = wrapText(text, activeFont, fontSize, maxWidth);
  const origText = sanitizePdfText(block.originalText || text);
  const origLines = wrapText(origText, activeFont, fontSize, maxWidth);
  const lineCount = Math.max(newLines.length, origLines.length, 1);

  const padX = Math.max(8, fontSize * 0.45);
  const padY = Math.max(8, fontSize * 0.5);

  const coverHeight = Math.max(bbox.height * 1.5, lineCount * lineHeight + padY * 2, fontSize * 2.5);
  const coverWidth = Math.max(bbox.width * 1.25, maxWidth + padX * 2);
  const rectX = Math.max(4, bbox.x - padX);
  const rectBottom = bbox.y - padY;

  const textStartY = rectBottom + coverHeight - fontSize - padY * 0.25;

  return {
    rectBottom,
    coverHeight,
    coverWidth,
    rectX,
    fontSize,
    lineHeight,
    maxWidth,
    activeFont,
    lines: newLines,
    textStartY
  };
}

function redactBlock(page: PDFPage, layout: BlockLayout) {
  page.drawRectangle({
    x: layout.rectX,
    y: layout.rectBottom,
    width: layout.coverWidth,
    height: layout.coverHeight,
    color: rgb(1, 1, 1),
    borderWidth: 0
  });
}

function drawBlockText(page: PDFPage, layout: BlockLayout) {
  let cursorY = layout.textStartY;
  for (const line of layout.lines) {
    page.drawText(line, {
      x: layout.rectX + 4,
      y: cursorY,
      size: layout.fontSize,
      font: layout.activeFont,
      color: rgb(0, 0, 0)
    });
    cursorY -= layout.lineHeight;
  }
}

export async function exportPdfRasterized(originalPdf: Buffer, document: ParsedDocument): Promise<Buffer> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(originalPdf);
  const src = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);

  const humanizedBlocks = document.blocks.filter(
    (b) =>
      b.wasHumanized &&
      b.bbox &&
      (b.type === 'heading' || b.type === 'paragraph' || b.type === 'list-item')
  );

  for (let pageNum = 1; pageNum <= src.numPages; pageNum++) {
    const page = await src.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement
    }).promise;

    const jpegBytes = canvas.toBuffer('image/jpeg', 88);
    const pageImage = await outDoc.embedJpg(jpegBytes);

    const pageWidth = viewport.width / RENDER_SCALE;
    const pageHeight = viewport.height / RENDER_SCALE;
    const pdfPage = outDoc.addPage([pageWidth, pageHeight]);

    pdfPage.drawImage(pageImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    });

    const pageBlocks = humanizedBlocks.filter((b) => b.bbox?.page === pageNum);
    const layouts = pageBlocks
      .map((block) => layoutHumanizedBlock(pdfPage, block, font, boldFont))
      .filter((layout): layout is BlockLayout => layout !== null);

    for (const layout of layouts) {
      redactBlock(pdfPage, layout);
    }
    for (const layout of layouts) {
      drawBlockText(pdfPage, layout);
    }
  }

  return Buffer.from(await outDoc.save());
}
