import type { ParsedDocument } from '@/types/document';

import { parseDocx } from './docx';
import { parsePdf } from './pdf';
import { parsePlainText } from './plaintext';

export async function parseDocument(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return parsePdf(buffer, filename);
    case 'docx':
      return parseDocx(buffer, filename);
    case 'md':
      return parsePlainText(buffer, filename, 'md');
    case 'txt':
      return parsePlainText(buffer, filename, 'txt');
    default:
      throw new Error(`Unsupported file type: ${filename}`);
  }
}

export { parseDocx, parsePdf, parsePlainText };
