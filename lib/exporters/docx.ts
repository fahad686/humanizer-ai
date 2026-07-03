import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx';

import { blocksToPlainText } from '@/lib/document-utils';
import type { DocumentBlock, ParsedDocument } from '@/types/document';

function headingLevel(level?: number) {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return HeadingLevel.HEADING_2;
  }
}

function textRuns(text: string, style?: DocumentBlock['style']) {
  return [
    new TextRun({
      text,
      bold: style?.bold,
      italics: style?.italic,
      underline: style?.underline ? {} : undefined,
      size: style?.fontSize ? Math.round(style.fontSize * 2) : undefined
    })
  ];
}

function parseDataUrl(src: string) {
  const match = src.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: Buffer.from(match[2], 'base64') };
}

function imageType(mime: string): 'jpg' | 'png' | 'gif' | 'bmp' {
  if (mime.includes('png')) return 'png';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('bmp')) return 'bmp';
  return 'jpg';
}

function blockToDocx(block: DocumentBlock) {
  if (block.type === 'page-break') {
    return [new Paragraph({ children: [new PageBreak()] })];
  }

  if (block.type === 'image' && block.image?.src) {
    const parsed = parseDataUrl(block.image.src);
    if (parsed) {
      return [
        new Paragraph({
          children: [
            new ImageRun({
              type: imageType(parsed.mime),
              data: parsed.data,
              transformation: {
                width: block.image.width || 320,
                height: block.image.height || 200
              }
            })
          ]
        })
      ];
    }
    return [
      new Paragraph({
        children: [new TextRun({ text: `[Image: ${block.image.alt || 'embedded image'}]`, italics: true })]
      })
    ];
  }

  if (block.type === 'table' && block.table) {
    const rows = block.table.rows.map(
      (row) =>
        new TableRow({
          children: row.cells.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ children: textRuns(cell.text || '', cell.style) })],
                rowSpan: cell.rowSpan,
                columnSpan: cell.colSpan
              })
          )
        })
    );

    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows
      }),
      new Paragraph({ children: [new TextRun('')] })
    ];
  }

  const text = block.text?.trim();
  if (!text) return [];

  if (block.type === 'heading') {
    return [
      new Paragraph({
        heading: headingLevel(block.style?.headingLevel),
        children: textRuns(text, { ...block.style, bold: true })
      })
    ];
  }

  if (block.type === 'list-item') {
    return [
      new Paragraph({
        children: textRuns(`${block.ordered ? '1.' : '•'} ${text}`, block.style),
        indent: { left: (block.listLevel || 1) * 360 }
      })
    ];
  }

  return [new Paragraph({ children: textRuns(text, block.style) })];
}

export async function exportToDocx(document: ParsedDocument): Promise<Buffer> {
  const children = document.blocks.flatMap((block) => blockToDocx(block));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length ? children : [new Paragraph({ children: [new TextRun(blocksToPlainText(document.blocks))] })]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

export function exportToTxt(document: ParsedDocument): Buffer {
  return Buffer.from(blocksToPlainText(document.blocks) || document.plainText, 'utf8');
}
