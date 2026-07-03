import { NextResponse } from 'next/server';
import { z } from 'zod';

import { exportToDocx, exportToTxt } from '@/lib/exporters/docx';
import { exportPdfPageWise } from '@/lib/exporters/pdf-page-wise';
import { exportPdfPreservedLayout } from '@/lib/exporters/pdf-preserved';
import { exportToPdf } from '@/lib/exporters/pdf';
import { loadSourcePdfFile } from '@/lib/source-pdf-cache';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DocumentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['heading', 'paragraph', 'image', 'table', 'list-item', 'page-break', 'unknown']),
  text: z.string().optional(),
  originalText: z.string().optional(),
  wasHumanized: z.boolean().optional(),
  style: z.record(z.unknown()).optional(),
  bbox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      page: z.number()
    })
    .optional(),
  image: z.record(z.unknown()).optional(),
  table: z
    .object({
      rows: z.array(
        z.object({
          cells: z.array(
            z.object({
              text: z.string(),
              rowSpan: z.number().optional(),
              colSpan: z.number().optional()
            })
          )
        })
      )
    })
    .optional(),
  listLevel: z.number().optional(),
  ordered: z.boolean().optional()
});

const BodySchema = z.object({
  document: z.object({
    filename: z.string(),
    format: z.enum(['pdf', 'docx', 'txt', 'md']),
    pageCount: z.number(),
    blocks: z.array(DocumentBlockSchema),
    metadata: z.object({
      title: z.string().optional(),
      wordCount: z.number(),
      textBlockCount: z.number(),
      imageCount: z.number(),
      tableCount: z.number(),
      headingCount: z.number()
    }),
    plainText: z.string(),
    pageSizes: z.record(z.object({ width: z.number(), height: z.number() })).optional(),
    sourcePdfKey: z.string().optional()
  }),
  format: z.enum(['docx', 'pdf', 'txt']),
  pdfLayout: z.enum(['pagewise', 'preserved']).optional(),
  sourcePdfBase64: z.string().optional(),
  sourcePdfKey: z.string().optional()
});

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, '') || 'document';
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { document, format, pdfLayout, sourcePdfBase64, sourcePdfKey } = parsed.data;
  const name = baseName(document.filename);

  try {
    if (format === 'docx') {
      const buffer = await exportToDocx(document);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${name}_humanized.docx"`
        }
      });
    }

    if (format === 'pdf') {
      let buffer: Buffer;

      if (document.format === 'pdf' && document.pageCount > 0 && pdfLayout !== 'preserved') {
        buffer = await exportPdfPageWise(document);
      } else if (pdfLayout === 'preserved' && document.format === 'pdf') {
        let originalPdf: Buffer | null = null;

        if (sourcePdfKey) {
          originalPdf = await loadSourcePdfFile(sourcePdfKey);
        }
        if (!originalPdf && sourcePdfBase64) {
          originalPdf = Buffer.from(sourcePdfBase64, 'base64');
        }
        if (!originalPdf && document.sourcePdfKey) {
          originalPdf = await loadSourcePdfFile(document.sourcePdfKey);
        }

        if (!originalPdf) {
          return NextResponse.json(
            { error: 'Original PDF not found. Re-upload the file to use layout-preserving export.' },
            { status: 400 }
          );
        }

        buffer = await exportPdfPreservedLayout(originalPdf, document);
      } else {
        buffer = exportToPdf(document);
      }
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${name}_humanized.pdf"`
        }
      });
    }

    const buffer = exportToTxt(document);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}_humanized.txt"`
      }
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Export failed';
    console.error('[api/export]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
