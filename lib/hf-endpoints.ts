export function toSafeModelPath(model: string) {
  return model
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export function hfInferenceBaseUrl() {
  return process.env.HF_INFERENCE_BASE_URL || 'https://router.huggingface.co/hf-inference';
}

export function hfModelUrl(model: string) {
  return `${hfInferenceBaseUrl()}/models/${toSafeModelPath(model)}`;
}
