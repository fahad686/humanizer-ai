import type {
  DetectResult,
  DocumentDetectResult,
  HumanizeDocumentResult,
  HumanizeMode,
  ProcessResult,
  UploadResponse
} from '@/types';
import type { ParsedDocument } from '@/types/document';

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append('files', f);

  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as UploadResponse & { error?: string };
  if (!res.ok) throw new Error(json?.error || 'Upload failed');
  return json;
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
  const json = (await res.json().catch(() => null)) as DetectResult & { error?: string };
  if (!res.ok) throw new Error(json?.error || 'Detection failed');
  return json as DetectResult;
}

export async function detectDocument(document: ParsedDocument): Promise<DocumentDetectResult> {
  const res = await fetch('/api/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document })
  });
  const json = (await res.json().catch(() => null)) as DocumentDetectResult & { error?: string };
  if (!res.ok) throw new Error(json?.error || 'Document detection failed');
  return json as DocumentDetectResult;
}

export async function humanizeDocument({
  document,
  detection,
  mode,
  target = 'ai-and-mixed',
  blockIds
}: {
  document: ParsedDocument;
  detection: DocumentDetectResult;
  mode: HumanizeMode;
  target?: 'ai-only' | 'ai-and-mixed';
  blockIds?: string[];
}): Promise<HumanizeDocumentResult> {
  const res = await fetch('/api/process/document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document, detection, mode, target, blockIds })
  });
  const json = (await res.json().catch(() => null)) as HumanizeDocumentResult & { error?: string };
  if (!res.ok) throw new Error(json?.error || 'Document humanization failed');
  return json as HumanizeDocumentResult;
}

export type HealthStatus = {
  huggingface: {
    configured: boolean;
    reachable: boolean;
  };
  models: {
    detect: string;
    paraphrase: string;
  };
};

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  const json = (await res.json().catch(() => null)) as HealthStatus & { error?: string };
  if (!res.ok) throw new Error(json?.error || 'Health check failed');
  return json as HealthStatus;
}

export async function exportDocumentFile(
  document: ParsedDocument,
  format: 'docx' | 'pdf' | 'txt',
  options?: { sourcePdfBase64?: string | null; pdfLayout?: 'pagewise' | 'preserved' }
) {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document,
      format,
      pdfLayout: options?.pdfLayout,
      sourcePdfBase64: options?.sourcePdfBase64 || undefined,
      sourcePdfKey: document.sourcePdfKey
    })
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string };
    throw new Error(json?.error || 'Export failed');
  }
  return res.blob();
}
