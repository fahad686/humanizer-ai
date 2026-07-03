import { NextResponse } from 'next/server';

import { hfModelUrl } from '@/lib/hf-endpoints';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const detectModel = process.env.HF_DETECT_MODEL || 'Hello-SimpleAI/chatgpt-detector-roberta';
  const paraphraseModel =
    process.env.HF_CHAT_MODEL_PRIMARY || 'openai/gpt-oss-20b';

  let reachable = false;

  if (apiKey) {
    try {
      const res = await fetch(hfModelUrl(detectModel), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: 'Sample text for connectivity check.',
          options: { wait_for_model: true }
        }),
        signal: AbortSignal.timeout(10000)
      });
      reachable = res.ok || res.status === 503;
    } catch {
      reachable = false;
    }
  }

  return NextResponse.json({
    huggingface: {
      configured: Boolean(apiKey),
      reachable
    },
    models: {
      detect: detectModel,
      paraphrase: paraphraseModel
    }
  });
}
