import type { ParsedDocument } from '@/types/document';

import { exportPdfRasterized } from '@/lib/exporters/pdf-raster';

export async function exportPdfPreservedLayout(
  originalPdf: Buffer,
  document: ParsedDocument
): Promise<Buffer> {
  return exportPdfRasterized(originalPdf, document);
}
