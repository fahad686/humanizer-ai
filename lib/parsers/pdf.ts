import { blockId, blocksToPlainText, sortBlocksByReadingOrder, summarizeBlocks } from '@/lib/document-utils';
import { extractImagesFromPage } from '@/lib/pdf-images';
import { getPdfJs } from '@/lib/pdfjs-server';
import type { BoundingBox, DocumentBlock, ParsedDocument } from '@/types/document';

type PdfJsModule = Awaited<ReturnType<typeof getPdfJs>>;

type PositionedText = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
};

type TextLine = {
  items: PositionedText[];
  y: number;
  minX: number;
  maxX: number;
};

function groupIntoLines(items: PositionedText[], tolerance = 4): TextLine[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= tolerance);
    if (line) {
      line.items.push(item);
      line.minX = Math.min(line.minX, item.x);
      line.maxX = Math.max(line.maxX, item.x + item.width);
      line.y = (line.y + item.y) / 2;
    } else {
      lines.push({
        items: [item],
        y: item.y,
        minX: item.x,
        maxX: item.x + item.width
      });
    }
  }

  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  return lines.sort((a, b) => b.y - a.y);
}

function linesToParagraphs(lines: TextLine[], page: number): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  if (!lines.length) return blocks;

  const avgHeight =
    lines.reduce((sum, l) => sum + l.items.reduce((s, i) => s + i.height, 0) / Math.max(1, l.items.length), 0) /
    lines.length;

  const paragraphGap = avgHeight * 1.6;
  let group: TextLine[] = [];

  const flush = () => {
    if (!group.length) return;

    const text = group
      .map((l) => l.items.map((i) => i.str).join(' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      group = [];
      return;
    }

    const first = group[0].items[0];
    const lastLine = group[group.length - 1];
    const lastItem = lastLine.items[lastLine.items.length - 1];
    const topY = group[0].y;
    const bottomY = lastLine.y;
    const lineSpan = Math.max(avgHeight, topY - bottomY + avgHeight * 0.6);

    const bbox: BoundingBox = {
      page,
      x: first.x,
      y: bottomY,
      width: Math.max(0, lastItem.x + lastItem.width - first.x),
      height: Math.max(lineSpan, group.length * avgHeight * 1.35)
    };

    const fontSize = first.height;
    const isHeading = fontSize >= avgHeight * 1.35 || (text.length < 80 && fontSize >= avgHeight * 1.15);

    if (isHeading) {
      blocks.push({
        id: blockId(),
        type: 'heading',
        text,
        style: { bold: true, fontSize, fontFamily: first.fontName, headingLevel: fontSize >= avgHeight * 1.5 ? 1 : 2 },
        bbox
      });
    } else {
      blocks.push({
        id: blockId(),
        type: 'paragraph',
        text,
        style: { fontSize, fontFamily: first.fontName },
        bbox
      });
    }

    group = [];
  };

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      const gap = lines[i - 1].y - lines[i].y;
      if (gap > paragraphGap) flush();
    }
    group.push(lines[i]);
  }

  flush();
  return blocks;
}

async function getImageOps(pdfjs: PdfJsModule) {
  return new Set([
    pdfjs.OPS.paintXObject,
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintInlineImageXObject,
    pdfjs.OPS.paintImageMaskXObject,
    pdfjs.OPS.paintImageXObjectRepeat
  ]);
}

export async function parsePdf(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(buffer);

  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true
  }).promise;

  const blocks: DocumentBlock[] = [];
  const pageCount = doc.numPages;
  const imageOps = await getImageOps(pdfjs);
  const pageSizes: Record<number, { width: number; height: number }> = {};

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (pageNum > 1) {
      blocks.push({ id: blockId(), type: 'page-break', bbox: { page: pageNum, x: 0, y: 0, width: 0, height: 0 } });
    }

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes[pageNum] = { width: viewport.width, height: viewport.height };
    const textContent = await page.getTextContent();

    const positioned: PositionedText[] = [];
    const pageBlocks: DocumentBlock[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;

      const tx = pdfjs.Util.transform(viewport.transform, item.transform);
      const fontSize = Math.hypot(tx[0], tx[1]);

      positioned.push({
        str: item.str,
        x: tx[4],
        y: tx[5],
        width: item.width,
        height: fontSize,
        fontName: item.fontName
      });
    }

    const lines = groupIntoLines(positioned);
    pageBlocks.push(...linesToParagraphs(lines, pageNum));

    const pageImages = await extractImagesFromPage(page, pageNum, imageOps);
    pageBlocks.push(...pageImages);

    blocks.push(...sortBlocksByReadingOrder(pageBlocks));
  }

  const metadata = summarizeBlocks(blocks);

  return {
    filename,
    format: 'pdf',
    pageCount,
    blocks,
    metadata,
    plainText: blocksToPlainText(blocks),
    pageSizes
  };
}
