import type { ParsedDocument } from './document';

export type { ParsedDocument, DocumentBlock, DocumentMetadata, BlockType } from './document';

export type HumanizeMode = 'formal' | 'simple' | 'conversational';

export type UploadExtractResult = {
  filename: string;
  text: string;
  document: ParsedDocument;
};

export type UploadResponse = {
  results: UploadExtractResult[];
  document: ParsedDocument;
};

export type DetectResult = {
  score: number;
  label: 'Human' | 'Mixed' | 'AI-like';
  details: {
    perplexityLike: number;
    burstiness: number;
    repetition: number;
  };
};

export type BlockDetectResult = {
  blockId: string;
  blockType: import('./document').BlockType;
  wordCount: number;
  score: number;
  aiScore: number;
  label: 'Human' | 'Mixed' | 'AI-like';
  method: 'heuristic' | 'huggingface';
};

export type DocumentDetectResult = {
  overall: DetectResult;
  aiContentPercent: number;
  humanContentPercent: number;
  blocks: BlockDetectResult[];
  analyzedBlocks: number;
  skippedBlocks: number;
};

export type ProcessResult = {
  humanizedText: string;
};

export type HumanizeDocumentResult = {
  document: ParsedDocument;
  plainText: string;
  humanizedBlockCount: number;
  preservedBlockCount: number;
  failedBlockCount?: number;
  errors?: string[];
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  filename?: string;
  mode: HumanizeMode;
  originalText: string;
  humanizedText: string;
  detect?: DetectResult;
  document?: ParsedDocument;
  documentDetection?: DocumentDetectResult;
  detectionBefore?: DocumentDetectResult;
  humanizedDocument?: ParsedDocument;
};
