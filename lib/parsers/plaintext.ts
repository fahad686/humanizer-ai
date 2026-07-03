import { blockId, blocksToPlainText, summarizeBlocks } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

function parseMarkdownBlocks(text: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const lines = text.split('\n');
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const joined = paragraph.join(' ').trim();
    if (joined) {
      blocks.push({ id: blockId(), type: 'paragraph', text: joined });
    }
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        id: blockId(),
        type: 'heading',
        text: heading[2],
        style: { headingLevel: level, bold: true }
      });
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      blocks.push({
        id: blockId(),
        type: 'image',
        image: { alt: image[1] || 'Image', src: image[2] }
      });
      continue;
    }

    const list = trimmed.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (list) {
      flushParagraph();
      const level = Math.floor(list[1].length / 2) + 1;
      blocks.push({
        id: blockId(),
        type: 'list-item',
        text: list[3],
        listLevel: level,
        ordered: /\d+\./.test(list[2])
      });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

export function parsePlainText(
  buffer: Buffer,
  filename: string,
  format: 'txt' | 'md'
): ParsedDocument {
  const text = buffer.toString('utf8').trim();
  const blocks =
    format === 'md' ? parseMarkdownBlocks(text) : text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => ({
        id: blockId(),
        type: 'paragraph' as const,
        text: p
      }));

  const metadata = summarizeBlocks(blocks);

  return {
    filename,
    format,
    pageCount: 1,
    blocks,
    metadata,
    plainText: blocksToPlainText(blocks) || text
  };
}
