export type HuggingFaceParaphraseParams = {
  max_length?: number;
  num_beams?: number;
  temperature?: number;
};

type HfErrorPayload = {
  error?: string;
  estimated_time?: number;
};

type HfText2TextItem = {
  generated_text?: string;
  translation_text?: string;
  summary_text?: string;
  text?: string;
};

function isValidModelId(model: string) {
  if (typeof model !== 'string') return false;
  const trimmed = model.trim();
  if (!trimmed) return false;
  if (trimmed.length > 200) return false;
  if (trimmed.includes(' ')) return false;
  // allow org/model, model, and common HF characters
  return /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?$/.test(trimmed);
}

function toSafeModelPath(model: string) {
  return model
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function getEndpoint(model: string) {
  const safePath = toSafeModelPath(model);
  return `https://api-inference.huggingface.co/models/${safePath}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractGeneratedText(data: unknown): string | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    const first = data[0] as HfText2TextItem | string | undefined;
    if (!first) return null;
    if (typeof first === 'string') return first;
    return (
      first.generated_text ||
      first.translation_text ||
      first.summary_text ||
      (typeof (first as any).text === 'string' ? (first as any).text : undefined) ||
      null
    );
  }

  if (typeof data === 'object') {
    const obj = data as HfText2TextItem & Record<string, unknown>;
    return (
      obj.generated_text ||
      obj.translation_text ||
      obj.summary_text ||
      (typeof obj.text === 'string' ? obj.text : null)
    );
  }

  return null;
}

async function postToModel({
  apiKey,
  model,
  inputText,
  params,
  signal
}: {
  apiKey: string;
  model: string;
  inputText: string;
  params: Required<HuggingFaceParaphraseParams>;
  signal: AbortSignal;
}) {
  if (!isValidModelId(model)) {
    throw new Error(`Invalid HF model id: ${model}`);
  }

  const url = getEndpoint(model);

  const res = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: `paraphrase: ${inputText}`,
      parameters: {
        max_length: params.max_length,
        num_beams: params.num_beams,
        temperature: params.temperature
      },
      options: {
        wait_for_model: true
      }
    }),
    signal
  });

  const contentType = res.headers.get('content-type') || '';
  const location = res.headers.get('location') || '';
  const raw = await res.text();

  if (res.status >= 300 && res.status < 400) {
    return {
      ok: false as const,
      status: res.status,
      retryAfterMs: null as number | null,
      error: `Redirected by HF (location=${location || 'n/a'}, content-type=${contentType}, body=${raw.slice(0, 220)})`
    };
  }

  let json: unknown = null;
  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      // HF should return JSON. If it doesn't, surface raw.
      throw new Error(
        `HF response not JSON (status=${res.status}, model=${model}, content-type=${contentType}, location=${location || 'n/a'}): ${raw}`
      );
    }
  }

  if (!res.ok) {
    const payload = (json || {}) as HfErrorPayload;

    if (res.status === 503) {
      const wait = typeof payload.estimated_time === 'number' ? payload.estimated_time : null;
      return {
        ok: false as const,
        status: res.status,
        retryAfterMs: wait != null ? Math.min(Math.max(wait * 1000, 800), 12000) : 1200,
        error: payload.error || 'Model loading'
      };
    }

    if (res.status === 429) {
      return {
        ok: false as const,
        status: res.status,
        retryAfterMs: 1500,
        error: (payload.error || 'Rate limited')
      };
    }

    return {
      ok: false as const,
      status: res.status,
      retryAfterMs: null as number | null,
      error: (payload.error || raw || 'HF request failed')
    };
  }

  const text = extractGeneratedText(json);
  if (!text || !text.trim()) {
    return {
      ok: false as const,
      status: 200,
      retryAfterMs: null as number | null,
      error: 'Empty response from HF model'
    };
  }

  return { ok: true as const, text: text.trim() };
}

export async function paraphraseWithFallback({
  text,
  apiKey,
  signal,
  params,
  models
}: {
  text: string;
  apiKey: string;
  signal: AbortSignal;
  params?: HuggingFaceParaphraseParams;
  models?: string[];
}) {
  const cleaned = String(text || '').trim();
  if (!cleaned) throw new Error('Text is required');

  const finalParams: Required<HuggingFaceParaphraseParams> = {
    max_length: params?.max_length ?? 256,
    num_beams: params?.num_beams ?? 5,
    temperature: params?.temperature ?? 0.7
  };

  const modelList = (models?.length
    ? models
    : [
        process.env.HF_MODEL_PRIMARY || 'humarin/chatgpt_paraphraser_on_T5_base',
        process.env.HF_MODEL_FALLBACK_1 || 'prithivida/parrot_paraphraser_on_T5',
        process.env.HF_MODEL_FALLBACK_2 || 'Vamsi/T5_Paraphrase_Paws'
      ]
  ).filter(Boolean);

  let lastErr: string | null = null;

  for (const model of modelList) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await postToModel({ apiKey, model, inputText: cleaned, params: finalParams, signal });
      if (r.ok) return { model, text: r.text };

      lastErr = `model=${model} status=${r.status} error=${r.error}`;
      if (r.retryAfterMs && attempt < 3) {
        await sleep(r.retryAfterMs);
        continue;
      }

      break;
    }
  }

  throw new Error(lastErr || 'HuggingFace inference failed');
}
