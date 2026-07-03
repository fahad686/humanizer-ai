import { createHash } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'source-pdfs');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function docKey(filename: string, buffer: Buffer) {
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  return `${safe}_${hash}`;
}

async function ensureDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function saveSourcePdfFile(filename: string, buffer: Buffer): Promise<string> {
  await ensureDir();
  const key = docKey(filename, buffer);
  const filePath = path.join(CACHE_DIR, `${key}.pdf`);
  await writeFile(filePath, buffer);
  return key;
}

export async function loadSourcePdfFile(key: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.pdf`);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function pruneSourcePdfCache() {
  try {
    await ensureDir();
    const { readdir, stat } = await import('fs/promises');
    const entries = await readdir(CACHE_DIR);
    const now = Date.now();
    for (const name of entries) {
      const filePath = path.join(CACHE_DIR, name);
      const info = await stat(filePath);
      if (now - info.mtimeMs > MAX_AGE_MS) {
        await unlink(filePath).catch(() => undefined);
      }
    }
  } catch {
    // ignore cache cleanup errors
  }
}
