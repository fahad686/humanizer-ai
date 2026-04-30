import type { DetectResult, HumanizeMode, ProcessResult, UploadExtractResult } from '@/types';

export async function uploadFiles(files: File[]): Promise<UploadExtractResult[]> {
  const form = new FormData();
  for (const f of files) form.append('files', f);

  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(json?.error || 'Upload failed');
  return (json?.results || []) as UploadExtractResult[];
}

export async function processText(text: string, mode: HumanizeMode): Promise<ProcessResult> {
  const res = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode })
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(json?.error || 'Processing failed');
  return { humanizedText: String(json?.humanizedText || '') };
}

export async function detectText(text: string): Promise<DetectResult> {
  const res = await fetch('/api/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(json?.error || 'Detection failed');
  return json as DetectResult;
}
