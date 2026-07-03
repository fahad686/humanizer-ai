import { NextResponse } from 'next/server';
import { z } from 'zod';

import { detectDocumentBlocks, heuristicDetect } from '@/lib/ai-detect';

export const runtime = 'nodejs';

const TextBodySchema = z.object({
  text: z.string().min(1)
});

const DocumentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['heading', 'paragraph', 'image', 'table', 'list-item', 'page-break', 'unknown']),
  text: z.string().optional(),
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

const DocumentBodySchema = z.object({
  document: z.object({
    filename: z.string(),
    format: z.enum(['pdf', 'docx', 'txt', 'md']),
    pageCount: z.number(),
    blocks: z.array(DocumentBlockSchema),
    metadata: z.object({
      wordCount: z.number(),
      textBlockCount: z.number(),
      imageCount: z.number(),
      tableCount: z.number(),
      headingCount: z.number()
    }),
    plainText: z.string()
  })
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const textParsed = TextBodySchema.safeParse(json);
  if (textParsed.success) {
    return NextResponse.json(heuristicDetect(textParsed.data.text));
  }

  const docParsed = DocumentBodySchema.safeParse(json);
  if (!docParsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const result = await detectDocumentBlocks({
      blocks: docParsed.data.document.blocks,
      apiKey,
      signal: controller.signal
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Detection failed';
    if (e instanceof Error && e.name === 'AbortError') {
      return NextResponse.json({ error: 'Detection timed out. Try a smaller document.' }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
