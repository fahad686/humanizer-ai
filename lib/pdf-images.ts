import { blockId } from '@/lib/document-utils';
import type { DocumentBlock } from '@/types/document';

type PdfImageObject = {
  data?: Uint8Array | Uint8ClampedArray;
  width?: number;
  height?: number;
};

function bytesToBase64(data: Uint8Array | Uint8ClampedArray) {
  return Buffer.from(data).toString('base64');
}

function imageObjectToDataUrl(img: PdfImageObject): { src: string; mimeType: string } | null {
  if (!img?.data?.length) return null;

  const data = img.data;
  if (data[0] === 0xff && data[1] === 0xd8) {
    return { src: `data:image/jpeg;base64,${bytesToBase64(data)}`, mimeType: 'image/jpeg' };
  }
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return { src: `data:image/png;base64,${bytesToBase64(data)}`, mimeType: 'image/png' };
  }
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return { src: `data:image/gif;base64,${bytesToBase64(data)}`, mimeType: 'image/gif' };
  }

  return null;
}

type PdfPage = {
  objs: { get: (name: string) => Promise<unknown> };
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>;
};

export async function extractImagesFromPage(
  page: PdfPage,
  pageNum: number,
  imageOps: Set<number>
): Promise<DocumentBlock[]> {
  const blocks: DocumentBlock[] = [];

  try {
    const ops = await page.getOperatorList();
    let imageIndex = 0;

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (!imageOps.has(fn)) continue;

      const args = ops.argsArray[i];
      if (!Array.isArray(args) || !args.length) continue;

      let parsed: { src: string; mimeType: string } | null = null;
      let width = 0;
      let height = 0;

      const first = args[0];
      if (typeof first === 'string') {
        try {
          const img = (await page.objs.get(first)) as PdfImageObject;
          width = img.width ?? 0;
          height = img.height ?? 0;
          parsed = imageObjectToDataUrl(img);
        } catch {
          parsed = null;
        }
      } else if (first && typeof first === 'object' && 'data' in (first as object)) {
        const img = first as PdfImageObject;
        width = img.width ?? 0;
        height = img.height ?? 0;
        parsed = imageObjectToDataUrl(img);
      }

      imageIndex++;
      blocks.push({
        id: blockId(),
        type: 'image',
        bbox: { page: pageNum, x: 0, y: 0, width, height },
        image: parsed
          ? {
              src: parsed.src,
              alt: `Image ${imageIndex} on page ${pageNum}`,
              mimeType: parsed.mimeType,
              width: width || undefined,
              height: height || undefined
            }
          : {
              alt: `Embedded image ${imageIndex} on page ${pageNum}`,
              mimeType: 'image/unknown',
              width: width || undefined,
              height: height || undefined
            }
      });
    }
  } catch {
    return blocks;
  }

  return blocks;
}
