import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const files = formData.getAll('files');

  if (!files.length) return badRequest('No files provided');

  const results: Array<{ filename: string; text: string }> = [];

  for (const entry of files) {
    if (!(entry instanceof File)) continue;

    const filename = entry.name;
    const ext = filename.split('.').pop()?.toLowerCase();
    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (ext === 'pdf') {
      const parsed = await pdf(buffer);
      results.push({ filename, text: (parsed.text || '').trim() });
      continue;
    }

    if (ext === 'docx') {
      const parsed = await mammoth.extractRawText({ buffer });
      results.push({ filename, text: (parsed.value || '').trim() });
      continue;
    }

    if (ext === 'txt' || ext === 'md') {
      results.push({ filename, text: buffer.toString('utf8').trim() });
      continue;
    }

    return badRequest(`Unsupported file type: ${filename}`);
  }

  return NextResponse.json({ results });
}
