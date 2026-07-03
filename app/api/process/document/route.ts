import { NextResponse } from 'next/server';
import { z } from 'zod';

import { humanizeDocumentBlocks } from '@/lib/humanize-document';

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
      wordCount: z.number(),
      textBlockCount: z.number(),
      imageCount: z.number(),
      tableCount: z.number(),
      headingCount: z.number()
    }),
    plainText: z.string()
  }),
  detection: z.object({
    overall: z.object({
      score: z.number(),
      label: z.enum(['Human', 'Mixed', 'AI-like']),
      details: z.object({
        perplexityLike: z.number(),
        burstiness: z.number(),
        repetition: z.number()
      })
    }),
    aiContentPercent: z.number(),
    humanContentPercent: z.number(),
    blocks: z.array(
      z.object({
        blockId: z.string(),
        blockType: z.enum(['heading', 'paragraph', 'image', 'table', 'list-item', 'page-break', 'unknown']),
        wordCount: z.number(),
        score: z.number(),
        aiScore: z.number(),
        label: z.enum(['Human', 'Mixed', 'AI-like']),
        method: z.enum(['heuristic', 'huggingface'])
      })
    ),
    analyzedBlocks: z.number(),
    skippedBlocks: z.number()
  }),
  mode: z.enum(['formal', 'simple', 'conversational']).default('conversational'),
  target: z.enum(['ai-only', 'ai-and-mixed']).default('ai-and-mixed'),
  blockIds: z.array(z.string()).optional()
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing HUGGINGFACE_API_KEY' }, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280000);

  try {
    const result = await humanizeDocumentBlocks({
      document: parsed.data.document,
      detection: parsed.data.detection,
      mode: parsed.data.mode,
      apiKey,
      signal: controller.signal,
      target: parsed.data.target,
      blockIds: parsed.data.blockIds
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Humanization failed';
    if (e instanceof Error && e.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out. Try fewer blocks or ai-only mode.' }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
