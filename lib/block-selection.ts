import type { DocumentDetectResult } from '@/types';

export function defaultHumanizeBlockIds(detection: DocumentDetectResult): string[] {
  return detection.blocks
    .filter((b) => b.label === 'AI-like' || b.label === 'Mixed')
    .map((b) => b.blockId);
}
