export type HumanizeMode = 'formal' | 'simple' | 'conversational';

export type UploadExtractResult = {
  filename: string;
  text: string;
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

export type ProcessResult = {
  humanizedText: string;
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  filename?: string;
  mode: HumanizeMode;
  originalText: string;
  humanizedText: string;
  detect?: DetectResult;
};
