import type { DocumentBlock } from '@/types/document';
import { hfModelUrl } from '@/lib/hf-endpoints';

export type DetectLabel = 'Human' | 'Mixed' | 'AI-like';

export type DetectDetails = {
  perplexityLike: number;
  burstiness: number;
  repetition: number;
};

export type DetectResult = {
  score: number;
  label: DetectLabel;
  details: DetectDetails;
};

export type BlockDetectResult = {
  blockId: string;
  blockType: DocumentBlock['type'];
  wordCount: number;
  score: number;
  aiScore: number;
  label: DetectLabel;
  method: 'heuristic' | 'huggingface';
};

export type DocumentDetectResult = {
  overall: DetectResult;
  aiContentPercent: number;
  humanContentPercent: number;
  blocks: BlockDetectResult[];
  analyzedBlocks: number;
  skippedBlocks: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function labelFromAiScore(aiScore: number): DetectLabel {
  if (aiScore >= 65) return 'AI-like';
  if (aiScore >= 35) return 'Mixed';
  return 'Human';
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

export function heuristicDetect(text: string): DetectResult {
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
  const label = labelFromAiScore(100 - score);

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

type HfClassification = { label: string; score: number };

function isAiLabel(label: string) {
  const l = label.toLowerCase();
  return (
    l.includes('fake') ||
    l.includes('ai') ||
    l.includes('chatgpt') ||
    l.includes('gpt') ||
    l.includes('machine') ||
    l.includes('generated') ||
    l === 'label_1'
  );
}

function isHumanLabel(label: string) {
  const l = label.toLowerCase();
  return l.includes('real') || l.includes('human') || l === 'label_0';
}

function parseHfClassification(data: unknown): { aiScore: number } | null {
  if (!data) return null;

  const items: HfClassification[] = Array.isArray(data)
    ? (data as HfClassification[])
  : typeof data === 'object' && data !== null && Array.isArray((data as { labels?: string[] }).labels)
      ? ((data as { labels: string[]; scores: number[] }).labels.map((label, i) => ({
          label,
          score: (data as { scores: number[] }).scores[i]
        })) as HfClassification[])
      : [];

  if (!items.length) return null;

  let aiScore = 0;
  for (const item of items) {
    if (isAiLabel(item.label)) aiScore = Math.max(aiScore, Math.round(item.score * 100));
    if (isHumanLabel(item.label)) aiScore = Math.max(aiScore, Math.round((1 - item.score) * 100));
  }

  if (!aiScore && items.length === 1) {
    aiScore = Math.round(items[0].score * 100);
  }

  return { aiScore: clamp(aiScore, 0, 100) };
}

async function hfDetectText(text: string, apiKey: string, signal: AbortSignal): Promise<{ aiScore: number } | null> {
  const model = process.env.HF_DETECT_MODEL || 'Hello-SimpleAI/chatgpt-detector-roberta';
  const url = hfModelUrl(model);
  const input = text.trim().slice(0, 2000);

  if (input.length < 20) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: input, options: { wait_for_model: true } }),
      signal
    });

    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    return parseHfClassification(json);
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function detectBlockText(
  text: string,
  apiKey: string | undefined,
  signal: AbortSignal,
  preferHf: boolean
): Promise<{ score: number; aiScore: number; label: DetectLabel; method: 'heuristic' | 'huggingface' }> {
  if (preferHf && apiKey && text.trim().length >= 30) {
    const hf = await hfDetectText(text, apiKey, signal);
    if (hf) {
      const aiScore = hf.aiScore;
      return {
        aiScore,
        score: 100 - aiScore,
        label: labelFromAiScore(aiScore),
        method: 'huggingface'
      };
    }
  }

  const h = heuristicDetect(text);
  return {
    score: h.score,
    aiScore: 100 - h.score,
    label: h.label,
    method: 'heuristic'
  };
}

export async function detectDocumentBlocks({
  blocks,
  apiKey,
  signal
}: {
  blocks: DocumentBlock[];
  apiKey?: string;
  signal: AbortSignal;
}): Promise<DocumentDetectResult> {
  const analyzable = blocks
    .map((block) => {
      let text = '';
      if (block.type === 'table' && block.table) {
        text = block.table.rows
          .flatMap((r) => r.cells.map((c) => c.text))
          .join(' ')
          .trim();
      } else if (block.text?.trim()) {
        text = block.text.trim();
      }

      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      return { block, text, wordCount };
    })
    .filter((x) => x.wordCount >= 8);

  const results: BlockDetectResult[] = [];
  let totalWords = 0;
  let aiWeighted = 0;

  const preferHf = Boolean(apiKey);
  const concurrency = 3;
  let index = 0;

  async function worker() {
    while (index < analyzable.length) {
      const current = analyzable[index++];
      const { block, text, wordCount } = current;

      const detected = await detectBlockText(text, apiKey, signal, preferHf);
      results.push({
        blockId: block.id,
        blockType: block.type,
        wordCount,
        score: detected.score,
        aiScore: detected.aiScore,
        label: detected.label,
        method: detected.method
      });

      totalWords += wordCount;
      aiWeighted += detected.aiScore * wordCount;

      if (preferHf && detected.method === 'huggingface') {
        await sleep(120);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, analyzable.length || 1) }, () => worker()));

  const aiContentPercent = totalWords ? Math.round(aiWeighted / totalWords) : 0;
  const humanContentPercent = 100 - aiContentPercent;
  const overallScore = humanContentPercent;

  return {
    overall: {
      score: overallScore,
      label: labelFromAiScore(aiContentPercent),
      details: heuristicDetect(
        analyzable.map((x) => x.text).join('\n\n') || 'sample text for analysis'
      ).details
    },
    aiContentPercent,
    humanContentPercent,
    blocks: results,
    analyzedBlocks: results.length,
    skippedBlocks: blocks.length - results.length
  };
}
