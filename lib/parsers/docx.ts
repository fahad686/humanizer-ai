import mammoth from 'mammoth';
import { HTMLElement, NodeType, parse } from 'node-html-parser';

import { blockId, blocksToPlainText, summarizeBlocks } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument, TableRow, TextStyle } from '@/types/document';

function styleFromElement(el: HTMLElement): TextStyle {
  const style: TextStyle = {};
  const tag = el.tagName?.toLowerCase();

  if (tag?.match(/^h[1-6]$/)) {
    style.headingLevel = Number(tag[1]) as TextStyle['headingLevel'];
    style.bold = true;
  }

  const inline = el.getAttribute('style') || '';
  if (/font-weight:\s*bold/i.test(inline) || el.querySelector('strong, b')) style.bold = true;
  if (/font-style:\s*italic/i.test(inline) || el.querySelector('em, i')) style.italic = true;
  if (/text-decoration:\s*underline/i.test(inline) || el.querySelector('u')) style.underline = true;

  const sizeMatch = inline.match(/font-size:\s*([\d.]+)pt/i);
  if (sizeMatch) style.fontSize = Number(sizeMatch[1]);

  const colorMatch = inline.match(/color:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\))/i);
  if (colorMatch) style.color = colorMatch[1];

  return style;
}

function textFromNode(el: HTMLElement): string {
  return el.textContent.replace(/\s+/g, ' ').trim();
}

function parseTable(el: HTMLElement): { rows: TableRow[] } {
  const rows: TableRow[] = [];

  for (const rowEl of el.querySelectorAll('tr')) {
    const cells = rowEl.querySelectorAll('th, td').map((cell) => ({
      text: textFromNode(cell),
      rowSpan: Number(cell.getAttribute('rowspan') || 1) || undefined,
      colSpan: Number(cell.getAttribute('colspan') || 1) || undefined,
      style: styleFromElement(cell)
    }));
    if (cells.length) rows.push({ cells });
  }

  return { rows };
}

function htmlToBlocks(html: string): DocumentBlock[] {
  const root = parse(`<div id="root">${html}</div>`);
  const container = root.querySelector('#root');
  if (!container) return [];

  const blocks: DocumentBlock[] = [];

  const walk = (node: HTMLElement, listLevel = 0, ordered = false) => {
    for (const child of node.childNodes) {
      if (child.nodeType === NodeType.TEXT_NODE) continue;

      const el = child as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      if (!tag) continue;

      if (tag.match(/^h[1-6]$/)) {
        blocks.push({
          id: blockId(),
          type: 'heading',
          text: textFromNode(el),
          style: styleFromElement(el)
        });
        continue;
      }

      if (tag === 'p') {
        const text = textFromNode(el);
        if (text) {
          blocks.push({
            id: blockId(),
            type: 'paragraph',
            text,
            style: styleFromElement(el)
          });
        }
        continue;
      }

      if (tag === 'img') {
        blocks.push({
          id: blockId(),
          type: 'image',
          image: {
            src: el.getAttribute('src') || undefined,
            alt: el.getAttribute('alt') || 'Image',
            width: Number(el.getAttribute('width') || 0) || undefined,
            height: Number(el.getAttribute('height') || 0) || undefined
          }
        });
        continue;
      }

      if (tag === 'table') {
        blocks.push({
          id: blockId(),
          type: 'table',
          table: parseTable(el)
        });
        continue;
      }

      if (tag === 'ul' || tag === 'ol') {
        walk(el, listLevel + 1, tag === 'ol');
        continue;
      }

      if (tag === 'li') {
        const text = textFromNode(el);
        if (text) {
          blocks.push({
            id: blockId(),
            type: 'list-item',
            text,
            listLevel: Math.max(1, listLevel),
            ordered
          });
        }
        continue;
      }

      if (tag === 'br') continue;

      // Nested containers (div, section, article, etc.)
      if (el.childNodes.length) {
        walk(el, listLevel, ordered);
        continue;
      }

      const text = textFromNode(el);
      if (text) {
        blocks.push({
          id: blockId(),
          type: 'paragraph',
          text,
          style: styleFromElement(el)
        });
      }
    }
  };

  walk(container);
  return blocks;
}

export async function parseDocx(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((imageBuffer) => ({
          src: `data:${image.contentType};base64,${imageBuffer}`
        }))
      )
    }
  );

  const blocks = htmlToBlocks(result.value);
  const metadata = summarizeBlocks(blocks);

  return {
    filename,
    format: 'docx',
    pageCount: Math.max(1, Math.ceil(metadata.wordCount / 300)),
    blocks,
    metadata,
    plainText: blocksToPlainText(blocks)
  };
}
