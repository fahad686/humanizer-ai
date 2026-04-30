import { NextResponse } from 'next/server';
import { z } from 'zod';

import { paraphraseWithFallback } from '@/lib/huggingface';

export const runtime = 'nodejs';

// ✅ Request validation
const BodySchema = z.object({
  text: z.string().min(1),
  mode: z.enum(['formal', 'simple', 'conversational']).default('conversational')
});

// ✅ Prompt generator
function getPrompt(
  mode: 'formal' | 'simple' | 'conversational',
  text: string
) {
  const style =
    mode === 'formal'
      ? 'formal, professional, and precise'
      : mode === 'simple'
      ? 'simple, clear, and easy to read'
      : 'conversational, natural, and friendly';

  return `
You are an expert human editor.

Rewrite the following text in a ${style} way.

Rules:
- Keep the same meaning
- Avoid robotic or AI-like phring
- Keep important facts, names, and numbers unchanged
- Make it sound natural and human
- Return ONLY the rewritten text

Text:
${text}
  `;
}

// ✅ HuggingFace call (FIXED)
async function hfGenerate(text: string, signal: AbortSignal) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('Missing HUGGINGFACE_API_KEY');

  const result = await paraphraseWithFallback({
    text,
    apiKey,
    signal
  });

  return result.text;
}

// ✅ API Route
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const { text, mode } = parsed.data;

    // Use raw text for paraphrasing models (utility applies the required `paraphrase:` prefix).
    // Keep `mode` reserved for future prompt-style models.
    void mode;

    const humanizedText = await hfGenerate(text, controller.signal);

    return NextResponse.json({ humanizedText });
  } catch (e: any) {
    console.error('[api/process] ERROR:', e?.message);

    if (e?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. Try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: e?.message || 'Processing failed'
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}