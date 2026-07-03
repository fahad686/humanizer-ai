import { NextResponse } from 'next/server';

import { mergeDocuments } from '@/lib/document-utils';
import { parseDocument } from '@/lib/parsers';
import { pruneSourcePdfCache, saveSourcePdfFile } from '@/lib/source-pdf-cache';
import type { ParsedDocument } from '@/types/document';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const files = formData.getAll('files');

  if (!files.length) return badRequest('No files provided');

  const results: ParsedDocument[] = [];

  for (const entry of files) {
    if (!(entry instanceof File)) continue;

    const filename = entry.name;
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowed = new Set(['pdf', 'docx', 'txt', 'md']);

    if (!ext || !allowed.has(ext)) {
      return badRequest(`Unsupported file type: ${filename}`);
    }

    if (entry.size > MAX_FILE_BYTES) {
      return badRequest(`File too large (max 50MB): ${filename}`);
    }

    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const parsed = await parseDocument(buffer, filename);
      if (ext === 'pdf') {
        parsed.sourcePdfKey = await saveSourcePdfFile(filename, buffer);
      }
      results.push(parsed);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to parse document';
      return NextResponse.json({ error: `${filename}: ${message}` }, { status: 422 });
    }
  }

  if (!results.length) return badRequest('No valid files provided');

  void pruneSourcePdfCache();

  const document = results.length === 1 ? results[0] : mergeDocuments(results);

  return NextResponse.json({
    results: results.map((doc) => ({
      filename: doc.filename,
      text: doc.plainText,
      document: doc
    })),
    document
  });
}
