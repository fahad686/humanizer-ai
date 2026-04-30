import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const BodySchema = z.object({
  text: z.string().min(1)
});

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function estimate(text: string) {
  const sentences = splitSentences(text);
  const tokens = tokenize(text);

  const lengths = sentences.map((s) => tokenize(s).length).filter((n) => n > 0);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  const variance =
    lengths.reduce((acc, n) => acc + Math.pow(n - avgLen, 2), 0) / Math.max(1, lengths.length);
  const std = Math.sqrt(variance);
  const burstiness = avgLen > 0 ? std / avgLen : 0;

  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  const repeated = Array.from(freq.values()).filter((v) => v >= 4).length;
  const repetition = tokens.length ? repeated / Math.min(freq.size, 1000) : 0;

  const longWords = tokens.filter((t) => t.length >= 9).length;
  const longWordRatio = tokens.length ? longWords / tokens.length : 0;

  const perplexityLike = clamp(0.55 + longWordRatio * 0.9 - repetition * 0.7, 0, 1);
  const aiRisk = clamp(0.55 + (1 - burstiness) * 0.35 + repetition * 0.25, 0, 1);
  const humanConfidence = clamp(1 - aiRisk, 0, 1);

  const score = Math.round(humanConfidence * 100);
  const label: 'Human' | 'Mixed' | 'AI-like' = score >= 75 ? 'Human' : score >= 45 ? 'Mixed' : 'AI-like';

  return {
    score,
    label,
    details: {
      perplexityLike: Math.round(perplexityLike * 100),
      burstiness: Math.round(burstiness * 100),
      repetition: Math.round(repetition * 100)
    }
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  return NextResponse.json(estimate(parsed.data.text));
}
